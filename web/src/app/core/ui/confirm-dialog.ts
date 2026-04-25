import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <div mat-dialog-content class="content">
      <mat-icon class="icon" [class.warn]="data.tone === 'warn'">help_outline</mat-icon>
      <p>{{ data.message }}</p>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">
        {{ data.cancelText || 'Hủy' }}
      </button>
      <button
        mat-flat-button
        type="button"
        [color]="data.tone === 'warn' ? 'warn' : 'primary'"
        (click)="close(true)"
      >
        {{ data.confirmText || 'Xác nhận' }}
      </button>
    </div>
  `,
  styles: [`
    .content {
      min-width: 320px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .content p {
      margin: 0;
      line-height: 1.5;
      color: #333;
    }

    .icon {
      color: #1976d2;
      margin-top: 2px;
      flex: 0 0 auto;
    }

    .icon.warn {
      color: #d32f2f;
    }
  `],
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmDialogData,
    private readonly ref: MatDialogRef<ConfirmDialogComponent, boolean>,
  ) {}

  close(result: boolean) {
    this.ref.close(result);
  }
}
