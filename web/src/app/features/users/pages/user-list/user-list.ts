import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { UserService } from '../../services/user';
import type { User } from '../../models/user.model';
import { USER_ROLES, USER_ROLE_LABELS } from '../../models/user.model';

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
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  displayedColumns = ['fullName', 'email', 'role', 'actions'];
  data: User[] = [];
  filteredData: User[] = [];
  roles = USER_ROLES;
  roleLabels = USER_ROLE_LABELS;

  filterForm = this.fb.group({
    q: [''],
    role: [''],
  });

  constructor() {
    this.load();
    this.filterForm.valueChanges.subscribe(() => this.applyFilter());
  }

  load() {
    this.userService.list().subscribe((res) => {
      this.data = res;
      this.applyFilter();
    });
  }

  delete(id?: string) {
    if (!id) return;
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      this.userService.delete(id).subscribe(() => this.load());
    }
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
