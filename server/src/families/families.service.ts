import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Family, FamilyDocument } from './schemas/family.schema';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { Member } from '../members/schemas/member.schema';
import { Union } from '../unions/schemas/union.schema';
import { AuthUser, PermissionsService } from '../auth/permissions.service';

type PublicFamilyRecord = {
	_id: Types.ObjectId;
	name: string;
	contactName: string;
	address?: string;
	rootMember?: string | Types.ObjectId;
};

@Injectable()
export class FamiliesService {
	constructor(
		@InjectModel(Family.name) private familyModel: Model<FamilyDocument>,
		@InjectModel(Member.name) private memberModel: Model<Member>,
		@InjectModel(Union.name) private unionModel: Model<Union>,
		private permissionsService: PermissionsService,
	) {}

	private idVariants(id: string) {
		const variants: Array<string | Types.ObjectId> = [id];
		if (Types.ObjectId.isValid(id)) {
			variants.push(new Types.ObjectId(id));
		}
		return variants;
	}

	private familyRefMatch(familyId: string) {
		return { $in: this.idVariants(familyId) };
	}

	private async findPublicFamilyRecord(token: string): Promise<PublicFamilyRecord> {
		const family = await this.familyModel
			.findOne({ shareToken: token, isPublic: true })
			.select('name contactName address rootMember')
			.lean()
			.exec();
		if (!family) {
			throw new NotFoundException('Liên kết chia sẻ không hợp lệ hoặc đã hết hạn');
		}
		return family as PublicFamilyRecord;
	}

	private toPublicFamilyView(family: PublicFamilyRecord) {
		return {
			id: family._id.toString(),
			name: family.name,
			contactName: family.contactName,
			address: family.address,
			rootMember: family.rootMember?.toString(),
		};
	}

	private ensureCanAccessFamily(currentUser: AuthUser, familyId: string) {
		if (!this.permissionsService.canAccessFamily(currentUser, familyId)) {
			throw new NotFoundException('Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p dÃ²ng há» nÃ y');
		}
	}

	async create(dto: CreateFamilyDto, currentUser?: AuthUser): Promise<Family> {
		if (dto.rootMember) {
			const m = await this.memberModel.findById(dto.rootMember).select('family gender').lean().exec();
			if (!m) throw new BadRequestException('rootMember khÃ´ng há»£p lá»‡');
			if (m.gender && m.gender !== 'male') throw new BadRequestException('rootMember pháº£i lÃ  giá»›i tÃ­nh nam');
			if (currentUser && m.family?.toString()) this.ensureCanAccessFamily(currentUser, m.family.toString());
		}
		const created = await this.familyModel.create(dto);
		if (dto.rootMember) {
			await this.memberModel.findByIdAndUpdate(dto.rootMember, { family: (created as any)._id }).exec();
		}
		return created;
	}

	async findAll(currentUser: AuthUser): Promise<Family[]> {
		const familyIds = this.permissionsService.getAccessibleFamilyIds(currentUser);
		if (familyIds === null) {
			return this.familyModel.find().exec();
		}
		if (familyIds.length === 0) {
			return [];
		}
		return this.familyModel.find({ _id: { $in: familyIds } }).exec();
	}

	async findOne(id: string, currentUser?: AuthUser): Promise<Family> {
		const doc = await this.familyModel.findById(id).exec();
		if (!doc) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y dÃ²ng há»');
		if (currentUser) this.ensureCanAccessFamily(currentUser, doc.id);
		return doc;
	}

	async update(id: string, dto: UpdateFamilyDto, currentUser?: AuthUser): Promise<Family> {
		if (currentUser) this.ensureCanAccessFamily(currentUser, id);
		if (dto.rootMember) {
			const m = await this.memberModel.findById(dto.rootMember).select('family gender').lean().exec();
			if (!m) throw new BadRequestException('rootMember khÃ´ng há»£p lá»‡');
			if (m.gender && m.gender !== 'male') throw new BadRequestException('rootMember pháº£i lÃ  giá»›i tÃ­nh nam');
			if (m.family?.toString() !== id.toString()) throw new BadRequestException('rootMember khÃ´ng thuá»™c dÃ²ng há» nÃ y');
		}
		const updated = await this.familyModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).exec();
		if (!updated) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y dÃ²ng há»');
		return updated;
	}

	async remove(id: string, currentUser?: AuthUser): Promise<void> {
		if (currentUser) this.ensureCanAccessFamily(currentUser, id);
		const res = await this.familyModel.findByIdAndDelete(id).exec();
		if (!res) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y dÃ²ng há»');
		const familyFilter = { family: this.familyRefMatch(id) };
		await this.memberModel.deleteMany(familyFilter).exec();
		await this.unionModel.deleteMany(familyFilter).exec();
	}

	async toggleShare(id: string, currentUser?: AuthUser): Promise<{ isPublic: boolean; shareToken: string | null }> {
		if (currentUser) this.ensureCanAccessFamily(currentUser, id);
		const family = await this.familyModel.findById(id).exec();
		if (!family) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y dÃ²ng há»');

		if (family.isPublic) {
			family.isPublic = false;
			family.shareToken = undefined;
			await family.save();
			return { isPublic: false, shareToken: null };
		}

		const token = randomBytes(16).toString('hex');
		family.isPublic = true;
		family.shareToken = token;
		await family.save();
		return { isPublic: true, shareToken: token };
	}

	async findByShareToken(token: string): Promise<any> {
		const family = await this.findPublicFamilyRecord(token);
		return this.toPublicFamilyView(family);
	}

	async getPublicMembers(token: string): Promise<any[]> {
		const family = await this.findPublicFamilyRecord(token);
		const familyId = family._id.toString();
		const members = await this.memberModel
			.find({ family: this.familyRefMatch(familyId) })
			.select('fullName gender dob dod father mother spouse family isMartyred')
			.lean()
			.exec();
		const memberIds = new Set(members.map((member: any) => member._id.toString()));
		const unions = await this.unionModel
			.find({ family: this.familyRefMatch(familyId) })
			.select('partners')
			.lean()
			.exec();
		const inferredSpouses = new Map<string, string>();

		for (const union of unions) {
			const partnerIds = Array.from(
				new Set(
					(union.partners || [])
						.map((partner: any) => partner?.toString?.())
						.filter((id: string | undefined): id is string => !!id && memberIds.has(id)),
				),
			);
			if (partnerIds.length !== 2) continue;
			const [leftId, rightId] = partnerIds;
			if (!inferredSpouses.has(leftId)) inferredSpouses.set(leftId, rightId);
			if (!inferredSpouses.has(rightId)) inferredSpouses.set(rightId, leftId);
		}

		return members.map((member: any) => {
			const memberId = member._id.toString();
			return {
				id: memberId,
				fullName: member.fullName,
				gender: member.gender,
				dob: member.dob,
				dod: member.dod,
				father: member.father?.toString?.(),
				mother: member.mother?.toString?.(),
				spouse: member.spouse?.toString?.() || inferredSpouses.get(memberId),
				family: member.family?.toString?.() || familyId,
				isMartyred: member.isMartyred,
			};
		});
	}
}
