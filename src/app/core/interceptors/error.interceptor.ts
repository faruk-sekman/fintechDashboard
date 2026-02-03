import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AppErrorService } from '@core/services/app-error.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(AppErrorService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      errorService.handleHttpError(err, req.url);
      return throwError(() => err);
    })
  );
};
