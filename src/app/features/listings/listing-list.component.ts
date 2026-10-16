import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  category: string;
  priceCop: string;
  rating: number;
  guests: number;
  bedrooms: number;
  imageUrl: string;
  hostName: string;
  description: string;
  reviews: PublicReviewItem[];
}

@Component({
  selector: 'app-listing-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

        <!-- Barra de búsqueda y filtros monocromáticos -->
        <div class="filter-bar">
          <div class="category-pills" role="tablist" aria-label="Categorías de alojamiento">
            <button
              *ngFor="let cat of categories"
              type="button"
              class="cat-pill"
              [class.active]="selectedCategory === cat"
              (click)="setCategory(cat)"
            >
              {{ cat }}
            </button>
          </div>

          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="20" y1="20" x2="16.2" y2="16.2"></line>
            </svg>
            <input
              type="search"
              placeholder="Buscar por ciudad o nombre..."
              [(ngModel)]="searchTerm"
              aria-label="Buscar alojamientos"
            />
          </div>
        </div>
      </header>

      <!-- CA3: Catálogo público con fotografía arquitectónica minimalista -->
      <div class="listing-grid">
        <article
          class="listing-card"
          *ngFor="let item of filteredListings"
          [class.selected]="selectedListing?.id === item.id"
          (click)="selectListing(item)"
        >
          <div class="card-media">
            <img
              [src]="item.imageUrl"
              [alt]="item.title + ' - ' + item.city"
              loading="lazy"
            />
            <span class="media-badge">{{ item.category }}</span>
            <span class="media-rating">★ {{ item.rating.toFixed(2) }}</span>
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
                <span>COP / noche</span>
              </div>
              <button
                type="button"
                class="apple-secondary-btn"
                (click)="selectListing(item); $event.stopPropagation()"
              >
                Detalle y reseñas ({{ item.reviews.length }})
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- CA3: Panel de detalle y reseñas públicas sin iniciar sesión -->
      <section class="detail-panel" *ngIf="selectedListing as detail" aria-live="polite">
        <div class="detail-grid">
          <div class="detail-Visual">
            <img [src]="detail.imageUrl" [alt]="detail.title" />
          </div>

          <div class="detail-content">
            <div class="detail-header">
              <div>
                <div class="detail-pills">
                  <span class="city-pill">{{ detail.city }}</span>
                  <span class="meta-pill">{{ detail.category }}</span>
                  <span class="meta-pill">Anfitrión: {{ detail.hostName }}</span>
                </div>
                <h3>{{ detail.title }}</h3>
              </div>
              <button type="button" class="close-btn" (click)="selectedListing = null">
                Cerrar
              </button>
            </div>

            <p class="detail-body">{{ detail.description }}</p>

            <div class="detail-specs">
              <div>
                <span>Capacidad</span>
                <strong>{{ detail.guests }} huéspedes</strong>
              </div>
              <div>
                <span>Habitaciones</span>
                <strong>{{ detail.bedrooms }} suites</strong>
              </div>
              <div>
                <span>Tarifa base</span>
                <strong>{{ detail.priceCop }} COP / noche</strong>
              </div>
              <div>
                <span>Calificación</span>
                <strong>★ {{ detail.rating.toFixed(2) }}</strong>
              </div>
            </div>

            <div class="reviews-section">
              <h4>Reseñas verificadas ({{ detail.reviews.length }})</h4>
              <div class="reviews-list">
                <div class="review-item" *ngFor="let rev of detail.reviews">
                  <div class="review-meta">
                    <strong>{{ rev.authorName }}</strong>
                    <span>★ {{ rev.rating.toFixed(1) }} · {{ rev.date }}</span>
                  </div>
                  <p>{{ rev.comment }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
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
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      padding-top: 20px;
      border-top: 1px solid #e5e5ea;
    }
    .category-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .cat-pill {
      background: #ffffff;
      color: #6e6e73;
      border: 1px solid #d2d2d7;
      padding: 8px 16px;
      border-radius: 980px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .cat-pill:hover {
      color: #1d1d1f;
      border-color: #86868b;
    }
    .cat-pill.active {
      background: #1d1d1f;
      color: #ffffff;
      border-color: #1d1d1f;
    }
    .search-box {
      position: relative;
      min-width: 260px;
      flex: 0 1 320px;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 15px;
      height: 15px;
      color: #86868b;
      pointer-events: none;
    }
    .search-box input {
      width: 100%;
      height: 38px;
      padding: 0 14px 0 38px;
      border-radius: 980px;
      border: 1px solid #d2d2d7;
      background: #ffffff;
      color: #1d1d1f;
      font-size: 0.84rem;
      transition: border-color 0.16s ease;
    }
    .search-box input:focus {
      outline: none;
      border-color: #1d1d1f;
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
    .apple-secondary-btn,
    .close-btn {
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
    .apple-secondary-btn:hover,
    .close-btn:hover {
      background: #000000;
    }
    .detail-panel {
      margin-top: 40px;
      background: #ffffff;
      border-radius: 26px;
      overflow: hidden;
      border: 1px solid rgba(29, 29, 31, 0.12);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.06);
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 5fr 7fr;
    }
    @media (max-width: 860px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
    .detail-Visual {
      background: #e5e5ea;
      min-height: 320px;
    }
    .detail-Visual img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .detail-content {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .detail-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .city-pill {
      background: #1d1d1f;
      color: #ffffff;
      padding: 4px 11px;
      border-radius: 980px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .meta-pill {
      background: #f5f5f7;
      color: #6e6e73;
      padding: 4px 11px;
      border-radius: 980px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .detail-header h3 {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: #1d1d1f;
    }
    .detail-body {
      color: #6e6e73;
      font-size: 0.92rem;
      line-height: 1.6;
      margin: 0;
    }
    .detail-specs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      padding: 16px;
      background: #f5f5f7;
      border-radius: 16px;
    }
    .detail-specs div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-specs span {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #86868b;
    }
    .detail-specs strong {
      font-size: 0.88rem;
      color: #1d1d1f;
    }
    .reviews-section {
      padding-top: 8px;
      border-top: 1px solid #e5e5ea;
    }
    .reviews-section h4 {
      margin: 0 0 12px;
      font-size: 0.88rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1d1d1f;
    }
    .reviews-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .review-item {
      background: #f5f5f7;
      border-radius: 14px;
      padding: 14px 16px;
    }
    .review-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: #1d1d1f;
      margin-bottom: 6px;
    }
    .review-item p {
      margin: 0;
      font-size: 0.83rem;
      line-height: 1.45;
      color: #6e6e73;
    }
  `],
})
export class ListingListComponent {
  categories: string[] = ['Todos', 'Arquitectura', 'Frente al mar', 'Montaña', 'Penthouse'];
  selectedCategory = 'Todos';
  searchTerm = '';

  listings: PublicListingItem[] = [
    {
      id: 'listing-1',
      title: 'Loft Minimalista en El Poblado',
      city: 'Medellín',
      category: 'Penthouse',
      priceCop: '$320.000',
      rating: 4.95,
      guests: 4,
      bedrooms: 2,
      hostName: 'Laura Restrepo',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
      description: 'Espacio de concreto a la vista y roble natural con terraza privada, fibra óptica dedicada y cocina de autor.',
      reviews: [
        {
          id: 'rev-1',
          authorName: 'Camila Gómez',
          rating: 5,
          comment: 'Excelente ubicación, iluminación natural impecable y atención inmediata del anfitrión.',
          date: 'Oct 2026',
        },
        {
          id: 'rev-1b',
          authorName: 'Daniel Ochoa',
          rating: 4.9,
          comment: 'El diseño interior parece sacado de una galería. Silencioso y perfecto para trabajar.',
          date: 'Sep 2026',
        },
      ],
    },
    {
      id: 'listing-2',
      title: 'Villa Brutalista Frente al Mar en Barú',
      city: 'Cartagena',
      category: 'Frente al mar',
      priceCop: '$580.000',
      rating: 4.92,
      guests: 6,
      bedrooms: 3,
      hostName: 'Andrés Salgado',
      imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
      description: 'Volúmenes limpios en piedra coralina con acceso privado a la cala, piscina infinita y ventilación cruzada.',
      reviews: [
        {
          id: 'rev-2',
          authorName: 'Andrés Mejía',
          rating: 4.9,
          comment: 'Muy cómodo, tranquilo y fiel a las fotografías publicadas. La vista al atardecer es única.',
          date: 'Oct 2026',
        },
      ],
    },
    {
      id: 'listing-3',
      title: 'Casa de Cristal en el Alto de Las Palmas',
      city: 'Envigado',
      category: 'Arquitectura',
      priceCop: '$460.000',
      rating: 4.98,
      guests: 4,
      bedrooms: 2,
      hostName: 'Mateo Uribe',
      imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
      description: 'Pabellón elevado rodeado de bosque nativo con chimenea minimalista, ventanales de piso a techo y deck privado.',
      reviews: [
        {
          id: 'rev-3',
          authorName: 'Valeria Soto',
          rating: 5,
          comment: 'Despertar entre la niebla del bosque con esa arquitectura limpia fue inolvidable.',
          date: 'Oct 2026',
        },
      ],
    },
    {
      id: 'listing-4',
      title: 'Refugio Monolítico en el Valle de Cocora',
      city: 'Salento',
      category: 'Montaña',
      priceCop: '$390.000',
      rating: 4.91,
      guests: 2,
      bedrooms: 1,
      hostName: 'Nicolás Jaramillo',
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
      description: 'Cabaña de autor en madera carbonizada y acero negro con vista panorámica a la cordillera central.',
      reviews: [
        {
          id: 'rev-4',
          authorName: 'Santiago Ríos',
          rating: 4.9,
          comment: 'Minimalismo puro en medio de las montañas. Café de origen incluido cada mañana.',
          date: 'Sep 2026',
        },
      ],
    },
    {
      id: 'listing-5',
      title: 'Ático Editorial en Rosales',
      city: 'Bogotá',
      category: 'Penthouse',
      priceCop: '$410.000',
      rating: 4.89,
      guests: 3,
      bedrooms: 2,
      hostName: 'Catalina Pardo',
      imageUrl: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1000&q=80',
      description: 'Apartamento de líneas puras junto a los cerros orientales, acústica aislada y terraza contemplativa.',
      reviews: [
        {
          id: 'rev-5',
          authorName: 'Felipe Morales',
          rating: 4.9,
          comment: 'Impecable atención al detalle y cercanía a los mejores restaurantes de la zona.',
          date: 'Oct 2026',
        },
      ],
    },
    {
      id: 'listing-6',
      title: 'Casa Patio de Tierra Apisonada',
      city: 'Villa de Leyva',
      category: 'Arquitectura',
      priceCop: '$350.000',
      rating: 4.96,
      guests: 5,
      bedrooms: 3,
      hostName: 'Elena Vargas',
      imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80',
      description: 'Arquitectura contemporánea en tapia pisada y piedra local con patio interior silencioso y espejo de agua.',
      reviews: [
        {
          id: 'rev-6',
          authorName: 'Mariana Duarte',
          rating: 5,
          comment: 'La luz que entra al patio central durante la tarde es espectacular. Totalmente recomendado.',
          date: 'Oct 2026',
        },
      ],
    },
  ];

  selectedListing: PublicListingItem | null = this.listings[0];

  get filteredListings(): PublicListingItem[] {
    return this.listings.filter((item) => {
      const matchesCat =
        this.selectedCategory === 'Todos' || item.category === this.selectedCategory;
      const query = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);
      return matchesCat && matchesSearch;
    });
  }

  setCategory(category: string): void {
    this.selectedCategory = category;
  }

  selectListing(item: PublicListingItem): void {
    this.selectedListing = item;
  }
}


