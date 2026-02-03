import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { LoadingService } from '@core/services/loading.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();
  loading$: Observable<boolean>;
  private themeService = inject(ThemeService);
  readonly theme = this.themeService.theme;

  constructor(private i18n: TranslateService, private loading: LoadingService) {
    this.loading$ = this.loading.loading$;
  }

  switchLang(lang: 'en' | 'tr') {
    this.i18n.use(lang);
    localStorage.setItem('lang', lang);
  }

  currentLang(): 'en' | 'tr' {
    return (this.i18n.currentLang as any) === 'tr' ? 'tr' : 'en';
  }

  setTheme(mode: 'light' | 'dark') {
    this.themeService.setTheme(mode);
  }
}
