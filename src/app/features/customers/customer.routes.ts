import { Routes } from '@angular/router';

export const customerRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('@features/customers/pages/customer-list/customer-list.component').then((m) => m.CustomerListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('@features/customers/pages/customer-form/customer-form.component').then((m) => m.CustomerFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('@features/customers/pages/customer-detail/customer-detail.component').then((m) => m.CustomerDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('@features/customers/pages/customer-form/customer-form.component').then((m) => m.CustomerFormComponent)
  },
  {
    path: ':id/web3-risk',
    loadComponent: () => import('@features/customers/pages/web3-risk/web3-risk.component').then((m) => m.Web3RiskComponent)
  }
];
