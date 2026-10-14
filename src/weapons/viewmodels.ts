/**
 * First-person viewmodels. The five extended weapons reuse the three original fully animated rigs and only swap a
 * lightweight silhouette / attachment layer plus scale profile. This keeps reload/ADS/hand animation quality while
 * avoiding five more copies of the expensive hand and weapon meshes on mobile.
 */
import * as THREE from 'three';
import { createGrenade } from './viewmodel/grenade';
import { acquireTextures, releaseTextures } from './viewmodel/materials';
import { createPistol } from './viewmodel/pistol';
import { createPlate } from './viewmodel/plate';
import { createRifle } from './viewmodel/rifle';
import { createShotgun } from './viewmodel/shotgun';
import type { ViewmodelRig, ViewmodelSet } from './viewmodelTypes';

type RifleStyle = 'rifle' | 'smg' | 'lmg' | 'dmr';
type PistolStyle = 'pistol' | 'magnum';
type ShotgunStyle = 'shotgun' | 'autoshotgun';

function material(name: string, color: number, metalness = 0.72, roughness = 0.34): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 1.5, dithering: true });
  m.name = `extended-${name}`;
  return m;
}

function addBox(group: THREE.Group, mat: THREE.Material, size: [number, number, number], pos: [number, number, number]): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...pos);
  group.add(mesh);
  return mesh;
}

function addCylinder(
  group: THREE.Group,
  mat: THREE.Material,
  radius: number,
  length: number,
  pos: [number, number, number],
  segments = 12,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...pos);
  group.add(mesh);
  return mesh;
}

function addRing(
  group: THREE.Group,
  mat: THREE.Material,
  radius: number,
  tube: number,
  pos: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 14), mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...pos);
  group.add(mesh);
  return mesh;
}

