import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { FamilyService } from '../../services/family';
import type { Family } from '../../models/family.model';

@Component({
  selector: 'app-family-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatToolbarModule, MatCardModule],
  templateUrl: './family-list.html',
  styleUrl: './family-list.scss',
})
export class FamilyList {
  private readonly familyService = inject(FamilyService);
  displayedColumns = ['name', 'contactName', 'contactPhone', 'address', 'actions'];
  data: Family[] = [];

  constructor() {
    this.load();
  }

  load() {
    this.familyService.list().subscribe((res) => (this.data = res));
  }

  delete(id?: string) {
    if (!id) return;
    if (confirm('Bạn có chắc chắn muốn xóa dòng họ này?')) {
      this.familyService.delete(id).subscribe(() => this.load());
    }
  }

}
