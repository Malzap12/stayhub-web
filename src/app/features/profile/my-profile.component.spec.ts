import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyProfileComponent } from './my-profile.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';
import { UserProfile } from '../../shared/models/user.model';

describe('MyProfileComponent · HU-006', () => {
  let fixture: ComponentFixture<MyProfileComponent>;
  let element: HTMLElement;

  const profile: UserProfile = {
    id: 'user-7',
    name: 'Laura Gómez',
    email: 'laura@stayhub.com',
    phone: '+57 300 123 4567',
    role: 'ANFITRION',
    status: 'ACTIVA',
    createdAt: '2026-10-20T10:00:00.000Z',
  };

  const respondWith = (status: number, body: unknown) =>
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify(body), { status }));

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  };

  const detail = (label: string) =>
    Array.from(element.querySelectorAll('.details div'))
      .find((row) => row.querySelector('dt')?.textContent?.trim() === label)
      ?.querySelector('dd')
      ?.textContent?.trim();

  beforeEach(async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'jwt-user-7',
        email: profile.email,
        name: profile.name,
        role: profile.role,
        expiresAt: Date.now() + 60_000,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [MyProfileComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyProfileComponent);
  });

  afterEach(() => localStorage.removeItem(SESSION_STORAGE_KEY));

  it('CA1: muestra nombre, correo, teléfono, rol y estado de la cuenta', async () => {
    respondWith(200, profile);
    await render();

    expect(detail('Nombre')).toBe('Laura Gómez');
    expect(detail('Correo electrónico')).toBe('laura@stayhub.com');
    expect(detail('Teléfono')).toBe('+57 300 123 4567');
    expect(detail('Rol')).toBe('Anfitrión');
    expect(detail('Estado de la cuenta')).toBe('Activa');
  });

  it('CA1: indica cuando el teléfono no está registrado', async () => {
    respondWith(200, { ...profile, phone: null });
    await render();

    expect(detail('Teléfono')).toBe('No registrado');
  });

  it('CA2: consulta solo el perfil propio con el token de la sesión', async () => {
    const fetchSpy = respondWith(200, profile);
    await render();

    const [url, init] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/users/me');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-user-7');
  });

  it('pide iniciar sesión de nuevo si la sesión expiró', async () => {
    respondWith(401, { message: 'Debes iniciar sesión' });
    await render();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Tu sesión expiró');
    expect(element.querySelector('.profile-card')).toBeNull();
  });

  it('muestra un error con opción de reintentar si el servidor no responde', async () => {
    spyOn(window, 'fetch').and.rejectWith(new Error('offline'));
    await render();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('No fue posible conectar');
    expect(element.querySelector('.retry-btn')).not.toBeNull();
  });
});