function makeDecorations(rifle: ReturnType<typeof createRifle>, pistol: ReturnType<typeof createPistol>, shotgun: ReturnType<typeof createShotgun>) {
  const dark = material('dark-metal', 0x111619, 0.82, 0.28);
  const steel = material('machined-steel', 0x677276, 0.88, 0.2);
  const accent = material('blue-steel', 0x3c525c, 0.7, 0.28);
  const polymer = material('polymer', 0x20272a, 0.12, 0.52);
  const brass = material('brass', 0xb98a3f, 0.95, 0.2);
  const lens = new THREE.MeshStandardMaterial({
    color: 0x77b4c8,
    emissive: 0x081820,
    emissiveIntensity: 0.35,
    metalness: 0.15,
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    envMapIntensity: 2.4,
  });
  lens.name = 'extended-optic-lens';
  const groups: THREE.Group[] = [];
  const geoms: THREE.BufferGeometry[] = [];

  const group = (parent: THREE.Group, name: string): THREE.Group => {
    const g = new THREE.Group();
    g.name = name;
    g.visible = false;
    parent.add(g);
    groups.push(g);
    return g;
  };
  const track = (m: THREE.Mesh): THREE.Mesh => {
    geoms.push(m.geometry);
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  };

  // KX-9: compact receiver, short handguard, reflex sight and angled foregrip.
  const smg = group(rifle.gun, 'Extended:SMG');
  track(addCylinder(smg, dark, 0.019, 0.105, [0, -0.086, -0.555]));
  track(addBox(smg, accent, [0.058, 0.041, 0.13], [0, -0.075, -0.30]));
  track(addBox(smg, polymer, [0.048, 0.05, 0.075], [0, -0.132, -0.31]));
  const smgGrip = track(addBox(smg, polymer, [0.03, 0.085, 0.035], [0, -0.142, -0.39]));
  smgGrip.rotation.x = -0.28;
  track(addBox(smg, dark, [0.064, 0.012, 0.16], [0, -0.022, -0.20]));
  track(addBox(smg, dark, [0.052, 0.038, 0.046], [0, 0.008, -0.16]));
  track(addBox(smg, lens, [0.036, 0.027, 0.006], [0, 0.009, -0.185]));
  track(addRing(smg, steel, 0.021, 0.003, [0, -0.086, -0.615]));

  // MG-46: heavy barrel, box feed, heat shield, carry handle, bipod and muzzle brake.
  const lmg = group(rifle.gun, 'Extended:LMG');
  track(addBox(lmg, dark, [0.094, 0.118, 0.115], [0, -0.174, -0.04]));
  track(addBox(lmg, polymer, [0.081, 0.072, 0.17], [0, -0.095, -0.34]));
  track(addCylinder(lmg, steel, 0.024, 0.235, [0, -0.086, -0.655]));
  track(addCylinder(lmg, dark, 0.032, 0.16, [0, -0.086, -0.50]));
  track(addBox(lmg, dark, [0.071, 0.012, 0.23], [0, -0.026, -0.30]));
  const handle = track(addBox(lmg, steel, [0.012, 0.07, 0.16], [0.052, -0.005, -0.22]));
  handle.rotation.z = -0.12;
  const bipodL = track(addBox(lmg, steel, [0.008, 0.14, 0.008], [-0.047, -0.15, -0.43]));
  const bipodR = track(addBox(lmg, steel, [0.008, 0.14, 0.008], [0.047, -0.15, -0.43]));
  bipodL.rotation.z = -0.24;
  bipodR.rotation.z = 0.24;
  track(addBox(lmg, steel, [0.064, 0.035, 0.04], [0, -0.086, -0.79]));
  track(addBox(lmg, dark, [0.088, 0.025, 0.09], [0, -0.05, 0.16]));

  // MR-14: extended free-float front end, proper scope silhouette, cheek riser and precision muzzle device.
  const dmr = group(rifle.gun, 'Extended:DMR');
  track(addCylinder(dmr, dark, 0.0195, 0.255, [0, -0.086, -0.68]));
  track(addCylinder(dmr, accent, 0.031, 0.205, [0, -0.086, -0.46]));
  const scopeBody = track(addCylinder(dmr, steel, 0.022, 0.205, [0, 0.028, -0.14]));
  scopeBody.rotation.x = Math.PI / 2;
  const objective = track(addCylinder(dmr, dark, 0.03, 0.05, [0, 0.028, -0.245]));
  objective.rotation.x = Math.PI / 2;
  track(addCylinder(dmr, lens, 0.026, 0.008, [0, 0.028, -0.273]));
  track(addCylinder(dmr, lens, 0.019, 0.008, [0, 0.028, -0.03]));
  track(addBox(dmr, dark, [0.058, 0.022, 0.055], [0, 0.002, -0.14]));
  track(addBox(dmr, polymer, [0.064, 0.027, 0.17], [0, -0.032, 0.16]));
  track(addBox(dmr, dark, [0.068, 0.018, 0.24], [0, -0.025, -0.35]));
  track(addBox(dmr, steel, [0.052, 0.038, 0.055], [0, -0.086, -0.835]));

  // HX-44: oversized hand-cannon upper with compensator, underlug and prominent rear sight.
  const magnum = group(pistol.gun, 'Extended:Magnum');
  track(addCylinder(magnum, steel, 0.0165, 0.15, [0, -0.055, -0.385]));
  track(addBox(magnum, dark, [0.05, 0.038, 0.16], [0, -0.045, -0.255]));
  track(addBox(magnum, steel, [0.054, 0.055, 0.06], [0, -0.055, -0.46]));
  track(addBox(magnum, dark, [0.062, 0.018, 0.13], [0, 0.012, -0.22]));
  track(addBox(magnum, polymer, [0.054, 0.025, 0.075], [0, -0.085, -0.31]));
  track(addBox(magnum, brass, [0.01, 0.012, 0.018], [0, 0.025, -0.09]));

  // SG-12: gas-system / tube silhouette, box magazine, vented heat shield and raised combat sight.
  const autoShotgun = group(shotgun.gun, 'Extended:AutoShotgun');
  track(addCylinder(autoShotgun, dark, 0.016, 0.235, [0, -0.116, -0.60]));
  track(addCylinder(autoShotgun, steel, 0.012, 0.205, [0, -0.151, -0.52]));
  track(addBox(autoShotgun, accent, [0.068, 0.09, 0.095], [0, -0.17, -0.045]));
  track(addBox(autoShotgun, polymer, [0.061, 0.055, 0.19], [0, -0.095, -0.35]));
  track(addBox(autoShotgun, steel, [0.057, 0.025, 0.18], [0, -0.064, -0.34]));
  track(addBox(autoShotgun, dark, [0.068, 0.012, 0.19], [0, -0.025, -0.27]));
  track(addBox(autoShotgun, dark, [0.048, 0.038, 0.035], [0, 0.004, -0.13]));
  track(addBox(autoShotgun, lens, [0.032, 0.023, 0.005], [0, 0.005, -0.151]));
  track(addRing(autoShotgun, steel, 0.022, 0.003, [0, -0.094, -0.735]));

  let rifleStyle: RifleStyle = 'rifle';
  let pistolStyle: PistolStyle = 'pistol';
  let shotgunStyle: ShotgunStyle = 'shotgun';

  const setRifle = (style: RifleStyle): void => {
    if (rifleStyle === style) return;
    rifleStyle = style;
    smg.visible = style === 'smg';
    lmg.visible = style === 'lmg';
    dmr.visible = style === 'dmr';
    if (style === 'smg') rifle.gun.scale.set(0.89, 0.94, 0.82);
    else if (style === 'lmg') rifle.gun.scale.set(1.07, 1.07, 1.15);
    else if (style === 'dmr') rifle.gun.scale.set(1.0, 1.015, 1.14);
    else rifle.gun.scale.set(1, 1, 1);
  };

  const setPistol = (style: PistolStyle): void => {
    if (pistolStyle === style) return;
    pistolStyle = style;
    magnum.visible = style === 'magnum';
    pistol.gun.scale.set(style === 'magnum' ? 1.14 : 1, style === 'magnum' ? 1.09 : 1, style === 'magnum' ? 1.2 : 1);
  };

  const setShotgun = (style: ShotgunStyle): void => {
    if (shotgunStyle === style) return;
    shotgunStyle = style;
    autoShotgun.visible = style === 'autoshotgun';
    shotgun.gun.scale.set(style === 'autoshotgun' ? 0.99 : 1, style === 'autoshotgun' ? 1.04 : 1, style === 'autoshotgun' ? 0.96 : 1);
  };

  // Force initial state because the cached style variables start at the same names as the base style.
  rifleStyle = 'smg'; setRifle('rifle');
  pistolStyle = 'magnum'; setPistol('pistol');
  shotgunStyle = 'autoshotgun'; setShotgun('shotgun');

  return {
    setRifle,
    setPistol,
    setShotgun,
    dispose(): void {
      for (const g of groups) g.removeFromParent();
      for (const g of geoms) g.dispose();
      dark.dispose();
      steel.dispose();
      accent.dispose();
      polymer.dispose();
      brass.dispose();
      lens.dispose();
    },
  };
}

