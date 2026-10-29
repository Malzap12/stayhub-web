import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { AvailabilityCalendarComponent } from './availability-calendar.component';
import { StayQuoteComponent } from './stay-quote.component';
import { amenityIconPaths, amenityLabel } from '../../shared/models/amenities.model';
import { initialsOf } from '../../shared/models/display.model';

export { AMENITY_LABELS, amenityLabel } from '../../shared/models/amenities.model';

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
  imports: [CommonModule, RouterLink, AvailabilityCalendarComponent, StayQuoteComponent],
  template: `
    <section class="detail-shell">
      <a routerLink="/listings" class="back-link">← Volver a los resultados</a>

      <p class="status-msg" *ngIf="loading" role="status">Cargando el alojamiento…</p>

      <!-- La publicación no está disponible -->
      <div class="unavailable" *ngIf="!loading && unavailable" role="alert">
        <h1>Esta publicación no está disponible</h1>
        <p>Puede que el anfitrión la haya pausado o que ya no esté publicada. Busca otras opciones para tu viaje.</p>
        <a routerLink="/listings" class="primary-btn">Explorar alojamientos</a>
      </div>

      <div class="alert-error" *ngIf="!loading && errorMessage" role="alert">
        {{ errorMessage }}
        <button type="button" class="retry-btn" (click)="load()">Reintentar</button>
      </div>

      <article *ngIf="!loading && listing as item">
        <header class="detail-header">
          <h1>{{ item.title }}</h1>
          <div class="header-meta">
            <span class="rating" [class.muted]="item.reviewCount === 0">
              <ng-container *ngIf="item.reviewCount > 0; else noRating">
                ★ {{ item.averageRating.toFixed(1) }} · {{ item.reviewCount }} {{ item.reviewCount === 1 ? 'reseña' : 'reseñas' }}
              </ng-container>
              <ng-template #noRating>Sin reseñas todavía</ng-template>
            </span>
            <span class="dot" aria-hidden="true">·</span>
            <span class="location">{{ item.location.text || 'Ubicación por definir' }}</span>
            <span class="pill warn" *ngIf="item.status !== 'ACTIVA'">No disponible para nuevas reservas</span>
          </div>
        </header>

        <!-- Galería: foto principal y miniaturas -->
        <div class="gallery" [class.single]="item.images.length === 1" *ngIf="item.images.length > 0; else noImages">
          <div class="main-frame">
            <img class="main-image" [src]="item.images[selectedImage]" [alt]="item.title + ' · imagen ' + (selectedImage + 1)" />
            <span class="photo-count" *ngIf="item.images.length > 1">{{ selectedImage + 1 }} / {{ item.images.length }}</span>
          </div>
          <div class="thumbs" *ngIf="item.images.length > 1" role="list" aria-label="Imágenes del alojamiento">
            <button
              type="button"
              role="listitem"
              *ngFor="let image of item.images.slice(0, 4); let i = index"
              [class.active]="i === selectedImage"
              (click)="selectedImage = i"
              [attr.aria-label]="'Ver imagen ' + (i + 1)"
            >
              <img [src]="image" alt="" />
              <span class="more" *ngIf="i === 3 && item.images.length > 4" (click)="$event.stopPropagation(); nextImage(item)">
                +{{ item.images.length - 4 }} fotos
              </span>
            </button>
          </div>
        </div>
        <ng-template #noImages><div class="no-images">Sin imágenes</div></ng-template>

        <div class="layout">
          <div class="main">
            <section class="overview">
              <div>
                <h2>{{ headline(item) }}</h2>
                <p class="facts">{{ facts(item) }}</p>
              </div>
              <span class="host-avatar" *ngIf="item.hostName" [attr.aria-label]="'Anfitrión ' + item.hostName">{{ initials(item.hostName) }}</span>
            </section>

            <section class="highlights" aria-label="Lo más destacado">
              <div class="highlight" *ngIf="item.hostName">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
                <div><strong>Anfitrión: {{ item.hostName }}</strong><span>Te acompaña antes y durante tu estancia.</span></div>
              </div>
              <div class="highlight">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v15H4z" /><path d="M4 9h16" /><path d="M9 3v4" /><path d="M15 3v4" /></svg>
                <div><strong>Cancelación {{ item.cancellationPolicy.name }}</strong><span>{{ cancellationHighlight(item) }}</span></div>
              </div>
              <div class="highlight" *ngIf="item.reviewCount > 0">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
                <div><strong>Muy bien calificado</strong><span>Los huéspedes le dan {{ item.averageRating.toFixed(1) }} de 5 estrellas.</span></div>
              </div>
            </section>

            <section>
              <h2>Acerca de este alojamiento</h2>
              <p class="description">{{ item.description || 'El anfitrión aún no agrega una descripción.' }}</p>
            </section>

            <section>
              <h2>Lo que ofrece este lugar</h2>
              <ul class="amenities" *ngIf="item.amenities.length > 0; else noAmenities">
                <li *ngFor="let amenity of item.amenities">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path *ngFor="let d of amenityIcon(amenity)" [attr.d]="d" /></svg>
                  <span>{{ amenityName(amenity) }}</span>
                </li>
              </ul>
              <ng-template #noAmenities><p class="muted">Sin servicios registrados.</p></ng-template>
            </section>

            <section *ngIf="item.status === 'ACTIVA'">
              <app-availability-calendar [listingId]="item.id" title="Disponibilidad" [monthsPerPage]="2"></app-availability-calendar>
            </section>

            <section class="reviews-section" *ngIf="item.reviewCount > 0 && reviews.length > 0">
              <h2>★ {{ item.averageRating.toFixed(1) }} · {{ item.reviewCount }} {{ item.reviewCount === 1 ? 'reseña' : 'reseñas' }}</h2>
              <div class="reviews">
                <div class="review" *ngFor="let review of reviews">
                  <div class="review-author">
                    <span class="avatar" aria-hidden="true">{{ initials(review.authorName) }}</span>
                    <div>
                      <strong>{{ review.authorName }}</strong>
                      <span>{{ review.date }}</span>
                    </div>
                    <button
                      *ngIf="isAdmin"
                      type="button"
                      class="hide-review-btn"
                      (click)="hideReview(review)"
                    >
                      Ocultar reseña
                    </button>
                  </div>
                  <span class="stars" [attr.aria-label]="review.rating + ' de 5 estrellas'">{{ stars(review.rating) }}</span>
                  <p>{{ review.comment }}</p>
                </div>
              </div>
            </section>
            <section class="reviews-section" *ngIf="item.reviewCount === 0">
              <h2>Reseñas</h2>
              <p class="muted no-reviews">Sin reseñas todavía</p>
            </section>

            <section>
              <h2>Lo que debes saber</h2>
              <div class="know">
                <div>
                  <h3>Reglas de la casa</h3>
                  <ul class="rules" *ngIf="item.rules.length > 0; else noRules">
                    <li *ngFor="let rule of item.rules">{{ rule }}</li>
                  </ul>
                  <ng-template #noRules><p class="muted">Sin reglas registradas.</p></ng-template>
                </div>
                <div>
                  <h3>Política de cancelación · {{ item.cancellationPolicy.name }}</h3>
                  <p>{{ item.cancellationPolicy.description }}</p>
                </div>
                <div>
                  <h3>Servicios adicionales</h3>
                  <ul class="extras" *ngIf="item.additionalServices.length > 0; else noExtras">
                    <li *ngFor="let extra of item.additionalServices">
                      <span>{{ extra.name }}</span>
                      <strong>{{ cop(extra.cost) }} <small>por estancia</small></strong>
                    </li>
                  </ul>
                  <ng-template #noExtras><p class="muted">Este alojamiento no ofrece servicios adicionales.</p></ng-template>
                </div>
              </div>
            </section>
          </div>

          <aside class="booking-card" aria-label="Reservar este alojamiento">
            <div class="price-row">
              <p class="price"><strong>{{ cop(item.pricePerNight) }}</strong> <span>noche</span></p>
              <span class="mini-rating" *ngIf="item.reviewCount > 0">★ {{ item.averageRating.toFixed(1) }}</span>
            </div>
            <app-stay-quote
              *ngIf="item.status === 'ACTIVA' && item.pricePerNight != null; else notBookable"
              [listingId]="item.id"
              [maxGuests]="item.maxGuests"
              [additionalServices]="item.additionalServices"
            ></app-stay-quote>
            <ng-template #notBookable>
              <p class="muted not-bookable">Este alojamiento no recibe reservas por ahora.</p>
            </ng-template>
          </aside>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .detail-shell { max-width: 1120px; margin: 0 auto; padding: 24px 24px 72px; color: #222222; }
    .back-link { display: inline-block; margin-bottom: 16px; font-size: 0.86rem; font-weight: 600; color: #222222; text-decoration: underline; }
    .status-msg, .muted { color: #6a6a6a; }
    .unavailable { text-align: center; padding: 56px 24px; background: #ffffff; border: 1px dashed #d2d2d7; border-radius: 22px; }
    .unavailable h1 { font-size: 1.5rem; margin: 0 0 8px; }
    .unavailable p { color: #6a6a6a; margin: 0 0 20px; }
    .primary-btn { display: inline-block; padding: 12px 20px; border-radius: 10px; background: #222222; color: #ffffff; font-weight: 600; font-size: 0.9rem; text-decoration: none; }
    .alert-error {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 13px 16px;
      border-radius: 12px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; font-weight: 600;
    }
    .retry-btn { padding: 6px 14px; border-radius: 980px; border: 1px solid #fecaca; background: #ffffff; color: #991b1b; font-weight: 600; cursor: pointer; }
    .detail-header h1 { margin: 0 0 8px; font-size: clamp(1.5rem, 3vw, 1.95rem); letter-spacing: -0.02em; line-height: 1.2; }
    .header-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.92rem; }
    .rating { font-weight: 600; }
    .location { color: #222222; text-decoration: underline; text-underline-offset: 2px; }
    .dot { color: #6a6a6a; }
    .pill { padding: 3px 10px; border-radius: 980px; font-size: 0.74rem; font-weight: 600; }
    .pill.warn { background: #fff4e5; color: #9a5b00; margin-left: 6px; }
    .gallery {
      margin: 20px 0 32px; display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 8px;
      height: clamp(260px, 42vw, 460px); border-radius: 18px; overflow: hidden;
    }
    .gallery.single { grid-template-columns: 1fr; }
    .main-frame { position: relative; min-height: 0; }
    .main-image { width: 100%; height: 100%; object-fit: cover; display: block; background: #ebebeb; }
    .photo-count {
      position: absolute; right: 14px; bottom: 14px; padding: 5px 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.92);
      font-size: 0.78rem; font-weight: 600;
    }
    .thumbs { display: grid; grid-template-rows: repeat(2, minmax(0, 1fr)); grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; min-height: 0; }
    .thumbs button { position: relative; padding: 0; border: none; cursor: pointer; background: #ebebeb; min-height: 0; overflow: hidden; }
    .thumbs button img { width: 100%; height: 100%; object-fit: cover; display: block; transition: filter 0.15s ease; }
    .thumbs button:hover img { filter: brightness(0.88); }
    .thumbs button.active { outline: 3px solid #222222; outline-offset: -3px; }
    .thumbs .more {
      position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0, 0, 0, 0.45); color: #ffffff;
      font-weight: 700; font-size: 0.9rem;
    }
    .no-images { margin: 20px 0 32px; padding: 64px; text-align: center; color: #6a6a6a; background: #f7f7f7; border-radius: 18px; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 372px; gap: 64px; align-items: start; }
    .main section { padding: 28px 0; border-bottom: 1px solid #ebebeb; }
    .main section:first-child { padding-top: 0; }
    .main section:last-child { border-bottom: none; }
    .main h2 { margin: 0 0 14px; font-size: 1.3rem; letter-spacing: -0.01em; }
    .overview { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .overview h2 { margin: 0 0 4px; font-size: 1.3rem; }
    .facts { margin: 0; color: #222222; font-size: 0.98rem; }
    .host-avatar, .avatar {
      display: grid; place-items: center; border-radius: 50%; background: #222222; color: #ffffff; font-weight: 700; flex-shrink: 0;
    }
    .host-avatar { width: 56px; height: 56px; font-size: 1.05rem; }
    .highlights { display: flex; flex-direction: column; gap: 22px; }
    .highlight { display: flex; gap: 18px; align-items: flex-start; }
    .highlight div { display: flex; flex-direction: column; gap: 2px; }
    .highlight strong { font-size: 0.98rem; }
    .highlight span { color: #6a6a6a; font-size: 0.9rem; }
    svg { width: 26px; height: 26px; flex-shrink: 0; fill: none; stroke: #222222; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
    .description { margin: 0; line-height: 1.65; font-size: 0.98rem; white-space: pre-line; }
    .amenities { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px; }
    .amenities li { display: flex; align-items: center; gap: 14px; font-size: 0.98rem; }
    .reviews { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 48px; }
    .review { display: flex; flex-direction: column; gap: 8px; }
    .review-author { display: flex; align-items: center; gap: 12px; }
    .review-author div { display: flex; flex-direction: column; }
    .review-author span { color: #6a6a6a; font-size: 0.84rem; }
    .avatar { width: 42px; height: 42px; font-size: 0.86rem; }
    .hide-review-btn { margin-left: auto; padding: 4px 10px; font-size: 0.78rem; font-weight: 600; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; cursor: pointer; }
    .hide-review-btn:hover { background: #fee2e2; }
    .stars { font-size: 0.8rem; letter-spacing: 1px; }
    .review p { margin: 0; line-height: 1.55; }
    .know { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
    .know h3 { margin: 0 0 10px; font-size: 1rem; }
    .know p { margin: 0; line-height: 1.55; font-size: 0.92rem; color: #3f3f3f; }
    .rules { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 0.92rem; }
    .extras { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.92rem; }
    .extras li { display: flex; justify-content: space-between; gap: 10px; }
    .extras small { color: #6a6a6a; font-weight: 400; }
    .booking-card {
      position: sticky; top: 96px; padding: 24px; background: #ffffff; border: 1px solid #dddddd; border-radius: 14px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }
    .price-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 18px; }
    .price { margin: 0; }
    .price strong { font-size: 1.4rem; letter-spacing: -0.01em; }
    .price span { color: #222222; margin-left: 4px; }
    .mini-rating { font-size: 0.86rem; font-weight: 600; }
    .not-bookable { margin: 0; font-size: 0.9rem; }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; gap: 8px; }
      .booking-card { position: static; order: -1; margin-bottom: 8px; }
      .know { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .detail-shell { padding: 16px 16px 56px; }
      .gallery { grid-template-columns: 1fr; height: auto; }
      .main-image { aspect-ratio: 4 / 3; height: auto; }
      .thumbs { grid-template-rows: none; grid-auto-flow: column; grid-auto-columns: 84px; height: 64px; overflow-x: auto; }
      .amenities, .reviews { grid-template-columns: 1fr; }
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

  amenityIcon(code: string): string[] {
    return amenityIconPaths(code);
  }

  initials(name: string): string {
    return initialsOf(name);
  }

  /** "Apartamento en Bogotá" (o solo el tipo o la ciudad si falta el otro dato). */
  headline(item: ListingDetail): string {
    const type = item.propertyTypeLabel || 'Alojamiento';
    return item.location.city ? `${type} en ${item.location.city}` : type;
  }

  /** "2 huéspedes · 1 habitación · 1 baño". */
  facts(item: ListingDetail): string {
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    return [
      item.maxGuests ? plural(item.maxGuests, 'huésped', 'huéspedes') : 'Capacidad por definir',
      item.bedrooms != null ? plural(item.bedrooms, 'habitación', 'habitaciones') : '',
      item.bathrooms != null ? plural(item.bathrooms, 'baño', 'baños') : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  /** Resumen corto de la política: "Reembolso total si cancelas hasta 48 h antes de la llegada." */
  cancellationHighlight(item: ListingDetail): string {
    const full = item.cancellationPolicy.rules.find((rule) => rule.refundPercentage === 100 && rule.minHoursBeforeCheckIn > 0);
    return full
      ? `Reembolso total si cancelas hasta ${full.minHoursBeforeCheckIn} h antes de la llegada.`
      : 'Revisa las condiciones de devolución antes de reservar.';
  }

  stars(rating: number): string {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
  }

  nextImage(item: ListingDetail): void {
    this.selectedImage = (this.selectedImage + 1) % item.images.length;
  }

  cop(value?: number | null): string {
    return formatCop(value);
  }

  get isAdmin(): boolean {
    return getActiveSession()?.role === 'ADMINISTRADOR';
  }

  async hideReview(review: DetailReview): Promise<void> {
    const reason = window.prompt('Indica el motivo por el cual se oculta la reseña:');
    if (!reason || !reason.trim()) {
      return;
    }
    const token = getActiveSession()?.token;
    if (!token) return;

    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(review.id)}/hide`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert(error.message || 'No fue posible ocultar la reseña.');
        return;
      }

      await this.load();
    } catch {
      alert('Error de conexión al ocultar la reseña.');
    }
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
      // HU-048 CA1: reseñas de la más reciente a la más antigua
      const list = (body.reviews ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.reviews = list.map((review) => ({
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
