import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { loadLatestCustomer } from '@features/dashboard/state/latest-customer.actions';
import { selectLatestCustomer, selectLatestCustomerLoaded, selectLatestCustomerLoading, selectLatestCustomerWallet } from '@features/dashboard/state/latest-customer.selectors';

@Injectable({ providedIn: 'root' })
export class LatestCustomerStore {
  private store = inject(Store);

  readonly customer$ = this.store.select(selectLatestCustomer);
  readonly wallet$ = this.store.select(selectLatestCustomerWallet);
  readonly loading$ = this.store.select(selectLatestCustomerLoading);
  readonly loaded$ = this.store.select(selectLatestCustomerLoaded);

  load(id: string) {
    this.store.dispatch(loadLatestCustomer({ id }));
  }
}
