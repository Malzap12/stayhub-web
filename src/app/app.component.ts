import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="cupertino-shell">
      <app-navbar></app-navbar>
      <main class="cupertino-main">
        <router-outlet></router-outlet>
      </main>
      <footer class="cupertino-footer">
        <div class="footer-inner">
          <div class="footer-top">
            <div class="footer-brand">
              <span class="footer-mark" aria-hidden="true">LR</span>
              <span class="footer-name">Inversiones LR</span>
              <span class="status-pill">
                <span class="status-dot"></span>
                Sistemas Operativos 100%
              </span>
            </div>
            <div class="footer-locale">
              <span>Español (CO)</span>
              <span class="divider">•</span>
              <span>COP ($)</span>
            </div>
          </div>
          <div class="footer-bottom">
            <p>
              Inversiones LR Marketplace © 2026 — Ingeniería de Software 1 · Universidad El Bosque. Todos los derechos reservados.
            </p>
            <div class="footer-links">
              <a href="#privacidad" (click)="$event.preventDefault()">Privacidad</a>
              <a href="#terminos" (click)="$event.preventDefault()">Términos de Servicio</a>
              <a href="#cancelacion" (click)="$event.preventDefault()">Política de Cancelación</a>
              <a href="#mapa" (click)="$event.preventDefault()">Mapa del Sitio</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .cupertino-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f5f5f7;
      color: #1d1d1f;
    }
    .cupertino-main {
      flex: 1;
      width: 100%;
      max-width: 1240px;
      margin: 0 auto;
      padding: 24px 24px 56px;
    }
    .cupertino-footer {
      background: #ffffff;
      border-top: 1px solid rgba(0, 0, 0, 0.07);
    }
    .footer-inner {
      max-width: 1240px;
      margin: 0 auto;
      padding: 28px 24px;
    }
    .footer-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .footer-mark {
      width: 24px;
      height: 24px;
      border-radius: 7px;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .footer-name {
      font-weight: 600;
      font-size: 0.95rem;
      letter-spacing: -0.02em;
      color: #1d1d1f;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 980px;
      background: #f5f5f7;
      font-size: 0.72rem;
      font-weight: 500;
      color: #515154;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #248a3d;
    }
    .footer-locale {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #515154;
    }
    .divider {
      opacity: 0.4;
    }
    .footer-bottom {
      padding-top: 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.75rem;
      color: #86868b;
    }
    .footer-bottom p {
      margin: 0;
    }
    .footer-links {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
    }
    .footer-links a {
      color: #6e6e73;
      text-decoration: none;
    }
    .footer-links a:hover {
      color: #1d1d1f;
    }
  `],
})
export class AppComponent {
  title = 'inversiones-lr-web';
}

