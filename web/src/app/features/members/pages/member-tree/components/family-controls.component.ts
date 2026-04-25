import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import type { Family } from '../../../../families/models/family.model';

@Component({
  selector: 'app-family-controls',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatOptionModule, MatButtonModule, MatIconModule],
  styles: [`:host{display:flex;align-items:center;gap:8px;flex:0 0 auto;flex-wrap:wrap} mat-form-field{width:220px;max-width:100%;margin:0;} button{white-space:nowrap;} @media (max-width:640px){:host{width:100%} mat-form-field{width:100%} button{width:100%;justify-content:center}}`],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>Dòng họ</mat-label>
      <mat-select [value]="selectedFamilyId" (selectionChange)="familyChange.emit($event.value)">
        <mat-option *ngFor="let f of families" [value]="f.id">{{ f.name }}</mat-option>
      </mat-select>
    </mat-form-field>
    <button mat-stroked-button color="primary" (click)="createRoot.emit()">
      <mat-icon>add</mat-icon>
      Tạo đời đầu
    </button>
  `,
})
export class FamilyControlsComponent {
  @Input() families: Family[] = [];
  @Input() selectedFamilyId: string | null = null;
  @Output() familyChange = new EventEmitter<string | null>();
  @Output() createRoot = new EventEmitter<void>();
}
