import { UiBadgeColor } from '@shared/components/ui-badge/ui-badge.component';
import { SelectOption } from '@shared/components/ui-form/ui-form.types';
import { KycStatus } from '@shared/models/customer.model';

export const KYC_STATUS_ORDER: KycStatus[] = ['UNKNOWN', 'UNVERIFIED', 'VERIFIED', 'CONTRACTED'];

export const KYC_STATUS_BADGE_COLORS: Record<KycStatus, UiBadgeColor> = {
  UNKNOWN: 'zinc',
  UNVERIFIED: 'red',
  VERIFIED: 'green',
  CONTRACTED: 'cyan'
};

export const getKycStatusBadgeColor = (status: KycStatus | string): UiBadgeColor => {
  const key = status as KycStatus;
  return KYC_STATUS_BADGE_COLORS[key] ?? 'zinc';
};

export const KYC_STATUS_OPTIONS: SelectOption[] = KYC_STATUS_ORDER.map((status) => ({
  labelKey: status,
  value: status
}));

export const KYC_STATUS_FILTER_OPTIONS: SelectOption[] = [
  { labelKey: 'common.all', value: '' },
  ...KYC_STATUS_OPTIONS
];
