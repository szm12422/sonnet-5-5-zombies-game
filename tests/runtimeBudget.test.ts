import { describe, expect, it } from 'vitest';
import { chooseRuntimeBudget } from '../src/perf/runtimeBudget';

describe('runtime performance budget', () => {
  it('uses the strongest cap on low-end mobile devices', () => {
    expect(chooseRuntimeBudget({ mobile: true, cores: 4, memoryGb: 4 })).toEqual({
      profile: 'mobile-low',
      hudHz: 24,
      zombieHz: 24,
      renderScaleCap: 0.68,
    });
  });

  it('keeps normal mobile responsive without full-rate secondary work', () => {
    expect(chooseRuntimeBudget({ mobile: true, cores: 8, memoryGb: 8 })).toEqual({
      profile: 'mobile',
      hudHz: 30,
      zombieHz: 30,
      renderScaleCap: 0.78,
    });
  });

  it('does not cap rendering or zombie simulation on capable desktop hardware', () => {
    expect(chooseRuntimeBudget({ mobile: false, cores: 12, memoryGb: 16 })).toEqual({
      profile: 'desktop',
      hudHz: 30,
      zombieHz: 60,
      renderScaleCap: null,
    });
  });
});
