import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Plan {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice: number;
  durationMonths: number;
  maxMembers: number;
  maxAdmins: number;
  maxStorageGb: number;
  features: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  user: string;
  family: any;
  plan: Plan;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING_PAYMENT';
  startDate: string;
  endDate: string;
  maxMembers: number;
  maxAdmins: number;
  maxStorageGb: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  user: string;
  subscription: string;
  amount: number;
  method: 'BANK_TRANSFER' | 'VNPAY' | 'MOMO' | 'FREE';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  description?: string;
  paidAt?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/subscriptions`;

  getPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.baseUrl}/plans`);
  }

  getMySubscriptions(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.baseUrl}/my`);
  }

  getFamilySubscription(familyId: string): Observable<Subscription | null> {
    return this.http.get<Subscription | null>(`${this.baseUrl}/family/${familyId}`);
  }

  getMyPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.baseUrl}/payments`);
  }

  upgradePlan(planSlug: string, familyId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/upgrade/${planSlug}?familyId=${familyId}`, {});
  }
}
