import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Background, BackgroundDocument } from './schemas/background.schema';
import { Family, FamilyDocument } from '../families/schemas/family.schema';
import { AuthUser, PermissionsService } from '../auth/permissions.service';
import * as path from 'path';
import * as fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'backgrounds');

@Injectable()
export class BackgroundsService {
  constructor(
    @InjectModel(Background.name) private readonly model: Model<BackgroundDocument>,
    @InjectModel(Family.name) private readonly familyModel: Model<FamilyDocument>,
    private readonly permissionsService: PermissionsService,
  ) {}

  ensureUploadDir() {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  private ensureCanAccessFamily(currentUser: AuthUser, familyId: string) {
    if (!this.permissionsService.canAccessFamily(currentUser, familyId)) {
      throw new NotFoundException('Ban khong co quyen truy cap dong ho nay');
    }
  }

  private async ensureFamilyExists(familyId: string) {
    if (!Types.ObjectId.isValid(familyId)) {
      throw new NotFoundException('Khong tim thay dong ho');
    }

    const exists = await this.familyModel.exists({ _id: familyId });
    if (!exists) {
      throw new NotFoundException('Khong tim thay dong ho');
    }
  }

  private resolveCreateFamily(currentUser: AuthUser, familyId?: string): string {
    if (familyId) {
      return familyId;
    }

    if (currentUser.assignedFamily) {
      return currentUser.assignedFamily;
    }

    const managedFamilies = currentUser.managedFamilies || [];
    if (managedFamilies.length === 1) {
      return managedFamilies[0];
    }

    throw new BadRequestException('Vui long chon dong ho cho anh nen');
  }

  async nextName(familyId: string): Promise<string> {
    const count = await this.model.countDocuments({ family: familyId }).exec();
    return `Anh nen ${count + 1}`;
  }

  async createFromFile(currentUser: AuthUser, file: any, familyId?: string, name?: string): Promise<Background> {
    if (!file) throw new NotFoundException('Khong co tep tai len');

    const resolvedFamilyId = this.resolveCreateFamily(currentUser, familyId);
    this.ensureCanAccessFamily(currentUser, resolvedFamilyId);
    await this.ensureFamilyExists(resolvedFamilyId);

    const doc = new this.model({
      family: resolvedFamilyId,
      name: name || (await this.nextName(resolvedFamilyId)),
      fileName: path.basename(file.filename || file.path),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
    const saved = await doc.save();
    return (await this.model.findById(saved._id).exec()) as any;
  }

  async list(currentUser: AuthUser, familyId?: string): Promise<Background[]> {
    if (familyId) {
      this.ensureCanAccessFamily(currentUser, familyId);
      await this.ensureFamilyExists(familyId);
      return this.model.find({ family: familyId }).sort({ createdAt: -1 }).exec();
    }

    return this.model
      .find(this.permissionsService.applyFamilyFilter(currentUser))
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(currentUser: AuthUser, id: string): Promise<BackgroundDocument> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Khong tim thay anh nen');
    this.ensureCanAccessFamily(currentUser, doc.family?.toString());
    return doc;
  }

  getFilePath(fileName: string): string {
    return path.join(UPLOAD_DIR, fileName);
  }

  async remove(currentUser: AuthUser, id: string): Promise<{ success: true }> {
    const doc = await this.findOne(currentUser, id);
    const filePath = this.getFilePath(doc.fileName);
    await this.model.findByIdAndDelete(id).exec();
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
    return { success: true };
  }
}

export { UPLOAD_DIR };
