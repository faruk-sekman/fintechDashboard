import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '@core/api/api-client.service';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest, KycStatus } from '@shared/models/customer.model';
import { PaginatedResponse } from '@shared/models/pagination.model';
import { HttpParamsInput } from '@shared/utils/http-params.util';

export interface ListCustomersParams extends HttpParamsInput {
  page?: number;
  pageSize?: number;
  search?: string;
  kycStatus?: KycStatus;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CustomersApi {
  constructor(private api: ApiClientService) {}

  list(params: ListCustomersParams): Observable<PaginatedResponse<Customer>> {
    return this.api.get<PaginatedResponse<Customer>>('/api/customers', params);
  }

  getById(id: string): Observable<Customer> {
    return this.api.get<Customer>(`/api/customers/${encodeURIComponent(id)}`);
  }

  create(payload: CreateCustomerRequest): Observable<Customer> {
    return this.api.post<Customer>('/api/customers', payload);
  }

  update(id: string, payload: UpdateCustomerRequest): Observable<Customer> {
    return this.api.put<Customer>(`/api/customers/${encodeURIComponent(id)}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/api/customers/${encodeURIComponent(id)}`);
  }
}
