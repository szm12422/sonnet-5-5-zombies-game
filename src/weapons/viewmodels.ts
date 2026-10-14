/**
 * First-person viewmodels. The five extended weapons reuse the three original fully animated rigs and only swap a
 * lightweight silhouette layer / scale profile. This keeps reload/ADS/hand animation quality while avoiding five more
 * copies of the expensive hand and weapon meshes on mobile.
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

function material(color: number, metalness = 0.72, roughness = 0.34): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
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
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...pos);
  group.add(mesh);
  return mesh;
}

function makeDecorations(rifle: ReturnType<typeof createRifle>, pistol: ReturnType<typeof createPistol>, shotgun: ReturnType<typeof createShotgun>) {
  const dark = material(0x151a1b, 0.78, 0.3);
  const steel = material(0x555f62, 0.84, 0.25);
  const accent = material(0x42565d, 0.62, 0.32);
  const groups: THREE.Group[] = [];
  const geoms: THREE.BufferGeometry[] = [];

  const group = (parent: THREE.Group): THREE.Group => {
    const g = new THREE.Group();
    g.visible = false;
    parent.add(g);
    groups.push(g);
    return g;
  };
  const track = (m: THREE.Mesh): THREE.Mesh => {
    geoms.push(m.geometry);
    return m;
  };

  const smg = group(rifle.gun);
  track(addCylinder(smg, dark, 0.017, 0.12, [0, -0.086, -0.57]));
  track(addBox(smg, accent, [0.052, 0.034, 0.095], [0, -0.075, -0.26]));

  const lmg = group(rifle.gun);
  track(addBox(lmg, dark, [0.086, 0.11, 0.105], [0, -0.17, -0.05]));
  track(addCylinder(lmg, steel, 0.022, 0.18, [0, -0.086, -0.63]));
  const bipodL = track(addBox(lmg, steel, [0.008, 0.12, 0.008], [-0.045, -0.14, -0.42]));
  const bipodR = track(addBox(lmg, steel, [0.008, 0.12, 0.008], [0.045, -0.14, -0.42]));
  bipodL.rotation.z = -0.22;
  bipodR.rotation.z = 0.22;

  const dmr = group(rifle.gun);
  track(addCylinder(dmr, dark, 0.019, 0.2, [0, -0.086, -0.65]));
  const scope = track(addCylinder(dmr, steel, 0.022, 0.17, [0, 0.025, -0.12]));
  scope.rotation.x = Math.PI / 2;
  track(addBox(dmr, dark, [0.052, 0.02, 0.04], [0, 0.004, -0.12]));

  const magnum = group(pistol.gun);
  track(addCylinder(magnum, steel, 0.015, 0.12, [0, -0.055, -0.37]));
  track(addBox(magnum, dark, [0.045, 0.035, 0.12], [0, -0.045, -0.24]));

  const autoShotgun = group(shotgun.gun);
  track(addCylinder(autoShotgun, dark, 0.015, 0.2, [0, -0.115, -0.58]));
  track(addBox(autoShotgun, accent, [0.064, 0.085, 0.085], [0, -0.17, -0.04]));
  track(addBox(autoShotgun, steel, [0.052, 0.028, 0.15], [0, -0.07, -0.34]));

  let rifleStyle: RifleStyle = 'rifle';
  let pistolStyle: PistolStyle = 'pistol';
  let shotgunStyle: ShotgunStyle = 'shotgun';

  const setRifle = (style: RifleStyle): void => {
    if (rifleStyle === style) return;
    rifleStyle = style;
    smg.visible = style === 'smg';
    lmg.visible = style === 'lmg';
    dmr.visible = style === 'dmr';
    if (style === 'smg') rifle.gun.scale.set(0.9, 0.94, 0.84);
    else if (style === 'lmg') rifle.gun.scale.set(1.06, 1.06, 1.13);
    else if (style === 'dmr') rifle.gun.scale.set(1.0, 1.01, 1.12);
    else rifle.gun.scale.set(1, 1, 1);
  };

  const setPistol = (style: PistolStyle): void => {
    if (pistolStyle === style) return;
    pistolStyle = style;
    magnum.visible = style === 'magnum';
    pistol.gun.scale.set(style === 'magnum' ? 1.13 : 1, style === 'magnum' ? 1.08 : 1, style === 'magnum' ? 1.18 : 1);
  };

  const setShotgun = (style: ShotgunStyle): void => {
    if (shotgunStyle === style) return;
    shotgunStyle = style;
    autoShotgun.visible = style === 'autoshotgun';
    shotgun.gun.scale.set(style === 'autoshotgun' ? 0.98 : 1, style === 'autoshotgun' ? 1.03 : 1, style === 'autoshotgun' ? 0.95 : 1);
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
