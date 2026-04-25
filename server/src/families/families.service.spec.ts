import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { FamiliesService } from './families.service';
import { Family } from './schemas/family.schema';
import { Member } from '../members/schemas/member.schema';
import { Union } from '../unions/schemas/union.schema';
import { PermissionsService } from '../auth/permissions.service';

function createMockModel() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  };
}

describe('FamiliesService', () => {
  let service: FamiliesService;
  let familyModel: any;
  let memberModel: any;
  let unionModel: any;

  beforeEach(async () => {
    familyModel = createMockModel();
    memberModel = createMockModel();
    unionModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamiliesService,
        { provide: getModelToken(Family.name), useValue: familyModel },
        { provide: getModelToken(Member.name), useValue: memberModel },
        { provide: getModelToken(Union.name), useValue: unionModel },
        {
          provide: PermissionsService,
          useValue: {
            canAccessFamily: jest.fn().mockReturnValue(true),
            getAccessibleFamilyIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FamiliesService>(FamiliesService);
  });

  it('should load public members when family refs exist as string or ObjectId', async () => {
    const familyId = new Types.ObjectId().toString();
    const familyDoc = { _id: new Types.ObjectId(familyId), id: familyId };
    const memberId = new Types.ObjectId();
    const member = { _id: memberId, fullName: 'Ancestor', family: familyId, gender: 'male' };

    familyModel.findOne.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: () => Promise.resolve(familyDoc),
        }),
      }),
    });
    memberModel.find.mockImplementation((filter: any) => ({
      select: () => ({
        lean: () => ({
          exec: () => Promise.resolve(
            Array.isArray(filter?.family?.$in)
            && filter.family.$in.some((value: any) => value?.toString?.() === familyId)
              ? [member]
              : [],
          ),
        }),
      }),
    }));
    unionModel.find.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: () => Promise.resolve([]),
        }),
      }),
    });

    const result = await service.getPublicMembers('share-token');

    expect(result).toEqual([
      expect.objectContaining({
        id: memberId.toString(),
        fullName: 'Ancestor',
        family: familyId,
        spouse: undefined,
      }),
    ]);
  });

  it('should cascade-delete members and unions regardless of legacy family ref storage type', async () => {
    const familyId = new Types.ObjectId().toString();

    familyModel.findByIdAndDelete.mockReturnValue({
      exec: () => Promise.resolve({ _id: familyId }),
    });
    memberModel.deleteMany.mockReturnValue({
      exec: () => Promise.resolve({ deletedCount: 2 }),
    });
    unionModel.deleteMany.mockReturnValue({
      exec: () => Promise.resolve({ deletedCount: 1 }),
    });

    await service.remove(familyId);

    expect(memberModel.deleteMany).toHaveBeenCalledWith({
      family: expect.objectContaining({
        $in: expect.arrayContaining([familyId]),
      }),
    });
    expect(unionModel.deleteMany).toHaveBeenCalledWith({
      family: expect.objectContaining({
        $in: expect.arrayContaining([familyId]),
      }),
    });
  });
});
