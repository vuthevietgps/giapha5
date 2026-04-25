import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';

@Controller('families')
export class FamiliesController {
	constructor(private readonly familiesService: FamiliesService) {}

	// ===== PUBLIC endpoints (no guard) =====

	@Get('public/:token')
	findPublic(@Param('token') token: string) {
		return this.familiesService.findByShareToken(token);
	}

	@Get('public/:token/members')
	getPublicMembers(@Param('token') token: string) {
		return this.familiesService.getPublicMembers(token);
	}

	// ===== Protected endpoints =====

	@Post()
	@UseGuards(PermissionsGuard)
	@Resource('families')
	@Action('create')
	create(@CurrentUser() user: AuthUser, @Body() dto: CreateFamilyDto) {
		return this.familiesService.create(dto, user);
	}

	@Get()
	@UseGuards(PermissionsGuard)
	@Resource('families')
	@Action('read')
	findAll(@CurrentUser() user: AuthUser) {
		return this.familiesService.findAll(user);
	}

	@Get(':id')
	@UseGuards(PermissionsGuard)
	@Resource('families')
	@Action('read')
	findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
		return this.familiesService.findOne(id, user);
	}

	@Post(':id/toggle-share')
	@UseGuards(PermissionsGuard)
	@Resource('families')
	@Action('update')
	toggleShare(@CurrentUser() user: AuthUser, @Param('id') id: string) {
		return this.familiesService.toggleShare(id, user);
	}

	@Patch(':id')
	@UseGuards(PermissionsGuard)
	@Resource('families')
	@Action('update')
	update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFamilyDto) {
		return this.familiesService.update(id, dto, user);
	}

	@Delete(':id')
	@UseGuards(PermissionsGuard)
	@Resource('families')
	@Action('delete')
	remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
		return this.familiesService.remove(id, user);
	}
}
