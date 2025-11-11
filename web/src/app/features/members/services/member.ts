import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import type { Member } from '../models/member.model';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/members`;

  list(params?: { family?: string; q?: string }): Observable<Member[]> {
    let httpParams = new HttpParams();
    if (params?.family) httpParams = httpParams.set('family', params.family);
    if (params?.q) httpParams = httpParams.set('q', params.q);
    return this.http.get<Member[]>(this.baseUrl, { params: httpParams });
  }

  listByFamily(familyId: string): Observable<Member[]> {
    return this.http.get<Member[]>(`${this.baseUrl}/by-family/${familyId}`);
  }

  get(id: string): Observable<Member> {
    return this.http.get<Member>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<Member>): Observable<Member> {
    return this.http.post<Member>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Member>): Observable<Member> {
    return this.http.put<Member>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  setChildren(id: string, childrenIds: string[]): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/children`, { childrenIds });
  }

  reparent(id: string, data: { unionId?: string; fatherId?: string; motherId?: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/reparent`, data);
  }

  uploadPhoto(id: string, file: File): Observable<{ success: boolean; url?: string }> {
    const form = new FormData();
    form.append('photo', file);
    return this.http.put<{ success: boolean; url?: string }>(`${this.baseUrl}/${id}/photo`, form);
  }

  // Build family tree for a given family (and optional root)
  tree(params: { family: string; root?: string }): Observable<{ familyId: string; roots: any[] }> {
    const httpParams = new HttpParams({ fromObject: { family: params.family, ...(params.root ? { root: params.root } : {}) } });
    return this.http.get<{ familyId: string; roots: any[] }>(`${this.baseUrl}/tree`, { params: httpParams });
  }
}
