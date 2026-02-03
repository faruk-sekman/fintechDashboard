import { describe, it, expect, vi } from 'vitest';
import { CustomersApi } from '@core/api/customers.api';
import { TransactionsApi } from '@core/api/transactions.api';
import { WalletsApi } from '@core/api/wallets.api';
import { of } from 'rxjs';

class ApiClientMock {
  get = vi.fn(() => of({}));
  post = vi.fn(() => of({}));
  put = vi.fn(() => of({}));
  patch = vi.fn(() => of({}));
  delete = vi.fn(() => of({}));
}

describe('API wrappers', () => {
  it('CustomersApi uses correct endpoints', () => {
    const apiClient = new ApiClientMock();
    const api = new CustomersApi(apiClient as any);

    api.list({ page: 1 }).subscribe();
    expect(apiClient.get).toHaveBeenCalledWith('/api/customers', { page: 1 });

    api.getById('id 1').subscribe();
    expect(apiClient.get).toHaveBeenCalledWith('/api/customers/id%201');

    api.create({} as any).subscribe();
    expect(apiClient.post).toHaveBeenCalledWith('/api/customers', {});

    api.update('id', {} as any).subscribe();
    expect(apiClient.put).toHaveBeenCalledWith('/api/customers/id', {});

    api.delete('id').subscribe();
    expect(apiClient.delete).toHaveBeenCalledWith('/api/customers/id');
  });

  it('TransactionsApi uses correct endpoints', () => {
    const apiClient = new ApiClientMock();
    const api = new TransactionsApi(apiClient as any);

    api.listByCustomerId('cust 1', { page: 2 }).subscribe();
    expect(apiClient.get).toHaveBeenCalledWith('/api/transactions/cust%201', { page: 2 });
  });

  it('WalletsApi uses correct endpoints', () => {
    const apiClient = new ApiClientMock();
    const api = new WalletsApi(apiClient as any);

    api.getByCustomerId('cust 1').subscribe();
    expect(apiClient.get).toHaveBeenCalledWith('/api/wallets/cust%201');

    api.updateLimits('cust 1', { dailyLimit: 10 } as any).subscribe();
    expect(apiClient.patch).toHaveBeenCalledWith('/api/wallets/cust%201', { dailyLimit: 10 });
  });
});
