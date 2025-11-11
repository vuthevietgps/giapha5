import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Tên dòng họ

  @IsString()
  @IsNotEmpty()
  contactName: string; // Tên người liên hệ

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-()\s]{6,20}$/,{ message: 'Số điện thoại không hợp lệ' })
  contactPhone?: string; // SĐT người liên hệ

  @IsOptional()
  @IsString()
  address?: string; // Địa chỉ dòng họ

  // Tùy chọn chỉ định tổ tiên gốc (phải là member thuộc họ, thường là nam)
  @IsOptional()
  @IsString()
  rootMember?: string;
}
