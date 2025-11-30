import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Mock authentication middleware - thay thế bằng JWT/Session thực tế
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // TODO: Implement real authentication
    // For now, mock user from x-user-info header sent by frontend
    const userInfoHeader = req.headers['x-user-info'] as string;
    
    if (!userInfoHeader) {
      // Mock user mặc định cho testing (chỉ khi không có header)
      (req as any).user = {
        id: '1',
        email: 'admin@example.com',
        role: 'GIAM_DOC',
        managedFamilies: [],
      };
      return next();
    }
    
    try {
      // Decode user info từ header (frontend sẽ gửi base64 encoded JSON)
      const userJson = Buffer.from(userInfoHeader, 'base64').toString('utf-8');
      const user = JSON.parse(userJson);
      (req as any).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        managedFamilies: user.managedFamilies || [],
        assignedFamily: user.assignedFamily,
      };
      next();
    } catch (error) {
      // Fallback to default user if parsing fails
      (req as any).user = {
        id: '1',
        email: 'admin@example.com',
        role: 'GIAM_DOC',
        managedFamilies: [],
      };
      next();
    }
  }
}
