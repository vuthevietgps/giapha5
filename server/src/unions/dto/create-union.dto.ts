import { IsArray, IsDateString, IsMongoId, IsOptional, ArrayMaxSize, ArrayMinSize, ArrayUnique } from 'class-validator';

export class CreateUnionDto {
  @IsMongoId()
  family!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ArrayUnique()
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
