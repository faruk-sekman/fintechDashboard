/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { CustomersApi } from '@core/api/customers.api';
import {
  loadDashboardStats,
  loadDashboardStatsFailure,
  loadDashboardStatsSuccess,
} from '@features/dashboard/state/dashboard-stats.actions';

@Injectable()
export class DashboardStatsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(CustomersApi);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDashboardStats),
      switchMap(({ params }) =>
        this.api.list(params).pipe(
          map(res => loadDashboardStatsSuccess({ data: res.data ?? [], total: res.total ?? 0 })),
          catchError(error => of(loadDashboardStatsFailure({ error }))),
        ),
      ),
    ),
  );
}
