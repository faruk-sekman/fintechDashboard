import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, merge } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiCheckboxComponent } from '@shared/components/ui-checkbox/ui-checkbox.component';
import { UiInputComponent } from '@shared/components/ui-input/ui-input.component';
import { UiSelectComponent } from '@shared/components/ui-select/ui-select.component';
import { ClassValue, FieldConfig } from '@shared/components/ui-form/ui-form.types';

function ensureGroup(root: FormGroup, path: string[]): FormGroup {
  let current = root;
  for (const p of path) {
    const existing = current.get(p);
    if (existing instanceof FormGroup) current = existing;
    else {
      const g = new FormGroup({});
      current.addControl(p, g);
      current = g;
    }
  }
  return current;
}

@Component({
  selector: 'app-ui-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    UiInputComponent,
    UiSelectComponent,
    UiCheckboxComponent,
    UiButtonComponent
  ],
  templateUrl: './ui-form.component.html',
  styleUrl: './ui-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class UiFormComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) fields: ReadonlyArray<FieldConfig> = [];
  @Input() initialValue: Record<string, unknown> | null = null;
  @Input() formValidators: ValidatorFn[] | null = null;
  @Input() preventSubmit = false;
  @Input() submitLabelKey = 'common.save';
  @Input() loading = false;
  @Input() id: string | null = null;
  @Input() showSubmit = true;
  @Input() formClass: ClassValue | null = null;
  @Output() submitted = new EventEmitter<Record<string, unknown>>();

  form = new FormGroup({});
  hasChanges = false;
  private initialSnapshot: unknown = null;
  private destroy$ = new Subject<void>();
  private formChanges$ = new Subject<void>();

  constructor(private i18n: TranslateService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
      this.buildForm();
      this.setupFormChangeTracking();
      if (this.initialValue) {
        this.form.patchValue(this.initialValue, { emitEvent: false });
        this.form.markAsPristine();
      }
      this.setBaselineFromForm();
    } else if (changes['formValidators']) {
      this.form.setValidators(this.formValidators ?? []);
      this.form.updateValueAndValidity({ emitEvent: false });
    }
    if (!changes['fields'] && changes['initialValue']) {
      if (this.initialValue) {
        this.form.patchValue(this.initialValue, { emitEvent: false });
        this.form.markAsPristine();
      } else {
        this.form.reset(undefined, { emitEvent: false });
      }
      this.setBaselineFromForm();
    }
  }

  ngOnDestroy(): void {
    this.formChanges$.next();
    this.destroy$.next();
    this.destroy$.complete();
    this.formChanges$.complete();
  }

  private buildForm() {
    this.form = new FormGroup({}, { validators: this.formValidators ?? [] });
    for (const f of this.fields) {
      const parts = f.name.split('.');
      const controlName = parts.pop()!;
      const parent = ensureGroup(this.form, parts);
      parent.addControl(controlName, new FormControl(null, f.validators ?? []));
    }
  }

  private setupFormChangeTracking() {
    this.formChanges$.next();
    this.form.valueChanges
      .pipe(startWith(this.form.getRawValue()), takeUntil(merge(this.formChanges$, this.destroy$)))
      .subscribe(() => this.updateHasChanges());
  }

  private setBaselineFromForm() {
    this.initialSnapshot = this.normalizeValue(this.form.getRawValue());
    this.hasChanges = false;
  }

  private updateHasChanges() {
    const current = this.normalizeValue(this.form.getRawValue());
    this.hasChanges = !this.deepEqual(current, this.initialSnapshot);
  }

  private normalizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeValue(item));
    }
    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).reduce((acc, key) => {
        (acc as Record<string, unknown>)[key] = this.normalizeValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {} as Record<string, unknown>);
    }
    return value;
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    if (typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a as Record<string, unknown>);
      const bKeys = Object.keys(b as Record<string, unknown>);
      if (aKeys.length !== bKeys.length) return false;
      for (const key of aKeys) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
      }
      return true;
    }
    return false;
  }

  isInvalid(path: string): boolean {
    return this.fieldState(path) === 'invalid';
  }

  isValid(path: string): boolean {
    return this.fieldState(path) === 'valid';
  }

  fieldState(path: string): 'valid' | 'invalid' | null {
    const c = this.form.get(path);
    if (!c || c.disabled || c.pending) return null;
    if (!c.dirty) return null;
    return c.invalid ? 'invalid' : 'valid';
  }

  showStatus(path: string): boolean {
    return this.fieldState(path) !== null;
  }

  control(path: string): FormControl {
    return this.form.get(path) as FormControl;
  }

  controlClass(path: string, extra?: ClassValue | null): { [csClass: string]: boolean } {
    const state = this.fieldState(path);
    return {
      'ui-form__control': true,
      'ui-form__control--invalid': state === 'invalid',
      'ui-form__control--valid': state === 'valid',
      ...this.classValueToObject(extra)
    };
  }

  trackByField = (_: number, field: FieldConfig) => field.name;

  fieldId(name: string, index: number): string {
    const slug = name.replace(/[^a-zA-Z0-9_-]+/g, '-');
    return `ui-form-${index}-${slug}`;
  }

  dateInputLang(): string {
    return this.i18n.currentLang === 'tr' ? 'tr-TR' : 'en-US';
  }

  getError(path: string): { key: string; params?: Record<string, unknown> } | null {
    const c = this.form.get(path);
    if (!c || !c.errors) return null;
    if (c.errors['required']) return { key: 'validation.required' };
    if (c.errors['multipleSpaces']) return { key: 'validation.multipleSpaces' };
    if (c.errors['email']) return { key: 'validation.email' };
    if (c.errors['nationalIdNumeric']) return { key: 'validation.nationalIdNumeric' };
    if (c.errors['nationalIdLength']) return { key: 'validation.nationalIdLength' };
    if (c.errors['nationalIdStartsWithZero']) return { key: 'validation.nationalIdStartsWithZero' };
    if (c.errors['nationalIdChecksum']) return { key: 'validation.nationalIdChecksum' };
    if (c.errors['min']) return { key: 'validation.min', params: { min: c.errors['min'].min } };
    if (c.errors['max']) return { key: 'validation.max', params: { max: c.errors['max'].max } };
    if (c.errors['minlength']) {
      return { key: 'validation.minLength', params: { min: c.errors['minlength'].requiredLength } };
    }
    if (c.errors['maxlength']) {
      return { key: 'validation.maxLength', params: { max: c.errors['maxlength'].requiredLength } };
    }
    if (c.errors['surnameRequired']) return { key: 'validation.surnameRequired' };
    if (c.errors['phoneInvalid']) return { key: 'validation.phoneInvalid' };
    if (c.errors['walletNumberInvalid']) return { key: 'validation.walletNumberInvalid' };
    if (c.errors['nameInvalid']) return { key: 'validation.nameInvalid' };
    if (c.errors['unsafeChars']) return { key: 'validation.unsafeChars' };
    if (c.errors['dateInvalid']) return { key: 'validation.dateInvalid' };
    if (c.errors['dateInFuture']) return { key: 'validation.dateInFuture' };
    if (c.errors['minAge']) return { key: 'validation.minAge', params: { min: c.errors['minAge'].requiredAge } };
    if (c.errors['maxAge']) return { key: 'validation.maxAge', params: { max: c.errors['maxAge'].requiredAge } };
    if (c.errors['limitMismatch']) return { key: 'validation.limitMismatch' };
    if (c.errors['api']) return { key: String(c.errors['api']) };
    return { key: 'validation.invalid' };
  }

  displayError(path: string): { key: string; params?: Record<string, unknown> } | null {
    if (!this.isInvalid(path)) return null;
    const err = this.getError(path);
    if (!err) return null;
    if (err.key === 'validation.limitMismatch') return null;
    return err;
  }

  hasDisplayError(path: string): boolean {
    return this.displayError(path) !== null;
  }

  private classValueToObject(value?: ClassValue | null): { [csClass: string]: boolean } {
    if (!value) return {};
    if (typeof value === 'string') {
      return value.split(/\s+/).filter(Boolean).reduce((acc, cls) => {
        acc[cls] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }
    if (Array.isArray(value)) {
      return value.reduce((acc, item) => {
        if (typeof item === 'string') acc[item] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }
    if (value instanceof Set) {
      return Array.from(value).reduce((acc, cls) => {
        acc[cls] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }
    return { ...value };
  }

  onSubmit(event: Event) {
    if (this.preventSubmit) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.submit();
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.submitted.emit(this.form.getRawValue());
  }

  resetTo(value?: Record<string, unknown> | null) {
    if (value) {
      this.form.reset(value, { emitEvent: false });
    } else {
      this.form.reset(undefined, { emitEvent: false });
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.setBaselineFromForm();
  }
}
