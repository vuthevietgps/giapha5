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

describe('Families public-share contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let familyModel: Model<FamilyDocument>;
  let memberModel: Model<MemberDocument>;
  let unionModel: Model<UnionDocument>;
  let userModel: Model<UserDocument>;

  let familyAId: string;
  let familyBId: string;
  let managerAToken: string;
  let outsiderManagerToken: string;
  let employeeAToken: string;
  let unionOnlyHusbandId: string;
  let unionOnlyWifeId: string;

  async function ensurePublicToken() {
    const family = await familyModel.findById(familyAId).lean().exec();
    if (family?.isPublic && family.shareToken) {
      return family.shareToken;
    }

    const response = await request(app.getHttpServer())
      .post(`/api/families/${familyAId}/toggle-share`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(201);

    return response.body.shareToken as string;
  }

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

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    familyModel = app.get(getModelToken(Family.name));
    memberModel = app.get(getModelToken(Member.name));
    unionModel = app.get(getModelToken(Union.name));
    userModel = app.get(getModelToken(User.name));

    const familyA = await familyModel.create({
      name: 'Pham',
      contactName: 'Pham Manager',
      contactPhone: '0900000101',
      address: 'Ho Chi Minh City',
    });
    familyAId = familyA._id.toString();

    const familyB = await familyModel.create({
      name: 'Hoang',
      contactName: 'Hoang Manager',
      contactPhone: '0900000102',
      address: 'Da Nang',
    });
    familyBId = familyB._id.toString();

    const ancestor = await memberModel.create({
      fullName: 'Pham Ancestor',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });

    await familyModel.findByIdAndUpdate(familyAId, { rootMember: ancestor._id.toString() }).exec();

    await memberModel.collection.insertOne({
      _id: new Types.ObjectId(),
      fullName: 'Legacy Family Ref Member',
      family: familyAId,
      gender: 'female',
      isMartyred: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    });

    const unionOnlyHusband = await memberModel.create({
      fullName: 'Union Only Husband',
      family: new Types.ObjectId(familyAId),
      gender: 'male',
    });
    unionOnlyHusbandId = unionOnlyHusband._id.toString();

    const unionOnlyWife = await memberModel.create({
      fullName: 'Union Only Wife',
      family: new Types.ObjectId(familyAId),
      gender: 'female',
    });
    unionOnlyWifeId = unionOnlyWife._id.toString();

    await unionModel.create({
      family: new Types.ObjectId(familyAId),
      partners: [unionOnlyHusband._id, unionOnlyWife._id],
    });

    await userModel.create([
      {
        fullName: 'Manager A',
        email: 'family-manager-a@example.com',
        password: await bcrypt.hash('StrongPass123', 10),
        role: UserRole.QUAN_LY,
        managedFamilies: [familyAId],
        isEmailVerified: true,
      },
      {
        fullName: 'Manager B',
        email: 'family-manager-b@example.com',
        password: await bcrypt.hash('StrongPass123', 10),
        role: UserRole.QUAN_LY,
        managedFamilies: [familyBId],
        isEmailVerified: true,
      },
      {
        fullName: 'Employee A',
        email: 'family-employee-a@example.com',
        password: await bcrypt.hash('StrongPass123', 10),
        role: UserRole.NHAN_VIEN,
        assignedFamily: familyAId,
        isEmailVerified: true,
      },
    ]);

    managerAToken = await login('family-manager-a@example.com');
    outsiderManagerToken = await login('family-manager-b@example.com');
    employeeAToken = await login('family-employee-a@example.com');
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('toggles public sharing on and off, serves public family data, and revokes old tokens', async () => {
    const enableResponse = await request(app.getHttpServer())
      .post(`/api/families/${familyAId}/toggle-share`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(201);

    expect(enableResponse.body.isPublic).toBe(true);
    expect(enableResponse.body.shareToken).toMatch(/^[a-f0-9]{32}$/);

    const firstToken = enableResponse.body.shareToken as string;

    const publicFamilyResponse = await request(app.getHttpServer())
      .get(`/api/families/public/${firstToken}`)
      .expect(200);

    expect(publicFamilyResponse.body.id).toBe(familyAId);
    expect(publicFamilyResponse.body.name).toBe('Pham');
    expect(publicFamilyResponse.body.rootMember).toBeDefined();

    const publicMembersResponse = await request(app.getHttpServer())
      .get(`/api/families/public/${firstToken}/members`)
      .expect(200);

    const memberNames = publicMembersResponse.body.map((member: any) => member.fullName);
    expect(memberNames).toEqual(expect.arrayContaining(['Pham Ancestor', 'Legacy Family Ref Member']));

    const disableResponse = await request(app.getHttpServer())
      .post(`/api/families/${familyAId}/toggle-share`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(201);

    expect(disableResponse.body).toEqual({
      isPublic: false,
      shareToken: null,
    });

    await request(app.getHttpServer())
      .get(`/api/families/public/${firstToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/families/public/${firstToken}/members`)
      .expect(404);

    const secondEnableResponse = await request(app.getHttpServer())
      .post(`/api/families/${familyAId}/toggle-share`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(201);

    expect(secondEnableResponse.body.isPublic).toBe(true);
    expect(secondEnableResponse.body.shareToken).toMatch(/^[a-f0-9]{32}$/);
    expect(secondEnableResponse.body.shareToken).not.toBe(firstToken);

    await request(app.getHttpServer())
      .get(`/api/families/public/${firstToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/families/public/${secondEnableResponse.body.shareToken}`)
      .expect(200);
  });

  it('rejects invalid public token lookups', async () => {
    await request(app.getHttpServer())
      .get('/api/families/public/not-a-real-token')
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/families/public/not-a-real-token/members')
      .expect(404);
  });

  it('keeps toggle-share protected for unauthenticated, underprivileged, and out-of-scope users', async () => {
    await request(app.getHttpServer())
      .post(`/api/families/${familyAId}/toggle-share`)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/families/${familyAId}/toggle-share`)
      .set('Authorization', `Bearer ${employeeAToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/families/${familyAId}/toggle-share`)
      .set('Authorization', `Bearer ${outsiderManagerToken}`)
      .expect(404);
  });

  it('does not leak internal share-management fields in the public family payload', async () => {
    const token = await ensurePublicToken();

    const response = await request(app.getHttpServer())
      .get(`/api/families/public/${token}`)
      .expect(200);

    expect(response.body.id).toBe(familyAId);
    expect(response.body.name).toBe('Pham');
    expect(response.body.contactName).toBe('Pham Manager');
    expect(response.body.address).toBe('Ho Chi Minh City');
    expect(response.body).not.toHaveProperty('shareToken');
    expect(response.body).not.toHaveProperty('isPublic');
    expect(response.body).not.toHaveProperty('contactPhone');
    expect(response.body).not.toHaveProperty('createdAt');
    expect(response.body).not.toHaveProperty('updatedAt');
  });

  it('materializes spouse links in public members even when the relationship exists only in unions', async () => {
    const token = await ensurePublicToken();

    const response = await request(app.getHttpServer())
      .get(`/api/families/public/${token}/members`)
      .expect(200);

    const husband = response.body.find((member: any) => member.id === unionOnlyHusbandId);
    const wife = response.body.find((member: any) => member.id === unionOnlyWifeId);

    expect(husband).toBeDefined();
    expect(wife).toBeDefined();
    expect(husband.spouse).toBe(unionOnlyWifeId);
    expect(wife.spouse).toBe(unionOnlyHusbandId);
  });
});
