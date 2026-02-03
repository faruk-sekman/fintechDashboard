import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Subject, of, throwError } from 'rxjs';
import { LatestCustomerEffects } from '@features/dashboard/state/latest-customer.effects';
import { LatestCustomerStore } from '@features/dashboard/state/latest-customer.store';
import {
  loadLatestCustomer,
  loadLatestCustomerFailure,
  loadLatestCustomerSuccess
} from '@features/dashboard/state/latest-customer.actions';
import { latestCustomerReducer, initialState } from '@features/dashboard/state/latest-customer.reducer';
import {
  selectLatestCustomer,
  selectLatestCustomerLoaded,
  selectLatestCustomerLoading,
  selectLatestCustomerWallet
} from '@features/dashboard/state/latest-customer.selectors';
import { CustomersApi } from '@core/api/customers.api';
import { WalletsApi } from '@core/api/wallets.api';

const customer = { id: '1', name: 'A', email: '', phone: '', walletNumber: '', nationalId: 0, dateOfBirth: '2000-01-01', address: { country: '', city: '', postalCode: '', line1: '' }, kycStatus: 'UNKNOWN', isActive: true, createdAt: '', updatedAt: '' } as any;
const wallet = { id: 'w', dailyLimit: 1, monthlyLimit: 2, balance: 0, currency: 'TRY' } as any;

describe('LatestCustomer state', () => {
  it('latestCustomerReducer handles load actions', () => {
    const loading = latestCustomerReducer(initialState, loadLatestCustomer({ id: '1' }));
    expect(loading.loading).toBe(true);

    const loaded = latestCustomerReducer(loading, loadLatestCustomerSuccess({ customer, wallet }));
    expect(loaded.customer).toBe(customer);
    expect(loaded.wallet).toBe(wallet);
    expect(loaded.loaded).toBe(true);

    const failed = latestCustomerReducer(loaded, loadLatestCustomerFailure({ error: 'x' }));
    expect(failed.error).toBe('x');
  });

  it('selectors project state', () => {
    const state = { ...initialState, customer, wallet, loading: true, loaded: false };
    expect(selectLatestCustomer.projector(state)).toBe(customer);
    expect(selectLatestCustomerWallet.projector(state)).toBe(wallet);
    expect(selectLatestCustomerLoading.projector(state)).toBe(true);
    expect(selectLatestCustomerLoaded.projector(state)).toBe(false);
  });

  it('LatestCustomerStore dispatches load', () => {
    const storeMock = { select: vi.fn(() => of(null)), dispatch: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Store, useValue: storeMock }
      ]
    });

    const store = TestBed.runInInjectionContext(() => new LatestCustomerStore());
    store.load('1');
    expect(storeMock.dispatch).toHaveBeenCalledWith(loadLatestCustomer({ id: '1' }));
  });

  it('LatestCustomerEffects emits success action', () => {
    const actions$ = new Subject<any>();
    const customersApi = { getById: vi.fn(() => of(customer)) };
    const walletsApi = { getByCustomerId: vi.fn(() => of(wallet)) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: CustomersApi, useValue: customersApi },
        { provide: WalletsApi, useValue: walletsApi }
      ]
    });

    const effects = TestBed.runInInjectionContext(() => new LatestCustomerEffects());
    const results: any[] = [];
    const sub = effects.load$.subscribe((a) => results.push(a));

    actions$.next(loadLatestCustomer({ id: '1' }));
    expect(results[0].type).toBe(loadLatestCustomerSuccess.type);

    sub.unsubscribe();
  });

  it('LatestCustomerEffects emits failure action on error', () => {
    const actions$ = new Subject<any>();
    const customersApi = { getById: vi.fn(() => throwError(() => new Error('fail'))) };
    const walletsApi = { getByCustomerId: vi.fn(() => of(wallet)) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: new Actions(actions$) },
        { provide: CustomersApi, useValue: customersApi },
        { provide: WalletsApi, useValue: walletsApi }
      ]
    });

    const effects = TestBed.runInInjectionContext(() => new LatestCustomerEffects());
    const results: any[] = [];
    const sub = effects.load$.subscribe((a) => results.push(a));

    actions$.next(loadLatestCustomer({ id: '1' }));
    expect(results[0].type).toBe(loadLatestCustomerFailure.type);

    sub.unsubscribe();
  });
});
