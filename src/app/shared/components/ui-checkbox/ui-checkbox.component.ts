import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-ui-checkbox',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ui-checkbox.component.html',
  styleUrl: './ui-checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiCheckboxComponent {
  @Input({ required: true }) control!: FormControl;
  @Input() id: string | null = null;
  @Input() inputClass: string | string[] | Set<string> | { [csClass: string]: any } | null = null;
  @Input() label: string | null = null;
  @Input() readOnly: boolean = false;
  @Input() disabled: boolean = false;
}
