import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-export-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  styles: [`:host{display:flex;align-items:center;gap:8px;flex:0 0 auto;flex-wrap:wrap} button{white-space:nowrap;} @media (max-width:640px){:host{width:100%} button{flex:1 1 100%;justify-content:center}}`],
  template: `
    <button mat-stroked-button (click)="export.emit(4)">
      <mat-icon>download</mat-icon>
      Tải xuống (4x HD)
    </button>
    <button mat-button (click)="reload.emit()">
      <mat-icon>refresh</mat-icon>
      Tải lại
    </button>
  `,
})
export class ExportControlsComponent {
  @Output() export = new EventEmitter<number>();
  @Output() reload = new EventEmitter<void>();
}
