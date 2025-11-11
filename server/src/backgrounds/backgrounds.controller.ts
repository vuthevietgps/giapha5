import { Controller, Get, Param, Post, UploadedFile, UseInterceptors, Res, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { BackgroundsService, UPLOAD_DIR } from './backgrounds.service';

function uniqueName(original: string) {
  const ext = path.extname(original) || '.bin';
  const base = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  return base + ext;
}

@Controller('backgrounds')
export class BackgroundsController {
  constructor(private readonly service: BackgroundsService) {
    this.service.ensureUploadDir();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => cb(null, uniqueName(file.originalname)),
      }),
    }),
  )
  async upload(@UploadedFile() file: any, @Body('name') name?: string) {
    const created = await this.service.createFromFile(file, name);
    return created;
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id/file')
  async file(@Param('id') id: string, @Res() res: any) {
    const doc = await this.service.findOne(id);
    const fp = this.service.getFilePath(doc.fileName);
    if (!fs.existsSync(fp)) {
      return res.status(404).send('File not found');
    }
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.sendFile(fp);
  }
}
