import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Member } from './schemas/member.schema';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Family } from '../families/schemas/family.schema';
import { hash } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { Union } from '../unions/schemas/union.schema';
import { AuthUser, PermissionsService } from '../auth/permissions.service';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Member.name) private readonly memberModel: Model<Member>,
    @InjectModel(Family.name) private readonly familyModel: Model<Family>,
    @InjectModel(Union.name) private readonly unionModel: Model<Union>,
    private readonly audit: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private toObjectId(id: string) {
    return new Types.ObjectId(id);
  }

  private async ensureFamilyExists(familyId: string) {
    const exists = await this.familyModel.exists({ _id: familyId });
    if (!exists) throw new BadRequestException('Family không tồn tại');
  }

  private async ensureSameFamily(familyId: string, ...memberIds: (string | undefined)[]) {
    const ids = memberIds.filter(Boolean) as string[];
    if (!ids.length) return;
    const count = await this.memberModel.countDocuments({
      _id: { $in: ids },
      $or: [
        { family: this.toObjectId(familyId) },
        { family: familyId },
      ],
    });
    if (count !== ids.length) throw new BadRequestException('Thành viên tham chiếu không thuộc cùng dòng họ');
  }

  async create(dto: CreateMemberDto) {
    await this.ensureFamilyExists(dto.family);
    
    // Clean empty strings for ObjectId and other fields
    const cleanDto = { ...dto };
    if (cleanDto.father === '') cleanDto.father = undefined;
    if (cleanDto.mother === '') cleanDto.mother = undefined;
    if (cleanDto.spouse === '') cleanDto.spouse = undefined;
    if (cleanDto.position === '') cleanDto.position = undefined;
    if (cleanDto.photoUrl === '') cleanDto.photoUrl = undefined;
    if (cleanDto.phone === '') cleanDto.phone = undefined;
    if (cleanDto.email === '') cleanDto.email = undefined;
    if (cleanDto.password === '') cleanDto.password = undefined;
    if (cleanDto.bio === '') cleanDto.bio = undefined;
    if (cleanDto.dob === '') cleanDto.dob = undefined;
    if (cleanDto.dod === '') cleanDto.dod = undefined;
    
    await this.ensureSameFamily(cleanDto.family, cleanDto.father, cleanDto.spouse, cleanDto.mother);

    // Business rule: Only one "root" male (no parents, no spouse) per family.
    // Allow creation of additional males without parents if they already have a spouse (being added as husband) to avoid blocking spouse additions.
    const effectiveGender = (cleanDto.gender || 'male');
    if (effectiveGender === 'male' && !cleanDto.father && !cleanDto.mother && !cleanDto.spouse) {
      const existingRootMale = await this.memberModel.exists({
        $or: [ { family: this.toObjectId(cleanDto.family) }, { family: cleanDto.family } ],
        gender: 'male',
        father: { $exists: false },
        mother: { $exists: false },
      });
      if (existingRootMale) {
        throw new BadRequestException('Mỗi dòng họ chỉ có một cụ tổ (nam) không có cha mẹ');
      }
    }

    // If both father and mother provided, require there is a union including both within same family
    if (cleanDto.father && cleanDto.mother) {
      const union = await this.unionModel.findOne({
        $or: [ { family: this.toObjectId(cleanDto.family) }, { family: cleanDto.family } ],
        partners: { $all: [ this.toObjectId(cleanDto.father), this.toObjectId(cleanDto.mother) ] },
      }).lean().exec();
      if (!union) {
        throw new BadRequestException('Cha và Mẹ phải thuộc cùng một hôn phối (union) trong họ');
      }
    }

    const payload: any = { ...cleanDto };
    if (cleanDto.password) payload.password = await hash(cleanDto.password, 10);
    if (cleanDto.dob) payload.dob = new Date(cleanDto.dob);
    if (cleanDto.dod) payload.dod = new Date(cleanDto.dod);
    try {
      // spouse cannot be self
      if (payload.spouse && payload.spouse === (payload as any)._id) {
        throw new BadRequestException('Vợ/Chồng không hợp lệ');
      }
    const created = await this.memberModel.create(payload);
    const json = created.toJSON();
  await this.audit.log({ entity: 'member', entityId: (json as any).id, action: 'create', after: json });
    return json;
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('Email đã tồn tại');
      throw e;
    }
  }

  async findAll(currentUser: AuthUser, params: { family?: string; q?: string }) {
    const filter: any = {};
    
    // Lọc theo families được phép truy cập
    const accessibleFamilies = this.permissionsService.getAccessibleFamilyIds(currentUser);
    if (accessibleFamilies !== null) {
      // Không phải GIAM_DOC - cần filter
      if (accessibleFamilies.length === 0) return []; // Không có quyền
      
      filter.$or = [
        { family: { $in: accessibleFamilies.map(id => this.toObjectId(id)) } },
        { family: { $in: accessibleFamilies } },
      ];
    }
    
    if (params.family) {
      // Nếu đã filter theo accessible families, kiểm tra xem family này có trong danh sách không
      if (accessibleFamilies !== null && !accessibleFamilies.includes(params.family)) {
        return []; // Không có quyền truy cập family này
      }
      // Support legacy records where family was stored as string
      filter.$or = [
        { family: this.toObjectId(params.family) },
        { family: params.family },
      ];
    }
    
    if (params.q) filter.fullName = { $regex: params.q, $options: 'i' };
    const list = await this.memberModel.find(filter).sort({ fullName: 1 }).exec();
    return list.map((d) => d.toJSON());
  }

  async findOne(id: string) {
    const found = await this.memberModel.findById(id).exec();
    if (!found) throw new NotFoundException('Không tìm thấy thành viên');
    return found.toJSON();
  }

  async update(id: string, dto: UpdateMemberDto) {
    if (dto.family) await this.ensureFamilyExists(dto.family);
    
    // Clean empty strings for ObjectId and other fields  
    const cleanDto = { ...dto };
    if (cleanDto.father === '') cleanDto.father = undefined;
    if (cleanDto.mother === '') cleanDto.mother = undefined;
    if (cleanDto.spouse === '') cleanDto.spouse = undefined;
    if (cleanDto.position === '') cleanDto.position = undefined;
    if (cleanDto.photoUrl === '') cleanDto.photoUrl = undefined;
    if (cleanDto.phone === '') cleanDto.phone = undefined;
    if (cleanDto.email === '') cleanDto.email = undefined;
    if (cleanDto.password === '') cleanDto.password = undefined;
    if (cleanDto.bio === '') cleanDto.bio = undefined;
    if (cleanDto.dob === '') cleanDto.dob = undefined;
    if (cleanDto.dod === '') cleanDto.dod = undefined;
    
    const familyIdForRefChecks = cleanDto.family || (await this.memberModel.findById(id).select('family').lean().exec())?.family?.toString();
    if (!familyIdForRefChecks) throw new NotFoundException('Không tìm thấy thành viên');
    await this.ensureSameFamily(familyIdForRefChecks, cleanDto.father, cleanDto.spouse, cleanDto.mother);

    // Determine which relationship fields are being changed in this update
    const affectsGender = Object.prototype.hasOwnProperty.call(cleanDto, 'gender');
    const affectsFather = Object.prototype.hasOwnProperty.call(cleanDto, 'father');
    const affectsMother = Object.prototype.hasOwnProperty.call(cleanDto, 'mother');
    const affectsSpouse = Object.prototype.hasOwnProperty.call(cleanDto, 'spouse');

    // Prevent cycles only when those fields are actually being set/changed
    if (affectsFather && cleanDto.father) {
      const isCycle = await this.isDescendant(cleanDto.father, id);
      if (isCycle) throw new BadRequestException('Thiết lập Bố tạo vòng lặp');
      if (cleanDto.father === id) throw new BadRequestException('Bố không thể là chính mình');
    }
    if (affectsSpouse && cleanDto.spouse) {
      if (cleanDto.spouse === id) throw new BadRequestException('Vợ/Chồng không thể là chính mình');
    }
    if (affectsMother && cleanDto.mother) {
      if (cleanDto.mother === id) throw new BadRequestException('Mẹ không thể là chính mình');
      // Basic cycle prevention leveraging father-chain: prevent setting mother to a descendant by father lineage
      const cycle = await this.isDescendant(cleanDto.mother, id);
      if (cycle) throw new BadRequestException('Thiết lập Mẹ tạo vòng lặp');
    }

    // Business rule: Only one male without parents (root male) per family
    const current = await this.memberModel.findById(id).select('family gender father mother spouse').lean().exec();
    const newGender = cleanDto.gender ?? (current?.gender ?? 'male');
    const newFather = cleanDto.father ?? current?.father?.toString();
    const newMother = cleanDto.mother ?? (current as any)?.mother?.toString();
    const newSpouse = cleanDto.spouse ?? (current as any)?.spouse?.toString();
    // Only enforce the unique-root-male rule when relevant fields are being changed
    if ((affectsGender || affectsFather || affectsMother || affectsSpouse)) {
      if (newGender === 'male' && !newFather && !newMother && !newSpouse) {
        const existingRootMale = await this.memberModel.exists({
          _id: { $ne: id },
          $or: [ { family: this.toObjectId(familyIdForRefChecks) }, { family: familyIdForRefChecks } ],
          gender: 'male',
          father: { $exists: false },
          mother: { $exists: false },
        });
        if (existingRootMale) {
          throw new BadRequestException('Mỗi dòng họ chỉ có một cụ tổ (nam) không có cha mẹ');
        }
      }
    }

    // If both father and mother provided (after merging with existing), ensure a union exists
    // Only validate union existence when parent relationships are being changed
    if ((affectsFather || affectsMother) && newFather && newMother) {
      const union = await this.unionModel.findOne({
        $or: [ { family: this.toObjectId(familyIdForRefChecks) }, { family: familyIdForRefChecks } ],
        partners: { $all: [ this.toObjectId(newFather), this.toObjectId(newMother) ] },
      }).lean().exec();
      if (!union) {
        throw new BadRequestException('Cha và Mẹ phải thuộc cùng một hôn phối (union) trong họ');
      }
    }

    const payload: any = { ...cleanDto };
    if (cleanDto.password) payload.password = await hash(cleanDto.password, 10);
    if (cleanDto.dob) payload.dob = new Date(cleanDto.dob);
    if (cleanDto.dod) payload.dod = new Date(cleanDto.dod);
    try {
  const before = await this.memberModel.findById(id).lean().exec();
  const updated = await this.memberModel.findByIdAndUpdate(id, payload, { new: true }).exec();
      if (!updated) throw new NotFoundException('Không tìm thấy thành viên');
      // Maintain spouse symmetry when spouse is explicitly changed
      if (affectsSpouse) {
        // Clear previous spouse links
        await this.memberModel.updateMany({ spouse: id, _id: { $ne: cleanDto.spouse } }, { $unset: { spouse: 1 } }).exec();
        if (cleanDto.spouse) {
          await this.memberModel.findByIdAndUpdate(cleanDto.spouse, { spouse: id }).exec();
        }
      }
  const json = updated.toJSON();
  await this.audit.log({ entity: 'member', entityId: id, action: 'update', before, after: json });
  return json;
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('Email đã tồn tại');
      throw e;
    }
  }

  async remove(id: string) {
    const before = await this.memberModel.findById(id).lean().exec();
    const res = await this.memberModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Không tìm thấy thành viên');
    // Clean up references where this was father/spouse
    await this.memberModel.updateMany({ father: id }, { $unset: { father: 1 } }).exec();
  await this.memberModel.updateMany({ spouse: id }, { $unset: { spouse: 1 } }).exec();
  await this.memberModel.updateMany({ mother: id }, { $unset: { mother: 1 } }).exec();
  await this.audit.log({ entity: 'member', entityId: id, action: 'delete', before });
  return { success: true };
  }

  async listByFamily(familyId: string) {
    const list = await this.memberModel
      .find({ $or: [{ family: this.toObjectId(familyId) }, { family: familyId }] })
      .sort({ fullName: 1 })
      .exec();
    return list.map((d) => d.toJSON());
  }

  async setChildren(parentId: string, childrenIds: string[]) {
    const parent = await this.memberModel.findById(parentId).exec();
    if (!parent) throw new NotFoundException('Không tìm thấy thành viên');
    const familyId = parent.family.toString();
    // Ensure all children belong to same family
    await this.ensureSameFamily(familyId, ...childrenIds);
    // Ensure no cycles: none of the children can be an ancestor of parent
    for (const childId of childrenIds) {
      const cycle = await this.isAncestor(childId, parentId);
      if (cycle) throw new BadRequestException('Thiết lập Con tạo vòng lặp');
      if (childId === parentId) throw new BadRequestException('Con không thể là chính mình');
    }
    // Clear father for those currently linked but not in new set
    await this.memberModel.updateMany({ father: parentId, _id: { $nin: childrenIds } }, { $unset: { father: 1 } }).exec();
    // Set father for new children
    await this.memberModel.updateMany({ _id: { $in: childrenIds } }, { $set: { father: parentId } }).exec();
    return { success: true };
  }

  // Re-parent a person to a different parents pair (union or explicit parent ids)
  async reparent(personId: string, body: { unionId?: string; fatherId?: string; motherId?: string }) {
    const person = await this.memberModel.findById(personId).exec();
    if (!person) throw new NotFoundException('Không tìm thấy thành viên');
    let fatherId = body.fatherId;
    let motherId = body.motherId;
    if (body.unionId) {
      // load union to determine partners as father/mother by gender if possible
      const union = await (this as any).unionModel?.findById(body.unionId).lean().exec();
      if (!union) throw new NotFoundException('Không tìm thấy union');
      const partnerIds: string[] = (union.partners || []).map((p: any) => p.toString());
      // determine genders
      const partners = await this.memberModel.find({ _id: { $in: partnerIds } }).select('gender').lean().exec();
      const male = partners.find((p: any) => p.gender === 'male');
      const female = partners.find((p: any) => p.gender === 'female');
      fatherId = male?._id?.toString() || fatherId;
      motherId = female?._id?.toString() || motherId;
    }

    const familyId = person.family.toString();
    await this.ensureSameFamily(familyId, fatherId, motherId);
    // Prevent cycles
    if (fatherId) {
      if (fatherId === personId) throw new BadRequestException('Bố không thể là chính mình');
      const cycle = await this.isDescendant(fatherId, personId);
      if (cycle) throw new BadRequestException('Thiết lập Bố tạo vòng lặp');
    }
    if (motherId) {
      if (motherId === personId) throw new BadRequestException('Mẹ không thể là chính mình');
      const cycle = await this.isDescendant(motherId, personId);
      if (cycle) throw new BadRequestException('Thiết lập Mẹ tạo vòng lặp');
    }

    const before = await this.memberModel.findById(personId).lean().exec();
    const updated = await this.memberModel.findByIdAndUpdate(personId, { father: fatherId, mother: motherId }, { new: true }).lean().exec();
    await (this as any).audit?.log({ entity: 'member', entityId: personId, action: 'reparent', before, after: updated });
    return { success: true };
  }

  // Check if target is descendant of source (following father links downward)
  private async isDescendant(targetId: string, sourceId: string): Promise<boolean> {
    // Build upward chain from target to root and see if source appears
    let current = await this.memberModel.findById(targetId).select('father').lean().exec();
    const visited = new Set<string>();
    while (current?.father) {
      const fid = current.father.toString();
      if (visited.has(fid)) break;
      if (fid === sourceId) return true;
      visited.add(fid);
      current = await this.memberModel.findById(fid).select('father').lean().exec();
    }
    return false;
  }

  // Check if target is ancestor of source (i.e., source's upward chain contains target)
  private async isAncestor(targetId: string, sourceId: string): Promise<boolean> {
    return this.isDescendant(sourceId, targetId);
  }

  async buildTree(currentUser: AuthUser, familyId: string, rootId?: string) {
    // Kiểm tra quyền truy cập family
    if (!this.permissionsService.canAccessFamily(currentUser, familyId)) {
      throw new NotFoundException('Bạn không có quyền truy cập dòng họ này');
    }
    
    const members = await this.memberModel
      .find({ $or: [{ family: this.toObjectId(familyId) }, { family: familyId }] })
      .lean()
      .exec();
    const nodes = new Map<string, any>();
    for (const m of members) {
      nodes.set(m._id.toString(), {
        id: m._id.toString(),
        fullName: m.fullName,
        gender: m.gender,
        father: m.father?.toString(),
        mother: (m as any).mother ? (m as any).mother.toString() : undefined,
        spouse: (m as any).spouse ? (m as any).spouse.toString() : undefined,
        children: [] as any[],
      });
    }
    // Link children
    for (const n of nodes.values()) {
      if (n.father && nodes.has(n.father)) {
        nodes.get(n.father).children.push(n);
      }
    }
    const roots: any[] = [];
    if (rootId) {
      if (nodes.has(rootId)) roots.push(nodes.get(rootId));
    } else {
      for (const n of nodes.values()) {
        if (!n.father) roots.push(n);
      }
    }
    return { familyId, roots };
  }
}
