import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

export interface TextDialogData {
  item?: { text: string; color: string; fontSize: number; fontFamily: string; curvature?: number } | null;
  fonts: string[];
  allowCurvature?: boolean;
}

export interface TextDialogResult {
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  curvature: number;
}

@Component({
  selector: 'app-tree-text-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Chỉnh sửa chữ' : 'Thêm chữ' }}</h2>
    <div mat-dialog-content class="form">
      <mat-form-field appearance="outline">
        <mat-label>Nội dung</mat-label>
        <textarea matInput rows="3" [(ngModel)]="text"></textarea>
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Kích thước (px)</mat-label>
          <input matInput type="number" min="8" max="200" [(ngModel)]="fontSize">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Kiểu chữ</mat-label>
          <input matInput list="fontList" [(ngModel)]="fontFamily">
          <datalist id="fontList">
            <option *ngFor="let f of fonts" [value]="f"></option>
          </datalist>
        </mat-form-field>
      </div>

      <div class="row">
        <label class="color-field">
          <span>Màu chữ</span>
          <input type="color" [(ngModel)]="color">
        </label>
      </div>

      <div class="row" *ngIf="allowCurvature">
        <mat-form-field appearance="outline">
          <mat-label>Độ cong của dòng (độ tổng)</mat-label>
          <input matInput type="number" min="-60" max="60" step="1" [(ngModel)]="curvature">
        </mat-form-field>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Hủy</button>
      <button mat-flat-button color="primary" (click)="apply()" [disabled]="!canSave()">Lưu</button>
    </div>
  `,
  styles: [`
    .form{display:flex;flex-direction:column;gap:12px;min-width:420px}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .row mat-form-field{flex:1;min-width:160px}
    .color-field{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;width:fit-content;background:#fafafa}
    textarea{resize:vertical;min-height:80px}
  `]
})
export class TreeTextDialog {
  text = '';
  color = '#000000';
  fontSize = 32;
  fontFamily = 'Arial';
  fonts: string[] = [];
  curvature = 0;
  allowCurvature = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: TextDialogData, private ref: MatDialogRef<TreeTextDialog, TextDialogResult | undefined>) {
    this.text = data?.item?.text ?? '';
    this.color = data?.item?.color ?? '#000000';
    this.fontSize = data?.item?.fontSize ?? 32;
    this.fontFamily = data?.item?.fontFamily ?? 'Arial';
    this.curvature = data?.item?.curvature ?? 0;
    this.fonts = data?.fonts || [];
    this.allowCurvature = !!data?.allowCurvature;
    if (this.allowCurvature && !data?.item) {
      this.curvature = 20; // cong vòng lên nhẹ mặc định
    }
  }

  canSave(): boolean {
    return !!this.text.trim() && this.fontSize >= 8 && this.fontSize <= 200;
  }

  apply(){
    if (!this.canSave()) return;
    this.ref.close({ text: this.text.trim(), color: this.color, fontSize: this.fontSize, fontFamily: this.fontFamily, curvature: this.curvature });
  }
}