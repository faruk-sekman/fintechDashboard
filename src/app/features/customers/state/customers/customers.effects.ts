import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { CustomersApi } from '@core/api/customers.api';
import { deleteCustomer, deleteCustomerFailure, deleteCustomerSuccess, loadCustomers, loadCustomersFailure, loadCustomersSuccess } from '@features/customers/state/customers/customers.actions';
import { ToastService } from '@core/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class CustomersEffects {
  private actions$ = inject(Actions);
  private api = inject(CustomersApi);
  private toast = inject(ToastService);
  private i18n = inject(TranslateService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCustomers),
      switchMap(({ params }) =>
        this.api.list(params).pipe(
          map((res) => loadCustomersSuccess({ data: res.data ?? [], total: res.total ?? 0 })),
          catchError((error) => of(loadCustomersFailure({ error })))
        )
      )
    )
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteCustomer),
      switchMap(({ id }) =>
        this.api.delete(id).pipe(
          map(() => deleteCustomerSuccess({ id })),
          catchError((error) => of(deleteCustomerFailure({ id, error })))
        )
      )
    )
  );

  deleteSuccessToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(deleteCustomerSuccess),
        tap(() => this.toast.success(this.i18n.instant('customers.deleted')))
      ),
    { dispatch: false }
  );
}
