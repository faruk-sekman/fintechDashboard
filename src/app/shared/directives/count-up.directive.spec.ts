import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CountUpDirective } from '@shared/directives/count-up.directive';

@Component({
  standalone: true,
  imports: [CountUpDirective],
  template: `<span
    [appCountUp]="value"
    [countUpDuration]="duration"
    [countUpDecimals]="decimals"
    [countUpPrefix]="prefix"
    [countUpSuffix]="suffix"
  ></span>`
})
class HostComponent {
  value: number | null = 0;
  duration = 900;
  decimals = 0;
  prefix = '';
  suffix = '';
}

describe('CountUpDirective', () => {
  let rafQueue: FrameRequestCallback[] = [];
  let cancelSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rafQueue = [];
    let nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return nextId++;
    });
    cancelSpy = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function flush(timestamp: number): void {
    const pending = rafQueue;
    rafQueue = [];
    pending.forEach((cb) => cb(timestamp));
  }

  function setup(init: Partial<HostComponent> = {}): {
    fixture: ComponentFixture<HostComponent>;
    span: HTMLElement;
  } {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    Object.assign(fixture.componentInstance, init);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span') as HTMLElement;
    return { fixture, span };
  }

  function forceReducedMotion(matches: boolean): void {
    window.matchMedia = ((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })) as unknown as typeof window.matchMedia;
  }

  it('animates from zero to the target across frames', () => {
    forceReducedMotion(false);
    const { span } = setup({ value: 80, duration: 900 });

    // Starting value is shown immediately (no empty flash).
    expect(span.textContent).toBe('0');

    flush(0);
    expect(Number(span.textContent)).toBe(0);

    flush(450);
    const mid = Number(span.textContent);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThanOrEqual(80);

    flush(900);
    expect(span.textContent).toBe('80');
  });

  it('snaps straight to the value when reduced motion is preferred', () => {
    forceReducedMotion(true);
    const { span } = setup({ value: 42 });

    expect(span.textContent).toBe('42');
  });

  it('formats with the requested decimals', () => {
    forceReducedMotion(true);
    const { span } = setup({ value: 3.456, decimals: 2 });

    expect(span.textContent).toBe('3.46');
  });

  it('applies prefix and suffix', () => {
    forceReducedMotion(true);
    const { span } = setup({ value: 75, prefix: '$', suffix: '%' });

    expect(span.textContent).toBe('$75%');
  });

  it('renders the value directly for a zero delta', () => {
    forceReducedMotion(false);
    const { span } = setup({ value: 0 });

    expect(span.textContent).toBe('0');
  });

  it('re-renders toward the new value when the input changes', () => {
    forceReducedMotion(true);
    const { fixture, span } = setup({ value: 10 });
    expect(span.textContent).toBe('10');

    const directive = fixture.debugElement
      .query(By.directive(CountUpDirective))
      .injector.get(CountUpDirective);
    directive.appCountUp = 30;
    directive.ngOnChanges();
    expect(span.textContent).toBe('30');
  });

  it('treats a null value as zero', () => {
    forceReducedMotion(true);
    const { span } = setup({ value: null });

    expect(span.textContent).toBe('0');
  });

  it('cancels the pending frame on destroy', () => {
    forceReducedMotion(false);
    const { fixture } = setup({ value: 80 });
    flush(0);

    fixture.destroy();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
