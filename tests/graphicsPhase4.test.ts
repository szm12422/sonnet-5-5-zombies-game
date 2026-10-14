import { describe, expect, it } from 'vitest';
import { deathReactionEnvelope, hitReactionEnvelope, recoilProfileForWeapon } from '../src/render/graphicsPhase4';

describe('graphics Phase 4 motion tuning', () => {
  it('keeps hit reactions short and monotonic', () => {
    expect(hitReactionEnvelope(0)).toBeCloseTo(1);
    expect(hitReactionEnvelope(0.08)).toBeLessThan(hitReactionEnvelope(0.02));
    expect(hitReactionEnvelope(0.5)).toBeLessThan(0.02);
    expect(hitReactionEnvelope(-1)).toBe(0);
  });

  it('keeps death accent transient and settled corpses unchanged', () => {
    expect(deathReactionEnvelope(0)).toBe(0);
    expect(deathReactionEnvelope(0.08)).toBeGreaterThan(0);
    expect(deathReactionEnvelope(1.8)).toBeLessThan(0.001);
    expect(deathReactionEnvelope(-1)).toBe(0);
  });

  it('gives weapon classes distinct visual recoil signatures', () => {
    const smg = recoilProfileForWeapon('smg');
    const dmr = recoilProfileForWeapon('dmr');
    const pistol = recoilProfileForWeapon('pistol');
    const magnum = recoilProfileForWeapon('magnum');
    const shotgun = recoilProfileForWeapon('shotgun');

    expect(dmr.pitch).toBeGreaterThan(smg.pitch);
    expect(magnum.pitch).toBeGreaterThan(pistol.pitch);
    expect(shotgun.kickZ).toBeGreaterThan(dmr.kickZ);
    expect(recoilProfileForWeapon('unknown')).toEqual(recoilProfileForWeapon('rifle'));
  });
});
