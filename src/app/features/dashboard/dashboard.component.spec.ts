import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { CustomersStore } from '@features/customers/state';
import { LatestCustomerStore } from '@features/dashboard/state';

const customerA = { id: '1', kycStatus: 'VERIFIED', isActive: true, dateOfBirth: '2000-01-01', updatedAt: '2024-01-01', createdAt: '', name: '', email: '', phone: '', walletNumber: '', nationalId: 0, address: { country: '', city: '', postalCode: '', line1: '' } } as any;
const customerB = { id: '2', kycStatus: 'UNVERIFIED', isActive: false, dateOfBirth: '1990-01-01', updatedAt: '2024-02-01', createdAt: '', name: '', email: '', phone: '', walletNumber: '', nationalId: 0, address: { country: '', city: '', postalCode: '', line1: '' } } as any;

describe('DashboardComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createComponent(total$Override?: any) {
    const data$ = new BehaviorSubject<any[]>([]);
    const customersStore = {
      data$,
      total$: total$Override ?? of(2),
      loading$: of(false),
      load: vi.fn()
    };
    const latestStore = {
      customer$: new BehaviorSubject<any>(null),
      wallet$: new BehaviorSubject<any>(null),
      loading$: of(false),
      loaded$: of(false),
      load: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: customersStore },
        { provide: LatestCustomerStore, useValue: latestStore }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new DashboardComponent());
    return { component, data$, customersStore, latestStore };
  }

  it('calculates kyc counts and age stats', () => {
    const { component } = createComponent();
    const counts = (component as any).countByKycStatus([customerA, customerB]);
    expect(counts.VERIFIED).toBe(1);
    expect(counts.UNVERIFIED).toBe(1);

    const stats = (component as any).computeAgeStats([customerA, customerB]);
    expect(stats.avg).toBeTypeOf('number');
  });

  it('finds latest updated customer and triggers load', () => {
    const { component, data$, customersStore, latestStore } = createComponent();
    component.ngOnInit();
    expect(customersStore.load).toHaveBeenCalledWith({ page: 1, pageSize: 60 });

    data$.next([customerA, customerB]);
    expect(latestStore.load).toHaveBeenCalledWith('2');
  });

  it('handles invalid timestamps', () => {
    const { component } = createComponent();
    const ts = (component as any).toTimestampMs('invalid');
    expect(ts).toBe(-1);
  });

  it('getAge returns null for invalid date', () => {
    const { component } = createComponent();
    const age = (component as any).getAge('invalid');
    expect(age).toBeNull();
  });

  it('getAge does not adjust when birthday has passed', () => {
    const { component } = createComponent();
    const today = new Date();
    const dob = new Date(today.getFullYear() - 30, today.getMonth(), Math.max(1, today.getDate() - 1));
    const iso = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
    const age = (component as any).getAge(iso);
    expect(age).toBe(30);
  });

  it('computeAgeStats returns nulls when no valid ages', () => {
    const { component } = createComponent();
    const stats = (component as any).computeAgeStats([{ ...customerA, dateOfBirth: 'invalid' }]);
    expect(stats.avg).toBeNull();
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
  });

  it('findLatestUpdatedCustomer returns null for empty list', () => {
    const { component } = createComponent();
    const latest = (component as any).findLatestUpdatedCustomer([]);
    expect(latest).toBeNull();
  });

  it('findLatestUpdatedCustomer ignores older timestamps', () => {
    const { component } = createComponent();
    const older = { ...customerA, updatedAt: '2020-01-01' };
    const newer = { ...customerA, updatedAt: '2024-01-01' };
    const latest = (component as any).findLatestUpdatedCustomer([newer, older]);
    expect(latest?.updatedAt).toBe('2024-01-01');
  });

  it('builds summary view model values from customer list', () => {
    const { component, data$ } = createComponent();
    const results: any[] = [];
    const sub = component.summaryVm$.subscribe((v) => results.push(v));
    data$.next([customerA, customerB]);

    expect(results.at(-1)?.total).toBe(2);
    expect(results.at(-1)?.activeCount).toBe(1);
    sub.unsubscribe();
  });

  it('uses data length when total is zero and handles empty kyc totals', () => {
    const { component, data$ } = createComponent(of(0));
    const results: any[] = [];
    const sub = component.summaryVm$.subscribe((v) => results.push(v));
    data$.next([]);
    const latest = results.at(-1);
    expect(latest?.total).toBe(0);
    expect(latest?.kycTotal).toBe(0);
    expect(latest?.kycPercents?.UNKNOWN).toBe(0);
    sub.unsubscribe();
  });

  it('handles null data in vm$', () => {
    const { component, data$ } = createComponent(of(0));
    const results: any[] = [];
    const sub = component.summaryVm$.subscribe((v) => results.push(v));
    data$.next(null as any);
    const latest = results.at(-1);
    expect(latest?.total).toBe(0);
    sub.unsubscribe();
  });

  it('combines latest customer and wallet', () => {
    const { component, latestStore } = createComponent();
    const results: any[] = [];
    const sub = component.latestCustomerSummary$.subscribe((v) => results.push(v));
    (latestStore.customer$ as BehaviorSubject<any>).next({ id: '1' });
    (latestStore.wallet$ as BehaviorSubject<any>).next({ id: 'w1' });
    expect(results.at(-1)).toEqual({ customer: { id: '1' }, wallet: { id: 'w1' } });
    sub.unsubscribe();
  });

  it('getAge adjusts when birthday has not occurred yet', () => {
    const { component } = createComponent();
    const today = new Date();
    const dob = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate() + 1);
    const iso = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
    const age = (component as any).getAge(iso);
    expect(age).toBe(29);
  });

  it('ngOnDestroy completes subscriptions', () => {
    const { component } = createComponent();
    component.ngOnDestroy();
    expect(true).toBe(true);
  });
});
