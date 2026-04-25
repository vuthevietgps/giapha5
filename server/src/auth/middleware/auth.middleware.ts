import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    // Public routes that don't require authentication
    const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/verify-email', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/subscriptions/plans', '/api/payments/vnpay-return', '/api/families/public/'];
    if (publicPaths.some(p => req.path.startsWith(p))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify(token);
        (req as any).user = {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          managedFamilies: payload.managedFamilies || [],
          assignedFamily: payload.assignedFamily,
        };
      } catch {
        // Invalid token - user will be null, guards will reject
        (req as any).user = null;
      }
    } else {
      (req as any).user = null;
    }

    next();
  }
}
