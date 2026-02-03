import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly enabled = !environment.production;

  error(message: string, extra?: unknown) {
    if (!this.enabled) return;
    console.error(`[FintechWalletOpsDashboard] ${message}`, extra);
  }
  info(message: string, extra?: unknown) {
    if (!this.enabled) return;
    console.info(`[FintechWalletOpsDashboard] ${message}`, extra);
  }
}
