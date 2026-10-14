import { describe, expect, it } from 'vitest';
import { graphicsPresetForProfile } from '../src/render/graphicsPhase1';

describe('graphics phase 1 profile policy', () => {
  it('keeps the full cinematic compositor treatment on capable desktop', () => {
    const p = graphicsPresetForProfile('desktop');
    expect(p.canvasGrade).toBe(true);
    expect(p.vignetteOpacity).toBe(1);
    expect(p.environment).toBeGreaterThan(0.55);
    expect(p.flashDistance).toBeGreaterThan(17);
  });

  it('avoids extra compositor work on normal mobile', () => {
    const p = graphicsPresetForProfile('mobile');
    expect(p.canvasGrade).toBe(false);
    expect(p.vignetteOpacity).toBe(0);
    expect(p.materialDetail).toBeLessThan(0.9);
  });

  it('uses the most conservative transient-light reach on low-end mobile', () => {
    const mobile = graphicsPresetForProfile('mobile');
    const low = graphicsPresetForProfile('mobile-low');
    expect(low.canvasGrade).toBe(false);
    expect(low.flashDistance).toBeLessThan(mobile.flashDistance);
    expect(low.explosionDistance).toBeLessThan(mobile.explosionDistance);
    expect(low.flareDistance).toBeLessThan(mobile.flareDistance);
  });
});
