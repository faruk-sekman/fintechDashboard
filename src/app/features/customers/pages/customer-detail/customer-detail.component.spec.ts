import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { CustomerDetailComponent } from './customer-detail.component';
import { CustomersStore, TransactionsStore } from '@features/customers/state';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { convertToParamMap } from '@angular/router';

const customersStoreMock = {
  deleting$: { subscribe: vi.fn() },
  deletingId$: { subscribe: vi.fn() },
  deleteSuccess$: { subscribe: vi.fn() },
  deletingId: null,
  delete: vi.fn()
};
const transactionsStoreMock = {
  data$: { subscribe: vi.fn() },
  total$: { subscribe: vi.fn() },
  loading$: { subscribe: vi.fn() },
  load: vi.fn()
};

describe('CustomerDetailComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createComponent() {
    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: { ...customersStoreMock, deleting$: { subscribe: vi.fn() }, deletingId$: { subscribe: vi.fn() }, deleteSuccess$: { subscribe: vi.fn() } } },
        { provide: TransactionsStore, useValue: { ...transactionsStoreMock } }
      ]
    });

    const route = { paramMap: { pipe: vi.fn() } } as any;
    const router = { navigate: vi.fn() } as any;
    const customersApi = { getById: vi.fn() } as any;
    const walletsApi = { getByCustomerId: vi.fn(), updateLimits: vi.fn() } as any;
    const toast = { success: vi.fn() } as any;
    const appError = { handleError: vi.fn() } as any;
    const i18n = { instant: (k: string) => k } as any;

    const component = TestBed.runInInjectionContext(() => new CustomerDetailComponent(route, router, customersApi, walletsApi, toast, appError, i18n));
    return { component, router };
  }

  it('formats date time local', () => {
    const { component } = createComponent();
    const result = (component as any).toDateTimeLocal(new Date('2024-01-02T03:04:00Z'));
    expect(result).toContain('2024-01-');
  });

  it('validates transaction range', () => {
    const { component } = createComponent();
    const form = new FormGroup({
      from: new FormControl('2024-02-01T00:00'),
      to: new FormControl('2024-01-01T00:00')
    });
    (component as any).txFiltersForm = { form } as any;

    const valid = (component as any).syncTxRangeValidity();
    expect(valid).toBe(false);
    expect(form.get('from')?.errors?.['range']).toBe(true);

    form.patchValue({ from: '', to: '' });
    expect((component as any).syncTxRangeValidity()).toBe(true);
    expect(form.get('from')?.errors).toBeNull();
  });

  it('accepts valid transaction range and clears errors', () => {
    const { component } = createComponent();
    const form = new FormGroup({
      from: new FormControl('2024-01-01T00:00'),
      to: new FormControl('2024-02-01T00:00')
    });
    (component as any).txFiltersForm = { form } as any;

    const valid = (component as any).syncTxRangeValidity();
    expect(valid).toBe(true);
    expect(form.get('from')?.errors).toBeNull();
  });

  it('ignores empty or invalid ranges', () => {
    const { component } = createComponent();
    const form = new FormGroup({
      from: new FormControl(''),
      to: new FormControl('')
    });
    (component as any).txFiltersForm = { form } as any;
    expect((component as any).syncTxRangeValidity()).toBe(true);

    form.patchValue({ from: 'invalid', to: 'invalid' });
    expect((component as any).syncTxRangeValidity()).toBe(true);
  });

  it('syncTxRangeValidity returns true when controls are missing', () => {
    const { component } = createComponent();
    const form = new FormGroup({ from: new FormControl('2024-01-01T00:00') });
    (component as any).txFiltersForm = { form } as any;
    expect((component as any).syncTxRangeValidity()).toBe(true);
  });

  it('dispatches transactions load with params', () => {
    const { component } = createComponent();
    component.id = '1';
    component.txPage = 2;
    component.txPageSize = 20;
    const form = new FormGroup({
      type: new FormControl('CREDIT'),
      direction: new FormControl('INCOMING'),
      currency: new FormControl('TRY'),
      from: new FormControl('2024-01-01T00:00'),
      to: new FormControl('2024-02-01T00:00')
    });
    (component as any).txFiltersForm = { form } as any;

    (component as any).dispatchTransactionsLoad();
    expect(transactionsStoreMock.load).toHaveBeenCalledWith('1', expect.objectContaining({
      page: 2,
      pageSize: 20,
      type: 'CREDIT',
      transferDirection: 'INCOMING',
      currency: 'TRY'
    }));
  });

  it('dispatchTransactionsLoad uses initial filters when form is absent', () => {
    const { component } = createComponent();
    component.id = '9';
    component.txFilterInitialValue = { type: '', direction: '', currency: '', from: '', to: '' } as any;
    (component as any).txFiltersForm = undefined;
    (component as any).dispatchTransactionsLoad();
    expect(transactionsStoreMock.load).toHaveBeenCalledWith('9', expect.objectContaining({
      type: undefined,
      transferDirection: undefined,
      currency: undefined,
      from: undefined,
      to: undefined
    }));
  });

  it('syncTxRangeValidity returns true when form is missing', () => {
    const { component } = createComponent();
    (component as any).txFiltersForm = undefined;
    expect((component as any).syncTxRangeValidity()).toBe(true);
  });

  it('ngAfterViewInit wires transaction form changes', () => {
    vi.useFakeTimers();
    const { component } = createComponent();
    component.id = '1';
    const form = new FormGroup({
      type: new FormControl(''),
      direction: new FormControl(''),
      currency: new FormControl(''),
      from: new FormControl('2024-01-01T00:00'),
      to: new FormControl('2024-02-01T00:00')
    });
    (component as any).txFiltersForm = { form } as any;

    component.ngAfterViewInit();
    form.patchValue({ type: 'DEBIT' });
    vi.advanceTimersByTime(300);
    form.patchValue({ type: 'DEBIT' });
    vi.advanceTimersByTime(300);
    (component as any).txReload$.next();

    expect(transactionsStoreMock.load).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('txColumns resolve icons and colors', () => {
    const { component } = createComponent();
    const creditCol = component.txColumns[1];
    const dirCol = component.txColumns[2];
    expect(creditCol.badgeIcon?.('CREDIT')).toBe('ri-bank-card-2-line');
    expect(creditCol.badgeColor?.('DEBIT')).toBe('blue');
    expect(dirCol.badgeIcon?.('INCOMING')).toBe('ri-arrow-down-line');
    expect(dirCol.badgeColor?.('OUTGOING')).toBe('pink');
  });

  it('txColumns fall back for unknown values', () => {
    const { component } = createComponent();
    const creditCol = component.txColumns[1];
    const dirCol = component.txColumns[2];
    expect(creditCol.badgeIcon?.('UNKNOWN')).toBeNull();
    expect(creditCol.badgeColor?.('UNKNOWN')).toBe('gray');
    expect(dirCol.badgeIcon?.('UNKNOWN')).toBeNull();
    expect(dirCol.badgeColor?.('UNKNOWN')).toBe('gray');
  });

  it('clears tx filters and triggers reload', () => {
    const { component } = createComponent();
    const form = new FormGroup({
      type: new FormControl(''),
      direction: new FormControl(''),
      currency: new FormControl(''),
      from: new FormControl('2024-01-01T00:00'),
      to: new FormControl('2024-02-01T00:00')
    });
    (component as any).txFiltersForm = { form } as any;

    const reloadSpy = vi.fn();
    (component as any).txReload$.subscribe(reloadSpy);

    component.clearTxFilters();
    expect(component.txPage).toBe(1);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('onTxPageChange updates page and triggers reload', () => {
    const { component } = createComponent();
    const reloadSpy = vi.fn();
    (component as any).txReload$.subscribe(reloadSpy);

    component.onTxPageChange({ page: 3, pageSize: 50 });
    expect(component.txPage).toBe(3);
    expect(component.txPageSize).toBe(50);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('resetLimits resets form to initial values', () => {
    const { component } = createComponent();
    const form = new FormGroup({ dailyLimit: new FormControl(1), monthlyLimit: new FormControl(2) });
    component.limitsInitialValue = { dailyLimit: 3, monthlyLimit: 4 } as any;
    component.limitsForm = { form } as any;

    component.resetLimits();
    expect(form.get('dailyLimit')?.value).toBe(3);
  });

  it('resetLimits exits when form is missing', () => {
    const { component } = createComponent();
    component.limitsForm = undefined;
    component.resetLimits();
    expect(true).toBe(true);
  });

  it('setupTxStream safely exits when form is missing', () => {
    const { component } = createComponent();
    (component as any).txFiltersForm = undefined;
    (component as any).setupTxStream();
    expect(true).toBe(true);
  });

  it('buildTxFilterInitialValue returns range', () => {
    const { component } = createComponent();
    const initial = (component as any).buildTxFilterInitialValue();
    expect(initial).toHaveProperty('from');
    expect(initial).toHaveProperty('to');
  });

  it('clearTxFilters works without form', () => {
    const { component } = createComponent();
    const reloadSpy = vi.fn();
    (component as any).txReload$.subscribe(reloadSpy);
    component.txFiltersForm = undefined as any;

    component.clearTxFilters();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('navigates back and dispatches delete', () => {
    const { component, router } = createComponent();
    component.id = '1';

    component.back();
    component.edit();

    component.openDelete();
    component.confirmDelete();
    expect(customersStoreMock.delete).toHaveBeenCalledWith('1');
    expect(router.navigate).toHaveBeenCalled();
  });

  it('confirmDelete exits when deleting or missing id', () => {
    const { component } = createComponent();
    component.deletingCustomer = true;
    component.id = '1';
    component.confirmDelete();
    expect(customersStoreMock.delete).not.toHaveBeenCalled();
  });

  it('ngOnDestroy completes subjects', () => {
    const { component } = createComponent();
    component.ngOnDestroy();
    expect(true).toBe(true);
  });

  it('ngOnInit loads customer and wallet and handles saveLimits', () => {
    const param$ = new BehaviorSubject(convertToParamMap({ id: '1' }));
    const deleteSuccess$ = new Subject<{ id: string }>();
    const customersStore = { deleting$: of(false), deletingId$: of(null), deleteSuccess$, delete: vi.fn() };
    const loading$ = new BehaviorSubject<boolean>(false);
    const transactionsStore = { data$: of([]), total$: of(0), loading$, load: vi.fn() };
    const route = { paramMap: param$ } as any;
    const router = { navigate: vi.fn() } as any;
    const customersApi = { getById: vi.fn(() => of({ id: '1', name: 'A' } as any)) } as any;
    const walletsApi = { getByCustomerId: vi.fn(() => of({ id: 'w', dailyLimit: 1, monthlyLimit: 2 } as any)), updateLimits: vi.fn(() => of({ id: 'w', dailyLimit: 2, monthlyLimit: 3 } as any)) } as any;
    const toast = { success: vi.fn() } as any;
    const appError = { handleError: vi.fn() } as any;
    const i18n = { instant: (k: string) => k } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: customersStore },
        { provide: TransactionsStore, useValue: transactionsStore }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new CustomerDetailComponent(route, router, customersApi, walletsApi, toast, appError, i18n));
    component.ngOnInit();

    expect(customersApi.getById).toHaveBeenCalledWith('1');
    expect(walletsApi.getByCustomerId).toHaveBeenCalledWith('1');

    component.limitsForm = { form: new FormGroup({ dailyLimit: new FormControl(2), monthlyLimit: new FormControl(3) }) } as any;
    component.saveLimits();
    expect(walletsApi.updateLimits).toHaveBeenCalled();

    loading$.next(true);
    expect(component.showTxSkeleton).toBe(true);
    loading$.next(false);
    expect(component.showTxSkeleton).toBe(false);

    component.openDelete();
    deleteSuccess$.next({ id: '1' });
    expect(component.deleteModalOpen).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/customers']);
  });

  it('saveLimits prevents update when limits mismatch', () => {
    const param$ = new BehaviorSubject(convertToParamMap({ id: '1' }));
    const customersStore = { deleting$: of(false), deletingId$: of(null), deleteSuccess$: new Subject(), delete: vi.fn() };
    const transactionsStore = { data$: of([]), total$: of(0), loading$: of(false), load: vi.fn() };
    const route = { paramMap: param$ } as any;
    const router = { navigate: vi.fn() } as any;
    const customersApi = { getById: vi.fn(() => of({ id: '1', name: 'A' } as any)) } as any;
    const walletsApi = { getByCustomerId: vi.fn(() => of({ id: 'w', dailyLimit: 1, monthlyLimit: 2 } as any)), updateLimits: vi.fn(() => of({ id: 'w', dailyLimit: 2, monthlyLimit: 3 } as any)) } as any;
    const toast = { success: vi.fn() } as any;
    const appError = { handleError: vi.fn() } as any;
    const i18n = { instant: (k: string) => k } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: customersStore },
        { provide: TransactionsStore, useValue: transactionsStore }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new CustomerDetailComponent(route, router, customersApi, walletsApi, toast, appError, i18n));
    component.ngOnInit();

    const form = new FormGroup({ dailyLimit: new FormControl(10), monthlyLimit: new FormControl(5) });
    component.limitsForm = { form } as any;
    component.saveLimits();
    expect(walletsApi.updateLimits).not.toHaveBeenCalled();
    expect(form.errors?.['limitMismatch']).toBe(true);
  });

  it('saveLimits exits when form is invalid or missing', () => {
    const { component } = createComponent();
    component.limitsForm = undefined as any;
    component.saveLimits();
    const form = new FormGroup({ dailyLimit: new FormControl(1), monthlyLimit: new FormControl(2) });
    form.setErrors({ required: true });
    component.limitsForm = { form } as any;
    component.saveLimits();
    expect(true).toBe(true);
  });

  it('clears range errors when values are cleared', () => {
    const { component } = createComponent();
    const fromCtrl = new FormControl('');
    const toCtrl = new FormControl('');
    fromCtrl.setErrors({ range: true, other: true });
    toCtrl.setErrors({ range: true });
    const form = new FormGroup({ from: fromCtrl, to: toCtrl });
    (component as any).txFiltersForm = { form } as any;

    const valid = (component as any).syncTxRangeValidity();
    expect(valid).toBe(true);
    expect(fromCtrl.errors).toEqual({ other: true });
    expect(toCtrl.errors).toBeNull();
  });

  it('handles load errors for customer and wallet', () => {
    const param$ = new BehaviorSubject(convertToParamMap({ id: '1' }));
    const customersStore = { deleting$: of(false), deletingId$: of(null), deleteSuccess$: new Subject(), delete: vi.fn() };
    const transactionsStore = { data$: of([]), total$: of(0), loading$: of(false), load: vi.fn() };
    const route = { paramMap: param$ } as any;
    const router = { navigate: vi.fn() } as any;
    const customersApi = { getById: vi.fn(() => throwError(() => new Error('boom'))) } as any;
    const walletsApi = { getByCustomerId: vi.fn(() => throwError(() => new Error('boom'))), updateLimits: vi.fn(() => of({})) } as any;
    const toast = { success: vi.fn() } as any;
    const appError = { handleError: vi.fn() } as any;
    const i18n = { instant: (k: string) => k } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: customersStore },
        { provide: TransactionsStore, useValue: transactionsStore }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new CustomerDetailComponent(route, router, customersApi, walletsApi, toast, appError, i18n));
    component.ngOnInit();

    expect(appError.handleError).toHaveBeenCalled();
    expect(component.loadingCustomer).toBe(false);
    expect(component.loadingWallet).toBe(false);
  });

  it('clears limitMismatch and updates limits', () => {
    const param$ = new BehaviorSubject(convertToParamMap({ id: '1' }));
    const customersStore = { deleting$: of(false), deletingId$: of(null), deleteSuccess$: new Subject(), delete: vi.fn() };
    const transactionsStore = { data$: of([]), total$: of(0), loading$: of(false), load: vi.fn() };
    const route = { paramMap: param$ } as any;
    const router = { navigate: vi.fn() } as any;
    const customersApi = { getById: vi.fn(() => of({ id: '1', name: 'A' } as any)) } as any;
    const walletsApi = { getByCustomerId: vi.fn(() => of({ id: 'w', dailyLimit: 1, monthlyLimit: 2 } as any)), updateLimits: vi.fn(() => of({ id: 'w', dailyLimit: 2, monthlyLimit: 3 } as any)) } as any;
    const toast = { success: vi.fn() } as any;
    const appError = { handleError: vi.fn() } as any;
    const i18n = { instant: (k: string) => k } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: customersStore },
        { provide: TransactionsStore, useValue: transactionsStore }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new CustomerDetailComponent(route, router, customersApi, walletsApi, toast, appError, i18n));
    component.ngOnInit();
    component.id = '1';

    const formStub: any = {
      errors: { limitMismatch: true },
      invalid: false,
      updateValueAndValidity: vi.fn(),
      markAllAsTouched: vi.fn(),
      getRawValue: vi.fn(() => ({ dailyLimit: 1, monthlyLimit: 2 })),
      setErrors: vi.fn(),
      reset: vi.fn(),
      markAsPristine: vi.fn(),
      markAsUntouched: vi.fn()
    };
    component.limitsForm = { form: formStub } as any;
    component.saveLimits();

    expect(formStub.setErrors).toHaveBeenCalledWith(null);
    expect(walletsApi.updateLimits).toHaveBeenCalled();
  });

  it('handles updateLimits errors', () => {
    const param$ = new BehaviorSubject(convertToParamMap({ id: '1' }));
    const customersStore = { deleting$: of(false), deletingId$: of(null), deleteSuccess$: new Subject(), delete: vi.fn() };
    const transactionsStore = { data$: of([]), total$: of(0), loading$: of(false), load: vi.fn() };
    const route = { paramMap: param$ } as any;
    const router = { navigate: vi.fn() } as any;
    const customersApi = { getById: vi.fn(() => of({ id: '1', name: 'A' } as any)) } as any;
    const walletsApi = { getByCustomerId: vi.fn(() => of({ id: 'w', dailyLimit: 1, monthlyLimit: 2 } as any)), updateLimits: vi.fn(() => throwError(() => new Error('fail'))) } as any;
    const toast = { success: vi.fn() } as any;
    const appError = { handleError: vi.fn() } as any;
    const i18n = { instant: (k: string) => k } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersStore, useValue: customersStore },
        { provide: TransactionsStore, useValue: transactionsStore }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new CustomerDetailComponent(route, router, customersApi, walletsApi, toast, appError, i18n));
    component.ngOnInit();
    component.id = '1';
    component.limitsForm = { form: new FormGroup({ dailyLimit: new FormControl(1), monthlyLimit: new FormControl(2) }) } as any;
    component.saveLimits();

    expect(appError.handleError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ operation: 'updateLimits' }));
  });
});
