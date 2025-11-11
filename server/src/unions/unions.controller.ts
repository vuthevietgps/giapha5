import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UnionsService } from './unions.service';
import { CreateUnionDto } from './dto/create-union.dto';
import { UpdateUnionDto } from './dto/update-union.dto';

@Controller('unions')
export class UnionsController {
  constructor(private readonly unionsService: UnionsService) {}

  @Post()
  create(@Body() dto: CreateUnionDto) {
    return this.unionsService.create(dto);
  }

  @Get()
  findAll(@Query('family') family?: string, @Query('partner') partner?: string) {
    return this.unionsService.findAll({ family, partner });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUnionDto) {
    return this.unionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unionsService.remove(id);
  }

  @Post('normalize/:memberId')
  normalize(@Param('memberId') memberId: string) {
    return this.unionsService.normalizeForMember(memberId);
  }
}
