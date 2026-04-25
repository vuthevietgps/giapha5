import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../core/ui/confirm-dialog';

export type DecorSlot = 'scroll' | 'dragonLeft' | 'dragonRight';
export interface DecorAsset { id: string; name: string; dataUrl: string }
export interface DecorDialogData {
  assets: Record<DecorSlot, DecorAsset[]>;
}
export interface DecorDialogResult {
  assets: Record<DecorSlot, DecorAsset[]>;
  addInstance?: { assetId: string; slot: DecorSlot };
}

@Component({
  selector: 'app-tree-decor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Quản lý thư viện trang trí</h2>
    <div mat-dialog-content>
      <div class="slot-bar">
        <button mat-stroked-button *ngFor="let s of slots" [color]="activeSlot===s ? 'primary' : undefined" (click)="setSlot(s)">
          <mat-icon>{{ iconFor(s) }}</mat-icon>
          {{ labelFor(s) }}
        </button>
        <span class="spacer"></span>
        <button mat-stroked-button color="primary" (click)="fileInput.click()">
          <mat-icon>upload</mat-icon>
          Tải ảnh {{ labelFor(activeSlot).toLowerCase() }}
        </button>
        <input type="file" #fileInput hidden accept="image/*" (change)="onFile($event)">
      </div>

      <div *ngIf="items.length===0" class="empty">Chưa có ảnh {{ labelFor(activeSlot).toLowerCase() }} nào.</div>
      <div class="grid" *ngIf="items.length">
        <div class="item" *ngFor="let it of items" (click)="addToCanvas(it)">
          <img [src]="it.dataUrl" [alt]="it.name" />
          <div class="name">{{it.name}}</div>
          <div class="actions" (click)="$event.stopPropagation()">
            <button mat-icon-button color="warn" (click)="remove(it)" matTooltip="Xóa">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
          <div class="overlay-hint">Nhấp để thêm vào canvas</div>
        </div>
      </div>
      <p class="hint"><mat-icon>info</mat-icon> Chọn một ảnh để thêm trang trí vào canvas. Có thể thêm nhiều lần.</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Đóng</button>
      <button mat-flat-button color="primary" (click)="apply()" [disabled]="!hasChanges">Lưu</button>
    </div>
  `,
  styles: [`
    .slot-bar{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}
    .spacer{flex:1}
    .grid{display:grid;grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:12px;}
    .item{position:relative; border:1px solid #ddd; border-radius:8px; overflow:hidden; background:#fff; cursor:pointer;}
    .item img{width:100%; height:120px; object-fit:cover; display:block}
    .item .name{padding:6px 8px; font-size:12px; text-overflow:ellipsis; white-space:nowrap; overflow:hidden}
    .item .actions{position:absolute; top:4px; right:4px; display:flex; gap:4px;}
    .overlay-hint{position:absolute; left:0; right:0; bottom:0; padding:6px 8px; font-size:12px; background:rgba(0,0,0,0.35); color:#fff; text-align:center; pointer-events:none;}
    .empty{opacity:.7}
    .hint{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;opacity:0.8}
    .hint mat-icon{font-size:18px;width:18px;height:18px}
  `]
})
export class TreeDecorDialog {
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly slots: DecorSlot[] = ['scroll', 'dragonLeft', 'dragonRight'];
  activeSlot: DecorSlot = 'scroll';
  assets: Record<DecorSlot, DecorAsset[]> = { scroll: [], dragonLeft: [], dragonRight: [] };
  hasChanges = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DecorDialogData, private ref: MatDialogRef<TreeDecorDialog, DecorDialogResult | undefined>) {
    this.assets = this.cloneAssets(data.assets);
  }

  get items(): DecorAsset[]{ return this.assets[this.activeSlot] || []; }

  setSlot(slot: DecorSlot){ this.activeSlot = slot; }
  labelFor(slot: DecorSlot): string {
    return slot === 'scroll' ? 'Cuốn thư' : (slot === 'dragonLeft' ? 'Rồng trái' : 'Rồng phải');
  }
  iconFor(slot: DecorSlot): string {
    if (slot === 'scroll') return 'collections_bookmark';
    return 'pets';
  }

  async onFile(ev: Event){
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      const dataUrl = await this.compressImage(f);
      const asset: DecorAsset = { id: `${this.activeSlot}-${Date.now()}`, name: f.name, dataUrl };
      this.assets[this.activeSlot] = [asset, ...this.items].slice(0, 8);
      this.hasChanges = true;
    } catch (err) {
      console.error(err);
      this.snack.open('Không thể đọc ảnh. Vui lòng thử lại.', 'Đóng', { duration: 2200 });
    }
  }

  addToCanvas(asset: DecorAsset){
    this.hasChanges = true;
    this.ref.close({ assets: this.assets, addInstance: { assetId: asset.id, slot: this.activeSlot } });
  }

  async remove(it: DecorAsset){
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Xóa trang trí',
          message: `Bạn có chắc muốn xóa "${it.name}" khỏi thư viện?`,
          confirmText: 'Xóa ảnh',
          tone: 'warn',
        },
      }).afterClosed(),
    );
    if (!confirmed) return;

    this.assets[this.activeSlot] = this.items.filter(x => x.id !== it.id);
    this.hasChanges = true;
  }

  apply(){
    this.ref.close({ assets: this.assets });
  }

  private cloneAssets(source: Record<DecorSlot, DecorAsset[]>): Record<DecorSlot, DecorAsset[]> {
    return {
      scroll: (source?.scroll || []).map(it => ({ ...it })),
      dragonLeft: (source?.dragonLeft || []).map(it => ({ ...it })),
      dragonRight: (source?.dragonRight || []).map(it => ({ ...it })),
    };
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const isPNG = file.type === 'image/png';

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxSize = 1200;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (isPNG && ctx) {
          ctx.clearRect(0, 0, width, height);
        }

        ctx?.drawImage(img, 0, 0, width, height);

        if (isPNG) {
          let quality = 0.9;
          let dataUrl = canvas.toDataURL('image/png', quality);

          while (dataUrl.length > 300000 && quality > 0.6) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/png', quality);
          }
          resolve(dataUrl);
        } else {
          let quality = 0.7;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          while (dataUrl.length > 250000 && quality > 0.3) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        }
      };

      img.onerror = () => reject(new Error('Khong the doc anh'));

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Khong the doc file'));
      reader.readAsDataURL(file);
    });
  }
}
