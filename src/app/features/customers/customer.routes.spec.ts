import { describe, it, expect } from 'vitest';
import { customerRoutes } from '@features/customers/customer.routes';

describe('customer routes', () => {
  it('defines list, create, detail and edit routes', () => {
    const paths = customerRoutes.map((r) => r.path);
    expect(paths).toEqual(['', 'new', ':id', ':id/edit']);
  });

  it('resolves lazy components', async () => {
    for (const route of customerRoutes) {
      const comp = await (route as any).loadComponent();
      expect(comp).toBeDefined();
    }
  });
});
