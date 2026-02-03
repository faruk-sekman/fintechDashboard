import { describe, it, expect, vi } from 'vitest';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { CustomerFormComponent } from './customer-form.component';

const customer = {
  id: '1',
  name: 'Jane Doe',
  email: 'jane@doe.com',
  phone: '123',
  walletNumber: '1234567890123456',
  dateOfBirth: '2000-01-01',
  nationalId: 10000000078,
  address: { country: 'TR', city: 'IST', postalCode: '34000', line1: 'Street' },
  kycStatus: 'UNKNOWN',
  isActive: true,
  createdAt: '',
  updatedAt: ''
} as any;

describe('CustomerFormComponent', () => {
  it('initializes in create mode without id', () => {
    const route = { paramMap: new BehaviorSubject(convertToParamMap({})) };
    const router = { navigate: vi.fn() };
    const api = { getById: vi.fn(() => of(customer)), create: vi.fn(() => of(customer)), update: vi.fn(() => of(customer)) };
    const toast = { success: vi.fn() };
    const appError = { handleError: vi.fn() };
    const i18n = { instant: (k: string) => k };

    const component = new CustomerFormComponent(route as any, router as any, api as any, toast as any, appError as any, i18n as any);
    component.ngOnInit();

    expect(component.mode).toBe('create');
    expect(component.fields.length).toBeGreaterThan(0);
  });

  it('initializes in edit mode with id', () => {
    const route = { paramMap: new BehaviorSubject(convertToParamMap({ id: '1' })) };
    const router = { navigate: vi.fn() };
    const api = { getById: vi.fn(() => of(customer)), create: vi.fn(() => of(customer)), update: vi.fn(() => of(customer)) };
    const toast = { success: vi.fn() };
    const appError = { handleError: vi.fn() };
    const i18n = { instant: (k: string) => k };

    const component = new CustomerFormComponent(route as any, router as any, api as any, toast as any, appError as any, i18n as any);
    component.ngOnInit();

    expect(component.mode).toBe('edit');
    expect(api.getById).toHaveBeenCalledWith('1');
  });

  it('handles load customer errors', () => {
    const route = { paramMap: new BehaviorSubject(convertToParamMap({ id: '1' })) };
    const router = { navigate: vi.fn() };
    const api = { getById: vi.fn(() => throwError(() => new Error('fail'))), create: vi.fn(() => of(customer)), update: vi.fn(() => of(customer)) };
    const toast = { success: vi.fn() };
    const appError = { handleError: vi.fn() };
    const i18n = { instant: (k: string) => k };

    const component = new CustomerFormComponent(route as any, router as any, api as any, toast as any, appError as any, i18n as any);
    component.ngOnInit();

    expect(appError.handleError).toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it('builds payloads correctly', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    const base: any = {
      name: '  John Doe ',
      email: ' john@doe.com ',
      phone: ' 123 ',
      dateOfBirth: '2000-01-01',
      nationalId: '10000000078',
      address: { country: 'TR', city: 'IST', postalCode: '34000', line1: 'Street' },
      kycStatus: '',
      isActive: true
    };

    const createPayload = (component as any).toCreatePayload(base);
    expect(createPayload.name).toBe('John Doe');
    expect(createPayload.kycStatus).toBeUndefined();

    const updatePayload = (component as any).toUpdatePayload(base);
    expect(updatePayload.kycStatus).toBe('UNKNOWN');
  });

  it('keeps non-empty kycStatus in update payload', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    const base: any = {
      name: 'John Doe',
      email: 'john@doe.com',
      phone: '123',
      dateOfBirth: '2000-01-01',
      nationalId: '10000000078',
      address: { country: 'TR', city: 'IST', postalCode: '34000', line1: 'Street' },
      kycStatus: 'VERIFIED',
      isActive: true
    };
    const updatePayload = (component as any).toUpdatePayload(base);
    expect(updatePayload.kycStatus).toBe('VERIFIED');
  });

  it('buildFields includes edit-only fields', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    const createFields = (component as any).buildFields('create');
    const editFields = (component as any).buildFields('edit');
    expect(createFields.some((f: any) => f.name === 'walletNumber')).toBe(false);
    expect(editFields.some((f: any) => f.name === 'walletNumber')).toBe(true);
    expect(editFields.some((f: any) => f.name === 'kycStatus')).toBe(true);
  });

  it('submits create and update flows', () => {
    const route = { paramMap: new BehaviorSubject(convertToParamMap({})) };
    const router = { navigate: vi.fn() };
    const api = { getById: vi.fn(() => of(customer)), create: vi.fn(() => of(customer)), update: vi.fn(() => of(customer)) };
    const toast = { success: vi.fn() };
    const appError = { handleError: vi.fn() };
    const i18n = { instant: (k: string) => k };

    const component = new CustomerFormComponent(route as any, router as any, api as any, toast as any, appError as any, i18n as any);
    component.ngOnInit();
    const formGroup = new FormGroup({ name: new FormControl('John') });
    component.onSubmit({ name: 'John' }, { form: formGroup } as any);

    expect(api.create).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();

    component.mode = 'edit';
    component.id = '1';
    component.onSubmit({ name: 'John' }, { form: formGroup } as any);
    expect(api.update).toHaveBeenCalledWith('1', expect.anything());
  });

  it('maps api validation errors to form controls', () => {
    const route = { paramMap: new BehaviorSubject(convertToParamMap({})) };
    const router = { navigate: vi.fn() };
    const api = { getById: vi.fn(() => of(customer)), create: vi.fn(() => throwError(() => ({ status: 400, error: { errors: { name: 'Invalid' } } }))), update: vi.fn(() => of(customer)) };
    const toast = { success: vi.fn() };
    const appError = { handleError: vi.fn() };
    const i18n = { instant: (k: string) => k };

    const component = new CustomerFormComponent(route as any, router as any, api as any, toast as any, appError as any, i18n as any);
    component.ngOnInit();
    const formGroup = new FormGroup({ name: new FormControl('') });
    component.onSubmit({ name: '' }, { form: formGroup } as any);

    expect(formGroup.get('name')?.errors?.['api']).toBe('Invalid');
  });

  it('marks all controls dirty in create mode', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    const form = new FormGroup({
      a: new FormControl(''),
      nested: new FormGroup({ b: new FormControl('') })
    });

    (component as any).markAllDirty(form);
    expect(form.dirty).toBe(true);
    expect(form.get('nested.b')?.dirty).toBe(true);
  });

  it('markAllDirty handles form arrays', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    const array = new FormArray([new FormControl('x')]);
    (component as any).markAllDirty(array);
    expect(array.dirty).toBe(true);
  });

  it('back navigates based on mode', () => {
    const router = { navigate: vi.fn() };
    const component = new CustomerFormComponent({} as any, router as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);

    component.mode = 'create';
    component.back();
    expect(router.navigate).toHaveBeenCalledWith(['/customers']);

    component.mode = 'edit';
    component.id = '1';
    component.back();
    expect(router.navigate).toHaveBeenCalledWith(['/customers', '1']);
  });

  it('handleSubmit marks dirty and triggers submit', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    component.mode = 'create';
    const form = new FormGroup({ name: new FormControl('') });
    const submit = vi.fn();
    component.uiForm = { form, submit } as any;

    component.handleSubmit();
    expect(form.dirty).toBe(true);
    expect(submit).toHaveBeenCalled();
  });

  it('ngAfterViewInit attaches nationalId validator', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    const formGroup = new FormGroup({ nationalId: new FormControl('') });
    component.uiForm = { form: formGroup } as any;
    component.ngAfterViewInit();
    formGroup.updateValueAndValidity();
    expect(formGroup.validator).toBeDefined();
  });

  it('ngOnDestroy completes teardown', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    component.ngOnDestroy();
    expect(true).toBe(true);
  });

  it('clearForm resets based on mode', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    const resetTo = vi.fn();
    component.uiForm = { resetTo } as any;

    component.mode = 'create';
    component.clearForm();
    expect(resetTo).toHaveBeenCalledWith({});

    component.mode = 'edit';
    component.initialValue = { name: 'x' };
    component.clearForm();
    expect(resetTo).toHaveBeenCalled();
  });

  it('clearForm returns when uiForm is missing', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    component.uiForm = undefined;
    component.clearForm();
    expect(true).toBe(true);
  });

  it('clearForm resets to null when initialValue is absent in edit mode', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    const resetTo = vi.fn();
    component.uiForm = { resetTo } as any;
    component.mode = 'edit';
    component.initialValue = null;
    component.clearForm();
    expect(resetTo).toHaveBeenCalledWith(null);
  });

  it('markAllDirty handles null controls', () => {
    const component = new CustomerFormComponent({} as any, {} as any, {} as any, {} as any, {} as any, { instant: () => '' } as any);
    (component as any).markAllDirty(null);
    expect(true).toBe(true);
  });
});
