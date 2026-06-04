/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-button.component.html',
  styleUrl: './ui-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'ghost' | 'danger' | 'red' = 'primary';
  @Input() disabled = false;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() id: string | null = null;
  @Input() class: string | null = null;
}
