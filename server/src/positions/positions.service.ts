import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Position } from './schemas/position.schema';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionsService {
  constructor(@InjectModel(Position.name) private readonly model: Model<Position>) {}

  async create(dto: CreatePositionDto) {
    try {
      const created = await this.model.create(dto);
      return created.toJSON();
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException('Tên chức vụ đã tồn tại');
      }
      throw e;
    }
  }

  async findAll() {
    const list = await this.model.find().sort({ sortOrder: 1, name: 1 }).exec();
    return list.map((d) => d.toJSON());
  }

  async findOne(id: string) {
    const found = await this.model.findById(id).exec();
    if (!found) throw new NotFoundException('Không tìm thấy chức vụ');
    return found.toJSON();
  }

  async update(id: string, dto: UpdatePositionDto) {
    try {
      const updated = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
      if (!updated) throw new NotFoundException('Không tìm thấy chức vụ');
      return updated.toJSON();
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException('Tên chức vụ đã tồn tại');
      }
      throw e;
    }
  }

  async remove(id: string) {
    const res = await this.model.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Không tìm thấy chức vụ');
    return { success: true };
  }
}
