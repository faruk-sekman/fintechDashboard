/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { TranslateService } from '@ngx-translate/core';
import { LoadingService } from '@core/services/loading.service';
import { ThemeService } from '@core/services/theme.service';

describe('HeaderComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('switches language and resolves currentLang', () => {
    const i18n = { use: vi.fn(), currentLang: 'tr' };
    const loading = { loading$: { subscribe: vi.fn() } };
    const theme = { theme: () => 'light', setTheme: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: i18n },
        { provide: LoadingService, useValue: loading },
        { provide: ThemeService, useValue: theme },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new HeaderComponent(i18n as any, loading as any),
    );
    component.switchLang('tr');
    expect(i18n.use).toHaveBeenCalledWith('tr');
    expect(component.currentLang()).toBe('tr');

    i18n.currentLang = 'en';
    expect(component.currentLang()).toBe('en');
  });

  it('sets theme mode', () => {
    const i18n = { use: vi.fn(), currentLang: 'en' };
    const loading = { loading$: { subscribe: vi.fn() } };
    const theme = { theme: () => 'light', setTheme: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: i18n },
        { provide: LoadingService, useValue: loading },
        { provide: ThemeService, useValue: theme },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new HeaderComponent(i18n as any, loading as any),
    );
    component.setTheme('dark');
    expect(theme.setTheme).toHaveBeenCalledWith('dark');
  });

  it('persists selected language when browser storage is available', () => {
    const i18n = { use: vi.fn(), currentLang: 'en' };
    const loading = { loading$: { subscribe: vi.fn() } };
    const theme = { theme: () => 'light', setTheme: vi.fn() };
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: i18n },
        { provide: LoadingService, useValue: loading },
        { provide: ThemeService, useValue: theme },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new HeaderComponent(i18n as any, loading as any),
    );
    component.switchLang('tr');

    expect(setItem).toHaveBeenCalledWith('lang', 'tr');
    setItem.mockRestore();
  });

  it('keeps language switch working when browser storage throws', () => {
    const i18n = { use: vi.fn(), currentLang: 'en' };
    const loading = { loading$: { subscribe: vi.fn() } };
    const theme = { theme: () => 'light', setTheme: vi.fn() };
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: i18n },
        { provide: LoadingService, useValue: loading },
        { provide: ThemeService, useValue: theme },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new HeaderComponent(i18n as any, loading as any),
    );

    expect(() => component.switchLang('tr')).not.toThrow();
    expect(i18n.use).toHaveBeenCalledWith('tr');
    setItem.mockRestore();
  });

  it('keeps language switch working when browser storage is absent', () => {
    const i18n = { use: vi.fn(), currentLang: 'en' };
    const loading = { loading$: { subscribe: vi.fn() } };
    const theme = { theme: () => 'light', setTheme: vi.fn() };
    vi.stubGlobal('localStorage', undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: i18n },
        { provide: LoadingService, useValue: loading },
        { provide: ThemeService, useValue: theme },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new HeaderComponent(i18n as any, loading as any),
    );

    expect(() => component.switchLang('tr')).not.toThrow();
    expect(i18n.use).toHaveBeenCalledWith('tr');
  });
});
