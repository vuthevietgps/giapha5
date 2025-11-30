import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const RESOURCE_KEY = 'resource';
export const Resource = (resource: string) => SetMetadata(RESOURCE_KEY, resource);

export const ACTION_KEY = 'action';
export const Action = (action: 'create' | 'read' | 'update' | 'delete') => SetMetadata(ACTION_KEY, action);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
