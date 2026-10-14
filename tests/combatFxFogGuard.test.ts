import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { disableUnsupportedCombatFxFog } from '../src/fx/combatFxFogGuard';

describe('combat FX fog guard', () => {
  it('disables scene fog on Phase 3 custom shader materials', () => {
    const root = new THREE.Group();
    const mat = new THREE.ShaderMaterial({ fog: true });
    const points = new THREE.Points(new THREE.BufferGeometry(), mat);
    points.name = 'CombatFxPhase3Soft';
    root.add(points);
    const version = mat.version;

    expect(disableUnsupportedCombatFxFog(root)).toBe(1);
    expect(mat.fog).toBe(false);
    expect(mat.version).toBeGreaterThan(version);
  });

  it('does not touch unrelated shader materials', () => {
    const root = new THREE.Group();
    const mat = new THREE.ShaderMaterial({ fog: true });
    const points = new THREE.Points(new THREE.BufferGeometry(), mat);
    points.name = 'OtherPoints';
    root.add(points);

    expect(disableUnsupportedCombatFxFog(root)).toBe(0);
    expect(mat.fog).toBe(true);
  });
});
