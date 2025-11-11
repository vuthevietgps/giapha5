import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import type { Position } from '../models/position.model';

@Injectable({ providedIn: 'root' })
export class PositionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/positions`;

  list(): Observable<Position[]> {
    return this.http.get<Position[]>(this.baseUrl);
    }

  get(id: string): Observable<Position> {
    return this.http.get<Position>(`${this.baseUrl}/${id}`);
  }

  create(payload: Position): Observable<Position> {
    return this.http.post<Position>(this.baseUrl, payload);
  }

  update(id: string, payload: Position): Observable<Position> {
    return this.http.put<Position>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
