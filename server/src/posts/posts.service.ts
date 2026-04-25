import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AuthUser, PermissionsService } from '../auth/permissions.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private readonly permissionsService: PermissionsService,
  ) {}

  private ensureCanAccessFamily(currentUser: AuthUser, familyId: string) {
    if (!this.permissionsService.canAccessFamily(currentUser, familyId)) {
      throw new NotFoundException('Ban khong co quyen truy cap dong ho nay');
    }
  }

  private resolveCreateFamily(dto: CreatePostDto, currentUser: AuthUser): string {
    if (dto.family) {
      this.ensureCanAccessFamily(currentUser, dto.family);
      return dto.family;
    }

    if (currentUser.assignedFamily) {
      return currentUser.assignedFamily;
    }

    const managedFamilies = currentUser.managedFamilies || [];
    if (managedFamilies.length === 1) {
      return managedFamilies[0];
    }

    throw new BadRequestException('Vui long chon dong ho cho bai viet');
  }

  private canAccessPost(currentUser: AuthUser, post: PostDocument): boolean {
    const familyId = post.family?.toString();
    if (familyId) {
      return this.permissionsService.canAccessFamily(currentUser, familyId);
    }

    return currentUser.role === 'GIAM_DOC' || post.author?.toString() === currentUser.id;
  }

  private buildReadFilter(currentUser: AuthUser) {
    const familyIds = this.permissionsService.getAccessibleFamilyIds(currentUser);
    const orphanAuthorFilter = {
      author: currentUser.id,
      $or: [{ family: { $exists: false } }, { family: null }],
    };

    if (familyIds === null) {
      return {};
    }

    if (familyIds.length === 0) {
      return orphanAuthorFilter;
    }

    return {
      $or: [
        { family: { $in: familyIds } },
        orphanAuthorFilter,
      ],
    };
  }

  async create(dto: CreatePostDto, currentUser: AuthUser): Promise<Post> {
    const familyId = this.resolveCreateFamily(dto, currentUser);
    const created = new this.postModel({
      ...dto,
      author: currentUser.id,
      family: familyId,
    });
    const doc = await created.save();
    return (await this.postModel.findById(doc._id).exec()) as any;
  }

  async findAll(currentUser: AuthUser): Promise<Post[]> {
    return this.postModel.find(this.buildReadFilter(currentUser)).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, currentUser: AuthUser): Promise<Post> {
    const post = await this.postModel.findById(id).exec();
    if (!post) throw new NotFoundException('Khong tim thay bai viet');
    if (!this.canAccessPost(currentUser, post)) {
      throw new NotFoundException('Khong tim thay bai viet');
    }
    return post;
  }

  async update(id: string, dto: UpdatePostDto, currentUser: AuthUser): Promise<Post> {
    const current = await this.postModel.findById(id).exec();
    if (!current) throw new NotFoundException('Khong tim thay bai viet');
    if (!this.canAccessPost(currentUser, current)) {
      throw new NotFoundException('Khong tim thay bai viet');
    }

    const updated = await this.postModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Khong tim thay bai viet');
    return updated as any;
  }

  async remove(id: string, currentUser: AuthUser): Promise<void> {
    const current = await this.postModel.findById(id).exec();
    if (!current) throw new NotFoundException('Khong tim thay bai viet');
    if (!this.canAccessPost(currentUser, current)) {
      throw new NotFoundException('Khong tim thay bai viet');
    }

    const res = await this.postModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Khong tim thay bai viet');
  }
}
