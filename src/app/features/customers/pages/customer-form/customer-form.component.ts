import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormArray, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, exhaustMap, filter, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';

import { CustomersApi } from '@core/api/customers.api';
import { ToastService } from '@core/services/toast.service';
import { AppErrorService } from '@core/services/app-error.service';

import { UiFormComponent } from '@shared/components/ui-form/ui-form.component';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiSkeletonComponent } from '@shared/components/ui-skeleton/ui-skeleton.component';
import { FieldConfig } from '@shared/components/ui-form/ui-form.types';
import { CreateCustomerRequest, Customer, UpdateCustomerRequest } from '@shared/models/customer.model';
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
  turkishNationalIdValidator
} from '@shared/validators/custom.validators';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, TranslateModule, UiFormComponent, UiButtonComponent, UiSkeletonComponent],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss'
})
export class CustomerFormComponent implements OnInit, OnDestroy {
  @ViewChild(UiFormComponent) uiForm?: UiFormComponent;
  private destroy$ = new Subject<void>();
  private submit$ = new Subject<{ value: any; form: UiFormComponent }>();

  mode: 'create' | 'edit' = 'create';
  id: string | null = null;

  loading = false;
  initialValue: any = null;
  fields: FieldConfig[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: CustomersApi,
    private toast: ToastService,
    private appError: AppErrorService,
    private i18n: TranslateService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => params.get('id')),
      distinctUntilChanged(),
      tap((id) => {
        this.id = id;
        this.mode = id ? 'edit' : 'create';
        this.loading = !!id;
        this.initialValue = id ? null : { isActive: true };
        this.fields = this.buildFields(this.mode);
      }),
      filter((id): id is string => !!id),
      switchMap((id) =>
        this.api.getById(id).pipe(
          tap((c) => {
            this.initialValue = this.toFormValue(c);
          }),
          catchError((err) => {
            this.appError.handleError(err, { source: 'CustomerFormComponent', operation: 'loadCustomer' });
            this.loading = false;
            return EMPTY;
          }),
          finalize(() => {
            this.loading = false;
          })
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe();

    this.submit$.pipe(
      exhaustMap(({ value, form }) => {
        this.loading = true;
        const req$ = this.mode === 'create'
          ? this.api.create(this.toCreatePayload(value))
          : this.api.update(this.id!, this.toUpdatePayload(value));

        return req$.pipe(
          tap((c) => {
            const msg = this.mode === 'create' ? this.i18n.instant('customers.created') : this.i18n.instant('customers.updated');
            this.toast.success(msg);
            this.router.navigate(['/customers', c.id]);
          }),
          catchError((err) => {
            if (err?.status === 400 && err?.error?.errors && form?.form) {
              Object.entries(err.error.errors).forEach(([key, message]) => {
                const ctrl = form.form.get(String(key));
                if (ctrl) ctrl.setErrors({ ...(ctrl.errors ?? {}), api: String(message) });
              });
            }
            this.appError.handleError(err, { source: 'CustomerFormComponent', operation: 'saveCustomer' });
            return EMPTY;
          }),
          finalize(() => {
            this.loading = false;
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  back() {
    if (this.mode === 'edit' && this.id) {
      this.router.navigate(['/customers', this.id]);
      return;
    }
    this.router.navigate(['/customers']);
  }

  onSubmit(value: any, form: UiFormComponent) {
    this.submit$.next({ value, form });
  }

  handleSubmit() {
    if (this.mode === 'create') {
      this.markAllDirty(this.uiForm?.form ?? null);
    }
    this.uiForm?.submit();
  }

  clearForm() {
    if (!this.uiForm) return;
    if (this.mode === 'edit') {
      const resetValue = this.initialValue ? JSON.parse(JSON.stringify(this.initialValue)) : null;
      this.uiForm.resetTo(resetValue);
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
      isActive: c.isActive
    };
  }

  private toPayloadBase(v: any) {
    const norm = (val: any) => typeof val === 'string' ? val.trim() : val;
    const emptyToUndefined = (val: any) => {
      if (typeof val !== 'string') return val;
      const t = val.trim();
      return t.length ? t : undefined;
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
        line1: norm(v.address?.line1)
      },
      kycStatus: emptyToUndefined(v.kycStatus),
      isActive: !!v.isActive
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
      nationalId: base.nationalId,
      address: base.address,
      kycStatus: base.kycStatus ?? 'UNKNOWN',
      isActive: base.isActive
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
          Validators.maxLength(100)
        ]
      },
      {
        name: 'email',
        labelKey: 'customers.email',
        type: 'email',
        validators: [Validators.required, trimmedRequiredValidator(), strictEmailValidator()]
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
          phoneNumberValidator()
        ]
      },
      ...(mode === 'edit'
        ? [{
            name: 'walletNumber',
            labelKey: 'customers.walletNumber',
            type: 'text',
            disabled: true,
            readOnly: true
          } as FieldConfig]
        : []),
      {
        name: 'dateOfBirth',
        labelKey: 'customers.dateOfBirth',
        type: 'date',
        validators: [Validators.required, dateOfBirthValidator({ minAge: 18, maxAge: 120 })]
      },
      {
        name: 'nationalId',
        labelKey: 'customers.nationalId',
        type: 'text',
        validators: [
          Validators.required,
          trimmedRequiredValidator(),
          noMultipleSpacesValidator(),
          turkishNationalIdValidator()
        ]
      },
      {
        name: 'address.country',
        labelKey: 'customers.address.country',
        type: 'text',
        validators: [Validators.required, trimmedRequiredValidator(), noMultipleSpacesValidator(), safeTextValidator(), Validators.maxLength(50)]
      },
      {
        name: 'address.city',
        labelKey: 'customers.address.city',
        type: 'text',
        validators: [Validators.required, trimmedRequiredValidator(), noMultipleSpacesValidator(), safeTextValidator(), Validators.maxLength(80)]
      },
      {
        name: 'address.postalCode',
        labelKey: 'customers.address.postalCode',
        type: 'text',
        validators: [trimmedRequiredValidator(), noMultipleSpacesValidator(), Validators.required, Validators.maxLength(12)]
      },
      {
        name: 'address.line1',
        labelKey: 'customers.address.line1',
        type: 'text',
        validators: [Validators.required, trimmedRequiredValidator(), noMultipleSpacesValidator(), safeTextValidator(), Validators.maxLength(120), Validators.minLength(6)]
      }
    ];

    if (mode === 'edit') {
      base.push(
        {
          name: 'kycStatus',
          labelKey: 'customers.kycStatus',
          type: 'select',
          options: KYC_STATUS_FILTER_OPTIONS
        },
        { name: 'isActive', labelKey: 'customers.active', type: 'checkbox', hintKey: 'customers.active' }
      );
    }

    return base;
  }

  private markAllDirty(control: AbstractControl | null) {
    if (!control) return;
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach((child) => this.markAllDirty(child));
      control.markAsDirty();
      return;
    }
    if (control instanceof FormArray) {
      control.controls.forEach((child) => this.markAllDirty(child));
      control.markAsDirty();
      return;
    }
    control.markAsDirty();
  }
}
