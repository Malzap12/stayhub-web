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
            <span class="brand-subtitle">Marketplace · Colombia</span>
          </div>
        </a>

        <!-- Dock Central Dinámico según el Rol del Usuario -->
        <nav class="apple-dock" aria-label="Navegación principal por rol">
          <a routerLink="/listings" routerLinkActive="active">Explorar Alojamientos</a>

          <a
            *ngIf="session?.role === 'HUESPED'"
            routerLink="/mis-reservas"
            routerLinkActive="active"
          >
            Mis Reservas
          </a>

          <a
            *ngIf="session?.role === 'ANFITRION' || session?.role === 'ADMINISTRADOR'"
            routerLink="/anfitrion/publicaciones"
            routerLinkActive="active"
            [routerLinkActiveOptions]="exactRouteOptions"
          >
            Disponibilidad
          </a>

          <a
            *ngIf="session?.role === 'ANFITRION' || session?.role === 'ADMINISTRADOR'"
            routerLink="/anfitrion/publicaciones/nueva"
            routerLinkActive="active"
          >
            Nueva Publicación
          </a>

          <a
            *ngIf="session?.role === 'ADMINISTRADOR'"
            routerLink="/admin/moderacion"
            routerLinkActive="active"
          >
            Cola de Moderación
          </a>
        </nav>

        <!-- Cluster Derecho: Moneda Oficial COP + Perfil Contextual -->
        <div class="apple-actions">
          <span class="cop-pill" title="Moneda oficial del Marketplace (COP)">
            <span class="cop-dot" aria-hidden="true"></span>
            COP
          </span>

          <div class="v-divider" aria-hidden="true"></div>

          <ng-container *ngIf="session as user">
            <a routerLink="/auth/login" class="profile-chip" title="Ver resumen de mi cuenta">
              <span class="avatar-circle" [attr.data-role]="user.role">
                {{ user.name.charAt(0).toUpperCase() }}
              </span>
              <div class="profile-meta">
                <span class="profile-name">{{ user.name }}</span>
                <span class="profile-role">{{ roleDisplayName(user.role) }}</span>
              </div>
            </a>
            <button type="button" class="apple-logout-btn" (click)="logout()">
              Cerrar sesión
            </button>
          </ng-container>

          <ng-container *ngIf="!session">
            <a routerLink="/auth/login" routerLinkActive="active" class="login-link">
              Iniciar sesión
            </a>
            <a routerLink="/auth/register" class="apple-nav-cta">
              Crear cuenta
            </a>
          </ng-container>
        </div>
      </div>

      <!-- Barra móvil adaptable (RNF-013: usable desde 360 px) -->
      <nav class="mobile-dock" aria-label="Navegación móvil">
        <a routerLink="/listings" routerLinkActive="active">Explorar</a>
        <a
          *ngIf="session?.role === 'HUESPED'"
          routerLink="/mis-reservas"
          routerLinkActive="active"
        >
          Mis Reservas
        </a>
        <a
          *ngIf="session?.role === 'ANFITRION' || session?.role === 'ADMINISTRADOR'"
          routerLink="/anfitrion/publicaciones"
          routerLinkActive="active"
          [routerLinkActiveOptions]="exactRouteOptions"
        >
          Disponibilidad
        </a>
        <a
          *ngIf="session?.role === 'ANFITRION' || session?.role === 'ADMINISTRADOR'"
          routerLink="/anfitrion/publicaciones/nueva"
          routerLinkActive="active"
        >
          Nueva Publicación
        </a>
        <a
          *ngIf="session?.role === 'ADMINISTRADOR'"
          routerLink="/admin/moderacion"
          routerLinkActive="active"
        >
          Moderación
        </a>
      </nav>
    </header>
  `,
  styles: [`
    .apple-navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.86);
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
      letter-spacing: 0.1em;
      color: #86868b;
      margin-top: 2px;
    }
    .apple-dock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #f2f2f7;
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
      white-space: nowrap;
    }
    .apple-dock a:hover {
      color: #1d1d1f;
    }
    .apple-dock a.active {
      background: #ffffff;
      color: #1d1d1f;
      font-weight: 600;
      box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.12);
    }
    .apple-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cop-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #f2f2f7;
      border-radius: 980px;
      font-size: 0.7rem;
      font-weight: 700;
      color: #3a3a3c;
      letter-spacing: 0.04em;
    }
    .cop-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #166534;
    }
    .v-divider {
      width: 1px;
      height: 20px;
      background: rgba(0, 0, 0, 0.1);
    }
    .profile-chip {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 4px 10px 4px 4px;
      border-radius: 980px;
      background: #f5f5f7;
      border: 1px solid rgba(0, 0, 0, 0.06);
      text-decoration: none;
      transition: border-color 0.18s ease;
    }
    .profile-chip:hover {
      border-color: rgba(0, 0, 0, 0.2);
    }
    .avatar-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.76rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-circle[data-role='ANFITRION'] {
      background: #0f5132;
    }
    .avatar-circle[data-role='ADMINISTRADOR'] {
      background: #312e81;
    }
    .profile-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .profile-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: #1d1d1f;
    }
    .profile-role {
      font-size: 0.64rem;
      font-weight: 600;
      color: #6e6e73;
    }
    .login-link {
      font-size: 0.8rem;
      font-weight: 600;
      color: #1d1d1f;
      text-decoration: none;
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
    }
    .apple-logout-btn {
      background: #ffffff;
      border: 1px solid #d2d2d7;
      color: #1d1d1f;
      padding: 6px 12px;
      border-radius: 980px;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
    }
    .apple-logout-btn:hover {
      background: #f5f5f7;
    }
    .mobile-dock {
      display: none;
      padding: 6px 16px 10px;
      gap: 6px;
      overflow-x: auto;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
    }
    .mobile-dock a {
      padding: 5px 12px;
      border-radius: 980px;
      background: #f2f2f7;
      color: #515154;
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
    }
    .mobile-dock a.active {
      background: #1d1d1f;
      color: #ffffff;
    }
    @media (max-width: 920px) {
      .apple-dock {
        display: none;
      }
      .mobile-dock {
        display: flex;
      }
      .cop-pill,
      .v-divider {
        display: none;
      }
    }
  `],
})
export class NavbarComponent {
  readonly exactRouteOptions = { exact: true };

  constructor(private readonly router?: Router) {}

  get session(): StoredSession | null {
    return getActiveSession();
  }

  roleDisplayName(role: StoredSession['role']): string {
    if (role === 'ANFITRION') return 'Anfitrión';
    if (role === 'ADMINISTRADOR') return 'Administrador';
    return 'Huésped';
  }

  logout(): void {
    clearActiveSession();
    this.router?.navigate(['/auth/login']);
  }
}
