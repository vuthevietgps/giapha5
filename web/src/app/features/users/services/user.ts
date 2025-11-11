import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import type { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient) {}

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  get(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  create(payload: User): Observable<User> {
    return this.http.post<User>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
