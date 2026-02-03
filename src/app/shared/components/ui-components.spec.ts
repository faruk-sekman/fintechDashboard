import { describe, it, expect, vi } from 'vitest';
import { FormControl } from '@angular/forms';
import { SimpleChange } from '@angular/core';
import { UiBadgeComponent } from '@shared/components/ui-badge/ui-badge.component';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiInputComponent } from '@shared/components/ui-input/ui-input.component';
import { UiSelectComponent } from '@shared/components/ui-select/ui-select.component';
import { UiCheckboxComponent } from '@shared/components/ui-checkbox/ui-checkbox.component';
import { UiPaginationComponent } from '@shared/components/ui-pagination/ui-pagination.component';
import { UiTableComponent } from '@shared/components/ui-table/ui-table.component';
import { UiFormComponent } from '@shared/components/ui-form/ui-form.component';
import { UiConfirmDialogComponent } from '@shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiSkeletonComponent } from '@shared/components/ui-skeleton/ui-skeleton.component';

class TranslateMock {
  currentLang = 'en';
  instant(key: string) { return key; }
}

describe('Shared UI components', () => {
  it('UiBadgeComponent builds class strings and text state', () => {
    const badge = new UiBadgeComponent();
    badge.text = 'Active';
    badge.icon = 'ri-user-line';
    badge.color = 'green';
    badge.dot = true;

    expect(badge.hasText).toBe(true);
    expect(badge.badgeClassString).toContain('ui-badge--green');
    expect(badge.iconClassString).toContain('ri-user-line');
    expect(badge.dotClassString).toContain('ui-badge__dot');

    badge.color = 'custom';
    badge.colorClass = 'custom-class';
    expect(badge.badgeClassString).toContain('custom-class');

    badge.colorClass = null;
    expect(badge.badgeClassString).not.toContain('ui-badge--');
  });

  it('UiButtonComponent has defaults', () => {
    const button = new UiButtonComponent();
    expect(button.type).toBe('button');
    expect(button.variant).toBe('primary');
    expect(button.size).toBe('md');
  });

  it('UiInputComponent applies mask and toggles disabled state', () => {
    const input = new UiInputComponent();
    const control = new FormControl('123456');
    input.control = control;
    input.mask = '###-###';
    input.ngOnChanges({ control: new SimpleChange(null, control, true), mask: new SimpleChange(null, '###-###', true) });

    expect(control.value).toBe('123-456');

    input.disabled = true;
    input.ngOnChanges({ disabled: new SimpleChange(false, true, false) });
    expect(control.disabled).toBe(true);
    input.disabled = false;
    input.ngOnChanges({ disabled: new SimpleChange(true, false, false) });
    expect(control.enabled).toBe(true);
    input.ngOnDestroy();
  });

  it('UiInputComponent skips formatting for null values and unchanged formats', () => {
    const input = new UiInputComponent();
    const control = new FormControl(null);
    input.control = control;
    input.mask = '###-###';
    const setSpy = vi.spyOn(control, 'setValue');
    input.ngOnChanges({ control: new SimpleChange(null, control, true), mask: new SimpleChange(null, '###-###', true) });
    expect(setSpy).not.toHaveBeenCalled();

    control.setValue('123-456');
    setSpy.mockClear();
    input.ngOnChanges({ mask: new SimpleChange(null, '###-###', false) });
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('UiInputComponent skips when no control or number type', () => {
    const input = new UiInputComponent();
    input.ngOnChanges({} as any);
    input.control = new FormControl('123');
    input.mask = '###-###';
    input.type = 'number';
    input.ngOnChanges({ control: new SimpleChange(null, input.control, true), mask: new SimpleChange(null, '###-###', true) });
    expect(input.control.value).toBe('123');
  });

  it('UiInputComponent applyMask returns empty for non-digits', () => {
    const input = new UiInputComponent();
    input.mask = '###-###';
    const result = (input as any).applyMask('abc');
    expect(result).toBe('');
  });

  it('UiInputComponent applyMask truncates when digits are fewer than mask', () => {
    const input = new UiInputComponent();
    input.mask = '##-##';
    const result = (input as any).applyMask('12');
    expect(result).toBe('12');
  });

  it('UiInputComponent applyMask breaks when digits run out on placeholders', () => {
    const input = new UiInputComponent();
    input.mask = '###';
    const result = (input as any).applyMask('1');
    expect(result).toBe('1');
  });

  it('UiSelectComponent and UiCheckboxComponent are configurable', () => {
    const select = new UiSelectComponent();
    const checkbox = new UiCheckboxComponent();
    select.control = new FormControl('');
    checkbox.control = new FormControl(false);
    select.disabled = true;
    checkbox.disabled = true;
    expect(select.disabled).toBe(true);
    expect(checkbox.disabled).toBe(true);
  });

  it('UiPaginationComponent builds page ranges and emits changes', () => {
    const pagination = new UiPaginationComponent();
    pagination.total = 120;
    pagination.pageSize = 10;
    pagination.page = 1;
    expect(pagination.totalPages).toBe(12);
    expect(pagination.pages[0]).toBe(1);

    const emit = vi.fn();
    pagination.pageChange.subscribe(emit);
    pagination.next();
    expect(emit).toHaveBeenCalledWith({ page: 2, pageSize: 10 });
  });

  it('UiPaginationComponent handles edge cases', () => {
    const pagination = new UiPaginationComponent();
    pagination.total = 100;
    pagination.pageSize = 10;
    pagination.pageWindow = 1;
    pagination.page = 5;
    expect(pagination.pages).toEqual([5]);

    pagination.pageWindow = 2;
    expect(pagination.pages).toEqual([1, 10]);

    const emit = vi.fn();
    pagination.pageChange.subscribe(emit);
    pagination.page = 1;
    pagination.prev();
    pagination.page = pagination.totalPages;
    pagination.next();
    pagination.goTo(0);
    expect(emit).not.toHaveBeenCalled();
  });

  it('UiPaginationComponent totalPages handles zero values', () => {
    const pagination = new UiPaginationComponent();
    pagination.total = 0;
    pagination.pageSize = 0;
    expect(pagination.totalPages).toBe(1);
  });

  it('UiPaginationComponent covers short ranges and end window', () => {
    const pagination = new UiPaginationComponent();
    pagination.total = 20;
    pagination.pageSize = 5;
    pagination.pageWindow = 5;
    pagination.page = 4;
    expect(pagination.pages).toEqual([1, 2, 3, 4]);

    pagination.total = 100;
    pagination.pageSize = 10;
    pagination.page = 10;
    const pages = pagination.pages;
    expect(pages[pages.length - 1]).toBe(10);

    const emit = vi.fn();
    pagination.pageChange.subscribe(emit);
    pagination.prev();
    pagination.goTo(9);
    expect(emit).toHaveBeenCalled();
  });

  it('UiTableComponent formats cells and resolves badge config', () => {
    const table = new UiTableComponent<any>(new TranslateMock() as any);
    const row = { amount: 10, createdAt: '2024-01-01T00:00:00Z', currency: 'USD', status: 'OK' };
    const colCurrency = { key: 'amount', type: 'currency' } as any;
    const colDate = { key: 'createdAt', type: 'date' } as any;
    const colBadge = { key: 'status', badgeColor: () => 'green', badgeIcon: () => 'ri-ok-line', badgeClass: () => 'x', badgeIconPosition: () => 'right', badgeIconClass: () => 'y' } as any;

    expect(table.displayCell(colCurrency, row)).toContain('$');
    expect(table.displayCell(colDate, row)).toContain('2024');
    expect(table.badgeColor(colBadge, row)).toBe('green');
    expect(table.badgeIcon(colBadge, row)).toBe('ri-ok-line');
    expect(table.badgeClass(colBadge, row)).toBe('x');
    expect(table.badgeIconPosition(colBadge, row)).toBe('right');
    expect(table.badgeIconClass(colBadge, row)).toBe('y');
    expect(table.toggleOn({ key: 'status' } as any, row)).toBe(true);

    const emit = vi.fn();
    table.pageChange.subscribe(emit);
    table.onPageChange({ page: 2, pageSize: 10 });
    expect(emit).toHaveBeenCalled();
  });

  it('UiTableComponent formats via formatter and static badge config', () => {
    const table = new UiTableComponent<any>(new TranslateMock() as any);
    const row = { value: 'X' };
    const colFormatter = { key: 'value', formatter: (val: any) => `fmt:${val}` } as any;
    expect(table.displayCell(colFormatter, row)).toBe('fmt:X');

    const colStatic = {
      key: 'value',
      badgeColor: 'red',
      badgeClass: 'cls',
      badgeIcon: 'ri-check',
      badgeIconPosition: 'right',
      badgeIconClass: 'ic'
    } as any;
    expect(table.badgeColor(colStatic, row)).toBe('red');
    expect(table.badgeClass(colStatic, row)).toBe('cls');
    expect(table.badgeIcon(colStatic, row)).toBe('ri-check');
    expect(table.badgeIconPosition(colStatic, row)).toBe('right');
    expect(table.badgeIconClass(colStatic, row)).toBe('ic');
  });

  it('UiTableComponent defaults badge values when undefined', () => {
    const table = new UiTableComponent<any>(new TranslateMock() as any);
    const row = { status: null };
    const col = { key: 'status' } as any;
    expect(table.badgeColor(col, row)).toBe('gray');
    expect(table.badgeClass(col, row)).toBeNull();
    expect(table.badgeIcon(col, row)).toBeNull();
    expect(table.badgeIconPosition(col, row)).toBe('left');
    expect(table.badgeIconClass(col, row)).toBeNull();
  });

  it('UiTableComponent handles null and invalid values', () => {
    const table = new UiTableComponent<any>(new TranslateMock() as any);
    const row = { createdAt: 'invalid', name: null, raw: 123 };
    const colDate = { key: 'createdAt', type: 'date' } as any;
    const colNull = { key: 'name' } as any;
    const colRaw = { key: 'raw' } as any;

    expect(table.displayCell(colDate, row)).toBe('invalid');
    expect(table.displayCell(colNull, row)).toBe('-');
    expect(table.displayCell(colRaw, row)).toBe('123');
  });

  it('UiTableComponent uses currency formatting', () => {
    const table = new UiTableComponent<any>(new TranslateMock() as any);
    const row = { amount: 10, currency: 'USD' };
    const colCurrency = { key: 'amount', type: 'currency' } as any;
    const original = Intl.NumberFormat;
    (Intl as any).NumberFormat = function () {
      return { format: (value: number) => `FMT:${value}` };
    } as any;
    const value = table.displayCell(colCurrency, row);
    expect(value).toBe('FMT:10');
    (Intl as any).NumberFormat = original;
  });

  it('UiFormComponent builds form and exposes error state', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });

    const control = form.control('name');
    control.setErrors({ required: true });
    control.markAsDirty();

    expect(form.isInvalid('name')).toBe(true);
    expect(form.getError('name')?.key).toBe('validation.required');
    expect(form.fieldId('name', 1)).toContain('ui-form-1-name');
    expect(form.showStatus('name')).toBe(true);
    expect(form.displayError('name')?.key).toBe('validation.required');
  });

  it('UiFormComponent submit emits when valid', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });

    form.control('name').setValue('ok');
    form.control('name').markAsDirty();
    expect(form.isValid('name')).toBe(true);
    const emit = vi.fn();
    form.submitted.subscribe(emit);
    form.submit();
    expect(emit).toHaveBeenCalled();
  });

  it('UiFormComponent resetTo clears and restores baseline', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });

    form.control('name').setValue('x');
    form.resetTo({ name: 'y' });
    expect(form.control('name').value).toBe('y');

    form.resetTo();
    expect(form.control('name').value).toBeNull();
  });

  it('UiFormComponent onSubmit prevents when configured', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.preventSubmit = true;
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    form.onSubmit(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('UiFormComponent onSubmit triggers submit when allowed', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });
    form.control('name').setValue('ok');
    const emit = vi.fn();
    form.submitted.subscribe(emit);
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    form.preventSubmit = false;
    form.onSubmit(event);
    expect(emit).toHaveBeenCalled();
  });

  it('UiFormComponent handles class values and errors', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });

    const control = form.control('name');
    control.setErrors({ limitMismatch: true });
    control.markAsDirty();

    expect(form.displayError('name')).toBeNull();
    expect(form.hasDisplayError('name')).toBe(false);

    const cls = form.controlClass('name', ['extra']);
    expect(cls['extra']).toBe(true);
    expect(form.trackByField(0, { name: 'name' } as any)).toBe('name');

    const clsSet = form.controlClass('name', new Set(['from-set']));
    expect(clsSet['from-set']).toBe(true);
    const clsObj = form.controlClass('name', { 'from-obj': true });
    expect(clsObj['from-obj']).toBe(true);
    const clsStr = form.controlClass('name', 'x y');
    expect(clsStr['x']).toBe(true);
  });

  it('UiFormComponent controlClass handles null extras and invalid submit', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });

    const cls = form.controlClass('name', null);
    expect(cls['ui-form__control']).toBe(true);

    const emit = vi.fn();
    form.submitted.subscribe(emit);
    form.control('name').setErrors({ required: true });
    form.submit();
    expect(emit).not.toHaveBeenCalled();
  });

  it('UiFormComponent applies initial values on field changes', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.initialValue = { name: 'Init' };
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });
    expect(form.control('name').value).toBe('Init');
  });

  it('UiFormComponent updates values when initialValue changes', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });
    form.initialValue = { name: 'Next' };
    form.ngOnChanges({ initialValue: new SimpleChange(null, form.initialValue, false) });
    expect(form.control('name').value).toBe('Next');
  });

  it('UiFormComponent builds nested groups and handles validator updates', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [
      { name: 'address.city', labelKey: 'city', type: 'text' } as any,
      { name: 'address.country', labelKey: 'country', type: 'text' } as any
    ];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });

    expect(form.control('address.city')).toBeDefined();
    expect(form.control('address.country')).toBeDefined();

    const validator = () => ({ formError: true });
    form.formValidators = [validator as any];
    form.ngOnChanges({ formValidators: new SimpleChange(null, form.formValidators, false) });
    form.form.updateValueAndValidity();
    expect(form.form.errors).toEqual({ formError: true });
  });

  it('UiFormComponent resets when initialValue becomes null', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });
    form.control('name').setValue('x');
    form.initialValue = null;
    form.ngOnChanges({ initialValue: new SimpleChange({ name: 'x' }, null, false) });
    expect(form.control('name').value).toBeNull();
  });

  it('UiFormComponent returns default invalid error key', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });

    const control = form.control('name');
    control.setErrors({ custom: true });
    control.markAsDirty();
    expect(form.displayError('name')?.key).toBe('validation.invalid');
  });

  it('UiFormComponent cleans up on destroy', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.ngOnDestroy();
    expect(true).toBe(true);
  });

  it('UiSkeletonComponent builds styles from inputs', () => {
    const skeleton = new UiSkeletonComponent();
    skeleton.width = '10px';
    skeleton.height = '4px';
    skeleton.radius = '2px';
    expect(skeleton.styles).toEqual({
      '--skeleton-w': '10px',
      '--skeleton-h': '4px',
      '--skeleton-r': '2px'
    });
  });

  it('UiSkeletonComponent returns empty styles when unset', () => {
    const skeleton = new UiSkeletonComponent();
    expect(skeleton.styles).toEqual({});
  });

  it('UiFormComponent reflects locale and equality helpers', () => {
    const i18n = new TranslateMock() as any;
    i18n.currentLang = 'tr';
    const form = new UiFormComponent(i18n);
    expect(form.dateInputLang()).toBe('tr-TR');

    expect((form as any).deepEqual({ a: [1] }, { a: [1] })).toBe(true);
    expect((form as any).deepEqual({ a: [1] }, { a: [2] })).toBe(false);
    expect((form as any).normalizeValue([{ a: 1 }])).toEqual([{ a: 1 }]);
  });

  it('UiFormComponent maps validation errors', () => {
    const form = new UiFormComponent(new TranslateMock() as any);
    form.fields = [{ name: 'name', labelKey: 'name', type: 'text' } as any];
    form.ngOnChanges({ fields: new SimpleChange(null, form.fields, true) });
    const control = form.control('name');

    const cases: Array<{ errors: any; key: string }> = [
      { errors: { required: true }, key: 'validation.required' },
      { errors: { multipleSpaces: true }, key: 'validation.multipleSpaces' },
      { errors: { email: true }, key: 'validation.email' },
      { errors: { min: { min: 2 } }, key: 'validation.min' },
      { errors: { max: { max: 5 } }, key: 'validation.max' },
      { errors: { minlength: { requiredLength: 3 } }, key: 'validation.minLength' },
      { errors: { maxlength: { requiredLength: 8 } }, key: 'validation.maxLength' },
      { errors: { surnameRequired: true }, key: 'validation.surnameRequired' },
      { errors: { nationalIdLength: true }, key: 'validation.nationalIdLength' },
      { errors: { nationalIdStartsWithZero: true }, key: 'validation.nationalIdStartsWithZero' },
      { errors: { nationalIdChecksum: true }, key: 'validation.nationalIdChecksum' },
      { errors: { phoneInvalid: true }, key: 'validation.phoneInvalid' },
      { errors: { walletNumberInvalid: true }, key: 'validation.walletNumberInvalid' },
      { errors: { nameInvalid: true }, key: 'validation.nameInvalid' },
      { errors: { unsafeChars: true }, key: 'validation.unsafeChars' },
      { errors: { dateInvalid: true }, key: 'validation.dateInvalid' },
      { errors: { dateInFuture: true }, key: 'validation.dateInFuture' },
      { errors: { minAge: { requiredAge: 18 } }, key: 'validation.minAge' },
      { errors: { maxAge: { requiredAge: 65 } }, key: 'validation.maxAge' },
      { errors: { limitMismatch: true }, key: 'validation.limitMismatch' },
      { errors: { api: 'custom.error' }, key: 'custom.error' }
    ];

    for (const c of cases) {
      control.setErrors(c.errors);
      control.markAsDirty();
      expect(form.getError('name')?.key).toBe(c.key);
    }
  });

  it('UiConfirmDialogComponent and UiSkeletonComponent instantiate', () => {
    const dialog = new UiConfirmDialogComponent();
    const skeleton = new UiSkeletonComponent();
    dialog.open = true;
    expect(dialog.open).toBe(true);
    skeleton.width = '10px';
    skeleton.height = '8px';
    skeleton.radius = '4px';
    expect(skeleton.styles['--skeleton-w']).toBe('10px');
    expect(skeleton.styles['--skeleton-h']).toBe('8px');
    expect(skeleton.styles['--skeleton-r']).toBe('4px');
  });
});
