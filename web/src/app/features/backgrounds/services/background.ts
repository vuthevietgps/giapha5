import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import type { BackgroundImage } from '../models/background.model';

@Injectable({ providedIn: 'root' })
export class BackgroundService {
  private readonly baseUrl = `${environment.apiBaseUrl}/backgrounds`;

  constructor(private http: HttpClient) {}

  list(): Observable<BackgroundImage[]> {
    return this.http.get<BackgroundImage[]>(this.baseUrl);
  }

  upload(file: File, name?: string): Observable<BackgroundImage> {
    const fd = new FormData();
    fd.append('file', file);
    if (name) fd.append('name', name);
    return this.http.post<BackgroundImage>(this.baseUrl, fd);
  }

  fileUrl(id: string): string {
    return `${this.baseUrl}/${id}/file`;
  }

  remove(id: string): Observable<{ success: boolean }>{
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }
}
