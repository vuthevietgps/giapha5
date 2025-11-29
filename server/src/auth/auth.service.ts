import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService) {}

  private sign(payload: Record<string, any>): string {
    const secret = process.env.AUTH_SECRET || 'dev-secret';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const data = `${header}.${body}`;
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmailWithPassword(normalizedEmail);
    const ok = await bcrypt.compare(password, (user as any).password);
    if (!ok) throw new UnauthorizedException('Sai email hoặc mật khẩu');
    const id = (user as any).id;
    const token = this.sign({ sub: id, role: (user as any).role, email: (user as any).email });
    const { fullName, role } = user as any;
    return { token, user: { id, fullName, email: user.email, role } };
  }
}
