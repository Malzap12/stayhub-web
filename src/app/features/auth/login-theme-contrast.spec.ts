import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { clearActiveSession } from '../../core/guards/auth.guard';

/**
 * HU-073 · Regresión de contraste en «Acceder a tu cuenta».
 * En modo oscuro los títulos de las tarjetas de rol (Huésped, Anfitrión, Admin) quedaban
 * con color #1d1d1f sobre un fondo #1c1c1e (contraste 1.01:1). Ahora salen de los tokens
 * de tema de src/styles.css y deben cumplir WCAG AA (4.5:1) en ambos modos.
 */
type Rgba = { r: number; g: number; b: number; a: number };

function parse(color: string): Rgba {
  const parts = (color.match(/rgba?\(([^)]+)\)/)?.[1] ?? '0,0,0,0')
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

function over(top: Rgba, bottom: Rgba): Rgba {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  };
}

function luminance(c: Rgba): number {
  const [r, g, b] = [c.r, c.g, c.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgba, b: Rgba): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Fondo efectivo: compone los fondos de los ancestros hasta llegar a uno opaco. */
function effectiveBackground(el: Element): Rgba {
  const layers: Rgba[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    const bg = parse(getComputedStyle(node).backgroundColor);
    if (bg.a > 0) {
      layers.push(bg);
      if (bg.a >= 1) break;
    }
  }
  let acc = parse(getComputedStyle(document.documentElement).backgroundColor);
  if (acc.a < 1) acc = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
  return acc;
}

function textContrast(el: Element): number {
  const bg = effectiveBackground(el);
  return contrast(over(parse(getComputedStyle(el).color), bg), bg);
}

describe('LoginComponent · contraste por tema (HU-073)', () => {
  beforeEach(async () => {
    clearActiveSession();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  for (const theme of ['light', 'dark']) {
    it(`los títulos, descripciones y etiquetas de acceso cumplen WCAG AA en modo ${theme}`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      const fixture = TestBed.createComponent(LoginComponent);
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;

      const titles = Array.from(root.querySelectorAll('.role-card h2'));
      expect(titles.map((t) => t.textContent?.trim())).toEqual(['Huésped', 'Anfitrión', 'Admin']);

      const checked = [
        ...titles,
        ...Array.from(root.querySelectorAll('.role-card p')),
        ...Array.from(root.querySelectorAll('.seg-item, .section-label, .apple-label, .apple-btn-primary span')),
      ];
      for (const el of checked) {
        const ratio = textContrast(el);
        expect(ratio)
          .withContext(`${theme} · «${el.textContent?.trim()}» contraste ${ratio.toFixed(2)}`)
          .toBeGreaterThanOrEqual(4.5);
      }
      fixture.nativeElement.remove();
    });
  }

  it('la tarjeta de rol seleccionada se distingue y expone aria-pressed', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const cards: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.role-card'));
    cards[1].click();
    fixture.detectChanges();
    expect(cards[1].classList).toContain('selected');
    expect(cards[1].getAttribute('aria-pressed')).toBe('true');
    expect(cards[0].getAttribute('aria-pressed')).toBe('false');
  });
});
