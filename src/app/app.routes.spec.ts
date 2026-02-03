import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';

describe('app routes', () => {
  it('includes dashboard and customers routes', () => {
    const root = routes.find((r) => r.path === '');
    expect(root).toBeTruthy();
    const children = (root as any).children as any[];
    const dashboard = children.find((c) => c.path === 'dashboard');
    const customers = children.find((c) => c.path === 'customers');
    expect(dashboard).toBeTruthy();
    expect(customers).toBeTruthy();
  });

  it('has wildcard redirect', () => {
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard?.redirectTo).toBe('');
  });

  it('resolves lazy components and children', async () => {
    const root = routes.find((r) => r.path === '') as any;
    const main = await root.loadComponent();
    expect(main).toBeDefined();

    const children = root.children as any[];
    const dashboard = children.find((c) => c.path === 'dashboard');
    const dashboardComp = await dashboard.loadComponent();
    expect(dashboardComp).toBeDefined();

    const customers = children.find((c) => c.path === 'customers');
    const customerRoutes = await customers.loadChildren();
    expect(Array.isArray(customerRoutes)).toBe(true);
  });
});
