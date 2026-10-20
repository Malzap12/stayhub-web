import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  clearActiveSession,
  getActiveSession,
  StoredSession,
} from '../../core/guards/auth.guard';

export interface RoleQuickAction {
  title: string;
  description: string;
  route: string;
  cta: string;
}

const GUEST_ACTIONS: readonly RoleQuickAction[] = [
  {
    title: 'Explorar alojamientos verificados',
    description: 'Descubre espacios activos en Colombia, compara tarifas en COP y lee reseñas verificadas.',
    route: '/listings',
    cta: 'Explorar catálogo',
  },
  {
    title: 'Mis reservas y estancias',
    description: 'Consulta el estado de tus reservas confirmadas, cotizaciones y políticas de cancelación.',
    route: '/mis-reservas',
    cta: 'Ver mis reservas',
  },
];

const HOST_ACTIONS: readonly RoleQuickAction[] = [
  {
    title: 'Publicar un alojamiento',
    description: 'Crea un nuevo borrador con descripción, capacidad, tarifa en COP, reglas e imágenes.',
    route: '/anfitrion/publicaciones/nueva',
    cta: 'Crear publicación',
  },
  {
    title: 'Periodos de disponibilidad',
    description: 'Registra las fechas habilitadas para recibir reservas en tus alojamientos.',
    route: '/anfitrion/publicaciones',
    cta: 'Gestionar calendario',
  },
];

const ADMIN_ACTIONS: readonly RoleQuickAction[] = [
  {
    title: 'Cola de moderación',
    description: 'Revisa las publicaciones pendientes, apruébalas o devuélvelas con motivo al anfitrión.',
    route: '/admin/moderacion',
    cta: 'Abrir moderación',
  },
  {
    title: 'Supervisar disponibilidad',
    description: 'Consulta las publicaciones y ventanas de fechas configuradas por los anfitriones.',
    route: '/anfitrion/publicaciones',
    cta: 'Ver panel de anfitrión',
  },
];

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="role-boundary-shell" role="region" aria-labelledby="boundary-title">
      <div class="role-boundary-card">
        <div class="boundary-header">
          <span class="role-pill">
            Perfil activo · {{ currentRoleLabel }}
          </span>
          <h1 id="boundary-title">Esta sección está reservada para otro perfil</h1>
          <p class="boundary-lead">
            En <strong>Inversiones LR</strong> cada cuenta cuenta con un espacio diseñado para sus operaciones.
            Tu sesión actual como <strong>{{ currentRoleLabel }}</strong> no incluye acceso directo a esta vista,
            pero aquí tienes tus herramientas habilitadas:
          </p>
        </div>

        <div class="actions-grid">
          <a
            *ngFor="let item of availableActions"
            [routerLink]="item.route"
            class="action-tile"
          >
            <div class="tile-body">
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
            </div>
            <span class="tile-cta">{{ item.cta }} →</span>
          </a>
        </div>

        <footer class="boundary-footer">
          <a routerLink="/listings" class="btn-primary">
            Ir al catálogo de alojamientos
          </a>
          <button type="button" class="btn-secondary" (click)="switchAccount()">
            Cambiar de cuenta o rol
          </button>
        </footer>
      </div>
    </section>
  `,
  styles: [`
    .role-boundary-shell {
      min-height: calc(100vh - 130px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 36px 20px;
    }
    .role-boundary-card {
      width: 100%;
      max-width: 680px;
      background: #ffffff;
      border-radius: 26px;
      padding: 40px 36px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .boundary-header {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .role-pill {
      display: inline-flex;
      align-items: center;
      padding: 5px 13px;
      border-radius: 980px;
      background: #f2f2f7;
      color: #1d1d1f;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.5rem, 2.5vw, 1.9rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #1d1d1f;
    }
    .boundary-lead {
      margin: 0;
      color: #6e6e73;
      font-size: 0.94rem;
      line-height: 1.6;
    }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .action-tile {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      padding: 20px;
      border-radius: 18px;
      background: #f5f5f7;
      border: 1px solid transparent;
      text-decoration: none;
      color: #1d1d1f;
      transition: all 0.2s ease;
    }
    .action-tile:hover {
      background: #ffffff;
      border-color: #1d1d1f;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.05);
      transform: translateY(-2px);
    }
    .tile-body h2 {
      margin: 0 0 6px;
      font-size: 1rem;
      font-weight: 700;
      color: #1d1d1f;
    }
    .tile-body p {
      margin: 0;
      font-size: 0.84rem;
      color: #6e6e73;
      line-height: 1.45;
    }
    .tile-cta {
      font-size: 0.8rem;
      font-weight: 700;
      color: #1d1d1f;
    }
    .boundary-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 18px;
      border-top: 1px solid #e5e5ea;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #1d1d1f;
      color: #ffffff;
      text-decoration: none;
      padding: 11px 22px;
      border-radius: 980px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .btn-secondary {
      background: #ffffff;
      color: #1d1d1f;
      border: 1px solid #d2d2d7;
      padding: 11px 20px;
      border-radius: 980px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary:hover {
      background: #f5f5f7;
    }
    @media (max-width: 520px) {
      .role-boundary-card {
        padding: 28px 20px;
      }
    }
  `],
})
export class AccessDeniedComponent {
  constructor(private readonly router?: Router) {}

  get session(): StoredSession | null {
    return getActiveSession();
  }

  get currentRoleLabel(): string {
    const role = this.session?.role;
    if (role === 'ANFITRION') return 'Anfitrión';
    if (role === 'ADMINISTRADOR') return 'Administrador';
    if (role === 'HUESPED') return 'Huésped';
    return 'Visitante';
  }

  get availableActions(): readonly RoleQuickAction[] {
    const role = this.session?.role;
    if (role === 'ANFITRION') return HOST_ACTIONS;
    if (role === 'ADMINISTRADOR') return ADMIN_ACTIONS;
    return GUEST_ACTIONS;
  }

  switchAccount(): void {
    clearActiveSession();
    this.router?.navigate(['/auth/login']);
  }
}
