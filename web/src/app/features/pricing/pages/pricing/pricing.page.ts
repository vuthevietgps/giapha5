import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // months
  features: string[];
  isPopular?: boolean;
  pricingLabel?: string;
  memberNote?: string;
  totalCostPerUser?: number;
  savingsLabel?: string;
  maxMembers?: number;
}

export interface PaymentHistory {
  _id: string;
  familyId: string;
  familyName: string;
  amount: number;
  duration: number;
  memberCount: number;
  paymentDate: Date;
  paymentMethod: 'bank_transfer' | 'zalo_pay' | 'cash';
  status: 'pending' | 'confirmed' | 'rejected';
  transactionId?: string;
  notes?: string;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule,
    MatTabsModule,
    MatExpansionModule
  ],
  template: `
    <div class="pricing-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>payments</mat-icon>
            Báo giá & Thanh toán
          </mat-card-title>
          <mat-card-subtitle>Quản lý giá dịch vụ và thanh toán của các dòng họ</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <mat-tab-group>
            <!-- Pricing Plans Tab -->
            <mat-tab label="Bảng giá">
              <div class="tab-content">
                <div class="pricing-grid">
                  <mat-card *ngFor="let plan of pricingPlans" 
                    class="pricing-card" 
                    [ngClass]="{'popular-plan': plan.isPopular}">
                    
                    <div class="popular-badge" *ngIf="plan.isPopular">
                      <mat-icon>star</mat-icon>
                      Phổ biến
                    </div>
                    
                    <mat-card-header>
                      <mat-card-title>{{ plan.name }}</mat-card-title>
                      <mat-card-subtitle>{{ plan.description }}</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <div class="price-display">
                        <span class="price">{{ plan.price | number }}đ</span>
                        <span class="duration">{{ plan.pricingLabel || '/ năm' }}</span>
                      </div>
                      <div class="price-note" *ngIf="plan.totalCostPerUser">
                        Tổng chi phí: {{ plan.totalCostPerUser | number }}đ / user trong {{ plan.duration / 12 }} năm
                      </div>
                      <div class="price-note savings" *ngIf="plan.savingsLabel">
                        {{ plan.savingsLabel }}
                      </div>
                      
                      <div class="plan-details">
                        <ng-container *ngIf="plan.memberNote; else memberCount">
                          <div class="detail-row">
                            <mat-icon>people</mat-icon>
                            <span>{{ plan.memberNote }}</span>
                          </div>
                        </ng-container>
                        <ng-template #memberCount>
                          <div class="detail-row" *ngIf="plan.maxMembers">
                            <mat-icon>people</mat-icon>
                            <span>Tối đa {{ plan.maxMembers }} thành viên</span>
                          </div>
                        </ng-template>
                        
                        <div class="features-list">
                          <div class="feature" *ngFor="let feature of plan.features">
                            <mat-icon>check_circle</mat-icon>
                            <span>{{ feature }}</span>
                          </div>
                        </div>
                      </div>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button mat-raised-button color="primary" (click)="editPlan(plan)">
                        <mat-icon>edit</mat-icon>
                        Chỉnh sửa
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
                
                <div class="add-plan-section">
                  <button mat-fab color="accent" (click)="addNewPlan()">
                    <mat-icon>add</mat-icon>
                  </button>
                  <span>Thêm gói dịch vụ mới</span>
                </div>
              </div>
            </mat-tab>

            <!-- Payment Tracking Tab -->
            <mat-tab label="Theo dõi thanh toán">
              <div class="tab-content">
                <div class="payment-controls">
                  <mat-form-field appearance="outline">
                    <mat-label>Lọc theo trạng thái</mat-label>
                    <mat-select [(value)]="selectedStatus" (selectionChange)="filterPayments()">
                      <mat-option value="">Tất cả</mat-option>
                      <mat-option value="pending">Chờ xác nhận</mat-option>
                      <mat-option value="confirmed">Đã xác nhận</mat-option>
                      <mat-option value="rejected">Từ chối</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="payments-list">
                  <mat-expansion-panel *ngFor="let payment of filteredPayments" class="payment-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <div class="payment-title">
                          <span>{{ payment.familyName }}</span>
                          <mat-chip [ngClass]="'status-' + payment.status">
                            {{ getPaymentStatusLabel(payment.status) }}
                          </mat-chip>
                        </div>
                      </mat-panel-title>
                      <mat-panel-description>
                        <div class="payment-summary">
                          <span>{{ payment.amount | number }}đ</span>
                          <span>•</span>
                          <span>{{ payment.paymentDate | date:'dd/MM/yyyy' }}</span>
                        </div>
                      </mat-panel-description>
                    </mat-expansion-panel-header>

                    <div class="payment-details">
                      <div class="detail-grid">
                        <div class="detail-item">
                          <strong>Số tiền:</strong>
                          <span>{{ payment.amount | number }}đ</span>
                        </div>
                        
                        <div class="detail-item">
                          <strong>Thời hạn:</strong>
                          <span>{{ payment.duration }} tháng</span>
                        </div>
                        
                        <div class="detail-item">
                          <strong>Số thành viên:</strong>
                          <span>{{ payment.memberCount }}</span>
                        </div>
                        
                        <div class="detail-item">
                          <strong>Phương thức:</strong>
                          <span>{{ getPaymentMethodLabel(payment.paymentMethod) }}</span>
                        </div>
                        
                        <div class="detail-item" *ngIf="payment.transactionId">
                          <strong>Mã giao dịch:</strong>
                          <span>{{ payment.transactionId }}</span>
                        </div>
                        
                        <div class="detail-item" *ngIf="payment.notes">
                          <strong>Ghi chú:</strong>
                          <span>{{ payment.notes }}</span>
                        </div>
                      </div>
                      
                      <div class="payment-actions" *ngIf="payment.status === 'pending'">
                        <button mat-raised-button color="primary" (click)="confirmPayment(payment)">
                          <mat-icon>check</mat-icon>
                          Xác nhận
                        </button>
                        <button mat-raised-button color="warn" (click)="rejectPayment(payment)">
                          <mat-icon>close</mat-icon>
                          Từ chối
                        </button>
                        <button mat-button (click)="contactViaZalo(payment)">
                          <mat-icon>chat</mat-icon>
                          Nhắn Zalo
                        </button>
                      </div>
                    </div>
                  </mat-expansion-panel>
                </div>
              </div>
            </mat-tab>

            <!-- Time Management Tab -->
            <mat-tab label="Quản lý thời gian">
              <div class="tab-content">
                <div class="time-management-info">
                  <mat-card class="info-card">
                    <mat-card-header>
                      <mat-card-title>Cộng thời gian sử dụng</mat-card-title>
                      <mat-card-subtitle>Chỉ SUPER_ADMIN có quyền cộng thời gian cho dòng họ</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <form [formGroup]="timeForm" (ngSubmit)="addTime()">
                        <div class="form-row">
                          <mat-form-field appearance="outline" class="full-width">
                            <mat-label>Chọn dòng họ</mat-label>
                            <mat-select formControlName="familyId">
                              <mat-option *ngFor="let family of families" [value]="family._id">
                                {{ family.name }} ({{ family.memberCount }} thành viên)
                              </mat-option>
                            </mat-select>
                          </mat-form-field>
                        </div>
                        
                        <div class="form-row">
                          <mat-form-field appearance="outline">
                            <mat-label>Số tháng cộng thêm</mat-label>
                            <input matInput type="number" formControlName="months" min="1" max="60">
                          </mat-form-field>
                          
                          <mat-form-field appearance="outline">
                            <mat-label>Lý do</mat-label>
                            <input matInput formControlName="reason" placeholder="Ví dụ: Thanh toán trước">
                          </mat-form-field>
                        </div>
                        
                        <div class="form-actions">
                          <button mat-raised-button color="primary" type="submit" 
                            [disabled]="timeForm.invalid">
                            <mat-icon>schedule</mat-icon>
                            Cộng thời gian
                          </button>
                        </div>
                      </form>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .pricing-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .tab-content {
      padding: 20px 0;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .pricing-card {
      position: relative;
      transition: transform 0.2s;
    }

    .pricing-card:hover {
      transform: translateY(-4px);
    }

    .popular-plan {
      border: 2px solid #673ab7;
    }

    .popular-badge {
      position: absolute;
      top: -10px;
      right: 20px;
      background: #673ab7;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .price-display {
      text-align: center;
      margin: 20px 0;
    }

    .price {
      font-size: 32px;
      font-weight: bold;
      color: #673ab7;
    }

    .duration {
      color: rgba(0, 0, 0, 0.6);
      margin-left: 8px;
    }

    .price-note {
      text-align: center;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
      margin-top: -8px;
    }

    .price-note.savings {
      color: #2e7d32;
      font-weight: 500;
      margin-top: 4px;
    }

    .plan-details {
      margin: 20px 0;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: rgba(0, 0, 0, 0.7);
    }

    .features-list {
      margin-top: 16px;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: rgba(0, 0, 0, 0.7);
    }

    .feature mat-icon {
      color: #4caf50;
      font-size: 18px;
    }

    .add-plan-section {
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: center;
      margin-top: 20px;
    }

    .payment-controls {
      margin-bottom: 20px;
    }

    .payment-panel {
      margin-bottom: 16px;
    }

    .payment-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .payment-summary {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .payment-details {
      padding: 16px 0;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .payment-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .status-pending {
      background-color: #ff9800;
      color: white;
    }

    .status-confirmed {
      background-color: #4caf50;
      color: white;
    }

    .status-rejected {
      background-color: #f44336;
      color: white;
    }

    .time-management-info {
      max-width: 600px;
    }

    .info-card {
      margin-bottom: 20px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      gap: 16px;
      margin-top: 16px;
    }
  `]
})
export class PricingPage implements OnInit {
  pricingPlans: PricingPlan[] = [];
  paymentHistory: PaymentHistory[] = [];
  filteredPayments: PaymentHistory[] = [];
  selectedStatus = '';
  families: any[] = [];
  timeForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.timeForm = this.fb.group({
      familyId: ['', Validators.required],
      months: [1, [Validators.required, Validators.min(1), Validators.max(60)]],
      reason: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadPricingPlans();
    this.loadPaymentHistory();
    this.loadFamilies();
  }

  loadPricingPlans(): void {
    this.pricingPlans = [
      {
        id: 'yearly',
        name: 'Gói 1 năm',
        description: 'Thanh toán linh hoạt theo từng năm',
        price: 20000,
        duration: 12,
        pricingLabel: ' / user / năm',
        totalCostPerUser: 20000,
        memberNote: 'Tính phí dựa trên số người dùng đang hoạt động',
        features: [
          'Bao gồm toàn bộ chức năng quản lý dòng họ',
          'Điều chỉnh số lượng user theo từng năm',
          'Hỗ trợ kỹ thuật tiêu chuẩn'
        ]
      },
      {
        id: 'five-year',
        name: 'Gói tiết kiệm 5 năm',
        description: 'Thanh toán trước 5 năm – chỉ 15.000đ/user/năm',
        price: 15000,
        duration: 60,
        pricingLabel: ' / user / năm (thanh toán 5 năm)',
        totalCostPerUser: 75000,
        memberNote: 'Giữ cố định giá cho số user đăng ký trong 5 năm',
        savingsLabel: 'Tiết kiệm 25% so với gói 1 năm',
        isPopular: true,
        features: [
          'Khóa giá trong 5 năm, không lo biến động',
          'Ưu tiên hỗ trợ triển khai dữ liệu ban đầu',
          'Tặng 3 buổi đào tạo trực tuyến cho quản trị viên'
        ]
      },
      {
        id: 'ten-year',
        name: 'Gói chiến lược 10 năm',
        description: 'Thanh toán trước 10 năm – 10.000đ/user/năm',
        price: 10000,
        duration: 120,
        pricingLabel: ' / user / năm (thanh toán 10 năm)',
        totalCostPerUser: 100000,
        memberNote: 'Giữ giá dài hạn cho số user đăng ký trong 10 năm',
        savingsLabel: 'Tiết kiệm 50% so với gói 1 năm',
        features: [
          'Hỗ trợ chuyển đổi dữ liệu, sao lưu định kỳ miễn phí',
          'Ưu tiên xử lý yêu cầu tính năng mới',
          'Đồng hành trong các sự kiện lớn của dòng họ'
        ]
      }
    ];
  }

  loadPaymentHistory(): void {
    this.paymentHistory = [
      {
        _id: '1',
        familyId: 'family1',
        familyName: 'Dòng họ Nguyễn Văn A',
        amount: 1000000,
        duration: 12,
        memberCount: 145,
        paymentDate: new Date('2024-11-15'),
        paymentMethod: 'bank_transfer',
        status: 'pending',
        transactionId: 'TXN123456789',
        notes: 'Chuyển khoản qua Vietcombank'
      }
    ];
    this.filteredPayments = [...this.paymentHistory];
  }

  loadFamilies(): void {
    // Mock data - replace with API call
    this.families = [
      { _id: 'family1', name: 'Dòng họ Nguyễn Văn A', memberCount: 145 },
      { _id: 'family2', name: 'Dòng họ Trần Thị B', memberCount: 89 }
    ];
  }

  filterPayments(): void {
    if (this.selectedStatus) {
      this.filteredPayments = this.paymentHistory.filter(p => p.status === this.selectedStatus);
    } else {
      this.filteredPayments = [...this.paymentHistory];
    }
  }

  editPlan(plan: PricingPlan): void {
    console.log('Edit plan:', plan);
    // TODO: Open edit dialog
  }

  addNewPlan(): void {
    console.log('Add new plan');
    // TODO: Open add plan dialog
  }

  confirmPayment(payment: PaymentHistory): void {
    payment.status = 'confirmed';
    this.snackBar.open('Đã xác nhận thanh toán', 'Đóng', { duration: 3000 });
    // TODO: Update in backend
  }

  rejectPayment(payment: PaymentHistory): void {
    payment.status = 'rejected';
    this.snackBar.open('Đã từ chối thanh toán', 'Đóng', { duration: 3000 });
    // TODO: Update in backend
  }

  contactViaZalo(payment: PaymentHistory): void {
    // TODO: Integrate with Zalo API or open Zalo app
    this.snackBar.open('Chuyển hướng đến Zalo...', 'Đóng', { duration: 3000 });
  }

  addTime(): void {
    if (this.timeForm.valid) {
      const formData = this.timeForm.value;
      console.log('Add time:', formData);
      this.snackBar.open(`Đã cộng ${formData.months} tháng cho dòng họ`, 'Đóng', { duration: 3000 });
      this.timeForm.reset();
      // TODO: Update in backend
    }
  }

  getPaymentStatusLabel(status: string): string {
    const labels = {
      'pending': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'rejected': 'Từ chối'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getPaymentMethodLabel(method: string): string {
    const labels = {
      'bank_transfer': 'Chuyển khoản',
      'zalo_pay': 'ZaloPay',
      'cash': 'Tiền mặt'
    };
    return labels[method as keyof typeof labels] || method;
  }
}