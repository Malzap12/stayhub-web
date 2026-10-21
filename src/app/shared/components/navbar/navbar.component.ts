import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  clearActiveSession,
  getActiveSession,
  StoredSession,
} from '../../../core/guards/auth.guard';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="apple-navbar">
      <div class="apple-navbar-inner">
        <!-- Marca Inversiones LR -->
        <a routerLink="/listings" class="apple-brand">
          <span class="brand-monogram" aria-hidden="true">LR</span>
          <div class="brand-text">
            <span class="brand-title">Inversiones LR</span>
            <span class="brand-subtitle">Marketplace</span>
          </div>
        </a>

        <!-- Dock Central Estilo iOS / Cupertino -->
        <nav class="apple-dock" aria-label="Navegación principal">
          <a routerLink="/listings" routerLinkActive="active">Explorar Alojamientos</a>
          <a routerLink="/mis-reservas" routerLinkActive="active">Mis Reservas</a>
          <a routerLink="/anfitrion/publicaciones" routerLinkActive="active">Panel Anfitrión</a>
          <a routerLink="/anfitrion/mis-publicaciones" routerLinkActive="active">Mis Publicaciones</a>
          <a routerLink="/admin/moderacion" routerLinkActive="active">Administración</a>
        </nav>

        <!-- Cluster Derecho: Moneda COP/USD + Perfil / Acceso -->
        <div class="apple-actions">
          <div class="currency-toggle" role="group" aria-label="Moneda">
            <button
              type="button"
              [class.active]="currency === 'COP'"
              (click)="currency = 'COP'"
            >
              COP
            </button>
            <button
              type="button"
              [class.active]="currency === 'USD'"
              (click)="currency = 'USD'"
            >
              USD
            </button>
          </div>

          <div class="v-divider" aria-hidden="true"></div>

          <ng-container *ngIf="session as user">
            <div class="profile-chip">
              <span class="avatar-circle">{{ user.name.charAt(0).toUpperCase() }}</span>
              <div class="profile-meta">
                <span class="profile-name">{{ user.name }}</span>
                <span class="profile-role">{{ user.role }}</span>
              </div>
            </div>
            <button type="button" class="apple-logout-btn" (click)="logout()">
              Salir
            </button>
          </ng-container>

          <ng-container *ngIf="!session">
            <a routerLink="/auth/login" routerLinkActive="active" class="login-link">
              Iniciar sesión
            </a>
            <a routerLink="/auth/register" class="apple-nav-cta">
              Registrarse
            </a>
          </ng-container>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .apple-navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.84);
      backdrop-filter: saturate(180%) blur(24px);
      -webkit-backdrop-filter: saturate(180%) blur(24px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.07);
    }
    .apple-navbar-inner {
      max-width: 1240px;
      margin: 0 auto;
      height: 64px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .apple-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: #1d1d1f;
    }
    .brand-monogram {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      letter-spacing: -0.03em;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.05;
    }
    .brand-title {
      font-size: 0.98rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #1d1d1f;
    }
    .brand-subtitle {
      font-size: 0.62rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #86868b;
      margin-top: 2px;
    }
    .apple-dock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #f0f0f3;
      border-radius: 980px;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    .apple-dock a {
      padding: 6px 14px;
      border-radius: 980px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #515154;
      text-decoration: none;
      transition: all 0.18s ease;
    }
    .apple-dock a:hover {
      color: #1d1d1f;
      opacity: 1;
    }
    .apple-dock a.active {
      background: #ffffff;
      color: #1d1d1f;
      font-weight: 600;
      box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.1);
    }
    .apple-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .currency-toggle {
      display: inline-flex;
      padding: 2px;
      background: #f0f0f3;
      border-radius: 980px;
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .currency-toggle button {
      border: none;
      background: transparent;
      padding: 3px 9px;
      border-radius: 980px;
      font-size: 0.68rem;
      font-weight: 600;
      color: #6e6e73;
      cursor: pointer;
    }
    .currency-toggle button.active {
      background: #ffffff;
      color: #1d1d1f;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .v-divider {
      width: 1px;
      height: 20px;
      background: rgba(0, 0, 0, 0.1);
    }
    .profile-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .avatar-circle {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .profile-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .profile-name {
      font-size: 0.76rem;
      font-weight: 600;
      color: #1d1d1f;
    }
    .profile-role {
      font-size: 0.65rem;
      font-weight: 600;
      color: #6e6e73;
      letter-spacing: 0.04em;
    }
    .login-link {
      font-size: 0.8rem;
      font-weight: 500;
      color: #515154;
    }
    .apple-nav-cta {
      background: #1d1d1f;
      color: #ffffff !important;
      padding: 7px 15px;
      border-radius: 980px;
      font-size: 0.78rem;
      font-weight: 600;
      text-decoration: none;
    }
    .apple-nav-cta:hover {
      background: #000000;
      opacity: 1;
    }
    .apple-logout-btn {
      background: #f5f5f7;
      border: 1px solid #d2d2d7;
      color: #1d1d1f;
      padding: 5px 12px;
      border-radius: 980px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    @media (max-width: 900px) {
      .apple-dock {
        display: none;
      }
    }
  `],
})
export class NavbarComponent {
  currency: 'COP' | 'USD' = 'COP';

  constructor(private readonly router?: Router) {}

  get session(): StoredSession | null {
    return getActiveSession();
  }

  logout(): void {
    clearActiveSession();
    this.router?.navigate(['/auth/login']);
  }
}

