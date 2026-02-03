import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { loadingInterceptor } from '@core/interceptors/loading.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { GlobalErrorHandler } from '@core/services/global-error-handler';

import { TranslateLoader, TranslateModule, TranslateModuleConfig} from '@ngx-translate/core';
import { TranslateHttpLoader, TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';
import { environment } from '../environments/environment';
import { customersReducer } from '@features/customers/state/customers/customers.reducer';
import { CustomersEffects } from '@features/customers/state/customers/customers.effects';
import { transactionsReducer } from '@features/customers/state/transactions/transactions.reducer';
import { TransactionsEffects } from '@features/customers/state/transactions/transactions.effects';
import { latestCustomerReducer } from '@features/dashboard/state/latest-customer.reducer';
import { LatestCustomerEffects } from '@features/dashboard/state/latest-customer.effects';
import { AppErrorEffects } from '@core/state/app-error.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor, errorInterceptor])),
    provideAnimations(),
    provideToastr({
      timeOut: 3200,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      closeButton: true,
      iconClasses: {
        success: 'toast-success ri-checkbox-circle-line',
        error: 'toast-error ri-close-circle-line',
        info: 'toast-info ri-information-line',
        warning: 'toast-warning ri-alert-line'
      }
    }),
    provideStore({ customers: customersReducer, transactions: transactionsReducer, latestCustomer: latestCustomerReducer }),
    provideEffects([CustomersEffects, TransactionsEffects, LatestCustomerEffects, AppErrorEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: environment.production }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: environment.defaultLanguage,
        loader: { provide: TranslateLoader, useClass: TranslateHttpLoader },
        
      })
    ),
    {
      provide: TRANSLATE_HTTP_LOADER_CONFIG,
      useValue: { prefix: '/assets/i18n/', suffix: '.json' }
    }
  ]
};
