import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS, UserRole } from '../../features/users/models/user.model';

export type Resource = 'users' | 'families' | 'positions' | 'members' | 'tree' | 'branch' | 'backgrounds' | 'calendar' | 'branchCalendar' | 'posts';
export type Action = 'create' | 'read' | 'update' | 'delete';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private authService = inject(AuthService);
  
  // Computed signal để lấy role hiện tại
  private currentRole = computed(() => {
    const user = this.authService.user();
    return user?.role || null;
  });

  /**
   * Kiểm tra quyền truy cập cho một resource và action cụ thể
   */
  can(resource: Resource, action: Action): boolean {
    const user = this.authService.user();
    const role = user?.role;
    
    console.log('[PermissionService] Checking permission:', { user, role, resource, action });
    
    if (!role) {
      console.log('[PermissionService] No role found, returning false');
      return false;
    }
    
    const permissions = ROLE_PERMISSIONS[role as UserRole];
    if (!permissions) {
      console.log('[PermissionService] No permissions for role:', role);
      return false;
    }
    
    const hasPermission = permissions[resource]?.[action] || false;
    console.log('[PermissionService] Result:', hasPermission);
    
    return hasPermission;
  }

  /**
   * Kiểm tra xem user có thể truy cập một family cụ thể không
   * - GIAM_DOC: có thể truy cập tất cả
   * - QUAN_LY: chỉ truy cập các family trong managedFamilies
   * - NHAN_VIEN/TRUONG_HO: chỉ truy cập assignedFamily
   */
  canAccessFamily(familyId: string): boolean {
    const user = this.authService.user();
    if (!user) return false;

    switch (user.role) {
      case 'GIAM_DOC':
        return true;
      
      case 'QUAN_LY':
        return (user.managedFamilies || []).includes(familyId);
      
      case 'NHAN_VIEN':
      case 'TRUONG_HO':
        return user.assignedFamily === familyId;
      
      default:
        return false;
    }
  }

  /**
   * Lấy danh sách family IDs mà user được phép truy cập
   */
  getAccessibleFamilyIds(): string[] {
    const user = this.authService.user();
    if (!user) return [];

    switch (user.role) {
      case 'GIAM_DOC':
        return []; // Empty array nghĩa là truy cập tất cả
      
      case 'QUAN_LY':
        return user.managedFamilies || [];
      
      case 'NHAN_VIEN':
      case 'TRUONG_HO':
        return user.assignedFamily ? [user.assignedFamily] : [];
      
      default:
        return [];
    }
  }

  /**
   * Kiểm tra user có phải Giám đốc không
   */
  isGiamDoc(): boolean {
    return this.currentRole() === 'GIAM_DOC';
  }

  /**
   * Kiểm tra user có phải Quản lý không
   */
  isQuanLy(): boolean {
    return this.currentRole() === 'QUAN_LY';
  }

  /**
   * Kiểm tra user có phải Nhân viên không
   */
  isNhanVien(): boolean {
    return this.currentRole() === 'NHAN_VIEN';
  }

  /**
   * Kiểm tra user có phải Trưởng họ không
   */
  isTruongHo(): boolean {
    return this.currentRole() === 'TRUONG_HO';
  }

  /**
   * Kiểm tra xem user có thể quản lý user khác không
   * - GIAM_DOC: có thể quản lý tất cả
   * - QUAN_LY: chỉ có thể quản lý NHAN_VIEN và TRUONG_HO
   */
  canManageUser(targetUserRole: UserRole): boolean {
    const role = this.currentRole();
    if (!role) return false;

    if (role === 'GIAM_DOC') return true;
    
    if (role === 'QUAN_LY') {
      return targetUserRole === 'NHAN_VIEN' || targetUserRole === 'TRUONG_HO';
    }

    return false;
  }
}
