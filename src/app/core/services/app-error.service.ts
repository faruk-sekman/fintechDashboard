/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
  private lastToastSignature: string | null = null;
  private lastToastAt = 0;
  private readonly dedupeWindowMs = 1200;

  constructor(
    private readonly toast: ToastService,
    private readonly logger: LoggerService,
    private readonly i18n: TranslateService,
  ) {}

  handleError(error: unknown, context?: AppErrorContext) {
    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error, error.url ?? undefined, context);
      return;
    }
    this.handleUnknownError(error, context);
  }

  handleHttpError(err: HttpErrorResponse, url?: string, context?: AppErrorContext) {
    const messageKey = this.httpMessageKey(err.status);

    this.logger.error('HTTP error', { url, status: err.status, error: err.error, context });
    this.emitError(
      { messageKey, status: err.status, url, detail: err.error, createdAt: Date.now() },
      context,
    );
  }

  handleUnknownError(error: unknown, context?: AppErrorContext) {
    const messageKey = 'errors.unknown';
    this.logger.error('Unhandled UI error', { error, context });
    this.emitError({ messageKey, detail: error, createdAt: Date.now() }, context);
  }

  private emitError(event: AppErrorEvent, context?: AppErrorContext) {
    const signature = this.errorSignature(event);
    const now = Date.now();
    if (!context?.silent) {
      const shouldToast = !(
        this.lastToastSignature === signature && now - this.lastToastAt < this.dedupeWindowMs
      );
      if (shouldToast) {
        this.toast.error(this.i18n.instant(event.messageKey));
        this.lastToastSignature = signature;
        this.lastToastAt = now;
      }
    }
  }

  private httpMessageKey(status: number): string {
    if (status === 400) return 'errors.validation';
    if (status === 0) return 'errors.network';
    if (status === 404) return 'errors.notFound';
    if (status >= 500) return 'errors.server';
    return 'errors.unknown';
  }

  private errorSignature(event: AppErrorEvent): string {
    const status = event.status ?? '';
    if (event.status === 0) return `${event.messageKey}|${status}`;
    return `${event.messageKey}|${status}|${event.url ?? ''}`;
  }
}
