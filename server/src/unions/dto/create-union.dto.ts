import { IsArray, IsDateString, IsMongoId, IsOptional, ArrayMinSize } from 'class-validator';

export class CreateUnionDto {
  @IsMongoId()
  family!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  partners!: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  notes?: string;
}
