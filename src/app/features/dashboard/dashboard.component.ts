import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil } from 'rxjs/operators';

import { Customer, KycStatus } from '@shared/models/customer.model';
import { UiBadgeComponent } from '@shared/components/ui-badge/ui-badge.component';
import { UiSkeletonComponent } from '@shared/components/ui-skeleton/ui-skeleton.component';
import { KYC_STATUS_ORDER } from '@shared/utils/kyc-status';
import { CustomerStatusBadgeComponent } from '@features/customers/components/customer-status-badge/customer-status-badge.component';
import { CustomersStore } from '@features/customers/state';
import { LatestCustomerStore } from '@features/dashboard/state';

interface DashboardViewModel {
  total: number;
  activeCount: number;
  activeRate: number;
  inactiveCount: number;
  inactiveRate: number;
  avgAge: number | null;
  minAge: number | null;
  maxAge: number | null;
  kycList: { status: KycStatus; count: number }[];
  kycPercents: Record<KycStatus, number>;
  kycTotal: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, UiBadgeComponent, UiSkeletonComponent, CustomerStatusBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly customersStore = inject(CustomersStore);
  private readonly latestCustomerStore = inject(LatestCustomerStore);
  private readonly kycStatusOrder: KycStatus[] = KYC_STATUS_ORDER;
  private readonly destroy$ = new Subject<void>();

  internalUsers = [
    {
      initials: 'FA',
      name: 'Faruk Aydın',
      username: 'faruk',
      email: 'faruk@company.local',
      location: 'Istanbul, TR',
      role: 'Admin',
      status: 'Online'
    },
    {
      initials: 'MK',
      name: 'Merve Kaya',
      username: 'mervek',
      email: 'merve@company.local',
      location: 'Ankara, TR',
      role: 'Admin',
      status: 'Passive'
    },
    {
      initials: 'AA',
      name: 'Ahmet Arslan',
      username: 'ahmeta',
      email: 'ahmet@company.local',
      location: 'Izmir, TR',
      role: 'User',
      status: 'Passive'
    },
    {
      initials: 'KO',
      name: 'Kaan Oz',
      username: 'kaanoz',
      email: 'kaan@company.local',
      location: 'Bursa, TR',
      role: 'User',
      status: 'Passive'
    }
  ];

  readonly customers$ = this.customersStore.data$;
  readonly customersTotal$ = this.customersStore.total$;
  readonly customersLoading$ = this.customersStore.loading$;

  readonly latestCustomer$ = this.latestCustomerStore.customer$;
  readonly latestWallet$ = this.latestCustomerStore.wallet$;
  readonly latestLoading$ = this.latestCustomerStore.loading$;
  readonly latestLoaded$ = this.latestCustomerStore.loaded$;
  readonly latestCustomerSummary$ = combineLatest([this.latestCustomer$, this.latestWallet$]).pipe(
    map(([customer, wallet]) => ({ customer, wallet }))
  );

  readonly summaryVm$ = combineLatest([this.customers$, this.customersTotal$]).pipe(
    map(([customers, total]) => {
      const customerList: Customer[] = customers ?? [];
      const totalCount = total > 0 ? total : customerList.length;
      const activeCount = customerList.filter((c) => c.isActive).length;
      const inactiveCount = Math.max(totalCount - activeCount, 0);
      const activeRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
      const inactiveRate = totalCount > 0 ? Math.round((inactiveCount / totalCount) * 100) : 0;
      const kycCounts = this.countByKycStatus(customerList);
      const kycTotal = Object.values(kycCounts).reduce((sum, value) => sum + value, 0);
      const kycPercents = this.kycStatusOrder.reduce<Record<KycStatus, number>>((acc, status) => {
        const count = kycCounts[status] ?? 0;
        acc[status] = kycTotal > 0 ? Math.round((count / kycTotal) * 100) : 0;
        return acc;
      }, { UNKNOWN: 0, UNVERIFIED: 0, VERIFIED: 0, CONTRACTED: 0 });
      const ageStats = this.computeAgeStats(customerList);

      return {
        total: totalCount,
        activeCount,
        activeRate,
        inactiveCount,
        inactiveRate,
        avgAge: ageStats.avg,
        minAge: ageStats.min,
        maxAge: ageStats.max,
        kycList: this.kycStatusOrder.map((status) => ({ status, count: kycCounts[status] ?? 0 })),
        kycPercents,
        kycTotal
      } satisfies DashboardViewModel;
    })
  );

  ngOnInit(): void {
    this.customersStore.load({ page: 1, pageSize: 60 });

    this.customers$
      .pipe(
        map((customers) => this.findLatestUpdatedCustomer(customers ?? [])?.id ?? null),
        distinctUntilChanged(),
        filter((id): id is string => !!id),
        takeUntil(this.destroy$)
      )
      .subscribe((id) => this.latestCustomerStore.load(id));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private countByKycStatus(customers: Customer[]): Record<KycStatus, number> {
    const base: Record<KycStatus, number> = {
      UNKNOWN: 0,
      UNVERIFIED: 0,
      VERIFIED: 0,
      CONTRACTED: 0
    };

    for (const customer of customers) {
      base[customer.kycStatus] = (base[customer.kycStatus] ?? 0) + 1;
    }

    return base;
  }

  private computeAgeStats(customers: Customer[]): { avg: number | null; min: number | null; max: number | null } {
    let sum = 0;
    let count = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const customer of customers) {
      const age = this.getAge(customer.dateOfBirth);
      if (age === null) continue;
      sum += age;
      count += 1;
      min = Math.min(min, age);
      max = Math.max(max, age);
    }

    if (count === 0) {
      return { avg: null, min: null, max: null };
    }

    return {
      avg: Math.round(sum / count),
      min,
      max
    };
  }

  private getAge(dateOfBirth: string): number | null {
    const dob = new Date(dateOfBirth);
    if (!Number.isFinite(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDelta = today.getMonth() - dob.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  }

  private findLatestUpdatedCustomer(customers: Customer[]): Customer | null {
    let latest: Customer | null = null;
    let latestTs = -1;
    for (const customer of customers) {
      const ts = this.toTimestampMs(customer.updatedAt);
      if (ts > latestTs) {
        latestTs = ts;
        latest = customer;
      }
    }
    return latest;
  }

  private toTimestampMs(value: string): number {
    const date = new Date(value);
    const ts = date.getTime();
    return Number.isFinite(ts) ? ts : -1;
  }
}
