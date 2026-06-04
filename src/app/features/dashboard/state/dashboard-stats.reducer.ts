/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { createReducer, on } from '@ngrx/store';
import { Customer } from '@shared/models/customer.model';
import {
  loadDashboardStats,
  loadDashboardStatsFailure,
  loadDashboardStatsSuccess,
} from '@features/dashboard/state/dashboard-stats.actions';

export const dashboardStatsFeatureKey = 'dashboardStats';

export interface DashboardStatsState {
  data: Customer[];
  total: number;
  loading: boolean;
  error: unknown | null;
}

export const initialState: DashboardStatsState = {
  data: [],
  total: 0,
  loading: false,
  error: null,
};

export const dashboardStatsReducer = createReducer(
  initialState,
  on(loadDashboardStats, state => ({ ...state, loading: true, error: null })),
  on(loadDashboardStatsSuccess, (state, { data, total }) => ({
    ...state,
    data,
    total,
    loading: false,
    error: null,
  })),
  on(loadDashboardStatsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);
