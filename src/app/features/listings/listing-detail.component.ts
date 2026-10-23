import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';

/** Detalle tal como lo devuelve GET /api/listings/:id (HU-026). */
export interface ListingDetail {
  id: string;
  title: string;
  description?: string;
  location: { address?: string; city?: string; department?: string; country?: string; text: string };
  propertyType?: string;
  propertyTypeLabel?: string;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  pricePerNight?: number;
  amenities: string[];
  rules: string[];
  images: string[];
  cancellationPolicy: {
    code: string;
    name: string;
    description: string;
    rules: Array<{ minHoursBeforeCheckIn: number; refundPercentage: number }>;
  };
  additionalServices: Array<{ name: string; cost: number }>;
  averageRating: number;
  reviewCount: number;
  hostName?: string;
  status: string;
}

export interface DetailReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  date: string;
}

/** Nombre de cada servicio, tanto los del formulario del anfitrión como los de las publicaciones demo. */
export const AMENITY_LABELS: Record<string, string> = {
  WIFI: 'Wi-Fi',
  COCINA: 'Cocina',
  KITCHEN: 'Cocina',
  PARQUEADERO: 'Parqueadero',
  PARKING: 'Parqueadero',
  PISCINA: 'Piscina',
  POOL: 'Piscina',
  AIRE_ACONDICIONADO: 'Aire acondicionado',
  AC: 'Aire acondicionado',
  TV: 'TV',
  LAVADORA: 'Lavadora',
  MASCOTAS: 'Admite mascotas',
  WORKSPACE: 'Espacio de trabajo',
  HEATING: 'Calefacción',
  GYM: 'Gimnasio',
  FIREPLACE: 'Chimenea',
  CHIMENEA: 'Chimenea',
};

