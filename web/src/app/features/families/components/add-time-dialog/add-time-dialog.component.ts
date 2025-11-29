import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FamilyService } from '../../services/family';

@Component({
  selector: 'app-add-time-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Cộng Thời gian Sử dụng</h2>
    
    <mat-dialog-content>
      <p><strong>Dòng họ:</strong> {{ data.family.name }}</p>
      <p *ngIf="data.family.subscriptionEndDate">
        <strong>Hết hạn hiện tại:</strong> {{ data.family.subscriptionEndDate | date:'dd/MM/yyyy' }}
      </p>
      
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Số tháng cộng thêm</mat-label>
          <input matInput type="number" formControlName="months" min="1" max="60">
          <mat-hint>Nhập số tháng từ 1 đến 60</mat-hint>
          <mat-error *ngIf="form.get('months')?.hasError('required')">
            Số tháng là bắt buộc
          </mat-error>
          <mat-error *ngIf="form.get('months')?.hasError('min')">
            Tối thiểu 1 tháng
          </mat-error>
          <mat-error *ngIf="form.get('months')?.hasError('max')">
            Tối đa 60 tháng
          </mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Lý do</mat-label>
          <input matInput formControlName="reason" placeholder="Ví dụ: Thanh toán trước, Khuyến mãi...">
          <mat-error *ngIf="form.get('reason')?.hasError('required')">
            Lý do là bắt buộc
          </mat-error>
        </mat-form-field>
      </form>
      
      <div class="preview" *ngIf="form.valid">
        <p><strong>Thời gian mới sẽ hết hạn:</strong> {{ getNewEndDate() | date:'dd/MM/yyyy' }}</p>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Hủy</button>
      <button mat-raised-button color="primary" 
              (click)="onAddTime()" 
              [disabled]="form.invalid || isAdding">
        {{ isAdding ? 'Đang cộng...' : 'Cộng Thời gian' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    
    .preview {
      background-color: #e3f2fd;
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
    }
    
    mat-dialog-content {
      min-width: 400px;
      max-width: 500px;
    }
  `]
})
export class AddTimeDialog {
  form: FormGroup;
  isAdding = false;

  constructor(
    private fb: FormBuilder,
    private familyService: FamilyService,
    private dialogRef: MatDialogRef<AddTimeDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { family: any }
  ) {
    this.form = this.fb.group({
      months: [1, [Validators.required, Validators.min(1), Validators.max(60)]],
      reason: ['', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAddTime(): void {
    if (this.form.valid) {
      this.isAdding = true;
      const { months, reason } = this.form.value;
      
      this.familyService.addSubscriptionTime(this.data.family.id, months, reason).subscribe({
        next: (result) => {
          this.dialogRef.close({ success: true, result });
        },
        error: (error) => {
          console.error('Error adding time:', error);
          this.isAdding = false;
        }
      });
    }
  }

  getNewEndDate(): Date {
    if (!this.form.valid) return new Date();
    
    const currentEndDate = this.data.family.subscriptionEndDate 
      ? new Date(this.data.family.subscriptionEndDate) 
      : new Date();
    
    const months = this.form.value.months || 0;
    const newDate = new Date(currentEndDate);
    newDate.setMonth(newDate.getMonth() + months);
    
    return newDate;
  }
}