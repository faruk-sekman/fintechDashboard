import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpParamsInput, toHttpParams } from '@shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: HttpParamsInput): Observable<T> {
    return this.http.get<T>(this.url(path), { params: toHttpParams(params) }).pipe(
      timeout({ first: 15000 }),
      retry({ count: 2, delay: 350 }),
      catchError((e) => throwError(() => e))
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body).pipe(
      timeout({ first: 15000 }),
      catchError((e) => throwError(() => e))
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body).pipe(
      timeout({ first: 15000 }),
      catchError((e) => throwError(() => e))
    );
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body).pipe(
      timeout({ first: 15000 }),
      catchError((e) => throwError(() => e))
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path)).pipe(
      timeout({ first: 15000 }),
      catchError((e) => throwError(() => e))
    );
  }

  private url(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${environment.apiBaseUrl}${p}`;
  }
}
