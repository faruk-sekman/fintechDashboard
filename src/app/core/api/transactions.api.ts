import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '@core/api/api-client.service';
import { PaginatedResponse } from '@shared/models/pagination.model';
import { Transaction, TransactionType, TransferDirection } from '@shared/models/transaction.model';
import { HttpParamsInput } from '@shared/utils/http-params.util';

export interface ListTransactionsParams extends HttpParamsInput {
  page?: number;
  pageSize?: number;
  type?: TransactionType;
  transferDirection?: TransferDirection;
  currency?: string;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionsApi {
  constructor(private api: ApiClientService) {}

  listByCustomerId(customerId: string, params: ListTransactionsParams): Observable<PaginatedResponse<Transaction>> {
    return this.api.get<PaginatedResponse<Transaction>>(`/api/transactions/${encodeURIComponent(customerId)}`, params);
  }
}
