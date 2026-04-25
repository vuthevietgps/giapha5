import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

type DecorSlot = 'scroll' | 'dragonLeft' | 'dragonRight';
type DecorAsset = { id: string; name: string; dataUrl: string };

@Component({
  selector: 'app-decor-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule],
  styles: [`:host{display:flex;align-items:center;gap:8px;flex:0 0 auto;flex-wrap:wrap} button{white-space:nowrap;} @media (max-width:640px){:host{width:100%} button{flex:1 1 100%;justify-content:center}}`],
  template: `
    <button mat-stroked-button (click)="openBackgrounds.emit()">
      <mat-icon>image</mat-icon>
      Ảnh nền
    </button>
    <button mat-stroked-button (click)="addText.emit()">
      <mat-icon>text_fields</mat-icon>
      Thêm chữ
    </button>
    <button mat-stroked-button (click)="addScrollText.emit()">
      <mat-icon>text_rotation_angleup</mat-icon>
      Thêm chữ cuốn thư
    </button>
    <button mat-stroked-button (click)="openDecorDialog.emit()">
      <mat-icon>collections</mat-icon>
      Trang trí (cuốn thư / rồng)
    </button>
    <button mat-flat-button color="accent" (click)="openCouplet.emit()">
      <mat-icon>edit</mat-icon>
      Đổi câu đối chữ
    </button>
  `,
})
export class DecorControlsComponent {
  @Output() openBackgrounds = new EventEmitter<void>();
  @Output() addText = new EventEmitter<void>();
  @Output() addScrollText = new EventEmitter<void>();
  @Output() openDecorDialog = new EventEmitter<void>();
  @Output() openCouplet = new EventEmitter<void>();

  @Input() scrollAssets: DecorAsset[] = [];
  @Input() dragonLeftAssets: DecorAsset[] = [];
  @Input() dragonRightAssets: DecorAsset[] = [];
}
