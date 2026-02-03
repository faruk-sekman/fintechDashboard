import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-skeleton.component.html',
  styleUrl: './ui-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSkeletonComponent {
  @Input() variant: 'line' | 'block' | 'circle' = 'line';
  @Input() width: string | null = null;
  @Input() height: string | null = null;
  @Input() radius: string | null = null;
  @Input() animate = true;

  get styles(): Record<string, string> {
    const s: Record<string, string> = {};
    if (this.width) s['--skeleton-w'] = this.width;
    if (this.height) s['--skeleton-h'] = this.height;
    if (this.radius) s['--skeleton-r'] = this.radius;
    return s;
  }
}
