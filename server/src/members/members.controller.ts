import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { Union } from '../unions/schemas/union.schema';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';

@Controller('members')
@UseGuards(PermissionsGuard)
export class MembersController {
  constructor(private readonly service: MembersService) {}

  @Get()
  @Resource('members')
  @Action('read')
  findAll(@CurrentUser() user: AuthUser, @Query('family') family?: string, @Query('q') q?: string) {
    return this.service.findAll(user, { family, q });
  }

  @Get('by-family/:familyId')
  listByFamily(@Param('familyId') familyId: string) {
    return this.service.listByFamily(familyId);
  }

  @Get('tree')
  @Resource('tree')
  @Action('read')
  buildTree(@CurrentUser() user: AuthUser, @Query('family') familyId: string, @Query('root') rootId?: string) {
    return this.service.buildTree(user, familyId, rootId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/children')
  setChildren(@Param('id') id: string, @Body() body: { childrenIds: string[] }) {
    return this.service.setChildren(id, body.childrenIds || []);
  }

  // Re-parent a person by assigning father/mother from a union
  @Put(':id/reparent')
  reparent(
    @Param('id') id: string,
    @Body() body: { unionId?: string; fatherId?: string; motherId?: string },
  ) {
    return this.service.reparent(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Put(':id/photo')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dest = join(process.cwd(), 'uploads', 'members');
        if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + extname(file.originalname || ''));
      }
    })
  }))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file?: any) {
    if (!file) return { success: false };
    const publicUrl = `/uploads/members/${file.filename}`;
    await this.service.update(id, { photoUrl: publicUrl } as any);
    return { success: true, url: publicUrl };
  }
}
