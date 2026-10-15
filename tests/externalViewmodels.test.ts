import { describe, expect, it } from 'vitest';
import { EXTRA_WEAPON_IDS } from '../src/weapons/extraWeapons';
import { EXTERNAL_WEAPON_ASSETS, externalWeaponAssetUrl } from '../src/weapons/externalViewmodels';

describe('external weapon viewmodels', () => {
  it('covers every extended weapon exactly once', () => {
    expect(EXTERNAL_WEAPON_ASSETS.map((a) => a.id).sort()).toEqual([...EXTRA_WEAPON_IDS].sort());
    expect(new Set(EXTERNAL_WEAPON_ASSETS.map((a) => a.file)).size).toBe(EXTERNAL_WEAPON_ASSETS.length);
  });

  it('uses bounded first-person dimensions and camera clearance', () => {
    for (const asset of EXTERNAL_WEAPON_ASSETS) {
      expect(asset.targetLength).toBeGreaterThan(0.3);
      expect(asset.targetLength).toBeLessThanOrEqual(0.9);
      expect(asset.rearZ).toBeGreaterThan(0);
      expect(asset.rearZ).toBeLessThanOrEqual(0.08);
      expect(asset.topY).toBeGreaterThanOrEqual(0);
      expect(asset.adsPush).toBeGreaterThanOrEqual(0.12);
      expect(asset.adsPush).toBeLessThanOrEqual(0.22);
      expect(asset.adsScale).toBeGreaterThanOrEqual(0.88);
      expect(asset.adsScale).toBeLessThanOrEqual(0.96);
      expect(asset.reloadPush).toBeGreaterThan(0);
      expect(asset.reloadPush).toBeLessThanOrEqual(0.1);
    }
  });

  it('resolves assets below the Vite/Activity base path', () => {
    expect(externalWeaponAssetUrl('kx9-smg.glb', './')).toBe('./assets/weapons/kx9-smg.glb');
    expect(externalWeaponAssetUrl('kx9-smg.glb', '/activity/')).toBe('/activity/assets/weapons/kx9-smg.glb');
    expect(externalWeaponAssetUrl('kx9-smg.glb', '/activity')).toBe('/activity/assets/weapons/kx9-smg.glb');
  });
});
