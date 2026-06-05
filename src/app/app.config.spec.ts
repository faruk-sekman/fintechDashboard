/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from './app.config';

describe('appConfig', () => {
  afterEach(() => {
    vi.doUnmock('../environments/environment');
    vi.resetModules();
  });

  it('defines providers', () => {
    expect(appConfig.providers?.length).toBeGreaterThan(0);
  });

  it('omits store devtools provider in production configuration', async () => {
    vi.resetModules();
    vi.doMock('../environments/environment', () => ({
      environment: {
        production: true,
        apiBaseUrl: 'https://example.invalid',
        defaultLanguage: 'tr',
      },
    }));

    const { appConfig: productionConfig } = await import('./app.config');

    expect(productionConfig.providers?.length).toBe((appConfig.providers?.length ?? 0) - 1);
  });
});
