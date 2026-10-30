import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { clearActiveSession, getActiveSession } from '../../core/guards/auth.guard';
import { REACTIVATED_HOST_MESSAGE } from '../../shared/models/account-deactivation.model';

describe('LoginComponent · HU-009 Reactivar mi cuenta', () => {
  let component: LoginComponent;
  let router: jasmine.SpyObj<Router>;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const offer = {
    statusCode: 403,
    reason: 'CUENTA_DESACTIVADA',
    message: 'Tu cuenta está desactivada. ¿Quieres reactivarla? Tu historial se conserva.',
    reactivationToken: 'token-reactivacion',
    reactivationExpiresInMinutes: 10,
  };
  const reactivated = (role: string) => ({
    message: 'Tu cuenta se reactivó.',
    token: 'jwt-nuevo',
    expiresInMinutes: 60,
    user: { email: 'ana@prueba.com', name: 'Ana', role, status: 'ACTIVA' },
  });

  const loginWithDeactivatedAccount = async () => {
    component.email = 'ana@prueba.com';
    component.password = 'Password123';
    await component.onSubmit();
  };

  beforeEach(() => {
    clearActiveSession();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    component = new LoginComponent(router);
  });

  afterEach(() => clearActiveSession());

  it('CA1: con credenciales correctas ofrece reactivar la cuenta sin abrir sesión', async () => {
    spyOn(window, 'fetch').and.returnValue(json(offer, 403));

    await loginWithDeactivatedAccount();

    expect(component.deactivatedNotice).toContain('¿Quieres reactivarla?');
    expect(component.reactivationToken).toBe('token-reactivacion');
    expect(component.restrictedError).toBe('');
    expect(getActiveSession()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('CA2: al confirmar envía el token, abre la sesión y lleva al huésped a su perfil', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValues(json(offer, 403), json(reactivated('HUESPED')));
    await loginWithDeactivatedAccount();

    await component.reactivateAccount();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/reactivate',
      jasmine.objectContaining({ method: 'POST', body: JSON.stringify({ reactivationToken: 'token-reactivacion' }) }),
    );
    expect(getActiveSession()).toEqual(jasmine.objectContaining({ token: 'jwt-nuevo', role: 'HUESPED' }));
    expect(router.navigate).toHaveBeenCalledWith(['/mi-perfil'], { state: { accountReactivated: true } });
    expect(component.deactivatedNotice).toBe('');
  });

  it('CA2: el anfitrión llega a Mis publicaciones, donde siguen pausadas', async () => {
    spyOn(window, 'fetch').and.returnValues(json(offer, 403), json(reactivated('ANFITRION')));
    await loginWithDeactivatedAccount();

    await component.reactivateAccount();

    expect(router.navigate).toHaveBeenCalledWith(['/anfitrion/mis-publicaciones'], { state: { accountReactivated: true } });
    expect(REACTIVATED_HOST_MESSAGE).toContain('Tus publicaciones siguen pausadas');
  });

  it('«Ahora no» descarta la oferta y la cuenta sigue desactivada', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(offer, 403));
    await loginWithDeactivatedAccount();

    component.declineReactivation();

    expect(component.reactivationToken).toBe('');
    expect(component.deactivatedNotice).toContain('Tu cuenta sigue desactivada');
    expect(fetchSpy.calls.count()).toBe(1);
  });

  it('si el token venció muestra el motivo y pide iniciar sesión de nuevo', async () => {
    spyOn(window, 'fetch').and.returnValues(
      json(offer, 403),
      json({ message: 'La solicitud de reactivación venció o no es válida. Inicia sesión de nuevo.' }, 400),
    );
    await loginWithDeactivatedAccount();

    await component.reactivateAccount();

    expect(component.deactivatedNotice).toContain('Inicia sesión de nuevo');
    expect(component.reactivationToken).toBe('');
    expect(getActiveSession()).toBeNull();
  });
});
