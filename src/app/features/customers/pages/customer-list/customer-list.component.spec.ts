import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { CustomerListComponent } from './customer-list.component';
import { CustomersStore } from '@features/customers/state';

const customer = { id: '1', name: 'A', email: '', phone: '', walletNumber: '', nationalId: 0, dateOfBirth: '', address: { country: '', city: '', postalCode: '', line1: '' }, kycStatus: 'UNKNOWN', isActive: true, createdAt: '', updatedAt: '' } as any;

describe('CustomerListComponent', () => {
  const query$ = new BehaviorSubject(convertToParamMap({}));
  const deleteSuccess$ = new Subject<{ id: string }>();
  const storeMock = {
    data$: of([customer]),
    loading$: of(false),
    total$: of(1),
    deleting$: of(false),
    deletingId$: of(null),
    deleteSuccess$,
    load: vi.fn(),
    delete: vi.fn()
  };
  const routerMock = { navigate: vi.fn() };
  const routeMock = { queryParamMap: query$ };
  const i18nMock = { instant: (k: string) => k };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: storeMock }
      ]
    });
  });

  it('loads customers based on query params', () => {
    const component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(routerMock as any, routeMock as any, i18nMock as any)
    );
    component.ngOnInit();

    query$.next(convertToParamMap({ search: 'john', page: '2', isActive: 'true' }));
    expect(storeMock.load).toHaveBeenCalled();
    expect(component.page).toBe(2);
  });

  it('open/close delete modal and confirm deletion', () => {
    const component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(routerMock as any, routeMock as any, i18nMock as any)
    );

    component.openDelete(customer);
    expect(component.deleteModalOpen).toBe(true);
    component.confirmDelete();
    expect(storeMock.delete).toHaveBeenCalledWith('1');

    component.closeDelete();
    expect(component.deleteModalOpen).toBe(false);
    expect(component.deleteTarget).toBeNull();
  });

  it('updates query params on page change and clear filters', () => {
    const component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(routerMock as any, routeMock as any, i18nMock as any)
    );

    component.onPageChange({ page: 3, pageSize: 10 });
    expect(routerMock.navigate).toHaveBeenCalled();

    component.clearFilters();
    expect(routerMock.navigate).toHaveBeenCalled();
  });

  it('navigates to create and detail', () => {
    const component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(routerMock as any, routeMock as any, i18nMock as any)
    );
    component.create();
    component.open(customer);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/customers/new']);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/customers', '1']);
  });

  it('computes hasActiveFilters', () => {
    const component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(routerMock as any, routeMock as any, i18nMock as any)
    );

    expect(component.hasActiveFilters).toBe(false);
    component.search.setValue('x');
    expect(component.hasActiveFilters).toBe(true);
  });

  it('closes delete modal on delete success', () => {
    const component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(routerMock as any, routeMock as any, i18nMock as any)
    );
    component.ngOnInit();
    component.openDelete(customer);

    deleteSuccess$.next({ id: '1' });
    expect(component.deleteModalOpen).toBe(false);
  });

  it('updates query params from filter controls and cleans up', () => {
    vi.useFakeTimers();
    const component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(routerMock as any, routeMock as any, i18nMock as any)
    );
    component.ngOnInit();

    component.search.setValue('abc');
    vi.advanceTimersByTime(400);
    component.kycStatus.setValue('VERIFIED');
    component.isActive.setValue('true');
    expect(routerMock.navigate).toHaveBeenCalled();

    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('formats active column and evaluates deletingTarget$', () => {
    const deleting$ = new BehaviorSubject(false);
    const deletingId$ = new BehaviorSubject<string | null>(null);
    const deleteSuccess$Local = new Subject<{ id: string }>();
    const store = {
      data$: of([customer]),
      loading$: of(false),
      total$: of(1),
      deleting$,
      deletingId$,
      deleteSuccess$: deleteSuccess$Local,
      load: vi.fn(),
      delete: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: store }
      ]
    });

    const component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(routerMock as any, routeMock as any, i18nMock as any)
    );

    expect(component.columns[6].formatter?.(true as any, customer)).toBe('common.yes');
    expect(component.columns[6].formatter?.(false as any, customer)).toBe('common.no');
    const badgeColor = component.columns[5].badgeColor;
    if (typeof badgeColor === 'function') {
      expect(badgeColor('gray' as any, customer)).toBeDefined();
    }

    const results: boolean[] = [];
    const sub = component.deletingTarget$.subscribe((value) => results.push(value));
    component.openDelete(customer);
    deleting$.next(true);
    deletingId$.next('1');
    expect(results.at(-1)).toBe(true);
    sub.unsubscribe();
  });
});
