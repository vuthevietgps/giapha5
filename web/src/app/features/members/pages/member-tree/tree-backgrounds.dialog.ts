import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { BackgroundService } from '../../../backgrounds/services/background';
import type { BackgroundImage } from '../../../backgrounds/models/background.model';

export interface BackgroundDialogData { selectedId?: string | null }

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
  ],
  template: `
    <h2 mat-dialog-title>Ảnh nền cây gia phả</h2>
    <div mat-dialog-content>
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <button mat-stroked-button color="primary" (click)="fileInput.click()"><mat-icon>upload</mat-icon> Tải ảnh lên</button>
        <input type="file" accept="image/*" #fileInput hidden (change)="onFile($event)">
      </div>
      <div *ngIf="items.length===0" style="opacity:.7">Chưa có ảnh nền nào.</div>
      <div class="grid">
        <div class="item" *ngFor="let it of items" [class.active]="it.id===selectedId" (click)="select(it.id)">
          <img [src]="fileUrl(it)" alt="bg" />
          <div class="name">{{it.name}}</div>
          <div class="actions" (click)="$event.stopPropagation()">
            <button mat-icon-button color="warn" (click)="remove(it)"><mat-icon>delete</mat-icon></button>
          </div>
        </div>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Đóng</button>
      <button mat-flat-button color="primary" (click)="apply()" [disabled]="!selectedId">Áp dụng</button>
    </div>
  `,
  styles: [`
    .grid{display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:12px;}
    .item{position:relative; border:1px solid #ddd; border-radius:8px; overflow:hidden; cursor:pointer}
    .item.active{outline:2px solid #1976d2}
    .item img{width:100%; height:110px; object-fit:cover; display:block}
    .item .name{padding:6px 8px; font-size:12px}
    .item .actions{position:absolute; top:4px; right:4px}
  `]
})
export class TreeBackgroundsDialog{
  private readonly api = inject(BackgroundService);

  items: BackgroundImage[] = [];
  selectedId: string | null = null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: BackgroundDialogData, private ref: MatDialogRef<TreeBackgroundsDialog, string | null>) {
    this.selectedId = data?.selectedId || null;
    this.load();
  }

  load(){ this.api.list().subscribe(list => this.items = list || []); }
  fileUrl(it: BackgroundImage){ return this.api.fileUrl(it.id); }
  select(id: string){ this.selectedId = id; }
  apply(){ this.ref.close(this.selectedId); }

  onFile(ev: Event){
    const input = ev.target as HTMLInputElement; const f = input.files?.[0]; if (!f) return;
    this.api.upload(f).subscribe({ next: _ => this.load() });
    input.value = '';
  }
  remove(it: BackgroundImage){
    if (!confirm(`Xóa '${it.name}'?`)) return;
    // optimistic UI
    const prev = this.items.slice();
    this.items = this.items.filter(x => x.id !== it.id);
    if (this.selectedId === it.id) this.selectedId = null;
    this.api.remove(it.id).subscribe({
      error: _ => { this.items = prev; }
    });
  }
}
