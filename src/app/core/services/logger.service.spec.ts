import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('LoggerService', () => {
  beforeEach(() => {
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

  it('suppresses logs in production', async () => {
    vi.resetModules();
    vi.doMock('../../../environments/environment', () => ({
      environment: { production: true, apiBaseUrl: '', defaultLanguage: 'tr' }
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
