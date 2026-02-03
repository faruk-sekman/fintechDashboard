import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-ui-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, UiButtonComponent],
  templateUrl: './ui-confirm-dialog.component.html',
  styleUrl: './ui-confirm-dialog.component.scss'
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

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
