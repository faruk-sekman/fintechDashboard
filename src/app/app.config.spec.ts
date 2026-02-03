import { describe, it, expect } from 'vitest';
import { appConfig } from './app.config';

describe('appConfig', () => {
  it('defines providers', () => {
    expect(appConfig.providers?.length).toBeGreaterThan(0);
  });
});