/**
 * Runtime aliases are exposed through getters. `WeaponId` remains intentionally unchanged for save compatibility, but
 * the weapon controller performs normal JS property access, so injected string IDs resolve to these aliases.
 */
export function createViewmodels(): ViewmodelSet {
  const tex = acquireTextures();
  const rifle = createRifle(tex);
  const pistol = createPistol(tex);
  const shotgun = createShotgun(tex);
  const grenade = createGrenade(tex);
  const plate = createPlate(tex);
  const deco = makeDecorations(rifle, pistol, shotgun);
  let disposed = false;

  const target: Record<string, unknown> = {
    grenade,
    plate,
    dispose() {
      if (disposed) return;
      disposed = true;
      deco.dispose();
      for (const r of [rifle, pistol, shotgun, grenade, plate]) r.dispose();
      releaseTextures();
    },
  };

  Object.defineProperties(target, {
    rifle: { enumerable: true, get: () => { deco.setRifle('rifle'); return rifle; } },
    smg: { enumerable: true, get: () => { deco.setRifle('smg'); return rifle; } },
    lmg: { enumerable: true, get: () => { deco.setRifle('lmg'); return rifle; } },
    dmr: { enumerable: true, get: () => { deco.setRifle('dmr'); return rifle; } },
    pistol: { enumerable: true, get: () => { deco.setPistol('pistol'); return pistol; } },
    magnum: { enumerable: true, get: () => { deco.setPistol('magnum'); return pistol; } },
    shotgun: { enumerable: true, get: () => { deco.setShotgun('shotgun'); return shotgun; } },
    autoshotgun: { enumerable: true, get: () => { deco.setShotgun('autoshotgun'); return shotgun; } },
  });

  return target as unknown as ViewmodelSet & Record<string, ViewmodelRig>;
}
