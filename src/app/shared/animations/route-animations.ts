import { animate, query, style, transition, trigger } from '@angular/animations';

/**
 * Subtle page transition for the main content outlet.
 *
 * Enter-only by design: the leaving view is removed immediately while the
 * entering view fades and rises into place. This avoids the enter/leave
 * height-stacking jank you get when both views animate at once, and keeps
 * the footer stable. Easing mirrors `--motion-ease-emphasized` from
 * _tokens.scss. `prefers-reduced-motion` is honored globally via the
 * reduced-motion block in _animations.scss.
 */
export const routeFade = trigger('routeFade', [
  transition('* => *', [
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(
          '300ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ],
      { optional: true }
    )
  ])
]);
