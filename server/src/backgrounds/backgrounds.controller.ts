import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BackgroundsService, UPLOAD_DIR } from './backgrounds.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Action, CurrentUser, Resource } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function uniqueName(original: string) {
  const ext = path.extname(original) || '.bin';
  const base = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  return base + ext;
}

@Controller('backgrounds')
@UseGuards(PermissionsGuard)
export class BackgroundsController {
  constructor(private readonly service: BackgroundsService) {
    this.service.ensureUploadDir();
  }

  @Post()
  @Resource('backgrounds')
  @Action('create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => cb(null, uniqueName(file.originalname)),
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Chi chap nhan file anh (JPEG, PNG, GIF, WebP, SVG)'), false);
        }
      },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: any,
    @Body('family') familyId?: string,
    @Body('name') name?: string,
  ) {
    return this.service.createFromFile(user, file, familyId, name);
  }

  @Get()
  @Resource('backgrounds')
  @Action('read')
  list(@CurrentUser() user: AuthUser, @Query('family') familyId?: string) {
    return this.service.list(user, familyId);
  }

  @Get(':id/file')
  @Resource('backgrounds')
  @Action('read')
  async file(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: any) {
    const doc = await this.service.findOne(user, id);
    const fp = this.service.getFilePath(doc.fileName);
    if (!fs.existsSync(fp)) {
      return res.status(404).send('File not found');
    }
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.sendFile(fp);
  }

  @Delete(':id')
  @Resource('backgrounds')
  @Action('delete')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
