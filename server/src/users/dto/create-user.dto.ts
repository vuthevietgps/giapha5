import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managedFamilies?: string[];

  @IsOptional()
  @IsString()
  assignedFamily?: string;
}
