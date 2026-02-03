import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';

import { Customer, KycStatus } from '@shared/models/customer.model';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiInputComponent } from '@shared/components/ui-input/ui-input.component';
import { UiSkeletonComponent } from '@shared/components/ui-skeleton/ui-skeleton.component';
import { UiSelectComponent } from '@shared/components/ui-select/ui-select.component';
import { UiTableComponent } from '@shared/components/ui-table/ui-table.component';
import { ColumnDef } from '@shared/components/ui-table/ui-table.types';
import { SelectOption } from '@shared/components/ui-form/ui-form.types';
import { getKycStatusBadgeColor, KYC_STATUS_FILTER_OPTIONS } from '@shared/utils/kyc-status';
import { CustomersStore } from '@features/customers/state';
import { UiConfirmDialogComponent } from '@shared/components/ui-confirm-dialog/ui-confirm-dialog.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    UiTableComponent,
    UiInputComponent,
    UiSelectComponent,
    UiButtonComponent,
    UiSkeletonComponent,
    UiConfirmDialogComponent
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private deleteTarget$ = new BehaviorSubject<Customer | null>(null);

  search = new FormControl<string>('', { nonNullable: true });
  kycStatus = new FormControl<string>('', { nonNullable: true });
  isActive = new FormControl<string>('', { nonNullable: true });

  page = 1;
  pageSize = 10;

  deleteModalOpen = false;
  deleteTarget: Customer | null = null;

  columns: ColumnDef<Customer>[] = [
    { key: 'name', headerKey: 'customers.name' },
    { key: 'email', headerKey: 'customers.email' },
    { key: 'phone', headerKey: 'customers.phone' },
    { key: 'walletNumber', headerKey: 'customers.walletNumber', widthClass: 'w-[170px]' },
    { key: 'nationalId', headerKey: 'customers.nationalId', widthClass: 'w-[150px]' },
    {
      key: 'kycStatus',
      headerKey: 'customers.kycStatus',
      type: 'badge',
      widthClass: 'w-[140px]',
      badgeColor: (value) => getKycStatusBadgeColor(value)
    },
    {
      key: 'isActive',
      headerKey: 'customers.active',
      type: 'toggle',
      widthClass: 'w-[120px]',
      formatter: (value) => (value ? this.i18n.instant('common.yes') : this.i18n.instant('common.no'))
    }
  ];

  kycStatusOptions: SelectOption[] = KYC_STATUS_FILTER_OPTIONS;

  activeOptions: SelectOption[] = [
    { labelKey: 'common.all', value: '' },
    { labelKey: 'common.yes', value: 'true' },
    { labelKey: 'common.no', value: 'false' }
  ];

  private customersStore = inject(CustomersStore);
  data$ = this.customersStore.data$;
  loading$ = this.customersStore.loading$;
  total$ = this.customersStore.total$;
  deleting$ = this.customersStore.deleting$;
  deletingId$ = this.customersStore.deletingId$;
  deletingTarget$ = combineLatest([this.deleting$, this.deletingId$, this.deleteTarget$]).pipe(
    map(([deleting, deletingId, target]) => !!target && deleting && deletingId === target.id)
  );

  constructor(private router: Router, private route: ActivatedRoute, private i18n: TranslateService) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const search = params.get('search') ?? '';
      const kyc = params.get('kycStatus') ?? '';
      const active = params.get('isActive') ?? '';
      const page = Number(params.get('page')) || 1;

      this.search.setValue(search, { emitEvent: false });
      this.kycStatus.setValue(kyc, { emitEvent: false });
      this.isActive.setValue(active, { emitEvent: false });
      this.page = Math.max(1, page);

      this.load();
    });

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => this.updateQueryParams({ search: value, page: 1 }));

    this.kycStatus.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => this.updateQueryParams({ kycStatus: value, page: 1 }));

    this.isActive.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => this.updateQueryParams({ isActive: value, page: 1 }));

    this.customersStore.deleteSuccess$
      .pipe(
        filter(({ id }) => !!this.deleteTarget && this.deleteTarget.id === id),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.closeDelete();
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  create() {
    this.router.navigate(['/customers/new']);
  }

  openDelete(row: Customer) {
    this.deleteTarget = row;
    this.deleteTarget$.next(row);
    this.deleteModalOpen = true;
  }

  closeDelete() {
    this.deleteModalOpen = false;
    this.deleteTarget = null;
    this.deleteTarget$.next(null);
  }

  confirmDelete() {
    if (!this.deleteTarget) return;
    this.customersStore.delete(this.deleteTarget.id);
  }

  onPageChange(e: { page: number; pageSize: number }) {
    this.page = e.page;
    this.pageSize = e.pageSize;
    this.updateQueryParams({ page: e.page });
  }

  open(row: Customer) {
    this.router.navigate(['/customers', row.id]);
  }

  clearFilters() {
    this.updateQueryParams({ search: '', kycStatus: '', isActive: '', page: 1 });
  }

  get hasActiveFilters(): boolean {
    return !!(this.search.value || this.kycStatus.value || this.isActive.value);
  }

  private load() {
    const status = (this.kycStatus.value || undefined) as KycStatus | undefined;
    const active =
      this.isActive.value === '' ? undefined : this.isActive.value === 'true';

    this.customersStore.load({
      page: this.page,
      pageSize: this.pageSize,
      search: this.search.value || undefined,
      kycStatus: status,
      isActive: active
    });
  }

  private updateQueryParams(params: {
    search?: string;
    kycStatus?: string;
    isActive?: string;
    page?: number;
  }) {
    const nextSearch = params.search ?? this.search.value;
    const nextKyc = params.kycStatus ?? this.kycStatus.value;
    const nextActive = params.isActive ?? this.isActive.value;
    const nextPage = params.page ?? this.page;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: nextSearch ? nextSearch : null,
        kycStatus: nextKyc ? nextKyc : null,
        isActive: nextActive ? nextActive : null,
        page: nextPage && nextPage > 1 ? nextPage : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
