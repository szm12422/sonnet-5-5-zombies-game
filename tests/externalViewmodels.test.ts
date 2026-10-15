import { describe, expect, it } from 'vitest';
import { EXTRA_WEAPON_IDS } from '../src/weapons/extraWeapons';
import { EXTERNAL_WEAPON_ASSETS, externalWeaponAssetUrl } from '../src/weapons/externalViewmodels';

describe('external weapon viewmodels', () => {
  it('covers every extended weapon exactly once', () => {
    expect(EXTERNAL_WEAPON_ASSETS.map((a) => a.id).sort()).toEqual([...EXTRA_WEAPON_IDS].sort());
    expect(new Set(EXTERNAL_WEAPON_ASSETS.map((a) => a.file)).size).toBe(EXTERNAL_WEAPON_ASSETS.length);
  });

  it('uses bounded first-person dimensions', () => {
    for (const asset of EXTERNAL_WEAPON_ASSETS) {
      expect(asset.targetLength).toBeGreaterThan(0.35);
      expect(asset.targetLength).toBeLessThanOrEqual(1.05);
      expect(asset.rearZ).toBeGreaterThan(0);
      expect(asset.topY).toBeGreaterThanOrEqual(0);
    }
  });

  it('resolves assets below the Vite/Activity base path', () => {
    expect(externalWeaponAssetUrl('kx9-smg.glb', './')).toBe('./assets/weapons/kx9-smg.glb');
    expect(externalWeaponAssetUrl('kx9-smg.glb', '/activity/')).toBe('/activity/assets/weapons/kx9-smg.glb');
    expect(externalWeaponAssetUrl('kx9-smg.glb', '/activity')).toBe('/activity/assets/weapons/kx9-smg.glb');
  });
});
