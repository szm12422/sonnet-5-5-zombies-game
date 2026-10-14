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
    case 'desktop': return { facadeBuildings: 14, acUnits: 20, wallServices: 28, roofUnits: 20, cableRoutes: 7, signs: 6, interiorPanels: 12 };
    case 'desktop-low': return { facadeBuildings: 11, acUnits: 15, wallServices: 21, roofUnits: 15, cableRoutes: 5, signs: 5, interiorPanels: 9 };
    case 'mobile': return { facadeBuildings: 8, acUnits: 10, wallServices: 14, roofUnits: 10, cableRoutes: 4, signs: 4, interiorPanels: 7 };
    case 'mobile-low': return { facadeBuildings: 5, acUnits: 6, wallServices: 8, roofUnits: 6, cableRoutes: 2, signs: 3, interiorPanels: 4 };
  }
}

export function eligiblePhase6Buildings(colliders: readonly BoxCollider[], limit: number): BoxCollider[] {
  return colliders
    .filter((c) => c.mapKind === 'building' && c.y1 >= 3 && c.tag !== 'dock' && Math.max(c.hx, c.hz) >= 2.4)
    .sort((a, b) => a.id - b.id)
    .slice(0, Math.max(0, limit));
}

type Batch = THREE.Matrix4[];
const UNIT_Y = new THREE.Vector3(0, 1, 0);

function trs(x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
}

function segmentMatrix(a: THREE.Vector3, b: THREE.Vector3, radius: number): THREE.Matrix4 {
  const delta = b.clone().sub(a);
  const len = Math.max(0.001, delta.length());
  const q = new THREE.Quaternion().setFromUnitVectors(UNIT_Y, delta.clone().multiplyScalar(1 / len));
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(radius, len, radius));
}

function addInstanced(root: THREE.Group, name: string, geo: THREE.BufferGeometry, mat: THREE.Material, matrices: Batch, cast = false, receive = true): number {
  if (matrices.length === 0) {
    geo.dispose();
    return 0;
  }
  const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
  for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]!);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.computeBoundingSphere();
  mesh.name = `EnvironmentPhase6:${name}`;
  root.add(mesh);
  return 1;
}

function localToWorld(c: BoxCollider, lx: number, lz: number): { x: number; z: number } {
  return { x: c.cx + c.cos * lx + c.sin * lz, z: c.cz - c.sin * lx + c.cos * lz };
}

function facePoint(c: BoxCollider, along: number, outward: 1 | -1, face: 'z' | 'x'): { x: number; z: number; yaw: number } {
  if (face === 'z') {
    const p = localToWorld(c, along, outward * (c.hz + 0.06));
    return { ...p, yaw: c.rot + (outward > 0 ? 0 : Math.PI) };
  }
  const p = localToWorld(c, outward * (c.hx + 0.06), along);
  return { ...p, yaw: c.rot + (outward > 0 ? Math.PI / 2 : -Math.PI / 2) };
}

function addSagCable(batch: Batch, a: THREE.Vector3, b: THREE.Vector3, radius = 0.016, sag = 0.5, steps = 4): void {
  let prev = a.clone();
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cur = new THREE.Vector3().lerpVectors(a, b, t);
    cur.y -= Math.sin(Math.PI * t) * sag;
    batch.push(segmentMatrix(prev, cur, radius));
    prev = cur;
  }
}

const SIGNS = [
  { text: '補給所', x: -22, y: 3.45, z: 28.72, w: 4.4, h: 0.82, yaw: 0, warning: false },
  { text: '立入禁止', x: -12.08, y: 3.75, z: 39.5, w: 2.8, h: 0.72, yaw: -Math.PI / 2, warning: true },
  { text: '第4倉庫', x: 43.72, y: 5.1, z: 42.4, w: 3.8, h: 0.82, yaw: -Math.PI / 2, warning: false },
  { text: '検疫区域', x: -38.95, y: 3.15, z: 39.8, w: 3.2, h: 0.76, yaw: Math.PI / 2, warning: true },
  { text: '避難経路', x: -30.1, y: 2.7, z: 28.9, w: 2.9, h: 0.68, yaw: 0, warning: false },
  { text: '危険区域', x: 44.55, y: 2.8, z: 22.9, w: 3.0, h: 0.72, yaw: Math.PI / 2, warning: true },
] as const;

