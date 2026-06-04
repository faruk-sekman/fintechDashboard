import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly enabled = !environment.production;

  error(message: string, extra?: unknown) {
    if (!this.enabled) return;
    console.error(`[FintechWalletOpsDashboard] ${message}${this.toMessageSuffix(extra)}`, this.toLoggable(extra));
  }
  info(message: string, extra?: unknown) {
    if (!this.enabled) return;
    console.info(`[FintechWalletOpsDashboard] ${message}`, this.toLoggable(extra));
  }

  private toLoggable(value: unknown, depth = 0): unknown {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack?.split('\n').slice(0, 6).join('\n')
      };
    }

    if (!value || typeof value !== 'object') return value;
    if (depth >= 2) return '[Object]';

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        this.isSensitiveKey(key) ? '[redacted]' : this.toLoggable(entry, depth + 1)
      ])
    );
  }

  private isSensitiveKey(key: string): boolean {
    return /token|secret|password|api[-_]?key|authorization|cookie/i.test(key);
  }

  private toMessageSuffix(value: unknown): string {
    const error = value instanceof Error
      ? value
      : value && typeof value === 'object' && (value as { error?: unknown }).error instanceof Error
        ? (value as { error: Error }).error
        : null;

    return error ? ` | ${error.name}: ${error.message}` : '';
  }
}
