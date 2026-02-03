import { describe, it, expect } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import {
  walletLimitsConsistencyValidator,
  turkishNationalIdValidator,
  trimmedRequiredValidator,
  noMultipleSpacesValidator,
  fullNameValidator,
  safeTextValidator,
  nameValidator,
  phoneNumberValidator,
  walletNumberValidator,
  strictEmailValidator,
  dateOfBirthValidator
} from '@shared/validators/custom.validators';

describe('custom validators', () => {
  it('walletLimitsConsistencyValidator sets mismatch errors', () => {
    const form = new FormGroup({
      dailyLimit: new FormControl(100),
      monthlyLimit: new FormControl(50)
    });
    const validator = walletLimitsConsistencyValidator();
    const result = validator(form);
    expect(result).toEqual({ limitMismatch: true });
    expect(form.get('dailyLimit')?.errors?.['limitMismatch']).toBe(true);
    expect(form.get('monthlyLimit')?.errors?.['limitMismatch']).toBe(true);
  });

  it('walletLimitsConsistencyValidator clears mismatch when valid', () => {
    const form = new FormGroup({
      dailyLimit: new FormControl(10),
      monthlyLimit: new FormControl(50)
    });
    const validator = walletLimitsConsistencyValidator();
    const result = validator(form);
    expect(result).toBeNull();
    expect(form.get('dailyLimit')?.errors).toBeNull();
    expect(form.get('monthlyLimit')?.errors).toBeNull();
  });

  it('walletLimitsConsistencyValidator skips when controls are missing', () => {
    const form = new FormGroup({});
    const validator = walletLimitsConsistencyValidator('daily', 'monthly');
    expect(validator(form)).toBeNull();
  });

  it('walletLimitsConsistencyValidator skips non-numeric values', () => {
    const form = new FormGroup({
      dailyLimit: new FormControl('abc'),
      monthlyLimit: new FormControl(100)
    });
    const validator = walletLimitsConsistencyValidator();
    expect(validator(form)).toBeNull();
  });

  it('walletLimitsConsistencyValidator respects blocking errors', () => {
    const form = new FormGroup({
      dailyLimit: new FormControl(10),
      monthlyLimit: new FormControl(50)
    });
    form.get('dailyLimit')?.setErrors({ required: true });
    const validator = walletLimitsConsistencyValidator();
    expect(validator(form)).toBeNull();
    expect(form.get('dailyLimit')?.errors?.['required']).toBe(true);
    expect(form.get('dailyLimit')?.errors?.['limitMismatch']).toBeUndefined();
  });

  it('walletLimitsConsistencyValidator clears limitMismatch when values are empty', () => {
    const form = new FormGroup({
      dailyLimit: new FormControl(''),
      monthlyLimit: new FormControl('')
    });
    form.get('dailyLimit')?.setErrors({ limitMismatch: true, other: true });
    form.get('monthlyLimit')?.setErrors({ limitMismatch: true });
    const validator = walletLimitsConsistencyValidator();
    expect(validator(form)).toBeNull();
    expect(form.get('dailyLimit')?.errors).toEqual({ other: true });
    expect(form.get('monthlyLimit')?.errors).toBeNull();
  });

  it('turkishNationalIdValidator enforces digits, length, and leading zero', () => {
    const validator = turkishNationalIdValidator();
    expect(validator(new FormControl(''))).toBeNull();
    expect(validator(new FormControl('0abc'))).toEqual({ nationalIdStartsWithZero: true });
    expect(validator(new FormControl('123'))).toEqual({ nationalIdLength: true });
    expect(validator(new FormControl('01234567890'))).toEqual({ nationalIdStartsWithZero: true });
    expect(validator(new FormControl('1234567890a'))).toEqual({ nationalIdNumeric: true });
    expect(validator(new FormControl('12345678901'))).toBeNull();
  });

  it('trimmedRequiredValidator checks whitespace only', () => {
    const validator = trimmedRequiredValidator();
    expect(validator(new FormControl('   '))).toEqual({ required: true });
    expect(validator(new FormControl('a'))).toBeNull();
  });

  it('noMultipleSpacesValidator detects multiple spaces', () => {
    const validator = noMultipleSpacesValidator();
    expect(validator(new FormControl('a  b'))).toEqual({ multipleSpaces: true });
    expect(validator(new FormControl('a b'))).toBeNull();
  });

  it('fullNameValidator validates multi-part names', () => {
    const validator = fullNameValidator();
    expect(validator(new FormControl('John'))).toEqual({ surnameRequired: true });
    expect(validator(new FormControl('J D'))).toEqual({ nameInvalid: true });
    expect(validator(new FormControl('John Doe'))).toBeNull();
  });

  it('safeTextValidator blocks unsafe chars', () => {
    const validator = safeTextValidator();
    expect(validator(new FormControl('<script>'))).toEqual({ unsafeChars: true });
    expect(validator(new FormControl('Hello'))).toBeNull();
  });

  it('nameValidator validates name format', () => {
    const validator = nameValidator();
    expect(validator(new FormControl('1'))).toEqual({ nameInvalid: true });
    expect(validator(new FormControl('John Doe'))).toBeNull();
  });

  it('phoneNumberValidator validates digits', () => {
    const validator = phoneNumberValidator();
    expect(validator(new FormControl('abc'))).toEqual({ phoneInvalid: true });
    expect(validator(new FormControl('+90 5551112233'))).toEqual({ phoneInvalid: true });
    expect(validator(new FormControl('90555-111-2233'))).toEqual({ phoneInvalid: true });
    expect(validator(new FormControl('+905551112233'))).toBeNull();
  });

  it('walletNumberValidator validates length and digits', () => {
    const validator = walletNumberValidator();
    expect(validator(new FormControl('123'))).toEqual({ walletNumberInvalid: true });
    expect(validator(new FormControl('1234567890123456'))).toBeNull();
  });

  it('strictEmailValidator validates email format', () => {
    const validator = strictEmailValidator();
    expect(validator(new FormControl('a@b'))).toEqual({ email: true });
    expect(validator(new FormControl('a..b@c.com'))).toEqual({ email: true });
    const longLocal = `${'a'.repeat(65)}@example.com`;
    expect(validator(new FormControl(longLocal))).toEqual({ email: true });
    expect(validator(new FormControl('a@b.com'))).toBeNull();
  });

  it('dateOfBirthValidator enforces age bounds and date validity', () => {
    const validator = dateOfBirthValidator({ minAge: 18, maxAge: 120 });
    expect(validator(new FormControl(''))).toBeNull();
    expect(validator(new FormControl('invalid'))).toEqual({ dateInvalid: true });
    expect(validator(new FormControl('2024-13-01'))).toEqual({ dateInvalid: true });
    expect(validator(new FormControl('2024-02-30'))).toEqual({ dateInvalid: true });
    expect(validator(new FormControl('3000-01-01'))).toEqual({ dateInFuture: true });
    const young = new Date();
    young.setFullYear(young.getFullYear() - 10);
    const youngStr = `${young.getFullYear()}-${String(young.getMonth() + 1).padStart(2, '0')}-${String(young.getDate()).padStart(2, '0')}`;
    expect(validator(new FormControl(youngStr))?.['minAge']).toBeTruthy();
    const oldStr = '1900-01-01';
    expect(validator(new FormControl(oldStr))?.['maxAge']).toBeTruthy();
  });

  it('dateOfBirthValidator accepts valid dates in range', () => {
    const validator = dateOfBirthValidator({ minAge: 18, maxAge: 120 });
    const today = new Date();
    const dob = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
    const dobStr = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
    expect(validator(new FormControl(dobStr))).toBeNull();
  });
});
