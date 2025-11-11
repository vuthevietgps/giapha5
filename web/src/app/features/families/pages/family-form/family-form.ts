import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FamilyService } from '../../services/family';
import type { Family } from '../../models/family.model';

@Component({
  selector: 'app-family-form',
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
  templateUrl: './family-form.html',
  styleUrl: './family-form.scss',
})
export class FamilyForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly familyService = inject(FamilyService);

  id: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    contactName: ['', Validators.required],
    contactPhone: ['', [Validators.pattern(/^[0-9+\-()\s]{6,20}$/)]],
    address: [''],
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.familyService.get(this.id).subscribe((f: Family) => {
        this.form.patchValue({
          name: f.name,
          contactName: f.contactName,
          contactPhone: f.contactPhone,
          address: f.address,
        });
      });
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value as Family;
    if (this.id) {
      this.familyService.update(this.id, value).subscribe(() => {
        this.snack.open('Cập nhật dòng họ thành công', 'Đóng', { duration: 2000 });
        this.router.navigate(['/families']);
      });
    } else {
      this.familyService.create(value).subscribe(() => {
        this.snack.open('Tạo dòng họ thành công', 'Đóng', { duration: 2000 });
        this.router.navigate(['/families']);
      });
    }
  }
}
