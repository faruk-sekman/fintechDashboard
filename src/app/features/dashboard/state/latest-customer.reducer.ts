import { createReducer, on } from '@ngrx/store';
import { Customer } from '@shared/models/customer.model';
import { Wallet } from '@shared/models/wallet.model';
import { loadLatestCustomer, loadLatestCustomerFailure, loadLatestCustomerSuccess } from '@features/dashboard/state/latest-customer.actions';

export const latestCustomerFeatureKey = 'latestCustomer';

export interface LatestCustomerState {
  customer: Customer | null;
  wallet: Wallet | null;
  loading: boolean;
  loaded: boolean;
  error: unknown | null;
}

export const initialState: LatestCustomerState = {
  customer: null,
  wallet: null,
  loading: false,
  loaded: false,
  error: null
};

export const latestCustomerReducer = createReducer(
  initialState,
  on(loadLatestCustomer, (state) => ({ ...state, loading: true, loaded: false, error: null })),
  on(loadLatestCustomerSuccess, (state, { customer, wallet }) => ({
    ...state,
    customer,
    wallet,
    loading: false,
    loaded: true,
    error: null
  })),
  on(loadLatestCustomerFailure, (state, { error }) => ({
    ...state,
    loading: false,
    loaded: true,
    error
  }))
);
