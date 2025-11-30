import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';

@Controller('families')
@UseGuards(PermissionsGuard)
export class FamiliesController {
	constructor(private readonly familiesService: FamiliesService) {}

	@Post()
	@Resource('families')
	@Action('create')
	create(@Body() dto: CreateFamilyDto) {
		return this.familiesService.create(dto);
	}

	@Get()
	@Resource('families')
	@Action('read')
	findAll(@CurrentUser() user: AuthUser) {
		return this.familiesService.findAll(user);
	}

	@Get(':id')
	@Resource('families')
	@Action('read')
	findOne(@Param('id') id: string) {
		return this.familiesService.findOne(id);
	}

	@Patch(':id')
	@Resource('families')
	@Action('update')
	update(@Param('id') id: string, @Body() dto: UpdateFamilyDto) {
		return this.familiesService.update(id, dto);
	}

	@Delete(':id')
	@Resource('families')
	@Action('delete')
	remove(@Param('id') id: string) {
		return this.familiesService.remove(id);
	}
}
