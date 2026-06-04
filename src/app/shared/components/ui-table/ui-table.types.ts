/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import type { UiBadgeColor } from '@shared/components/ui-badge/ui-badge.component';

export type ColumnType = 'text' | 'currency' | 'date' | 'badge' | 'toggle';

export interface ColumnDef<T> {
  key: keyof T;
  headerKey: string;
  type?: ColumnType;
  formatter?: (value: any, row: T) => string;
  widthClass?: string;
  badgeColor?: UiBadgeColor | ((value: any, row: T) => UiBadgeColor);
  badgeIcon?: string | null | ((value: any, row: T) => string | null);
}

export interface PageEvent {
  page: number; // 1-based
  pageSize: number;
}
