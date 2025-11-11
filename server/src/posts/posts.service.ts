import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async create(dto: CreatePostDto): Promise<Post> {
    const created = new this.postModel(dto);
    const doc = await created.save();
    return (await this.postModel.findById(doc._id).exec()) as any;
  }

  async findAll(): Promise<Post[]> {
    return this.postModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postModel.findById(id).exec();
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    return post;
  }

  async update(id: string, dto: UpdatePostDto): Promise<Post> {
    const updated = await this.postModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Không tìm thấy bài viết');
    return updated as any;
  }

  async remove(id: string): Promise<void> {
    const res = await this.postModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Không tìm thấy bài viết');
  }
}
