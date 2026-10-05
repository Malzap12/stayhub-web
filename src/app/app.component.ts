import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <main style="padding: 24px; max-width: 1200px; margin: 0 auto;">
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {
  title = 'inversiones-lr-web';
}
