import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../environments/environment';
import { registerLocaleData } from '@angular/common';
import localeTr from '@angular/common/locales/tr';
import localeEn from '@angular/common/locales/en';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(private i18n: TranslateService) {
    registerLocaleData(localeTr);
    registerLocaleData(localeEn);
  }

  ngOnInit(): void {
    const saved = localStorage.getItem('lang');
    const lang = saved === 'tr' || saved === 'en' ? saved : environment.defaultLanguage;
    this.i18n.use(lang);
  }
}
