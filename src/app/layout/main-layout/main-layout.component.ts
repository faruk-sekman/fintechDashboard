/*
 * Copyright (c) 2026 Fintech Dashboard contributors.
 */

import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { routeFade } from '@shared/animations/route-animations';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TranslateModule, HeaderComponent, SidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  animations: [routeFade],
})
export class MainLayoutComponent {
  mobileNavOpen = false;
  readonly routeKey = signal('home');

  toggleMobileNav() {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav() {
    this.mobileNavOpen = false;
  }

  updateRoute(outlet: RouterOutlet): void {
    queueMicrotask(() => {
      this.routeKey.set(this.prepareRoute(outlet));
    });
  }

  /** Distinct key per page so the route transition fires on real navigations. */
  prepareRoute(outlet: RouterOutlet): string {
    if (!outlet || !outlet.isActivated) {
      return this.routeKey();
    }
    return outlet.activatedRoute.snapshot.routeConfig?.path || 'home';
  }
}
