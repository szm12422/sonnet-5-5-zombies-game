import { Rng } from '../logic/rng';

export interface DensityBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DensityPoint {
  x: number;
  z: number;
  rot: number;
  scale: number;
}

/**
 * Deterministic candidate generation for presentation-only environment dressing.
 * Runtime placement filters these points against the real collision world before creating any visual instances.
 */
export function generateDensityCandidates(seed: number, count: number, bounds: DensityBounds, inset = 3): DensityPoint[] {
  const rng = new Rng(seed >>> 0);
  const minX = bounds.minX + inset;
  const maxX = bounds.maxX - inset;
  const minZ = bounds.minZ + inset;
  const maxZ = bounds.maxZ - inset;
  const out: DensityPoint[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rng.range(minX, maxX),
      z: rng.range(minZ, maxZ),
      rot: rng.range(0, Math.PI * 2),
      scale: rng.range(0.72, 1.28),
    });
  }
  return out;
}
