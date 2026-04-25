import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="not-found-page">
      <mat-card class="not-found-card">
        <mat-icon class="big-icon">search_off</mat-icon>
        <h1>404</h1>
        <h2>Không tìm thấy trang</h2>
        <p>Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.</p>
        <div class="actions">
          <button mat-flat-button color="primary" routerLink="/">
            <mat-icon>home</mat-icon>
            Về trang chủ
          </button>
          <button mat-stroked-button routerLink="/dashboard">
            <mat-icon>dashboard</mat-icon>
            Dashboard
          </button>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .not-found-page {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .not-found-card {
      max-width: 480px;
      width: 100%;
      text-align: center;
      padding: 3rem 2rem;
      border-radius: 16px;
    }
    .big-icon { font-size: 80px; width: 80px; height: 80px; color: #bdbdbd; }
    h1 { font-size: 4rem; margin: 0.5rem 0 0; color: #1976d2; }
    h2 { margin: 0.25rem 0 1rem; color: #333; }
    p { color: #666; margin-bottom: 2rem; }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
  `]
})
export class NotFoundPage {}
