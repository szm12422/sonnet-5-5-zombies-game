import { describe, expect, it } from 'vitest';
import { eligiblePhase6Buildings, environmentPhase6Preset } from '../src/render/environmentPhase6';
import type { BoxCollider } from '../src/world/collision';

function collider(id: number, overrides: Partial<BoxCollider> = {}): BoxCollider {
  return {
    id,
    cx: 0,
    cz: 0,
    hx: 4,
    hz: 3,
    rot: 0,
    cos: 1,
    sin: 0,
    y0: 0,
    y1: 8,
    minX: -4,
    maxX: 4,
    minZ: -3,
    maxZ: 3,
    blocksMove: true,
    blocksShots: true,
    surface: 'concrete',
    mapKind: 'building',
    tag: 'block',
    ...overrides,
  };
}

describe('environment Phase 6 budgets', () => {
  it('scales every major detail class down for mobile', () => {
    const desktop = environmentPhase6Preset('desktop');
    const desktopLow = environmentPhase6Preset('desktop-low');
    const mobile = environmentPhase6Preset('mobile');
    const mobileLow = environmentPhase6Preset('mobile-low');

    for (const key of ['facadeBuildings', 'acUnits', 'wallServices', 'roofUnits', 'cableRoutes', 'signs', 'interiorPanels'] as const) {
      expect(desktop[key]).toBeGreaterThan(desktopLow[key]);
      expect(desktopLow[key]).toBeGreaterThan(mobile[key]);
      expect(mobile[key]).toBeGreaterThan(mobileLow[key]);
    }
  });

  it('only selects substantial building colliders and preserves stable id order', () => {
    const list = [
      collider(8),
      collider(2, { mapKind: 'wall' }),
      collider(5, { y1: 2.5 }),
      collider(4, { tag: 'dock' }),
      collider(3, { hx: 1.2, hz: 1.1 }),
      collider(1),
    ];

    expect(eligiblePhase6Buildings(list, 10).map((c) => c.id)).toEqual([1, 8]);
    expect(eligiblePhase6Buildings(list, 1).map((c) => c.id)).toEqual([1]);
    expect(eligiblePhase6Buildings(list, 0)).toEqual([]);
  });
});
