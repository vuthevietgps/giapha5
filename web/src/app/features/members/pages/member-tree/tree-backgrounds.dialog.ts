import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { BackgroundService } from '../../../backgrounds/services/background';
import type { BackgroundImage } from '../../../backgrounds/models/background.model';
import { ConfirmDialogComponent } from '../../../../core/ui/confirm-dialog';

export interface BackgroundDialogData {
  selectedId?: string | null;
  familyId?: string | null;
}

@Component({
  selector: 'app-tree-backgrounds-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Ảnh nền cây gia phả</h2>
    <div mat-dialog-content>
      <div class="toolbar">
        <button
          mat-stroked-button
          color="primary"
          type="button"
          (click)="fileInput.click()"
          [disabled]="!familyId"
        >
          <mat-icon>upload</mat-icon>
          Tải ảnh lên
        </button>
        <input type="file" accept="image/*" #fileInput hidden (change)="onFile($event)">
        <span class="hint" *ngIf="!familyId">Hãy chọn dòng họ trước khi tải ảnh nền.</span>
      </div>

      <div *ngIf="items.length === 0" class="empty">Chưa có ảnh nền nào cho dòng họ này.</div>
      <div class="grid">
        <div class="item" *ngFor="let it of items" [class.active]="it.id === selectedId" (click)="select(it.id)">
          <img [src]="fileUrl(it)" alt="Ảnh nền" />
          <div class="name">{{ it.name }}</div>
          <div class="actions" (click)="$event.stopPropagation()">
            <button mat-icon-button color="warn" type="button" (click)="remove(it)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Đóng</button>
      <button mat-flat-button color="primary" type="button" (click)="apply()" [disabled]="!selectedId">Áp dụng</button>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .hint {
      color: #666;
      font-size: 13px;
    }

    .empty {
      opacity: 0.7;
      margin-bottom: 12px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .item {
      position: relative;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      background: #fff;
    }

    .item.active {
      outline: 2px solid #1976d2;
    }

    .item img {
      width: 100%;
      height: 110px;
      object-fit: cover;
      display: block;
    }

    .item .name {
      padding: 6px 8px;
      font-size: 12px;
    }

    .item .actions {
      position: absolute;
      top: 4px;
      right: 4px;
    }
  `],
})
export class TreeBackgroundsDialog {
  private readonly api = inject(BackgroundService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly familyId: string | null;
  items: BackgroundImage[] = [];
  selectedId: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: BackgroundDialogData,
    private readonly ref: MatDialogRef<TreeBackgroundsDialog, string | null>,
  ) {
    this.familyId = data?.familyId || null;
    this.selectedId = data?.selectedId || null;
    this.load();
  }

  load() {
    this.api.list(this.familyId).subscribe({
      next: (list) => {
        this.items = list || [];
        if (this.selectedId && !this.items.some((item) => item.id === this.selectedId)) {
          this.selectedId = null;
        }
      },
      error: (err) => {
        this.items = [];
        this.snack.open(err?.error?.message || 'Không tải được ảnh nền', 'Đóng', { duration: 2500 });
      },
    });
  }

  fileUrl(it: BackgroundImage) {
    return this.api.fileUrl(it.id);
  }

  select(id: string) {
    this.selectedId = id;
  }

  apply() {
    this.ref.close(this.selectedId);
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.familyId) return;

    this.api.upload(file, undefined, this.familyId).subscribe({
      next: () => {
        this.snack.open('Đã tải ảnh nền', 'Đóng', { duration: 1800 });
        this.load();
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Không tải được ảnh nền', 'Đóng', { duration: 2500 });
      },
    });
  }

  async remove(it: BackgroundImage) {
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Xóa ảnh nền',
          message: `Bạn có chắc muốn xóa "${it.name}"?`,
          confirmText: 'Xóa ảnh',
          tone: 'warn',
        },
      }).afterClosed(),
    );
    if (!confirmed) return;

    const previousItems = this.items.slice();
    this.items = this.items.filter((item) => item.id !== it.id);
    if (this.selectedId === it.id) {
      this.selectedId = null;
    }

    this.api.remove(it.id).subscribe({
      next: () => {
        this.snack.open('Đã xóa ảnh nền', 'Đóng', { duration: 1800 });
      },
      error: (err) => {
        this.items = previousItems;
        this.snack.open(err?.error?.message || 'Xóa ảnh nền thất bại', 'Đóng', { duration: 2500 });
      },
    });
  }
}
