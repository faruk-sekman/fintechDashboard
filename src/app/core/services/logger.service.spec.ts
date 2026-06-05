/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('LoggerService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('../../../environments/environment');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.doUnmock('../../../environments/environment');
    vi.restoreAllMocks();
  });

  it('logs in non-production environment', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const { LoggerService } = await import('./logger.service');
    const logger = new LoggerService();
    logger.error('boom');
    logger.info('info');

    expect(errorSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
  });

  it('redacts sensitive fields and appends nested error details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { LoggerService } = await import('./logger.service');
    const logger = new LoggerService();
    const error = new Error('request failed');

    logger.error('boom', {
      token: 'secret-token',
      nested: {
        apiKey: 'secret-key',
        safe: 'visible',
        deep: { value: 'not logged past depth two' },
      },
      error,
    });

    const [message, extra] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(message).toContain('Error: request failed');
    expect(extra['token']).toBe('[redacted]');
    expect((extra['nested'] as Record<string, unknown>)['apiKey']).toBe('[redacted]');
    expect((extra['nested'] as Record<string, unknown>)['safe']).toBe('visible');
    expect((extra['nested'] as Record<string, unknown>)['deep']).toBe('[Object]');
    expect((extra['error'] as Record<string, unknown>)['message']).toBe('request failed');
  });

  it('suppresses logs in production', async () => {
    vi.resetModules();
    vi.doMock('../../../environments/environment', () => ({
      environment: { production: true, apiBaseUrl: '', defaultLanguage: 'tr' },
    }));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const { LoggerService } = await import('./logger.service');
    const logger = new LoggerService();
    logger.error('boom');
    logger.info('info');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });
});
