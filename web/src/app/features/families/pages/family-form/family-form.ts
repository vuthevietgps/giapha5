import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { FamilyService } from '../../services/family';
import { AuthService } from '../../../auth/services/auth.service';
import { UserService } from '../../../users/services/user';
import { hasPermission } from '../../../../core/permissions';
import type { Family } from '../../models/family.model';
import type { User } from '../../../users/models/user.model';

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
    MatSelectModule,
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
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  id: string | null = null;
  availableAdmins: User[] = [];
  canManageAdmins = false;

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    contactName: ['', Validators.required],
    contactPhone: ['', [Validators.pattern(/^[0-9+\-(\)\s]{6,20}$/)]],
    address: [''],
    adminId: [''],
  });

  ngOnInit(): void {
    // Check if current user can manage admins
    this.canManageAdmins = hasPermission(this.authService.currentUser$.value, 'users.view');
    
    if (this.canManageAdmins) {
      this.loadAvailableAdmins();
    }

    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.familyService.get(this.id).subscribe((f: Family) => {
        this.form.patchValue({
          name: f.name,
          description: f.description || '',
          contactName: f.contactName,
          contactPhone: f.contactPhone,
          address: f.address,
          adminId: f.adminId || '',
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
      this.familyService.create(value).subscribe({
        next: () => {
          this.snack.open('Tạo dòng họ thành công', 'Đóng', { duration: 2000 });
          this.router.navigate(['/families']);
        },
        error: (error) => {
          console.error('Error creating family:', error);
          const message = error.error?.message || 'Có lỗi xảy ra khi tạo dòng họ';
          this.snack.open(message, 'Đóng', { duration: 5000 });
        }
      });
    }
  }

  private loadAvailableAdmins(): void {
    this.userService.getByRole('ADMIN_DONG_HO').subscribe({
      next: (users) => {
        this.availableAdmins = users;
      },
      error: (error) => {
        console.error('Error loading admin users:', error);
        this.snack.open('Không thể tải danh sách admin', 'Đóng', { duration: 3000 });
      }
    });
  }
}
