import { ValidatorFn } from '@angular/forms';

export type FieldType = 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'select' | 'checkbox';

export interface SelectOption {
  labelKey: string;
  value: any;
}

export type ClassValue = string | string[] | Set<string> | { [csClass: string]: any };

export interface FieldConfig {
  name: string; 
  labelKey: string;
  type: FieldType;
  placeholderKey?: string;
  validators?: ValidatorFn[];
  options?: SelectOption[];
  hintKey?: string;
  fieldClass?: ClassValue;
  controlClass?: ClassValue;
  inputMask?: string;
  readOnly?: boolean;
  disabled?: boolean;
}
