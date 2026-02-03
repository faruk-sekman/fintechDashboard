import { describe, it, expect } from 'vitest';
import { LoadingService } from '@core/services/loading.service';

describe('LoadingService', () => {
  it('toggles loading state based on active count', () => {
    const service = new LoadingService();
    const values: boolean[] = [];
    const sub = service.loading$.subscribe((v) => values.push(v));

    service.start();
    service.start();
    service.end();
    service.end();

    expect(values).toEqual([false, true, false]);
    sub.unsubscribe();
  });
});
