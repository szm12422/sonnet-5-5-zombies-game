import * as THREE from 'three';
import type { Game } from '../game/game';
import type { RuntimeBudget } from '../perf/runtimeBudget';
import type { BoxCollider } from '../world/collision';

export type EnvironmentPhase6Profile = RuntimeBudget['profile'];

export interface EnvironmentPhase6Preset {
  facadeBuildings: number;
  acUnits: number;
  wallServices: number;
  roofUnits: number;
  cableRoutes: number;
  signs: number;
  interiorPanels: number;
}

export interface EnvironmentPhase6Stats {
  drawCalls: number;
  facadeBuildings: number;
  acUnits: number;
  wallServices: number;
  roofUnits: number;
  cableSegments: number;
  signs: number;
  interiorPanels: number;
}

export function environmentPhase6Preset(profile: EnvironmentPhase6Profile): EnvironmentPhase6Preset {
  switch (profile) {
    case 'desktop':
      return { facadeBuildings: 14, acUnits: 20, wallServices: 30, roofUnits: 22, cableRoutes: 7, signs: 6, interiorPanels: 12 };
    case 'desktop-low':
      return { facadeBuildings: 11, acUnits: 15, wallServices: 22, roofUnits: 16, cableRoutes: 5, signs: 5, interiorPanels: 9 };
    case 'mobile':
      return { facadeBuildings: 8, acUnits: 10, wallServices: 15, roofUnits: 11, cableRoutes: 4, signs: 4, interiorPanels: 7 };
    case 'mobile-low':
      return { facadeBuildings: 5, acUnits: 6, wallServices: 9, roofUnits: 7, cableRoutes: 2, signs: 3, interiorPanels: 4 };
  }
}

/** Stable subset used by the runtime and unit tests. */
export function eligiblePhase6Buildings(colliders: readonly BoxCollider[], limit: number): BoxCollider[] {
  return colliders
    .filter((c) => c.mapKind === 'building' && c.y1 >= 3 && c.tag !== 'dock' && Math.max(c.hx, c.hz) >= 2.4)
    .sort((a, b) => a.id - b.id)
    .slice(0, Math.max(0, limit));
}

type MatrixBatch = THREE.Matrix4[];

const unitY = new THREE.Vector3(0, 1, 0);

function trs(x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, rx = 0, rz = 0): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, yaw, rz, 'YXZ'));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
}

function segmentMatrix(a: THREE.Vector3, b: THREE.Vector3, radius: number): THREE.Matrix4 {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const delta = b.clone().sub(a);
  const len = Math.max(0.001, delta.length());
  const q = new THREE.Quaternion().setFromUnitVectors(unitY, delta.multiplyScalar(1 / len));
  return new THREE.Matrix4().compose(mid, q, new THREE.Vector3(radius, len, radius));
}

function addInstanced(
  root: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  matrices: MatrixBatch,
  castShadow: boolean,
  receiveShadow: boolean,
): number {
  if (matrices.length === 0) {
    geometry.dispose();
    return 0;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]!);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.computeBoundingSphere();
  mesh.name = `EnvironmentPhase6:${name}`;
  root.add(mesh);
  return 1;
}

function localToWorld(c: BoxCollider, lx: number, lz: number): { x: number; z: number } {
  return {
    x: c.cx + c.cos * lx + c.sin * lz,
    z: c.cz - c.sin * lx + c.cos * lz,
  };
}

function facePoint(c: BoxCollider, along: number, outward: 1 | -1, face: 'z' | 'x'): { x: number; z: number; yaw: number } {
  if (face === 'z') {
    const p = localToWorld(c, along, outward * (c.hz + 0.055));
    return { ...p, yaw: c.rot + (outward > 0 ? 0 : Math.PI) };
  }
  const p = localToWorld(c, outward * (c.hx + 0.055), along);
  return { ...p, yaw: c.rot + (outward > 0 ? Math.PI / 2 : -Math.PI / 2) };
}

