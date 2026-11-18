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
              <span class="divider" aria-hidden="true">•</span>
              <span>COP ($)</span>
            </div>
          </div>
          <div class="footer-bottom">
            <p>
              Inversiones LR Marketplace © 2026. Todos los derechos reservados.
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
      background: var(--apple-bg);
      color: var(--apple-text-primary);
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .cupertino-main {
      flex: 1;
      width: 100%;
      max-width: 1240px;
      margin: 0 auto;
      padding: 24px 24px 56px;
    }
    .cupertino-footer {
      background: var(--apple-surface);
      border-top: 1px solid var(--apple-border-subtle);
      transition: background-color 0.2s ease, border-color 0.2s ease;
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
      border-bottom: 1px solid var(--apple-border-subtle);
    }
    .footer-brand {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .footer-mark {
      width: 24px;
      height: 24px;
      border-radius: 7px;
      background: var(--apple-ink);
      color: var(--apple-surface);
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
      color: var(--apple-text-primary);
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 980px;
      background: var(--apple-surface-subtle);
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--apple-text-secondary);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--apple-green);
    }
    .footer-locale {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--apple-text-secondary);
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
      color: var(--apple-text-tertiary);
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
      color: var(--apple-text-secondary);
      text-decoration: none;
    }
    .footer-links a:hover {
      color: var(--apple-text-primary);
    }
    @media (max-width: 768px) {
      .cupertino-main {
        padding: 16px 14px 40px;
      }
      .footer-inner {
        padding: 20px 14px;
      }
      .footer-links {
        gap: 12px;
      }
    }
  `],
})
export class AppComponent {
  title = 'inversiones-lr-web';
}
