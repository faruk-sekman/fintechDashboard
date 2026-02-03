import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { TranslateService } from '@ngx-translate/core';
import { LoadingService } from '@core/services/loading.service';
import { ThemeService } from '@core/services/theme.service';

describe('HeaderComponent', () => {
  it('switches language and resolves currentLang', () => {
    const i18n = { use: vi.fn(), currentLang: 'tr' };
    const loading = { loading$: { subscribe: vi.fn() } };
    const theme = { theme: () => 'light', setTheme: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: i18n },
        { provide: LoadingService, useValue: loading },
        { provide: ThemeService, useValue: theme }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new HeaderComponent(i18n as any, loading as any));
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
        { provide: ThemeService, useValue: theme }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new HeaderComponent(i18n as any, loading as any));
    component.setTheme('dark');
    expect(theme.setTheme).toHaveBeenCalledWith('dark');
  });
});
