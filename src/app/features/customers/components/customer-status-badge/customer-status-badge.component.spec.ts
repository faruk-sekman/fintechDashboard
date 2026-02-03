import { describe, it, expect } from 'vitest';
import { CustomerStatusBadgeComponent } from '@features/customers/components/customer-status-badge/customer-status-badge.component';

describe('CustomerStatusBadgeComponent', () => {
  it('maps status to color', () => {
    const comp = new CustomerStatusBadgeComponent();
    comp.status = 'VERIFIED';
    expect(comp.color).toBe('green');
    comp.status = 'UNKNOWN';
    expect(comp.color).toBe('zinc');
  });
});
