import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthUser, PermissionsService } from '../auth/permissions.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
	constructor(
		@InjectModel(User.name) private userModel: Model<UserDocument>,
		private permissionsService: PermissionsService,
	) {}

	async create(dto: CreateUserDto): Promise<User> {
		try {
			const passwordHash = await bcrypt.hash(dto.password, 10);
			const created = new this.userModel({ ...dto, password: passwordHash });
			const doc = await created.save();
			return (await this.userModel.findById(doc._id).exec()) as any;
		} catch (e: any) {
			if (e?.code === 11000) {
				throw new ConflictException('Email đã tồn tại');
			}
			throw e;
		}
	}

	async findAll(currentUser: AuthUser): Promise<User[]> {
		const allUsers = await this.userModel.find().exec();
		return this.permissionsService.filterUsers(currentUser, allUsers as any[]);
	}

	async findOne(id: string): Promise<User> {
		const user = await this.userModel.findById(id).exec();
		if (!user) throw new NotFoundException('Không tìm thấy người dùng');
		return user;
	}

	async update(id: string, dto: UpdateUserDto): Promise<User> {
		if (dto.password) {
			dto.password = await bcrypt.hash(dto.password, 10);
		}
		try {
			const updated = await this.userModel
				.findByIdAndUpdate(id, dto, { new: true, runValidators: true })
				.exec();
			if (!updated) throw new NotFoundException('Không tìm thấy người dùng');
			return updated as any;
		} catch (e: any) {
			if (e?.code === 11000) {
				throw new ConflictException('Email đã tồn tại');
			}
			throw e;
		}
	}

	async remove(id: string): Promise<void> {
		const res = await this.userModel.findByIdAndDelete(id).exec();
		if (!res) throw new NotFoundException('Không tìm thấy người dùng');
	}
}
