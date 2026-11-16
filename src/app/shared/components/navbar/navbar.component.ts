import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  clearActiveSession,
  getActiveSession,
  StoredSession,
} from '../../../core/guards/auth.guard';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { StatusLabelPipe } from '../../models/display.model';

export const THEME_STORAGE_KEY = 'stayhub_theme';
export type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificationBellComponent, StatusLabelPipe],
  template: `
    <header class="apple-navbar">
      <div class="apple-navbar-inner">
        <!-- Marca Inversiones LR -->
        <a routerLink="/listings" class="apple-brand" (click)="closeMobileMenu()">
          <span class="brand-monogram" aria-hidden="true">LR</span>
          <div class="brand-text">
            <span class="brand-title">Inversiones LR</span>
            <span class="brand-subtitle">Marketplace</span>
          </div>
        </a>

        <!-- Dock Central Estilo iOS / Cupertino -->
        <nav class="apple-dock" aria-label="Navegación principal">
          <a *ngIf="canExplore" routerLink="/listings" routerLinkActive="active">Explorar Alojamientos</a>
          <a *ngIf="isHuesped" routerLink="/mis-favoritos" routerLinkActive="active">Mis favoritos</a>
          <a *ngIf="canViewMyBookings" routerLink="/mis-reservas" routerLinkActive="active">Mis Reservas</a>
          <a *ngIf="isAnfitrion" routerLink="/anfitrion/publicaciones" routerLinkActive="active">Panel Anfitrión</a>
          <a *ngIf="isAnfitrion" routerLink="/anfitrion/mis-publicaciones" routerLinkActive="active">Mis Publicaciones</a>
          <a *ngIf="isAnfitrion" routerLink="/anfitrion/reservas" routerLinkActive="active">Reservas Recibidas</a>
          <a *ngIf="isHuesped || isAnfitrion || isAdmin" routerLink="/mensajes" routerLinkActive="active">Mensajes</a>
          <a *ngIf="isAdmin" routerLink="/admin/indicadores" routerLinkActive="active">Indicadores</a>
          <a *ngIf="isAdmin" routerLink="/admin/moderacion" routerLinkActive="active">Moderación</a>
          <a *ngIf="isAdmin" routerLink="/admin/auditoria" routerLinkActive="active">Auditoría</a>
          <a *ngIf="isAdmin" routerLink="/admin/configuracion" routerLinkActive="active">Configuración</a>
        </nav>

        <!-- Cluster Derecho: Tema / Perfil / Acceso / Menú Móvil -->
        <div class="apple-actions">
          <button
            type="button"
            class="theme-toggle-btn"
            (click)="toggleTheme()"
            [attr.aria-label]="isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            [attr.title]="isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          >
            <svg
              *ngIf="isDarkMode"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
            </svg>
            <svg
              *ngIf="!isDarkMode"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path>
            </svg>
          </button>

          <ng-container *ngIf="session as user">
            <app-notification-bell></app-notification-bell>
            <a routerLink="/mi-perfil" class="profile-chip" title="Ver mi perfil" (click)="closeMobileMenu()">
              <span class="avatar-circle">{{ user.name.charAt(0).toUpperCase() }}</span>
              <div class="profile-meta">
                <span class="profile-name">{{ user.name }}</span>
                <span class="profile-role">{{ user.role | statusLabel }}</span>
              </div>
            </a>
            <button type="button" class="apple-logout-btn" (click)="logout()">
              Salir
            </button>
          </ng-container>

          <ng-container *ngIf="!session && !isAuthRoute">
            <a routerLink="/auth/login" routerLinkActive="active" class="login-link">
              Iniciar sesión
            </a>
            <a routerLink="/auth/register" class="apple-nav-cta">
              Registrarse
            </a>
          </ng-container>

          <button
            type="button"
            class="mobile-menu-btn"
            (click)="toggleMobileMenu()"
            [attr.aria-expanded]="isMobileMenuOpen"
            aria-label="Abrir menú de navegación"
          >
            <svg
              *ngIf="!isMobileMenuOpen"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <svg
              *ngIf="isMobileMenuOpen"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Menú Desplegable Móvil (<= 900px) -->
      <nav
        class="apple-mobile-drawer"
        *ngIf="isMobileMenuOpen"
        aria-label="Navegación móvil"
      >
        <div class="mobile-drawer-links">
          <a *ngIf="canExplore" routerLink="/listings" routerLinkActive="active" (click)="closeMobileMenu()">
            Explorar Alojamientos
          </a>
          <a *ngIf="isHuesped" routerLink="/mis-favoritos" routerLinkActive="active" (click)="closeMobileMenu()">
            Mis favoritos
          </a>
          <a *ngIf="canViewMyBookings" routerLink="/mis-reservas" routerLinkActive="active" (click)="closeMobileMenu()">
            Mis Reservas
          </a>
          <a *ngIf="isAnfitrion" routerLink="/anfitrion/publicaciones" routerLinkActive="active" (click)="closeMobileMenu()">
            Panel Anfitrión
          </a>
          <a *ngIf="isAnfitrion" routerLink="/anfitrion/mis-publicaciones" routerLinkActive="active" (click)="closeMobileMenu()">
            Mis Publicaciones
          </a>
          <a *ngIf="isAnfitrion" routerLink="/anfitrion/reservas" routerLinkActive="active" (click)="closeMobileMenu()">
            Reservas Recibidas
          </a>
          <a *ngIf="isHuesped || isAnfitrion || isAdmin" routerLink="/mensajes" routerLinkActive="active" (click)="closeMobileMenu()">
            Mensajes
          </a>
          <a *ngIf="isAdmin" routerLink="/admin/indicadores" routerLinkActive="active" (click)="closeMobileMenu()">
            Indicadores
          </a>
          <a *ngIf="isAdmin" routerLink="/admin/moderacion" routerLinkActive="active" (click)="closeMobileMenu()">
            Moderación
          </a>
          <a *ngIf="isAdmin" routerLink="/admin/auditoria" routerLinkActive="active" (click)="closeMobileMenu()">
            Auditoría
          </a>
          <a *ngIf="isAdmin" routerLink="/admin/configuracion" routerLinkActive="active" (click)="closeMobileMenu()">
            Configuración
          </a>
        </div>

        <div class="mobile-drawer-footer">
          <ng-container *ngIf="session as user">
            <a routerLink="/mi-perfil" class="mobile-profile-link" (click)="closeMobileMenu()">
              <span class="avatar-circle">{{ user.name.charAt(0).toUpperCase() }}</span>
              <div class="mobile-profile-info">
                <span class="profile-name">{{ user.name }}</span>
                <span class="profile-role">{{ user.role | statusLabel }} · Ver mi perfil</span>
              </div>
            </a>
            <button type="button" class="mobile-logout-btn" (click)="logout()">
              Cerrar sesión
            </button>
          </ng-container>

          <ng-container *ngIf="!session && !isAuthRoute">
            <a routerLink="/auth/login" class="mobile-auth-secondary" (click)="closeMobileMenu()">
              Iniciar sesión
            </a>
            <a routerLink="/auth/register" class="mobile-auth-primary" (click)="closeMobileMenu()">
              Registrarse
            </a>
          </ng-container>
        </div>
      </nav>
    </header>
  `,
  styles: [`
    .apple-navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--apple-surface-glass);
      backdrop-filter: saturate(180%) blur(24px);
      -webkit-backdrop-filter: saturate(180%) blur(24px);
      border-bottom: 1px solid var(--apple-border-subtle);
      transition: background-color 0.2s ease, border-color 0.2s ease;
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
      color: var(--apple-text-primary);
      flex-shrink: 0;
    }
    .brand-monogram {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: var(--apple-ink);
      color: var(--apple-surface);
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
      color: var(--apple-text-primary);
    }
    .brand-subtitle {
      font-size: 0.62rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--apple-text-tertiary);
      margin-top: 2px;
    }
    .apple-dock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: var(--apple-surface-subtle);
      border-radius: 980px;
      border: 1px solid var(--apple-border-subtle);
    }
    .apple-dock a {
      padding: 6px 14px;
      border-radius: 980px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--apple-text-secondary);
      text-decoration: none;
      transition: all 0.18s ease;
    }
    .apple-dock a:hover {
      color: var(--apple-text-primary);
      opacity: 1;
    }
    .apple-dock a.active {
      background: var(--apple-surface);
      color: var(--apple-text-primary);
      font-weight: 600;
      box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.14);
    }
    .apple-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .theme-toggle-btn,
    .mobile-menu-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid var(--apple-border);
      background: var(--apple-surface);
      color: var(--apple-text-primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.15s ease;
    }
    .theme-toggle-btn:hover,
    .mobile-menu-btn:hover {
      background: var(--apple-surface-subtle);
    }
    .mobile-menu-btn {
      display: none;
    }
    .profile-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }
    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--apple-ink);
      color: var(--apple-surface);
      font-size: 0.78rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .profile-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .profile-name {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--apple-text-primary);
    }
    .profile-role {
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--apple-text-secondary);
      letter-spacing: 0.04em;
    }
    .login-link {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--apple-text-secondary);
    }
    .apple-nav-cta {
      background: var(--apple-ink);
      color: var(--apple-surface) !important;
      padding: 7px 15px;
      border-radius: 980px;
      font-size: 0.78rem;
      font-weight: 600;
      text-decoration: none;
    }
    .apple-nav-cta:hover {
      background: var(--apple-ink-hover);
      opacity: 1;
    }
    .apple-logout-btn {
      background: var(--apple-surface-subtle);
      border: 1px solid var(--apple-border);
      color: var(--apple-text-primary);
      padding: 6px 12px;
      border-radius: 980px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .apple-mobile-drawer {
      display: none;
      padding: 12px 16px 18px;
      background: var(--apple-surface);
      border-top: 1px solid var(--apple-border-subtle);
      box-shadow: 0 18px 34px rgba(0, 0, 0, 0.14);
    }
    .mobile-drawer-links {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .mobile-drawer-links a {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--apple-text-primary);
      background: var(--apple-bg);
      text-decoration: none;
    }
    .mobile-drawer-links a.active {
      background: var(--apple-ink);
      color: var(--apple-surface);
      font-weight: 600;
    }
    .mobile-drawer-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--apple-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .mobile-profile-link {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 12px;
      border-radius: 12px;
      background: var(--apple-bg);
      text-decoration: none;
    }
    .mobile-profile-info {
      display: flex;
      flex-direction: column;
    }
    .mobile-logout-btn,
    .mobile-auth-primary,
    .mobile-auth-secondary {
      min-height: 44px;
      border-radius: 12px;
      font-size: 0.92rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      cursor: pointer;
    }
    .mobile-logout-btn {
      border: 1px solid var(--apple-border);
      background: var(--apple-surface-subtle);
      color: var(--apple-text-primary);
    }
    .mobile-auth-secondary {
      border: 1px solid var(--apple-border);
      background: var(--apple-surface);
      color: var(--apple-text-primary);
    }
    .mobile-auth-primary {
      background: var(--apple-ink);
      color: var(--apple-surface);
    }
    @media (max-width: 900px) {
      .apple-navbar-inner {
        padding: 0 14px;
        gap: 10px;
      }
      .apple-dock {
        display: none;
      }
      .mobile-menu-btn,
      .apple-mobile-drawer {
        display: block;
      }
    }
    @media (max-width: 600px) {
      .profile-meta,
      .brand-subtitle,
      .apple-logout-btn,
      .login-link,
      .apple-nav-cta {
        display: none;
      }
      .apple-actions {
        gap: 8px;
      }
    }
  `],
})
export class NavbarComponent {
  theme: ThemeMode = 'light';
  isMobileMenuOpen = false;

