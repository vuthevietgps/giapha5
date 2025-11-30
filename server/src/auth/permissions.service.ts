import { Injectable } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  managedFamilies?: string[];
  assignedFamily?: string;
}

@Injectable()
export class PermissionsService {
  /**
   * Kiểm tra user có thể truy cập family không
   */
  canAccessFamily(user: AuthUser, familyId: string): boolean {
    if (user.role === 'GIAM_DOC') {
      return true; // Giám đốc truy cập tất cả
    }

    if (user.role === 'QUAN_LY') {
      return (user.managedFamilies || []).includes(familyId);
    }

    if (user.role === 'NHAN_VIEN' || user.role === 'TRUONG_HO') {
      return user.assignedFamily === familyId;
    }

    return false;
  }

  /**
   * Lấy danh sách family IDs mà user được phép truy cập
   */
  getAccessibleFamilyIds(user: AuthUser): string[] | null {
    if (user.role === 'GIAM_DOC') {
      return null; // null = tất cả
    }

    if (user.role === 'QUAN_LY') {
      return user.managedFamilies || [];
    }

    if (user.role === 'NHAN_VIEN' || user.role === 'TRUONG_HO') {
      return user.assignedFamily ? [user.assignedFamily] : [];
    }

    return [];
  }

  /**
   * Filter query để chỉ lấy data từ families được phép
   */
  applyFamilyFilter(user: AuthUser, query: any = {}): any {
    const familyIds = this.getAccessibleFamilyIds(user);

    if (familyIds === null) {
      // Giám đốc - không filter
      return query;
    }

    if (familyIds.length === 0) {
      // Không có quyền truy cập family nào
      return { ...query, family: { $in: [] } }; // Query không trả về gì
    }

    // Filter theo families được phép
    return { ...query, family: { $in: familyIds } };
  }

  /**
   * Kiểm tra user có thể quản lý user khác không
   */
  canManageUser(currentUser: AuthUser, targetRole: string): boolean {
    if (currentUser.role === 'GIAM_DOC') {
      return true; // Giám đốc quản lý tất cả
    }

    if (currentUser.role === 'QUAN_LY') {
      // Quản lý chỉ quản lý được nhân viên và trưởng họ
      return targetRole === 'NHAN_VIEN' || targetRole === 'TRUONG_HO';
    }

    return false;
  }

  /**
   * Lọc danh sách users dựa trên quyền của user hiện tại
   */
  filterUsers(currentUser: AuthUser, users: any[]): any[] {
    if (currentUser.role === 'GIAM_DOC') {
      return users; // Giám đốc xem tất cả
    }

    if (currentUser.role === 'QUAN_LY') {
      // Quản lý chỉ xem users trong các families mình quản lý
      const managedFamilies = currentUser.managedFamilies || [];
      return users.filter(user => {
        // Chỉ hiển thị NHAN_VIEN và TRUONG_HO trong các family được quản lý
        if (user.role !== 'NHAN_VIEN' && user.role !== 'TRUONG_HO') {
          return false;
        }
        return user.assignedFamily && managedFamilies.includes(user.assignedFamily);
      });
    }

    if (currentUser.role === 'TRUONG_HO') {
      // Trưởng họ chỉ xem users trong cùng family (NHAN_VIEN và TRUONG_HO khác)
      const myFamily = currentUser.assignedFamily;
      if (!myFamily) return [];
      return users.filter(user => {
        if (user.role !== 'NHAN_VIEN' && user.role !== 'TRUONG_HO') {
          return false;
        }
        return user.assignedFamily === myFamily;
      });
    }

    if (currentUser.role === 'NHAN_VIEN') {
      // Nhân viên không xem danh sách users
      return [];
    }

    return [];
  }
}
