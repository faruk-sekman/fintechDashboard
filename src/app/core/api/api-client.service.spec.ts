import { describe, it, expect, vi } from 'vitest';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ApiClientService } from '@core/api/api-client.service';
import { environment } from '../../../environments/environment';

class HttpClientMock {
  get = vi.fn(() => of({}));
  post = vi.fn(() => of({}));
  put = vi.fn(() => of({}));
  patch = vi.fn(() => of({}));
  delete = vi.fn(() => of({}));
}

describe('ApiClientService', () => {
  it('builds url with leading slash and passes params', () => {
    const http = new HttpClientMock();
    const api = new ApiClientService(http as any);

    api.get('/customers', { page: 1, search: 'x' }).subscribe();

    const [url, options] = http.get.mock.calls[0];
    expect(url).toBe(`${environment.apiBaseUrl}/customers`);
    expect(options.params.get('page')).toBe('1');
    expect(options.params.get('search')).toBe('x');
  });

  it('accepts path without leading slash', () => {
    const http = new HttpClientMock();
    const api = new ApiClientService(http as any);

    api.get('wallets', {}).subscribe();

    const [url] = http.get.mock.calls[0];
    expect(url).toBe(`${environment.apiBaseUrl}/wallets`);
  });

  it('calls post/put/patch/delete with correct urls', () => {
    const http = new HttpClientMock();
    const api = new ApiClientService(http as any);

    api.post('/items', { a: 1 }).subscribe();
    api.put('/items/1', { a: 2 }).subscribe();
    api.patch('/items/1', { a: 3 }).subscribe();
    api.delete('/items/1').subscribe();

    expect(http.post).toHaveBeenCalledWith(`${environment.apiBaseUrl}/items`, { a: 1 });
    expect(http.put).toHaveBeenCalledWith(`${environment.apiBaseUrl}/items/1`, { a: 2 });
    expect(http.patch).toHaveBeenCalledWith(`${environment.apiBaseUrl}/items/1`, { a: 3 });
    expect(http.delete).toHaveBeenCalledWith(`${environment.apiBaseUrl}/items/1`);
  });

  it('propagates errors for all methods', async () => {
    const http = new HttpClientMock();
    const api = new ApiClientService(http as any);
    const err = new Error('fail');
    http.get.mockImplementationOnce(() => throwError(() => err));
    await expect(lastValueFrom(api.get('/x'))).rejects.toBe(err);

    http.post.mockImplementationOnce(() => throwError(() => err));
    await expect(lastValueFrom(api.post('/x', {}))).rejects.toBe(err);

    http.put.mockImplementationOnce(() => throwError(() => err));
    await expect(lastValueFrom(api.put('/x', {}))).rejects.toBe(err);

    http.patch.mockImplementationOnce(() => throwError(() => err));
    await expect(lastValueFrom(api.patch('/x', {}))).rejects.toBe(err);

    http.delete.mockImplementationOnce(() => throwError(() => err));
    await expect(lastValueFrom(api.delete('/x'))).rejects.toBe(err);
  });
});
