import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-focus-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatSlideToggleModule],
  styles: [`:host{display:flex;align-items:center;gap:8px;flex:0 0 auto;flex-wrap:wrap} button{white-space:nowrap;} @media (max-width:640px){:host{width:100%}}`],
  template: `
    <ng-container *ngIf="focusRootId">
      <span style="padding:4px 8px;border:1px solid #ccc;border-radius:14px;margin-right:8px;display:inline-flex;align-items:center;gap:8px;">
        Đang xem nhánh
        <button mat-stroked-button color="primary" (click)="exitFocus.emit()">Thoát</button>
      </span>
      <mat-slide-toggle [checked]="includeSpousesInFocus" (change)="includeSpousesChange.emit($event.checked)">
        Hiển thị vợ/chồng
      </mat-slide-toggle>
    </ng-container>
  `,
})
export class FocusControlsComponent {
  @Input() focusRootId: string | null = null;
  @Input() includeSpousesInFocus = true;
  @Output() exitFocus = new EventEmitter<void>();
  @Output() includeSpousesChange = new EventEmitter<boolean>();
}
