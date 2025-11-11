import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import type { Member } from '../../models/member.model';

@Component({
  selector: 'app-tree-select-father-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Chọn người cha</h2>
    <div mat-dialog-content>
      <p>Mẹ: <strong>{{data.mother?.fullName}}</strong></p>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        <button mat-stroked-button color="primary" *ngFor="let f of data.fathers" (click)="pick(f)">
          {{f.fullName}}
          <span style="opacity:.7; margin-left:8px">{{f.dob | date:'yyyy-MM-dd'}}</span>
        </button>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">Hủy</button>
    </div>
  `,
})
export class TreeSelectFatherDialog {
  readonly data: { mother: Member; fathers: Member[] } = inject(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TreeSelectFatherDialog, Member | null>);

  pick(f: Member){ this.ref.close(f); }
  close(){ this.ref.close(null); }
}
