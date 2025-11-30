import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DEFAULT_USER_ROLE, USER_ROLE_LABELS, USER_ROLES, User } from '../../models/user.model';
import { UserService } from '../../services/user';
import { FamilyService } from '../../../families/services/family';
import { Family } from '../../../families/models/family.model';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
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
  private readonly familyService = inject(FamilyService);
  private readonly permissionService = inject(PermissionService);

  id: string | null = null;
  roles = USER_ROLES;
  roleLabels = USER_ROLE_LABELS;
  families: Family[] = [];

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    role: [DEFAULT_USER_ROLE, Validators.required],
    managedFamilies: [[] as string[]],
    assignedFamily: [''],
  });

  ngOnInit(): void {
    // Load danh sách dòng họ
    this.familyService.list().subscribe(families => {
      this.families = families;
    });

    // Theo dõi thay đổi role để hiện/ẩn field phù hợp
    this.form.get('role')?.valueChanges.subscribe(role => {
      this.onRoleChange(role);
    });

    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.userService.get(this.id).subscribe((u: User) => {
        this.form.patchValue({
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          managedFamilies: u.managedFamilies || [],
          assignedFamily: u.assignedFamily || '',
        });
        this.form.get('password')?.clearValidators();
        this.form.get('password')?.updateValueAndValidity();
        this.onRoleChange(u.role);
      });
    } else {
      // Mặc định cho user mới
      this.onRoleChange(DEFAULT_USER_ROLE);
    }
  }

  onRoleChange(role: string | null | undefined) {
    const managedFamiliesControl = this.form.get('managedFamilies');
    const assignedFamilyControl = this.form.get('assignedFamily');

    if (role === 'QUAN_LY') {
      // Quản lý cần chọn danh sách dòng họ
      managedFamiliesControl?.setValidators([Validators.required]);
      assignedFamilyControl?.clearValidators();
      assignedFamilyControl?.setValue('');
    } else if (role === 'NHAN_VIEN' || role === 'TRUONG_HO') {
      // Nhân viên và trưởng họ cần chọn 1 dòng họ
      assignedFamilyControl?.setValidators([Validators.required]);
      managedFamiliesControl?.clearValidators();
      managedFamiliesControl?.setValue([]);
    } else {
      // Giám đốc không cần
      managedFamiliesControl?.clearValidators();
      assignedFamilyControl?.clearValidators();
      managedFamiliesControl?.setValue([]);
      assignedFamilyControl?.setValue('');
    }

    managedFamiliesControl?.updateValueAndValidity();
    assignedFamilyControl?.updateValueAndValidity();
  }

  get selectedRole(): string {
    return this.form.get('role')?.value || '';
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