function addSagCable(batch: MatrixBatch, a: THREE.Vector3, b: THREE.Vector3, radius: number, sag = 0.55, steps = 4): void {
  let prev = a.clone();
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cur = new THREE.Vector3().lerpVectors(a, b, t);
    cur.y -= Math.sin(Math.PI * t) * sag;
    batch.push(segmentMatrix(prev, cur, radius));
    prev = cur;
  }
}

interface SignSpec {
  text: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  yaw: number;
  kind: 'warning' | 'store' | 'industrial';
}

const SIGNS: readonly SignSpec[] = [
  { text: '補給所', x: -22, y: 3.45, z: 28.72, w: 4.4, h: 0.82, yaw: 0, kind: 'store' },
  { text: '立入禁止', x: -12.08, y: 3.75, z: 39.5, w: 2.8, h: 0.72, yaw: -Math.PI / 2, kind: 'warning' },
  { text: '第4倉庫', x: 43.72, y: 5.1, z: 42.4, w: 3.8, h: 0.82, yaw: -Math.PI / 2, kind: 'industrial' },
  { text: '検疫区域', x: -38.95, y: 3.15, z: 39.8, w: 3.2, h: 0.76, yaw: Math.PI / 2, kind: 'warning' },
  { text: '避難経路', x: -30.1, y: 2.7, z: 28.9, w: 2.9, h: 0.68, yaw: 0, kind: 'industrial' },
  { text: '危険区域', x: 44.55, y: 2.8, z: 22.9, w: 3.0, h: 0.72, yaw: Math.PI / 2, kind: 'warning' },
] as const;

function addSigns(game: Game, root: THREE.Group, count: number): number {
  let added = 0;
  for (const s of SIGNS.slice(0, Math.max(0, count))) {
    const background = s.kind === 'warning' ? '#261b10' : s.kind === 'store' ? '#13242a' : '#14191c';
    const color = s.kind === 'warning' ? '#e6ad42' : s.kind === 'store' ? '#9edfe8' : '#d3dade';
    const mat = game.mats.stencil(s.text, { background, color, aspect: s.w / s.h, font: 'sans', worn: true, emissive: s.kind === 'store' });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
    mesh.position.set(s.x, s.y, s.z);
    mesh.rotation.y = s.yaw;
    mesh.renderOrder = 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.name = `EnvironmentPhase6:sign:${s.text}`;
    root.add(mesh);
    added++;
  }
  return added;
}

/**
 * Phase 6 adds static facade/roof/service detail only. It never registers colliders, lights, AI, ticks or post-processing.
 * Building shells and gameplay routes therefore remain identical to the authored level.
 */
