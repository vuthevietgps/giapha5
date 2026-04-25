import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MembersService } from './members.service';
import { Member } from './schemas/member.schema';
import { Family } from '../families/schemas/family.schema';
import { Union } from '../unions/schemas/union.schema';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../auth/permissions.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

// Helper to create a mock Mongoose model
function createMockModel() {
  const model: any = jest.fn();
  model.find = jest.fn().mockReturnThis();
  model.findById = jest.fn().mockReturnThis();
  model.findOne = jest.fn().mockReturnThis();
  model.findByIdAndUpdate = jest.fn().mockReturnThis();
  model.findByIdAndDelete = jest.fn().mockReturnThis();
  model.countDocuments = jest.fn();
  model.exists = jest.fn();
  model.create = jest.fn();
  model.updateMany = jest.fn().mockReturnThis();
  model.select = jest.fn().mockReturnThis();
  model.sort = jest.fn().mockReturnThis();
  model.lean = jest.fn().mockReturnThis();
  model.exec = jest.fn();
  return model;
}

describe('MembersService', () => {
  let service: MembersService;
  let memberModel: any;
  let familyModel: any;
  let unionModel: any;
  let auditService: any;
  let permissionsService: PermissionsService;

  const mockFamilyId = new Types.ObjectId().toString();
  const mockMemberId = new Types.ObjectId().toString();

  beforeEach(async () => {
    memberModel = createMockModel();
    familyModel = createMockModel();
    unionModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getModelToken(Member.name), useValue: memberModel },
        { provide: getModelToken(Family.name), useValue: familyModel },
        { provide: getModelToken(Union.name), useValue: unionModel },
        { provide: AuditService, useValue: { log: jest.fn() } },
        PermissionsService,
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    auditService = module.get<AuditService>(AuditService);
    permissionsService = module.get<PermissionsService>(PermissionsService);
  });

  describe('create', () => {
    it('should throw if family does not exist', async () => {
      familyModel.exists.mockResolvedValue(null);

      await expect(
        service.create({ fullName: 'Test', family: mockFamilyId } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if there is already a root male without parents', async () => {
      familyModel.exists.mockResolvedValue({ _id: mockFamilyId });
      memberModel.countDocuments.mockResolvedValue(0);
      memberModel.exists.mockResolvedValue({ _id: 'existing-root' });

      await expect(
        service.create({
          fullName: 'Test Male',
          family: mockFamilyId,
          gender: 'male',
        } as any),
      ).rejects.toThrow('Mỗi dòng họ chỉ có một cụ tổ (nam) không có cha mẹ');
    });

    it('should allow creating female without father/mother', async () => {
      familyModel.exists.mockResolvedValue({ _id: mockFamilyId });
      memberModel.countDocuments.mockResolvedValue(0);
      const mockCreated = {
        _id: new Types.ObjectId(),
        fullName: 'Female Test',
        family: mockFamilyId,
        gender: 'female',
        toJSON() { return { id: this._id.toString(), fullName: this.fullName }; },
      };
      memberModel.create.mockResolvedValue(mockCreated);

      const result = await service.create({
        fullName: 'Female Test',
        family: mockFamilyId,
        gender: 'female',
      } as any);

      expect(result).toBeDefined();
      expect(result.fullName).toBe('Female Test');
    });

    it('should throw if father and mother are not in a union', async () => {
      const fatherId = new Types.ObjectId().toString();
      const motherId = new Types.ObjectId().toString();
      familyModel.exists.mockResolvedValue({ _id: mockFamilyId });
      memberModel.countDocuments.mockResolvedValue(2); // both members in same family
      memberModel.exists.mockResolvedValue(null); // no existing root male
      memberModel.find = jest.fn().mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () => Promise.resolve([
              { _id: fatherId, gender: 'male' },
              { _id: motherId, gender: 'female' },
            ]),
          }),
        }),
      });

      unionModel.find = jest.fn().mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve([]) }),
      });

      await expect(
        service.create({
          fullName: 'Child',
          family: mockFamilyId,
          father: fatherId,
          mother: motherId,
          gender: 'male',
        } as any),
      ).rejects.toThrow('Cha và Mẹ phải thuộc cùng một hôn phối (union) trong họ');
    });

    it('should allow child creation when union partners are stored with legacy string refs', async () => {
      const fatherId = new Types.ObjectId().toString();
      const motherId = new Types.ObjectId().toString();
      familyModel.exists.mockResolvedValue({ _id: mockFamilyId });
      memberModel.countDocuments.mockResolvedValue(2);
      memberModel.find = jest.fn().mockReturnValue({
        select: () => ({
          lean: () => ({
            exec: () => Promise.resolve([
              { _id: fatherId, gender: 'male' },
              { _id: motherId, gender: 'female' },
            ]),
          }),
        }),
      });
      const mockCreated = {
        _id: new Types.ObjectId(),
        fullName: 'Child',
        family: mockFamilyId,
        toJSON() { return { id: this._id.toString(), fullName: this.fullName }; },
      };
      unionModel.find = jest.fn().mockImplementation((filter: any) => ({
        lean: () => ({
          exec: () => Promise.resolve(
            Array.isArray(filter?.$and)
            && filter.$and.some((clause: any) => clause.partners?.$in?.includes(fatherId))
            && filter.$and.some((clause: any) => clause.partners?.$in?.includes(motherId))
              ? [{ _id: new Types.ObjectId(), partners: [fatherId, motherId] }]
              : [],
          ),
        }),
      }));
      memberModel.create.mockResolvedValue(mockCreated);

      const result = await service.create({
        fullName: 'Child',
        family: mockFamilyId,
        father: fatherId,
        mother: motherId,
        gender: 'male',
      } as any);

      expect(result).toBeDefined();
      expect(result.fullName).toBe('Child');
    });

    it('should clean empty strings in dto', async () => {
      familyModel.exists.mockResolvedValue({ _id: mockFamilyId });
      memberModel.countDocuments.mockResolvedValue(0);
      memberModel.exists.mockResolvedValue(null);
      const mockCreated = {
        _id: new Types.ObjectId(),
        fullName: 'Test',
        family: mockFamilyId,
        toJSON() { return { id: this._id.toString(), fullName: this.fullName }; },
      };
      memberModel.create.mockResolvedValue(mockCreated);

      await service.create({
        fullName: 'Test',
        family: mockFamilyId,
        father: '',
        mother: '',
        spouse: '',
        email: '',
        phone: '',
        bio: '',
      } as any);

      // Verify create was called without empty string fields
      const createArg = memberModel.create.mock.calls[0][0];
      expect(createArg.father).toBeUndefined();
      expect(createArg.mother).toBeUndefined();
      expect(createArg.spouse).toBeUndefined();
      expect(createArg.email).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if member not found', async () => {
      memberModel.findById = jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) });

      await expect(service.findOne(mockMemberId)).rejects.toThrow(NotFoundException);
    });

    it('should return member if found', async () => {
      const mockMember = {
        _id: mockMemberId,
        fullName: 'Test',
        toJSON() { return { id: this._id, fullName: this.fullName }; },
      };
      memberModel.findById = jest.fn().mockReturnValue({ exec: () => Promise.resolve(mockMember) });

      const result = await service.findOne(mockMemberId);
      expect(result.fullName).toBe('Test');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if member not found', async () => {
      memberModel.findById = jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });
      memberModel.findByIdAndDelete = jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) });

      await expect(service.remove(mockMemberId)).rejects.toThrow(NotFoundException);
    });

    it('should clean up references after deletion', async () => {
      const mockMember = { _id: mockMemberId, fullName: 'Test' };
      memberModel.findById = jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockMember) }) });
      memberModel.findByIdAndDelete = jest.fn().mockReturnValue({ exec: () => Promise.resolve(mockMember) });
      memberModel.updateMany = jest.fn().mockReturnValue({ exec: () => Promise.resolve({}) });
      unionModel.updateMany = jest.fn().mockReturnValue({ exec: () => Promise.resolve({}) });
      unionModel.deleteMany = jest.fn().mockReturnValue({ exec: () => Promise.resolve({}) });
      familyModel.updateMany = jest.fn().mockReturnValue({ exec: () => Promise.resolve({}) });

      const result = await service.remove(mockMemberId);

      expect(result.success).toBe(true);
      // Should have called updateMany 3 times (father, spouse, mother)
      expect(memberModel.updateMany).toHaveBeenCalledTimes(3);
    });
  });

  describe('buildTree', () => {
    it('should throw if user cannot access family', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'NHAN_VIEN', assignedFamily: 'other-family' };

      await expect(
        service.buildTree(user, mockFamilyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should build tree for authorized user', async () => {
      const user = { id: '1', email: 'admin@test.com', role: 'GIAM_DOC' };

      const rootId = new Types.ObjectId();
      const childId = new Types.ObjectId();
      const members = [
        { _id: rootId, fullName: 'Root', gender: 'male', family: mockFamilyId },
        { _id: childId, fullName: 'Child', gender: 'male', family: mockFamilyId, father: rootId },
      ];

      memberModel.find = jest.fn().mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(members) }),
      });

      const result = await service.buildTree(user, mockFamilyId);

      expect(result.familyId).toBe(mockFamilyId);
      expect(result.roots.length).toBe(1);
      expect(result.roots[0].fullName).toBe('Root');
      expect(result.roots[0].children.length).toBe(1);
      expect(result.roots[0].children[0].fullName).toBe('Child');
    });
  });

  describe('findAll - permission filtering', () => {
    it('should return empty for NHAN_VIEN with no assigned family', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'NHAN_VIEN' };

      const result = await service.findAll(user, {});
      expect(result).toEqual([]);
    });

    it('should return empty if family not accessible', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'NHAN_VIEN', assignedFamily: 'other' };

      const result = await service.findAll(user, { family: mockFamilyId });
      expect(result).toEqual([]);
    });
  });
});
