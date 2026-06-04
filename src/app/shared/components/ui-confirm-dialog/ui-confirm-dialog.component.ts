/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';

let confirmDialogSeq = 0;

@Component({
  selector: 'app-ui-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, UiButtonComponent],
  templateUrl: './ui-confirm-dialog.component.html',
  styleUrl: './ui-confirm-dialog.component.scss',
})
export class UiConfirmDialogComponent {
  @Input() open = false;
  @Input() titleKey = 'common.confirm';
  @Input() messageKey = 'common.confirmMessage';
  @Input() messageParams: Record<string, unknown> | null = null;
  @Input() confirmLabelKey = 'common.delete';
  @Input() cancelLabelKey = 'common.cancel';
  @Input() loadingLabelKey = 'common.deleting';
  @Input() loading = false;
  @Input() icon = 'ri-alert-line';
  @Input() confirmIcon = 'ri-delete-bin-6-line';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  // Unique ids so aria-labelledby/-describedby resolve even with multiple dialogs.
  private readonly seq = confirmDialogSeq++;
  readonly titleId = `confirm-title-${this.seq}`;
  readonly messageId = `confirm-message-${this.seq}`;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open && !this.loading) this.cancel.emit();
  }
}
