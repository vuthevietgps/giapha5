import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESOURCE_KEY, ACTION_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';

const ROLE_PERMISSIONS: Record<string, Record<string, Record<string, boolean>>> = {
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
    users: { create: true, read: true, update: true, delete: true },
    families: { create: true, read: true, update: true, delete: true },
    positions: { create: false, read: true, update: false, delete: false },
    members: { create: true, read: true, update: true, delete: true },
    tree: { create: true, read: true, update: true, delete: true },
    branch: { create: true, read: true, update: true, delete: true },
    backgrounds: { create: true, read: true, update: true, delete: true },
    calendar: { create: true, read: true, update: true, delete: true },
    branchCalendar: { create: true, read: true, update: true, delete: true },
    posts: { create: true, read: true, update: true, delete: true },
  },
  NHAN_VIEN: {
    users: { create: false, read: false, update: false, delete: false },
    families: { create: false, read: true, update: false, delete: false },
    positions: { create: false, read: true, update: false, delete: false },
    members: { create: true, read: true, update: true, delete: true },
    tree: { create: true, read: true, update: true, delete: true },
    branch: { create: false, read: true, update: false, delete: false },
    backgrounds: { create: true, read: true, update: false, delete: false },
    calendar: { create: false, read: true, update: false, delete: false },
    branchCalendar: { create: true, read: true, update: true, delete: true },
    posts: { create: false, read: true, update: false, delete: false },
  },
  TRUONG_HO: {
    users: { create: false, read: false, update: false, delete: false },
    families: { create: false, read: true, update: false, delete: false },
    positions: { create: false, read: true, update: false, delete: false },
    members: { create: true, read: true, update: true, delete: true },
    tree: { create: true, read: true, update: true, delete: true },
    branch: { create: true, read: true, update: true, delete: true },
    backgrounds: { create: true, read: true, update: true, delete: true },
    calendar: { create: true, read: true, update: true, delete: true },
    branchCalendar: { create: true, read: true, update: true, delete: true },
    posts: { create: false, read: true, update: false, delete: false },
  },
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const resource = this.reflector.get<string>(RESOURCE_KEY, context.getHandler());
    const action = this.reflector.get<'create' | 'read' | 'update' | 'delete'>(ACTION_KEY, context.getHandler());
    
    if (!resource || !action) {
      return true; // Không có metadata thì cho qua
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new UnauthorizedException('Bạn chưa đăng nhập');
    }
    
    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS];
    
    if (!permissions) {
      throw new ForbiddenException('Role không hợp lệ');
    }
    
    const hasPermission = permissions[resource]?.[action];
    
    if (!hasPermission) {
      throw new ForbiddenException(`Bạn không có quyền ${action} trên ${resource}`);
    }
    
    return true;
  }
}
