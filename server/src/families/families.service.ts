import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Family, FamilyDocument } from './schemas/family.schema';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { Member } from '../members/schemas/member.schema';

@Injectable()
export class FamiliesService {
	constructor(
		@InjectModel(Family.name) private familyModel: Model<FamilyDocument>,
		@InjectModel(Member.name) private memberModel: Model<Member>,
	) {}

	private async validateRootMember(dto: { rootMember?: string; idForUpdate?: string }) {
		if (!dto.rootMember) return;
		const member = await this.memberModel.findById(dto.rootMember).select('family gender').lean().exec();
		if (!member) throw new BadRequestException('rootMember không hợp lệ');
		// When updating, ensure the member belongs to the same family as target family
		// This will be double-checked in create/update using the target family id
	}

		async create(dto: CreateFamilyDto): Promise<Family> {
			// If rootMember provided, ensure it exists and is male and belongs to this family
			if (dto.rootMember) {
				const m = await this.memberModel.findById(dto.rootMember).select('family gender').lean().exec();
				if (!m) throw new BadRequestException('rootMember không hợp lệ');
				const famId = (dto as any).id || undefined;
				if (m.gender && m.gender !== 'male') throw new BadRequestException('rootMember phải là giới tính nam');
				// since family doc not yet created, we can only check that member.family matches dto id if provided later
			}
			const created = await this.familyModel.create(dto);
			// After create, if rootMember set, ensure member belongs to this family
			if ((dto as any).rootMember) {
				const m = await this.memberModel.findById((dto as any).rootMember).select('family').lean().exec();
				if (m && m.family && m.family.toString() !== (created as any)._id.toString()) {
					throw new BadRequestException('rootMember không thuộc dòng họ này');
				}
			}
			return created;
		}

	async findAll(): Promise<Family[]> {
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
}
