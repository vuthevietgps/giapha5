import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserRole } from '../../features/users/models/user.model';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  managedFamilies?: string[];
  assignedFamily?: string;
  familyId?: string; // Deprecated, use assignedFamily instead
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal<boolean>(false);

  private http = inject(HttpClient);
  
  constructor(private router: Router) {
    // Kiểm tra localStorage khi khởi động
    this.loadUserFromStorage();
  }

  get user() {
    return this.currentUser.asReadonly();
  }

  get authenticated() {
    return this.isAuthenticated.asReadonly();
  }

  private loadUserFromStorage() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log('[AuthService] Loaded user from storage:', user);
        
        // Kiểm tra xem user có role không, nếu không thì xóa và bắt login lại
        if (!user.role) {
          console.warn('[AuthService] User missing role field, clearing storage');
          localStorage.removeItem('currentUser');
          return;
        }
        
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch (e) {
        console.error('Failed to parse stored user', e);
        this.logout();
      }
    }
  }

  login(username: string, password: string): Promise<boolean> {
    // TODO: Implement actual password verification
    // For now, just fetch user by email and set as logged in
    return new Promise((resolve) => {
      this.http.get<any[]>(`${environment.apiBaseUrl}/users`).subscribe({
        next: (users) => {
          // Tìm user theo email hoặc username
          const foundUser = users.find(u => 
            u.email === username || 
            u.fullName?.toLowerCase() === username.toLowerCase()
          );

          if (foundUser) {
            const user: User = {
              id: foundUser.id,
              username: foundUser.fullName || foundUser.email,
              email: foundUser.email,
              role: foundUser.role || 'GIAM_DOC',
              managedFamilies: foundUser.managedFamilies,
              assignedFamily: foundUser.assignedFamily,
              familyId: foundUser.assignedFamily
            };

            console.log('[AuthService] Login successful:', user);
            
            this.currentUser.set(user);
            this.isAuthenticated.set(true);
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            resolve(true);
          } else {
            // Fallback to mock login if user not found
            let role: UserRole = 'GIAM_DOC';
            let managedFamilies: string[] = [];
            let assignedFamily: string | undefined = undefined;

            // Mock: username chứa role name
            if (username.toLowerCase().includes('quanly') || username.toLowerCase().includes('manager')) {
              role = 'QUAN_LY';
              managedFamilies = ['family-1', 'family-2'];
            } else if (username.toLowerCase().includes('nhanvien') || username.toLowerCase().includes('staff')) {
              role = 'NHAN_VIEN';
              assignedFamily = 'family-1';
            } else if (username.toLowerCase().includes('truongho') || username.toLowerCase().includes('head')) {
              role = 'TRUONG_HO';
              assignedFamily = 'family-1';
            }

            const mockUser: User = {
              id: '1',
              username: username,
              email: `${username}@example.com`,
              role: role,
              managedFamilies: managedFamilies.length > 0 ? managedFamilies : undefined,
              assignedFamily: assignedFamily,
              familyId: assignedFamily || 'family-1'
            };

            console.log('[AuthService] Login with mock user (not found in DB):', mockUser);
            
            this.currentUser.set(mockUser);
            this.isAuthenticated.set(true);
            localStorage.setItem('currentUser', JSON.stringify(mockUser));
            
            resolve(true);
          }
        },
        error: (err) => {
          console.error('[AuthService] Failed to fetch users:', err);
          resolve(false);
        }
      });
    });
  }

  logout() {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('currentUser');
    console.log('[AuthService] User logged out, localStorage cleared');
    this.router.navigate(['/']);
  }

  // Phương thức để component có thể subscribe
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}
