import { Component, signal, ViewChild, OnInit, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/services/auth.service';
import { PermissionService } from './core/services/permission.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  @ViewChild('drawer') drawer!: MatSidenav;
  
  protected readonly title = signal('web');
  isMobile = signal(false);
  sidenavMode = signal<'side' | 'over'>('side');
  sidenavOpened = signal(true);
  isTreeCompact = signal(false);
  
  constructor(
    public authService: AuthService,
    public permissionService: PermissionService,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.checkScreenSize();
    this.updateLayoutFlags(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateLayoutFlags(event.urlAfterRedirects);
      }
    });
  }
  
  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }
  
  private checkScreenSize() {
    const isMobileView = window.innerWidth < 960;
    this.isMobile.set(isMobileView);
    if (isMobileView) {
      this.sidenavMode.set('over');
      this.sidenavOpened.set(false);
    } else {
      this.sidenavMode.set('side');
      this.sidenavOpened.set(true);
    }
  }
  
  get isAuthenticated() {
    return this.authService.authenticated();
  }
  
  get currentUser() {
    return this.authService.user();
  }
  
  toggleSidenav() {
    this.drawer?.toggle();
  }
  
  closeSidenavOnMobile() {
    if (this.isMobile()) {
      this.drawer?.close();
    }
  }
  
  logout() {
    this.authService.logout();
  }

  private updateLayoutFlags(url: string) {
    const clean = url.split('?')[0].split('#')[0].split(';')[0];
    this.isTreeCompact.set(clean === '/members/tree' || clean.startsWith('/members/tree'));
  }

  goBackToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
