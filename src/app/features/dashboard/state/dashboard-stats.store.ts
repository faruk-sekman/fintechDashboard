/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { ListCustomersParams } from '@core/api/customers.api';
import { loadDashboardStats } from '@features/dashboard/state/dashboard-stats.actions';
import {
  selectDashboardStatsData,
  selectDashboardStatsLoading,
  selectDashboardStatsTotal,
} from '@features/dashboard/state/dashboard-stats.selectors';

/**
 * Dashboard-owned customer slice for portfolio KPIs. Kept separate from the
 * customer-list `customers` slice so the two screens never overwrite each other.
 */
@Injectable({ providedIn: 'root' })
export class DashboardStatsStore {
  private readonly store = inject(Store);

  readonly data$ = this.store.select(selectDashboardStatsData);
  readonly total$ = this.store.select(selectDashboardStatsTotal);
  readonly loading$ = this.store.select(selectDashboardStatsLoading);

  load(params: ListCustomersParams) {
    this.store.dispatch(loadDashboardStats({ params }));
  }
}
