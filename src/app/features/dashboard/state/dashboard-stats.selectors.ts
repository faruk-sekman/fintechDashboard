/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  DashboardStatsState,
  dashboardStatsFeatureKey,
} from '@features/dashboard/state/dashboard-stats.reducer';

export const selectDashboardStatsState =
  createFeatureSelector<DashboardStatsState>(dashboardStatsFeatureKey);

export const selectDashboardStatsData = createSelector(
  selectDashboardStatsState,
  state => state.data,
);

export const selectDashboardStatsTotal = createSelector(
  selectDashboardStatsState,
  state => state.total,
);

export const selectDashboardStatsLoading = createSelector(
  selectDashboardStatsState,
  state => state.loading,
);
