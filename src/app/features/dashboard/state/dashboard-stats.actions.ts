/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { createAction, props } from '@ngrx/store';
import { Customer } from '@shared/models/customer.model';
import { ListCustomersParams } from '@core/api/customers.api';

export const loadDashboardStats = createAction(
  '[Dashboard Stats] Load',
  props<{ params: ListCustomersParams }>(),
);

export const loadDashboardStatsSuccess = createAction(
  '[Dashboard Stats] Load Success',
  props<{ data: Customer[]; total: number }>(),
);

export const loadDashboardStatsFailure = createAction(
  '[Dashboard Stats] Load Failure',
  props<{ error: unknown }>(),
);
