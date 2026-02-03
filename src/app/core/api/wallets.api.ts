import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '@core/api/api-client.service';
import { UpdateWalletLimitsRequest, Wallet } from '@shared/models/wallet.model';

@Injectable({ providedIn: 'root' })
export class WalletsApi {
  constructor(private api: ApiClientService) {}

  getByCustomerId(customerId: string): Observable<Wallet> {
    return this.api.get<Wallet>(`/api/wallets/${encodeURIComponent(customerId)}`);
  }

  updateLimits(customerId: string, payload: UpdateWalletLimitsRequest): Observable<Wallet> {
    return this.api.patch<Wallet>(`/api/wallets/${encodeURIComponent(customerId)}`, payload);
  }
}
