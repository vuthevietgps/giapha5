import { Body, Controller, Delete, Get, Param, Patch, Post as HttpPost, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';

@Controller('posts')
@UseGuards(PermissionsGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpPost()
  @Resource('posts')
  @Action('create')
  create(@Body() dto: CreatePostDto, @CurrentUser() user: AuthUser) {
    return this.postsService.create(dto, user);
  }

  @Get()
  @Resource('posts')
  @Action('read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.postsService.findAll(user);
  }

  @Get(':id')
  @Resource('posts')
  @Action('read')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.postsService.findOne(id, user);
  }

  @Patch(':id')
  @Resource('posts')
  @Action('update')
  update(@Param('id') id: string, @Body() dto: UpdatePostDto, @CurrentUser() user: AuthUser) {
    return this.postsService.update(id, dto, user);
  }

  @Delete(':id')
  @Resource('posts')
  @Action('delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.postsService.remove(id, user);
  }
}
