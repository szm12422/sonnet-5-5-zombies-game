import * as THREE from 'three';
import type { Game } from '../game/game';
import type { RuntimeBudget } from '../perf/runtimeBudget';
import { generateDensityCandidates } from '../world/environmentDensity';

export type EnvironmentPhase5Profile = RuntimeBudget['profile'];

export interface EnvironmentPhase5Preset {
  decals: number;
  micro: number;
  bags: number;
  coils: number;
}

export interface EnvironmentPhase5Stats {
  drawCalls: number;
  decals: number;
  microProps: number;
}

export function environmentPhase5Preset(profile: EnvironmentPhase5Profile): EnvironmentPhase5Preset {
  switch (profile) {
    case 'desktop':
      return { decals: 96, micro: 112, bags: 24, coils: 18 };
    case 'desktop-low':
      return { decals: 76, micro: 88, bags: 18, coils: 14 };
    case 'mobile':
      return { decals: 58, micro: 66, bags: 14, coils: 10 };
    case 'mobile-low':
      return { decals: 38, micro: 46, bags: 10, coils: 6 };
  }
}

type Placement = { x: number; y: number; z: number; rot: number; sx: number; sy: number; sz: number; tiltX?: number; tiltZ?: number };

function placeInstanced(
  root: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: Placement[],
  castShadow: boolean,
  receiveShadow: boolean,
): number {
  if (placements.length === 0) {
    geometry.dispose();
    return 0;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  const m = new THREE.Matrix4();
  for (let i = 0; i < placements.length; i++) {
    const v = placements[i]!;
    p.set(v.x, v.y, v.z);
    s.set(v.sx, v.sy, v.sz);
    e.set(v.tiltX ?? 0, v.rot, v.tiltZ ?? 0);
    q.setFromEuler(e);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.name = `EnvironmentPhase5:${name}`;
  root.add(mesh);
  return 1;
}

const clearGround = (game: Game, x: number, z: number, radius: number): boolean =>
  !game.level.world.circleBlocked(x, z, radius, 0.02, 0.72);

/**
 * Adds presentation-only urban dressing after the level is built.
 * Nothing here registers collision or enters the nav grid: all pieces are low enough to step over and only increase visual density.
 */
export function installEnvironmentPhase5(game: Game, profile: EnvironmentPhase5Profile): EnvironmentPhase5Stats {
  const preset = environmentPhase5Preset(profile);
  const root = new THREE.Group();
  root.name = 'EnvironmentPhase5';
  game.level.root.add(root);

  let drawCalls = 0;
  let decalCount = 0;
  let microCount = 0;
  const bounds = game.level.world.bounds;

  // Ground storytelling: grime, cracked asphalt, old blood and shallow puddles. Kept in four material batches.
  const decalKinds = [
    { name: 'oil', material: game.mats.decal('oilStain'), base: 1.05 },
    { name: 'crack', material: game.mats.decal('crackLarge'), base: 1.35 },
    { name: 'puddle', material: game.mats.decal('puddle'), base: 1.55 },
    { name: 'blood', material: game.mats.decal('bloodOld1'), base: 0.9 },
  ] as const;
  const decalPlacements = decalKinds.map(() => [] as Placement[]);
  const decalPts = generateDensityCandidates(0x51a7e5, preset.decals * 2, bounds, 4.2);
  for (let i = 0; i < decalPts.length && decalCount < preset.decals; i++) {
    const p = decalPts[i]!;
    if (!clearGround(game, p.x, p.z, 0.48)) continue;
    const kind = decalCount % decalKinds.length;
    const def = decalKinds[kind]!;
    const sx = def.base * p.scale * (0.86 + ((i * 13) % 9) * 0.035);
    const sz = def.base * p.scale * (0.74 + ((i * 7) % 11) * 0.034);
    decalPlacements[kind]!.push({ x: p.x, y: 0.026 + kind * 0.001, z: p.z, rot: p.rot, sx, sy: 1, sz });
    decalCount++;
  }
  for (let i = 0; i < decalKinds.length; i++) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    drawCalls += placeInstanced(root, `decal:${decalKinds[i]!.name}`, g, decalKinds[i]!.material, decalPlacements[i]!, false, false);
  }

  // Step-over rubble, bricks and discarded cans. Geometry is low-poly and one InstancedMesh per material/shape.
  const shardGeo = new THREE.TetrahedronGeometry(0.18, 0);
  shardGeo.scale(1.5, 0.55, 1.05);
  const brickGeo = new THREE.BoxGeometry(0.28, 0.11, 0.14);
  const canGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.18, 6, 1);
  const bagGeo = new THREE.IcosahedronGeometry(0.27, 1);
  const coilGeo = new THREE.TorusGeometry(0.24, 0.035, 5, 10);

  const shards: Placement[] = [];
  const bricks: Placement[] = [];
  const cans: Placement[] = [];
  const bags: Placement[] = [];
  const coils: Placement[] = [];
  const microPts = generateDensityCandidates(0x9d31a4, (preset.micro + preset.bags + preset.coils) * 3, bounds, 4.5);
  let bagCount = 0;
  let coilCount = 0;
  let baseCount = 0;
  for (let i = 0; i < microPts.length; i++) {
    if (baseCount >= preset.micro && bagCount >= preset.bags && coilCount >= preset.coils) break;
    const p = microPts[i]!;
    if (!clearGround(game, p.x, p.z, 0.24)) continue;

    if (bagCount < preset.bags && i % 9 === 0) {
      const sc = 0.72 + (i % 7) * 0.045;
      bags.push({ x: p.x, y: 0.2 * sc, z: p.z, rot: p.rot, sx: sc * 0.85, sy: sc, sz: sc * 0.92, tiltZ: ((i % 3) - 1) * 0.08 });
      bagCount++;
      continue;
    }
    if (coilCount < preset.coils && i % 13 === 0) {
      const sc = 0.7 + (i % 5) * 0.08;
      coils.push({ x: p.x, y: 0.08, z: p.z, rot: p.rot, sx: sc, sy: sc, sz: sc, tiltX: Math.PI / 2 + ((i % 3) - 1) * 0.12 });
      coilCount++;
      continue;
    }
    if (baseCount >= preset.micro) continue;
    const kind = baseCount % 3;
    const sc = p.scale * (kind === 0 ? 0.72 : 0.9);
    const v: Placement = {
      x: p.x,
      y: kind === 2 ? 0.07 : 0.08,
      z: p.z,
      rot: p.rot,
      sx: sc,
      sy: sc,
      sz: sc,
      tiltX: kind === 2 ? Math.PI / 2 + ((i % 3) - 1) * 0.16 : ((i % 5) - 2) * 0.035,
      tiltZ: (((i * 7) % 5) - 2) * 0.045,
    };
    if (kind === 0) shards.push(v);
    else if (kind === 1) bricks.push(v);
    else cans.push(v);
    baseCount++;
  }

  drawCalls += placeInstanced(root, 'rubble', shardGeo, game.mats.get('rubble'), shards, false, true);
  drawCalls += placeInstanced(root, 'bricks', brickGeo, game.mats.get('brick'), bricks, false, true);
  drawCalls += placeInstanced(root, 'cans', canGeo, game.mats.get('steelDark'), cans, false, true);
  drawCalls += placeInstanced(root, 'bags', bagGeo, game.mats.get('rubber'), bags, true, true);
  drawCalls += placeInstanced(root, 'coils', coilGeo, game.mats.get('rubber'), coils, false, true);
  microCount = shards.length + bricks.length + cans.length + bags.length + coils.length;

  return { drawCalls, decals: decalCount, microProps: microCount };
}
