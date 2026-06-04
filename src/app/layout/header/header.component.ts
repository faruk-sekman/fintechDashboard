/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { LoadingService } from '@core/services/loading.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();
  loading$: Observable<boolean>;
  private readonly themeService = inject(ThemeService);
  readonly theme = this.themeService.theme;

  constructor(
    private readonly i18n: TranslateService,
    private readonly loading: LoadingService,
  ) {
    this.loading$ = this.loading.loading$;
  }

  switchLang(lang: 'en' | 'tr') {
    this.i18n.use(lang);
    this.persistLang(lang);
  }

  currentLang(): 'en' | 'tr' {
    if (this.i18n.currentLang === 'tr') return 'tr';
    return 'en';
  }

  setTheme(mode: 'light' | 'dark') {
    this.themeService.setTheme(mode);
  }

  private persistLang(lang: 'en' | 'tr') {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lang', lang);
      }
    } catch {
      // Language remains active in memory when browser storage is unavailable.
    }
  }
}
