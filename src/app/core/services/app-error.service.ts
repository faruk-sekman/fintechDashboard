import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from '@core/services/logger.service';
import { ToastService } from '@core/services/toast.service';

export interface AppErrorEvent {
  messageKey: string;
  status?: number;
  url?: string;
  detail?: unknown;
  createdAt: number;
}

export interface AppErrorContext {
  source?: string;
  operation?: string;
  silent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppErrorService {
  private readonly _lastError$ = new BehaviorSubject<AppErrorEvent | null>(null);
  readonly lastError$ = this._lastError$.asObservable();
  private lastToastSignature: string | null = null;
  private lastToastAt = 0;
  private readonly dedupeWindowMs = 1200;

  constructor(
    private toast: ToastService,
    private logger: LoggerService,
    private i18n: TranslateService
  ) {}

  handleError(error: unknown, context?: AppErrorContext) {
    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error, error.url ?? undefined, context);
      return;
    }
    this.handleUnknownError(error, context);
  }

  notify(messageKey: string, context?: AppErrorContext, detail?: unknown) {
    this.emitError({ messageKey, detail, createdAt: Date.now() }, context);
  }

  handleHttpError(err: HttpErrorResponse, url?: string, context?: AppErrorContext) {
    const messageKey =
      err.status === 400 ? 'errors.validation' :
      err.status === 0 ? 'errors.network' :
      err.status === 404 ? 'errors.notFound' :
      err.status >= 500 ? 'errors.server' :
      'errors.unknown';

    this.logger.error('HTTP error', { url, status: err.status, error: err.error, context });
    this.emitError({ messageKey, status: err.status, url, detail: err.error, createdAt: Date.now() }, context);
  }

  handleUnknownError(error: unknown, context?: AppErrorContext) {
    const messageKey = 'errors.unknown';
    this.logger.error('Unhandled UI error', { error, context });
    this.emitError({ messageKey, detail: error, createdAt: Date.now() }, context);
  }

  private emitError(event: AppErrorEvent, context?: AppErrorContext) {
    const signature = event.status === 0
      ? `${event.messageKey}|${event.status ?? ''}`
      : `${event.messageKey}|${event.status ?? ''}|${event.url ?? ''}`;
    const now = Date.now();
    if (!context?.silent) {
      const shouldToast = !(this.lastToastSignature === signature && now - this.lastToastAt < this.dedupeWindowMs);
      if (shouldToast) {
        this.toast.error(this.i18n.instant(event.messageKey));
        this.lastToastSignature = signature;
        this.lastToastAt = now;
      }
    }
    this._lastError$.next(event);
  }
}
