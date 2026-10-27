import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  BookingPaymentResult,
  formatCardNumber,
  TestCard,
  TestCardPaymentComponent,
} from './test-card-payment.component';

describe('TestCardPaymentComponent · HU-037 Pagar la reserva en modo de pruebas', () => {
  let fixture: ComponentFixture<TestCardPaymentComponent>;
  let component: TestCardPaymentComponent;

  const testCards: TestCard[] = [
    { number: '4242424242424242', brand: 'VISA', outcome: 'APROBADO', description: 'Pago aprobado' },
    { number: '4000000000000002', brand: 'VISA', outcome: 'RECHAZADO', declineReason: 'TARJETA_RECHAZADA', description: 'Pago rechazado por el emisor' },
  ];

  const result = (status: 'APROBADO' | 'RECHAZADO'): BookingPaymentResult => ({
    booking: { id: 'booking-37', status: status === 'APROBADO' ? 'CONFIRMADA' : 'PENDIENTE' },
    payment: {
      id: 'pay-1',
      reference: 'TEST-ABCDE12345',
      bookingId: 'booking-37',
      status,
      ...(status === 'RECHAZADO' ? { declineReason: 'TARJETA_RECHAZADA' } : {}),
      message: status === 'APROBADO' ? 'Pago aprobado' : 'Pago rechazado por el emisor',
      amount: 715000,
      currency: 'COP',
      cardBrand: 'VISA',
      cardLast4: status === 'APROBADO' ? '4242' : '0002',
      mode: 'TEST',
      provider: 'StayHub Sandbox',
      processedAt: '2026-10-26T20:00:00.000Z',
    },
  });

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const text = () => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestCardPaymentComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestCardPaymentComponent);
    component = fixture.componentInstance;
    component.bookingId = 'booking-37';
  });

  it('formatea el número de tarjeta en grupos de 4', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('4242-42ab42')).toBe('4242 4242');
  });

  it('CA3: indica el modo de pruebas y lista las tarjetas de prueba del proveedor', async () => {
    spyOn(window, 'fetch').and.returnValue(json(testCards));
    await component.ngOnInit();
    fixture.detectChanges();

    expect(text()).toContain('Modo de pruebas');
    expect(text()).toContain('No se cobra dinero real');
    expect(fixture.nativeElement.querySelectorAll('.chip').length).toBe(2);
  });

  it('CA1: con la tarjeta aprobada muestra el pago APROBADO con su referencia y emite paid', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(result('APROBADO')));
    const paid = spyOn(component.paid, 'emit');
    component.useTestCard(testCards[0]);

    await component.pay();
    fixture.detectChanges();

    const [url, init] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/bookings/booking-37/pay');
    expect(JSON.parse(init?.body as string)).toEqual(
      jasmine.objectContaining({ cardNumber: '4242424242424242', expMonth: 12, cvc: '123' }),
    );
    expect(paid).toHaveBeenCalledWith(result('APROBADO'));
    expect(text()).toContain('Pago APROBADO');
    expect(text()).toContain('TEST-ABCDE12345');
    expect(component.cvc).toBe('');
  });

  it('CA2: con la tarjeta rechazada muestra RECHAZADO, avisa que la reserva no se confirmó y no emite paid', async () => {
    spyOn(window, 'fetch').and.returnValue(json(result('RECHAZADO')));
    const paid = spyOn(component.paid, 'emit');
    const declined = spyOn(component.declined, 'emit');
    component.useTestCard(testCards[1]);

    await component.pay();
    fixture.detectChanges();

    expect(paid).not.toHaveBeenCalled();
    expect(declined).toHaveBeenCalled();
    expect(text()).toContain('Pago RECHAZADO');
    expect(text()).toContain('La reserva no se confirmó y las fechas siguen disponibles');
  });

  it('valida el formulario antes de llamar al API', async () => {
    const fetchSpy = spyOn(window, 'fetch');
    component.cardNumber = '1234';

    await component.pay();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('número de tarjeta');

    component.useTestCard(testCards[0]);
    component.cvc = '1';
    expect(component.validate()).toContain('CVC');
    component.cvc = '123';
    component.expMonth = 13;
    expect(component.validate()).toContain('mes');
  });

  it('muestra el mensaje del API cuando la tarjeta no es de prueba', async () => {
    spyOn(window, 'fetch').and.returnValue(
      json({ message: 'Solo se aceptan tarjetas de prueba del proveedor; no se procesan pagos con dinero real' }, 400),
    );
    component.useTestCard(testCards[0]);
    component.cardNumber = '4111 1111 1111 1112';

    await component.pay();

    expect(component.errorMessage).toContain('Solo se aceptan tarjetas de prueba');
    expect(component.result).toBeNull();
  });
});
