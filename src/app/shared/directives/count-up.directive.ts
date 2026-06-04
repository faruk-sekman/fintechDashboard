/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { Directive, ElementRef, Input, NgZone, OnChanges, OnDestroy, inject } from '@angular/core';

/**
 * Animates the host element's text from its previously displayed value up
 * to the bound number, using `requestAnimationFrame` and an ease-out curve.
 *
 * Usage:
 *   <span [appCountUp]="vm.total"></span>
 *   <span [appCountUp]="rate" countUpSuffix="%"></span>
 *   <span [appCountUp]="balance" [countUpDecimals]="2"></span>
 *
 * Presentation only: it writes to `textContent` and never mutates the
 * underlying value. Honors `prefers-reduced-motion` by snapping straight
 * to the final value, and falls back gracefully where rAF is unavailable.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnChanges, OnDestroy {
  @Input() appCountUp: number | null = 0;
  @Input() countUpDuration = 900;
  @Input() countUpDecimals = 0;
  @Input() countUpPrefix = '';
  @Input() countUpSuffix = '';

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);

  private frameId: number | null = null;
  private displayed = 0;

  ngOnChanges(): void {
    this.animateTo(this.appCountUp ?? 0);
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private animateTo(target: number): void {
    this.cancel();

    const from = this.displayed;
    const delta = target - from;

    if (delta === 0) {
      this.render(target);
      return;
    }

    if (this.prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
      this.displayed = target;
      this.render(target);
      return;
    }

    // Show the starting value right away so there is no empty flash.
    this.render(from);

    const duration = Math.max(this.countUpDuration, 1);

    this.zone.runOutsideAngular(() => {
      let start: number | null = null;

      const step = (timestamp: number): void => {
        if (start === null) {
          start = timestamp;
        }

        const progress = Math.min((timestamp - start) / duration, 1);
        const current = from + delta * this.easeOutExpo(progress);

        this.displayed = current;
        this.render(current);

        if (progress < 1) {
          this.frameId = requestAnimationFrame(step);
        } else {
          this.displayed = target;
          this.render(target);
          this.frameId = null;
        }
      };

      this.frameId = requestAnimationFrame(step);
    });
  }

  private render(value: number): void {
    let rounded = value;
    if (this.countUpDecimals <= 0) {
      rounded = Math.round(value);
    }
    const formatted = rounded.toLocaleString(undefined, {
      minimumFractionDigits: this.countUpDecimals,
      maximumFractionDigits: this.countUpDecimals,
    });
    this.host.textContent = `${this.countUpPrefix}${formatted}${this.countUpSuffix}`;
  }

  private cancel(): void {
    if (this.frameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.frameId);
    }
    this.frameId = null;
  }

  private easeOutExpo(t: number): number {
    if (t === 1) return 1;
    return 1 - Math.pow(2, -10 * t);
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
