import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { UiBadgeComponent, UiBadgeColor } from '@shared/components/ui-badge/ui-badge.component';
import { KycStatus } from '@shared/models/customer.model';
import { getKycStatusBadgeColor } from '@shared/utils/kyc-status';

@Component({
  selector: 'app-customer-status-badge',
  standalone: true,
  imports: [CommonModule, UiBadgeComponent],
  templateUrl: './customer-status-badge.component.html',
  styleUrl: './customer-status-badge.component.scss'
})
export class CustomerStatusBadgeComponent {
  @Input() status: KycStatus | string = 'UNKNOWN';

  get color(): UiBadgeColor {
    return getKycStatusBadgeColor(this.status);
  }
}
