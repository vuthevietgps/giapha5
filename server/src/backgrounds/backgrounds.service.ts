import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Background, BackgroundDocument } from './schemas/background.schema';
import * as path from 'path';
import * as fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'backgrounds');

@Injectable()
export class BackgroundsService {
  constructor(@InjectModel(Background.name) private model: Model<BackgroundDocument>) {}

  ensureUploadDir() {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  async nextName(): Promise<string> {
    const count = await this.model.countDocuments().exec();
    return `Ảnh nền ${count + 1}`;
  }

  async createFromFile(file: any, name?: string): Promise<Background> {
    if (!file) throw new NotFoundException('Không có tệp tải lên');
    const doc = new this.model({
      name: name || (await this.nextName()),
      fileName: path.basename(file.filename || file.path),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
    const saved = await doc.save();
    return (await this.model.findById(saved._id).exec()) as any;
  }

  async list(): Promise<Background[]> {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<BackgroundDocument> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Không tìm thấy ảnh nền');
    return doc;
  }

  getFilePath(fileName: string): string {
    return path.join(UPLOAD_DIR, fileName);
  }

  async remove(id: string): Promise<{ success: true }>{
    const doc = await this.findOne(id);
    const filePath = this.getFilePath(doc.fileName);
    await this.model.findByIdAndDelete(id).exec();
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    return { success: true };
  }
}

export { UPLOAD_DIR };
