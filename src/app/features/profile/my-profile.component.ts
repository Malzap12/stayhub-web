import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getActiveSession } from '../../core/guards/auth.guard';
import { AccountStatus, UserProfile, UserRole } from '../../shared/models/user.model';

const ROLE_LABELS: Record<UserRole, string> = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
};

const STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVA: 'Activa',
  DESACTIVADA: 'Desactivada',
  RESTRINGIDA: 'Restringida',
};

/**
 * HU-006 · Consultar mi perfil (CA1, CA2, RF-009).
 * El usuario autenticado ve su nombre, correo, teléfono, rol y estado de la cuenta.
 * Siempre consulta /api/users/me y nunca un identificador, así que solo carga el perfil propio.
 */
@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="profile-shell">
      <header class="page-header">
        <span class="eyebrow">Mi cuenta</span>
        <h1>Mi perfil</h1>
        <p class="subtitle">Verifica que tu información sea correcta.</p>
      </header>

      <p class="loading" *ngIf="loading" role="status">Cargando tu perfil…</p>

      <div class="alert-error" *ngIf="errorMessage" role="alert">
        {{ errorMessage }}
        <button type="button" class="retry-btn" (click)="load()">Reintentar</button>
      </div>

      <article class="profile-card" *ngIf="!loading && profile as user">
        <div class="identity">
          <span class="avatar" aria-hidden="true">{{ user.name.charAt(0).toUpperCase() }}</span>
          <div>
            <h2>{{ user.name }}</h2>
            <span class="status-badge" [attr.data-status]="user.status">{{ statusLabel(user) }}</span>
          </div>
        </div>

        <dl class="details">
          <div>
            <dt>Nombre</dt>
            <dd>{{ user.name }}</dd>
          </div>
          <div>
            <dt>Correo electrónico</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd [class.pending]="!user.phone">{{ user.phone || 'No registrado' }}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{{ roleLabel(user) }}</dd>
          </div>
          <div>
            <dt>Estado de la cuenta</dt>
            <dd>{{ statusLabel(user) }}</dd>
          </div>
        </dl>
      </article>
    </section>
  `,
  styles: [`
    .profile-shell {
      max-width: 720px;
      margin: 0 auto;
      padding: 36px 24px 72px;
      color: #1d1d1f;
    }
    .page-header {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e5ea;
    }
    .eyebrow {
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #86868b;
    }
    h1 {
      margin: 6px 0 8px;
      font-size: 1.95rem;
      letter-spacing: -0.03em;
    }
    .subtitle {
      margin: 0;
      color: #6e6e73;
      font-size: 0.92rem;
    }
    .loading {
      color: #6e6e73;
    }
    .alert-error {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 16px;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .retry-btn {
      padding: 6px 14px;
      border-radius: 980px;
      border: 1px solid #fecaca;
      background: #ffffff;
      color: #991b1b;
      font-weight: 600;
      cursor: pointer;
    }
    .profile-card {
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 20px;
      padding: 24px;
    }
    .identity {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .avatar {
      width: 56px;
      height: 56px;
      flex-shrink: 0;
      border-radius: 50%;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 1.4rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    h2 {
      margin: 0 0 6px;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 980px;
      font-size: 0.74rem;
      font-weight: 700;
      background: #f5f5f7;
      color: #3a3a3c;
    }
    .status-badge[data-status='ACTIVA'] { background: #e8f8ee; color: #166534; }
    .status-badge[data-status='RESTRINGIDA'] { background: #fef2f2; color: #991b1b; }
    .details {
      margin: 0;
    }
    .details div {
      display: grid;
      grid-template-columns: minmax(140px, 1fr) 2fr;
      gap: 12px;
      padding: 12px 0;
      border-top: 1px solid #f0f0f3;
    }
    dt {
      color: #6e6e73;
      font-size: 0.86rem;
    }
    dd {
      margin: 0;
      font-weight: 600;
      font-size: 0.92rem;
      overflow-wrap: anywhere;
    }
    dd.pending {
      color: #86868b;
      font-style: italic;
      font-weight: 500;
    }
    @media (max-width: 520px) {
      .details div {
        grid-template-columns: 1fr;
        gap: 2px;
      }
    }
  `],
})
export class MyProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    void this.load();
  }

  roleLabel(user: UserProfile): string {
    return ROLE_LABELS[user.role] ?? user.role;
  }

  statusLabel(user: UserProfile): string {
    return STATUS_LABELS[user.status] ?? user.status;
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const token = getActiveSession()?.token;
      const response = await fetch('/api/users/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.status === 401) {
        this.errorMessage = 'Tu sesión expiró. Inicia sesión de nuevo para ver tu perfil.';
        return;
      }
      if (!response.ok) {
        this.errorMessage = 'No fue posible cargar tu perfil. Intenta de nuevo.';
        return;
      }

      this.profile = (await response.json()) as UserProfile;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }
}
