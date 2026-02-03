import { Injectable, effect, signal } from '@angular/core';
import { AppErrorService } from '@core/services/app-error.service';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<ThemeMode>('light');
  readonly theme = this.themeSignal.asReadonly();

  constructor(private appError: AppErrorService) {
    this.themeSignal.set(this.readInitialTheme());
    effect(() => {
      const theme = this.themeSignal();
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.style.colorScheme = theme;
      }
      this.persist(theme);
    });
  }

  setTheme(theme: ThemeMode) {
    this.themeSignal.set(theme);
  }

  toggleTheme() {
    this.themeSignal.set(this.themeSignal() === 'dark' ? 'light' : 'dark');
  }

  private readInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (err) {
      this.appError.handleError(err, { source: 'ThemeService', operation: 'readInitialTheme.storage' });
    }
    try {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    } catch (err) {
      this.appError.handleError(err, { source: 'ThemeService', operation: 'readInitialTheme.media' });
      return 'light';
    }
  }

  private persist(theme: ThemeMode) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (err) {
      this.appError.handleError(err, { source: 'ThemeService', operation: 'persistTheme' });
    }
  }
}
