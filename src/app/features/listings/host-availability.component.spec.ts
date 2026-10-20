import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HostAvailabilityComponent } from './host-availability.component';

describe('HostAvailabilityComponent · HU-019', () => {
  let component: HostAvailabilityComponent;
  let fixture: ComponentFixture<HostAvailabilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostAvailabilityComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostAvailabilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('CA1: cuando registro un periodo cuya fecha de fin es posterior a la de inicio, queda disponible para reservas', () => {
    component.startDateInput = '2027-04-01';
    component.endDateInput = '2027-04-15';

    const created = component.registerPeriod();

    expect(created).not.toBeNull();
    expect(created?.availableForBooking).toBeTrue();
    expect(component.selectedListingPeriods.length).toBe(1);
    expect(component.errorMessage).toBe('');
  });

  it('CA2: cuando el periodo termina antes de empezar o comienza en el pasado, el sistema lo rechaza', () => {
    component.startDateInput = '2027-05-10';
    component.endDateInput = '2027-05-05';
    expect(component.registerPeriod()).toBeNull();
    expect(component.errorMessage).toContain('posterior a la fecha de inicio');

    component.startDateInput = '2020-01-01';
    component.endDateInput = '2020-01-10';
    expect(component.registerPeriod()).toBeNull();
    expect(component.errorMessage).toContain('en el pasado');
  });

  it('CA3: cuando el periodo se superpone con otro ya registrado, el sistema lo rechaza e indica el periodo existente', () => {
    component.startDateInput = '2027-06-10';
    component.endDateInput = '2027-06-20';
    component.registerPeriod();

    component.startDateInput = '2027-06-15';
    component.endDateInput = '2027-06-25';
    const result = component.registerPeriod();

    expect(result).toBeNull();
    expect(component.errorMessage).toContain('2027-06-10 al 2027-06-20');
    expect(component.selectedListingPeriods.length).toBe(1);
  });
});
