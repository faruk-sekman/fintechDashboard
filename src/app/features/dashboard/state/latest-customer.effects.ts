/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

import { CustomersApi } from '@core/api/customers.api';
import { WalletsApi } from '@core/api/wallets.api';
import {
  loadLatestCustomer,
  loadLatestCustomerFailure,
  loadLatestCustomerSuccess,
} from '@features/dashboard/state/latest-customer.actions';

@Injectable()
export class LatestCustomerEffects {
  private readonly actions$ = inject(Actions);
  private readonly customersApi = inject(CustomersApi);
  private readonly walletsApi = inject(WalletsApi);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadLatestCustomer),
      switchMap(({ id }) =>
        forkJoin({
          customer: this.customersApi.getById(id),
          wallet: this.walletsApi.getByCustomerId(id),
        }).pipe(
          map(({ customer, wallet }) => loadLatestCustomerSuccess({ customer, wallet })),
          catchError(error => of(loadLatestCustomerFailure({ error }))),
        ),
      ),
    ),
  );
}
