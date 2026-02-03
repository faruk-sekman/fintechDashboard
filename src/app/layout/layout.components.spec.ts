import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ThemeService } from '@core/services/theme.service';
import { LoadingService } from '@core/services/loading.service';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

class TranslateMock {
  currentLang = 'en';
  use = vi.fn((lang: string) => {
    this.currentLang = lang;
  });
}

describe('Layout components', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ThemeService, useValue: { theme: signal<'light' | 'dark'>('light'), setTheme: vi.fn() } },
        { provide: LoadingService, useValue: { loading$: of(false) } },
        { provide: TranslateService, useClass: TranslateMock }
      ]
    });
  });

  it('HeaderComponent switches language and theme', () => {
    const translate = TestBed.inject(TranslateService) as any as TranslateMock;
    const component = TestBed.runInInjectionContext(
      () => new HeaderComponent(translate as any, TestBed.inject(LoadingService))
    );

    component.switchLang('tr');
    expect(translate.use).toHaveBeenCalledWith('tr');
    expect(component.currentLang()).toBe('tr');

    const themeService = TestBed.inject(ThemeService) as any;
    component.setTheme('dark');
    expect(themeService.setTheme).toHaveBeenCalledWith('dark');
  });

  it('MainLayoutComponent and SidebarComponent instantiate', () => {
    expect(new MainLayoutComponent()).toBeTruthy();
    expect(new SidebarComponent()).toBeTruthy();
  });
});
