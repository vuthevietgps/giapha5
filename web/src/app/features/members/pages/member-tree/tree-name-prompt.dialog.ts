import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface TreeNamePromptData {
  title: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  confirmText?: string;
  initialValue?: string;
  maxLength?: number;
}

@Component({
  selector: 'app-tree-name-prompt-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <div mat-dialog-content class="content">
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ data.label }}</mat-label>
          <input
            matInput
            formControlName="value"
            [placeholder]="data.placeholder || ''"
            [maxlength]="data.maxLength || 120"
          />
        </mat-form-field>

        <p *ngIf="data.helperText" class="helper">{{ data.helperText }}</p>
      </div>

      <div mat-dialog-actions align="end">
        <button mat-button type="button" (click)="cancel()">Hủy</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ data.confirmText || 'Lưu' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .content { min-width: 360px; }
    .full { width: 100%; }
    .helper { margin: 4px 0 0; color: #666; font-size: 13px; }
  `],
})
export class TreeNamePromptDialog {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    value: [''],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: TreeNamePromptData,
    private readonly ref: MatDialogRef<TreeNamePromptDialog, string | null>,
  ) {
    const maxLength = data.maxLength || 120;
    this.form.controls.value.setValidators([Validators.required, Validators.maxLength(maxLength)]);
    this.form.patchValue({ value: data.initialValue || '' });
    this.form.controls.value.updateValueAndValidity({ emitEvent: false });
  }

  cancel() {
    this.ref.close(null);
  }

  submit() {
    if (this.form.invalid) return;
    this.ref.close((this.form.value.value || '').trim());
  }
}
