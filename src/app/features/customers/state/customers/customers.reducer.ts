import { createReducer, on } from '@ngrx/store';
import { Customer } from '@shared/models/customer.model';
import { deleteCustomer, deleteCustomerFailure, deleteCustomerSuccess, loadCustomers, loadCustomersFailure, loadCustomersSuccess } from '@features/customers/state/customers/customers.actions';

export const customersFeatureKey = 'customers';

export interface CustomersState {
  data: Customer[];
  total: number;
  loading: boolean;
  error: unknown | null;
  deleting: boolean;
  deletingId: string | null;
  deleteError: unknown | null;
}

export const initialState: CustomersState = {
  data: [],
  total: 0,
  loading: false,
  error: null,
  deleting: false,
  deletingId: null,
  deleteError: null
};

export const customersReducer = createReducer(
  initialState,
  on(loadCustomers, (state) => ({ ...state, loading: true, error: null })),
  on(loadCustomersSuccess, (state, { data, total }) => ({
    ...state,
    data,
    total,
    loading: false,
    error: null
  })),
  on(loadCustomersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  on(deleteCustomer, (state, { id }) => ({
    ...state,
    deleting: true,
    deletingId: id,
    deleteError: null
  })),
  on(deleteCustomerSuccess, (state, { id }) => {
    const nextData = state.data.filter((item) => item.id !== id);
    const removed = nextData.length !== state.data.length;
    return {
      ...state,
      data: nextData,
      total: removed ? Math.max(0, state.total - 1) : state.total,
      deleting: false,
      deletingId: null,
      deleteError: null
    };
  }),
  on(deleteCustomerFailure, (state, { error }) => ({
    ...state,
    deleting: false,
    deletingId: null,
    deleteError: error
  }))
);
