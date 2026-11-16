import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { FavoriteListingItem, FavoritesPage } from '../../shared/models/favorites.model';

@Component({
  selector: 'app-my-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="favorites-shell">
      <header class="favorites-header">
        <div>
          <span class="eyebrow">Alojamientos guardados</span>
          <h1>Mis favoritos</h1>
          <p class="subtitle">Retoma tus alojamientos preferidos y revisa su disponibilidad antes de reservar.</p>
        </div>
        <a routerLink="/listings" class="explore-link">Explorar alojamientos</a>
      </header>

      <p class="status-msg" *ngIf="loading" role="status">Cargando tus favoritos…</p>
      <div class="alert error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>

      <div class="empty-state" *ngIf="!loading && !errorMessage && items.length === 0">
        <h2>Aún no tienes alojamientos guardados</h2>
        <p>Pulsa «Guardar» en cualquier alojamiento que te interese para encontrarlo aquí más adelante.</p>
        <a routerLink="/listings" class="primary-btn">Buscar alojamientos</a>
      </div>

      <div class="favorites-grid" *ngIf="!loading && items.length > 0">
        <article class="fav-card" *ngFor="let item of items" [class.unavailable]="!item.available">
          <a
            *ngIf="item.available; else staticMedia"
            [routerLink]="['/listings', item.listingId]"
            class="media-link"
          >
            <img *ngIf="item.imageUrl" [src]="item.imageUrl" [alt]="item.title" loading="lazy" />
            <div class="no-photo" *ngIf="!item.imageUrl">Sin imagen</div>
          </a>
          <ng-template #staticMedia>
            <div class="media-link disabled">
              <img *ngIf="item.imageUrl" [src]="item.imageUrl" [alt]="item.title" loading="lazy" />
              <div class="no-photo" *ngIf="!item.imageUrl">Sin imagen</div>
              <span class="status-badge">No disponible</span>
            </div>
          </ng-template>

          <div class="card-body">
            <div class="card-meta">
              <span class="city">{{ item.city || 'Colombia' }}</span>
              <span class="rating">{{ item.rating > 0 ? '★ ' + item.rating.toFixed(2) : 'Nuevo' }}</span>
            </div>

            <h2>
              <a *ngIf="item.available" [routerLink]="['/listings', item.listingId]" class="title-link">
                {{ item.title }}
              </a>
              <span *ngIf="!item.available">{{ item.title }}</span>
            </h2>

            <p class="unavailable-note" *ngIf="!item.available">
              Este alojamiento ya no se encuentra activo para nuevas reservas.
            </p>

            <div class="card-footer">
              <div class="price-block">
                <strong>{{ formatCop(item.pricePerNight) }}</strong>
                <span>/ noche</span>
              </div>
              <div class="actions">
                <a *ngIf="item.available" [routerLink]="['/listings', item.listingId]" class="detail-btn">
                  Ver detalle
                </a>
                <button
                  type="button"
                  class="remove-btn"
                  [disabled]="removingId === item.listingId"
                  (click)="removeFavorite(item)"
                >
                  {{ removingId === item.listingId ? 'Quitando…' : 'Guardado' }}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <nav class="pagination" *ngIf="totalPages > 1" aria-label="Paginación de favoritos">
        <button type="button" class="page-btn" [disabled]="page <= 1 || loading" (click)="goToPage(page - 1)">
          Anterior
        </button>
        <span>Página {{ page }} de {{ totalPages }}</span>
        <button type="button" class="page-btn" [disabled]="page >= totalPages || loading" (click)="goToPage(page + 1)">
          Siguiente
        </button>
      </nav>
    </section>
  `,
  styles: [
    `
      .favorites-shell { max-width: 1200px; margin: 0 auto; padding: 32px 24px 72px; color: #1d1d1f; }
      .favorites-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
      .eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6e6e73; margin-bottom: 6px; }
      .favorites-header h1 { margin: 0; font-size: clamp(1.7rem, 2.8vw, 2.3rem); letter-spacing: -0.03em; }
      .subtitle { margin: 6px 0 0; color: #6e6e73; font-size: 0.94rem; }
      .explore-link { text-decoration: none; padding: 9px 16px; border-radius: 980px; border: 1px solid #d2d2d7; color: #1d1d1f; font-weight: 600; font-size: 0.85rem; }
      .explore-link:hover { background: #f5f5f7; }
      .status-msg { color: #6e6e73; }
      .alert.error { padding: 12px 16px; border-radius: 12px; background: #fff2f0; border: 1px solid #ffccc7; color: #a8071a; margin-bottom: 16px; }
      .empty-state { border: 1px dashed #d2d2d7; border-radius: 20px; padding: 48px 24px; text-align: center; background: #fafafa; }
      .empty-state h2 { margin: 0 0 8px; font-size: 1.25rem; }
      .empty-state p { margin: 0 0 20px; color: #6e6e73; }
      .primary-btn { display: inline-block; text-decoration: none; padding: 10px 20px; border-radius: 980px; background: #1d1d1f; color: #fff; font-weight: 600; font-size: 0.9rem; }
      .favorites-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 20px; }
      .fav-card { border: 1px solid #e5e5ea; border-radius: 18px; overflow: hidden; background: #ffffff; display: flex; flex-direction: column; }
      .fav-card.unavailable { border-color: #f0c9c6; background: #fffafa; }
      .media-link { position: relative; display: block; height: 200px; background: #f5f5f7; overflow: hidden; }
      .media-link.disabled { cursor: default; }
      .media-link img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .fav-card.unavailable .media-link img { filter: grayscale(40%); opacity: 0.82; }
      .no-photo { width: 100%; height: 100%; display: grid; place-items: center; color: #86868b; font-size: 0.85rem; }
      .status-badge { position: absolute; top: 12px; left: 12px; padding: 5px 11px; border-radius: 980px; background: #b42318; color: #ffffff; font-size: 0.75rem; font-weight: 700; }
      .card-body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
      .card-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: #6e6e73; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
      .rating { color: #1d1d1f; }
      .card-body h2 { margin: 0; font-size: 1.1rem; line-height: 1.3; }
      .title-link { color: #1d1d1f; text-decoration: none; }
      .title-link:hover { text-decoration: underline; }
      .unavailable-note { margin: 0; font-size: 0.82rem; color: #b42318; font-weight: 600; }
      .card-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid #f2f2f5; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
      .price-block strong { font-size: 1.05rem; }
      .price-block span { color: #6e6e73; font-size: 0.78rem; margin-left: 3px; }
      .actions { display: flex; gap: 8px; align-items: center; }
      .detail-btn { text-decoration: none; padding: 7px 14px; border-radius: 980px; background: #1d1d1f; color: #ffffff; font-size: 0.78rem; font-weight: 600; }
      .remove-btn { padding: 7px 13px; border-radius: 980px; border: 1px solid #d2d2d7; background: #ffffff; color: #1d1d1f; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
      .remove-btn:hover:not(:disabled) { border-color: #b42318; color: #b42318; background: #fff5f5; }
      .remove-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 28px; font-size: 0.9rem; }
      .page-btn { padding: 8px 16px; border-radius: 980px; border: 1px solid #d2d2d7; background: #ffffff; font-weight: 600; cursor: pointer; }
      .page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    `,
  ],
})
export class MyFavoritesComponent implements OnInit {
  items: FavoriteListingItem[] = [];
  page = 1;
  limit = 9;
  total = 0;
  totalPages = 1;
  loading = false;
  errorMessage = '';
  removingId = '';

  private readonly priceFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  constructor(private readonly router?: Router) {}

  ngOnInit(): void {
    void this.load();
  }

  formatCop(value: number): string {
    return this.priceFormatter.format(value || 0);
  }

  async load(): Promise<void> {
    const session = getActiveSession();
    if (!session) {
      void this.router?.navigate(['/auth/login'], { queryParams: { returnUrl: '/mis-favoritos' } });
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch(`/api/favorites?page=${this.page}&limit=${this.limit}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!response.ok) {
        this.errorMessage = 'No fue posible cargar tus favoritos.';
        return;
      }
      const body = (await response.json()) as FavoritesPage;
      this.items = body.data ?? [];
      this.page = body.page ?? 1;
      this.total = body.total ?? this.items.length;
      this.totalPages = body.totalPages ?? 1;
    } catch {
      this.errorMessage = 'Error de conexión al consultar tus favoritos.';
    } finally {
      this.loading = false;
    }
  }

  async removeFavorite(item: FavoriteListingItem): Promise<void> {
    const session = getActiveSession();
    if (!session || this.removingId) return;

    this.removingId = item.listingId;
    try {
      const response = await fetch(`/api/favorites/${encodeURIComponent(item.listingId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (response.ok) {
        await this.load();
      }
    } finally {
      this.removingId = '';
    }
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages) return;
    this.page = nextPage;
    void this.load();
  }
}
