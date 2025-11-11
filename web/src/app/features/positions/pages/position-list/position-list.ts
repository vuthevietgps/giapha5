import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PositionService } from '../../services/position';
import type { Position } from '../../models/position.model';

@Component({
  selector: 'app-position-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatToolbarModule, MatCardModule, MatSnackBarModule],
  templateUrl: './position-list.html',
  styleUrl: './position-list.scss',
})
export class PositionList {
  private readonly positionService = inject(PositionService);
  private readonly snack = inject(MatSnackBar);

  displayedColumns = ['sortOrder', 'name', 'description', 'actions'];
  data: Position[] = [];

  constructor() {
    this.load();
  }

  load() {
    this.positionService.list().subscribe((res) => (this.data = res));
  }

  delete(id?: string) {
    if (!id) return;
    if (confirm('Bạn có chắc chắn muốn xóa chức vụ này?')) {
      this.positionService.delete(id).subscribe(() => {
        this.snack.open('Đã xóa chức vụ', 'Đóng', { duration: 1500 });
        this.load();
      });
    }
  }
}
