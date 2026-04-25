import { Injectable } from '@nestjs/common';
import { UserRole } from '../users/schemas/user.schema';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  managedFamilies?: string[];
  assignedFamily?: string;
}

@Injectable()
export class PermissionsService {
  canAccessFamily(user: AuthUser, familyId: string): boolean {
    if (user.role === UserRole.GIAM_DOC) {
      return true;
    }

    if (user.role === UserRole.QUAN_LY) {
      return (user.managedFamilies || []).includes(familyId);
    }

    if (user.role === UserRole.NHAN_VIEN || user.role === UserRole.TRUONG_HO) {
      return user.assignedFamily === familyId;
    }

    return false;
  }

  canAccessBilling(user: AuthUser, familyId: string, ownerId: string): boolean {
    if (!this.canAccessFamily(user, familyId)) {
      return false;
    }

    if (user.role === UserRole.GIAM_DOC || user.role === UserRole.QUAN_LY) {
      return true;
    }

    return user.id === ownerId;
  }

  getAccessibleFamilyIds(user: AuthUser): string[] | null {
    if (user.role === UserRole.GIAM_DOC) {
      return null;
    }

    if (user.role === UserRole.QUAN_LY) {
      return user.managedFamilies || [];
    }

    if (user.role === UserRole.NHAN_VIEN || user.role === UserRole.TRUONG_HO) {
      return user.assignedFamily ? [user.assignedFamily] : [];
    }

    return [];
  }

  applyFamilyFilter(user: AuthUser, query: any = {}): any {
    const familyIds = this.getAccessibleFamilyIds(user);

    if (familyIds === null) {
      return query;
    }

    if (familyIds.length === 0) {
      return { ...query, family: { $in: [] } };
    }

    return { ...query, family: { $in: familyIds } };
  }

  canManageUser(currentUser: AuthUser, targetRole: string): boolean {
    if (currentUser.role === UserRole.GIAM_DOC) {
      return true;
    }

    if (currentUser.role === UserRole.QUAN_LY) {
      return targetRole === UserRole.NHAN_VIEN || targetRole === UserRole.TRUONG_HO;
    }

    return false;
  }

  filterUsers(currentUser: AuthUser, users: any[]): any[] {
    if (currentUser.role === UserRole.GIAM_DOC) {
      return users;
    }

    if (currentUser.role === UserRole.QUAN_LY) {
      const managedFamilies = currentUser.managedFamilies || [];
      return users.filter(user => {
        if (user.role !== UserRole.NHAN_VIEN && user.role !== UserRole.TRUONG_HO) {
          return false;
        }
        return user.assignedFamily && managedFamilies.includes(user.assignedFamily);
      });
    }

    if (currentUser.role === UserRole.TRUONG_HO) {
      const myFamily = currentUser.assignedFamily;
      if (!myFamily) return [];
      return users.filter(user => {
        if (user.role !== UserRole.NHAN_VIEN && user.role !== UserRole.TRUONG_HO) {
          return false;
        }
        return user.assignedFamily === myFamily;
      });
    }

    return [];
  }
}
