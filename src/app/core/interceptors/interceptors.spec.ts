import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import { loadingInterceptor } from '@core/interceptors/loading.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LoadingService } from '@core/services/loading.service';
import { AppErrorService } from '@core/services/app-error.service';

describe('HTTP interceptors', () => {
  const loadingMock = { start: vi.fn(), end: vi.fn() };
  const appErrorMock = { handleHttpError: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: LoadingService, useValue: loadingMock },
        { provide: AppErrorService, useValue: appErrorMock }
      ]
    });
  });

  it('loadingInterceptor toggles loading by default', async () => {
    const req = new HttpRequest('GET', '/test');
    const next = vi.fn(() => of(new HttpResponse({ status: 200 })));

    await TestBed.runInInjectionContext(() =>
      lastValueFrom(loadingInterceptor(req, next))
    );

    expect(loadingMock.start).toHaveBeenCalled();
    expect(loadingMock.end).toHaveBeenCalled();
  });

  it('loadingInterceptor skips when header present', async () => {
    const req = new HttpRequest('GET', '/test', undefined, { headers: new HttpHeaders({ 'x-skip-loading': '1' }) });
    const next = vi.fn(() => of(new HttpResponse({ status: 200 })));

    await TestBed.runInInjectionContext(() =>
      lastValueFrom(loadingInterceptor(req, next))
    );

    expect(loadingMock.start).not.toHaveBeenCalled();
  });

  it('errorInterceptor reports errors and rethrows', async () => {
    const req = new HttpRequest('GET', '/test');
    const httpError = new HttpErrorResponse({ status: 500, url: '/test' });
    const next = vi.fn(() => throwError(() => httpError));

    await expect(
      TestBed.runInInjectionContext(() => lastValueFrom(errorInterceptor(req, next)))
    ).rejects.toBe(httpError);

    expect(appErrorMock.handleHttpError).toHaveBeenCalledWith(httpError, '/test');
  });
});