export function installEnvironmentPhase6(game: Game, profile: EnvironmentPhase6Profile): EnvironmentPhase6Stats {
  const preset = environmentPhase6Preset(profile);
  const root = new THREE.Group();
  root.name = 'EnvironmentPhase6';
  game.level.root.add(root);

  const buildings = eligiblePhase6Buildings(game.level.world.colliders, preset.facadeBuildings);
  const facadeTrim: MatrixBatch = [];
  const acBoxes: MatrixBatch = [];
  const acFans: MatrixBatch = [];
  const pipes: MatrixBatch = [];
  const junctions: MatrixBatch = [];
  const roofBoxes: MatrixBatch = [];
  const roofCaps: MatrixBatch = [];
  const cableSegments: MatrixBatch = [];
  const interiorPanels: MatrixBatch = [];
  const interiorIndicators: MatrixBatch = [];

  let acCount = 0;
  let serviceCount = 0;
  let roofCount = 0;

  for (let bi = 0; bi < buildings.length; bi++) {
    const c = buildings[bi]!;
    const longFace: 'z' | 'x' = c.hx >= c.hz ? 'z' : 'x';
    const extent = longFace === 'z' ? c.hx : c.hz;
    const slots = Math.max(2, Math.min(5, Math.floor((extent * 2) / 3.4)));

    // Thin horizontal facade bands give window rows and floor divisions more depth without adding new glass layers.
    for (let floor = 1; floor <= Math.min(3, Math.floor((c.y1 - 0.5) / 2.8)); floor++) {
      const y = floor * 2.75;
      for (const outward of [-1, 1] as const) {
        const p = facePoint(c, 0, outward, longFace);
        if (longFace === 'z') facadeTrim.push(trs(p.x, y, p.z, p.yaw, extent * 1.7, 0.055, 0.055));
        else facadeTrim.push(trs(p.x, y, p.z, p.yaw, extent * 1.7, 0.055, 0.055));
      }
    }

    for (let si = 0; si < slots && acCount < preset.acUnits; si++) {
      if ((bi + si) % 2 !== 0) continue;
      const t = slots === 1 ? 0 : si / (slots - 1);
      const along = -extent * 0.68 + t * extent * 1.36;
      const outward: 1 | -1 = (bi + si) % 4 < 2 ? 1 : -1;
      const p = facePoint(c, along, outward, longFace);
      const y = Math.min(c.y1 - 0.8, 2.0 + ((bi + si) % 2) * 2.45);
      acBoxes.push(trs(p.x, y, p.z, p.yaw, 0.78, 0.55, 0.24));
      // fan disc sits just proud of the unit face
      const fan = localToWorld({ ...c, rot: p.yaw, cos: Math.cos(p.yaw), sin: Math.sin(p.yaw) } as BoxCollider, 0, 0.19);
      acFans.push(trs(fan.x + (p.x - c.cx) * 0.01, y, fan.z + (p.z - c.cz) * 0.01, p.yaw, 0.22, 0.22, 0.035, Math.PI / 2));
      acCount++;
    }

    if (serviceCount < preset.wallServices) {
      const face: 'z' | 'x' = bi % 3 === 0 ? (longFace === 'z' ? 'x' : 'z') : longFace;
      const extent2 = face === 'z' ? c.hx : c.hz;
      const outward: 1 | -1 = bi % 2 === 0 ? 1 : -1;
      const p = facePoint(c, extent2 * 0.62, outward, face);
      const height = Math.min(c.y1 - 0.7, 4.7 + (bi % 3) * 0.55);
      pipes.push(trs(p.x, height / 2 + 0.3, p.z, p.yaw, 0.05, height, 0.05));
      junctions.push(trs(p.x, 1.35, p.z, p.yaw, 0.34, 0.42, 0.14));
      serviceCount += 2;
    }

    if (roofCount < preset.roofUnits) {
      const offsetX = ((bi * 37) % 7 - 3) * Math.min(0.65, c.hx * 0.12);
      const offsetZ = ((bi * 19) % 5 - 2) * Math.min(0.7, c.hz * 0.15);
      const rp = localToWorld(c, offsetX, offsetZ);
      const sx = Math.min(1.45, Math.max(0.75, c.hx * 0.24));
      const sz = Math.min(1.1, Math.max(0.65, c.hz * 0.2));
      roofBoxes.push(trs(rp.x, c.y1 + 0.38, rp.z, c.rot, sx, 0.62, sz));
      roofCaps.push(trs(rp.x, c.y1 + 0.72, rp.z, c.rot, sx * 0.78, 0.08, sz * 0.78));
      roofCount++;
    }
  }

  // A few hand-authored service cable routes are segmented to create a shallow sag while remaining one instanced draw call.
  const cableRoutes: readonly [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-38, 7.2, 27.5), new THREE.Vector3(-29.5, 7.6, 28.3)],
    [new THREE.Vector3(-29.5, 7.6, 28.3), new THREE.Vector3(-14.5, 7.15, 29.2)],
    [new THREE.Vector3(-14.5, 7.15, 29.2), new THREE.Vector3(-7.6, 6.9, 29.8)],
    [new THREE.Vector3(43.5, 9.2, 27), new THREE.Vector3(54, 9.7, 27.5)],
    [new THREE.Vector3(54, 9.7, 27.5), new THREE.Vector3(63, 9.1, 28.4)],
    [new THREE.Vector3(-53, 7.8, -20), new THREE.Vector3(-39, 7.3, -20.5)],
    [new THREE.Vector3(-39, 7.3, -20.5), new THREE.Vector3(-27, 7.55, -20.1)],
  ];
  for (const [a, b] of cableRoutes.slice(0, preset.cableRoutes)) addSagCable(cableSegments, a, b, 0.016, 0.5, 4);

  // Wall-mounted interior service panels: intentionally thin and non-colliding so store/warehouse traversal is unchanged.
  const panelSpecs = [
    [-28.22, 1.45, 39.8, Math.PI / 2],
    [-15.72, 1.55, 38.9, -Math.PI / 2],
    [44.28, 1.6, 35.4, Math.PI / 2],
    [44.28, 1.6, 44.2, Math.PI / 2],
    [63.72, 1.7, 35.0, -Math.PI / 2],
    [63.72, 1.7, 45.0, -Math.PI / 2],
    [-37.8, 1.45, -31.0, Math.PI / 2],
    [-26.8, 1.45, -42.0, 0],
    [31.2, 1.45, -41.2, Math.PI],
    [39.1, 1.45, -31.5, -Math.PI / 2],
    [11.8, 1.45, -34.4, Math.PI / 2],
    [17.5, 1.45, -45.0, Math.PI],
  ] as const;
  for (const [x, y, z, yaw] of panelSpecs.slice(0, preset.interiorPanels)) {
    interiorPanels.push(trs(x, y, z, yaw, 0.48, 0.72, 0.09));
    const nx = Math.sin(yaw) * 0.055;
    const nz = Math.cos(yaw) * 0.055;
    interiorIndicators.push(trs(x + nx, y + 0.16, z + nz, yaw, 0.16, 0.08, 0.018));
  }

  let drawCalls = 0;
  drawCalls += addInstanced(root, 'facade-trim', new THREE.BoxGeometry(1, 1, 1), game.mats.get('steelDark'), facadeTrim, false, true);
  drawCalls += addInstanced(root, 'ac-boxes', new THREE.BoxGeometry(1, 1, 1), game.mats.get('labPanel'), acBoxes, true, true);
  const fanGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
  drawCalls += addInstanced(root, 'ac-fans', fanGeo, game.mats.get('steelDark'), acFans, false, true);
  drawCalls += addInstanced(root, 'service-pipes', new THREE.CylinderGeometry(1, 1, 1, 6, 1), game.mats.get('steelDark'), pipes, false, true);
  drawCalls += addInstanced(root, 'junction-boxes', new THREE.BoxGeometry(1, 1, 1), game.mats.get('metalPanel'), junctions, false, true);
  drawCalls += addInstanced(root, 'roof-units', new THREE.BoxGeometry(1, 1, 1), game.mats.get('metalPanel'), roofBoxes, true, true);
  drawCalls += addInstanced(root, 'roof-caps', new THREE.BoxGeometry(1, 1, 1), game.mats.get('steelDark'), roofCaps, false, true);
  drawCalls += addInstanced(root, 'service-cables', new THREE.CylinderGeometry(1, 1, 1, 5, 1), game.mats.get('rubber'), cableSegments, false, false);
  drawCalls += addInstanced(root, 'interior-panels', new THREE.BoxGeometry(1, 1, 1), game.mats.get('labPanel'), interiorPanels, false, true);
  drawCalls += addInstanced(root, 'interior-indicators', new THREE.BoxGeometry(1, 1, 1), game.mats.get('emAmber'), interiorIndicators, false, false);
  const signCount = addSigns(game, root, preset.signs);
  drawCalls += signCount;

  return {
    drawCalls,
    facadeBuildings: buildings.length,
    acUnits: acCount,
    wallServices: serviceCount,
    roofUnits: roofCount,
    cableSegments: cableSegments.length,
    signs: signCount,
    interiorPanels: interiorPanels.length,
  };
}
