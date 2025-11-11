import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Union } from './schemas/union.schema';
import { CreateUnionDto } from './dto/create-union.dto';
import { UpdateUnionDto } from './dto/update-union.dto';
import { Family } from '../families/schemas/family.schema';
import { Member } from '../members/schemas/member.schema';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UnionsService {
  constructor(
    @InjectModel(Union.name) private readonly unionModel: Model<Union>,
    @InjectModel(Family.name) private readonly familyModel: Model<Family>,
    @InjectModel(Member.name) private readonly memberModel: Model<Member>,
    private readonly audit: AuditService,
  ) {}

  private toId(id: string) { return new Types.ObjectId(id); }

  private async ensureFamilyExists(familyId: string) {
    const exists = await this.familyModel.exists({ _id: familyId });
    if (!exists) throw new BadRequestException('Family không tồn tại');
  }

  private async ensureMembersInFamily(familyId: string, partnerIds: string[]) {
    if (!partnerIds?.length) return;
    // Hỗ trợ legacy: family có thể lưu dạng ObjectId hoặc string
    const ids = partnerIds.map((id) => this.toId(id));
    const cnt = await this.memberModel.countDocuments({
      _id: { $in: ids },
      $or: [
        { family: this.toId(familyId) },
        { family: familyId },
      ],
    });
    if (cnt !== partnerIds.length) throw new BadRequestException('Thành viên không cùng dòng họ');
  }

  async create(dto: CreateUnionDto) {
    await this.ensureFamilyExists(dto.family);
    await this.ensureMembersInFamily(dto.family, dto.partners);
    const payload: any = { family: this.toId(dto.family), partners: dto.partners.map((id) => this.toId(id)) };
    if (dto.startDate) payload.startDate = new Date(dto.startDate);
    if (dto.endDate) payload.endDate = new Date(dto.endDate);
    if (dto.notes) payload.notes = dto.notes;
  const created = await this.unionModel.create(payload);
  const json = created.toJSON();
  await this.audit.log({ entity: 'union', entityId: (json as any).id, action: 'create', after: json });
  return json;
  }

  async findAll(params: { family?: string; partner?: string }) {
    const filter: any = {};
    if (params.family) filter.family = this.toId(params.family);
    if (params.partner) filter.partners = this.toId(params.partner);
    const list = await this.unionModel.find(filter).lean().exec();
    return list.map((d: any) => ({ ...d, id: d._id, _id: undefined }));
  }

  async findOne(id: string) {
    const found = await this.unionModel.findById(id).lean().exec();
    if (!found) throw new NotFoundException('Không tìm thấy union');
    return { ...found, id: found._id, _id: undefined };
  }

  async update(id: string, dto: UpdateUnionDto) {
    if (dto.family) await this.ensureFamilyExists(dto.family);
    if (dto.partners) {
      const fam = dto.family ?? (await this.unionModel.findById(id).select('family').lean().exec())?.family?.toString();
      if (!fam) throw new NotFoundException('Không tìm thấy union');
      await this.ensureMembersInFamily(fam, dto.partners);
    }
    const payload: any = { ...dto };
    if (dto.family) payload.family = this.toId(dto.family);
    if (dto.partners) payload.partners = dto.partners.map((x) => this.toId(x));
    if (dto.startDate) payload.startDate = new Date(dto.startDate);
    if (dto.endDate) payload.endDate = new Date(dto.endDate);
  const before = await this.unionModel.findById(id).lean().exec();
  const updated = await this.unionModel.findByIdAndUpdate(id, payload, { new: true }).lean().exec();
    if (!updated) throw new NotFoundException('Không tìm thấy union');
  const out = { ...updated, id: (updated as any)._id, _id: undefined } as any;
  await this.audit.log({ entity: 'union', entityId: id, action: 'update', before, after: out });
  return out;
  }

  async remove(id: string) {
  const before = await this.unionModel.findById(id).lean().exec();
  const res = await this.unionModel.findByIdAndDelete(id).lean().exec();
    if (!res) throw new NotFoundException('Không tìm thấy union');
  // No cascading yet; clients must re-parent children first
  await this.audit.log({ entity: 'union', entityId: id, action: 'delete', before });
  return { success: true };
  }

  // Normalize unions for a given member: for each detected spouse/partner create a 2-person union if not exists
  async normalizeForMember(memberId: string) {
    const person = await this.memberModel.findById(memberId).lean().exec();
    if (!person) throw new NotFoundException('Không tìm thấy thành viên');
    const familyId = (person.family as any).toString();

    // Collect partner candidates:
    const partnerIds = new Set<string>();
    // 1) explicit spouse link
    if ((person as any).spouse) partnerIds.add((person as any).spouse.toString());
    // 2) anyone pointing to this person as spouse
    const backLinks = await this.memberModel.find({ spouse: this.toId(memberId) }).select('_id').lean().exec();
    for (const b of backLinks) partnerIds.add((b._id as any).toString());
    // 3) mothers/fathers of children with this person
    if (person.gender === 'male') {
      const mothers = await this.memberModel.find({ father: this.toId(memberId), mother: { $exists: true, $ne: null } }).select('mother').lean().exec();
      for (const x of mothers) if ((x as any).mother) partnerIds.add((x as any).mother.toString());
    } else if (person.gender === 'female') {
      const fathers = await this.memberModel.find({ mother: this.toId(memberId), father: { $exists: true, $ne: null } }).select('father').lean().exec();
      for (const x of fathers) if ((x as any).father) partnerIds.add((x as any).father.toString());
    }

    // Existing unions involving this member
    const existing = await this.unionModel.find({ family: this.toId(familyId), partners: this.toId(memberId) }).lean().exec();
    const existsPair = (otherId: string) => existing.some(u => {
      const ids = (u.partners || []).map(p => p.toString());
      return ids.length === 2 && ids.includes(memberId) && ids.includes(otherId);
    });

    const created: any[] = [];
    for (const pid of Array.from(partnerIds)) {
      if (pid === memberId) continue;
      if (existsPair(pid)) continue;
      const payload: any = { family: this.toId(familyId), partners: [this.toId(memberId), this.toId(pid)] };
      const c = await this.unionModel.create(payload);
      created.push({ id: (c as any)._id.toString(), partners: [memberId, pid] });
    }
    if (created.length) await this.audit.log({ entity: 'union', entityId: memberId, action: 'update', after: { created, operation: 'normalize' } });
    return { created };
  }
}
