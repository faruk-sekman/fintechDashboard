import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AppErrorService } from '@core/services/app-error.service';
import { environment } from '../../../environments/environment';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(AppErrorService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Web3 JSON-RPC reads are best-effort: Web3Service retries and degrades
      // gracefully, so transient RPC failures must not raise global error toasts/logs.
      if (!req.url.startsWith(environment.web3.rpcUrl)) {
        errorService.handleHttpError(err, req.url);
      }
      return throwError(() => err);
    })
  );
};
