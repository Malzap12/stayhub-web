import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export interface PublicListingItem {
  id: string;
  title: string;
  city: string;
  category: string;
  priceCop: string;
  rating: number;
  guests: number;
  bedrooms: number;
  imageUrl: string;
  hostName: string;
  description: string;
}

/** Publicación tal como la devuelve GET /api/listings/search. */
export interface ApiListing {
  id: string;
  title: string;
  description?: string;
  city?: string;
  propertyType?: string;
  pricePerNight?: number;
  maxGuests?: number;
  bedrooms?: number;
  images?: string[];
  rating?: number;
  hostName?: string;
}

interface SearchResponse {
  data: ApiListing[];
  total: number;
}

export interface SearchForm {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  CASA: 'Casa',
  APARTAMENTO: 'Apartamento',
  CABANA: 'Cabaña',
  FINCA: 'Finca',
  HABITACION: 'Habitación',
  OTRO: 'Otro',
};

@Component({
  selector: 'app-listing-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="cupertino-catalog">
      <!-- Encabezado Editorial Minimalista -->
      <header class="catalog-hero">
        <div class="hero-top">
          <div>
            <span class="apple-eyebrow">Colección Curada · Colombia</span>
            <h1>Espacios diseñados para la calma.</h1>
          </div>
          <p class="hero-sub">
            Explora alojamientos verificados, inspecciona cada galería arquitectónica y
            consulta reseñas reales sin necesidad de iniciar sesión.
          </p>
        </div>

        <!-- HU-024 · Buscar por ciudad, fechas y huéspedes -->
        <form class="search-form" (ngSubmit)="search()" novalidate role="search" aria-label="Buscar alojamientos">
          <div class="field field-city">
            <label for="search-city">Ciudad</label>
            <input id="search-city" name="city" type="text" placeholder="¿A dónde viajas? Ej. Bogotá" [(ngModel)]="form.city" />
          </div>
          <div class="field">
            <label for="search-check-in">Llegada</label>
            <input
              id="search-check-in"
              name="checkIn"
              type="date"
              [(ngModel)]="form.checkIn"
              [class.input-error]="!!formError && !!datesError"
            />
          </div>
          <div class="field">
            <label for="search-check-out">Salida</label>
            <input
              id="search-check-out"
              name="checkOut"
              type="date"
              [min]="form.checkIn"
              [(ngModel)]="form.checkOut"
              [class.input-error]="!!formError && !!datesError"
            />
          </div>
          <div class="field">
            <label for="search-guests">Huéspedes</label>
            <input
              id="search-guests"
              name="guests"
              type="number"
              min="1"
              step="1"
              [(ngModel)]="form.guests"
              [class.input-error]="!!formError && !!guestsError"
            />
          </div>
          <div class="search-actions">
            <button type="submit" class="search-btn" [disabled]="loading">{{ loading ? 'Buscando…' : 'Buscar' }}</button>
            <button type="button" class="clear-btn" (click)="clearSearch()">Limpiar</button>
          </div>
          <p class="form-error" *ngIf="formError" role="alert">{{ formError }}</p>
        </form>

      </header>

      <p class="status-msg" *ngIf="loading" role="status">Buscando alojamientos…</p>
      <div class="alert-error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>

      <ng-container *ngIf="!loading && !errorMessage && searched">
        <p class="results-summary" *ngIf="listings.length > 0" role="status">{{ resultsSummary }}</p>
        <div class="empty-state" *ngIf="listings.length === 0" role="status">
          <h2>No encontramos alojamientos</h2>
          <p>Prueba con otra ciudad, otras fechas o menos huéspedes.</p>
        </div>
      </ng-container>

      <!-- HU-003 CA3 / HU-024: resultados públicos, solo publicaciones ACTIVAS -->
      <div class="listing-grid" *ngIf="!loading">
        <article
          class="listing-card"
          *ngFor="let item of listings"
          (click)="openDetail(item)"
        >
          <div class="card-media">
            <img
              [src]="item.imageUrl"
              [alt]="item.title + ' - ' + item.city"
              loading="lazy"
            />
            <span class="media-badge">{{ item.category }}</span>
            <span class="media-rating">{{ item.rating > 0 ? '★ ' + item.rating.toFixed(2) : 'Nuevo' }}</span>
          </div>

          <div class="card-body">
            <div class="card-location">
              <span>{{ item.city }}</span>
              <span class="dot">·</span>
              <span>{{ item.guests }} huéspedes · {{ item.bedrooms }} hab.</span>
            </div>

            <h2>{{ item.title }}</h2>
            <p class="listing-desc">{{ item.description }}</p>

            <div class="listing-footer">
              <div class="price-block">
                <strong class="price-cop">{{ item.priceCop }}</strong>
                <span>/ noche</span>
              </div>
              <a
                class="apple-secondary-btn"
                [routerLink]="['/listings', item.id]"
                (click)="$event.stopPropagation()"
              >
                Ver detalle
              </a>
            </div>
          </div>
        </article>
      </div>

    </section>
  `,
  styles: [`
    .cupertino-catalog {
      max-width: 1240px;
      margin: 0 auto;
      padding: 36px 24px 80px;
    }
    .catalog-hero {
      margin-bottom: 36px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      flex-wrap: wrap;
    }
    .apple-eyebrow {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #86868b;
      margin-bottom: 8px;
    }
    .catalog-hero h1 {
      font-size: clamp(1.85rem, 3.2vw, 2.6rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #1d1d1f;
      margin: 0;
      line-height: 1.08;
    }
    .hero-sub {
      color: #6e6e73;
      max-width: 440px;
      margin: 0;
      font-size: 0.94rem;
      line-height: 1.55;
    }
    .search-form {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 0.8fr auto;
      gap: 12px;
      align-items: end;
      padding: 18px;
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 20px;
    }
    @media (max-width: 860px) {
      .search-form {
        grid-template-columns: 1fr 1fr;
      }
      .search-form .field-city,
      .search-form .search-actions {
        grid-column: 1 / -1;
      }
    }
    .search-form .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .search-form label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6e6e73;
    }
    .search-form input {
      height: 40px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1px solid #d2d2d7;
      background: #ffffff;
      color: #1d1d1f;
      font-size: 0.88rem;
      width: 100%;
      box-sizing: border-box;
    }
    .search-form input:focus {
      outline: none;
      border-color: #1d1d1f;
    }
    .search-form input.input-error {
      border-color: #d70015;
      background: #fff2f4;
    }
    .search-actions {
      display: flex;
      gap: 8px;
    }
    .search-btn {
      height: 40px;
      padding: 0 20px;
      border-radius: 980px;
      border: none;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .search-btn:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .clear-btn {
      height: 40px;
      padding: 0 14px;
      border-radius: 980px;
      border: 1px solid #d2d2d7;
      background: #ffffff;
      color: #1d1d1f;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .form-error {
      grid-column: 1 / -1;
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
      color: #d70015;
    }
    .results-summary {
      margin: 0 0 18px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #3a3a3c;
    }
    .status-msg {
      color: #6e6e73;
    }
    .alert-error {
      padding: 13px 16px;
      margin-bottom: 18px;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      background: #ffffff;
      border: 1px dashed #d2d2d7;
      border-radius: 20px;
      color: #6e6e73;
    }
    .empty-state h2 {
      margin: 0 0 8px;
      font-size: 1.15rem;
      color: #1d1d1f;
    }
    .empty-state p {
      margin: 0;
    }

    .listing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 28px;
    }
    .listing-card {
      background: #ffffff;
      border-radius: 22px;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.07);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.24s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.2s ease;
    }
    .listing-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 44px rgba(0, 0, 0, 0.07);
      border-color: rgba(29, 29, 31, 0.2);
    }
    .listing-card.selected {
      border-color: #1d1d1f;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.09);
    }
    .card-media {
      position: relative;
      aspect-ratio: 16 / 10;
      background: #e5e5ea;
      overflow: hidden;
    }
    .card-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      filter: saturate(0.92) contrast(1.02);
      transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .listing-card:hover .card-media img {
      transform: scale(1.04);
    }
    .media-badge {
      position: absolute;
      top: 14px;
      left: 14px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      color: #1d1d1f;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 5px 11px;
      border-radius: 980px;
    }
    .media-rating {
      position: absolute;
      top: 14px;
      right: 14px;
      background: rgba(29, 29, 31, 0.85);
      backdrop-filter: blur(10px);
      color: #ffffff;
      font-size: 0.74rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 980px;
    }
    .card-body {
      padding: 20px 22px 22px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .card-location {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.76rem;
      font-weight: 600;
      color: #86868b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .dot {
      color: #d2d2d7;
    }
    .listing-card h2 {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #1d1d1f;
      margin: 0;
    }
    .listing-desc {
      color: #6e6e73;
      font-size: 0.86rem;
      line-height: 1.5;
      margin: 0;
      flex: 1;
    }
    .listing-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      padding-top: 14px;
      border-top: 1px solid #f5f5f7;
    }
    .price-block {
      display: flex;
      align-items: baseline;
      gap: 5px;
    }
    .price-cop {
      color: #1d1d1f;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .price-block span {
      color: #86868b;
      font-size: 0.75rem;
    }
    .apple-secondary-btn {
      text-decoration: none;
      background: #1d1d1f;
      color: #ffffff;
      border: none;
      padding: 8px 15px;
      border-radius: 980px;
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.16s ease;
    }
    .apple-secondary-btn:hover {
      background: #000000;
    }
  `],
})
export class ListingListComponent implements OnInit {
  form: SearchForm = { city: '', checkIn: '', checkOut: '', guests: 1 };
  listings: PublicListingItem[] = [];
  loading = false;
  searched = false;
  formError = '';
  errorMessage = '';

  private readonly priceFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  constructor(private readonly router?: Router) {}

  ngOnInit(): void {
    void this.search();
  }

  /** HU-026: abre el detalle completo del resultado. */
  openDetail(item: PublicListingItem): void {
    void this.router?.navigate(['/listings', item.id]);
  }

  /** HU-024 CA3 (RN-010): si hay fechas, deben ser ambas y la salida posterior a la llegada. */
  get datesError(): string {
    const { checkIn, checkOut } = this.form;
    if (!checkIn && !checkOut) {
      return '';
    }
    if (!checkIn || !checkOut) {
      return 'Indica la fecha de llegada y la de salida, o deja ambas vacías.';
    }
    return checkOut <= checkIn ? 'La fecha de salida debe ser posterior a la fecha de llegada.' : '';
  }

  get guestsError(): string {
    const guests = Number(this.form.guests);
    return Number.isInteger(guests) && guests >= 1 ? '' : 'El número de huéspedes debe ser al menos 1.';
  }

  /** Parámetros de GET /api/listings/search; sin fechas no se filtra por disponibilidad (CA4). */
  buildQuery(): string {
    const params = new URLSearchParams({ limit: '50' });
    const city = this.form.city.trim();
    if (city) {
      params.set('city', city);
    }
    if (this.form.checkIn && this.form.checkOut) {
      params.set('checkIn', this.form.checkIn);
      params.set('checkOut', this.form.checkOut);
    }
    params.set('guests', String(this.form.guests));
    return params.toString();
  }

  /** HU-024 · Busca en el API; si el formulario tiene errores no ejecuta la búsqueda (CA3). */
  async search(): Promise<void> {
    this.formError = this.datesError || this.guestsError;
    if (this.formError) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch(`/api/listings/search?${this.buildQuery()}`);
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.errorMessage = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible realizar la búsqueda.';
        return;
      }

      this.listings = ((body as SearchResponse).data ?? []).map((listing) => this.toItem(listing));
      this.searched = true;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  clearSearch(): void {
    this.form = { city: '', checkIn: '', checkOut: '', guests: 1 };
    void this.search();
  }

  get resultsSummary(): string {
    const count = this.listings.length;
    const noun = count === 1 ? 'alojamiento' : 'alojamientos';
    const city = this.form.city.trim();
    const where = city ? ` en ${city}` : '';
    const when = this.form.checkIn && this.form.checkOut ? ` del ${this.form.checkIn} al ${this.form.checkOut}` : '';
    return `${count} ${noun}${where}${when} para ${this.form.guests} ${Number(this.form.guests) === 1 ? 'huésped' : 'huéspedes'}`;
  }

  toItem(listing: ApiListing): PublicListingItem {
    return {
      id: listing.id,
      title: listing.title,
      city: listing.city ?? '',
      category: PROPERTY_TYPE_LABELS[listing.propertyType ?? ''] ?? 'Alojamiento',
      priceCop: listing.pricePerNight == null ? 'Por definir' : this.priceFormatter.format(listing.pricePerNight),
      rating: listing.rating ?? 0,
      guests: listing.maxGuests ?? 0,
      bedrooms: listing.bedrooms ?? 0,
      imageUrl: listing.images?.[0] ?? '',
      hostName: listing.hostName ?? 'Anfitrión',
      description: listing.description ?? '',
    };
  }
}
