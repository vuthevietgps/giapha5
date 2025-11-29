export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN_DONG_HO'
  | 'BIEN_TAP_DONG_HO'
  | 'THANH_VIEN'
  | 'KHACH';
export const USER_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN_DONG_HO',
  'BIEN_TAP_DONG_HO',
  'THANH_VIEN',
  'KHACH',
];
export const DEFAULT_USER_ROLE: UserRole = 'THANH_VIEN';

export interface User {
  id?: string;
  fullName: string;
  email: string;
  role: UserRole;
  managedFamilies?: string[]; // Family IDs that ADMIN_DONG_HO can manage
  // password is only used on create/update form, not returned by API
  password?: string;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Giám đốc hệ thống',
  ADMIN_DONG_HO: 'Admin dòng họ',
  BIEN_TAP_DONG_HO: 'Biên tập của dòng họ',
  THANH_VIEN: 'Thành viên thường',
  KHACH: 'Khách',
};
