import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Union } from '../models/union.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UnionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/unions`;

  list(params?: { family?: string; partner?: string }): Observable<Union[]> {
    const qp: any = {};
    if (params?.family) qp.family = params.family;
    if (params?.partner) qp.partner = params.partner;
    return this.http.get<Union[]>(this.base, { params: qp });
  }

  create(data: Partial<Union>): Observable<Union> { return this.http.post<Union>(this.base, data); }
  update(id: string, data: Partial<Union>): Observable<Union> { return this.http.patch<Union>(`${this.base}/${id}`, data); }
  remove(id: string): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
  normalize(memberId: string): Observable<{ created: any[] }> { return this.http.post<{ created: any[] }>(`${this.base}/normalize/${memberId}`, {}); }
}
