import { RegisterComponent } from './register.component';

describe('RegisterComponent (HU-001 · MA-36)', () => {
  let component: RegisterComponent;

  beforeEach(() => {
    component = new RegisterComponent();
  });

  it('CA4: should only offer HUESPED and ANFITRION roles in registration', () => {
    expect(component.availableRoles).toEqual(['HUESPED', 'ANFITRION']);
    expect(component.availableRoles).not.toContain('ADMINISTRADOR' as any);
  });

  it('CA3: should validate password with at least 8 characters and letters + numbers', () => {
    component.form.name = 'Miguel Alza';
    component.form.email = 'miguel@stayhub.com';
    component.form.password = '12345';
    expect(component.passwordError).toContain('al menos 8 caracteres');
    expect(component.isFormValid()).toBeFalse();

    component.form.password = 'SoloLetras';
    expect(component.passwordError).toContain('combinar letras y números');
    expect(component.isFormValid()).toBeFalse();

    component.form.password = 'ClaveValida123';
    expect(component.passwordError).toBe('');
    expect(component.isFormValid()).toBeTrue();
  });

  it('CA1 & CA2: should create account and reject duplicate email in local fallback', async () => {
    component.form = {
      name: 'Miguel Alza',
      email: 'nuevo@stayhub.com',
      password: 'Password123',
      role: 'ANFITRION',
    };

    await component.onSubmit();
    expect(component.successMessage).toContain('Cuenta creada exitosamente');
    expect(component.createdRoleLabel).toBe('Anfitrión');

    await component.onSubmit();
    expect(component.duplicateEmailError).toContain('El correo electrónico ya está en uso');
  });

  it('HU-006: el teléfono es opcional, pero si se diligencia debe ser válido', () => {
    component.form.name = 'Miguel Alza';
    component.form.email = 'miguel@stayhub.com';
    component.form.password = 'ClaveValida123';

    component.form.phone = '';
    expect(component.phoneError).toBe('');
    expect(component.isFormValid()).toBeTrue();

    component.form.phone = 'abc123';
    expect(component.phoneError).toContain('teléfono válido');
    expect(component.isFormValid()).toBeFalse();

    component.form.phone = '+57 300 123 4567';
    expect(component.phoneError).toBe('');
    expect(component.isFormValid()).toBeTrue();
  });

  it('HU-006: envía el teléfono al API sin espacios sobrantes', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response('{}', { status: 201 }));
    component.form = {
      name: 'Laura Gómez',
      email: 'laura@stayhub.com',
      password: 'Password123',
      phone: ' 3001234567 ',
      role: 'HUESPED',
    };

    await component.onSubmit();

    const body = JSON.parse(fetchSpy.calls.mostRecent().args[1]?.body as string);
    expect(body.phone).toBe('3001234567');
  });
});
