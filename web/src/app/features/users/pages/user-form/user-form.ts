import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DEFAULT_USER_ROLE, USER_ROLE_LABELS, USER_ROLES, User } from '../../models/user.model';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly userService = inject(UserService);

  id: string | null = null;
  roles = USER_ROLES;
  roleLabels = USER_ROLE_LABELS;

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
  role: [DEFAULT_USER_ROLE, Validators.required],
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.userService.get(this.id).subscribe((u: User) => {
        this.form.patchValue({
          fullName: u.fullName,
          email: u.email,
          role: u.role,
        });
        this.form.get('password')?.clearValidators();
        this.form.get('password')?.updateValueAndValidity();
      });
    }
  }

  save() {
    const value = this.form.value as User;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.id) {
      // Don't send empty password
      const payload: any = { ...value };
      if (!payload.password) delete payload.password;
      this.userService.update(this.id, payload).subscribe(() => {
        this.snack.open('Cập nhật thành công', 'Đóng', { duration: 2000 });
        this.router.navigate(['/users']);
      });
    } else {
      this.userService.create(value).subscribe(() => {
        this.snack.open('Tạo mới thành công', 'Đóng', { duration: 2000 });
        this.router.navigate(['/users']);
      });
    }
  }
}
