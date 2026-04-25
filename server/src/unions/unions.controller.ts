import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UnionsService } from './unions.service';
import { CreateUnionDto } from './dto/create-union.dto';
import { UpdateUnionDto } from './dto/update-union.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';
import { OptionalParseMongoIdPipe, ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('unions')
@UseGuards(PermissionsGuard)
export class UnionsController {
  constructor(private readonly unionsService: UnionsService) {}

  @Post()
  @Resource('members')
  @Action('create')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUnionDto) {
    return this.unionsService.create(dto, user);
  }

  @Get()
  @Resource('members')
  @Action('read')
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('family', new OptionalParseMongoIdPipe('family')) family?: string,
    @Query('partner', new OptionalParseMongoIdPipe('partner')) partner?: string,
  ) {
    return this.unionsService.findAll({ family, partner }, user);
  }

  @Get(':id')
  @Resource('members')
  @Action('read')
  findOne(@CurrentUser() user: AuthUser, @Param('id', new ParseMongoIdPipe('id')) id: string) {
    return this.unionsService.findOne(id, user);
  }

  @Patch(':id')
  @Resource('members')
  @Action('update')
  update(@CurrentUser() user: AuthUser, @Param('id', new ParseMongoIdPipe('id')) id: string, @Body() dto: UpdateUnionDto) {
    return this.unionsService.update(id, dto, user);
  }

  @Delete(':id')
  @Resource('members')
  @Action('delete')
  remove(@CurrentUser() user: AuthUser, @Param('id', new ParseMongoIdPipe('id')) id: string) {
    return this.unionsService.remove(id, user);
  }

  @Post('normalize/:memberId')
  @Resource('members')
  @Action('update')
  normalize(@CurrentUser() user: AuthUser, @Param('memberId', new ParseMongoIdPipe('memberId')) memberId: string) {
    return this.unionsService.normalizeForMember(memberId, user);
  }
}
