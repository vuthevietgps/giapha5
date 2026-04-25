import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { PositionService } from '../../services/position';
import type { Position } from '../../models/position.model';
import { ConfirmDialogComponent } from '../../../../core/ui/confirm-dialog';

@Component({
  selector: 'app-position-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatToolbarModule, MatCardModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './position-list.html',
  styleUrl: './position-list.scss',
})
export class PositionList {
  private readonly positionService = inject(PositionService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  displayedColumns = ['sortOrder', 'name', 'description', 'actions'];
  data: Position[] = [];

  constructor() {
    this.load();
  }

  load() {
    this.positionService.list().subscribe((res) => (this.data = res));
  }

  async delete(id?: string) {
    if (!id) return;
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Xóa chức vụ',
          message: 'Bạn có chắc muốn xóa chức vụ này?',
          confirmText: 'Xóa chức vụ',
          tone: 'warn',
        },
      }).afterClosed(),
    );
    if (!confirmed) return;
    this.positionService.delete(id).subscribe(() => {
      this.snack.open('Đã xóa chức vụ', 'Đóng', { duration: 1500 });
      this.load();
    });
  }
}
