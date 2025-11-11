import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PositionService } from '../../services/position';
import type { Position } from '../../models/position.model';

@Component({
  selector: 'app-position-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
  ],
  templateUrl: './position-form.html',
  styleUrl: './position-form.scss',
})
export class PositionForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly positionService = inject(PositionService);

  id: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    sortOrder: [0, [Validators.min(0)]],
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.positionService.get(this.id).subscribe((p: Position) => {
        this.form.patchValue({
          name: p.name,
          description: p.description,
          sortOrder: p.sortOrder ?? 0,
        });
      });
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value as Position;
    if (this.id) {
      this.positionService.update(this.id, value).subscribe(() => {
        this.snack.open('Cập nhật chức vụ thành công', 'Đóng', { duration: 2000 });
        this.router.navigate(['/positions']);
      });
    } else {
      this.positionService.create(value).subscribe(() => {
        this.snack.open('Tạo chức vụ thành công', 'Đóng', { duration: 2000 });
        this.router.navigate(['/positions']);
      });
    }
  }
}
