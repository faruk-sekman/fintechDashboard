import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './app';

class TranslateMock {
  use = vi.fn();
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses saved language if present', () => {
    localStorage.setItem('lang', 'tr');
    const i18n = new TranslateMock();
    const app = new App(i18n as any);

    app.ngOnInit();
    expect(i18n.use).toHaveBeenCalledWith('tr');
  });

  it('falls back to default language when saved is invalid', () => {
    localStorage.setItem('lang', 'fr');
    const i18n = new TranslateMock();
    const app = new App(i18n as any);

    app.ngOnInit();
    expect(i18n.use).toHaveBeenCalledWith('tr');
  });
});
