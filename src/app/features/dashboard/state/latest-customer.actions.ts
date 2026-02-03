import { createAction, props } from '@ngrx/store';
import { Customer } from '@shared/models/customer.model';
import { Wallet } from '@shared/models/wallet.model';

export const loadLatestCustomer = createAction(
  '[Dashboard] Load Latest Customer',
  props<{ id: string }>()
);

export const loadLatestCustomerSuccess = createAction(
  '[Dashboard] Load Latest Customer Success',
  props<{ customer: Customer; wallet: Wallet }>()
);

export const loadLatestCustomerFailure = createAction(
  '[Dashboard] Load Latest Customer Failure',
  props<{ error: unknown }>()
);
