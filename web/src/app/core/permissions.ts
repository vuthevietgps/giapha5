import { UserRole } from '../features/users/models/user.model';
import { AuthUser } from '../features/auth/services/auth.service';

// Permission system based on roles
export type Permission = 
  | 'users.view' | 'users.create' | 'users.edit' | 'users.delete'
  | 'families.view' | 'families.create' | 'families.edit' | 'families.delete'
  | 'positions.view' | 'positions.create' | 'positions.edit' | 'positions.delete'
  | 'members.view' | 'members.create' | 'members.edit' | 'members.delete'
  | 'tree.view' | 'tree.edit'
  | 'branches.view' | 'branches.edit'
  | 'backgrounds.view' | 'backgrounds.create' | 'backgrounds.edit' | 'backgrounds.delete'
  | 'calendar.view'
  | 'posts.view' | 'posts.create' | 'posts.edit' | 'posts.delete'
  | 'payment.view' | 'payment.create' | 'payment.edit' | 'payment.delete'
  | 'reports.view' | 'reports.create' | 'reports.edit' | 'reports.delete'
  | 'export.all';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    // System-wide admin access - can create families and manage everything
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'families.view', 'families.create', 'families.edit', 'families.delete',
    'positions.view', 'positions.create', 'positions.edit', 'positions.delete',
    'members.view', 'members.create', 'members.edit', 'members.delete',
    'tree.view', 'tree.edit',
    'branches.view', 'branches.edit',
    'backgrounds.view', 'backgrounds.create', 'backgrounds.edit', 'backgrounds.delete',
    'calendar.view',
    'posts.view', 'posts.create', 'posts.edit', 'posts.delete',
    'payment.view', 'payment.create', 'payment.edit', 'payment.delete',
    'reports.view', 'reports.create', 'reports.edit', 'reports.delete',
    'export.all'
  ],
  ADMIN_DONG_HO: [
    // LIMITED to assigned family data only - CANNOT create families or manage system users
    // 'users.view', 'users.create', 'users.edit' - REMOVED - no user management
    // 'families.view', 'families.create', 'families.edit', 'families.delete' - REMOVED - no family management
    'positions.view', 'positions.create', 'positions.edit', 'positions.delete',
    'members.view', 'members.create', 'members.edit', 'members.delete',
    'tree.view', 'tree.edit',
    'branches.view', 'branches.edit',
    'backgrounds.view', 'backgrounds.create', 'backgrounds.edit', 'backgrounds.delete',
    'calendar.view',
    'posts.view', 'posts.create', 'posts.edit', 'posts.delete',
    'payment.view', // Can view pricing but not manage
    'export.all'
  ],
  BIEN_TAP_DONG_HO: [
    // Can manage content but not users/structure
    'families.view',
    'positions.view',
    'members.view', 'members.create', 'members.edit', 'members.delete',
    'tree.view', 'tree.edit',
    'branches.view', 'branches.edit',
    'backgrounds.view', 'backgrounds.create', 'backgrounds.edit', 'backgrounds.delete',
    'calendar.view',
    'posts.view', 'posts.create', 'posts.edit', 'posts.delete',
    'export.all'
  ],
  THANH_VIEN: [
    // Can view most things, limited editing
    'families.view',
    'positions.view',
    'members.view',
    'tree.view',
    'branches.view',
    'backgrounds.view',
    'calendar.view',
    'posts.view'
  ],
  KHACH: [
    // Very limited access - mostly viewing
    'tree.view',
    'calendar.view',
    'posts.view'
  ]
};

export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  const userRole = user.role as UserRole;
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
}

export function canAccess(user: AuthUser | null, ...permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}