function addSigns(game: Game, root: THREE.Group, count: number): number {
  let added = 0;
  for (const s of SIGNS.slice(0, count)) {
    const mat = game.mats.stencil(s.text, {
      background: s.warning ? '#261b10' : '#14191c',
      color: s.warning ? '#e6ad42' : '#cfe2e5',
      aspect: s.w / s.h,
      font: 'sans',
      worn: true,
      emissive: s.text === '補給所',
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
    mesh.position.set(s.x, s.y, s.z);
    mesh.rotation.y = s.yaw;
    mesh.renderOrder = 2;
    mesh.name = `EnvironmentPhase6:sign:${s.text}`;
    root.add(mesh);
    added++;
  }
  return added;
}

export function installEnvironmentPhase6(game: Game, profile: EnvironmentPhase6Profile): EnvironmentPhase6Stats {
  const preset = environmentPhase6Preset(profile);
  const root = new THREE.Group();
  root.name = 'EnvironmentPhase6';
  game.level.root.add(root);

  const buildings = eligiblePhase6Buildings(game.level.world.colliders, preset.facadeBuildings);
  const trim: Batch = [];
  const acBoxes: Batch = [];
  const acFans: Batch = [];
  const pipes: Batch = [];
  const junctions: Batch = [];
  const roofBoxes: Batch = [];
  const roofCaps: Batch = [];
  const cables: Batch = [];
  const panels: Batch = [];
  const indicators: Batch = [];
  let acCount = 0;
  let serviceCount = 0;
  let roofCount = 0;

  for (let bi = 0; bi < buildings.length; bi++) {
    const c = buildings[bi]!;
    const longFace: 'z' | 'x' = c.hx >= c.hz ? 'z' : 'x';
    const extent = longFace === 'z' ? c.hx : c.hz;

    for (let floor = 1; floor <= Math.min(3, Math.floor((c.y1 - 0.5) / 2.8)); floor++) {
      const y = floor * 2.75;
      for (const outward of [-1, 1] as const) {
        const p = facePoint(c, 0, outward, longFace);
        trim.push(trs(p.x, y, p.z, p.yaw, extent * 1.7, 0.055, 0.055));
      }
    }

    const slots = Math.max(2, Math.min(5, Math.floor((extent * 2) / 3.4)));
    for (let si = 0; si < slots && acCount < preset.acUnits; si++) {
      if ((bi + si) % 2 !== 0) continue;
      const t = si / Math.max(1, slots - 1);
      const along = -extent * 0.68 + t * extent * 1.36;
      const outward: 1 | -1 = (bi + si) % 4 < 2 ? 1 : -1;
      const p = facePoint(c, along, outward, longFace);
      const y = Math.min(c.y1 - 0.8, 2.0 + ((bi + si) % 2) * 2.45);
      acBoxes.push(trs(p.x, y, p.z, p.yaw, 0.78, 0.55, 0.24));
      const normal = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
      const a = new THREE.Vector3(p.x, y, p.z).addScaledVector(normal, 0.14);
      const b = a.clone().addScaledVector(normal, 0.05);
      acFans.push(segmentMatrix(a, b, 0.21));
      acCount++;
    }

    if (serviceCount < preset.wallServices) {
      const face: 'z' | 'x' = bi % 3 === 0 ? (longFace === 'z' ? 'x' : 'z') : longFace;
      const e = face === 'z' ? c.hx : c.hz;
      const p = facePoint(c, e * 0.62, bi % 2 === 0 ? 1 : -1, face);
      const h = Math.min(c.y1 - 0.7, 4.7 + (bi % 3) * 0.55);
      const normal = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
      const x = p.x + normal.x * 0.04;
      const z = p.z + normal.z * 0.04;
      pipes.push(trs(x, h / 2 + 0.3, z, p.yaw, 0.05, h, 0.05));
      junctions.push(trs(x, 1.35, z, p.yaw, 0.34, 0.42, 0.14));
      serviceCount += 2;
    }

    if (roofCount < preset.roofUnits) {
      const rp = localToWorld(c, ((bi * 37) % 7 - 3) * Math.min(0.65, c.hx * 0.12), ((bi * 19) % 5 - 2) * Math.min(0.7, c.hz * 0.15));
      const sx = Math.min(1.45, Math.max(0.75, c.hx * 0.24));
      const sz = Math.min(1.1, Math.max(0.65, c.hz * 0.2));
      roofBoxes.push(trs(rp.x, c.y1 + 0.38, rp.z, c.rot, sx, 0.62, sz));
      roofCaps.push(trs(rp.x, c.y1 + 0.72, rp.z, c.rot, sx * 0.78, 0.08, sz * 0.78));
      roofCount++;
    }
  }

  const cableRoutes: readonly [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-38, 7.2, 27.5), new THREE.Vector3(-29.5, 7.6, 28.3)],
    [new THREE.Vector3(-29.5, 7.6, 28.3), new THREE.Vector3(-14.5, 7.15, 29.2)],
    [new THREE.Vector3(-14.5, 7.15, 29.2), new THREE.Vector3(-7.6, 6.9, 29.8)],
    [new THREE.Vector3(43.5, 9.2, 27), new THREE.Vector3(54, 9.7, 27.5)],
    [new THREE.Vector3(54, 9.7, 27.5), new THREE.Vector3(63, 9.1, 28.4)],
    [new THREE.Vector3(-53, 7.8, -20), new THREE.Vector3(-39, 7.3, -20.5)],
    [new THREE.Vector3(-39, 7.3, -20.5), new THREE.Vector3(-27, 7.55, -20.1)],
  ];
  for (const [a, b] of cableRoutes.slice(0, preset.cableRoutes)) addSagCable(cables, a, b);

  const panelSpecs = [
    [-28.22, 1.45, 39.8, Math.PI / 2], [-15.72, 1.55, 38.9, -Math.PI / 2],
    [44.28, 1.6, 35.4, Math.PI / 2], [44.28, 1.6, 44.2, Math.PI / 2],
    [63.72, 1.7, 35.0, -Math.PI / 2], [63.72, 1.7, 45.0, -Math.PI / 2],
    [-37.8, 1.45, -31.0, Math.PI / 2], [-26.8, 1.45, -42.0, 0],
    [31.2, 1.45, -41.2, Math.PI], [39.1, 1.45, -31.5, -Math.PI / 2],
    [11.8, 1.45, -34.4, Math.PI / 2], [17.5, 1.45, -45.0, Math.PI],
  ] as const;
  for (const [x, y, z, yaw] of panelSpecs.slice(0, preset.interiorPanels)) {
    panels.push(trs(x, y, z, yaw, 0.48, 0.72, 0.09));
    const nx = Math.sin(yaw) * 0.055;
    const nz = Math.cos(yaw) * 0.055;
    indicators.push(trs(x + nx, y + 0.16, z + nz, yaw, 0.16, 0.08, 0.018));
  }

  let drawCalls = 0;
  drawCalls += addInstanced(root, 'facade-trim', new THREE.BoxGeometry(1, 1, 1), game.mats.get('steelDark'), trim);
  drawCalls += addInstanced(root, 'ac-boxes', new THREE.BoxGeometry(1, 1, 1), game.mats.get('labPanel'), acBoxes, true);
  drawCalls += addInstanced(root, 'ac-fans', new THREE.CylinderGeometry(1, 1, 1, 10, 1), game.mats.get('steelDark'), acFans);
  drawCalls += addInstanced(root, 'service-pipes', new THREE.CylinderGeometry(1, 1, 1, 6, 1), game.mats.get('steelDark'), pipes);
  drawCalls += addInstanced(root, 'junction-boxes', new THREE.BoxGeometry(1, 1, 1), game.mats.get('metalPanel'), junctions);
  drawCalls += addInstanced(root, 'roof-units', new THREE.BoxGeometry(1, 1, 1), game.mats.get('metalPanel'), roofBoxes, true);
  drawCalls += addInstanced(root, 'roof-caps', new THREE.BoxGeometry(1, 1, 1), game.mats.get('steelDark'), roofCaps);
  drawCalls += addInstanced(root, 'service-cables', new THREE.CylinderGeometry(1, 1, 1, 5, 1), game.mats.get('rubber'), cables, false, false);
  drawCalls += addInstanced(root, 'interior-panels', new THREE.BoxGeometry(1, 1, 1), game.mats.get('labPanel'), panels);
  drawCalls += addInstanced(root, 'interior-indicators', new THREE.BoxGeometry(1, 1, 1), game.mats.get('emAmber'), indicators, false, false);
  const signs = addSigns(game, root, preset.signs);
  drawCalls += signs;

  return {
    drawCalls,
    facadeBuildings: buildings.length,
    acUnits: acCount,
    wallServices: serviceCount,
    roofUnits: roofCount,
    cableSegments: cables.length,
    signs,
    interiorPanels: panels.length,
  };
}
