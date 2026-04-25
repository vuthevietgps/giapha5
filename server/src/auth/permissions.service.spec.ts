import { PermissionsService, AuthUser } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(() => {
    service = new PermissionsService();
  });

  describe('canAccessFamily', () => {
    it('should allow GIAM_DOC to access any family', () => {
      const user: AuthUser = { id: '1', email: 'admin@test.com', role: 'GIAM_DOC' };
      expect(service.canAccessFamily(user, 'any-family')).toBe(true);
    });

    it('should allow QUAN_LY to access managed families', () => {
      const user: AuthUser = { id: '2', email: 'ql@test.com', role: 'QUAN_LY', managedFamilies: ['fam1', 'fam2'] };
      expect(service.canAccessFamily(user, 'fam1')).toBe(true);
      expect(service.canAccessFamily(user, 'fam2')).toBe(true);
      expect(service.canAccessFamily(user, 'fam3')).toBe(false);
    });

    it('should allow NHAN_VIEN to access assigned family only', () => {
      const user: AuthUser = { id: '3', email: 'nv@test.com', role: 'NHAN_VIEN', assignedFamily: 'fam1' };
      expect(service.canAccessFamily(user, 'fam1')).toBe(true);
      expect(service.canAccessFamily(user, 'fam2')).toBe(false);
    });

    it('should allow TRUONG_HO to access assigned family only', () => {
      const user: AuthUser = { id: '4', email: 'th@test.com', role: 'TRUONG_HO', assignedFamily: 'fam1' };
      expect(service.canAccessFamily(user, 'fam1')).toBe(true);
      expect(service.canAccessFamily(user, 'other')).toBe(false);
    });

    it('should deny unknown roles', () => {
      const user: AuthUser = { id: '5', email: 'x@test.com', role: 'UNKNOWN' };
      expect(service.canAccessFamily(user, 'any')).toBe(false);
    });
  });

  describe('getAccessibleFamilyIds', () => {
    it('should return null for GIAM_DOC (all access)', () => {
      const user: AuthUser = { id: '1', email: 'admin@test.com', role: 'GIAM_DOC' };
      expect(service.getAccessibleFamilyIds(user)).toBeNull();
    });

    it('should return managed families for QUAN_LY', () => {
      const user: AuthUser = { id: '2', email: 'ql@test.com', role: 'QUAN_LY', managedFamilies: ['fam1', 'fam2'] };
      expect(service.getAccessibleFamilyIds(user)).toEqual(['fam1', 'fam2']);
    });

    it('should return empty array for QUAN_LY with no managed families', () => {
      const user: AuthUser = { id: '2', email: 'ql@test.com', role: 'QUAN_LY' };
      expect(service.getAccessibleFamilyIds(user)).toEqual([]);
    });

    it('should return assigned family as array for NHAN_VIEN', () => {
      const user: AuthUser = { id: '3', email: 'nv@test.com', role: 'NHAN_VIEN', assignedFamily: 'fam1' };
      expect(service.getAccessibleFamilyIds(user)).toEqual(['fam1']);
    });

    it('should return empty array for NHAN_VIEN without assigned family', () => {
      const user: AuthUser = { id: '3', email: 'nv@test.com', role: 'NHAN_VIEN' };
      expect(service.getAccessibleFamilyIds(user)).toEqual([]);
    });
  });

  describe('canAccessBilling', () => {
    it('allows GIAM_DOC to read billing in any accessible family', () => {
      const user: AuthUser = { id: '1', email: 'admin@test.com', role: 'GIAM_DOC' };
      expect(service.canAccessBilling(user, 'fam1', 'owner-1')).toBe(true);
    });

    it('allows QUAN_LY to read billing in managed families even when not the payment owner', () => {
      const user: AuthUser = {
        id: '2',
        email: 'ql@test.com',
        role: 'QUAN_LY',
        managedFamilies: ['fam1'],
      };

      expect(service.canAccessBilling(user, 'fam1', 'owner-1')).toBe(true);
      expect(service.canAccessBilling(user, 'fam2', 'owner-1')).toBe(false);
    });

    it('allows NHAN_VIEN to read only owned billing rows inside the currently assigned family', () => {
      const user: AuthUser = {
        id: '3',
        email: 'nv@test.com',
        role: 'NHAN_VIEN',
        assignedFamily: 'fam1',
      };

      expect(service.canAccessBilling(user, 'fam1', '3')).toBe(true);
      expect(service.canAccessBilling(user, 'fam1', 'other-owner')).toBe(false);
      expect(service.canAccessBilling(user, 'fam2', '3')).toBe(false);
    });

    it('allows TRUONG_HO to read only owned billing rows inside the currently assigned family', () => {
      const user: AuthUser = {
        id: '4',
        email: 'th@test.com',
        role: 'TRUONG_HO',
        assignedFamily: 'fam1',
      };

      expect(service.canAccessBilling(user, 'fam1', '4')).toBe(true);
      expect(service.canAccessBilling(user, 'fam1', 'other-owner')).toBe(false);
      expect(service.canAccessBilling(user, 'other-family', '4')).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('should allow GIAM_DOC to manage any role', () => {
      const user: AuthUser = { id: '1', email: 'admin@test.com', role: 'GIAM_DOC' };
      expect(service.canManageUser(user, 'NHAN_VIEN')).toBe(true);
      expect(service.canManageUser(user, 'QUAN_LY')).toBe(true);
      expect(service.canManageUser(user, 'GIAM_DOC')).toBe(true);
    });

    it('should allow QUAN_LY to manage NHAN_VIEN and TRUONG_HO only', () => {
      const user: AuthUser = { id: '2', email: 'ql@test.com', role: 'QUAN_LY' };
      expect(service.canManageUser(user, 'NHAN_VIEN')).toBe(true);
      expect(service.canManageUser(user, 'TRUONG_HO')).toBe(true);
      expect(service.canManageUser(user, 'QUAN_LY')).toBe(false);
      expect(service.canManageUser(user, 'GIAM_DOC')).toBe(false);
    });

    it('should deny NHAN_VIEN from managing anyone', () => {
      const user: AuthUser = { id: '3', email: 'nv@test.com', role: 'NHAN_VIEN' };
      expect(service.canManageUser(user, 'NHAN_VIEN')).toBe(false);
    });

    it('should deny TRUONG_HO from managing anyone', () => {
      const user: AuthUser = { id: '4', email: 'th@test.com', role: 'TRUONG_HO' };
      expect(service.canManageUser(user, 'NHAN_VIEN')).toBe(false);
    });
  });

  describe('filterUsers', () => {
    const allUsers = [
      { id: '1', role: 'GIAM_DOC', email: 'admin@test.com' },
      { id: '2', role: 'QUAN_LY', email: 'ql@test.com', managedFamilies: ['fam1'] },
      { id: '3', role: 'NHAN_VIEN', email: 'nv@test.com', assignedFamily: 'fam1' },
      { id: '4', role: 'TRUONG_HO', email: 'th@test.com', assignedFamily: 'fam1' },
      { id: '5', role: 'NHAN_VIEN', email: 'nv2@test.com', assignedFamily: 'fam2' },
    ];

    it('should return all users for GIAM_DOC', () => {
      const user: AuthUser = { id: '1', email: 'admin@test.com', role: 'GIAM_DOC' };
      expect(service.filterUsers(user, allUsers)).toEqual(allUsers);
    });

    it('should filter users by managed families for QUAN_LY', () => {
      const user: AuthUser = { id: '2', email: 'ql@test.com', role: 'QUAN_LY', managedFamilies: ['fam1'] };
      const filtered = service.filterUsers(user, allUsers);
      expect(filtered.length).toBe(2);
      expect(filtered.map(u => u.id)).toEqual(['3', '4']);
    });

    it('should filter users in same family for TRUONG_HO', () => {
      const user: AuthUser = { id: '4', email: 'th@test.com', role: 'TRUONG_HO', assignedFamily: 'fam1' };
      const filtered = service.filterUsers(user, allUsers);
      expect(filtered.length).toBe(2);
      expect(filtered.map(u => u.id)).toEqual(['3', '4']);
    });

    it('should return empty for NHAN_VIEN', () => {
      const user: AuthUser = { id: '3', email: 'nv@test.com', role: 'NHAN_VIEN' };
      expect(service.filterUsers(user, allUsers)).toEqual([]);
    });
  });
});
