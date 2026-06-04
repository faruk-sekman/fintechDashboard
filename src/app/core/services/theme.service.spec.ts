/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeService } from '@core/services/theme.service';
import { TestBed } from '@angular/core/testing';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes from localStorage and persists changes', async () => {
    localStorage.setItem('b.theme', 'dark');
    const service = TestBed.runInInjectionContext(() => new ThemeService());

    expect(service.theme()).toBe('dark');
    service.setTheme('light');
    await new Promise(r => setTimeout(r, 0));
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('uses system preference when storage is empty', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true }) as any);
    const service = TestBed.runInInjectionContext(() => new ThemeService());
    expect(service.theme()).toBe('dark');
  });

  it('defaults to light when system preference is light', () => {
    vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: false }) as any);
    const service = TestBed.runInInjectionContext(() => new ThemeService());
    expect(service.theme()).toBe('light');
  });

  it('initializes from localStorage light', () => {
    localStorage.setItem('theme', 'light');
    const service = TestBed.runInInjectionContext(() => new ThemeService());
    expect(service.theme()).toBe('light');
  });

  it('toggles theme', () => {
    const service = TestBed.runInInjectionContext(() => new ThemeService());
    const initial = service.theme();
    service.toggleTheme();
    expect(service.theme()).not.toBe(initial);
    service.toggleTheme();
    expect(service.theme()).toBe(initial);
  });

  it('updates document attributes when theme changes', async () => {
    const service = TestBed.runInInjectionContext(() => new ThemeService());
    service.setTheme('dark');
    await new Promise(r => setTimeout(r, 0));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('handles storage errors gracefully', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: false }) as any);
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('nope');
    });
    const service = TestBed.runInInjectionContext(() => new ThemeService());

    const result = (service as any).readInitialTheme();
    expect(result).toBe('light');
    spy.mockRestore();
  });

  it('handles matchMedia errors gracefully', () => {
    vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
    vi.spyOn(window, 'matchMedia').mockImplementation(() => {
      throw new Error('no media');
    });

    const service = TestBed.runInInjectionContext(() => new ThemeService());
    expect(service.theme()).toBe('light');
  });

  it('returns light when window is undefined', () => {
    const service = TestBed.runInInjectionContext(() => new ThemeService());
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = undefined;
    const result = (service as any).readInitialTheme();
    (globalThis as any).window = originalWindow;
    expect(result).toBe('light');
  });

  it('skips document updates when document is undefined', () => {
    const originalDocument = (globalThis as any).document;
    (globalThis as any).document = undefined;
    const service = TestBed.runInInjectionContext(() => new ThemeService());
    service.setTheme('dark');
    (globalThis as any).document = originalDocument;
    expect(service.theme()).toBe('dark');
  });

  it('keeps theme in memory when persist fails', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: false }) as any);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('no storage');
    });
    const service = TestBed.runInInjectionContext(() => new ThemeService());
    service.setTheme('dark');
    await new Promise(r => setTimeout(r, 0));
    expect(service.theme()).toBe('dark');
  });
});
