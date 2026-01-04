import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-export-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  styles: [`:host{display:flex;align-items:center;gap:8px;flex:0 0 auto;} button{white-space:nowrap;}`],
  template: `
    <button mat-stroked-button (click)="export.emit({ size: 'ACTUAL', orientation: 'landscape' })">
      <mat-icon>download</mat-icon>
      Tải xuống
    </button>
    <button mat-button (click)="reload.emit()">
      <mat-icon>refresh</mat-icon>
      Tải lại
    </button>
  `,
})
export class ExportControlsComponent {
  @Output() export = new EventEmitter<{ size: 'A4' | 'A3' | 'HQ2x1' | 'ACTUAL' | 'ACTUAL_600'; orientation: 'portrait' | 'landscape' }>();
  @Output() reload = new EventEmitter<void>();
}
