import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FamilyService } from '../../services/family';

@Component({
  selector: 'app-assign-admin-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Gán Admin cho Dòng họ</h2>
    
    <mat-dialog-content>
      <p><strong>Dòng họ:</strong> {{ data.family.name }}</p>
      
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Chọn Admin</mat-label>
          <mat-select formControlName="adminId" placeholder="Chọn người dùng làm admin">
            <mat-option value="">Không gán admin</mat-option>
            <mat-option *ngFor="let admin of availableAdmins" [value]="admin.id">
              {{ admin.fullName }} ({{ admin.email }})
            </mat-option>
          </mat-select>
          <mat-hint>Chỉ có thể chọn người dùng có role ADMIN_DONG_HO</mat-hint>
        </mat-form-field>
      </form>
      
      <div *ngIf="isLoading" class="loading">
        <mat-spinner diameter="30"></mat-spinner>
        Đang tải danh sách admin...
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Hủy</button>
      <button mat-raised-button color="primary" 
              (click)="onAssign()" 
              [disabled]="form.invalid || isAssigning">
        {{ isAssigning ? 'Đang gán...' : 'Gán Admin' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    
    .loading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
    }
    
    mat-dialog-content {
      min-width: 400px;
      max-width: 500px;
    }
  `]
})
export class AssignAdminDialog implements OnInit {
  form: FormGroup;
  availableAdmins: any[] = [];
  isLoading = false;
  isAssigning = false;

  constructor(
    private fb: FormBuilder,
    private familyService: FamilyService,
    private dialogRef: MatDialogRef<AssignAdminDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { family: any }
  ) {
    this.form = this.fb.group({
      adminId: [data.family.adminId || '', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadAvailableAdmins();
  }

  loadAvailableAdmins(): void {
    this.isLoading = true;
    this.familyService.getAvailableAdmins().subscribe({
      next: (admins) => {
        this.availableAdmins = admins;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading admins:', error);
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAssign(): void {
    if (this.form.valid) {
      this.isAssigning = true;
      const adminId = this.form.value.adminId;
      
      this.familyService.assignAdmin(this.data.family.id, adminId).subscribe({
        next: (result) => {
          this.dialogRef.close({ success: true, result });
        },
        error: (error) => {
          console.error('Error assigning admin:', error);
          this.isAssigning = false;
        }
      });
    }
  }
}