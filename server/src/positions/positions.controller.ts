import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action } from '../auth/decorators/roles.decorator';

@Controller('positions')
@UseGuards(PermissionsGuard)
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  @Get()
  @Resource('positions')
  @Action('read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Resource('positions')
  @Action('read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Resource('positions')
  @Action('create')
  create(@Body() dto: CreatePositionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Resource('positions')
  @Action('update')
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Resource('positions')
  @Action('delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
