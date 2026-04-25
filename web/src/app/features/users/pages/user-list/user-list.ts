import { Component, inject, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../services/user';
import type { User } from '../../models/user.model';
import { USER_ROLES, USER_ROLE_LABELS } from '../../models/user.model';
import { FamilyService } from '../../../families/services/family';
import { Family } from '../../../families/models/family.model';
import { PermissionService } from '../../../../core/services/permission.service';
import { ConfirmDialogComponent } from '../../../../core/ui/confirm-dialog';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatToolbarModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  private readonly userService = inject(UserService);
  private readonly familyService = inject(FamilyService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  displayedColumns = ['fullName', 'email', 'role', 'families', 'actions'];
  data: User[] = [];
  filteredData: User[] = [];
  roles = USER_ROLES;
  roleLabels = USER_ROLE_LABELS;
  familiesMap = new Map<string, Family>();

  filterForm = this.fb.group({
    q: [''],
    role: [''],
  });

  constructor() {
    // Load danh sách dòng họ trước
    this.familyService.list().subscribe(families => {
      families.forEach(f => {
        if (f.id) this.familiesMap.set(f.id, f);
      });
      this.load();
    });
    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyFilter());
  }

  load() {
    this.userService.list().subscribe((res) => {
      this.data = res;
      this.applyFilter();
    });
  }

  canManageUser(user: User): boolean {
    return this.permissionService.canManageUser(user.role);
  }

  getFamilyNames(user: User): string[] {
    if (user.role === 'QUAN_LY' && user.managedFamilies) {
      return user.managedFamilies.map(fid => this.familiesMap.get(fid)?.name || fid);
    }
    if ((user.role === 'NHAN_VIEN' || user.role === 'TRUONG_HO') && user.assignedFamily) {
      const family = this.familiesMap.get(user.assignedFamily);
      return family ? [family.name] : [user.assignedFamily];
    }
    return [];
  }

  async delete(id?: string) {
    if (!id) return;
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Xóa người dùng',
          message: 'Bạn có chắc muốn xóa người dùng này?',
          confirmText: 'Xóa người dùng',
          tone: 'warn',
        },
      }).afterClosed(),
    );
    if (!confirmed) return;
    this.userService.delete(id).subscribe(() => this.load());
  }

  applyFilter() {
    const { q, role } = this.filterForm.value;
    const keyword = (q || '').toLowerCase();
    this.filteredData = this.data.filter((u) => {
      const matchKeyword = keyword
        ? (u.fullName?.toLowerCase().includes(keyword) || u.email?.toLowerCase().includes(keyword))
        : true;
      const matchRole = role ? u.role === role : true;
      return matchKeyword && matchRole;
    });
  }

  resetFilter() {
    this.filterForm.reset({ q: '', role: '' });
  }

  roleLabel(role: string): string {
    return this.roleLabels[role as keyof typeof this.roleLabels] ?? role;
  }
}
