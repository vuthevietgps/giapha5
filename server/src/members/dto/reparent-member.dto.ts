import { IsMongoId, IsOptional } from 'class-validator';

export class ReparentMemberDto {
  @IsOptional()
  @IsMongoId()
  unionId?: string;

  @IsOptional()
  @IsMongoId()
  fatherId?: string;

  @IsOptional()
  @IsMongoId()
  motherId?: string;
}
