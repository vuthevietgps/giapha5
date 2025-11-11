import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';

@Controller('families')
export class FamiliesController {
	constructor(private readonly familiesService: FamiliesService) {}

	@Post()
	create(@Body() dto: CreateFamilyDto) {
		return this.familiesService.create(dto);
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