  constructor(private readonly router?: Router) {
    this.initTheme();
  }

  get isDarkMode(): boolean {
    return this.theme === 'dark';
  }

  private initTheme(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored === 'dark' || stored === 'light') {
      this.theme = stored;
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) {
      this.theme = 'dark';
    } else {
      this.theme = 'light';
    }
    this.applyTheme();
  }

  private applyTheme(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.theme);
    }
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, this.theme);
      } catch {
        // Ignorar errores de almacenamiento si el navegador restringe localStorage
      }
    }
    this.applyTheme();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  get session(): StoredSession | null {
    return getActiveSession();
  }

  /** Oculta los accesos globales de autenticación cuando el usuario ya está en /auth/* para evitar redundancia visual. */
  get isAuthRoute(): boolean {
    const currentUrl =
      this.router?.url ||
      (typeof window !== 'undefined' ? window.location.pathname : '');
    return currentUrl.startsWith('/auth/');
  }

  get isHuesped(): boolean {
    return this.session?.role === 'HUESPED';
  }

  /** RN-001/RN-002: los módulos de anfitrión son solo del ANFITRIÓN; el ADMINISTRADOR no crea ni administra publicaciones propias. */
  get isAnfitrion(): boolean {
    return this.session?.role === 'ANFITRION';
  }

  get isAdmin(): boolean {
    return this.session?.role === 'ADMINISTRADOR';
  }

  get canViewMyBookings(): boolean {
    return this.session?.role === 'HUESPED';
  }

  /** El ADMINISTRADOR ve solo sus módulos de administración; visitantes, huéspedes y anfitriones exploran. */
  get canExplore(): boolean {
    return !this.isAdmin;
  }

  logout(): void {
    clearActiveSession();
    this.closeMobileMenu();
    this.router?.navigate(['/auth/login']);
  }
}
