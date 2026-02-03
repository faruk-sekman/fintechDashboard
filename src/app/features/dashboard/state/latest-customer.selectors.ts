import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LatestCustomerState, latestCustomerFeatureKey } from '@features/dashboard/state/latest-customer.reducer';

export const selectLatestCustomerState = createFeatureSelector<LatestCustomerState>(latestCustomerFeatureKey);

export const selectLatestCustomer = createSelector(
  selectLatestCustomerState,
  (state) => state.customer
);

export const selectLatestCustomerWallet = createSelector(
  selectLatestCustomerState,
  (state) => state.wallet
);

export const selectLatestCustomerLoading = createSelector(
  selectLatestCustomerState,
  (state) => state.loading
);

export const selectLatestCustomerLoaded = createSelector(
  selectLatestCustomerState,
  (state) => state.loaded
);

export const selectLatestCustomerError = createSelector(
  selectLatestCustomerState,
  (state) => state.error
);
