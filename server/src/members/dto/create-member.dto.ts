import { IsBoolean, IsDateString, IsEmail, IsMongoId, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @ValidateIf((o) => o.photoUrl && o.photoUrl !== '')
  @IsString()
  @MaxLength(500)
  @IsOptional()
  photoUrl?: string;

  @ValidateIf((o) => o.phone && o.phone !== '')
  @IsString()
  @Matches(/^[0-9+\-()\s]{3,20}$/)
  @IsOptional()
  phone?: string;

  @ValidateIf((o) => o.email && o.email !== '')
  @IsEmail()
  @IsOptional()
  email?: string;

  @ValidateIf((o) => o.password && o.password !== '')
  @IsString()
  @MaxLength(200)
  @IsOptional()
  password?: string; // hashed on save if provided

  @IsMongoId()
  family!: string;

  @ValidateIf((o) => o.father && o.father !== '')
  @IsMongoId()
  @IsOptional()
  father?: string;

  @ValidateIf((o) => o.spouse && o.spouse !== '')
  @IsMongoId()
  @IsOptional()
  spouse?: string;

  @ValidateIf((o) => o.mother && o.mother !== '')
  @IsMongoId()
  @IsOptional()
  mother?: string;

  @ValidateIf((o) => o.bio && o.bio !== '')
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  bio?: string;

  @ValidateIf((o) => o.dob && o.dob !== '')
  @IsDateString()
  @IsOptional()
  dob?: string;

  @ValidateIf((o) => o.dod && o.dod !== '')
  @IsDateString()
  @IsOptional()
  dod?: string;

  @ValidateIf((o) => o.position && o.position !== '')
  @IsMongoId()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  gender?: 'male' | 'female' | 'other';
}
