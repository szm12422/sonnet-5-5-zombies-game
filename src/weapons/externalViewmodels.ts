import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Game } from '../game/game';
import type { ViewmodelPose, ViewmodelRig } from './viewmodelTypes';
import type { ExtraWeaponId } from './extraWeapons';

export interface ExternalWeaponAssetSpec {
  id: ExtraWeaponId;
  file: string;
  targetLength: number;
  rearZ: number;
  topY: number;
  adsPush: number;
  adsScale: number;
  reloadPush: number;
  family: 'rifle' | 'pistol' | 'shotgun';
}

/**
 * All five models originate from the same CC0 Quaternius Toon Shooter Game Kit export set.
 * The build script pins and integrity-checks the source files before Vite packages them.
 *
 * `rearZ` deliberately stays close to the sight origin. The original procedural rigs apply
 * non-uniform style scaling to extended weapons, so the runtime layer compensates that parent
 * scale and then applies a dedicated ADS/reload clearance profile to the external model only.
 */
export const EXTERNAL_WEAPON_ASSETS: readonly ExternalWeaponAssetSpec[] = [
  {
    id: 'smg',
    file: 'kx9-smg.glb',
    targetLength: 0.58,
    rearZ: 0.065,
    topY: 0.014,
    adsPush: 0.13,
    adsScale: 0.94,
    reloadPush: 0.065,
    family: 'rifle',
  },
  {
    id: 'lmg',
    file: 'mg46-lmg.glb',
    targetLength: 0.82,
    rearZ: 0.075,
    topY: 0.014,
    adsPush: 0.18,
    adsScale: 0.91,
    reloadPush: 0.09,
    family: 'rifle',
  },
  {
    id: 'dmr',
    file: 'mr14-dmr.glb',
    targetLength: 0.88,
    rearZ: 0.07,
    topY: 0.026,
    adsPush: 0.21,
    adsScale: 0.9,
    reloadPush: 0.08,
    family: 'rifle',
  },
  {
    id: 'magnum',
    file: 'hx44-magnum.glb',
    targetLength: 0.38,
    rearZ: 0.035,
    topY: 0.01,
    adsPush: 0.125,
    adsScale: 0.92,
    reloadPush: 0.06,
    family: 'pistol',
  },
  {
    id: 'autoshotgun',
    file: 'sg12-autoshotgun.glb',
    targetLength: 0.82,
    rearZ: 0.075,
    topY: 0.014,
    adsPush: 0.16,
    adsScale: 0.93,
    reloadPush: 0.09,
    family: 'shotgun',
  },
] as const;

