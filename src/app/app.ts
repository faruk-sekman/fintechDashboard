/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService, type TranslationObject } from '@ngx-translate/core';
import { environment } from '../environments/environment';
import { registerLocaleData } from '@angular/common';
import localeTr from '@angular/common/locales/tr';
import localeEn from '@angular/common/locales/en';
import trTranslations from '../assets/i18n/tr.json';
import enTranslations from '../assets/i18n/en.json';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  constructor(private readonly i18n: TranslateService) {
    registerLocaleData(localeTr);
    registerLocaleData(localeEn);
    this.i18n.setTranslation('tr', trTranslations as TranslationObject);
    this.i18n.setTranslation('en', enTranslations as TranslationObject);
  }

  ngOnInit(): void {
    const lang = this.readSavedLanguage() ?? environment.defaultLanguage;
    this.i18n.use(lang);
  }

  private readSavedLanguage(): 'en' | 'tr' | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const saved = localStorage.getItem('lang');
      if (saved === 'tr' || saved === 'en') return saved;
      return null;
    } catch {
      return null;
    }
  }
}
