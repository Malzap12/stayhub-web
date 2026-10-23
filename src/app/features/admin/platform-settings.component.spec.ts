import { validateServiceFeeInput } from '../../shared/models/platform.model';

describe('HU-029 · Frontend - Configuración de la tarifa de servicio', () => {
  describe('validateServiceFeeInput (RN-014)', () => {
    it('acepta valores válidos dentro del rango 0 % a 30 %', () => {
      expect(validateServiceFeeInput(0)).toBeNull();
      expect(validateServiceFeeInput(12)).toBeNull();
      expect(validateServiceFeeInput(30)).toBeNull();
      expect(validateServiceFeeInput(15.5)).toBeNull();
    });

    it('rechaza valores fuera de rango (< 0 % o > 30 %)', () => {
      expect(validateServiceFeeInput(-0.1)).toContain('entre 0 % y 30 %');
      expect(validateServiceFeeInput(-10)).toContain('entre 0 % y 30 %');
      expect(validateServiceFeeInput(30.1)).toContain('entre 0 % y 30 %');
      expect(validateServiceFeeInput(50)).toContain('entre 0 % y 30 %');
    });

    it('rechaza valores nulos, indefinidos o no numéricos', () => {
      expect(validateServiceFeeInput(null)).toContain('debe ser un número');
      expect(validateServiceFeeInput(undefined)).toContain('debe ser un número');
      expect(validateServiceFeeInput(NaN)).toContain('debe ser un número');
    });
  });
});
