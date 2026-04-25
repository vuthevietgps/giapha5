import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Union } from './schemas/union.schema';
import { CreateUnionDto } from './dto/create-union.dto';
import { UpdateUnionDto } from './dto/update-union.dto';
import { Family } from '../families/schemas/family.schema';
import { Member } from '../members/schemas/member.schema';
import { AuditService } from '../audit/audit.service';
import { AuthUser, PermissionsService } from '../auth/permissions.service';

@Injectable()
export class UnionsService {
  constructor(
    @InjectModel(Union.name) private readonly unionModel: Model<Union>,
    @InjectModel(Family.name) private readonly familyModel: Model<Family>,
    @InjectModel(Member.name) private readonly memberModel: Model<Member>,
    private readonly audit: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private toId(id: string) { return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null; }

  private idVariants(id: string) {
    const variants: Array<string | Types.ObjectId> = [id];
    const objectId = this.toId(id);
    if (objectId) variants.push(objectId);
    return variants;
  }

  /** Match a reference field that may be stored as string or ObjectId */
  private refMatch(id: string) {
    return { $in: this.idVariants(id) };
  }

  private ensureCanAccessFamily(currentUser: AuthUser, familyId: string) {
    if (!this.permissionsService.canAccessFamily(currentUser, familyId)) {
      throw new NotFoundException('Bạn không có quyền truy cập dòng họ này');
    }
  }

  private async ensureFamilyExists(familyId: string) {
    const exists = await this.familyModel.exists({ _id: familyId });
    if (!exists) throw new BadRequestException('Family không tồn tại');
  }

  private ensureBinaryPartnerContract(partnerIds: string[]) {
    if (!Array.isArray(partnerIds) || partnerIds.length !== 2) {
      throw new BadRequestException('Union phải có đúng 2 thành viên khác nhau');
    }
    if (new Set(partnerIds).size !== 2) {
      throw new BadRequestException('Union phải có đúng 2 thành viên khác nhau');
    }
  }

  private async ensureMembersInFamily(familyId: string, partnerIds: string[]) {
    if (!partnerIds?.length) return;
    const ids = partnerIds.reduce<Array<string | Types.ObjectId>>((acc, id) => {
      const objectId = this.toId(id);
      acc.push(objectId ?? id);
      return acc;
    }, []);
    // Match family stored as either string or ObjectId
    const cnt = await this.memberModel.countDocuments({
      _id: { $in: ids },
      family: this.refMatch(familyId),
    });
    if (cnt !== partnerIds.length) throw new BadRequestException('Thành viên không cùng dòng họ');
  }

  private auditFamilyId(value: any): string | undefined {
    if (!value) return undefined;
    return typeof value === 'string' ? value : value.toString();
  }

  async create(dto: CreateUnionDto, currentUser?: AuthUser) {
    if (currentUser) this.ensureCanAccessFamily(currentUser, dto.family);
    await this.ensureFamilyExists(dto.family);
    this.ensureBinaryPartnerContract(dto.partners);
    await this.ensureMembersInFamily(dto.family, dto.partners);
    const payload: any = {
      family: this.toId(dto.family) ?? dto.family,
      partners: dto.partners.map((id) => this.toId(id) ?? id),
    };
    if (dto.startDate) payload.startDate = new Date(dto.startDate);
    if (dto.endDate) payload.endDate = new Date(dto.endDate);
    if (dto.notes) payload.notes = dto.notes;
    const created = await this.unionModel.create(payload);
    const json = created.toJSON();
    await this.audit.log({
      entity: 'union',
      entityId: String(json._id),
      action: 'create',
      family: this.auditFamilyId(json.family),
      after: json,
    });
    return json;
  }

  async findAll(params: { family?: string; partner?: string }, currentUser?: AuthUser) {
    const filter: any = {};
    if (params.family) {
      if (currentUser && !this.permissionsService.canAccessFamily(currentUser, params.family)) {
        return [];
      }
      filter.family = this.refMatch(params.family);
    } else if (currentUser) {
      const accessibleFamilies = this.permissionsService.getAccessibleFamilyIds(currentUser);
      if (accessibleFamilies !== null) {
        if (accessibleFamilies.length === 0) return [];
        filter.family = { $in: accessibleFamilies.flatMap(id => this.idVariants(id)) };
      }
    }
    if (params.partner) filter.partners = this.refMatch(params.partner);
    const list = await this.unionModel.find(filter).exec();
    return list.map((d) => d.toJSON());
  }

  async findOne(id: string, currentUser?: AuthUser) {
    const found = await this.unionModel.findById(id).exec();
    if (!found) throw new NotFoundException('Không tìm thấy union');
    if (currentUser) this.ensureCanAccessFamily(currentUser, found.family.toString());
    return found.toJSON();
  }

  async update(id: string, dto: UpdateUnionDto, currentUser?: AuthUser) {
    const current = await this.unionModel.findById(id).select('family').lean().exec();
    if (!current) throw new NotFoundException('Không tìm thấy union');
    const currentFamilyId = current.family?.toString();
    if (!currentFamilyId) throw new NotFoundException('Không tìm thấy union');
    if (currentUser) this.ensureCanAccessFamily(currentUser, currentFamilyId);
    if (dto.family) await this.ensureFamilyExists(dto.family);
    if (currentUser && dto.family) this.ensureCanAccessFamily(currentUser, dto.family);
    if (dto.partners) {
      const fam = dto.family ?? currentFamilyId;
      if (!fam) throw new NotFoundException('Không tìm thấy union');
      this.ensureBinaryPartnerContract(dto.partners);
      await this.ensureMembersInFamily(fam, dto.partners);
    }
    const payload: any = { ...dto };
    if (dto.family) payload.family = this.toId(dto.family) ?? dto.family;
    if (dto.partners) payload.partners = dto.partners.map((x) => this.toId(x) ?? x);
    if (dto.startDate) payload.startDate = new Date(dto.startDate);
    if (dto.endDate) payload.endDate = new Date(dto.endDate);
    const before = await this.unionModel.findById(id).lean().exec();
    const updated = await this.unionModel.findByIdAndUpdate(id, payload, { new: true }).exec();
    if (!updated) throw new NotFoundException('Không tìm thấy union');
    const json = updated.toJSON();
    await this.audit.log({
      entity: 'union',
      entityId: id,
      action: 'update',
      family: this.auditFamilyId(json.family) || this.auditFamilyId(before?.family),
      before,
      after: json,
    });
    return json;
  }

  async remove(id: string, currentUser?: AuthUser) {
    const before = await this.unionModel.findById(id).lean().exec();
    if (!before) throw new NotFoundException('Không tìm thấy union');
    if (currentUser) this.ensureCanAccessFamily(currentUser, before.family.toString());
    const res = await this.unionModel.findByIdAndDelete(id).lean().exec();
    if (!res) throw new NotFoundException('Không tìm thấy union');
    await this.audit.log({
      entity: 'union',
      entityId: id,
      action: 'delete',
      family: this.auditFamilyId(before.family),
      before,
    });
    return { success: true };
  }

  // Normalize unions for a given member: for each detected spouse/partner create a 2-person union if not exists
  async normalizeForMember(memberId: string, currentUser?: AuthUser) {
    const person = await this.memberModel.findById(memberId).lean().exec();
    if (!person) throw new NotFoundException('Không tìm thấy thành viên');
    const familyId = (person.family as any).toString();
    if (currentUser) this.ensureCanAccessFamily(currentUser, familyId);

    // Collect partner candidates:
    const partnerIds = new Set<string>();
    // 1) explicit spouse link
    if ((person as any).spouse) partnerIds.add((person as any).spouse.toString());
    // 2) anyone pointing to this person as spouse
    const backLinks = await this.memberModel.find({ spouse: this.refMatch(memberId) }).select('_id').lean().exec();
    for (const b of backLinks) partnerIds.add((b._id as any).toString());
    // 3) mothers/fathers of children with this person
    if (person.gender === 'male') {
      const mothers = await this.memberModel.find({ father: this.refMatch(memberId), mother: { $exists: true, $ne: null } }).select('mother').lean().exec();
      for (const x of mothers) if ((x as any).mother) partnerIds.add((x as any).mother.toString());
    } else if (person.gender === 'female') {
      const fathers = await this.memberModel.find({ mother: this.refMatch(memberId), father: { $exists: true, $ne: null } }).select('father').lean().exec();
      for (const x of fathers) if ((x as any).father) partnerIds.add((x as any).father.toString());
    }

    // Existing unions involving this member
    const existing = await this.unionModel.find({ family: this.refMatch(familyId), partners: this.refMatch(memberId) }).lean().exec();
    const existsPair = (otherId: string) => existing.some(u => {
      const ids = Array.from(new Set((u.partners || []).map(p => p.toString())));
      return ids.includes(memberId) && ids.includes(otherId);
    });

    const allowedPartners = new Set(
      (
        await this.memberModel
          .find({ _id: { $in: Array.from(partnerIds) }, family: this.refMatch(familyId) })
          .select('_id')
          .lean()
          .exec()
      ).map((member: any) => member._id.toString()),
    );

    const created: any[] = [];
    for (const pid of Array.from(partnerIds)) {
      if (pid === memberId) continue;
      if (!allowedPartners.has(pid)) continue;
      if (existsPair(pid)) continue;
      const payload: any = {
        family: this.toId(familyId) ?? familyId,
        partners: [this.toId(memberId) ?? memberId, this.toId(pid) ?? pid],
      };
      const c = await this.unionModel.create(payload);
      created.push({ id: (c as any)._id.toString(), partners: [memberId, pid] });
    }
    if (created.length) {
      await this.audit.log({
        entity: 'union',
        entityId: memberId,
        action: 'update',
        family: familyId,
        after: { created, operation: 'normalize' },
      });
    }
    return { created };
  }
}
