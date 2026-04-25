import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PlanLimitInterceptor } from '../auth/plan-limit.interceptor';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';
import { OptionalParseMongoIdPipe, ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { SetChildrenDto } from './dto/set-children.dto';
import { ReparentMemberDto } from './dto/reparent-member.dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
  @Resource('members')
  @Action('read')
  listByFamily(@CurrentUser() user: AuthUser, @Param('familyId', new ParseMongoIdPipe('familyId')) familyId: string) {
    return this.service.listByFamily(familyId, user);
  }

  @Get('tree')
  @Resource('tree')
  @Action('read')
  buildTree(
    @CurrentUser() user: AuthUser,
    @Query('family', new ParseMongoIdPipe('family')) familyId: string,
    @Query('root', new OptionalParseMongoIdPipe('root')) rootId?: string,
  ) {
    return this.service.buildTree(user, familyId, rootId);
  }

  @Get(':id')
  @Resource('members')
  @Action('read')
  findOne(@CurrentUser() user: AuthUser, @Param('id', new ParseMongoIdPipe('id')) id: string) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Resource('members')
  @Action('create')
  @UseInterceptors(PlanLimitInterceptor)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMemberDto) {
    return this.service.create(dto, user);
  }

  @Put(':id')
  @Resource('members')
  @Action('update')
  update(@CurrentUser() user: AuthUser, @Param('id', new ParseMongoIdPipe('id')) id: string, @Body() dto: UpdateMemberDto) {
    return this.service.update(id, dto, user);
  }

  @Put(':id/children')
  @Resource('members')
  @Action('update')
  setChildren(@CurrentUser() user: AuthUser, @Param('id', new ParseMongoIdPipe('id')) id: string, @Body() body: SetChildrenDto) {
    return this.service.setChildren(id, body.childrenIds || [], user);
  }

  @Put(':id/reparent')
  @Resource('members')
  @Action('update')
  reparent(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseMongoIdPipe('id')) id: string,
    @Body() body: ReparentMemberDto,
  ) {
    return this.service.reparent(id, body, user);
  }

  @Delete(':id')
  @Resource('members')
  @Action('delete')
  remove(@CurrentUser() user: AuthUser, @Param('id', new ParseMongoIdPipe('id')) id: string) {
    return this.service.remove(id, user);
  }

  @Put(':id/photo')
  @Resource('members')
  @Action('update')
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
    }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)'), false);
      }
    },
  }))
  async uploadPhoto(@CurrentUser() user: AuthUser, @Param('id', new ParseMongoIdPipe('id')) id: string, @UploadedFile() file?: any) {
    if (!file) return { success: false };
    const publicUrl = `/uploads/members/${file.filename}`;
    await this.service.update(id, { photoUrl: publicUrl } as any, user);
    return { success: true, url: publicUrl };
  }
}
