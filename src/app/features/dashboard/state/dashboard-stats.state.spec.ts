/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Subject, of, throwError } from 'rxjs';
import { DashboardStatsEffects } from '@features/dashboard/state/dashboard-stats.effects';
import { DashboardStatsStore } from '@features/dashboard/state/dashboard-stats.store';
import {
  loadDashboardStats,
  loadDashboardStatsFailure,
  loadDashboardStatsSuccess,
} from '@features/dashboard/state/dashboard-stats.actions';
import {
  dashboardStatsReducer,
  initialState,
} from '@features/dashboard/state/dashboard-stats.reducer';
import {
  selectDashboardStatsData,
  selectDashboardStatsLoading,
  selectDashboardStatsTotal,
} from '@features/dashboard/state/dashboard-stats.selectors';
import { CustomersApi } from '@core/api/customers.api';

const customer = {
  id: '1',
  name: 'A',
  email: '',
  phone: '',
  walletNumber: '',
  nationalId: 0,
  dateOfBirth: '2000-01-01',
  address: { country: '', city: '', postalCode: '', line1: '' },
  kycStatus: 'UNKNOWN',
  isActive: true,
  createdAt: '',
  updatedAt: '',
} as any;

const params = { page: 1, pageSize: 60 };

describe('DashboardStats state', () => {
  it('dashboardStatsReducer handles load actions', () => {
    const loading = dashboardStatsReducer(initialState, loadDashboardStats({ params }));
    expect(loading.loading).toBe(true);

    const loaded = dashboardStatsReducer(
      loading,
      loadDashboardStatsSuccess({ data: [customer], total: 1 }),
    );
    expect(loaded.data).toEqual([customer]);
    expect(loaded.total).toBe(1);
    expect(loaded.loading).toBe(false);

    const failed = dashboardStatsReducer(loaded, loadDashboardStatsFailure({ error: 'x' }));
    expect(failed.error).toBe('x');
    expect(failed.loading).toBe(false);
  });

  it('selectors project state', () => {
    const state = { ...initialState, data: [customer], total: 5, loading: true };
    expect(selectDashboardStatsData.projector(state)).toEqual([customer]);
    expect(selectDashboardStatsTotal.projector(state)).toBe(5);
    expect(selectDashboardStatsLoading.projector(state)).toBe(true);
  });

  it('DashboardStatsStore dispatches load', () => {
    const storeMock = { select: vi.fn(() => of(null)), dispatch: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: Store, useValue: storeMock }] });

    const store = TestBed.runInInjectionContext(() => new DashboardStatsStore());
    store.load(params);
    expect(storeMock.dispatch).toHaveBeenCalledWith(loadDashboardStats({ params }));
  });

  it('DashboardStatsEffects emits success action', () => {
    const actions$ = new Subject<any>();
    const api = { list: vi.fn(() => of({ data: [customer], total: 1 })) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: CustomersApi, useValue: api },
      ],
    });

    const effects = TestBed.runInInjectionContext(() => new DashboardStatsEffects());
    const results: any[] = [];
    const sub = effects.load$.subscribe(a => results.push(a));

    actions$.next(loadDashboardStats({ params }));
    expect(results[0].type).toBe(loadDashboardStatsSuccess.type);

    sub.unsubscribe();
  });

  it('DashboardStatsEffects defaults missing list payload fields safely', () => {
    const actions$ = new Subject<any>();
    const api = { list: vi.fn(() => of({ data: null, total: null })) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: CustomersApi, useValue: api },
      ],
    });

    const effects = TestBed.runInInjectionContext(() => new DashboardStatsEffects());
    const results: any[] = [];
    const sub = effects.load$.subscribe(a => results.push(a));

    actions$.next(loadDashboardStats({ params }));

    expect(results[0]).toEqual(loadDashboardStatsSuccess({ data: [], total: 0 }));
    sub.unsubscribe();
  });

  it('DashboardStatsEffects emits failure action on error', () => {
    const actions$ = new Subject<any>();
    const api = { list: vi.fn(() => throwError(() => new Error('fail'))) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: CustomersApi, useValue: api },
      ],
    });

    const effects = TestBed.runInInjectionContext(() => new DashboardStatsEffects());
    const results: any[] = [];
    const sub = effects.load$.subscribe(a => results.push(a));

    actions$.next(loadDashboardStats({ params }));
    expect(results[0].type).toBe(loadDashboardStatsFailure.type);

    sub.unsubscribe();
  });
});
