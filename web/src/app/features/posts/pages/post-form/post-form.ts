import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-post-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './post-form.html',
  styleUrl: './post-form.scss',
})
export class PostFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<PostFormDialog>);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    content: ['', [Validators.required]],
  });

  save() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }

  cancel() {
    this.dialogRef.close();
  }
}
