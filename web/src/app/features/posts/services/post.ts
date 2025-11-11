import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import type { PostModel } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly baseUrl = `${environment.apiBaseUrl}/posts`;

  constructor(private http: HttpClient) {}

  list(): Observable<PostModel[]> {
    return this.http.get<PostModel[]>(this.baseUrl);
    }

  get(id: string): Observable<PostModel> {
    return this.http.get<PostModel>(`${this.baseUrl}/${id}`);
  }

  create(payload: PostModel): Observable<PostModel> {
    return this.http.post<PostModel>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<PostModel>): Observable<PostModel> {
    return this.http.patch<PostModel>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
