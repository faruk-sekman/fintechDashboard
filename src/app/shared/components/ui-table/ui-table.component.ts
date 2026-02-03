import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '@shared/components/ui-button/ui-button.component';
import { UiBadgeComponent, UiBadgeColor, UiBadgeIconPosition, ClassValue } from '@shared/components/ui-badge/ui-badge.component';
import { UiPaginationComponent } from '@shared/components/ui-pagination/ui-pagination.component';
import { ColumnDef, PageEvent } from '@shared/components/ui-table/ui-table.types';

@Component({
  selector: 'app-ui-table',
  standalone: true,
  imports: [CommonModule, TranslateModule, UiButtonComponent, UiBadgeComponent, UiPaginationComponent],
  templateUrl: './ui-table.component.html',
  styleUrls: ['./ui-table.component.scss']
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

  constructor(private i18n: TranslateService) {}

  displayCell(col: ColumnDef<T>, row: T): string {
    const raw = row[col.key as string];
    if (col.formatter) return col.formatter(raw, row);
    if (raw === undefined || raw === null) return '-';

    if (col.type === 'currency' && typeof raw === 'number') {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: (row as any).currency ?? 'TRY' }).format(raw);
    }
    if (col.type === 'date') {
      const d = new Date(String(raw));
      return isNaN(d.getTime()) ? String(raw) : d.toLocaleString(this.i18n.currentLang);
    }
    return String(raw);
  }

  badgeColor(col: ColumnDef<T>, row: T): UiBadgeColor {
    const value = row[col.key as string];
    const resolved = typeof col.badgeColor === 'function' ? col.badgeColor(value, row) : col.badgeColor;
    return resolved ?? 'gray';
  }

  badgeClass(col: ColumnDef<T>, row: T): ClassValue | null {
    const value = row[col.key as string];
    const resolved = typeof col.badgeClass === 'function' ? col.badgeClass(value, row) : col.badgeClass;
    return resolved ?? null;
  }

  badgeIcon(col: ColumnDef<T>, row: T): string | null {
    const value = row[col.key as string];
    const resolved = typeof col.badgeIcon === 'function' ? col.badgeIcon(value, row) : col.badgeIcon;
    return resolved ?? null;
  }

  badgeIconPosition(col: ColumnDef<T>, row: T): UiBadgeIconPosition {
    const value = row[col.key as string];
    const resolved = typeof col.badgeIconPosition === 'function'
      ? col.badgeIconPosition(value, row)
      : col.badgeIconPosition;
    return resolved ?? 'left';
  }

  badgeIconClass(col: ColumnDef<T>, row: T): ClassValue | null {
    const value = row[col.key as string];
    const resolved = typeof col.badgeIconClass === 'function'
      ? col.badgeIconClass(value, row)
      : col.badgeIconClass;
    return resolved ?? null;
  }

  toggleOn(col: ColumnDef<T>, row: T): boolean {
    return Boolean(row[col.key as string]);
  }

  onPageChange(e: PageEvent) {
    this.pageChange.emit(e);
  }
}
