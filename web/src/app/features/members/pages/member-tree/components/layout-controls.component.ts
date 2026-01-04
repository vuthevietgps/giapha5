import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-layout-controls',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatOptionModule, MatInputModule],
  styles: [`:host{display:flex;align-items:center;gap:8px;flex:0 0 auto;} mat-form-field{margin:0;} .w-compact{width:120px;} .w-narrow{width:100px;}`],
  template: `
    <mat-form-field appearance="outline" class="w-compact">
      <mat-label>Kiểu</mat-label>
      <mat-select [value]="connectionStyle" (selectionChange)="connectionStyleChange.emit($event.value)">
        <mat-option value="diagonal">Chéo</mat-option>
        <mat-option value="hub">Hub</mat-option>
      </mat-select>
    </mat-form-field>
    <mat-form-field appearance="outline" class="w-narrow">
      <mat-label>Lề dưới</mat-label>
      <input matInput type="number" min="0" step="10" [ngModel]="topOffset" (ngModelChange)="topOffsetChange.emit($event)" />
    </mat-form-field>
  `,
})
export class LayoutControlsComponent {
  @Input() connectionStyle: 'diagonal' | 'hub' = 'diagonal';
  @Input() topOffset = 160;
  @Output() connectionStyleChange = new EventEmitter<'diagonal' | 'hub'>();
  @Output() topOffsetChange = new EventEmitter<number>();
}
