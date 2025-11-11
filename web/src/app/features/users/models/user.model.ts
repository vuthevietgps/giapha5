export type UserRole = 'GIAM_DOC' | 'QUAN_LY' | 'NHAN_VIEN';
export const USER_ROLES: UserRole[] = ['GIAM_DOC', 'QUAN_LY', 'NHAN_VIEN'];
export const DEFAULT_USER_ROLE: UserRole = 'NHAN_VIEN';

export interface User {
  id?: string;
  fullName: string;
  email: string;
  role: UserRole;
  // password is only used on create/update form, not returned by API
  password?: string;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  GIAM_DOC: 'Giám đốc',
  QUAN_LY: 'Quản lý',
  NHAN_VIEN: 'Nhân viên',
};