export function amenityLabel(code: string): string {
  if (AMENITY_LABELS[code]) {
    return AMENITY_LABELS[code];
  }
  const text = code.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const copFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export function formatCop(value?: number | null): string {
  return value == null ? 'Por definir' : `$ ${copFormatter.format(value)}`;
}

/**
 * HU-026 · Consultar el detalle de una publicación (CA1, CA2, RF-034, RN-006).
 * Muestra todo lo necesario para comparar antes de cotizar. Si la publicación no está
 * ACTIVA (y quien consulta no tiene reservas en ella) el API responde 404 y se indica que no está disponible.
 */
@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="detail-shell">
      <a routerLink="/listings" class="back-link">← Volver a los resultados</a>

      <p class="status-msg" *ngIf="loading" role="status">Cargando el alojamiento…</p>

      <!-- CA2: la publicación no está disponible -->
      <div class="unavailable" *ngIf="!loading && unavailable" role="alert">
        <h1>Esta publicación no está disponible</h1>
        <p>Puede que el anfitrión la haya pausado o que ya no esté publicada. Busca otras opciones para tu viaje.</p>
        <a routerLink="/listings" class="primary-btn">Explorar alojamientos</a>
      </div>

      <div class="alert-error" *ngIf="!loading && errorMessage" role="alert">
        {{ errorMessage }}
        <button type="button" class="retry-btn" (click)="load()">Reintentar</button>
      </div>

      <!-- CA1: detalle completo -->
      <article *ngIf="!loading && listing as item">
        <header class="detail-header">
          <div class="pills">
            <span class="pill dark" *ngIf="item.propertyTypeLabel">{{ item.propertyTypeLabel }}</span>
            <span class="pill" *ngIf="item.status !== 'ACTIVA'">No disponible para nuevas reservas</span>
          </div>
          <h1>{{ item.title }}</h1>
          <p class="location">{{ item.location.text || 'Ubicación por definir' }}</p>
          <p class="rating" [class.muted]="item.reviewCount === 0">
            <ng-container *ngIf="item.reviewCount > 0; else noRating">
              ★ {{ item.averageRating.toFixed(2) }} · {{ item.reviewCount }} {{ item.reviewCount === 1 ? 'reseña' : 'reseñas' }}
            </ng-container>
            <ng-template #noRating>Sin calificaciones todavía</ng-template>
          </p>
        </header>

        <div class="gallery" *ngIf="item.images.length > 0; else noImages">
          <img class="main-image" [src]="item.images[selectedImage]" [alt]="item.title + ' · imagen ' + (selectedImage + 1)" />
          <div class="thumbs" *ngIf="item.images.length > 1" role="list" aria-label="Imágenes del alojamiento">
            <button
              type="button"
              role="listitem"
              *ngFor="let image of item.images; let i = index"
              [class.active]="i === selectedImage"
              (click)="selectedImage = i"
              [attr.aria-label]="'Ver imagen ' + (i + 1)"
            >
              <img [src]="image" alt="" />
            </button>
          </div>
        </div>
        <ng-template #noImages><div class="no-images">Sin imágenes</div></ng-template>

        <div class="layout">
          <div class="main">
            <section>
              <h2>Descripción</h2>
              <p>{{ item.description || 'El anfitrión aún no agrega una descripción.' }}</p>
            </section>

            <section>
              <h2>Servicios</h2>
              <ul class="chips" *ngIf="item.amenities.length > 0; else noAmenities">
                <li *ngFor="let amenity of item.amenities">{{ amenityName(amenity) }}</li>
              </ul>
              <ng-template #noAmenities><p class="muted">Sin servicios registrados.</p></ng-template>
            </section>

            <section>
              <h2>Reglas de la casa</h2>
              <ul class="rules" *ngIf="item.rules.length > 0; else noRules">
                <li *ngFor="let rule of item.rules">{{ rule }}</li>
              </ul>
              <ng-template #noRules><p class="muted">Sin reglas registradas.</p></ng-template>
            </section>

            <section>
              <h2>Política de cancelación · {{ item.cancellationPolicy.name }}</h2>
              <p>{{ item.cancellationPolicy.description }}</p>
            </section>

            <section>
              <h2>Servicios adicionales</h2>
              <ul class="extras" *ngIf="item.additionalServices.length > 0; else noExtras">
                <li *ngFor="let extra of item.additionalServices">
                  <span>{{ extra.name }}</span>
                  <strong>{{ cop(extra.cost) }} <small>por estancia</small></strong>
                </li>
              </ul>
              <ng-template #noExtras><p class="muted">Este alojamiento no ofrece servicios adicionales.</p></ng-template>
            </section>

            <section *ngIf="item.reviewCount > 0 && reviews.length > 0">
              <h2>Reseñas</h2>
              <div class="reviews">
                <div class="review" *ngFor="let review of reviews">
                  <div class="review-meta">
                    <strong>{{ review.authorName }}</strong>
                    <span>★ {{ review.rating.toFixed(1) }} · {{ review.date }}</span>
                  </div>
                  <p>{{ review.comment }}</p>
                </div>
              </div>
            </section>
          </div>

          <aside class="summary" aria-label="Resumen del alojamiento">
            <p class="price"><strong>{{ cop(item.pricePerNight) }}</strong> <span>/ noche</span></p>
            <dl>
              <div><dt>Tipo</dt><dd>{{ item.propertyTypeLabel || 'Por definir' }}</dd></div>
              <div><dt>Capacidad</dt><dd>{{ item.maxGuests ? item.maxGuests + (item.maxGuests === 1 ? ' huésped' : ' huéspedes') : 'Por definir' }}</dd></div>
              <div *ngIf="item.bedrooms != null"><dt>Habitaciones</dt><dd>{{ item.bedrooms }}</dd></div>
              <div *ngIf="item.bathrooms != null"><dt>Baños</dt><dd>{{ item.bathrooms }}</dd></div>
              <div *ngIf="item.hostName"><dt>Anfitrión</dt><dd>{{ item.hostName }}</dd></div>
            </dl>
          </aside>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .detail-shell {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 24px 72px;
      color: #1d1d1f;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 18px;
      font-size: 0.86rem;
      font-weight: 600;
      color: #0066cc;
      text-decoration: none;
    }
    .status-msg, .muted {
      color: #6e6e73;
    }
    .unavailable {
      text-align: center;
      padding: 56px 24px;
      background: #ffffff;
      border: 1px dashed #d2d2d7;
      border-radius: 22px;
    }
    .unavailable h1 {
      font-size: 1.5rem;
      margin: 0 0 8px;
    }
    .unavailable p {
      color: #6e6e73;
      margin: 0 0 20px;
    }
    .primary-btn {
      display: inline-block;
      padding: 10px 18px;
      border-radius: 980px;
      background: #1d1d1f;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.88rem;
      text-decoration: none;
    }
    .alert-error {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 13px 16px;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
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
    .detail-header h1 {
      margin: 8px 0 6px;
      font-size: clamp(1.6rem, 3vw, 2.2rem);
      letter-spacing: -0.03em;
    }
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pill {
      padding: 4px 11px;
      border-radius: 980px;
      background: #f5f5f7;
      color: #6e6e73;
      font-size: 0.74rem;
      font-weight: 600;
    }
    .pill.dark {
      background: #1d1d1f;
      color: #ffffff;
    }
    .location {
      margin: 0;
      color: #3a3a3c;
      font-size: 0.95rem;
    }
    .rating {
      margin: 6px 0 0;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .gallery {
      margin: 22px 0 28px;
    }
    .main-image {
      width: 100%;
      max-height: 520px;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 22px;
      display: block;
      background: #e5e5ea;
    }
    .thumbs {
      display: flex;
      gap: 10px;
      margin-top: 10px;
      overflow-x: auto;
    }
    .thumbs button {
      flex: 0 0 96px;
      height: 68px;
      padding: 0;
      border: 2px solid transparent;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      background: #e5e5ea;
    }
    .thumbs button.active {
      border-color: #1d1d1f;
    }
    .thumbs img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .no-images {
      margin: 22px 0 28px;
      padding: 60px 0;
      text-align: center;
      border-radius: 22px;
      background: #f5f5f7;
      color: #86868b;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
      gap: 32px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    .main section {
      padding: 18px 0;
      border-top: 1px solid #e5e5ea;
    }
    .main section:first-child {
      border-top: none;
      padding-top: 0;
    }
    .main h2 {
      margin: 0 0 10px;
      font-size: 1.08rem;
    }
    .main p {
      margin: 0;
      line-height: 1.6;
      color: #3a3a3c;
    }
    .chips {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chips li {
      padding: 6px 12px;
      border: 1px solid #d2d2d7;
      border-radius: 980px;
      font-size: 0.84rem;
    }
    .rules {
      margin: 0;
      padding-left: 20px;
      line-height: 1.7;
    }
    .extras {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .extras li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f3;
    }
    .extras small {
      font-weight: 400;
      color: #86868b;
    }
    .reviews {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .review {
      background: #f5f5f7;
      border-radius: 14px;
      padding: 14px 16px;
    }
    .review-meta {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.8rem;
      margin-bottom: 6px;
    }
    .summary {
      position: sticky;
      top: 88px;
      padding: 22px;
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 20px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.05);
    }
    .price {
      margin: 0 0 14px;
    }
    .price strong {
      font-size: 1.5rem;
      letter-spacing: -0.02em;
    }
    .price span {
      color: #6e6e73;
    }
    .summary dl {
      margin: 0;
    }
    .summary dl div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 0;
      border-top: 1px solid #f0f0f3;
      font-size: 0.9rem;
    }
    .summary dt {
      color: #6e6e73;
    }
    .summary dd {
      margin: 0;
      font-weight: 600;
      text-align: right;
    }
  `],
})
export class ListingDetailComponent implements OnInit {
  listing: ListingDetail | null = null;
  reviews: DetailReview[] = [];
  selectedImage = 0;
  loading = false;
  unavailable = false;
  errorMessage = '';

  constructor(private readonly route?: ActivatedRoute) {}

  ngOnInit(): void {
    void this.load();
  }

  get listingId(): string {
    return this.route?.snapshot.paramMap.get('id') ?? '';
  }

  amenityName(code: string): string {
    return amenityLabel(code);
  }

  cop(value?: number | null): string {
    return formatCop(value);
  }

  /** Envía el token si hay sesión: el anfitrión dueño, el admin y quien tiene reservas pueden ver publicaciones no activas. */
  async load(): Promise<void> {
    this.loading = true;
    this.unavailable = false;
    this.errorMessage = '';
    this.listing = null;
    try {
      const token = getActiveSession()?.token;
      const response = await fetch(`/api/listings/${encodeURIComponent(this.listingId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.status === 404) {
        this.unavailable = true;
        return;
      }
      if (!response.ok) {
        this.errorMessage = 'No fue posible cargar el alojamiento. Intenta de nuevo.';
        return;
      }

      this.listing = (await response.json()) as ListingDetail;
      this.selectedImage = 0;
      if (this.listing.reviewCount > 0) {
        await this.loadReviews();
      }
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  private async loadReviews(): Promise<void> {
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(this.listingId)}/reviews`);
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as {
        reviews?: Array<{ id: string; authorName: string; rating: number; comment: string; createdAt: string }>;
      };
      this.reviews = (body.reviews ?? []).map((review) => ({
        id: review.id,
        authorName: review.authorName,
        rating: review.rating,
        comment: review.comment,
        date: new Date(review.createdAt).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
      }));
    } catch {
      this.reviews = [];
    }
  }
}
