import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getActiveSession, StoredSession } from '../../core/guards/auth.guard';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="cupertino-denied-wrapper" role="alert">
      <div class="cupertino-denied-card">
        <span class="denied-badge">Error 403 · Acceso Denegado</span>
        <h1>No tienes permisos para usar esta función</h1>
        <p>
          Esta sección exige un rol diferente al de tu cuenta actual
          <strong *ngIf="session">({{ session.role }})</strong>.
          Por seguridad, cada operación valida el rol correspondiente en interfaz y servidor.
        </p>
        <div class="denied-actions">
          <a routerLink="/listings" class="apple-primary-link">Volver al catálogo público</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .cupertino-denied-wrapper {
      min-height: calc(100vh - 140px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .cupertino-denied-card {
      max-width: 460px;
      background: #ffffff;
      border-radius: 20px;
      padding: 36px 32px;
      text-align: center;
      border: 1px solid rgba(215, 0, 21, 0.2);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.06);
    }
    .denied-badge {
      display: inline-block;
      background: rgba(215, 0, 21, 0.1);
      color: #d70015;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 980px;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 1.5rem;
      color: #1d1d1f;
      margin: 0 0 10px;
      letter-spacing: -0.02em;
    }
    p {
      color: #6e6e73;
      font-size: 0.92rem;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    .apple-primary-link {
      display: inline-block;
      background: #0071e3;
      color: #ffffff;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 980px;
      font-size: 0.875rem;
      font-weight: 600;
    }
  `],
})
export class AccessDeniedComponent {
  get session(): StoredSession | null {
    return getActiveSession();
  }
}
