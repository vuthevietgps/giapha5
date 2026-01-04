import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface CoupletData {
  leftText: string;
  rightText: string;
  fontSize: number; // rem unit in preview
  fontFamily: string;
  color: string;
}

export interface FontItem {
  name: string;
  source: 'builtin' | 'custom';
  dataUrl?: string;
}

export interface CoupletDialogResult {
  couplet: CoupletData;
  customFonts: FontItem[];
}

@Component({
  selector: 'app-couplet-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
  <h2 mat-dialog-title>Đổi câu đối</h2>
  <div mat-dialog-content class="content">
    <mat-form-field appearance="outline" class="full">
      <mat-label>Câu đối trái</mat-label>
      <input matInput [(ngModel)]="model.leftText" placeholder="Nhập câu đối trái" />
    </mat-form-field>

    <mat-form-field appearance="outline" class="full">
      <mat-label>Câu đối phải</mat-label>
      <input matInput [(ngModel)]="model.rightText" placeholder="Nhập câu đối phải" />
    </mat-form-field>

    <div class="row">
      <div class="preview" [style.fontSize.rem]="model.fontSize" [style.fontFamily]="model.fontFamily" [style.color]="model.color">
        <div class="sample" *ngFor="let w of splitWords(model.leftText || 'Tả đối')">{{ w }}</div>
        <div class="sample" *ngFor="let w of splitWords(model.rightText || 'Hữu đối')">{{ w }}</div>
      </div>
      <div class="controls">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Font chữ</mat-label>
          <mat-select [(value)]="model.fontFamily">
            <mat-option *ngFor="let f of fonts" [value]="f.name">{{ f.name }} <span *ngIf="f.source==='custom'">(custom)</span></mat-option>
          </mat-select>
        </mat-form-field>

        <div class="upload">
          <button mat-stroked-button color="primary" (click)="fontInput.click()">Tải font (ttf/otf)</button>
          <input type="file" #fontInput accept=".ttf,.otf" hidden (change)="onFontFile($event)">
          <div class="hint">Chọn file .ttf/.otf từ thư mục font đã giải nén (server/font) để áp dụng thực tế cho font đã chọn.</div>
        </div>

        <label class="label">Màu chữ</label>
        <input type="color" [(ngModel)]="model.color" />
      </div>
    </div>
  </div>
  <div mat-dialog-actions align="end">
    <button mat-button (click)="dialogRef.close()">Hủy</button>
    <button mat-flat-button color="primary" (click)="save()">Lưu thay đổi</button>
  </div>
  `,
  styles: [`
    .content{display:flex;flex-direction:column;gap:12px;min-width:420px}
    .full{width:100%}
    .row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
    .preview{min-width:180px;border:1px dashed #d9d9d9;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;justify-content:center;align-items:center;text-align:center;line-height:1.1;letter-spacing:0;min-height:200px;background:#fffdf7;font-weight:700}
    .sample{padding:2px 4px;white-space:nowrap}
    .controls{flex:1;min-width:220px;display:flex;flex-direction:column;gap:10px}
    .label{font-size:12px;color:#555}
    .upload{display:flex;flex-direction:column;gap:6px}
    .hint{font-size:12px;color:#666}
  `]
})
export class CoupletDialog {
  model: CoupletData;
  fonts: FontItem[] = [];
  customFonts: FontItem[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) data: { couplet: CoupletData; fonts: FontItem[]; customFonts: FontItem[] },
    public dialogRef: MatDialogRef<CoupletDialog>
  ){
    this.model = { ...data.couplet };
    this.fonts = data.fonts || [];
    this.customFonts = data.customFonts || [];
  }

  splitWords(text: string): string[]{
    return (text || '').split(/\s+/).filter(Boolean);
  }

  async onFontFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const dataUrl = await this.readFileAsDataUrl(file);
      const name = file.name.replace(/\.[^/.]+$/, '');
      const item: FontItem = { name, source: 'custom', dataUrl };
      this.customFonts = [item, ...this.customFonts.filter(f => f.name !== name)].slice(0, 20);
      this.fonts = [item, ...this.fonts.filter(f => !(f.source === 'custom' && f.name === name))];
      this.model.fontFamily = name;
      this.registerFontFace(name, dataUrl);
    } catch (err) {
      console.error(err);
      alert('Không đọc được font. Hãy giải nén file .ttf/.otf và chọn lại.');
    }
  }

  save(): void {
    const result: CoupletDialogResult = { couplet: this.model, customFonts: this.customFonts };
    this.dialogRef.close(result);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private registerFontFace(name: string, dataUrl: string): void {
    if (!name || !dataUrl) return;
    const id = `dialog-font-${name.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face { font-family: '${name}'; src: url(${dataUrl}) format('opentype'); font-display: swap; }`;
    document.head.appendChild(style);
  }
}
