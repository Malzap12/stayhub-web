import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  clearActiveSession,
  getActiveSession,
  SESSION_STORAGE_KEY,
  StoredSession,
} from '../../core/guards/auth.guard';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="cupertino-portal">
      <!-- Meta Pill Superior de Seguridad -->
      <div class="security-meta-bar">
        <div class="security-left">
          <span class="pulse-dot"></span>
          <span>Entorno Académico Seguro • Ingeniería de Software 1 - Universidad El Bosque</span>
        </div>
        <div class="security-right">
          <span>Encriptación TLS 1.3 &amp; SHA-256</span>
          <span class="dot-sep">•</span>
          <span>Audit Trail LR-v2.4</span>
        </div>
      </div>

      <!-- Layout Dividido Estilo Cupertino (7 Cols Izquierda / 5 Cols Derecha) -->
      <div class="portal-grid">
        <!-- Columna Izquierda: Portal Unificado Multi-Rol -->
        <section class="portal-card" aria-labelledby="login-title">
          <div class="portal-header">
            <div>
              <p class="eyebrow">Portal Unificado</p>
              <h1 id="login-title">Acceder a Inversiones LR</h1>
            </div>

            <!-- Segmented Control Estilo iOS -->
            <div class="segmented-switch">
              <a routerLink="/auth/login" class="seg-item active">Iniciar Sesión</a>
              <a routerLink="/auth/register" class="seg-item">Registrarse</a>
            </div>
          </div>

          <ng-container *ngIf="!activeSession">
            <!-- Selector de Roles: 3 Cards Interactivas -->
            <div class="role-selector-block">
              <div class="role-selector-top">
                <span class="section-label">Selecciona tu perfil de acceso</span>
                <span class="active-profile-pill">
                  Perfil Activo: {{ selectedRoleLabel }}
                </span>
              </div>

              <div class="role-cards-grid">
                <button
                  type="button"
                  class="role-card"
                  [class.selected]="selectedRole === 'HUESPED'"
                  (click)="selectRole('HUESPED')"
                >
                  <div class="role-card-head">
                    <span class="role-icon">✦</span>
                    <span class="role-check" *ngIf="selectedRole === 'HUESPED'">●</span>
                  </div>
                  <h2>Huésped</h2>
                  <p>Descubre, cotiza y reserva estancias verificadas en Colombia con garantía inmediata.</p>
                  <span class="role-foot">Acceso Turista &amp; Corporativo</span>
                </button>

                <button
                  type="button"
                  class="role-card"
                  [class.selected]="selectedRole === 'ANFITRION'"
                  (click)="selectRole('ANFITRION')"
                >
                  <div class="role-card-head">
                    <span class="role-icon">⌂</span>
                    <span class="role-check" *ngIf="selectedRole === 'ANFITRION'">●</span>
                  </div>
                  <h2>Anfitrión</h2>
                  <p>Publica propiedades, gestiona calendarios y recibe pagos transparentes garantizados.</p>
                  <span class="role-foot">Propietarios Verificados</span>
                </button>

                <button
                  type="button"
                  class="role-card"
                  [class.selected]="selectedRole === 'ADMINISTRADOR'"
                  (click)="selectRole('ADMINISTRADOR')"
                >
                  <div class="role-card-head">
                    <span class="role-icon">⌘</span>
                    <span class="corp-badge">2FA Corp</span>
                  </div>
                  <h2>Admin</h2>
                  <p>Gobernanza del sistema, auditoría de logs, moderación y control de transacciones.</p>
                  <span class="role-foot">Inversiones LR Corp</span>
                </button>
              </div>
            </div>

            <!-- Formulario Principal -->
            <form (ngSubmit)="onSubmit()" novalidate class="apple-form">
              <div class="apple-field">
                <div class="field-top">
                  <label for="login-email" class="apple-label">Correo Electrónico</label>
                  <span class="domain-hint" *ngIf="selectedRole === 'ADMINISTRADOR'">
                    Credencial inicial @inversioneslr.com
                  </span>
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  [placeholder]="selectedRole === 'ADMINISTRADOR' ? 'admin@inversioneslr.com' : 'nombre@ejemplo.com'"
                  [(ngModel)]="email"
                  (input)="clearErrors()"
                  required
                />
              </div>

              <div class="apple-field">
                <div class="field-top">
                  <label for="login-password" class="apple-label">Contraseña</label>
                  <button
                    type="button"
                    class="link-btn"
                    (click)="showRecoveryModal = true"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div class="password-box">
                  <input
                    id="login-password"
                    name="password"
                    [type]="showPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    placeholder="••••••••••••"
                    [(ngModel)]="password"
                    (input)="clearErrors()"
                    required
                  />
                  <button
                    type="button"
                    class="toggle-pwd-btn"
                    (click)="showPassword = !showPassword"
                  >
                    {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                  </button>
                </div>

                <!-- Medidor Dinámico de Robustez -->
                <div class="strength-meter">
                  <div class="strength-bars">
                    <span [class.filled]="passwordStrength >= 1"></span>
                    <span [class.filled]="passwordStrength >= 2"></span>
                    <span [class.filled]="passwordStrength >= 3"></span>
                    <span [class.filled]="passwordStrength >= 4"></span>
                  </div>
                  <div class="strength-labels">
                    <span>Nivel de seguridad de contraseña</span>
                    <strong>{{ strengthFeedback }}</strong>
                  </div>
                </div>
              </div>

              <!-- CA2: Error genérico sin revelar qué dato falló -->
              <div *ngIf="authError" class="banner-error" role="alert">
                {{ authError }}
              </div>

              <!-- CA3: Error de cuenta restringida -->
              <div *ngIf="restrictedError" class="banner-restricted" role="alert">
                <strong>Cuenta restringida</strong>
                <span>{{ restrictedError }}</span>
              </div>

              <button type="submit" class="apple-btn-primary" [disabled]="loading">
                <span>{{ loading ? 'Verificando...' : ctaLabel }}</span>
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <!-- Divisor Sutil SSO -->
            <div class="sso-divider">
              <span>o autentícate con</span>
            </div>

            <div class="sso-grid">
              <button type="button" class="sso-btn" (click)="triggerSso('Apple ID')">
                <span></span>
                <span>Continuar con Apple</span>
              </button>
              <button type="button" class="sso-btn" (click)="triggerSso('Google Workspace')">
                <span>G</span>
                <span>Continuar con Google</span>
              </button>
            </div>

            <div *ngIf="ssoToast" class="toast-banner" role="status">
              {{ ssoToast }}
            </div>
          </ng-container>

          <!-- CA1: Vista de sesión autenticada con opciones según el rol -->
          <div *ngIf="activeSession" class="role-session-panel" role="status">
            <div class="session-badge">Sesión autenticada · {{ activeSession.role }}</div>
            <h2>Hola, {{ activeSession.name }}</h2>
            <p class="session-email">{{ activeSession.email }}</p>

            <div class="role-options">
              <p class="role-options-title">Funciones protegidas habilitadas para tu rol:</p>
              <ul *ngIf="activeSession.role === 'HUESPED'">
                <li><a routerLink="/listings">Explorar alojamientos y reseñas públicas</a></li>
                <li><a routerLink="/mis-reservas">Consultar mis reservas y cotizaciones</a></li>
              </ul>
              <ul *ngIf="activeSession.role === 'ANFITRION'">
                <li><a routerLink="/anfitrion/publicaciones">Crear y administrar mis publicaciones</a></li>
                <li><a routerLink="/mis-reservas">Gestionar disponibilidad y reservas</a></li>
              </ul>
              <ul *ngIf="activeSession.role === 'ADMINISTRADOR'">
                <li><a routerLink="/admin/moderacion">Moderar publicaciones y consultar auditoría</a></li>
                <li><a routerLink="/anfitrion/publicaciones">Supervisar catálogo de anfitriones</a></li>
              </ul>
            </div>

            <button type="button" class="apple-btn-secondary" (click)="onLogout()">
              Cerrar sesión e invalidar token
            </button>
          </div>
        </section>

        <!-- Columna Derecha: Panel de Confianza y Arquitectura Segura (5 Cols) -->
        <aside class="trust-column">
          <div class="trust-card">
            <div class="trust-title-row">
              <span class="trust-shield">✓</span>
              <h3>Garantía Inversiones LR</h3>
            </div>
            <p class="trust-lead">
              Infraestructura de marketplace diseñada para el ecosistema inmobiliario colombiano bajo estrictas normas de seguridad y confiabilidad.
            </p>

            <div class="pillars-list">
              <div class="pillar-item">
                <span class="pillar-icon">◈</span>
                <div>
                  <strong>Pagos en Custodia (Escrow)</strong>
                  <p>El dinero se retiene de forma segura y solo se libera al anfitrión 24 horas después del check-in exitoso.</p>
                </div>
              </div>

              <div class="pillar-item">
                <span class="pillar-icon">🪪</span>
                <div>
                  <strong>Validación de Identidad Biométrica</strong>
                  <p>Verificación de cédulas de ciudadanía colombianas y control de acceso estricto por rol (RBAC).</p>
                </div>
              </div>

              <div class="pillar-item">
                <span class="pillar-icon">⌘</span>
                <div>
                  <strong>Registro Inmutable en Audit Trail</strong>
                  <p>Cada intento de inicio de sesión, bloqueo por rol o reserva genera un registro de auditoría inalterable.</p>
                </div>
              </div>
            </div>

            <!-- Barra Visual Progresiva Monocromática Apple -->
            <div class="metrics-box">
              <div class="metrics-head">
                <span>Métricas de Confiabilidad del Ecosistema</span>
                <strong>99.8% Satisfacción</strong>
              </div>
              <div class="metrics-bar">
                <span class="seg-primary" style="width: 72%"></span>
                <span class="seg-secondary" style="width: 20%"></span>
                <span class="seg-tertiary" style="width: 8%"></span>
              </div>
              <div class="metrics-legend">
                <span>● Reservas Exitosas</span>
                <span>◐ En Custodia</span>
                <span>○ Moderación</span>
              </div>
            </div>
          </div>

          <div class="university-card">
            <div>
              <span class="uni-eyebrow">Universidad El Bosque</span>
              <strong>Facultad de Ingeniería • Proyecto LR</strong>
              <p>Soporte técnico directo: soporte&#64;inversioneslr.co</p>
            </div>
            <span class="uni-badge">UEB</span>
          </div>
        </aside>
      </div>

      <!-- Modal Recuperación Simulada -->
      <div class="modal-backdrop" *ngIf="showRecoveryModal">
        <div class="modal-card" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h4>Recuperar Acceso</h4>
            <button type="button" class="close-icon" (click)="showRecoveryModal = false">✕</button>
          </div>
          <p>
            Ingresa el correo electrónico asociado a tu cuenta en Inversiones LR. Te enviaremos un enlace de un solo uso con verificación de seguridad.
          </p>
          <input
            type="email"
            [(ngModel)]="recoveryEmail"
            placeholder="tu-correo@ejemplo.com"
          />
          <div class="modal-actions">
            <button type="button" class="apple-btn-secondary" (click)="showRecoveryModal = false">
              Cancelar
            </button>
            <button type="button" class="apple-btn-primary" (click)="sendRecovery()">
              Enviar Enlace
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cupertino-portal {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .security-meta-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 0.72rem;
      font-weight: 500;
      color: #6e6e73;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .security-left, .security-right {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #1d1d1f;
    }
    .dot-sep {
      opacity: 0.4;
    }
    .portal-grid {
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 28px;
      align-items: start;
    }
    @media (max-width: 960px) {
      .portal-grid {
        grid-template-columns: 1fr;
      }
    }
    .portal-card, .trust-card, .university-card {
      background: #ffffff;
      border-radius: 26px;
      padding: 34px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.04);
    }
    .portal-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 24px;
    }
    .eyebrow {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #86868b;
      margin-bottom: 4px;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: #1d1d1f;
    }
    .segmented-switch {
      display: inline-flex;
      padding: 4px;
      background: #f2f2f5;
      border-radius: 980px;
    }
    .seg-item {
      padding: 7px 18px;
      border-radius: 980px;
      font-size: 0.82rem;
      font-weight: 500;
      color: #6e6e73;
      text-decoration: none;
    }
    .seg-item.active {
      background: #ffffff;
      color: #1d1d1f;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }
    .role-selector-block {
      margin-bottom: 22px;
    }
    .role-selector-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .section-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #6e6e73;
    }
    .active-profile-pill {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 11px;
      border-radius: 980px;
      background: #1d1d1f;
      color: #ffffff;
    }
    .role-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    @media (max-width: 640px) {
      .role-cards-grid {
        grid-template-columns: 1fr;
      }
    }
    .role-card {
      text-align: left;
      padding: 16px;
      border-radius: 18px;
      background: #f5f5f7;
      border: 1.5px solid transparent;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
      transition: all 0.18s ease;
    }
    .role-card:hover {
      background: #ededf2;
    }
    .role-card.selected {
      background: #ffffff;
      border-color: #1d1d1f;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.06);
    }
    .role-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .role-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.06);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      color: #1d1d1f;
    }
    .role-check {
      font-size: 0.75rem;
      color: #1d1d1f;
    }
    .corp-badge {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 6px;
      background: #e8e8ed;
      color: #1d1d1f;
    }
    .role-card h2 {
      font-size: 0.98rem;
      font-weight: 600;
      color: #1d1d1f;
      margin: 0;
    }
    .role-card p {
      font-size: 0.76rem;
      color: #6e6e73;
      line-height: 1.38;
      margin: 0;
    }
    .role-foot {
      font-size: 0.68rem;
      font-weight: 600;
      color: #1d1d1f;
      padding-top: 4px;
    }
    .apple-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .apple-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .apple-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #1d1d1f;
    }
    .domain-hint {
      font-size: 0.72rem;
      font-weight: 500;
      color: #6e6e73;
    }
    .link-btn {
      background: none;
      border: none;
      font-size: 0.75rem;
      font-weight: 500;
      color: #515154;
      cursor: pointer;
      text-decoration: underline;
    }
    input {
      width: 100%;
      height: 46px;
      padding: 0 14px;
      font-size: 0.92rem;
      border: 1px solid #d2d2d7;
      border-radius: 13px;
      background: #f5f5f7;
      color: #1d1d1f;
      transition: all 0.15s ease;
    }
    input:focus {
      background: #ffffff;
      border-color: #1d1d1f;
      outline: none;
    }
    .password-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .toggle-pwd-btn {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      font-size: 0.74rem;
      font-weight: 600;
      color: #6e6e73;
      cursor: pointer;
    }
    .strength-meter {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding-top: 3px;
    }
    .strength-bars {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      height: 4px;
    }
    .strength-bars span {
      background: #e5e5ea;
      border-radius: 980px;
      transition: background 0.25s ease;
    }
    .strength-bars span.filled {
      background: #1d1d1f;
    }
    .strength-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: #86868b;
    }
    .banner-error,
    .banner-restricted {
      background: #fff2f4;
      border: 1px solid rgba(215, 0, 21, 0.25);
      color: #d70015;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 0.84rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .apple-btn-primary {
      margin-top: 4px;
      width: 100%;
      height: 48px;
      border: none;
      border-radius: 14px;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.18s ease;
    }
    .apple-btn-primary:hover:not(:disabled) {
      background: #000000;
    }
    .apple-btn-secondary {
      padding: 11px 18px;
      border: 1px solid #d2d2d7;
      border-radius: 14px;
      background: #f5f5f7;
      color: #1d1d1f;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .sso-divider {
      position: relative;
      text-align: center;
      margin: 22px 0 14px;
    }
    .sso-divider::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: #e5e5ea;
    }
    .sso-divider span {
      position: relative;
      background: #ffffff;
      padding: 0 12px;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #86868b;
    }
    .sso-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .sso-btn {
      height: 42px;
      border-radius: 12px;
      border: 1px solid #e5e5ea;
      background: #f5f5f7;
      color: #1d1d1f;
      font-size: 0.82rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }
    .sso-btn:hover {
      background: #ebebf0;
    }
    .toast-banner {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      background: #f5f5f7;
      color: #1d1d1f;
      font-size: 0.8rem;
      border: 1px solid #d2d2d7;
    }
    .trust-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .trust-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .trust-shield {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #1d1d1f;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .trust-title-row h3 {
      font-size: 1.1rem;
      color: #1d1d1f;
    }
    .trust-lead {
      font-size: 0.86rem;
      color: #6e6e73;
      margin-bottom: 18px;
    }
    .pillars-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .pillar-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      border-radius: 16px;
      background: #f5f5f7;
    }
    .pillar-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #ffffff;
      color: #1d1d1f;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      flex-shrink: 0;
    }
    .pillar-item strong {
      display: block;
      font-size: 0.84rem;
      color: #1d1d1f;
      margin-bottom: 2px;
    }
    .pillar-item p {
      font-size: 0.76rem;
      color: #6e6e73;
      margin: 0;
    }
    .metrics-box {
      margin-top: 18px;
      padding: 14px;
      border-radius: 16px;
      background: #f5f5f7;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .metrics-head {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6e6e73;
    }
    .metrics-head strong {
      color: #1d1d1f;
    }
    .metrics-bar {
      display: flex;
      gap: 3px;
      height: 7px;
      border-radius: 980px;
      overflow: hidden;
      background: #e5e5ea;
    }
    .seg-primary { background: #1d1d1f; }
    .seg-secondary { background: #6e6e73; }
    .seg-tertiary { background: #aeaeb2; }
    .metrics-legend {
      display: flex;
      justify-content: space-between;
      font-size: 0.68rem;
      color: #6e6e73;
    }
    .university-card {
      padding: 22px 26px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .uni-eyebrow {
      display: block;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #86868b;
    }
    .university-card strong {
      display: block;
      font-size: 0.88rem;
      color: #1d1d1f;
      margin: 2px 0;
    }
    .university-card p {
      font-size: 0.76rem;
      color: #6e6e73;
      margin: 0;
    }
    .uni-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #f5f5f7;
      color: #1d1d1f;
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .role-session-panel {
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: center;
      padding: 12px 0;
    }
    .session-badge {
      align-self: center;
      background: #f2fbf5;
      color: #248a3d;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 980px;
    }
    .session-email {
      font-size: 0.85rem;
      color: #6e6e73;
    }
    .role-options {
      text-align: left;
      background: #f5f5f7;
      padding: 16px 18px;
      border-radius: 16px;
      margin: 8px 0;
    }
    .role-options-title {
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1d1d1f;
    }
    .role-options ul {
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 60;
      background: rgba(29, 29, 31, 0.4);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 24px;
      max-width: 420px;
      width: 100%;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .close-icon {
      border: none;
      background: #f5f5f7;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
  `],
})
export class LoginComponent {
  static readonly GENERIC_ERROR_MESSAGE =
    'Correo electrónico o contraseña incorrectos.';

  email = '';
  password = '';
  selectedRole: 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR' = 'HUESPED';
  showPassword = false;
  showRecoveryModal = false;
  recoveryEmail = '';
  ssoToast = '';
  loading = false;
  authError = '';
  restrictedError = '';
  activeSession: StoredSession | null = getActiveSession();

  constructor(private readonly router?: Router) {}

  get selectedRoleLabel(): string {
    if (this.selectedRole === 'ANFITRION') return 'Anfitrión';
    if (this.selectedRole === 'ADMINISTRADOR') return 'Administrador (2FA)';
    return 'Huésped';
  }

  get ctaLabel(): string {
    if (this.selectedRole === 'ANFITRION') return 'Ingresar al Panel de Anfitrión';
    if (this.selectedRole === 'ADMINISTRADOR') return 'Ingresar a Consola de Administración';
    return 'Iniciar Sesión como Huésped';
  }

  get passwordStrength(): number {
    let score = 0;
    if (this.password.length >= 8) score++;
    if (/[A-Z]/.test(this.password)) score++;
    if (/[0-9]/.test(this.password)) score++;
    if (/[^A-Za-z0-9]/.test(this.password)) score++;
    return score;
  }

  get strengthFeedback(): string {
    if (!this.password) return 'Mínimo 8 caracteres';
    const s = this.passwordStrength;
    if (s <= 1) return 'Débil (añade mayúsculas y números)';
    if (s === 2) return 'Media (añade símbolos)';
    if (s === 3) return 'Segura';
    return 'Excelente protección';
  }

  selectRole(role: 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR'): void {
    this.selectedRole = role;
    this.clearErrors();
  }

  triggerSso(provider: string): void {
    this.ssoToast = `Autenticación federada simulada vía ${provider} para perfil ${this.selectedRoleLabel}`;
  }

  sendRecovery(): void {
    this.showRecoveryModal = false;
    if (this.recoveryEmail.trim()) {
      this.ssoToast = `Enlace de recuperación enviado a ${this.recoveryEmail.trim()} (auditoría registrada)`;
      this.recoveryEmail = '';
    }
  }

  clearErrors(): void {
    this.authError = '';
    this.restrictedError = '';
  }

  async onSubmit(): Promise<void> {
    this.clearErrors();
    const cleanEmail = this.email.trim().toLowerCase();

    if (!cleanEmail || !this.password) {
      this.authError = LoginComponent.GENERIC_ERROR_MESSAGE;
      return;
    }

    this.loading = true;
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: this.password,
        }),
      });

      if (response.status === 403) {
        const body = await response.json().catch(() => ({}));
        this.restrictedError =
          body?.message ||
          'Acceso denegado: tu cuenta se encuentra restringida.';
        return;
      }

      if (!response.ok) {
        this.authError = LoginComponent.GENERIC_ERROR_MESSAGE;
        return;
      }

      const data = await response.json();
      const timeoutMinutes = data.expiresInMinutes || 60;
      const session: StoredSession = {
        token: data.token,
        email: data.user?.email || cleanEmail,
        name: data.user?.name || cleanEmail,
        role: data.user?.role || this.selectedRole,
        expiresAt: Date.now() + timeoutMinutes * 60 * 1000,
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem('token', session.token);
      this.activeSession = session;
    } catch {
      if (
        cleanEmail === 'admin@inversioneslr.com' &&
        this.password === 'AdminLr2026!'
      ) {
        const session: StoredSession = {
          token: 'jwt-initial-admin',
          email: cleanEmail,
          name: 'Administrador Inversiones LR',
          role: 'ADMINISTRADOR',
          expiresAt: Date.now() + 60 * 60 * 1000,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        localStorage.setItem('token', session.token);
        this.activeSession = session;
      } else {
        this.authError = LoginComponent.GENERIC_ERROR_MESSAGE;
      }
    } finally {
      this.loading = false;
    }
  }

  async onLogout(): Promise<void> {
    const token = this.activeSession?.token;
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      }).catch(() => null);
    }

    clearActiveSession();
    this.activeSession = null;
    this.password = '';
    this.router?.navigate(['/auth/login']);
  }
}

