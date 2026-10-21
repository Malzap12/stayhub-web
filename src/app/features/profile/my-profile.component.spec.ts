import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyProfileComponent } from './my-profile.component';
import { getActiveSession, SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';
import { UserProfile } from '../../shared/models/user.model';

describe('MyProfileComponent · HU-006 y HU-007', () => {
  let fixture: ComponentFixture<MyProfileComponent>;
  let component: MyProfileComponent;
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

  const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  const respondWith = (status: number, body: unknown) => spyOn(window, 'fetch').and.resolveTo(response(status, body));

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  };

  const input = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`)!;

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
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.removeItem(SESSION_STORAGE_KEY));

  describe('HU-006 · Consultar mi perfil', () => {
    it('CA1: muestra nombre, correo, teléfono, rol y estado de la cuenta', async () => {
      respondWith(200, profile);
      await render();

      expect(input('profile-name').value).toBe('Laura Gómez');
      expect(input('profile-email').value).toBe('laura@stayhub.com');
      expect(input('profile-phone').value).toBe('+57 300 123 4567');
      expect(input('profile-role').value).toBe('Anfitrión');
      expect(element.querySelector('.status-badge')?.textContent?.trim()).toBe('Activa');
    });

    it('CA1: el teléfono queda vacío cuando no está registrado', async () => {
      respondWith(200, { ...profile, phone: null });
      await render();

      expect(input('profile-phone').value).toBe('');
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

  describe('HU-007 · Actualizar mi perfil', () => {
    it('CA1: guarda nombre y teléfono, los muestra y actualiza el nombre de la sesión', async () => {
      const updated = { ...profile, name: 'Laura Gómez Ruiz', phone: null };
      const fetchSpy = spyOn(window, 'fetch').and.returnValues(
        Promise.resolve(response(200, profile)),
        Promise.resolve(response(200, updated)),
      );
      await render();

      component.form = { name: ' Laura Gómez Ruiz ', phone: '' };
      await component.saveProfile();

      const [url, init] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('/api/users/me');
      expect(init?.method).toBe('PATCH');
      expect(JSON.parse(init?.body as string)).toEqual({ name: 'Laura Gómez Ruiz', phone: null });
      expect(component.profile?.name).toBe('Laura Gómez Ruiz');
      expect(component.profileMessage).toContain('se actualizaron');
      expect(getActiveSession()?.name).toBe('Laura Gómez Ruiz');
    });

    it('CA1: no permite guardar sin cambios, con nombre vacío o teléfono inválido', async () => {
      respondWith(200, profile);
      await render();

      expect(component.canSaveProfile).toBeFalse();

      component.form = { name: '   ', phone: profile.phone! };
      expect(component.nameError).toContain('no puede quedar vacío');
      expect(component.canSaveProfile).toBeFalse();

      component.form = { name: profile.name, phone: 'abc123' };
      expect(component.phoneError).toContain('teléfono válido');
      expect(component.canSaveProfile).toBeFalse();
    });

    it('CA1: muestra el mensaje del servidor si no se pudo guardar', async () => {
      spyOn(window, 'fetch').and.returnValues(
        Promise.resolve(response(200, profile)),
        Promise.resolve(response(400, { message: ['El nombre completo no puede quedar vacío'] })),
      );
      await render();

      component.form = { name: 'Otro nombre', phone: '' };
      await component.saveProfile();

      expect(component.profileFailed).toBeTrue();
      expect(component.profileMessage).toBe('El nombre completo no puede quedar vacío');
    });

    it('CA2: cambia la contraseña enviando la actual y la nueva', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.returnValues(
        Promise.resolve(response(200, profile)),
        Promise.resolve(response(200, { message: 'Contraseña actualizada correctamente' })),
      );
      await render();

      component.passwordForm = { currentPassword: 'Password123', newPassword: 'NuevaClave2026', confirmPassword: 'NuevaClave2026' };
      await component.changePassword();

      const [url, init] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('/api/users/me/password');
      expect(JSON.parse(init?.body as string)).toEqual({ currentPassword: 'Password123', newPassword: 'NuevaClave2026' });
      expect(component.passwordFailed).toBeFalse();
      expect(component.passwordForm.currentPassword).toBe('');
    });

    it('CA2: valida la política y la confirmación antes de enviar', async () => {
      respondWith(200, profile);
      await render();

      component.passwordForm = { currentPassword: 'Password123', newPassword: 'corta', confirmPassword: 'corta' };
      expect(component.newPasswordError).toContain('al menos 8 caracteres');
      expect(component.canChangePassword).toBeFalse();

      component.passwordForm = { currentPassword: 'Password123', newPassword: 'NuevaClave2026', confirmPassword: 'Otra2026' };
      expect(component.confirmPasswordError).toBe('Las contraseñas no coinciden.');
      expect(component.canChangePassword).toBeFalse();
    });

    it('CA2: informa si la contraseña actual es incorrecta', async () => {
      spyOn(window, 'fetch').and.returnValues(
        Promise.resolve(response(200, profile)),
        Promise.resolve(response(400, { message: 'La contraseña actual no es correcta' })),
      );
      await render();

      component.passwordForm = { currentPassword: 'Mala12345', newPassword: 'NuevaClave2026', confirmPassword: 'NuevaClave2026' };
      await component.changePassword();

      expect(component.passwordFailed).toBeTrue();
      expect(component.passwordMessage).toBe('La contraseña actual no es correcta');
    });

    it('CA3: el correo y el rol no se pueden editar', async () => {
      respondWith(200, profile);
      await render();

      expect(input('profile-email').disabled).toBeTrue();
      expect(input('profile-role').disabled).toBeTrue();
      expect(input('profile-name').disabled).toBeFalse();
      expect(element.textContent).toContain('El correo y el rol no se pueden editar.');
    });
  });
});
