import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { FamilyService } from '../../services/family';
import type { Family } from '../../models/family.model';
import { ConfirmDialogComponent } from '../../../../core/ui/confirm-dialog';

@Component({
  selector: 'app-family-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatToolbarModule, MatCardModule, MatDialogModule],
  templateUrl: './family-list.html',
  styleUrl: './family-list.scss',
})
export class FamilyList {
  private readonly familyService = inject(FamilyService);
  private readonly dialog = inject(MatDialog);
  displayedColumns = ['name', 'contactName', 'contactPhone', 'address', 'actions'];
  data: Family[] = [];

  constructor() {
    this.load();
  }

  load() {
    this.familyService.list().subscribe((res) => (this.data = res));
  }

  async delete(id?: string) {
    if (!id) return;
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Xóa dòng họ',
          message: 'Bạn có chắc muốn xóa dòng họ này?',
          confirmText: 'Xóa dòng họ',
          tone: 'warn',
        },
      }).afterClosed(),
    );
    if (!confirmed) return;
    this.familyService.delete(id).subscribe(() => this.load());
  }

}
