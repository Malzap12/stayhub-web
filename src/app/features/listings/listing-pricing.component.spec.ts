import { validatePricingForm } from './listing-pricing.component';

describe('HU-015 · validatePricingForm (CA3)', () => {
  it('acepta limpieza 0 COP sin descuento', () => {
    expect(validatePricingForm(0, 0, null)).toEqual({});
  });

  it('acepta un descuento del 50 % desde 1 noche', () => {
    expect(validatePricingForm(50000, 50, 1)).toEqual({});
  });

  it('rechaza una tarifa de limpieza negativa o vacía', () => {
    expect(validatePricingForm(-1, 0, null).cleaningFee).toBeTruthy();
    expect(validatePricingForm(null, 0, null).cleaningFee).toBeTruthy();
  });

  it('rechaza un descuento fuera de 0-50 %', () => {
    expect(validatePricingForm(0, 51, 7).discountPercent).toBeTruthy();
    expect(validatePricingForm(0, -1, 7).discountPercent).toBeTruthy();
  });

  it('exige noches mínimas enteras (>= 1) cuando hay descuento', () => {
    expect(validatePricingForm(0, 10, null).minNights).toBeTruthy();
    expect(validatePricingForm(0, 10, 0).minNights).toBeTruthy();
    expect(validatePricingForm(0, 10, 2.5).minNights).toBeTruthy();
  });
});
