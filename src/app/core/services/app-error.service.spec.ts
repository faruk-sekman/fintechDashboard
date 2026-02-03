import { describe, it, expect, vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { AppErrorService } from '@core/services/app-error.service';

class ToastMock {
  error = vi.fn();
}
class LoggerMock {
  error = vi.fn();
}
class TranslateMock {
  instant = vi.fn((key: string) => key);
}

describe('AppErrorService', () => {
  it('maps http status to message keys and toasts', () => {
    const toast = new ToastMock();
    const logger = new LoggerMock();
    const i18n = new TranslateMock();
    const service = new AppErrorService(toast as any, logger as any, i18n as any);

    const err = new HttpErrorResponse({ status: 400, url: '/test' });
    service.handleHttpError(err);

    expect(logger.error).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('errors.validation');
  });

  it('handles network and server errors', () => {
    const toast = new ToastMock();
    const logger = new LoggerMock();
    const i18n = new TranslateMock();
    const service = new AppErrorService(toast as any, logger as any, i18n as any);

    service.handleHttpError(new HttpErrorResponse({ status: 0 }));
    service.handleHttpError(new HttpErrorResponse({ status: 500 }));

    expect(toast.error).toHaveBeenCalledWith('errors.network');
    expect(toast.error).toHaveBeenCalledWith('errors.server');
  });

  it('maps unknown http status to default message', () => {
    const toast = new ToastMock();
    const logger = new LoggerMock();
    const i18n = new TranslateMock();
    const service = new AppErrorService(toast as any, logger as any, i18n as any);

    service.handleHttpError(new HttpErrorResponse({ status: 401 }));
    expect(toast.error).toHaveBeenCalledWith('errors.unknown');
  });

  it('dedupes identical toasts in a short window', () => {
    const toast = new ToastMock();
    const logger = new LoggerMock();
    const i18n = new TranslateMock();
    const service = new AppErrorService(toast as any, logger as any, i18n as any);

    const err = new HttpErrorResponse({ status: 404, url: '/x' });
    service.handleHttpError(err);
    service.handleHttpError(err);

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('handles unknown errors', () => {
    const toast = new ToastMock();
    const logger = new LoggerMock();
    const i18n = new TranslateMock();
    const service = new AppErrorService(toast as any, logger as any, i18n as any);

    service.handleUnknownError(new Error('oops'));
    expect(logger.error).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('errors.unknown');
  });

  it('notify emits custom message without crashing', () => {
    const toast = new ToastMock();
    const logger = new LoggerMock();
    const i18n = new TranslateMock();
    const service = new AppErrorService(toast as any, logger as any, i18n as any);

    service.notify('errors.custom', { silent: true });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('handleError delegates http errors', () => {
    const toast = new ToastMock();
    const logger = new LoggerMock();
    const i18n = new TranslateMock();
    const service = new AppErrorService(toast as any, logger as any, i18n as any);
    const err = new HttpErrorResponse({ status: 404, url: '/x' });
    service.handleError(err);
    expect(toast.error).toHaveBeenCalledWith('errors.notFound');
  });

  it('handleError routes non-http errors to unknown handler', () => {
    const toast = new ToastMock();
    const logger = new LoggerMock();
    const i18n = new TranslateMock();
    const service = new AppErrorService(toast as any, logger as any, i18n as any);

    service.handleError('boom');
    expect(logger.error).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('errors.unknown');
  });
});