export function externalWeaponAssetUrl(file: string, base = import.meta.env.BASE_URL): string {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}assets/weapons/${file}`;
}

type RigWithGun = ViewmodelRig & {
  gun: THREE.Group;
  muzzle: THREE.Object3D;
  ejectPort: THREE.Object3D;
};

type PatchedRig = {
  rig: RigWithGun;
  originals: THREE.Object3D[];
  originalUpdate: (pose: ViewmodelPose, dt: number) => void;
  assets: Map<ExtraWeaponId, THREE.Group>;
  specs: Map<ExtraWeaponId, ExternalWeaponAssetSpec>;
};

export interface ExternalViewmodelHandle {
  readonly ready: Promise<void>;
  dispose(): void;
}

const GUNMETAL = new THREE.Color(0x263039);

function tuneMaterial(source: THREE.Material): THREE.Material {
  const m = source.clone();
  const pbr = m as THREE.MeshStandardMaterial;

  if ('color' in pbr && pbr.color instanceof THREE.Color) {
    const c = pbr.color;
    const luma = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
    const gunmetalMix = luma > 0.62 ? 0.48 : luma > 0.38 ? 0.34 : 0.18;
    c.lerp(GUNMETAL, gunmetalMix);
    if (luma > 0.62) c.multiplyScalar(0.82);
  }
  if ('envMapIntensity' in pbr) pbr.envMapIntensity = Math.max(1.2, pbr.envMapIntensity || 0);
  if ('roughness' in pbr && typeof pbr.roughness === 'number') {
    pbr.roughness = THREE.MathUtils.clamp(pbr.roughness, 0.3, 0.62);
  }
  if ('metalness' in pbr && typeof pbr.metalness === 'number') {
    pbr.metalness = THREE.MathUtils.clamp(pbr.metalness + 0.08, 0.26, 0.82);
  }
  return m;
}

function normalizeModel(scene: THREE.Group, spec: ExternalWeaponAssetSpec): THREE.Group {
  const root = new THREE.Group();
  root.name = `ExternalWeapon:${spec.id}`;

  // Quaternius standalone exports are side-on with the muzzle pointing -X.
  // Gun-space in this project points the muzzle down -Z.
  scene.rotation.y = -Math.PI / 2;
  scene.updateMatrixWorld(true);

  let box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const length = Math.max(0.001, size.z);
  const scale = spec.targetLength / length;
  scene.scale.multiplyScalar(scale);
  scene.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x -= center.x;
  scene.position.y += spec.topY - box.max.y;
  scene.position.z += spec.rearZ - box.max.z;

  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.frustumCulled = false;
    obj.material = Array.isArray(obj.material) ? obj.material.map(tuneMaterial) : tuneMaterial(obj.material);
  });

  root.add(scene);
  addRoleDetails(root, spec.id);
  root.visible = false;
  return root;
}

function detailMaterial(color: number, metalness: number, roughness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 1.45, dithering: true });
}

function addBox(
  root: THREE.Group,
  material: THREE.Material,
  size: [number, number, number],
  pos: [number, number, number],
  rotZ = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos);
  mesh.rotation.z = rotZ;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  root.add(mesh);
  return mesh;
}

function addRoleDetails(root: THREE.Group, id: ExtraWeaponId): void {
  if (id !== 'lmg' && id !== 'autoshotgun') return;
  const dark = detailMaterial(0x151a1c, 0.58, 0.4);
  const steel = detailMaterial(0x515b5e, 0.8, 0.27);
  dark.name = `external-${id}-dark`;
  steel.name = `external-${id}-steel`;

  if (id === 'lmg') {
    // Same-pack rifle converted into a recognisable support weapon silhouette.
    addBox(root, dark, [0.13, 0.16, 0.14], [0, -0.13, -0.025], 0.04);
    const left = addBox(root, steel, [0.012, 0.16, 0.012], [-0.055, -0.135, -0.47], -0.25);
    const right = addBox(root, steel, [0.012, 0.16, 0.012], [0.055, -0.135, -0.47], 0.25);
    left.name = 'ExternalWeapon:MG46:bipodL';
    right.name = 'ExternalWeapon:MG46:bipodR';
    addBox(root, dark, [0.075, 0.025, 0.24], [0, -0.012, -0.42]);
  } else {
    // The donor shotgun is pump-shaped; a compact box feed and top rail make SG-12 read as the automatic variant.
    addBox(root, dark, [0.095, 0.13, 0.11], [0, -0.12, -0.055], -0.03);
    addBox(root, steel, [0.055, 0.016, 0.24], [0, -0.005, -0.3]);
  }
}

function disposeObject(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) materials.add(mat);
  });
  for (const mat of materials) mat.dispose();
}

function setOriginalsAttached(state: PatchedRig, attached: boolean): void {
  for (const child of state.originals) {
    if (attached) {
      if (child.parent !== state.rig.gun) state.rig.gun.add(child);
    } else if (child.parent === state.rig.gun) {
      state.rig.gun.remove(child);
    }
  }
}

function reloadClearance(pose: ViewmodelPose): number {
  if (pose.reloadPhase === 'none') return 0;
  const t = THREE.MathUtils.clamp(pose.reloadT, 0, 1);
  return Math.sin(Math.PI * t);
}

function applyExternalPose(
  asset: THREE.Group,
  spec: ExternalWeaponAssetSpec,
  pose: ViewmodelPose,
  parentScale: THREE.Vector3,
): void {
  const ads = THREE.MathUtils.clamp(pose.ads, 0, 1);
  const reload = reloadClearance(pose);
  const visualScale = THREE.MathUtils.lerp(1, spec.adsScale, ads) * THREE.MathUtils.lerp(1, 0.96, reload);

  // The extended procedural styles already scale `gun` non-uniformly. Cancel that inherited scale for the GLB so
  // targetLength remains an actual first-person size rather than becoming 15-20% larger on DMR/LMG/Magnum.
  const sx = Math.max(0.001, Math.abs(parentScale.x));
  const sy = Math.max(0.001, Math.abs(parentScale.y));
  const sz = Math.max(0.001, Math.abs(parentScale.z));
  asset.scale.set(visualScale / sx, visualScale / sy, visualScale / sz);

  // Push the external shell forward during ADS and reload while leaving the original gun-space sight origin,
  // hands, muzzle and eject anchors untouched. This prevents the donor stock/receiver from crossing the camera near plane.
  const push = spec.adsPush * ads + spec.reloadPush * reload;
  asset.position.set(0, 0, -push / sz);
}

function patchRig(game: Game, rig: RigWithGun): PatchedRig {
  // Capture the complete procedural gun, including the existing extended-weapon decorations,
  // but keep muzzle/eject anchors attached because gameplay FX depends on their transforms.
  const originals = rig.gun.children.filter((c) => c !== rig.muzzle && c !== rig.ejectPort);
  const originalUpdate = rig.update.bind(rig);
  const state: PatchedRig = { rig, originals, originalUpdate, assets: new Map(), specs: new Map() };

  rig.update = ((pose: ViewmodelPose, dt: number) => {
    const id = game.weapons?.carried?.id as ExtraWeaponId | undefined;
    const selected = id ? state.assets.get(id) : undefined;

    // Reattach first so the original rig can correctly drive magazines, bolt/slide/pump and tier visibility.
    if (!selected) setOriginalsAttached(state, true);
    originalUpdate(pose, dt);

    for (const [assetId, asset] of state.assets) {
      const visible = assetId === id;
      asset.visible = visible;
      if (!visible) continue;
      const spec = state.specs.get(assetId);
      if (spec) applyExternalPose(asset, spec, pose, state.rig.gun.scale);
    }

    // When the GLB is ready, remove only the procedural visual children after the rig has updated.
    // Hands, muzzle/eject anchors and all weapon-state/reload logic continue running unchanged.
    if (selected) setOriginalsAttached(state, false);
  }) as ViewmodelRig['update'];

  return state;
}

function asGunRig(rig: ViewmodelRig): RigWithGun {
  return rig as RigWithGun;
}

/**
 * Background-load the five external GLB viewmodels. Until an individual model has loaded and normalised successfully,
 * its existing procedural model remains visible. A network/parse failure therefore cannot make a weapon disappear or
 * block Activity startup.
 */
export function installExternalWeaponViewmodels(game: Game): ExternalViewmodelHandle {
  const rifle = patchRig(game, asGunRig(game.viewmodels.rifle));
  const pistol = patchRig(game, asGunRig(game.viewmodels.pistol));
  const shotgun = patchRig(game, asGunRig(game.viewmodels.shotgun));
  const states = { rifle, pistol, shotgun } as const;
  const loader = new GLTFLoader();
  let disposed = false;

  const jobs = EXTERNAL_WEAPON_ASSETS.map(async (spec) => {
    try {
      const gltf = await loader.loadAsync(externalWeaponAssetUrl(spec.file));
      if (disposed) {
        disposeObject(gltf.scene);
        return;
      }
      const root = normalizeModel(gltf.scene, spec);
      const state = states[spec.family];
      state.assets.set(spec.id, root);
      state.specs.set(spec.id, spec);
      state.rig.gun.add(root);
      console.info(`[weapon-viewmodel] loaded ${spec.id} from ${spec.file}`);
    } catch (error) {
      // Deliberately non-fatal: the authored procedural model remains the fallback.
      console.warn(`[weapon-viewmodel] using procedural fallback for ${spec.id}`, error);
    }
  });

  const ready = Promise.allSettled(jobs).then(() => undefined);

  const handle: ExternalViewmodelHandle = {
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const state of Object.values(states)) {
        state.rig.update = state.originalUpdate as ViewmodelRig['update'];
        setOriginalsAttached(state, true);
        for (const asset of state.assets.values()) {
          asset.removeFromParent();
          disposeObject(asset);
        }
        state.assets.clear();
        state.specs.clear();
      }
    },
  };

  const viewmodels = game.viewmodels as typeof game.viewmodels & { dispose: () => void };
  const originalDispose = viewmodels.dispose.bind(viewmodels);
  let viewmodelsDisposed = false;
  viewmodels.dispose = () => {
    if (viewmodelsDisposed) return;
    viewmodelsDisposed = true;
    handle.dispose();
    originalDispose();
  };

  return handle;
}
