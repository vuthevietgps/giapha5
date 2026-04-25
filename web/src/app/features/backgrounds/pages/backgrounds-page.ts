import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { BackgroundService } from '../../backgrounds/services/background';
import type { BackgroundImage } from '../../backgrounds/models/background.model';
import { FamilyService } from '../../families/services/family';
import type { Family } from '../../families/models/family.model';
import { ConfirmDialogComponent } from '../../../core/ui/confirm-dialog';

@Component({
  selector: 'app-backgrounds-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './backgrounds-page.html',
  styles: [`
    .shell{padding:16px}
    .toolbar{display:flex; gap:12px; align-items:center; margin-bottom:12px; flex-wrap:wrap}
    .family-field{min-width:260px}
    .grid{display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:12px}
    .item{position:relative; border:1px solid #ddd; border-radius:8px; overflow:hidden; background:#fff}
    .item img{width:100%; height:140px; object-fit:cover}
    .item .name{padding:8px}
    .item .actions{position:absolute; top:6px; right:6px}
    .hint{opacity:.7}
  `]
})
export class BackgroundsPage {
  private readonly api = inject(BackgroundService);
  private readonly familiesApi = inject(FamilyService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  families: Family[] = [];
  items: BackgroundImage[] = [];
  selectedFamilyId: string | null = null;

  ngOnInit(){
    this.loadFamilies();
  }

  loadFamilies() {
    this.familiesApi.list().subscribe({
      next: (families) => {
        this.families = families || [];
        if (!this.selectedFamilyId && this.families.length) {
          this.selectedFamilyId = this.families[0].id || null;
        }
        this.load();
      },
      error: (err) => {
        this.families = [];
        this.items = [];
        this.snack.open(err?.error?.message || 'Không tải được danh sách dòng họ', 'Đóng', { duration: 2500 });
      },
    });
  }

  load(){
    if (!this.selectedFamilyId) {
      this.items = [];
      return;
    }

    this.api.list(this.selectedFamilyId).subscribe({
      next: (list) => this.items = list || [],
      error: (err) => {
        this.items = [];
        this.snack.open(err?.error?.message || 'Không tải được ảnh nền', 'Đóng', { duration: 2500 });
      },
    });
  }

  onFamilyChange(familyId: string | null) {
    this.selectedFamilyId = familyId;
    this.load();
  }

  fileUrl(it: BackgroundImage){
    return this.api.fileUrl(it.id);
  }

  onFile(ev: Event){
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!this.selectedFamilyId) {
      this.snack.open('Hãy chọn dòng họ trước khi tải ảnh nền', 'Đóng', { duration: 2200 });
      return;
    }

    this.api.upload(file, undefined, this.selectedFamilyId).subscribe({
      next: () => {
        this.snack.open('Đã tải ảnh nền', 'Đóng', { duration: 1800 });
        this.load();
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Tải ảnh nền thất bại', 'Đóng', { duration: 2500 });
      },
    });
  }

  async remove(it: BackgroundImage){
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
    this.items = this.items.filter(x => x.id !== it.id);
    this.api.remove(it.id).subscribe({
      next: () => this.snack.open('Đã xóa ảnh nền', 'Đóng', { duration: 1800 }),
      error: (err) => {
        this.items = previousItems;
        this.snack.open(err?.error?.message || 'Xóa ảnh nền thất bại', 'Đóng', { duration: 2500 });
      }
    });
  }
}
