import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';

export interface AddPartnerData { defaultRole: 'wife' | 'husband'; }
export interface AddPartnerResult { fullName: string; gender: 'male' | 'female'; }

@Component({
  selector: 'app-tree-add-partner-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Thêm hôn phối</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="content">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Họ tên</mat-label>
        <input matInput formControlName="fullName" />
      </mat-form-field>

      <label class="label">Vai trò</label>
      <mat-radio-group formControlName="role" class="row">
        <mat-radio-button value="wife">Vợ</mat-radio-button>
        <mat-radio-button value="husband">Chồng</mat-radio-button>
      </mat-radio-group>
    </form>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Hủy</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">Thêm</button>
    </div>
  `,
  styles: [`
    .content{display:flex;flex-direction:column;gap:12px;min-width:420px}
    .row{display:flex;gap:16px}
    .full{width:100%}
    .label{font-size:12px;color:#666}
  `]
})
export class TreeAddPartnerDialog {
  private readonly fb = inject(FormBuilder);
  form = this.fb.group({
    fullName: ['', Validators.required],
    role: ['wife' as 'wife' | 'husband', Validators.required],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) data: AddPartnerData,
    private ref: MatDialogRef<TreeAddPartnerDialog, AddPartnerResult>,
  ){
    if (data?.defaultRole) this.form.patchValue({ role: data.defaultRole });
  }

  submit(){
    if (this.form.invalid) return;
    const v = this.form.value;
    const gender: 'male' | 'female' = v.role === 'wife' ? 'female' : 'male';
    this.ref.close({ fullName: v.fullName || '', gender });
  }
}
