import { Body, Controller, Delete, Get, Param, Patch, Post, Request } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { CreateFamilyDto as NewCreateFamilyDto, UpdateFamilyDto as NewUpdateFamilyDto, AssignAdminDto, AddSubscriptionTimeDto } from './dto/family.dto';

@Controller('families')
export class FamiliesController {
	constructor(private readonly familiesService: FamiliesService) {}

	// ========== MANAGEMENT ENDPOINTS (must come before :id routes) ==========

	/**
	 * Get all families with statistics (SUPER_ADMIN only)
	 */
	@Get('management/stats')
	getAllFamiliesWithStats() {
		return this.familiesService.getAllFamiliesWithStats();
	}

	/**
	 * Get system statistics (SUPER_ADMIN only)
	 */
	@Get('management/system-stats')
	getSystemStats() {
		return this.familiesService.getSystemStats();
	}

	/**
	 * Get families managed by current admin (ADMIN_DONG_HO only)
	 */
	@Get('management/my-families')
	getMyFamilies(@Request() req: any) {
		const userId = req.user?.id || 'temp-admin-id';
		return this.familiesService.getFamiliesByAdmin(userId);
	}

	/**
	 * Create family with admin assignment (SUPER_ADMIN only)
	 */
	@Post('management/create')
	createFamily(@Body() dto: NewCreateFamilyDto, @Request() req: any) {
		const userId = req.user?.id || null;
		return this.familiesService.createFamily(dto, userId);
	}

	/**
	 * Assign admin to family (SUPER_ADMIN only)
	 */
	@Post('management/:id/assign-admin')
	assignAdmin(@Param('id') id: string, @Body() dto: AssignAdminDto, @Request() req: any) {
		const userId = req.user?.id || null;
		return this.familiesService.assignAdmin(id, dto, userId);
	}

	/**
	 * Add subscription time (SUPER_ADMIN only)
	 */
	@Post('management/:id/add-time')
	addSubscriptionTime(@Param('id') id: string, @Body() dto: AddSubscriptionTimeDto, @Request() req: any) {
		const userId = req.user?.id || null;
		return this.familiesService.addSubscriptionTime(id, dto, userId);
	}

	/**
	 * Update family (SUPER_ADMIN only)
	 */
	@Patch('management/:id')
	updateFamily(@Param('id') id: string, @Body() dto: NewUpdateFamilyDto, @Request() req: any) {
		const userId = req.user?.id || null;
		return this.familiesService.updateFamily(id, dto, userId);
	}

	// ========== BASIC CRUD ENDPOINTS ==========

	@Post()
	create(@Body() dto: CreateFamilyDto, @Request() req: any) {
		const userId = req.user?.id || null;
		return this.familiesService.create(dto, userId);
	}

	@Get()
	findAll() {
		return this.familiesService.findAll();
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.familiesService.findOne(id);
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() dto: UpdateFamilyDto) {
		return this.familiesService.update(id, dto);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.familiesService.remove(id);
	}
}
