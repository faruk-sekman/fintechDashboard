import { ErrorHandler, Injectable } from '@angular/core';
import { AppErrorService } from '@core/services/app-error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private errorService: AppErrorService) {}

  handleError(error: unknown): void {
    this.errorService.handleUnknownError(error);
  }
}
