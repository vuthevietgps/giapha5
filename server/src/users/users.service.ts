import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async create(currentUser: AuthUser, dto: CreateUserDto): Promise<User> {
    if (!this.permissionsService.canManageUser(currentUser, dto.role)) {
      throw new ForbiddenException('Ban khong co quyen tao nguoi dung voi vai tro nay');
    }

    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const created = new this.userModel({ ...dto, password: passwordHash });
      const doc = await created.save();
      return (await this.userModel.findById(doc._id).exec()) as any;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException('Email da ton tai');
      }
      throw e;
    }
  }

  async findAll(currentUser: AuthUser): Promise<User[]> {
    const allUsers = await this.userModel.find().exec();
    return this.permissionsService.filterUsers(currentUser, allUsers as any[]);
  }

  async findOne(currentUser: AuthUser, id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Khong tim thay nguoi dung');

    const allowed = this.permissionsService.filterUsers(currentUser, [user as any]).length > 0;
    if (!allowed) throw new NotFoundException('Khong tim thay nguoi dung');

    return user;
  }

  async update(currentUser: AuthUser, id: string, dto: UpdateUserDto): Promise<User> {
    const target = await this.userModel.findById(id).exec();
    if (!target) throw new NotFoundException('Khong tim thay nguoi dung');

    if (!this.permissionsService.canManageUser(currentUser, target.role)) {
      throw new ForbiddenException('Ban khong co quyen sua nguoi dung nay');
    }

    if (dto.role && !this.permissionsService.canManageUser(currentUser, dto.role)) {
      throw new ForbiddenException('Ban khong co quyen gan vai tro nay');
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      const updated = await this.userModel
        .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
        .exec();
      if (!updated) throw new NotFoundException('Khong tim thay nguoi dung');
      return updated as any;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException('Email da ton tai');
      }
      throw e;
    }
  }

  async remove(currentUser: AuthUser, id: string): Promise<void> {
    if (currentUser.id === id) {
      throw new ForbiddenException('Khong the xoa chinh minh');
    }

    const target = await this.userModel.findById(id).exec();
    if (!target) throw new NotFoundException('Khong tim thay nguoi dung');

    if (!this.permissionsService.canManageUser(currentUser, target.role)) {
      throw new ForbiddenException('Ban khong co quyen xoa nguoi dung nay');
    }

    await this.userModel.findByIdAndDelete(id).exec();
  }
}
