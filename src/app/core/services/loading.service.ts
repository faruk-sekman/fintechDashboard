import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private active = 0;
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading$.asObservable();

  start() {
    this.active++;
    if (this.active === 1) this._loading$.next(true);
  }

  end() {
    this.active = Math.max(0, this.active - 1);
    if (this.active === 0) this._loading$.next(false);
  }
}
