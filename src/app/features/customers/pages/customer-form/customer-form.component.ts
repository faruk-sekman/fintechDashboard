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
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormArray, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  exhaustMap,
  filter,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { CustomersApi } from '@core/api/customers.api';
import { ToastService } from '@core/services/toast.service';
import { AppErrorService } from '@core/services/app-error.service';

import { UiFormComponent } from '@shared/components/ui-form/ui-form.component';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiSkeletonComponent } from '@shared/components/ui-skeleton/ui-skeleton.component';
import { FieldConfig } from '@shared/components/ui-form/ui-form.types';
import {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '@shared/models/customer.model';
import { KYC_STATUS_FILTER_OPTIONS } from '@shared/utils/kyc-status';
import {
  dateOfBirthValidator,
  digitsLengthValidator,
  fullNameValidator,
  noMultipleSpacesValidator,
  phoneNumberValidator,
  safeTextValidator,
  strictEmailValidator,
  trimmedRequiredValidator,
  turkishNationalIdValidator,
} from '@shared/validators/custom.validators';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, TranslateModule, UiFormComponent, UiButtonComponent, UiSkeletonComponent],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(UiFormComponent) uiForm?: UiFormComponent;
  private readonly destroy$ = new Subject<void>();
  private readonly submit$ = new Subject<{ value: any; form: UiFormComponent }>();

  readonly mode = signal<'create' | 'edit'>('create');
  id: string | null = null;

  readonly loading = signal(false);
  readonly initialValue = signal<any>(null);
  readonly fields = signal<FieldConfig[]>([]);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: CustomersApi,
    private readonly toast: ToastService,
    private readonly appError: AppErrorService,
    private readonly i18n: TranslateService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map(params => params.get('id')),
        distinctUntilChanged(),
        tap(id => {
          this.id = id;
          this.mode.set(this.modeFromId(id));
          this.loading.set(!!id);
          this.initialValue.set(this.initialValueFromId(id));
          this.fields.set(this.buildFields(this.mode()));
        }),
        filter((id): id is string => !!id),
        switchMap(id =>
          this.api.getById(id).pipe(
            tap(c => {
              this.initialValue.set(this.toFormValue(c));
            }),
            catchError(err => {
              this.appError.handleError(err, {
                source: 'CustomerFormComponent',
                operation: 'loadCustomer',
              });
              this.loading.set(false);
              return EMPTY;
            }),
            finalize(() => {
              this.loading.set(false);
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe();

    this.submit$
      .pipe(
        exhaustMap(({ value, form }) => {
          this.loading.set(true);
          const req$ = this.saveRequest(value);

          return req$.pipe(
            tap(c => {
              this.toast.success(this.successMessage());
              this.router.navigate(['/customers', c.id]);
            }),
            catchError(err => {
              if (err?.status === 400 && err?.error?.errors && form?.form) {
                Object.entries(err.error.errors).forEach(([key, message]) => {
                  const ctrl = form.form.get(String(key));
                  if (ctrl) ctrl.setErrors({ ...(ctrl.errors ?? {}), api: String(message) });
                });
              }
              this.appError.handleError(err, {
                source: 'CustomerFormComponent',
                operation: 'saveCustomer',
              });
              return EMPTY;
            }),
            finalize(() => {
              this.loading.set(false);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    const form = this.uiForm?.form;
    if (!form) return;
    form.setValidators([...(this.uiForm?.formValidators ?? [])]);
    form.updateValueAndValidity({ emitEvent: false });
  }

  back() {
    if (this.mode() === 'edit' && this.id) {
      this.router.navigate(['/customers', this.id]);
      return;
    }
    this.router.navigate(['/customers']);
  }

  onSubmit(value: any, form: UiFormComponent) {
    this.submit$.next({ value, form });
  }

  handleSubmit() {
    if (this.mode() === 'create') {
      this.markAllDirty(this.uiForm?.form ?? null);
    }
    this.uiForm?.submit();
  }

  clearForm() {
    if (!this.uiForm) return;
    if (this.mode() === 'edit') {
      this.uiForm.resetTo(this.editResetValue());
      return;
    }
    this.uiForm.resetTo({});
  }

  private toFormValue(c: Customer) {
    return {
      name: c.name,
      email: c.email,
      phone: c.phone,
      walletNumber: c.walletNumber,
      dateOfBirth: c.dateOfBirth,
      nationalId: c.nationalId,
      address: c.address,
      kycStatus: c.kycStatus,
      isActive: c.isActive,
    };
  }

  private toPayloadBase(v: any) {
    const norm = (val: any) => this.normalizeValue(val);
    const emptyToUndefined = (val: any) => {
      if (typeof val !== 'string') return val;
      const t = val.trim();
      if (t.length) return t;
      return undefined;
    };
    return {
      name: norm(v.name),
      email: norm(v.email),
      phone: norm(v.phone),
      dateOfBirth: norm(v.dateOfBirth),
      nationalId: Number(norm(v.nationalId)),
      address: {
        country: norm(v.address?.country),
        city: norm(v.address?.city),
        postalCode: norm(v.address?.postalCode),
        line1: norm(v.address?.line1),
      },
      kycStatus: emptyToUndefined(v.kycStatus),
      isActive: !!v.isActive,
    };
  }

  private toCreatePayload(v: any): CreateCustomerRequest {
    const base = this.toPayloadBase(v);
    const { kycStatus, isActive, ...rest } = base;
    return rest;
  }

  private toUpdatePayload(v: any): UpdateCustomerRequest {
    const base = this.toPayloadBase(v);
    return {
      name: base.name,
      email: base.email,
      phone: base.phone,
      dateOfBirth: base.dateOfBirth,
      // National ID is read-only on edit; preserve the loaded value.
      nationalId: Number(this.initialValue()?.nationalId ?? v.nationalId),
      address: base.address,
      kycStatus: base.kycStatus ?? 'UNKNOWN',
      isActive: base.isActive,
    };
  }

  private buildFields(mode: 'create' | 'edit'): FieldConfig[] {
    const base: FieldConfig[] = [
      {
        name: 'name',
        labelKey: 'customers.name',
        type: 'text',
        validators: [
          Validators.required,
          trimmedRequiredValidator(),
          noMultipleSpacesValidator(),
          fullNameValidator(),
          safeTextValidator(),
          Validators.minLength(3),
          Validators.maxLength(100),
        ],
      },
      {
        name: 'email',
        labelKey: 'customers.email',
        type: 'email',
        validators: [Validators.required, trimmedRequiredValidator(), strictEmailValidator()],
      },
      {
        name: 'phone',
        labelKey: 'customers.phone',
        type: 'text',
        validators: [
          Validators.required,
          trimmedRequiredValidator(),
          noMultipleSpacesValidator(),
          digitsLengthValidator({ min: 7, max: 15 }),
          phoneNumberValidator(),
        ],
      },
      ...this.walletNumberField(mode),
      {
        name: 'dateOfBirth',
        labelKey: 'customers.dateOfBirth',
        type: 'date',
        validators: [Validators.required, dateOfBirthValidator({ minAge: 18, maxAge: 120 })],
      },
      {
        name: 'nationalId',
        labelKey: 'customers.nationalId',
        type: 'text',
        // National ID is an immutable identity field: editable only on create.
        disabled: mode === 'edit',
        readOnly: mode === 'edit',
        validators: [
          Validators.required,
          trimmedRequiredValidator(),
          noMultipleSpacesValidator(),
          turkishNationalIdValidator(),
        ],
      },
      {
        name: 'address.country',
        labelKey: 'customers.address.country',
        type: 'text',
        validators: [
          Validators.required,
          trimmedRequiredValidator(),
          noMultipleSpacesValidator(),
          safeTextValidator(),
          Validators.maxLength(50),
        ],
      },
      {
        name: 'address.city',
        labelKey: 'customers.address.city',
        type: 'text',
        validators: [
          Validators.required,
          trimmedRequiredValidator(),
          noMultipleSpacesValidator(),
          safeTextValidator(),
          Validators.maxLength(80),
        ],
      },
      {
        name: 'address.postalCode',
        labelKey: 'customers.address.postalCode',
        type: 'text',
        validators: [
          trimmedRequiredValidator(),
          noMultipleSpacesValidator(),
          Validators.required,
          Validators.maxLength(12),
        ],
      },
      {
        name: 'address.line1',
        labelKey: 'customers.address.line1',
        type: 'text',
        validators: [
          Validators.required,
          trimmedRequiredValidator(),
          noMultipleSpacesValidator(),
          safeTextValidator(),
          Validators.maxLength(120),
          Validators.minLength(6),
        ],
      },
    ];

    if (mode === 'edit') {
      base.push(
        {
          name: 'kycStatus',
          labelKey: 'customers.kycStatus',
          type: 'select',
          options: KYC_STATUS_FILTER_OPTIONS,
        },
        {
          name: 'isActive',
          labelKey: 'customers.active',
          type: 'checkbox',
          hintKey: 'customers.active',
        },
      );
    }

    return base;
  }

  private modeFromId(id: string | null): 'create' | 'edit' {
    if (id) return 'edit';
    return 'create';
  }

  private initialValueFromId(id: string | null): any {
    if (id) return null;
    return { isActive: true };
  }

  private saveRequest(value: any) {
    if (this.mode() === 'create') return this.api.create(this.toCreatePayload(value));
    return this.api.update(this.id!, this.toUpdatePayload(value));
  }

  private successMessage(): string {
    if (this.mode() === 'create') return this.i18n.instant('customers.created');
    return this.i18n.instant('customers.updated');
  }

  private editResetValue(): any {
    const value = this.initialValue();
    if (!value) return null;
    return JSON.parse(JSON.stringify(value));
  }

  private normalizeValue(val: any): any {
    if (typeof val === 'string') return val.trim();
    return val;
  }

  private walletNumberField(mode: 'create' | 'edit'): FieldConfig[] {
    if (mode !== 'edit') return [];
    return [
      {
        name: 'walletNumber',
        labelKey: 'customers.walletNumber',
        type: 'text',
        disabled: true,
        readOnly: true,
      },
    ];
  }

  private markAllDirty(control: AbstractControl | null) {
    if (!control) return;
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach(child => this.markAllDirty(child));
      control.markAsDirty();
      return;
    }
    if (control instanceof FormArray) {
      control.controls.forEach(child => this.markAllDirty(child));
      control.markAsDirty();
      return;
    }
    control.markAsDirty();
  }
}
