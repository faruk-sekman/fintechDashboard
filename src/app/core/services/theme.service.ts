/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';
const LEGACY_THEME_STORAGE_KEY = 'b.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<ThemeMode>('light');
  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    const initialTheme = this.readInitialTheme();
    this.themeSignal.set(initialTheme);
    this.applyTheme(initialTheme);
  }

  setTheme(theme: ThemeMode) {
    this.themeSignal.set(theme);
    this.applyTheme(theme);
    this.persist(theme);
  }

  toggleTheme() {
    if (this.themeSignal() === 'dark') {
      this.setTheme('light');
      return;
    }
    this.setTheme('dark');
  }

  private readInitialTheme(): ThemeMode {
    const storage = this.getStorage();

    if (storage) {
      try {
        const stored = storage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
        const legacyStored = storage.getItem(LEGACY_THEME_STORAGE_KEY);
        if (legacyStored === 'light' || legacyStored === 'dark') return legacyStored;
      } catch {
        return 'light';
      }
    }

    if (typeof window === 'undefined') return 'light';
    try {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      if (prefersDark) return 'dark';
      return 'light';
    } catch {
      return 'light';
    }
  }

  private persist(theme: ThemeMode) {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Preference persistence is non-critical; keep the selected theme in memory.
    }
  }

  private applyTheme(theme: ThemeMode) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
