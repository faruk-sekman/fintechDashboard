import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';

import { ListCustomersParams } from '@core/api/customers.api';
import { deleteCustomer, deleteCustomerSuccess, loadCustomers } from '@features/customers/state/customers/customers.actions';
import { selectCustomersData, selectCustomersDeleting, selectCustomersDeletingId, selectCustomersLoading, selectCustomersTotal } from '@features/customers/state/customers/customers.selectors';

@Injectable({ providedIn: 'root' })
export class CustomersStore {
  private store = inject(Store);
  private actions$ = inject(Actions);

  readonly data$ = this.store.select(selectCustomersData);
  readonly total$ = this.store.select(selectCustomersTotal);
  readonly loading$ = this.store.select(selectCustomersLoading);
  readonly deleting$ = this.store.select(selectCustomersDeleting);
  readonly deletingId$ = this.store.select(selectCustomersDeletingId);
  readonly deleteSuccess$ = this.actions$.pipe(ofType(deleteCustomerSuccess));

  load(params: ListCustomersParams) {
    this.store.dispatch(loadCustomers({ params }));
  }

  delete(id: string) {
    this.store.dispatch(deleteCustomer({ id }));
  }
}