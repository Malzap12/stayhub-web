import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main style="min-height: calc(100vh - 64px); display: flex; align-items: center; justify-content: center; padding: 32px 16px;">
      <section style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 20px; padding: 36px 32px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06); border: 1px solid rgba(0, 0, 0, 0.08); text-align: center;">
        <p style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6e6e73; margin-bottom: 6px;">
          Inversiones LR · Marketplace
        </p>
        <h1 style="font-size: 1.75rem; font-weight: 600; color: #1d1d1f; margin-bottom: 8px; letter-spacing: -0.03em;">
          Iniciar sesión
        </h1>
        <p style="color: #6e6e73; font-size: 0.9375rem; margin-bottom: 24px;">
          Acceso para Huéspedes, Anfitriones y Administradores
        </p>
        <div style="padding-top: 18px; border-top: 1px solid rgba(0, 0, 0, 0.08); font-size: 0.85rem; color: #6e6e73;">
          ¿Aún no tienes cuenta? <a routerLink="/auth/register" style="color: #0071e3; font-weight: 600;">Regístrate aquí</a>
        </div>
      </section>
    </main>
  `,
})
export class LoginComponent {}
