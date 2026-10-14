import { describe, expect, it } from 'vitest';
import { combatFxPresetForProfile } from '../src/fx/combatFxPhase3';

describe('combat FX phase 3 budgets', () => {
  it('keeps the richest bounded pool on capable desktop', () => {
    expect(combatFxPresetForProfile('desktop')).toEqual({
      softCap: 128,
      sparkCap: 96,
      ambientHz: 5,
      impactScale: 1,
      smokeScale: 1,
      explosionScale: 1,
    });
  });

  it('scales the presentation layer down for normal mobile', () => {
    expect(combatFxPresetForProfile('mobile')).toEqual({
      softCap: 72,
      sparkCap: 48,
      ambientHz: 2.2,
      impactScale: 0.68,
      smokeScale: 0.64,
      explosionScale: 0.66,
    });
  });

  it('uses the smallest hard-bounded effect pools on low-end mobile', () => {
    const low = combatFxPresetForProfile('mobile-low');
    expect(low.softCap).toBe(48);
    expect(low.sparkCap).toBe(32);
    expect(low.ambientHz).toBe(1.2);
    expect(low.explosionScale).toBeLessThan(0.5);
  });
});
