import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FamilyService } from '../../services/family';
import { AuthService } from '../../../auth/services/auth.service';
import { hasPermission } from '../../../../core/permissions';
import { AssignAdminDialog } from '../../components/assign-admin-dialog/assign-admin-dialog.component';
import { AddTimeDialog } from '../../components/add-time-dialog/add-time-dialog.component';
import type { Family } from '../../models/family.model';

export interface EnhancedFamily extends Family {
  adminName?: string;
  adminEmail?: string;
  memberCount: number;
  subscriptionStatus: 'active' | 'expiring_soon' | 'expired';
  subscriptionEndDate?: Date;
  createdAt: Date;
  totalRevenue: number;
  lastActivityDate?: Date;
}

@Component({
  selector: 'app-family-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule, 
    MatToolbarModule, MatCardModule, MatChipsModule, MatSnackBarModule, 
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule
  ],
  templateUrl: './family-list.html',
  styleUrl: './family-list.scss',
})
export class FamilyList {
  private readonly familyService = inject(FamilyService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  
  displayedColumns = ['name', 'admin', 'stats', 'subscription', 'status', 'actions'];
  data: EnhancedFamily[] = [];
  isLoading = false;

  constructor() {
    this.load();
  }

  load() {
    this.isLoading = true;
    // Try enhanced API first, fallback to regular families list
    this.familyService.getFamiliesWithStats().subscribe({
      next: (res) => {
        this.data = res.map(family => ({
          ...family,
          subscriptionEndDate: family.subscriptionEndDate ? new Date(family.subscriptionEndDate) : undefined,
          createdAt: new Date(family.createdAt),
          lastActivityDate: family.lastActivityDate ? new Date(family.lastActivityDate) : undefined
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Enhanced API failed, falling back to basic list:', error);
        // Fallback to basic families list
        this.familyService.list().subscribe({
          next: (basicFamilies) => {
            this.data = basicFamilies.map(family => ({
              ...family,
              memberCount: 0,
              subscriptionStatus: 'active' as any,
              totalRevenue: 0,
              createdAt: new Date(),
              subscriptionEndDate: undefined,
              lastActivityDate: undefined
            }));
            this.isLoading = false;
          },
          error: (fallbackError) => {
            console.error('Fallback API also failed:', fallbackError);
            this.snackBar.open('Lỗi tải danh sách dòng họ', 'Đóng', { duration: 3000 });
            this.isLoading = false;
          }
        });
      }
    });
  }

  delete(id?: string) {
    if (!id) return;
    if (confirm('Bạn có chắc chắn muốn xóa dòng họ này?')) {
      this.familyService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Đã xóa dòng họ', 'Đóng', { duration: 3000 });
          this.load();
        },
        error: (error) => {
          console.error('Error deleting family:', error);
          this.snackBar.open('Lỗi xóa dòng họ', 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  assignAdmin(family: EnhancedFamily) {
    const dialogRef = this.dialog.open(AssignAdminDialog, {
      width: '500px',
      data: { family }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.snackBar.open('Đã gán admin thành công', 'Đóng', { duration: 3000 });
        this.load(); // Reload the list to show updated admin info
      }
    });
  }

  addSubscriptionTime(family: EnhancedFamily) {
    const dialogRef = this.dialog.open(AddTimeDialog, {
      width: '500px',
      data: { family }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.snackBar.open('Đã cộng thời gian thành công', 'Đóng', { duration: 3000 });
        this.load(); // Reload the list to show updated dates
      }
    });
  }

  hasPermission(resource: string, action: string): boolean {
    const currentUser = this.authService.currentUser$.value;
    return hasPermission(currentUser, `${resource}.${action}` as any);
  }

  getStatusLabel(status: string): string {
    const labels = {
      'active': 'Hoạt động',
      'expiring_soon': 'Sắp hết hạn',
      'expired': 'Hết hạn',
      'inactive': 'Tạm dừng'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  }
}
