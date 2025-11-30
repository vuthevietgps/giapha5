import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';

@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	@Resource('users')
	@Action('create')
	create(@Body() dto: CreateUserDto) {
		return this.usersService.create(dto);
	}

	@Get()
	@Resource('users')
	@Action('read')
	findAll(@CurrentUser() user: AuthUser) {
		return this.usersService.findAll(user);
	}

	@Get(':id')
	@Resource('users')
	@Action('read')
	findOne(@Param('id') id: string) {
		return this.usersService.findOne(id);
	}

	@Patch(':id')
	@Resource('users')
	@Action('update')
	update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
		return this.usersService.update(id, dto);
	}

	@Delete(':id')
	@Resource('users')
	@Action('delete')
	remove(@Param('id') id: string) {
		return this.usersService.remove(id);
	}
}
