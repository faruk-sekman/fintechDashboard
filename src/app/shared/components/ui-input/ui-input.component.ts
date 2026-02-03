import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ui-input.component.html',
  styleUrl: './ui-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiInputComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) control!: FormControl;
  @Input() id: string | null = null;
  @Input() type: 'text' | 'email' | 'number' | 'date' | 'datetime-local' = 'text';
  @Input() lang: string | null = null;
  @Input() inputClass: string | string[] | Set<string> | { [csClass: string]: any } | null = null;
  @Input() placeholder: string | null = null;
  @Input() mask: string | null = null;
  @Input() readOnly: boolean = false;
  @Input() disabled: boolean = false;
  @Input() min: string | number | null = null;
  @Input() max: string | number | null = null;
  @Input() ariaInvalid: boolean | null = null;

  private maskSub?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.control) return;
    if (changes['disabled'] || changes['control']) {
      if (this.disabled && this.control.enabled) {
        this.control.disable({ emitEvent: false });
      } else if (!this.disabled && this.control.disabled) {
        this.control.enable({ emitEvent: false });
      }
    }
    if (changes['control'] || changes['mask']) {
      this.setupMask();
    }
  }

  ngOnDestroy(): void {
    this.maskSub?.unsubscribe();
  }

  private setupMask() {
    this.maskSub?.unsubscribe();
    if (!this.control || !this.mask || this.type === 'number') return;

    const apply = (value: unknown) => {
      if (value === null || value === undefined) return;
      const formatted = this.applyMask(String(value));
      if (formatted !== value) {
        this.control.setValue(formatted, { emitEvent: false });
      }
    };

    apply(this.control.value);
    this.maskSub = this.control.valueChanges.subscribe((value) => apply(value));
  }

  private applyMask(value: string): string {
    const digits = value.replace(/\D+/g, '');
    if (!digits) return '';
    let out = '';
    let i = 0;
    for (const ch of this.mask ?? '') {
      if (ch === '#') {
        if (i >= digits.length) break;
        out += digits[i++];
      } else {
        if (i >= digits.length) break;
        out += ch;
      }
    }
    return out;
  }
}
