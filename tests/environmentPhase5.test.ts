import { describe, expect, it } from 'vitest';
import { environmentPhase5Preset } from '../src/render/environmentPhase5';
import { generateDensityCandidates } from '../src/world/environmentDensity';

describe('environment Phase 5 budgets', () => {
  it('scales static dressing down monotonically for mobile', () => {
    const desktop = environmentPhase5Preset('desktop');
    const desktopLow = environmentPhase5Preset('desktop-low');
    const mobile = environmentPhase5Preset('mobile');
    const mobileLow = environmentPhase5Preset('mobile-low');

    expect(desktop.decals).toBeGreaterThan(desktopLow.decals);
    expect(desktopLow.decals).toBeGreaterThan(mobile.decals);
    expect(mobile.decals).toBeGreaterThan(mobileLow.decals);
    expect(desktop.micro).toBeGreaterThan(mobile.micro);
    expect(mobile.bags).toBeGreaterThan(mobileLow.bags);
    expect(mobileLow.coils).toBeLessThanOrEqual(6);
  });

  it('generates deterministic in-bounds candidate points', () => {
    const bounds = { minX: -66, maxX: 66, minZ: -52, maxZ: 52 };
    const a = generateDensityCandidates(12345, 12, bounds, 4);
    const b = generateDensityCandidates(12345, 12, bounds, 4);
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
    for (const p of a) {
      expect(p.x).toBeGreaterThanOrEqual(-62);
      expect(p.x).toBeLessThanOrEqual(62);
      expect(p.z).toBeGreaterThanOrEqual(-48);
      expect(p.z).toBeLessThanOrEqual(48);
      expect(p.scale).toBeGreaterThanOrEqual(0.72);
      expect(p.scale).toBeLessThanOrEqual(1.28);
    }
  });
});
