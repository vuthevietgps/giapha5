import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreatePaymentRequest {
  planSlug: string;
  familyId: string;
  method: 'vnpay' | 'bank_transfer';
}

export interface VnpayPaymentResponse {
  method: 'vnpay';
  paymentUrl: string;
  paymentId: string;
  subscriptionId: string;
}

export interface BankTransferResponse {
  method: 'bank_transfer';
  paymentId: string;
  subscriptionId: string;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    amount: number;
    content: string;
    qrData: string;
  };
}

export type PaymentResponse = VnpayPaymentResponse | BankTransferResponse;

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/payments`;

  createPayment(data: CreatePaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/create`, data);
  }

  checkStatus(paymentId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/status?paymentId=${paymentId}`);
  }

  verifyVnpayReturn(params: Record<string, string>): Observable<{ success: boolean; message: string }> {
    let httpParams = new HttpParams();
    for (const key of Object.keys(params)) {
      httpParams = httpParams.set(key, params[key]);
    }
    return this.http.get<{ success: boolean; message: string }>(
      `${this.baseUrl}/vnpay-verify`, { params: httpParams }
    );
  }
}
