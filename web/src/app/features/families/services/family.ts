import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Family } from '../models/family.model';

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly baseUrl = `${environment.apiBaseUrl}/families`;
  constructor(private http: HttpClient) {}

  list(): Observable<Family[]> {
    return this.http.get<Family[]>(this.baseUrl);
  }

  get(id: string): Observable<Family> {
    return this.http.get<Family>(`${this.baseUrl}/${id}`);
  }

  create(payload: Family): Observable<Family> {
    return this.http.post<Family>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Family>): Observable<Family> {
    return this.http.patch<Family>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
