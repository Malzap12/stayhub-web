import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="apple-navbar">
      <div class="apple-navbar-inner">
        <a routerLink="/" class="apple-brand">
          <span class="brand-dot" aria-hidden="true"></span>
          <span>Inversiones LR</span>
        </a>
        <nav class="apple-nav-links" aria-label="Navegación principal">
          <a routerLink="/listings" routerLinkActive="active">Explorar</a>
          <a routerLink="/auth/login" routerLinkActive="active">Iniciar sesión</a>
          <a routerLink="/auth/register" class="apple-nav-cta">Registrarse</a>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .apple-navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .apple-navbar-inner {
      max-width: 1120px;
      margin: 0 auto;
      height: 52px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .apple-brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 600;
      color: #1d1d1f;
      text-decoration: none;
      letter-spacing: -0.02em;
    }
    .brand-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #0071e3;
    }
    .apple-nav-links {
      display: flex;
      align-items: center;
      gap: 22px;
      font-size: 0.8125rem;
    }
    .apple-nav-links a {
      color: #1d1d1f;
      opacity: 0.8;
      text-decoration: none;
      font-weight: 500;
    }
    .apple-nav-links a:hover,
    .apple-nav-links a.active {
      opacity: 1;
    }
    .apple-nav-cta {
      background: #0071e3;
      color: #ffffff !important;
      opacity: 1 !important;
      padding: 6px 14px;
      border-radius: 980px;
      font-weight: 600 !important;
    }
    .apple-nav-cta:hover {
      background: #0077ed;
    }
  `],
})
export class NavbarComponent {}
