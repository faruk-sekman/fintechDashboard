import type { ClassValue, UiBadgeColor, UiBadgeIconPosition } from '@shared/components/ui-badge/ui-badge.component';

export type ColumnType = 'text' | 'currency' | 'date' | 'badge' | 'toggle';

export interface ColumnDef<T> {
  key: keyof T;
  headerKey: string;
  type?: ColumnType;
  formatter?: (value: any, row: T) => string;
  widthClass?: string;
  badgeColor?: UiBadgeColor | ((value: any, row: T) => UiBadgeColor);
  badgeClass?: ClassValue | ((value: any, row: T) => ClassValue);
  badgeIcon?: string | null | ((value: any, row: T) => string | null);
  badgeIconPosition?: UiBadgeIconPosition | ((value: any, row: T) => UiBadgeIconPosition);
  badgeIconClass?: ClassValue | ((value: any, row: T) => ClassValue);
}

export interface PageEvent {
  page: number;     // 1-based
  pageSize: number;
}
