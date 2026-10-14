import * as THREE from 'three';
import { Rng } from '../logic/rng';
import type { LevelBuilder } from './builder';
import type { MaterialLib } from './materials';
import { debris } from './props';

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

export interface EnvironmentDensityStats {
  decals: number;
  microProps: number;
  trashBags: number;
  rubbleClusters: number;
}

/**
 * Phase 5 is deliberately presentation-only: all additions are step-over micro props, decals and low rubble.
 * No new colliders are registered, so mission routes, nav reachability and zombie pathing remain unchanged.
 */
export const ENVIRONMENT_DENSITY_BUDGET = Object.freeze({
  decalCandidates: 112,
  microCandidates: 132,
  trashBagTarget: 24,
  rubbleClusters: 10,
});

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

function clearGround(b: LevelBuilder, x: number, z: number, radius: number): boolean {
  return !b.world.circleBlocked(x, z, radius, 0.02, 0.72);
}

function flatPlane(width = 1, depth = 1): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(width, depth);
  g.rotateX(-Math.PI / 2);
  return g;
}

function addGroundDecals(b: LevelBuilder, mats: MaterialLib): number {
  const sets = [
    b.instanced('phase5:decal:oil', flatPlane(), mats.decal('oilStain'), { cast: false, receive: false }),
    b.instanced('phase5:decal:puddle', flatPlane(), mats.decal('puddle'), { cast: false, receive: false }),
    b.instanced('phase5:decal:crack', flatPlane(), mats.decal('crackLarge'), { cast: false, receive: false }),
    b.instanced('phase5:decal:skid', flatPlane(), mats.decal('skid'), { cast: false, receive: false }),
    b.instanced('phase5:decal:dirt', flatPlane(), mats.decal('dirtPatch'), { cast: false, receive: false }),
    b.instanced('phase5:decal:blood', flatPlane(), mats.decal('bloodOld1'), { cast: false, receive: false }),
  ];
  const pts = generateDensityCandidates(0x51a7e5, ENVIRONMENT_DENSITY_BUDGET.decalCandidates, b.world.bounds, 4);
  let placed = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (!clearGround(b, p.x, p.z, 0.42)) continue;
    const kind = i % sets.length;
    const base = kind === 1 ? 1.55 : kind === 2 ? 1.25 : kind === 3 ? 1.45 : 1;
    const sx = base * p.scale * (0.82 + ((i * 17) % 13) / 40);
    const sz = base * p.scale * (0.72 + ((i * 11) % 17) / 38);
    sets[kind]!.add(p.x, 0.024 + kind * 0.0015, p.z, p.rot, sx, 1, sz);
    placed++;
  }
  return placed;
}

function addMicroProps(b: LevelBuilder, mats: MaterialLib): { micro: number; bags: number } {
  // All geometries are intentionally low-poly and shared through InstancedMesh batches.
  const shardGeo = new THREE.TetrahedronGeometry(0.18, 0);
  shardGeo.scale(1.5, 0.55, 1.05);
  const brickGeo = new THREE.BoxGeometry(0.28, 0.11, 0.14);
  const canGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.18, 6, 1);
  const bagGeo = new THREE.IcosahedronGeometry(0.27, 1);

  const shards = b.instanced('phase5:micro:shard', shardGeo, mats.get('rubble'), { cast: false, receive: true });
  const bricks = b.instanced('phase5:micro:brick', brickGeo, mats.get('brick'), { cast: false, receive: true });
  const cans = b.instanced('phase5:micro:can', canGeo, mats.get('steelDark'), { cast: false, receive: true });
  const bags = b.instanced('phase5:micro:bag', bagGeo, mats.get('rubber'), { cast: true, receive: true });

  const pts = generateDensityCandidates(0x9d31a4, ENVIRONMENT_DENSITY_BUDGET.microCandidates, b.world.bounds, 4.5);
  let micro = 0;
  let bagCount = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const pos = new THREE.Vector3();

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (!clearGround(b, p.x, p.z, 0.22)) continue;
    const kind = i % 5;
    if (kind === 4 && bagCount < ENVIRONMENT_DENSITY_BUDGET.trashBagTarget) {
      const sc = 0.72 + (i % 7) * 0.045;
      bags.add(p.x, 0.2 * sc, p.z, p.rot, sc * 0.85, sc, sc * 0.92);
      bagCount++;
      micro++;
      continue;
    }

    // Build-time matrices allow small pieces to lie at different angles without adding runtime animation work.
    const rx = kind === 2 ? Math.PI / 2 + ((i % 3) - 1) * 0.16 : ((i % 5) - 2) * 0.035;
    const rz = ((i * 7) % 5 - 2) * 0.045;
    e.set(rx, p.rot, rz);
    q.setFromEuler(e);
    pos.set(p.x, kind === 2 ? 0.07 : 0.08, p.z);
    s.setScalar(p.scale * (kind === 0 ? 0.72 : 0.9));
    m.compose(pos, q, s);
    if (kind === 0 || kind === 3) shards.addMatrix(m);
    else if (kind === 1) bricks.addMatrix(m);
    else cans.addMatrix(m);
    micro++;
  }
  return { micro, bags: bagCount };
}

function addRubbleClusters(b: LevelBuilder): number {
  // Hand-authored anchors hug road edges / industrial margins. `big:false` means every piece stays step-over and non-colliding.
  const anchors = [
    [-54, 38, 1.7],
    [-38, 31, 1.9],
    [-16, 40, 1.6],
    [11, 39, 1.8],
    [36, 35, 1.7],
    [53, 20, 1.8],
    [49, -12, 1.9],
    [27, -42, 1.7],
    [-8, -43, 1.8],
    [-46, -29, 1.7],
  ] as const;
  let placed = 0;
  anchors.forEach(([x, z, radius], i) => {
    if (!clearGround(b, x, z, 0.7)) return;
    debris(b, { x, z, radius, density: 0.42 + (i % 3) * 0.08, seed: 5100 + i * 97, big: false });
    placed++;
  });
  return placed;
}

export function buildEnvironmentDensity(b: LevelBuilder, mats: MaterialLib): EnvironmentDensityStats {
  const decals = addGroundDecals(b, mats);
  const { micro, bags } = addMicroProps(b, mats);
  const rubbleClusters = addRubbleClusters(b);
  return { decals, microProps: micro, trashBags: bags, rubbleClusters };
}
