import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { closeE2eApp, createE2eApp, E2eAppContext } from '../helpers/e2e-app.helper';
import { Family, FamilyDocument } from '../../src/families/schemas/family.schema';
import { Member, MemberDocument } from '../../src/members/schemas/member.schema';
import { Union, UnionDocument } from '../../src/unions/schemas/union.schema';
import { User, UserDocument, UserRole } from '../../src/users/schemas/user.schema';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';

describe('Members tree contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let familyModel: Model<FamilyDocument>;
  let memberModel: Model<MemberDocument>;
  let unionModel: Model<UnionDocument>;
  let userModel: Model<UserDocument>;
  let subscriptionsService: SubscriptionsService;

  let familyAId: string;
  let familyBId: string;
  let managerAToken: string;
  let outsiderManagerToken: string;

  let ancestorId: string;
  let spouseId: string;
  let childId: string;
  let grandchildId: string;
  let outsiderSpouseId: string;
  let sameFamilyFatherNoUnionId: string;
  let sameFamilyMotherNoUnionId: string;
  let childWithMotherOnlyId: string;
  let dirtyNormalizeMemberId: string;
  let dirtyNormalizeOutsiderId: string;
  let genderOtherParentId: string;
  let childWithoutParentsId: string;
  let malformedTripleMemberId: string;
  let malformedTriplePartnerId: string;
  let malformedTripleExtraId: string;
  let malformedTripleUnionId: string;
  let malformedDuplicateMemberId: string;
  let malformedDuplicatePartnerId: string;
  let malformedDuplicateUnionId: string;
  let editableUnionPartnerAId: string;
  let editableUnionPartnerBId: string;
  let editableUnionId: string;

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email,
        password: 'StrongPass123',
      })
      .expect(200);

    return response.body.accessToken as string;
  }

  async function seedBinaryUnionScenario(partnerGenders: Array<'male' | 'female' | 'other'>) {
    const suffix = new Types.ObjectId().toString().slice(-6);
    const partners = await memberModel.create(
      partnerGenders.map((gender, index) => ({
        fullName: `Binary Union ${gender} ${index} ${suffix}`,
        family: new Types.ObjectId(familyAId),
        gender,
      })),
    );

    const union = await unionModel.create({
      family: new Types.ObjectId(familyAId),
      partners: partners.map((partner: any) => partner._id),
    });

    const child = await memberModel.create({
      fullName: `Binary Union Child ${suffix}`,
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });

    return {
      unionId: union._id.toString(),
      childId: child._id.toString(),
      partnerIds: partners.map((partner: any) => partner._id.toString()),
    };
  }

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    familyModel = app.get(getModelToken(Family.name));
    memberModel = app.get(getModelToken(Member.name));
    unionModel = app.get(getModelToken(Union.name));
    userModel = app.get(getModelToken(User.name));
    subscriptionsService = app.get(SubscriptionsService);

    const familyA = await familyModel.create({
      name: 'Tran',
      contactName: 'Tran Manager',
      contactPhone: '0900000201',
      address: 'Ha Noi',
    });
    familyAId = familyA._id.toString();

    const familyB = await familyModel.create({
      name: 'Vu',
      contactName: 'Vu Manager',
      contactPhone: '0900000202',
      address: 'Can Tho',
    });
    familyBId = familyB._id.toString();

    await userModel.create([
      {
        fullName: 'Tree Manager A',
        email: 'tree-manager-a@example.com',
        password: await bcrypt.hash('StrongPass123', 10),
        role: UserRole.QUAN_LY,
        managedFamilies: [familyAId],
        isEmailVerified: true,
      },
      {
        fullName: 'Tree Manager B',
        email: 'tree-manager-b@example.com',
        password: await bcrypt.hash('StrongPass123', 10),
        role: UserRole.QUAN_LY,
        managedFamilies: [familyBId],
        isEmailVerified: true,
      },
    ]);

    const managerA = await userModel.findOne({ email: 'tree-manager-a@example.com' }).exec();
    await subscriptionsService.createFreeSubscription(managerA!._id.toString(), familyAId);

    managerAToken = await login('tree-manager-a@example.com');
    outsiderManagerToken = await login('tree-manager-b@example.com');

    const ancestor = await memberModel.create({
      fullName: 'Tran Ancestor',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });
    ancestorId = ancestor._id.toString();

    const spouse = await memberModel.create({
      fullName: 'Tran Spouse',
      family: new Types.ObjectId(familyAId),
      gender: 'female',
      spouse: ancestor._id,
    });
    spouseId = spouse._id.toString();

    await memberModel.findByIdAndUpdate(ancestor._id, { spouse: spouse._id }).exec();

    const child = await memberModel.create({
      fullName: 'Tran Child',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
      father: ancestor._id,
      mother: spouse._id,
    });
    childId = child._id.toString();

    const grandchild = await memberModel.create({
      fullName: 'Tran Grandchild',
      family: new Types.ObjectId(familyAId),
      gender: 'female',
      father: child._id,
    });
    grandchildId = grandchild._id.toString();

    await unionModel.create({
      family: new Types.ObjectId(familyAId),
      partners: [ancestor._id, spouse._id],
    });

    const outsiderSpouse = await memberModel.create({
      fullName: 'Vu Outsider Spouse',
      family: new Types.ObjectId(familyBId),
      gender: 'female',
    });
    outsiderSpouseId = outsiderSpouse._id.toString();

    const fatherNoUnion = await memberModel.create({
      fullName: 'Tran Father No Union',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
      spouse: ancestor._id,
    });
    sameFamilyFatherNoUnionId = fatherNoUnion._id.toString();

    const motherNoUnion = await memberModel.create({
      fullName: 'Tran Mother No Union',
      family: new Types.ObjectId(familyAId),
      gender: 'female',
    });
    sameFamilyMotherNoUnionId = motherNoUnion._id.toString();

    const childWithMotherOnly = await memberModel.create({
      fullName: 'Tran Child With Mother Only',
      family: new Types.ObjectId(familyAId),
      gender: 'female',
      mother: motherNoUnion._id,
    });
    childWithMotherOnlyId = childWithMotherOnly._id.toString();

    const dirtyNormalizeMember = await memberModel.create({
      fullName: 'Dirty Normalize Member',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });
    dirtyNormalizeMemberId = dirtyNormalizeMember._id.toString();

    const dirtyNormalizeOutsider = await memberModel.create({
      fullName: 'Dirty Normalize Outsider',
      family: new Types.ObjectId(familyBId),
      gender: 'female',
      spouse: dirtyNormalizeMember._id,
    });
    dirtyNormalizeOutsiderId = dirtyNormalizeOutsider._id.toString();

    await memberModel.findByIdAndUpdate(dirtyNormalizeMember._id, {
      spouse: dirtyNormalizeOutsider._id,
    }).exec();

    const genderOtherParent = await memberModel.create({
      fullName: 'Tran Gender Other Parent',
      family: new Types.ObjectId(familyAId),
      gender: 'other',
    });
    genderOtherParentId = genderOtherParent._id.toString();

    const childWithoutParents = await memberModel.create({
      fullName: 'Tran Child Without Parents',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });
    childWithoutParentsId = childWithoutParents._id.toString();

    const malformedTripleMember = await memberModel.create({
      fullName: 'Malformed Triple Member',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });
    malformedTripleMemberId = malformedTripleMember._id.toString();

    const malformedTriplePartner = await memberModel.create({
      fullName: 'Malformed Triple Partner',
      family: new Types.ObjectId(familyAId),
      gender: 'female',
      spouse: malformedTripleMember._id,
    });
    malformedTriplePartnerId = malformedTriplePartner._id.toString();

    await memberModel.findByIdAndUpdate(malformedTripleMember._id, {
      spouse: malformedTriplePartner._id,
    }).exec();

    const malformedTripleExtra = await memberModel.create({
      fullName: 'Malformed Triple Extra',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });
    malformedTripleExtraId = malformedTripleExtra._id.toString();

    const malformedTripleUnion = await unionModel.collection.insertOne({
      family: new Types.ObjectId(familyAId),
      partners: [malformedTripleMember._id, malformedTriplePartner._id, malformedTripleExtra._id],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    malformedTripleUnionId = malformedTripleUnion.insertedId.toString();

    const malformedDuplicateMember = await memberModel.create({
      fullName: 'Malformed Duplicate Member',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });
    malformedDuplicateMemberId = malformedDuplicateMember._id.toString();

    const malformedDuplicatePartner = await memberModel.create({
      fullName: 'Malformed Duplicate Partner',
      family: new Types.ObjectId(familyAId),
      gender: 'female',
      spouse: malformedDuplicateMember._id,
    });
    malformedDuplicatePartnerId = malformedDuplicatePartner._id.toString();

    await memberModel.findByIdAndUpdate(malformedDuplicateMember._id, {
      spouse: malformedDuplicatePartner._id,
    }).exec();

    const malformedDuplicateUnion = await unionModel.collection.insertOne({
      family: new Types.ObjectId(familyAId),
      partners: [malformedDuplicateMember._id, malformedDuplicatePartner._id, malformedDuplicatePartner._id],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    malformedDuplicateUnionId = malformedDuplicateUnion.insertedId.toString();

    const editableUnionPartnerA = await memberModel.create({
      fullName: 'Editable Union Partner A',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });
    editableUnionPartnerAId = editableUnionPartnerA._id.toString();

    const editableUnionPartnerB = await memberModel.create({
      fullName: 'Editable Union Partner B',
      family: new Types.ObjectId(familyAId),
      gender: 'female',
    });
    editableUnionPartnerBId = editableUnionPartnerB._id.toString();

    const editableUnion = await unionModel.create({
      family: new Types.ObjectId(familyAId),
      partners: [editableUnionPartnerAId, editableUnionPartnerBId].map((id) => new Types.ObjectId(id)),
    });
    editableUnionId = editableUnion._id.toString();
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('returns a rooted tree for in-scope family and blocks outsider family access', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/members/tree?family=${familyAId}&root=${ancestorId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(200);

    expect(response.body.familyId).toBe(familyAId);
    expect(response.body.roots).toHaveLength(1);
    expect(response.body.roots[0].id).toBe(ancestorId);
    expect(response.body.roots[0].children.map((item: any) => item.id)).toContain(childId);

    await request(app.getHttpServer())
      .get(`/api/members/tree?family=${familyAId}`)
      .set('Authorization', `Bearer ${outsiderManagerToken}`)
      .expect(404);
  });

  it('creates a child through the API when both parents belong to an existing union', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/members')
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        fullName: 'Union Child API',
        family: familyAId,
        gender: 'female',
        father: ancestorId,
        mother: spouseId,
      })
      .expect(201);

    expect(response.body.fullName).toBe('Union Child API');
    expect(response.body.family).toBe(familyAId);
    expect(response.body.father).toBe(ancestorId);
    expect(response.body.mother).toBe(spouseId);
  });

  it('rejects direct child creation when father and mother roles do not map cleanly to male and female even if a valid binary union exists', async () => {
    for (const partnerGenders of [
      ['female', 'male'],
      ['male', 'other'],
      ['other', 'female'],
    ] as Array<Array<'male' | 'female' | 'other'>>) {
      const scenario = await seedBinaryUnionScenario(partnerGenders);
      const beforeCount = await memberModel.countDocuments({ family: new Types.ObjectId(familyAId) }).exec();

      await request(app.getHttpServer())
        .post('/api/members')
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          fullName: `Invalid Direct Child ${partnerGenders.join('-')}`,
          family: familyAId,
          gender: 'female',
          father: scenario.partnerIds[0],
          mother: scenario.partnerIds[1],
        })
        .expect(400);

      const afterCount = await memberModel.countDocuments({ family: new Types.ObjectId(familyAId) }).exec();
      expect(afterCount).toBe(beforeCount);
    }
  });

  it('rejects direct member update when father and mother roles do not map cleanly to male and female even if a valid binary union exists', async () => {
    for (const partnerGenders of [
      ['female', 'male'],
      ['male', 'other'],
      ['other', 'female'],
    ] as Array<Array<'male' | 'female' | 'other'>>) {
      const scenario = await seedBinaryUnionScenario(partnerGenders);
      const beforeChild = await memberModel.findById(scenario.childId).lean().exec();

      await request(app.getHttpServer())
        .put(`/api/members/${scenario.childId}`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          father: scenario.partnerIds[0],
          mother: scenario.partnerIds[1],
        })
        .expect(400);

      const refreshedChild = await memberModel.findById(scenario.childId).lean().exec();
      expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
      expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
    }
  });

  it('rejects changing a referenced father to a non-male gender and leaves dependent children unchanged', async () => {
    for (const nextGender of ['female', 'other'] as Array<'female' | 'other'>) {
      const scenario = await seedBinaryUnionScenario(['male', 'female']);
      await memberModel.findByIdAndUpdate(scenario.childId, {
        father: new Types.ObjectId(scenario.partnerIds[0]),
        mother: new Types.ObjectId(scenario.partnerIds[1]),
      }).exec();

      const beforeFather = await memberModel.findById(scenario.partnerIds[0]).lean().exec();
      const beforeChild = await memberModel.findById(scenario.childId).lean().exec();

      await request(app.getHttpServer())
        .put(`/api/members/${scenario.partnerIds[0]}`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          gender: nextGender,
        })
        .expect(400);

      const refreshedFather = await memberModel.findById(scenario.partnerIds[0]).lean().exec();
      const refreshedChild = await memberModel.findById(scenario.childId).lean().exec();
      expect(refreshedFather?.gender).toBe(beforeFather?.gender);
      expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
      expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
    }
  });

  it('rejects changing a referenced mother to a non-female gender and leaves dependent children unchanged', async () => {
    for (const nextGender of ['male', 'other'] as Array<'male' | 'other'>) {
      const scenario = await seedBinaryUnionScenario(['male', 'female']);
      await memberModel.findByIdAndUpdate(scenario.childId, {
        father: new Types.ObjectId(scenario.partnerIds[0]),
        mother: new Types.ObjectId(scenario.partnerIds[1]),
      }).exec();

      const beforeMother = await memberModel.findById(scenario.partnerIds[1]).lean().exec();
      const beforeChild = await memberModel.findById(scenario.childId).lean().exec();

      await request(app.getHttpServer())
        .put(`/api/members/${scenario.partnerIds[1]}`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          gender: nextGender,
        })
        .expect(400);

      const refreshedMother = await memberModel.findById(scenario.partnerIds[1]).lean().exec();
      const refreshedChild = await memberModel.findById(scenario.childId).lean().exec();
      expect(refreshedMother?.gender).toBe(beforeMother?.gender);
      expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
      expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
    }
  });

  it('rejects cross-family spouse assignment and leaves the outsider member unchanged', async () => {
    const beforeOutsider = await memberModel.findById(outsiderSpouseId).lean().exec();

    await request(app.getHttpServer())
      .put(`/api/members/${ancestorId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        spouse: outsiderSpouseId,
      })
      .expect(400);

    const refreshedAncestor = await memberModel.findById(ancestorId).lean().exec();
    const refreshedOutsider = await memberModel.findById(outsiderSpouseId).lean().exec();

    expect(refreshedAncestor?.spouse?.toString()).toBe(spouseId);
    expect(refreshedOutsider?.spouse?.toString()).toBe(beforeOutsider?.spouse?.toString());
  });

  it('rejects reparent requests that would create a cycle', async () => {
    await request(app.getHttpServer())
      .put(`/api/members/${ancestorId}/reparent`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        fatherId: grandchildId,
      })
      .expect(400);
  });

  it('rejects reparent requests when the selected father and mother do not belong to a union', async () => {
    const beforeChild = await memberModel.findById(childId).lean().exec();

    await request(app.getHttpServer())
      .put(`/api/members/${childId}/reparent`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        fatherId: sameFamilyFatherNoUnionId,
        motherId: sameFamilyMotherNoUnionId,
      })
      .expect(400);

    const refreshedChild = await memberModel.findById(childId).lean().exec();
    expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
    expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
  });

  it('rejects setChildren when the new parent does not share a union with the child other parent', async () => {
    const beforeChild = await memberModel.findById(childWithMotherOnlyId).lean().exec();

    await request(app.getHttpServer())
      .put(`/api/members/${sameFamilyFatherNoUnionId}/children`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        childrenIds: [childWithMotherOnlyId],
      })
      .expect(400);

    const refreshedChild = await memberModel.findById(childWithMotherOnlyId).lean().exec();
    expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
    expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
  });

  it('does not create cross-family unions when normalizeForMember sees dirty spouse backlinks', async () => {
    const beforeCount = await unionModel.countDocuments({
      family: new Types.ObjectId(familyAId),
      partners: new Types.ObjectId(dirtyNormalizeOutsiderId),
    }).exec();

    const response = await request(app.getHttpServer())
      .post(`/api/unions/normalize/${dirtyNormalizeMemberId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(201);

    expect(response.body.created).toEqual([]);

    const afterCount = await unionModel.countDocuments({
      family: new Types.ObjectId(familyAId),
      partners: new Types.ObjectId(dirtyNormalizeOutsiderId),
    }).exec();

    expect(afterCount).toBe(beforeCount);
  });

  it('rejects setChildren when the selected parent has gender other and the parent role is ambiguous', async () => {
    const beforeChild = await memberModel.findById(childWithoutParentsId).lean().exec();

    await request(app.getHttpServer())
      .put(`/api/members/${genderOtherParentId}/children`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        childrenIds: [childWithoutParentsId],
      })
      .expect(400);

    const refreshedChild = await memberModel.findById(childWithoutParentsId).lean().exec();
    expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
    expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
  });

  it('does not create a pair union when normalizeForMember sees a malformed existing union with the same two partners plus an extra partner', async () => {
    const beforeRelevant = await unionModel.find({
      family: new Types.ObjectId(familyAId),
      partners: new Types.ObjectId(malformedTripleMemberId),
    }).lean().exec();

    const response = await request(app.getHttpServer())
      .post(`/api/unions/normalize/${malformedTripleMemberId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(201);

    expect(response.body.created).toEqual([]);

    const afterRelevant = await unionModel.find({
      family: new Types.ObjectId(familyAId),
      partners: new Types.ObjectId(malformedTripleMemberId),
    }).lean().exec();

    const beforeContainingPair = beforeRelevant.filter((union: any) => {
      const partnerIds = (union.partners || []).map((partner: any) => partner.toString());
      return partnerIds.includes(malformedTripleMemberId) && partnerIds.includes(malformedTriplePartnerId);
    });
    const afterContainingPair = afterRelevant.filter((union: any) => {
      const partnerIds = (union.partners || []).map((partner: any) => partner.toString());
      return partnerIds.includes(malformedTripleMemberId) && partnerIds.includes(malformedTriplePartnerId);
    });

    expect(afterContainingPair).toHaveLength(beforeContainingPair.length);
    expect(afterContainingPair).toHaveLength(1);
    expect(afterContainingPair[0].partners.map((partner: any) => partner.toString())).toEqual([
      malformedTripleMemberId,
      malformedTriplePartnerId,
      malformedTripleExtraId,
    ]);
  });

  it('does not create a pair union when normalizeForMember sees a malformed existing union with duplicate partner ids', async () => {
    const beforeRelevant = await unionModel.find({
      family: new Types.ObjectId(familyAId),
      partners: new Types.ObjectId(malformedDuplicateMemberId),
    }).lean().exec();

    const response = await request(app.getHttpServer())
      .post(`/api/unions/normalize/${malformedDuplicateMemberId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(201);

    expect(response.body.created).toEqual([]);

    const afterRelevant = await unionModel.find({
      family: new Types.ObjectId(familyAId),
      partners: new Types.ObjectId(malformedDuplicateMemberId),
    }).lean().exec();

    const beforeContainingPair = beforeRelevant.filter((union: any) => {
      const partnerIds = (union.partners || []).map((partner: any) => partner.toString());
      return partnerIds.includes(malformedDuplicateMemberId) && partnerIds.includes(malformedDuplicatePartnerId);
    });
    const afterContainingPair = afterRelevant.filter((union: any) => {
      const partnerIds = (union.partners || []).map((partner: any) => partner.toString());
      return partnerIds.includes(malformedDuplicateMemberId) && partnerIds.includes(malformedDuplicatePartnerId);
    });

    expect(afterContainingPair).toHaveLength(beforeContainingPair.length);
    expect(afterContainingPair).toHaveLength(1);
    expect(afterContainingPair[0].partners.map((partner: any) => partner.toString())).toEqual([
      malformedDuplicateMemberId,
      malformedDuplicatePartnerId,
      malformedDuplicatePartnerId,
    ]);
  });

  it('rejects creating a union with only one partner and does not persist the record', async () => {
    const beforeCount = await unionModel.countDocuments({ family: new Types.ObjectId(familyAId) }).exec();

    await request(app.getHttpServer())
      .post('/api/unions')
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        family: familyAId,
        partners: [ancestorId],
      })
      .expect(400);

    const afterCount = await unionModel.countDocuments({ family: new Types.ObjectId(familyAId) }).exec();
    expect(afterCount).toBe(beforeCount);
  });

  it('rejects creating a union with more than two distinct partners and does not persist the record', async () => {
    const beforeCount = await unionModel.countDocuments({ family: new Types.ObjectId(familyAId) }).exec();

    await request(app.getHttpServer())
      .post('/api/unions')
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        family: familyAId,
        partners: [ancestorId, spouseId, sameFamilyFatherNoUnionId],
      })
      .expect(400);

    const afterCount = await unionModel.countDocuments({ family: new Types.ObjectId(familyAId) }).exec();
    expect(afterCount).toBe(beforeCount);
  });

  it('rejects creating a union with duplicate partner ids and does not persist the record', async () => {
    const beforeCount = await unionModel.countDocuments({ family: new Types.ObjectId(familyAId) }).exec();

    await request(app.getHttpServer())
      .post('/api/unions')
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        family: familyAId,
        partners: [ancestorId, ancestorId],
      })
      .expect(400);

    const afterCount = await unionModel.countDocuments({ family: new Types.ObjectId(familyAId) }).exec();
    expect(afterCount).toBe(beforeCount);
  });

  it('rejects updating a union to a malformed multi-partner shape and leaves the stored partners unchanged', async () => {
    const beforeUnion = await unionModel.findById(editableUnionId).lean().exec();

    await request(app.getHttpServer())
      .patch(`/api/unions/${editableUnionId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        partners: [ancestorId, spouseId, sameFamilyFatherNoUnionId],
      })
      .expect(400);

    const afterUnion = await unionModel.findById(editableUnionId).lean().exec();
    expect(afterUnion?.partners.map((partner: any) => partner.toString())).toEqual(
      beforeUnion?.partners.map((partner: any) => partner.toString()),
    );
  });

  it('rejects updating a union to duplicate partner ids and leaves the stored partners unchanged', async () => {
    const beforeUnion = await unionModel.findById(editableUnionId).lean().exec();

    await request(app.getHttpServer())
      .patch(`/api/unions/${editableUnionId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        partners: [ancestorId, ancestorId],
      })
      .expect(400);

    const afterUnion = await unionModel.findById(editableUnionId).lean().exec();
    expect(afterUnion?.partners.map((partner: any) => partner.toString())).toEqual(
      beforeUnion?.partners.map((partner: any) => partner.toString()),
    );
  });

  it('rejects reparent when unionId points to a malformed multi-partner union and leaves the member unchanged', async () => {
    const beforeChild = await memberModel.findById(childWithoutParentsId).lean().exec();

    await request(app.getHttpServer())
      .put(`/api/members/${childWithoutParentsId}/reparent`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        unionId: malformedTripleUnionId,
      })
      .expect(400);

    const refreshedChild = await memberModel.findById(childWithoutParentsId).lean().exec();
    expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
    expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
  });

  it('rejects reparent when unionId points to a malformed duplicate-partner union and leaves the member unchanged', async () => {
    const beforeChild = await memberModel.findById(childWithoutParentsId).lean().exec();

    await request(app.getHttpServer())
      .put(`/api/members/${childWithoutParentsId}/reparent`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        unionId: malformedDuplicateUnionId,
      })
      .expect(400);

    const refreshedChild = await memberModel.findById(childWithoutParentsId).lean().exec();
    expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
    expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
  });

  it('rejects reparent when unionId points to a valid same-gender union and leaves the member unchanged', async () => {
    for (const partnerGenders of [
      ['male', 'male'],
      ['female', 'female'],
    ] as Array<Array<'male' | 'female'>>) {
      const scenario = await seedBinaryUnionScenario(partnerGenders);
      const beforeChild = await memberModel.findById(scenario.childId).lean().exec();

      await request(app.getHttpServer())
        .put(`/api/members/${scenario.childId}/reparent`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          unionId: scenario.unionId,
        })
        .expect(400);

      const refreshedChild = await memberModel.findById(scenario.childId).lean().exec();
      expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
      expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
    }
  });

  it('rejects reparent when unionId points to a valid union that includes gender other and leaves the member unchanged', async () => {
    for (const partnerGenders of [
      ['male', 'other'],
      ['female', 'other'],
      ['other', 'other'],
    ] as Array<Array<'male' | 'female' | 'other'>>) {
      const scenario = await seedBinaryUnionScenario(partnerGenders);
      const beforeChild = await memberModel.findById(scenario.childId).lean().exec();

      await request(app.getHttpServer())
        .put(`/api/members/${scenario.childId}/reparent`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          unionId: scenario.unionId,
        })
        .expect(400);

      const refreshedChild = await memberModel.findById(scenario.childId).lean().exec();
      expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
      expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
    }
  });

  it('rejects reparent when explicit father and mother roles do not map cleanly to male and female even if a valid binary union exists', async () => {
    for (const partnerGenders of [
      ['female', 'male'],
      ['male', 'other'],
      ['other', 'female'],
    ] as Array<Array<'male' | 'female' | 'other'>>) {
      const scenario = await seedBinaryUnionScenario(partnerGenders);
      const beforeChild = await memberModel.findById(scenario.childId).lean().exec();

      await request(app.getHttpServer())
        .put(`/api/members/${scenario.childId}/reparent`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          fatherId: scenario.partnerIds[0],
          motherId: scenario.partnerIds[1],
        })
        .expect(400);

      const refreshedChild = await memberModel.findById(scenario.childId).lean().exec();
      expect(refreshedChild?.father?.toString()).toBe(beforeChild?.father?.toString());
      expect(refreshedChild?.mother?.toString()).toBe(beforeChild?.mother?.toString());
    }
  });

  it('returns 400 for malformed member id lookups', async () => {
    await request(app.getHttpServer())
      .get('/api/members/not-a-valid-object-id')
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(400);
  });

  it('returns 400 for malformed family id in tree lookups', async () => {
    await request(app.getHttpServer())
      .get('/api/members/tree?family=not-a-valid-object-id')
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(400);
  });

  it('returns 400 for malformed member id in setChildren', async () => {
    await request(app.getHttpServer())
      .put('/api/members/not-a-valid-object-id/children')
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        childrenIds: [childId],
      })
      .expect(400);
  });

  it('returns 400 for malformed member id in reparent', async () => {
    await request(app.getHttpServer())
      .put('/api/members/not-a-valid-object-id/reparent')
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        fatherId: ancestorId,
      })
      .expect(400);
  });

  it('returns 400 for malformed union id lookups', async () => {
    await request(app.getHttpServer())
      .get('/api/unions/not-a-valid-object-id')
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(400);
  });
});
