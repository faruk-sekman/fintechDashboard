import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('@features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'customers',
        loadChildren: () => import('@features/customers/customer.routes').then((m) => m.customerRoutes)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
