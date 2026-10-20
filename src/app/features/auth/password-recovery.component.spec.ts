import { PasswordRecoveryComponent, SimulatedMail } from './password-recovery.component';

describe('PasswordRecoveryComponent (HU-004 · Recuperar la contraseña simulado)', () => {
  let component: PasswordRecoveryComponent;
  let fetchSpy: jasmine.Spy;

  const mail: SimulatedMail = {
    id: 'mail-1',
    to: 'olvido@stayhub.com',
    subject: 'Recupera tu contraseña · Inversiones LR',
    body: 'Usa este enlace de un solo uso.',
    token: 'token-123',
    expiresAt: '2026-10-20T04:00:00.000Z',
    sentAt: '2026-10-20T03:30:00.000Z',
  };

  const jsonResponse = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

  beforeEach(() => {
    component = new PasswordRecoveryComponent();
    fetchSpy = spyOn(window, 'fetch');
  });

  it('CA1: solicita el enlace y muestra el buzón simulado con el token', async () => {
    fetchSpy.and.callFake((url: string) =>
      url.includes('/mailbox')
        ? jsonResponse([mail])
        : jsonResponse({ message: PasswordRecoveryComponent.CONFIRMATION_MESSAGE }),
    );
    component.email = ' OLVIDO@stayhub.com ';

    await component.requestRecovery();

    expect(fetchSpy.calls.argsFor(0)[0]).toBe('/api/auth/password-recovery');
    expect(component.email).toBe('olvido@stayhub.com');
    expect(component.step).toBe('mailbox');
    expect(component.mailbox).toEqual([mail]);
  });

  it('CA4: muestra la misma confirmación aunque el correo no exista', async () => {
    fetchSpy.and.callFake((url: string) =>
      url.includes('/mailbox')
        ? jsonResponse([])
        : jsonResponse({ message: PasswordRecoveryComponent.CONFIRMATION_MESSAGE }),
    );
    component.email = 'nadie@stayhub.com';

    await component.requestRecovery();

    expect(component.confirmationMessage).toBe(PasswordRecoveryComponent.CONFIRMATION_MESSAGE);
    expect(component.mailbox).toEqual([]);
  });

  it('valida el correo antes de solicitar', async () => {
    component.email = 'correo-invalido';
    await component.requestRecovery();
    expect(component.emailError).toContain('formato válido');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('valida el formato del correo sin expresiones con backtracking', () => {
    expect(PasswordRecoveryComponent.isValidEmail('olvido@stayhub.com')).toBeTrue();
    ['', 'sin-arroba', 'a@b', 'a@@b.com', '@stayhub.com', 'a@.com', 'a@stayhub.', 'a b@stayhub.com'].forEach(
      (email) => expect(PasswordRecoveryComponent.isValidEmail(email)).withContext(email).toBeFalse(),
    );
  });

  it('CA2: define la nueva contraseña con un token válido', async () => {
    fetchSpy.and.returnValue(jsonResponse({ message: 'Tu contraseña fue actualizada.' }));
    component.useToken(mail.token);
    component.newPassword = 'NuevaClave2026';
    component.confirmPassword = 'NuevaClave2026';

    await component.resetPassword();

    const [url, init] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/auth/password-recovery/reset');
    expect(JSON.parse(init.body)).toEqual({ token: 'token-123', newPassword: 'NuevaClave2026' });
    expect(component.step).toBe('done');
  });

  it('CA2: exige la política de contraseña y que ambas coincidan', async () => {
    component.useToken(mail.token);
    component.newPassword = 'solotexto';
    component.confirmPassword = 'solotexto';
    expect(component.passwordError).toContain('al menos 8 caracteres');

    component.newPassword = 'NuevaClave2026';
    component.confirmPassword = 'OtraClave2026';
    expect(component.passwordError).toBe('Las contraseñas no coinciden.');

    await component.resetPassword();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('CA3: rechaza el token vencido o usado y permite solicitar uno nuevo', async () => {
    fetchSpy.and.returnValue(
      jsonResponse(
        { message: PasswordRecoveryComponent.INVALID_TOKEN_MESSAGE, canRequestNewToken: true },
        400,
      ),
    );
    component.email = 'olvido@stayhub.com';
    component.useToken('token-usado');
    component.newPassword = 'NuevaClave2026';
    component.confirmPassword = 'NuevaClave2026';

    await component.resetPassword();

    expect(component.step).toBe('reset');
    expect(component.tokenError).toBe(PasswordRecoveryComponent.INVALID_TOKEN_MESSAGE);

    fetchSpy.and.callFake((url: string) =>
      url.includes('/mailbox')
        ? jsonResponse([mail])
        : jsonResponse({ message: PasswordRecoveryComponent.CONFIRMATION_MESSAGE }),
    );
    await component.requestNewToken();

    expect(component.tokenError).toBe('');
    expect(component.step).toBe('mailbox');
    expect(component.mailbox[0].token).toBe('token-123');
  });

  describe('HU-004A · Recuperación por correo electrónico', () => {
    it('CA1: con entrega por correo muestra "Revisa tu correo" sin consultar el buzón simulado', async () => {
      fetchSpy.and.returnValue(
        jsonResponse({ message: PasswordRecoveryComponent.CONFIRMATION_MESSAGE, delivery: 'EMAIL' }),
      );
      component.email = 'olvido@stayhub.com';

      await component.requestRecovery();

      expect(component.step).toBe('sent');
      expect(component.delivery).toBe('EMAIL');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('CA2: el enlace vigente del correo abre el paso de nueva contraseña', async () => {
      fetchSpy.and.returnValue(jsonResponse({ valid: true, expiresAt: '2026-10-20T04:00:00.000Z' }));

      await component.openEmailLink('token-correo');

      expect(fetchSpy.calls.mostRecent().args[0]).toBe(
        '/api/auth/password-recovery/token-status?token=token-correo',
      );
      expect(component.step).toBe('reset');
      expect(component.token).toBe('token-correo');
    });

    it('CA3: el enlace vencido o usado muestra el error y permite pedir uno nuevo con el correo', async () => {
      fetchSpy.and.returnValue(
        jsonResponse({ valid: false, message: PasswordRecoveryComponent.INVALID_TOKEN_MESSAGE }),
      );

      await component.openEmailLink('token-usado');

      expect(component.step).toBe('request');
      expect(component.tokenError).toBe(PasswordRecoveryComponent.INVALID_TOKEN_MESSAGE);

      component.step = 'reset';
      await component.requestNewToken();
      expect(component.step).toBe('request');
    });
  });
});
