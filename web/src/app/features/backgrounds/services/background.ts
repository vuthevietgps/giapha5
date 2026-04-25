import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import type { BackgroundImage } from '../models/background.model';

@Injectable({ providedIn: 'root' })
export class BackgroundService {
  private readonly baseUrl = `${environment.apiBaseUrl}/backgrounds`;

  constructor(private http: HttpClient) {}

  list(familyId?: string | null): Observable<BackgroundImage[]> {
    const params = familyId ? new HttpParams().set('family', familyId) : undefined;
    return this.http.get<BackgroundImage[]>(this.baseUrl, { params });
  }

  upload(file: File, name?: string, familyId?: string | null): Observable<BackgroundImage> {
    const fd = new FormData();
    fd.append('file', file);
    if (name) fd.append('name', name);
    if (familyId) fd.append('family', familyId);
    return this.http.post<BackgroundImage>(this.baseUrl, fd);
  }

  fileUrl(id: string): string {
    return `${this.baseUrl}/${id}/file`;
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }
}
