import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HostAvailabilityComponent, nightsInInterval } from './host-availability.component';
import { AvailabilityPeriod, BlockedPeriod, MyListing } from '../../shared/models/listing.model';

describe('HostAvailabilityComponent · HU-019 y HU-023', () => {
  let component: HostAvailabilityComponent;
  let fixture: ComponentFixture<HostAvailabilityComponent>;
  let fetchSpy: jasmine.Spy;

  const listings: MyListing[] = [
    {
      id: 'listing-1',
      title: 'Cabaña del Bosque',
      city: 'Guatapé',
      status: 'BORRADOR',
      statusLabel: 'Borrador',
      isComplete: true,
      missingFields: [],
      createdAt: '2026-10-20T10:00:00.000Z',
    },
  ];

  const existing: AvailabilityPeriod = {
    id: 'period-1',
    listingId: 'listing-1',
    startDate: '2027-06-10',
    endDate: '2027-06-20',
    availableForBooking: true,
  };

  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  /** Responde a la carga inicial: alojamientos del anfitrión y sus periodos. */
  const load = async (periods: AvailabilityPeriod[] = []) => {
    fetchSpy = spyOn(window, 'fetch').and.callFake(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/listings/mine') {
        return reply(200, listings);
      }
      if (url.endsWith('/availability-periods') && !init?.method) {
        return reply(200, periods);
      }
      throw new Error(`Llamada inesperada: ${init?.method ?? 'GET'} ${url}`);
    });
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const nextPostReturns = (status: number, body: unknown) =>
    fetchSpy.and.callFake(async () => reply(status, body));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostAvailabilityComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostAvailabilityComponent);
    component = fixture.componentInstance;
  });

  it('carga los alojamientos del anfitrión y los periodos del primero', async () => {
    await load([existing]);

    expect(component.selectedListingId).toBe('listing-1');
    expect(component.periods).toEqual([existing]);
    expect(fetchSpy).toHaveBeenCalledWith('/api/listings/listing-1/availability-periods', jasmine.any(Object));
  });

  it('CA1: cuando registro un periodo cuya fecha de fin es posterior a la de inicio, queda disponible para reservas', async () => {
    await load();
    const created = { ...existing, id: 'period-2', startDate: '2027-04-01', endDate: '2027-04-15' };
    nextPostReturns(201, created);
    component.startDateInput = '2027-04-01';
    component.endDateInput = '2027-04-15';

    const result = await component.registerPeriod();

    expect(result?.availableForBooking).toBeTrue();
    expect(component.periods).toEqual([created]);
    expect(component.successMessage).toContain('disponible para reservas');
    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('/api/listings/listing-1/availability-periods');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ startDate: '2027-04-01', endDate: '2027-04-15' });
  });

  it('CA2: cuando el periodo termina antes de empezar o comienza en el pasado, el sistema lo rechaza sin llamar al servidor', async () => {
    await load();
    const callsAfterLoad = fetchSpy.calls.count();

    component.startDateInput = '2027-05-10';
    component.endDateInput = '2027-05-05';
    expect(await component.registerPeriod()).toBeNull();
    expect(component.errorMessage).toContain('posterior a la fecha de inicio');

    component.startDateInput = '2020-01-01';
    component.endDateInput = '2020-01-10';
    expect(await component.registerPeriod()).toBeNull();
    expect(component.errorMessage).toContain('en el pasado');
    expect(fetchSpy.calls.count()).toBe(callsAfterLoad);
  });

  it('CA3: cuando el periodo se superpone con otro ya registrado, lo rechaza e indica el periodo existente', async () => {
    await load([existing]);
    component.startDateInput = '2027-06-15';
    component.endDateInput = '2027-06-25';

    expect(await component.registerPeriod()).toBeNull();

    expect(component.errorMessage).toContain('2027-06-10 al 2027-06-20');
    expect(component.conflictingPeriodId).toBe('period-1');
    expect(component.periods).toHaveSize(1);
  });

  it('CA3: muestra el periodo existente que indica el servidor', async () => {
    await load();
    nextPostReturns(400, {
      message: 'El periodo solicitado se superpone con el periodo existente del 2027-06-10 al 2027-06-20.',
      conflictingPeriod: { id: 'period-9', startDate: '2027-06-10', endDate: '2027-06-20' },
    });
    component.startDateInput = '2027-06-15';
    component.endDateInput = '2027-06-25';

    expect(await component.registerPeriod()).toBeNull();

    expect(component.errorMessage).toContain('2027-06-10 al 2027-06-20');
    expect(component.conflictingPeriodId).toBe('period-9');
  });

  describe('HU-023 · Bloquear automáticamente el periodo reservado', () => {
    it('HU-023 CA1: al confirmar una reserva del 10 al 12, las noches del 10 y del 11 quedan bloqueadas', async () => {
      await load([existing]);
      expect(nightsInInterval('2027-06-10', '2027-06-12')).toEqual(['2027-06-10', '2027-06-11']);

      const blocked: BlockedPeriod = {
        id: 'block-1',
        listingId: 'listing-1',
        checkIn: '2027-06-10',
        checkOut: '2027-06-12',
        blockedNights: ['2027-06-10', '2027-06-11'],
      };
      nextPostReturns(201, blocked);

      component.checkInInput = '2027-06-10';
      component.checkOutInput = '2027-06-12';
      const result = await component.confirmReservedBlock();

      expect(result?.blockedNights).toEqual(['2027-06-10', '2027-06-11']);
      expect(component.reservedPeriods).toEqual([blocked]);
      expect(component.successMessage).toContain('2027-06-10, 2027-06-11');
    });

    it('HU-023 CA2: con reserva del 10 al 12, consultar o reservar del 12 al 14 aparece disponible', async () => {
      await load([existing]);
      component.reservedPeriods = [
        {
          id: 'block-1',
          listingId: 'listing-1',
          checkIn: '2027-06-10',
          checkOut: '2027-06-12',
          blockedNights: ['2027-06-10', '2027-06-11'],
        },
      ];

      nextPostReturns(200, {
        listingId: 'listing-1',
        isAvailable: true,
        blockedDates: [],
        pricePerNight: 90,
      });
      component.availabilityQueryStart = '2027-06-12';
      component.availabilityQueryEnd = '2027-06-14';
      const check = await component.checkAvailabilityRange();

      expect(check?.isAvailable).toBeTrue();
      expect(check?.blockedDates).toEqual([]);
    });

    it('HU-023 CA3: si el rango incluye una noche reservada o bloqueada, retorna no disponible', async () => {
      await load([existing]);
      component.reservedPeriods = [
        {
          id: 'block-1',
          listingId: 'listing-1',
          checkIn: '2027-06-10',
          checkOut: '2027-06-12',
          blockedNights: ['2027-06-10', '2027-06-11'],
        },
      ];

      component.checkInInput = '2027-06-11';
      component.checkOutInput = '2027-06-13';
      expect(await component.confirmReservedBlock()).toBeNull();
      expect(component.errorMessage).toContain('2027-06-11');

      nextPostReturns(200, {
        listingId: 'listing-1',
        isAvailable: false,
        blockedDates: ['2027-06-11'],
        pricePerNight: 90,
      });
      component.availabilityQueryStart = '2027-06-11';
      component.availabilityQueryEnd = '2027-06-13';
      const check = await component.checkAvailabilityRange();

      expect(check?.isAvailable).toBeFalse();
      expect(check?.blockedDates).toEqual(['2027-06-11']);
    });
  });
  describe('HU-020 · Modificar o eliminar periodos disponibles (CA1, CA2)', () => {
    it('CA1: elimina un periodo sin reservas confirmadas y lo retira de la lista', async () => {
      await load([existing]);
      fetchSpy.and.callFake(async (url: string, init?: RequestInit) => {
        if (init?.method === 'DELETE' && String(url).includes('/availability-periods/period-1')) {
          return reply(200, { success: true, message: 'Periodo disponible eliminado correctamente' });
        }
        return reply(200, {});
      });

      const deleted = await component.deletePeriod('period-1');

      expect(deleted).toBeTrue();
      expect(component.periods).toEqual([]);
      expect(component.successMessage).toContain('eliminado correctamente');
    });

    it('CA1: modifica o reduce un periodo sin reservas y actualiza sus fechas', async () => {
      await load([existing]);
      const updatedPeriod = { ...existing, startDate: '2027-06-12', endDate: '2027-06-18' };
      fetchSpy.and.callFake(async (url: string, init?: RequestInit) => {
        if (init?.method === 'PATCH' && String(url).includes('/availability-periods/period-1')) {
          return reply(200, updatedPeriod);
        }
        return reply(200, {});
      });

      component.startEditing(existing);
      expect(component.editingPeriodId).toBe('period-1');
      expect(component.editStartDate).toBe('2027-06-10');
      expect(component.editEndDate).toBe('2027-06-20');

      component.editStartDate = '2027-06-12';
      component.editEndDate = '2027-06-18';
      const result = await component.savePeriod('period-1');

      expect(result).toEqual(updatedPeriod);
      expect(component.periods[0].startDate).toBe('2027-06-12');
      expect(component.periods[0].endDate).toBe('2027-06-18');
      expect(component.editingPeriodId).toBe('');
      expect(component.successMessage).toContain('modificado correctamente');
    });

    it('CA2: impide eliminar un periodo con reservas confirmadas y muestra las reservas afectadas', async () => {
      await load([existing]);
      const affected = [{ bookingId: 'booking-1', code: 'STAY-001', checkIn: '2027-06-12', checkOut: '2027-06-15' }];
      fetchSpy.and.callFake(async (url: string, init?: RequestInit) => {
        if (init?.method === 'DELETE') {
          return reply(400, {
            message: 'No es posible eliminar el periodo porque contiene reservas confirmadas: STAY-001.',
            affectedBookings: affected,
          });
        }
        return reply(200, {});
      });

      const deleted = await component.deletePeriod('period-1');

      expect(deleted).toBeFalse();
      expect(component.periods).toHaveSize(1);
      expect(component.errorMessage).toContain('reservas confirmadas');
      expect(component.affectedBookings).toEqual(affected);
    });

    it('CA2: impide reducir un periodo cuando las fechas retiradas afectan reservas confirmadas', async () => {
      await load([existing]);
      const affected = [{ bookingId: 'booking-2', code: 'STAY-002', checkIn: '2027-06-16', checkOut: '2027-06-19' }];
      fetchSpy.and.callFake(async (url: string, init?: RequestInit) => {
        if (init?.method === 'PATCH') {
          return reply(400, {
            message: 'No es posible modificar el periodo porque contiene reservas confirmadas: STAY-002.',
            affectedBookings: affected,
          });
        }
        return reply(200, {});
      });

      component.startEditing(existing);
      component.editEndDate = '2027-06-15';
      const result = await component.savePeriod('period-1');

      expect(result).toBeNull();
      expect(component.errorMessage).toContain('reservas confirmadas');
      expect(component.affectedBookings).toEqual(affected);
    });
  });
});
