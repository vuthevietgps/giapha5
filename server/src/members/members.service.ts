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

/** Escape regex special characters to prevent ReDoS */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
  }

  private idVariants(id: string) {
    const variants: Array<string | Types.ObjectId> = [id];
    const objectId = this.toObjectId(id);
    if (objectId) variants.push(objectId);
    return variants;
  }

  /** Match a reference field that may be stored as string or ObjectId */
  private refMatch(id: string) {
    return { $in: this.idVariants(id) };
  }

  /** Convert empty strings to undefined for all optional fields */
  private cleanEmptyStrings(dto: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = { ...dto };
    for (const key of Object.keys(cleaned)) {
      if (cleaned[key] === '') {
        cleaned[key] = undefined;
      }
    }
    return cleaned;
  }

  private familyFilter(familyId: string) {
    return { family: this.refMatch(familyId) };
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

  private async ensureSameFamily(familyId: string, ...memberIds: (string | undefined)[]) {
    const ids = memberIds.filter(Boolean) as string[];
    if (!ids.length) return;
    const count = await this.memberModel.countDocuments({
      _id: { $in: ids },
      family: this.refMatch(familyId),
    });
    if (count !== ids.length) throw new BadRequestException('Thành viên tham chiếu không thuộc cùng dòng họ');
  }

  private async validateRootMaleRule(familyId: string, gender: string, father?: string, mother?: string, spouse?: string, excludeId?: string) {
    // Only one root male (no father, no mother, no spouse) allowed per family.
    // A male WITH a spouse but without parents is an in-law, NOT a competing root ancestor.
    if (gender === 'male' && !father && !mother && !spouse) {
      const filter: Record<string, any> = {
        family: this.refMatch(familyId),
        gender: 'male',
        $or: [
          { father: { $exists: false } },
          { father: null },
        ],
        $and: [
          { $or: [{ mother: { $exists: false } }, { mother: null }] },
        ],
      };
      if (excludeId) filter._id = { $ne: excludeId };
      const existingRootMale = await this.memberModel.exists(filter);
      if (existingRootMale) {
        throw new BadRequestException('Mỗi dòng họ chỉ có một cụ tổ (nam) không có cha mẹ');
      }
    }
  }

  private async validateDependentParentRoleSemantics(memberId: string, nextGender?: string) {
    if (!nextGender) return;
    if (nextGender !== 'male') {
      const isReferencedAsFather = await this.memberModel.exists({ father: this.refMatch(memberId) });
      if (isReferencedAsFather) {
        throw new BadRequestException('Không thể đổi giới tính vì thành viên này đang là bố của người khác');
      }
    }
    if (nextGender !== 'female') {
      const isReferencedAsMother = await this.memberModel.exists({ mother: this.refMatch(memberId) });
      if (isReferencedAsMother) {
        throw new BadRequestException('Không thể đổi giới tính vì thành viên này đang là mẹ của người khác');
      }
    }
  }

  private async validateUnionExists(familyId: string, fatherId: string, motherId: string) {
    const unions = await this.unionModel.find({
      family: this.refMatch(familyId),
      $and: [
        { partners: { $in: this.idVariants(fatherId) } },
        { partners: { $in: this.idVariants(motherId) } },
      ],
    }).lean().exec();
    const hasValidBinaryUnion = unions.some((union: any) => {
      const partnerIds = (union.partners || []).map((partner: any) => partner.toString());
      return partnerIds.length === 2
        && new Set(partnerIds).size === 2
        && partnerIds.includes(fatherId)
        && partnerIds.includes(motherId);
    });
    if (!hasValidBinaryUnion) {
      throw new BadRequestException('Cha và Mẹ phải thuộc cùng một hôn phối (union) trong họ');
    }
  }

  private async validateParentUnionInvariant(familyId: string, fatherId?: string, motherId?: string) {
    await this.validateParentRoleSemantics(fatherId, motherId);
    if (fatherId && motherId) {
      await this.validateUnionExists(familyId, fatherId, motherId);
    }
  }

  private async validateParentRoleSemantics(fatherId?: string, motherId?: string) {
    const ids = [fatherId, motherId].filter(Boolean) as string[];
    if (!ids.length) return;
    const members = await this.memberModel.find({ _id: { $in: ids } }).select('gender').lean().exec();
    const byId = new Map(members.map((member: any) => [member._id.toString(), member]));
    if (fatherId) {
      const father = byId.get(fatherId);
      if (!father || father.gender !== 'male') {
        throw new BadRequestException('Bố phải là thành viên nam');
      }
    }
    if (motherId) {
      const mother = byId.get(motherId);
      if (!mother || mother.gender !== 'female') {
        throw new BadRequestException('Mẹ phải là thành viên nữ');
      }
    }
  }

  private resolveBinaryParentsFromPartners(partners: Array<{ _id: any; gender?: string }>) {
    const malePartners = partners.filter((partner) => partner.gender === 'male');
    const femalePartners = partners.filter((partner) => partner.gender === 'female');
    if (malePartners.length !== 1 || femalePartners.length !== 1) {
      throw new BadRequestException('Union phải suy ra đúng 1 cha và 1 mẹ');
    }
    return {
      fatherId: malePartners[0]._id.toString(),
      motherId: femalePartners[0]._id.toString(),
    };
  }

  private auditFamilyId(value: any): string | undefined {
    if (!value) return undefined;
    return typeof value === 'string' ? value : value.toString();
  }

  async create(dto: CreateMemberDto, currentUser?: AuthUser) {
    if (currentUser) this.ensureCanAccessFamily(currentUser, dto.family);
    await this.ensureFamilyExists(dto.family);

    const cleanDto = this.cleanEmptyStrings({ ...dto });
    await this.ensureSameFamily(cleanDto.family, cleanDto.father, cleanDto.mother, cleanDto.spouse);

    // Business rule: Only one root male per family
    const effectiveGender = cleanDto.gender || 'male';
    await this.validateRootMaleRule(cleanDto.family, effectiveGender, cleanDto.father, cleanDto.mother, cleanDto.spouse);

    // If both father and mother provided, require a union
    await this.validateParentUnionInvariant(cleanDto.family, cleanDto.father, cleanDto.mother);

    const payload: any = { ...cleanDto };
    if (cleanDto.password) payload.password = await hash(cleanDto.password, 10);
    if (cleanDto.dob) payload.dob = new Date(cleanDto.dob);
    if (cleanDto.dod) payload.dod = new Date(cleanDto.dod);

    if (payload.spouse && payload.spouse === payload.father) {
      throw new BadRequestException('Vợ/Chồng không thể là Bố');
    }
    if (payload.spouse && payload.spouse === payload.mother) {
      throw new BadRequestException('Vợ/Chồng không thể là Mẹ');
    }

    try {
      if (payload.family) payload.family = this.toObjectId(payload.family) ?? payload.family;
      if (payload.father) payload.father = this.toObjectId(payload.father) ?? payload.father;
      if (payload.mother) payload.mother = this.toObjectId(payload.mother) ?? payload.mother;
      if (payload.spouse) payload.spouse = this.toObjectId(payload.spouse) ?? payload.spouse;
      if (payload.position) payload.position = this.toObjectId(payload.position) ?? payload.position;

      const created = await this.memberModel.create(payload);
      const json = created.toJSON();
      await this.audit.log({
        entity: 'member',
        entityId: String(json._id),
        action: 'create',
        family: this.auditFamilyId(json.family),
        after: json,
      });
      return json;
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('Email đã tồn tại');
      throw e;
    }
  }

  async findAll(currentUser: AuthUser, params: { family?: string; q?: string }) {
    const filter: any = {};

    const accessibleFamilies = this.permissionsService.getAccessibleFamilyIds(currentUser);
    if (accessibleFamilies !== null) {
      if (accessibleFamilies.length === 0) return [];
      filter.family = { $in: accessibleFamilies.flatMap(id => this.idVariants(id)) };
    }

    if (params.family) {
      if (accessibleFamilies !== null && !accessibleFamilies.includes(params.family)) {
        return [];
      }
      filter.family = this.refMatch(params.family);
    }

    if (params.q) filter.fullName = { $regex: escapeRegex(params.q), $options: 'i' };
    const list = await this.memberModel.find(filter).sort({ fullName: 1 }).exec();
    return list.map((d) => d.toJSON());
  }

  async findOne(id: string, currentUser?: AuthUser) {
    const found = await this.memberModel.findById(id).exec();
    if (!found) throw new NotFoundException('Không tìm thấy thành viên');
    if (currentUser) this.ensureCanAccessFamily(currentUser, found.family.toString());
    return found.toJSON();
  }

  async update(id: string, dto: UpdateMemberDto, currentUser?: AuthUser) {
    const current = await this.memberModel.findById(id).select('family gender father mother spouse').lean().exec();
    if (!current) throw new NotFoundException('Không tìm thấy thành viên');
    const currentFamilyId = current.family?.toString();
    if (!currentFamilyId) throw new NotFoundException('Không tìm thấy thành viên');
    if (currentUser) this.ensureCanAccessFamily(currentUser, currentFamilyId);

    if (dto.family) await this.ensureFamilyExists(dto.family);
    if (currentUser && dto.family) this.ensureCanAccessFamily(currentUser, dto.family);

    const cleanDto = this.cleanEmptyStrings({ ...dto });
    const familyIdForRefChecks = cleanDto.family || currentFamilyId;
    if (!familyIdForRefChecks) throw new NotFoundException('Không tìm thấy thành viên');
    await this.ensureSameFamily(familyIdForRefChecks, cleanDto.father, cleanDto.mother, cleanDto.spouse);

    const affectsGender = Object.prototype.hasOwnProperty.call(cleanDto, 'gender');
    const affectsFather = Object.prototype.hasOwnProperty.call(cleanDto, 'father');
    const affectsMother = Object.prototype.hasOwnProperty.call(cleanDto, 'mother');
    const affectsSpouse = Object.prototype.hasOwnProperty.call(cleanDto, 'spouse');

    // Cycle prevention
    if (affectsFather && cleanDto.father) {
      if (cleanDto.father === id) throw new BadRequestException('Bố không thể là chính mình');
      const isCycle = await this.isDescendant(cleanDto.father, id);
      if (isCycle) throw new BadRequestException('Thiết lập Bố tạo vòng lặp');
    }
    if (affectsSpouse && cleanDto.spouse) {
      if (cleanDto.spouse === id) throw new BadRequestException('Vợ/Chồng không thể là chính mình');
    }
    if (affectsMother && cleanDto.mother) {
      if (cleanDto.mother === id) throw new BadRequestException('Mẹ không thể là chính mình');
      const cycle = await this.isDescendant(cleanDto.mother, id);
      if (cycle) throw new BadRequestException('Thiết lập Mẹ tạo vòng lặp');
    }

    // Root male rule
    if (affectsGender || affectsFather || affectsMother || affectsSpouse) {
      const newGender = cleanDto.gender ?? (current?.gender ?? 'male');
      const newFather = cleanDto.father ?? current?.father?.toString();
      const newMother = cleanDto.mother ?? current?.mother?.toString();
      const newSpouse = cleanDto.spouse ?? current?.spouse?.toString();
      if (affectsGender) {
        await this.validateDependentParentRoleSemantics(id, cleanDto.gender);
      }
      await this.validateRootMaleRule(familyIdForRefChecks, newGender, newFather, newMother, newSpouse, id);

      // Union validation
      if (affectsFather || affectsMother) {
        await this.validateParentUnionInvariant(familyIdForRefChecks, newFather, newMother);
      }
    }

    const payload: any = { ...cleanDto };
    // Explicitly cast ObjectId reference fields
    if (payload.family) payload.family = this.toObjectId(payload.family) ?? payload.family;
    if (payload.father) payload.father = this.toObjectId(payload.father) ?? payload.father;
    if (payload.mother) payload.mother = this.toObjectId(payload.mother) ?? payload.mother;
    if (payload.spouse) payload.spouse = this.toObjectId(payload.spouse) ?? payload.spouse;
    if (payload.position) payload.position = this.toObjectId(payload.position) ?? payload.position;
    if (cleanDto.password) payload.password = await hash(cleanDto.password, 10);
    if (cleanDto.dob) payload.dob = new Date(cleanDto.dob);
    if (cleanDto.dod) payload.dod = new Date(cleanDto.dod);

    try {
      const before = await this.memberModel.findById(id).lean().exec();
      const updated = await this.memberModel.findByIdAndUpdate(id, payload, { new: true }).exec();
      if (!updated) throw new NotFoundException('Không tìm thấy thành viên');

      // Maintain spouse symmetry
      if (affectsSpouse) {
        await this.memberModel.updateMany({ spouse: this.refMatch(id), _id: { $ne: cleanDto.spouse } }, { $unset: { spouse: 1 } }).exec();
        if (cleanDto.spouse) {
          await this.memberModel.findByIdAndUpdate(cleanDto.spouse, { spouse: id }).exec();
        }
      }

      const json = updated.toJSON();
      await this.audit.log({
        entity: 'member',
        entityId: id,
        action: 'update',
        family: this.auditFamilyId(json.family) || this.auditFamilyId(before?.family),
        before,
        after: json,
      });
      return json;
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('Email đã tồn tại');
      throw e;
    }
  }

  async remove(id: string, currentUser?: AuthUser) {
    const before = await this.memberModel.findById(id).lean().exec();
    if (!before) throw new NotFoundException('Không tìm thấy thành viên');
    if (currentUser) this.ensureCanAccessFamily(currentUser, before.family.toString());
    const res = await this.memberModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Không tìm thấy thành viên');
    await this.memberModel.updateMany({ father: this.refMatch(id) }, { $unset: { father: 1 } }).exec();
    await this.memberModel.updateMany({ spouse: this.refMatch(id) }, { $unset: { spouse: 1 } }).exec();
    await this.memberModel.updateMany({ mother: this.refMatch(id) }, { $unset: { mother: 1 } }).exec();
    // Clean up unions referencing this member
    await this.unionModel.updateMany(
      { partners: this.refMatch(id) },
      { $pull: { partners: { $in: [id, this.toObjectId(id)] } } },
    ).exec();
    // Remove unions that have less than 2 partners after cleanup
    await this.unionModel.deleteMany({ 'partners.1': { $exists: false } }).exec();
    // Clear rootMember reference in family
    await this.familyModel.updateMany({ rootMember: id }, { $unset: { rootMember: 1 } }).exec();
    await this.audit.log({
      entity: 'member',
      entityId: id,
      action: 'delete',
      family: this.auditFamilyId(before.family),
      before,
    });
    return { success: true };
  }

  async listByFamily(familyId: string, currentUser?: AuthUser) {
    // Enforce family-level permission check
    if (currentUser && !this.permissionsService.canAccessFamily(currentUser, familyId)) {
      throw new NotFoundException('Bạn không có quyền truy cập dòng họ này');
    }
    const list = await this.memberModel
      .find({ family: this.refMatch(familyId) })
      .sort({ fullName: 1 })
      .exec();
    return list.map((d) => d.toJSON());
  }

  async setChildren(parentId: string, childrenIds: string[], currentUser?: AuthUser) {
    const parent = await this.memberModel.findById(parentId).exec();
    if (!parent) throw new NotFoundException('Không tìm thấy thành viên');
    const familyId = parent.family.toString();
    if (currentUser) this.ensureCanAccessFamily(currentUser, familyId);
    const parentGender = parent.gender || 'male';
    if (parentGender !== 'male' && parentGender !== 'female') {
      throw new BadRequestException('Chỉ hỗ trợ thiết lập con cho thành viên có giới tính nam hoặc nữ');
    }
    await this.ensureSameFamily(familyId, ...childrenIds);
    const children = await this.memberModel.find({ _id: { $in: childrenIds } }).select('_id father mother').lean().exec();
    for (const childId of childrenIds) {
      if (childId === parentId) throw new BadRequestException('Con không thể là chính mình');
      const cycle = await this.isAncestor(childId, parentId);
      if (cycle) throw new BadRequestException('Thiết lập Con tạo vòng lặp');
    }
    for (const child of children) {
      const fatherId = parentGender === 'female' ? child.father?.toString() : parentId;
      const motherId = parentGender === 'female' ? parentId : child.mother?.toString();
      await this.validateParentUnionInvariant(familyId, fatherId, motherId);
    }
    // Set parent based on gender: male => father, female => mother
    const parentField = parentGender === 'female' ? 'mother' : 'father';
    await this.memberModel.updateMany({ [parentField]: this.refMatch(parentId), _id: { $nin: childrenIds } }, { $unset: { [parentField]: 1 } }).exec();
    await this.memberModel.updateMany({ _id: { $in: childrenIds } }, { $set: { [parentField]: parentId } }).exec();
    return { success: true };
  }

  async reparent(personId: string, body: { unionId?: string; fatherId?: string; motherId?: string }, currentUser?: AuthUser) {
    const person = await this.memberModel.findById(personId).exec();
    if (!person) throw new NotFoundException('Không tìm thấy thành viên');
    let fatherId = body.fatherId;
    let motherId = body.motherId;
    if (body.unionId) {
      const union = await this.unionModel.findById(body.unionId).lean().exec();
      if (!union) throw new NotFoundException('Không tìm thấy union');
      const partnerIds: string[] = (union.partners || []).map((p: any) => p.toString());
      if (partnerIds.length !== 2 || new Set(partnerIds).size !== 2) {
        throw new BadRequestException('Union phải có đúng 2 thành viên khác nhau');
      }
      const partners = await this.memberModel.find({ _id: { $in: partnerIds } }).select('gender').lean().exec();
      const resolvedParents = this.resolveBinaryParentsFromPartners(
        partners as Array<{ _id: any; gender?: string }>,
      );
      fatherId = resolvedParents.fatherId;
      motherId = resolvedParents.motherId;
    }

    const familyId = person.family.toString();
    if (currentUser) this.ensureCanAccessFamily(currentUser, familyId);
    await this.ensureSameFamily(familyId, fatherId, motherId);
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

    await this.validateParentUnionInvariant(familyId, fatherId, motherId);

    const before = await this.memberModel.findById(personId).lean().exec();
    const updated = await this.memberModel.findByIdAndUpdate(personId, { father: fatherId, mother: motherId }, { new: true }).lean().exec();
    await this.audit.log({
      entity: 'member',
      entityId: personId,
      action: 'reparent',
      family: this.auditFamilyId(updated?.family) || this.auditFamilyId(before?.family),
      before,
      after: updated,
    });
    return { success: true };
  }

  /**
   * Check if targetId is a descendant of sourceId by traversing BOTH father and mother links.
   * Uses BFS to detect cycles through any parent path.
   */
  private async isDescendant(targetId: string, sourceId: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue: string[] = [targetId];
    while (queue.length) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const current = await this.memberModel.findById(currentId).select('father mother').lean().exec();
      if (!current) continue;
      const parentIds = [
        current.father?.toString(),
        current.mother?.toString(),
      ].filter(Boolean) as string[];
      for (const pid of parentIds) {
        if (pid === sourceId) return true;
        if (!visited.has(pid)) queue.push(pid);
      }
    }
    return false;
  }

  private async isAncestor(targetId: string, sourceId: string): Promise<boolean> {
    return this.isDescendant(sourceId, targetId);
  }

  async buildTree(currentUser: AuthUser, familyId: string, rootId?: string) {
    if (!this.permissionsService.canAccessFamily(currentUser, familyId)) {
      throw new NotFoundException('Bạn không có quyền truy cập dòng họ này');
    }

    const members = await this.memberModel
      .find({ family: this.refMatch(familyId) })
      .lean()
      .exec();

    const nodes = new Map<string, any>();
    for (const m of members) {
      nodes.set(m._id.toString(), {
        id: m._id.toString(),
        fullName: m.fullName,
        gender: m.gender,
        dob: m.dob,
        dod: m.dod,
        father: m.father?.toString(),
        mother: m.mother?.toString(),
        spouse: m.spouse?.toString(),
        children: [] as any[],
      });
    }

    // Build children via BOTH father and mother links (dedup)
    for (const n of nodes.values()) {
      const addedChildren = new Set<string>();
      if (n.father && nodes.has(n.father)) {
        const parent = nodes.get(n.father);
        if (!addedChildren.has(n.id)) {
          parent.children.push(n);
          addedChildren.add(n.id);
        }
      }
      if (n.mother && nodes.has(n.mother)) {
        const parent = nodes.get(n.mother);
        // Avoid duplicate if already added via father who is in same couple
        if (!parent.children.some((c: any) => c.id === n.id)) {
          parent.children.push(n);
        }
      }
    }

    const roots: any[] = [];
    if (rootId) {
      if (nodes.has(rootId)) roots.push(nodes.get(rootId));
    } else {
      for (const n of nodes.values()) {
        if (!n.father && !n.mother) roots.push(n);
      }
    }
    return { familyId, roots };
  }
}
