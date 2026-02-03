import { Injectable, inject } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { filter, tap } from 'rxjs/operators';

import { AppErrorService } from '@core/services/app-error.service';

type FailureAction = Action & { error?: unknown };

@Injectable()
export class AppErrorEffects {
  private actions$ = inject(Actions);
  private appError = inject(AppErrorService);

  notifyFailures$ = createEffect(
    () =>
      this.actions$.pipe(
        filter((action): action is FailureAction => action.type.endsWith('Failure')),
        tap((action) => {
          if (action.error) {
            this.appError.handleError(action.error, { source: 'NgRx', operation: action.type });
          }
        })
      ),
    { dispatch: false }
  );
}
