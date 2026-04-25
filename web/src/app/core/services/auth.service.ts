import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserRole } from '../../features/users/models/user.model';
import { firstValueFrom } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isEmailVerified?: boolean;
  managedFamilies?: string[];
  assignedFamily?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    isEmailVerified?: boolean;
    managedFamilies?: string[];
    assignedFamily?: string;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal<boolean>(false);
  private refreshTimer: any = null;
  private refreshPromise: Promise<boolean> | null = null;

  private http = inject(HttpClient);

  constructor(private router: Router) {
    this.loadUserFromStorage();
    this.scheduleRefresh();
  }

  get user() {
    return this.currentUser.asReadonly();
  }

  get authenticated() {
    return this.isAuthenticated.asReadonly();
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private loadUserFromStorage() {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('currentUser');
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (!user.role) {
          this.clearStorage();
          return;
        }
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch {
        this.clearStorage();
      }
    }
  }

  private setAuthData(response: AuthResponse) {
    const user: User = {
      id: response.user.id,
      username: response.user.fullName || response.user.email,
      email: response.user.email,
      role: response.user.role,
      isEmailVerified: response.user.isEmailVerified,
      managedFamilies: response.user.managedFamilies,
      assignedFamily: response.user.assignedFamily,
    };

    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.scheduleRefresh();
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password })
      );
      this.setAuthData(response);
      return { success: true, message: 'Đăng nhập thành công' };
    } catch (err: any) {
      const msg = err?.error?.message || 'Email hoặc mật khẩu không đúng';
      return { success: false, message: msg };
    }
  }

  async register(data: {
    fullName: string; email: string; password: string;
    familyName: string; phone?: string; address?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, data)
      );
      this.setAuthData(response);
      return { success: true, message: response.message || 'Đăng ký thành công!' };
    } catch (err: any) {
      const msg = err?.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      return { success: false, message: msg };
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ message: string }>(`${environment.apiBaseUrl}/auth/forgot-password`, { email })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message || 'Có lỗi xảy ra' };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ message: string }>(`${environment.apiBaseUrl}/auth/reset-password`, { token, newPassword })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message || 'Có lỗi xảy ra' };
    }
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ message: string }>(`${environment.apiBaseUrl}/auth/verify-email`, { token })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message || 'Xác thực thất bại' };
    }
  }

  async refreshTokens(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    this.refreshPromise = (async () => {
      try {
        const res = await firstValueFrom(
          this.http.post<{ accessToken: string; refreshToken: string }>(
            `${environment.apiBaseUrl}/auth/refresh`, { refreshToken }
          )
        );
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        this.scheduleRefresh();
        return true;
      } catch {
        this.logout();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const token = this.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresMs = payload.exp * 1000 - Date.now();
      // Refresh 2 minutes before expiry
      const refreshIn = Math.max(expiresMs - 2 * 60 * 1000, 10000);
      this.refreshTimer = setTimeout(() => this.refreshTokens(), refreshIn);
    } catch { /* ignore */ }
  }

  private clearStorage() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  }

  logout() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.clearStorage();
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}
