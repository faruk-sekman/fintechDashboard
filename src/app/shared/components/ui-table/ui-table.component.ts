/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiBadgeComponent, UiBadgeColor } from '@shared/components/ui-badge/ui-badge.component';
import { UiPaginationComponent } from '@shared/components/ui-pagination/ui-pagination.component';
import { ColumnDef, PageEvent } from '@shared/components/ui-table/ui-table.types';

@Component({
  selector: 'app-ui-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    UiButtonComponent,
    UiBadgeComponent,
    UiPaginationComponent,
  ],
  templateUrl: './ui-table.component.html',
  styleUrls: ['./ui-table.component.scss'],
})
export class UiTableComponent<T extends Record<string, any>> {
  @Input({ required: true }) columns!: ColumnDef<T>[];
  @Input({ required: true }) data!: T[];

  @Input() loading = false;
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() showFilters = false;
  @Input() pageWindow = 5;

  @Input() rowActionLabelKey = 'common.details';

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() rowAction = new EventEmitter<T>();

  @ContentChild('rowActions', { read: TemplateRef }) rowActionsTemplate?: TemplateRef<unknown>;

  constructor(private readonly i18n: TranslateService) {}

  displayCell(col: ColumnDef<T>, row: T): string {
    const raw = row[col.key as string];
    if (col.formatter) return col.formatter(raw, row);
    if (raw === undefined || raw === null) return '-';

    if (col.type === 'currency' && typeof raw === 'number') {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: (row as any).currency ?? 'TRY',
      }).format(raw);
    }
    if (col.type === 'date') {
      const d = new Date(String(raw));
      if (isNaN(d.getTime())) return String(raw);
      return d.toLocaleString(this.i18n.currentLang);
    }
    return String(raw);
  }

  badgeColor(col: ColumnDef<T>, row: T): UiBadgeColor {
    const value = row[col.key as string];
    let resolved: UiBadgeColor | undefined;
    if (typeof col.badgeColor === 'function') {
      resolved = col.badgeColor(value, row);
    } else {
      resolved = col.badgeColor;
    }
    return resolved ?? 'gray';
  }

  badgeIcon(col: ColumnDef<T>, row: T): string | null {
    const value = row[col.key as string];
    let resolved: string | null | undefined;
    if (typeof col.badgeIcon === 'function') {
      resolved = col.badgeIcon(value, row);
    } else {
      resolved = col.badgeIcon;
    }
    return resolved ?? null;
  }

  toggleOn(col: ColumnDef<T>, row: T): boolean {
    return Boolean(row[col.key as string]);
  }

  /** Stable identity for @for: prefer the row's `id`, fall back to index. */
  trackRow(row: T, index: number): string | number {
    const id = row['id'];
    return typeof id === 'string' || typeof id === 'number' ? id : index;
  }

  onPageChange(e: PageEvent) {
    this.pageChange.emit(e);
  }
}
