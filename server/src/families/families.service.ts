import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Family, FamilyDocument } from './schemas/family.schema';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { CreateFamilyDto as NewCreateFamilyDto, UpdateFamilyDto as NewUpdateFamilyDto, AssignAdminDto, AddSubscriptionTimeDto } from './dto/family.dto';
import { Member } from '../members/schemas/member.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class FamiliesService {
	constructor(
		@InjectModel(Family.name) private familyModel: Model<FamilyDocument>,
		@InjectModel(Member.name) private memberModel: Model<Member>,
		@InjectModel(User.name) private userModel: Model<UserDocument>,
	) {}

	private async validateRootMember(dto: { rootMember?: string; idForUpdate?: string }) {
		if (!dto.rootMember) return;
		const member = await this.memberModel.findById(dto.rootMember).select('family gender').lean().exec();
		if (!member) throw new BadRequestException('rootMember không hợp lệ');
		// When updating, ensure the member belongs to the same family as target family
		// This will be double-checked in create/update using the target family id
	}

	async create(dto: CreateFamilyDto, createdBy?: string | null): Promise<Family> {
		// Validate admin if provided
		if (dto.adminId) {
			const admin = await this.userModel.findById(dto.adminId).exec();
			if (!admin) {
				throw new BadRequestException('Admin không tồn tại');
			}
			if (admin.role !== 'ADMIN_DONG_HO') {
				throw new BadRequestException('Chỉ có thể chỉ định người dùng có role ADMIN_DONG_HO làm admin dòng họ');
			}
		}

		// If rootMember provided, ensure it exists and is male
		if (dto.rootMember) {
			const m = await this.memberModel.findById(dto.rootMember).select('family gender').lean().exec();
			if (!m) throw new BadRequestException('rootMember không hợp lệ');
			if (m.gender && m.gender !== 'male') throw new BadRequestException('rootMember phải là giới tính nam');
		}

		const familyData = {
			...dto,
			status: 'active',
			memberCount: 0,
			createdBy: createdBy && Types.ObjectId.isValid(createdBy) 
				? new Types.ObjectId(createdBy) 
				: new Types.ObjectId('507f1f77bcf86cd799439011') // Use valid temp ObjectId if not provided
		};

		const created = await this.familyModel.create(familyData);

		// Update admin's managedFamilies if admin assigned
		if (dto.adminId) {
			await this.userModel.findByIdAndUpdate(
				dto.adminId,
				{ $addToSet: { managedFamilies: created._id } }
			).exec();
		}

		// After create, if rootMember set, ensure member belongs to this family
		if (dto.rootMember) {
			const m = await this.memberModel.findById(dto.rootMember).select('family').lean().exec();
			if (m && m.family && m.family.toString() !== created._id.toString()) {
				throw new BadRequestException('rootMember không thuộc dòng họ này');
			}
		}

		return created;
	}	async findAll(): Promise<Family[]> {
		return this.familyModel.find().exec();
	}

	async findOne(id: string): Promise<Family> {
		const doc = await this.familyModel.findById(id).exec();
		if (!doc) throw new NotFoundException('Không tìm thấy dòng họ');
		return doc;
	}

		async update(id: string, dto: UpdateFamilyDto): Promise<Family> {
			if (dto.rootMember) {
				const m = await this.memberModel.findById(dto.rootMember).select('family gender').lean().exec();
				if (!m) throw new BadRequestException('rootMember không hợp lệ');
				if (m.gender && m.gender !== 'male') throw new BadRequestException('rootMember phải là giới tính nam');
				if (m.family?.toString() !== id.toString()) throw new BadRequestException('rootMember không thuộc dòng họ này');
			}
			const updated = await this.familyModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).exec();
			if (!updated) throw new NotFoundException('Không tìm thấy dòng họ');
			return updated as any;
		}

	async remove(id: string): Promise<void> {
		const res = await this.familyModel.findByIdAndDelete(id).exec();
		if (!res) throw new NotFoundException('Không tìm thấy dòng họ');
	}

	// ========== NEW FAMILY MANAGEMENT METHODS FOR SUPER_ADMIN ==========

	/**
	 * Create a new family (SUPER_ADMIN only)
	 */
	async createFamily(dto: NewCreateFamilyDto, createdBy: string | null): Promise<Family> {
		// Validate admin if provided
		if (dto.adminId) {
			const admin = await this.userModel.findById(dto.adminId).exec();
			if (!admin) {
				throw new BadRequestException('Admin không tồn tại');
			}
			if (admin.role !== 'ADMIN_DONG_HO') {
				throw new BadRequestException('Chỉ có thể chỉ định người dùng có role ADMIN_DONG_HO làm admin dòng họ');
			}
		}

		const familyData = {
			...dto,
			createdBy: createdBy && Types.ObjectId.isValid(createdBy) 
				? new Types.ObjectId(createdBy) 
				: new Types.ObjectId('507f1f77bcf86cd799439011'),
			subscriptionStartDate: dto.subscriptionStartDate ? new Date(dto.subscriptionStartDate) : undefined,
			subscriptionEndDate: dto.subscriptionEndDate ? new Date(dto.subscriptionEndDate) : undefined,
		};

		const family = await this.familyModel.create(familyData);

		// Update admin's managedFamilies if admin assigned
		if (dto.adminId) {
			await this.userModel.findByIdAndUpdate(
				dto.adminId,
				{ $addToSet: { managedFamilies: family._id } }
			).exec();
		}

		return family;
	}

	/**
	 * Update family information (SUPER_ADMIN only)
	 */
	async updateFamily(id: string, dto: NewUpdateFamilyDto, updatedBy: string | null): Promise<Family> {
		const family = await this.familyModel.findById(id).exec();
		if (!family) {
			throw new NotFoundException('Không tìm thấy dòng họ');
		}

		// If changing admin, validate new admin and update relationships
		if (dto.adminId !== undefined) {
			// Remove family from old admin if exists
			if (family.adminId) {
				await this.userModel.findByIdAndUpdate(
					family.adminId,
					{ $pull: { managedFamilies: family._id } }
				).exec();
			}

			// Validate and assign new admin
			if (dto.adminId) {
				const admin = await this.userModel.findById(dto.adminId).exec();
				if (!admin) {
					throw new BadRequestException('Admin không tồn tại');
				}
				if (admin.role !== 'ADMIN_DONG_HO') {
					throw new BadRequestException('Chỉ có thể chỉ định người dùng có role ADMIN_DONG_HO làm admin dòng họ');
				}

				await this.userModel.findByIdAndUpdate(
					dto.adminId,
					{ $addToSet: { managedFamilies: id } }
				).exec();
			}
		}

		const updateData = {
			...dto,
			updatedBy: updatedBy && Types.ObjectId.isValid(updatedBy) 
				? new Types.ObjectId(updatedBy) 
				: undefined,
			subscriptionStartDate: dto.subscriptionStartDate ? new Date(dto.subscriptionStartDate) : undefined,
			subscriptionEndDate: dto.subscriptionEndDate ? new Date(dto.subscriptionEndDate) : undefined,
		};

		const updated = await this.familyModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
		return updated!;
	}

	/**
	 * Assign admin to family (SUPER_ADMIN only)
	 */
	async assignAdmin(familyId: string, dto: AssignAdminDto, updatedBy: string | null): Promise<Family> {
		const family = await this.familyModel.findById(familyId).exec();
		if (!family) {
			throw new NotFoundException('Không tìm thấy dòng họ');
		}

		const admin = await this.userModel.findById(dto.adminId).exec();
		if (!admin) {
			throw new BadRequestException('Admin không tồn tại');
		}
		if (admin.role !== 'ADMIN_DONG_HO') {
			throw new BadRequestException('Chỉ có thể chỉ định người dùng có role ADMIN_DONG_HO làm admin dòng họ');
		}

		// Remove family from old admin if exists
		if (family.adminId) {
			await this.userModel.findByIdAndUpdate(
				family.adminId,
				{ $pull: { managedFamilies: family._id } }
			).exec();
		}

		// Assign new admin
		await this.userModel.findByIdAndUpdate(
			dto.adminId,
			{ $addToSet: { managedFamilies: familyId } }
		).exec();

		const updated = await this.familyModel.findByIdAndUpdate(
			familyId,
			{ 
				adminId: dto.adminId,
				updatedBy: updatedBy && Types.ObjectId.isValid(updatedBy) 
					? new Types.ObjectId(updatedBy) 
					: undefined
			},
			{ new: true }
		).exec();

		return updated!;
	}

	/**
	 * Add subscription time to family (SUPER_ADMIN only)
	 */
	async addSubscriptionTime(familyId: string, dto: AddSubscriptionTimeDto, updatedBy: string | null): Promise<Family> {
		const family = await this.familyModel.findById(familyId).exec();
		if (!family) {
			throw new NotFoundException('Không tìm thấy dòng họ');
		}

		const currentEndDate = family.subscriptionEndDate || new Date();
		const newEndDate = new Date(currentEndDate);
		newEndDate.setMonth(newEndDate.getMonth() + dto.months);

		// If no start date, set it to now
		const updateData: any = {
			subscriptionEndDate: newEndDate,
			updatedBy: updatedBy && Types.ObjectId.isValid(updatedBy) 
				? new Types.ObjectId(updatedBy) 
				: undefined,
			status: 'active' // Reactivate if was expired
		};

		if (!family.subscriptionStartDate) {
			updateData.subscriptionStartDate = new Date();
		}

		const updated = await this.familyModel.findByIdAndUpdate(
			familyId,
			updateData,
			{ new: true }
		).exec();

		return updated!;
	}

	/**
	 * Get all families with admin and statistics info (SUPER_ADMIN only)
	 */
	async getAllFamiliesWithStats(): Promise<any[]> {
		const families = await this.familyModel
			.find()
			.populate('adminId', 'fullName email')
			.populate('createdBy', 'fullName email')
			.sort({ createdAt: -1 })
			.exec();

		// Add member count and calculate status
		const familiesWithStats = await Promise.all(
			families.map(async (family) => {
				const memberCount = await this.memberModel.countDocuments({ family: family._id }).exec();
				
				// Determine subscription status
				let subscriptionStatus = family.status;
				if (family.subscriptionEndDate) {
					const now = new Date();
					const endDate = new Date(family.subscriptionEndDate);
					const daysToExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
					
					if (daysToExpiry < 0) {
						subscriptionStatus = 'expired';
					} else if (daysToExpiry <= 30) {
						subscriptionStatus = 'expiring_soon';
					}
				}

				return {
					...family.toJSON(),
					memberCount,
					subscriptionStatus,
					adminName: (family as any).adminId?.fullName,
					adminEmail: (family as any).adminId?.email,
				};
			})
		);

		return familiesWithStats;
	}

	/**
	 * Get system statistics (SUPER_ADMIN only)
	 */
	async getSystemStats(): Promise<any> {
		const totalFamilies = await this.familyModel.countDocuments().exec();
		const activeFamilies = await this.familyModel.countDocuments({ status: 'active' }).exec();
		const totalUsers = await this.userModel.countDocuments().exec();
		const totalMembers = await this.memberModel.countDocuments().exec();

		// Calculate revenue (mock for now - should be from payments collection)
		const totalRevenue = await this.familyModel
			.aggregate([
				{ $group: { _id: null, total: { $sum: '$totalRevenue' } } }
			])
			.exec();

		// Calculate monthly growth (mock calculation)
		const lastMonth = new Date();
		lastMonth.setMonth(lastMonth.getMonth() - 1);
		
		const newFamiliesThisMonth = await this.familyModel.countDocuments({
			createdAt: { $gte: lastMonth }
		}).exec();
		
		const monthlyGrowth = totalFamilies > 0 ? (newFamiliesThisMonth / totalFamilies) * 100 : 0;

		return {
			totalFamilies,
			activeFamilies,
			totalUsers,
			totalMembers,
			revenue: totalRevenue[0]?.total || 0,
			monthlyGrowth: Math.round(monthlyGrowth * 100) / 100
		};
	}

	/**
	 * Get families managed by specific admin (for ADMIN_DONG_HO users)
	 */
	async getFamiliesByAdmin(adminId: string): Promise<Family[]> {
		return this.familyModel
			.find({ adminId })
			.populate('createdBy', 'fullName email')
			.exec();
	}

	/**
	 * Update family activity timestamp
	 */
	async updateLastActivity(familyId: string): Promise<void> {
		await this.familyModel.findByIdAndUpdate(
			familyId,
			{ lastActivityDate: new Date() }
		).exec();
	}

	/**
	 * Update member count for family
	 */
	async updateMemberCount(familyId: string): Promise<void> {
		const memberCount = await this.memberModel.countDocuments({ family: familyId }).exec();
		await this.familyModel.findByIdAndUpdate(
			familyId,
			{ memberCount }
		).exec();
	}
}
