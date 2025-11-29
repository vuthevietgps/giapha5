import { Component, signal, ViewChild, HostListener } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule, NgIf, AsyncPipe } from '@angular/common';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonModule as MatFabModule } from '@angular/material/button';
import { AuthService, AuthUser } from './features/auth/services/auth.service';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { LoginPage } from './features/auth/pages/login/login.page';
import { Router } from '@angular/router';
import { hasPermission } from './core/permissions';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  @ViewChild('drawer') drawer!: MatDrawer;
  
  protected readonly title = signal('web');

  collapsed = (localStorage.getItem('sidebarCollapsed') === '1');
  isMobile = false;
  sidenavMode: 'side' | 'over' = 'side';
  sidenavOpened = true;

  readonly currentUser$: Observable<AuthUser | null>;
  readonly currentYear = new Date().getFullYear();

  constructor(private auth: AuthService, private dialog: MatDialog, private router: Router){
    this.currentUser$ = this.auth.currentUser$;
    this.checkScreenSize();

    // Navigate to default internal page when already authenticated on home route
    const sub = this.currentUser$.subscribe(user => {
      if (user && this.router.url === '/') {
        this.router.navigateByUrl('/members/tree');
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    this.sidenavMode = this.isMobile ? 'over' : 'side';
    
    if (this.isMobile) {
      this.sidenavOpened = false; // Close on mobile by default
    } else {
      this.sidenavOpened = !this.collapsed;
    }
  }

  toggleSidebar(){
    if (this.isMobile) {
      // On mobile, toggle drawer
      this.drawer?.toggle();
    } else {
      // On desktop, toggle collapse
      this.collapsed = !this.collapsed;
      localStorage.setItem('sidebarCollapsed', this.collapsed ? '1' : '0');
      this.sidenavOpened = !this.collapsed;
    }
  }

  closeSidebarOnMobile() {
    if (this.isMobile && this.drawer) {
      this.drawer.close();
    }
  }

  logout(){
    this.auth.logout();
  }

  openLogin(){
    const ref = this.dialog.open(LoginPage, { width: '480px', autoFocus: false });
    ref.afterClosed().subscribe(() => {
      const u = (this.auth.currentUser$ as any).value as AuthUser | null;
      if (u && this.router.url === '/') {
        this.router.navigateByUrl('/members/tree');
      }
    });
  }

  hasPermission(permission: string) {
    const user = (this.auth.currentUser$ as any).value as AuthUser | null;
    return hasPermission(user, permission as any);
  }
}
