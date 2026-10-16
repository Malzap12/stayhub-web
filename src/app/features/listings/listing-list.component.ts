import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface PublicReviewItem {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface PublicListingItem {
  id: string;
  title: string;
  city: string;
  priceCop: string;
  rating: number;
  description: string;
  reviews: PublicReviewItem[];
}

@Component({
  selector: 'app-listing-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="cupertino-catalog">
      <div class="catalog-hero">
        <span class="apple-badge">Acceso Público · Exploración sin registro</span>
        <h1>Descubre alojamientos verificados en Colombia</h1>
        <p>
          Como visitante puedes explorar la búsqueda, abrir el detalle de cualquier
          publicación y leer las reseñas verificadas sin iniciar sesión.
        </p>
      </div>

      <!-- CA3: Búsqueda pública de alojamientos -->
      <div class="listing-grid">
        <article class="listing-card" *ngFor="let item of listings">
          <div class="listing-card-header">
            <span class="city-pill">{{ item.city }}</span>
            <span class="rating-pill">★ {{ item.rating }}</span>
          </div>
          <h2>{{ item.title }}</h2>
          <p class="listing-desc">{{ item.description }}</p>
          <div class="listing-footer">
            <strong class="price-cop">{{ item.priceCop }} <span>COP / noche</span></strong>
            <button
              type="button"
              class="apple-secondary-btn"
              (click)="selectListing(item)"
            >
              Ver detalle y reseñas ({{ item.reviews.length }})
            </button>
          </div>
        </article>
      </div>

      <!-- CA3: Detalle de publicación y sus reseñas visibles sin iniciar sesión -->
      <div class="detail-panel" *ngIf="selectedListing as detail">
        <div class="detail-header">
          <div>
            <span class="city-pill">{{ detail.city }}</span>
            <h3>{{ detail.title }}</h3>
          </div>
          <button type="button" class="close-btn" (click)="selectedListing = null">
            Cerrar
          </button>
        </div>
        <p class="detail-body">{{ detail.description }}</p>

        <div class="reviews-section">
          <h4>Reseñas de huéspedes ({{ detail.reviews.length }})</h4>
          <div class="review-item" *ngFor="let rev of detail.reviews">
            <div class="review-meta">
              <strong>{{ rev.authorName }}</strong>
              <span>★ {{ rev.rating }} · {{ rev.date }}</span>
            </div>
            <p>{{ rev.comment }}</p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .cupertino-catalog {
      max-width: 980px;
      margin: 0 auto;
      padding: 28px 16px 64px;
    }
    .catalog-hero {
      text-align: center;
      margin-bottom: 32px;
    }
    .apple-badge {
      display: inline-block;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 5px 14px;
      border-radius: 980px;
      margin-bottom: 12px;
    }
    .catalog-hero h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #1d1d1f;
      margin-bottom: 8px;
    }
    .catalog-hero p {
      color: #6e6e73;
      max-width: 600px;
      margin: 0 auto;
      font-size: 0.95rem;
    }
    .listing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: 20px;
    }
    .listing-card {
      background: #ffffff;
      border-radius: 24px;
      padding: 24px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .listing-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .city-pill {
      background: #f5f5f7;
      color: #1d1d1f;
      padding: 4px 10px;
      border-radius: 980px;
    }
    .rating-pill {
      color: #1d1d1f;
    }
    .listing-card h2 {
      font-size: 1.15rem;
      color: #1d1d1f;
      margin: 0;
    }
    .listing-desc {
      color: #6e6e73;
      font-size: 0.875rem;
      margin: 0;
      flex: 1;
    }
    .listing-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid #f5f5f7;
    }
    .price-cop {
      color: #1d1d1f;
      font-size: 0.95rem;
    }
    .price-cop span {
      color: #6e6e73;
      font-weight: 400;
      font-size: 0.78rem;
    }
    .apple-secondary-btn, .close-btn {
      background: #1d1d1f;
      color: #ffffff;
      border: none;
      padding: 8px 15px;
      border-radius: 980px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }
    .detail-panel {
      margin-top: 28px;
      background: #ffffff;
      border-radius: 24px;
      padding: 26px;
      border: 1px solid rgba(29, 29, 31, 0.14);
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.05);
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .detail-header h3 {
      margin: 6px 0;
      color: #1d1d1f;
    }
    .detail-body {
      color: #6e6e73;
      font-size: 0.9rem;
    }
    .reviews-section {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #d2d2d7;
    }
    .review-item {
      background: #f5f5f7;
      border-radius: 12px;
      padding: 12px 14px;
      margin-top: 10px;
    }
    .review-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #1d1d1f;
      margin-bottom: 4px;
    }
    .review-item p {
      margin: 0;
      font-size: 0.84rem;
      color: #6e6e73;
    }
  `],
})
export class ListingListComponent {
  listings: PublicListingItem[] = [
    {
      id: 'listing-1',
      title: 'Loft Minimalista en El Poblado',
      city: 'Medellín',
      priceCop: '$320.000',
      rating: 4.9,
      description: 'Espacio luminoso con terraza privada, fibra óptica y cocina equipada.',
      reviews: [
        {
          id: 'rev-1',
          authorName: 'Camila Gómez',
          rating: 5,
          comment: 'Excelente ubicación, impecable y atención inmediata del anfitrión.',
          date: 'Oct 2026',
        },
      ],
    },
    {
      id: 'listing-2',
      title: 'Villa Frente al Mar en Barú',
      city: 'Cartagena',
      priceCop: '$580.000',
      rating: 4.8,
      description: 'Acceso directo a la playa, piscina infinita y desayuno incluido.',
      reviews: [
        {
          id: 'rev-2',
          authorName: 'Andrés Mejía',
          rating: 4.8,
          comment: 'Muy cómodo, tranquilo y fiel a las fotografías publicadas.',
          date: 'Oct 2026',
        },
      ],
    },
  ];

  selectedListing: PublicListingItem | null = this.listings[0];

  selectListing(item: PublicListingItem): void {
    this.selectedListing = item;
  }
}

