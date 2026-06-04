/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormControl, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, Subject, combineLatest, merge } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  filter,
  finalize,
  map,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { CustomersApi } from '@core/api/customers.api';
import { WalletsApi } from '@core/api/wallets.api';
import { ListTransactionsParams } from '@core/api/transactions.api';
import { ToastService } from '@core/services/toast.service';
import { AppErrorService } from '@core/services/app-error.service';

import { Customer } from '@shared/models/customer.model';
import { Wallet } from '@shared/models/wallet.model';
import { Transaction } from '@shared/models/transaction.model';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiFormComponent } from '@shared/components/ui-form/ui-form.component';
import { UiSkeletonComponent } from '@shared/components/ui-skeleton/ui-skeleton.component';
import { UiTableComponent } from '@shared/components/ui-table/ui-table.component';
import { UiConfirmDialogComponent } from '@shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { CountUpDirective } from '@shared/directives/count-up.directive';
import { CustomerStatusBadgeComponent } from '@features/customers/components/customer-status-badge/customer-status-badge.component';
import { ColumnDef } from '@shared/components/ui-table/ui-table.types';
import { FieldConfig, SelectOption } from '@shared/components/ui-form/ui-form.types';
import { walletLimitsConsistencyValidator } from '@shared/validators/custom.validators';
import { TransactionsStore, CustomersStore } from '@features/customers/state';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    UiTableComponent,
    UiButtonComponent,
    UiFormComponent,
    UiSkeletonComponent,
    CustomerStatusBadgeComponent,
    UiConfirmDialogComponent,
    CountUpDirective,
  ],
  templateUrl: './customer-detail.component.html',
  styleUrl: './customer-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('limitsFormRef') limitsForm?: UiFormComponent;
  @ViewChild('txFiltersFormRef') txFiltersForm?: UiFormComponent;
  private readonly destroy$ = new Subject<void>();
  private readonly saveLimits$ = new Subject<void>();
  private readonly txReload$ = new Subject<void>();
  private readonly customersStore = inject(CustomersStore);
  private readonly transactionsStore = inject(TransactionsStore);
  id!: string;

  readonly customer = signal<Customer | null>(null);
  readonly wallet = signal<Wallet | null>(null);

  readonly loadingCustomer = signal(true);
  readonly loadingWallet = signal(true);

  readonly deleteModalOpen = signal(false);
  readonly deletingCustomer = signal(false);

  readonly limitsInitialValue = signal<Record<string, unknown> | null>(null);

  limitFields: FieldConfig[] = [
    {
      name: 'dailyLimit',
      labelKey: 'wallet.dailyLimit',
      type: 'number',
      validators: [Validators.required, Validators.min(1)],
    },
    {
      name: 'monthlyLimit',
      labelKey: 'wallet.monthlyLimit',
      type: 'number',
      validators: [Validators.required, Validators.min(1)],
    },
  ];
  limitFormValidators = [walletLimitsConsistencyValidator('dailyLimit', 'monthlyLimit')];

  readonly savingLimits = signal(false);

  readonly txFilterInitialValue = signal<Record<string, unknown>>({});

  readonly txPage = signal(1);
  readonly txPageSize = signal(10);

  txData$ = this.transactionsStore.data$;
  txTotal$ = this.transactionsStore.total$;
  loadingTx$ = this.transactionsStore.loading$;
  readonly showTxSkeleton = signal(true);
  private txLoadStarted = false;

  txColumns: ColumnDef<Transaction>[] = [
    { key: 'createdAt', headerKey: 'transactions.createdAt', type: 'date' },
    {
      key: 'type',
      headerKey: 'transactions.type',
      type: 'badge',
      badgeIcon: value => {
        if (value === 'CREDIT') return 'ri-bank-card-2-line';
        if (value === 'DEBIT') return 'ri-bank-card-line';
        return null;
      },
      badgeColor: value => {
        if (value === 'CREDIT') return 'indigo';
        if (value === 'DEBIT') return 'blue';
        return 'gray';
      },
    },
    {
      key: 'transferDirection',
      headerKey: 'transactions.direction',
      type: 'badge',
      badgeIcon: value => {
        if (value === 'INCOMING') return 'ri-arrow-down-line';
        if (value === 'OUTGOING') return 'ri-arrow-up-line';
        return null;
      },
      badgeColor: value => {
        if (value === 'INCOMING') return 'purple';
        if (value === 'OUTGOING') return 'pink';
        return 'gray';
      },
    },
    { key: 'amount', headerKey: 'transactions.amount', type: 'currency', widthClass: 'w-[170px]' },
    { key: 'description', headerKey: 'transactions.description' },
  ];

  txTypeOptions: SelectOption[] = [
    { labelKey: 'common.all', value: '' },
    { labelKey: 'DEBIT', value: 'DEBIT' },
    { labelKey: 'CREDIT', value: 'CREDIT' },
  ];

  txDirectionOptions: SelectOption[] = [
    { labelKey: 'common.all', value: '' },
    { labelKey: 'INCOMING', value: 'INCOMING' },
    { labelKey: 'OUTGOING', value: 'OUTGOING' },
  ];

  txCurrencyOptions: SelectOption[] = [
    { labelKey: 'common.all', value: '' },
    { labelKey: 'TRY', value: 'TRY' },
    { labelKey: 'USD', value: 'USD' },
    { labelKey: 'EUR', value: 'EUR' },
  ];

  txFilterFields: FieldConfig[] = [
    { name: 'type', labelKey: 'transactions.type', type: 'select', options: this.txTypeOptions },
    {
      name: 'direction',
      labelKey: 'transactions.direction',
      type: 'select',
      options: this.txDirectionOptions,
    },
    {
      name: 'currency',
      labelKey: 'transactions.currency',
      type: 'select',
      options: this.txCurrencyOptions,
    },
    { name: 'from', labelKey: 'transactions.from', type: 'datetime-local' },
    { name: 'to', labelKey: 'transactions.to', type: 'datetime-local', fieldClass: 'wide' },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly customersApi: CustomersApi,
    private readonly walletsApi: WalletsApi,
    private readonly toast: ToastService,
    private readonly appError: AppErrorService,
    private readonly i18n: TranslateService,
  ) {}

  ngOnInit(): void {
    this.txFilterInitialValue.set(this.buildTxFilterInitialValue());

    const id$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter((id): id is string => !!id),
      distinctUntilChanged(),
      tap(id => {
        this.id = id;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    // Transactions load from the route id (not ViewChild/form timing), so the panel
    // always populates and reloads correctly whenever the customer id changes.
    id$
      .pipe(
        tap(() => this.txPage.set(1)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.dispatchTransactionsLoad());

    id$
      .pipe(
        tap(() => this.loadingCustomer.set(true)),
        switchMap(id =>
          this.customersApi.getById(id).pipe(
            tap(c => {
              this.customer.set(c);
            }),
            catchError(err => {
              this.appError.handleError(err, {
                source: 'CustomerDetailComponent',
                operation: 'loadCustomer',
              });
              return EMPTY;
            }),
            finalize(() => {
              this.loadingCustomer.set(false);
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe();

    id$
      .pipe(
        tap(() => this.loadingWallet.set(true)),
        switchMap(id =>
          this.walletsApi.getByCustomerId(id).pipe(
            tap(w => {
              this.wallet.set(w);
              this.limitsInitialValue.set({
                dailyLimit: w.dailyLimit,
                monthlyLimit: w.monthlyLimit,
              });
            }),
            catchError(err => {
              this.appError.handleError(err, {
                source: 'CustomerDetailComponent',
                operation: 'loadWallet',
              });
              return EMPTY;
            }),
            finalize(() => {
              this.loadingWallet.set(false);
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe();

    this.loadingTx$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      if (loading) {
        this.txLoadStarted = true;
        this.showTxSkeleton.set(true);
        return;
      }
      if (this.txLoadStarted) {
        this.showTxSkeleton.set(false);
      }
    });

    this.saveLimits$
      .pipe(
        exhaustMap(() => {
          const form = this.limitsForm?.form;
          if (!form) return EMPTY;
          form.updateValueAndValidity({ emitEvent: false });
          form.markAllAsTouched();
          if (form.invalid) return EMPTY;

          const value = form.getRawValue() as {
            dailyLimit?: number | null;
            monthlyLimit?: number | null;
          };
          const dailyLimit = Number(value.dailyLimit);
          const monthlyLimit = Number(value.monthlyLimit);
          if (
            Number.isFinite(dailyLimit) &&
            Number.isFinite(monthlyLimit) &&
            dailyLimit >= monthlyLimit
          ) {
            form.setErrors({ ...(form.errors ?? {}), limitMismatch: true });
            return EMPTY;
          } else if (form.errors?.['limitMismatch']) {
            const { limitMismatch, ...rest } = form.errors as Record<string, unknown>;
            this.setRemainingErrors(form, rest);
          }

          const payload = { dailyLimit, monthlyLimit };
          this.savingLimits.set(true);
          return this.walletsApi.updateLimits(this.id, payload).pipe(
            tap(w => {
              this.wallet.set(w);
              this.limitsInitialValue.set({
                dailyLimit: w.dailyLimit,
                monthlyLimit: w.monthlyLimit,
              });
              this.toast.success(this.i18n.instant('wallet.updated'));
              form.reset(this.limitsInitialValue, { emitEvent: false });
              form.markAsPristine();
              form.markAsUntouched();
              form.updateValueAndValidity({ emitEvent: false });
            }),
            catchError(err => {
              this.appError.handleError(err, {
                source: 'CustomerDetailComponent',
                operation: 'updateLimits',
              });
              return EMPTY;
            }),
            finalize(() => {
              this.savingLimits.set(false);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();

    combineLatest([this.customersStore.deleting$, this.customersStore.deletingId$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([deleting, deletingId]) => {
        this.deletingCustomer.set(deleting && deletingId === this.id);
      });

    this.customersStore.deleteSuccess$
      .pipe(
        filter(({ id }) => id === this.id),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.closeDelete();
        this.router.navigate(['/customers']);
      });
  }

  ngAfterViewInit(): void {
    this.setupTxStream();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  back() {
    this.router.navigate(['/customers']);
  }
  edit() {
    this.router.navigate(['/customers', this.id, 'edit']);
  }
  web3Risk() {
    this.router.navigate(['/customers', this.id, 'web3-risk']);
  }

  openDelete() {
    this.deleteModalOpen.set(true);
  }

  closeDelete() {
    this.deleteModalOpen.set(false);
  }

  confirmDelete() {
    if (!this.id || this.deletingCustomer()) return;
    this.customersStore.delete(this.id);
  }

  saveLimits() {
    this.saveLimits$.next();
  }

  resetLimits() {
    const form = this.limitsForm?.form;
    if (!form) return;
    const value = this.currentLimitsInitialValue();
    form.reset(value, { emitEvent: false });
    form.markAsPristine();
    form.markAsUntouched();
    form.updateValueAndValidity({ emitEvent: false });
  }

  onTxPageChange(e: { page: number; pageSize: number }) {
    this.txPage.set(e.page);
    this.txPageSize.set(e.pageSize);
    this.txReload$.next();
  }

  clearTxFilters() {
    const defaults = this.buildTxFilterInitialValue();
    if (this.txFiltersForm?.form) {
      this.txFiltersForm.form.reset(defaults, { emitEvent: false });
      this.txFiltersForm.form.markAsPristine();
    } else {
      this.txFilterInitialValue.set(defaults);
    }
    this.txPage.set(1);
    this.txReload$.next();
  }

  private setupTxStream() {
    const form = this.txFiltersForm?.form;
    if (!form) return;

    const formChanges$ = form.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      tap(() => this.txPage.set(1)),
      filter(() => this.syncTxRangeValidity()),
    );

    const manualReload$ = this.txReload$.pipe(filter(() => this.syncTxRangeValidity()));

    merge(formChanges$, manualReload$)
      .pipe(
        tap(() => this.dispatchTransactionsLoad()),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  private syncTxRangeValidity(): boolean {
    const form = this.txFiltersForm?.form;
    if (!form) return true;

    const fromCtrl = form.get('from') as FormControl | null;
    const toCtrl = form.get('to') as FormControl | null;
    if (!fromCtrl || !toCtrl) return true;

    const from = fromCtrl.value as string;
    const to = toCtrl.value as string;

    const clearRange = (ctrl: FormControl) => {
      if (!ctrl.errors || !ctrl.errors['range']) return;
      const { range, ...rest } = ctrl.errors as Record<string, any>;
      this.setRemainingErrors(ctrl, rest);
    };

    if (!from || !to) {
      clearRange(fromCtrl);
      clearRange(toCtrl);
      return true;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      clearRange(fromCtrl);
      clearRange(toCtrl);
      return true;
    }

    const isValid = fromDate.getTime() <= toDate.getTime();
    if (!isValid) {
      fromCtrl.setErrors({ ...(fromCtrl.errors ?? {}), range: true });
      toCtrl.setErrors({ ...(toCtrl.errors ?? {}), range: true });
      return false;
    }

    clearRange(fromCtrl);
    clearRange(toCtrl);
    return true;
  }

  private setRemainingErrors(
    control: AbstractControl | null,
    errors: Record<string, unknown>,
  ): void {
    if (Object.keys(errors).length) {
      control?.setErrors(errors);
      return;
    }
    control?.setErrors(null);
  }

  private currentLimitsInitialValue(): Record<string, unknown> {
    return this.limitsInitialValue() ?? { dailyLimit: null, monthlyLimit: null };
  }

  private buildTxFilterInitialValue() {
    const range = this.defaultTxRange();
    return {
      type: '',
      direction: '',
      currency: '',
      from: range.from,
      to: range.to,
    };
  }

  private defaultTxRange() {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 12);
    return {
      from: this.toDateTimeLocal(from),
      to: this.toDateTimeLocal(now),
    };
  }

  private toDateTimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private dispatchTransactionsLoad() {
    const v = (this.txFiltersForm?.form?.getRawValue() ?? this.txFilterInitialValue()) as {
      type?: string;
      direction?: string;
      currency?: string;
      from?: string;
      to?: string;
    } | null;

    const params: ListTransactionsParams = {
      page: this.txPage(),
      pageSize: this.txPageSize(),
      type: ((v?.type ?? '') || undefined) as any,
      transferDirection: ((v?.direction ?? '') || undefined) as any,
      currency: (v?.currency ?? '') || undefined,
      from: (v?.from ?? '') || undefined,
      to: (v?.to ?? '') || undefined,
    };

    this.transactionsStore.load(this.id, params);
  }
}
