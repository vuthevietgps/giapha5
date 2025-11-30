export type UserRole = 'GIAM_DOC' | 'QUAN_LY' | 'NHAN_VIEN' | 'TRUONG_HO';
export const USER_ROLES: UserRole[] = ['GIAM_DOC', 'QUAN_LY', 'NHAN_VIEN', 'TRUONG_HO'];
export const DEFAULT_USER_ROLE: UserRole = 'NHAN_VIEN';

export interface User {
  id?: string;
  fullName: string;
  email: string;
  role: UserRole;
  managedFamilies?: string[]; // Cho QUAN_LY: danh sách dòng họ được quản lý
  assignedFamily?: string; // Cho NHAN_VIEN và TRUONG_HO: dòng họ được chỉ định
  // password is only used on create/update form, not returned by API
  password?: string;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  GIAM_DOC: 'Giám đốc',
  QUAN_LY: 'Quản lý',
  NHAN_VIEN: 'Nhân viên',
  TRUONG_HO: 'Trưởng họ',
};

// Định nghĩa quyền truy cập cho từng role
export const ROLE_PERMISSIONS = {
  GIAM_DOC: {
    users: { create: true, read: true, update: true, delete: true },
    families: { create: true, read: true, update: true, delete: true },
    positions: { create: true, read: true, update: true, delete: true },
    members: { create: true, read: true, update: true, delete: true },
    tree: { create: true, read: true, update: true, delete: true },
    branch: { create: true, read: true, update: true, delete: true },
    backgrounds: { create: true, read: true, update: true, delete: true },
    calendar: { create: true, read: true, update: true, delete: true },
    branchCalendar: { create: true, read: true, update: true, delete: true },
    posts: { create: true, read: true, update: true, delete: true },
  },
  QUAN_LY: {
    users: { create: true, read: true, update: true, delete: true }, // Quản lý nhân viên và trưởng họ
    families: { create: true, read: true, update: true, delete: true }, // Quản lý dòng họ được chỉ định
    positions: { create: false, read: true, update: false, delete: false }, // Chỉ xem
    members: { create: true, read: true, update: true, delete: true }, // Quản lý member của dòng họ
    tree: { create: true, read: true, update: true, delete: true }, // Quản lý cây gia phả
    branch: { create: true, read: true, update: true, delete: true }, // Quản lý nhánh quan tâm
    backgrounds: { create: true, read: true, update: true, delete: true }, // Quản lý ảnh nền
    calendar: { create: true, read: true, update: true, delete: true }, // Quản lý lịch vạn niên
    branchCalendar: { create: true, read: true, update: true, delete: true }, // Quản lý lịch quan trọng
    posts: { create: true, read: true, update: true, delete: true }, // Quản lý bài viết
  },
  NHAN_VIEN: {
    users: { create: false, read: false, update: false, delete: false },
    families: { create: false, read: true, update: false, delete: false }, // Chỉ xem họ được chỉ định
    positions: { create: false, read: true, update: false, delete: false },
    members: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    tree: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    branch: { create: false, read: true, update: false, delete: false },
    backgrounds: { create: true, read: true, update: false, delete: false }, // Chỉ họ được chỉ định
    calendar: { create: false, read: true, update: false, delete: false },
    branchCalendar: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    posts: { create: false, read: true, update: false, delete: false },
  },
  TRUONG_HO: {
    users: { create: false, read: false, update: false, delete: false },
    families: { create: false, read: true, update: false, delete: false }, // Chỉ xem họ được chỉ định
    positions: { create: false, read: true, update: false, delete: false },
    members: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    tree: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    branch: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    backgrounds: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    calendar: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    branchCalendar: { create: true, read: true, update: true, delete: true }, // Chỉ họ được chỉ định
    posts: { create: false, read: true, update: false, delete: false },
  },
};
