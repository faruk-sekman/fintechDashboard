import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Subject, of, throwError } from 'rxjs';
import { TransactionsEffects } from '@features/customers/state/transactions/transactions.effects';
import { TransactionsStore } from '@features/customers/state/transactions/transactions.store';
import {
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess
} from '@features/customers/state/transactions/transactions.actions';
import { transactionsReducer, initialState } from '@features/customers/state/transactions/transactions.reducer';
import { selectTransactionsData, selectTransactionsLoading, selectTransactionsTotal, selectTransactionsError } from '@features/customers/state/transactions/transactions.selectors';
import { TransactionsApi } from '@core/api/transactions.api';

const tx = { id: '1', amount: 10, currency: 'TRY', type: 'CREDIT', transferDirection: 'INCOMING', createdAt: '', description: '' } as any;

describe('Transactions state', () => {
  it('transactionsReducer handles load actions', () => {
    const loading = transactionsReducer(initialState, loadTransactions({ customerId: '1', params: { page: 1 } }));
    expect(loading.loading).toBe(true);

    const loaded = transactionsReducer(loading, loadTransactionsSuccess({ data: [tx], total: 1 }));
    expect(loaded.data.length).toBe(1);
    expect(loaded.loading).toBe(false);

    const failed = transactionsReducer(loaded, loadTransactionsFailure({ error: 'x' }));
    expect(failed.error).toBe('x');
  });

  it('selectors project state', () => {
    const state = { ...initialState, data: [tx], total: 2, loading: true };
    expect(selectTransactionsData.projector(state)).toEqual([tx]);
    expect(selectTransactionsTotal.projector(state)).toBe(2);
    expect(selectTransactionsLoading.projector(state)).toBe(true);
    expect(selectTransactionsError.projector({ ...state, error: 'err' })).toBe('err');
  });

  it('TransactionsStore dispatches actions', () => {
    const actions$ = new Subject<any>();
    const storeMock = { select: vi.fn(() => of([])), dispatch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Store, useValue: storeMock },
        { provide: Actions, useValue: new Actions(actions$) }
      ]
    });

    const store = TestBed.runInInjectionContext(() => new TransactionsStore());
    store.load('1', { page: 1 });
    expect(storeMock.dispatch).toHaveBeenCalledWith(loadTransactions({ customerId: '1', params: { page: 1 } }));
  });

  it('TransactionsEffects emits success action', () => {
    const actions$ = new Subject<any>();
    const api = { listByCustomerId: vi.fn(() => of({ data: [tx], total: 1 })) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: TransactionsApi, useValue: api }
      ]
    });

    const effects = TestBed.runInInjectionContext(() => new TransactionsEffects());
    const results: any[] = [];
    const sub = effects.load$.subscribe((a) => results.push(a));

    actions$.next(loadTransactions({ customerId: '1', params: { page: 1 } }));
    expect(results[0].type).toBe(loadTransactionsSuccess.type);

    sub.unsubscribe();
  });

  it('TransactionsEffects defaults missing list data and total', () => {
    const actions$ = new Subject<any>();
    const api = { listByCustomerId: vi.fn(() => of({})) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: TransactionsApi, useValue: api }
      ]
    });

    const effects = TestBed.runInInjectionContext(() => new TransactionsEffects());
    const results: any[] = [];
    const sub = effects.load$.subscribe((a) => results.push(a));

    actions$.next(loadTransactions({ customerId: '1', params: { page: 1 } }));
    expect(results[0]).toEqual(loadTransactionsSuccess({ data: [], total: 0 }));

    sub.unsubscribe();
  });

  it('TransactionsEffects emits failure action on error', () => {
    const actions$ = new Subject<any>();
    const api = { listByCustomerId: vi.fn(() => throwError(() => new Error('fail'))) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: TransactionsApi, useValue: api }
      ]
    });

    const effects = TestBed.runInInjectionContext(() => new TransactionsEffects());
    const results: any[] = [];
    const sub = effects.load$.subscribe((a) => results.push(a));

    actions$.next(loadTransactions({ customerId: '1', params: { page: 1 } }));
    expect(results[0].type).toBe(loadTransactionsFailure.type);

    sub.unsubscribe();
  });
});
