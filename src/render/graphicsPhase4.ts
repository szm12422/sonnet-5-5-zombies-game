/**
 * Graphics Phase 4: animation polish without adding draw calls.
 *
 * - Directional infected hit reactions are layered after the existing skeletal pose.
 * - Head hits react differently from torso hits and carry through the first part of a death fall.
 * - First-person weapon rigs receive a small weapon-specific follow-through on top of their existing recoil springs.
 *
 * The implementation intentionally adds no meshes, materials, textures or per-frame object allocation. It decorates
 * the existing rigs and uses the already-created bones / viewmodel roots, keeping the mobile rendering budget intact.
 */
import type { Game } from '../game/game';
import { Zombie, type ZombieEnv } from '../enemies/zombie';
import { ZombieRigImpl } from '../enemies/zombie/rig';
import { B } from '../enemies/zombie/dims';
import type { ZombieAnimState, ZombieRig } from '../enemies/zombieRigTypes';
import type { ViewmodelPose, ViewmodelRig } from '../weapons/viewmodelTypes';

export type Phase4WeaponId = 'rifle' | 'smg' | 'lmg' | 'dmr' | 'pistol' | 'magnum' | 'shotgun' | 'autoshotgun';

export interface FireMotionProfile {
  /** Rearward translation in view space (metres). */
  kickZ: number;
  /** Upward rotational kick (radians). */
  pitch: number;
  /** Alternating horizontal kick (radians). */
  yaw: number;
  /** Alternating roll (radians). */
  roll: number;
  /** Small sideways mechanical cycle movement (metres). */
  cycleX: number;
  /** Exponential return rate. */
  returnHz: number;
}

const FIRE_MOTION: Record<Phase4WeaponId, FireMotionProfile> = {
  rifle: { kickZ: 0.013, pitch: 0.018, yaw: 0.005, roll: 0.007, cycleX: 0.0015, returnHz: 18 },
  smg: { kickZ: 0.009, pitch: 0.012, yaw: 0.006, roll: 0.008, cycleX: 0.0018, returnHz: 22 },
  lmg: { kickZ: 0.016, pitch: 0.021, yaw: 0.004, roll: 0.006, cycleX: 0.0013, returnHz: 15 },
  dmr: { kickZ: 0.021, pitch: 0.033, yaw: 0.007, roll: 0.009, cycleX: 0.0017, returnHz: 14 },
  pistol: { kickZ: 0.014, pitch: 0.027, yaw: 0.008, roll: 0.012, cycleX: 0.0018, returnHz: 19 },
  magnum: { kickZ: 0.028, pitch: 0.052, yaw: 0.012, roll: 0.018, cycleX: 0.0025, returnHz: 12 },
  shotgun: { kickZ: 0.034, pitch: 0.058, yaw: 0.01, roll: 0.016, cycleX: 0.0023, returnHz: 11 },
  autoshotgun: { kickZ: 0.025, pitch: 0.043, yaw: 0.009, roll: 0.014, cycleX: 0.0022, returnHz: 14 },
};

export function recoilProfileForWeapon(id: string): FireMotionProfile {
  return FIRE_MOTION[id as Phase4WeaponId] ?? FIRE_MOTION.rifle;
}

/** Fast hit impulse; effectively gone after roughly half a second. */
export function hitReactionEnvelope(age: number): number {
  if (!(age >= 0)) return 0;
  return Math.exp(-age * 9.5);
}

/** Extra directional character in the opening of a death animation; does not disturb the settled corpse. */
export function deathReactionEnvelope(deathT: number): number {
  if (!(deathT >= 0)) return 0;
  const fade = Math.exp(-deathT * 4.2);
  const onset = Math.min(1, deathT / 0.055);
  return fade * onset;
}

interface HitReaction {
  age: number;
  side: number;
  front: number;
  strength: number;
  head: boolean;
}

const reactions = new WeakMap<ZombieRig, HitReaction>();
let zombiePatchInstalled = false;

const wrapAngle = (a: number): number => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

function installZombieReactionPatch(): void {
  if (zombiePatchInstalled) return;
  zombiePatchInstalled = true;

  const originalDamage = Zombie.prototype.takeDamage;
  Zombie.prototype.takeDamage = function phase4Damage(
    this: Zombie,
    amount: number,
    head: boolean,
    env: ZombieEnv,
    hitDirYaw: number,
    impulse = 1,
  ): boolean {
    if (this.state !== 'dead' && amount > 0) {
      const rel = wrapAngle(hitDirYaw - this.yaw);
      const prior = reactions.get(this.rig);
      const rawStrength = Math.min(1.55, Math.max(0.42, amount / Math.max(18, this.maxHp * 0.18)));
      const strength = Math.min(1.65, rawStrength * Math.min(1.25, Math.max(0.72, impulse)));
      if (prior && prior.age < 0.12) {
        prior.age = 0;
        prior.side = prior.side * 0.35 + Math.sin(rel) * 0.65;
        prior.front = prior.front * 0.35 + Math.cos(rel) * 0.65;
        prior.strength = Math.min(1.7, Math.max(prior.strength * 0.8, strength));
        prior.head = head;
      } else {
        reactions.set(this.rig, {
          age: 0,
          side: Math.sin(rel),
          front: Math.cos(rel),
          strength,
          head,
        });
      }
    }
    return originalDamage.call(this, amount, head, env, hitDirYaw, impulse);
  };

  const originalReset = ZombieRigImpl.prototype.reset;
  ZombieRigImpl.prototype.reset = function phase4Reset(this: ZombieRigImpl, seed: number): void {
    reactions.delete(this);
    originalReset.call(this, seed);
  };

  const originalUpdate = ZombieRigImpl.prototype.update;
  ZombieRigImpl.prototype.update = function phase4RigUpdate(this: ZombieRigImpl, state: ZombieAnimState, dt: number): void {
    originalUpdate.call(this, state, dt);
    const r = reactions.get(this);
    if (!r) return;

    r.age += Math.max(0, Math.min(0.1, dt));
    const hitK = hitReactionEnvelope(r.age) * r.strength;
    const deathK = state.mode === 'death' ? deathReactionEnvelope(state.deathT) * r.strength : 0;
    const k = Math.max(hitK, deathK);
    if (k < 0.004) {
      if (state.mode !== 'death' || state.deathT > 1.2) reactions.delete(this);
      return;
    }

    const bones = this.skinnedMesh.skeleton.bones;
    const side = r.side;
    const front = r.front;
    const head = bones[B.head];
    const neck = bones[B.neck];
    const chest = bones[B.chest];
    const spine = bones[B.spine];
    const shL = bones[B.shL];
    const shR = bones[B.shR];
    if (!head || !neck || !chest || !spine || !shL || !shR) return;

    if (r.head) {
      // A head hit reads immediately: snap back, roll away from the incoming shot, then recover into the base animation.
      const hk = k * (state.mode === 'death' ? 1.2 : 1);
      head.rotation.x += 0.24 * hk + Math.max(0, front) * 0.08 * hk;
      head.rotation.y += side * 0.18 * hk;
      head.rotation.z += side * 0.28 * hk;
      neck.rotation.x += 0.11 * hk;
      neck.rotation.z += side * 0.15 * hk;
      if (state.mode === 'death' && state.headshotDeath) {
        const jaw = bones[B.jaw];
        if (jaw) jaw.rotation.x -= 0.12 * deathK;
      }
    } else {
      // Torso hits turn the upper body around the impact direction while the legs remain grounded.
      chest.rotation.x -= front * 0.09 * k;
      chest.rotation.y += side * 0.19 * k;
      chest.rotation.z += side * 0.1 * k;
      spine.rotation.y += side * 0.1 * k;
      spine.rotation.x -= front * 0.04 * k;
      const nearShoulder = side >= 0 ? shR : shL;
      const farShoulder = side >= 0 ? shL : shR;
      nearShoulder.rotation.x += 0.15 * k;
      nearShoulder.rotation.z += (side >= 0 ? 1 : -1) * 0.09 * k;
      farShoulder.rotation.x -= 0.04 * k;
    }
  };
}

interface WeaponMotionState {
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
  sign: number;
  appliedX: number;
  appliedY: number;
  appliedZ: number;
  appliedPitch: number;
  appliedYaw: number;
  appliedRoll: number;
  profile: FireMotionProfile;
}

function installWeaponRigMotion(game: Game, rig: ViewmodelRig, fallback: Phase4WeaponId): void {
  const originalUpdate = rig.update.bind(rig);
  const originalFire = rig.onFire.bind(rig);
  const originalReset = rig.reset.bind(rig);
  const s: WeaponMotionState = {
    z: 0,
    pitch: 0,
    yaw: 0,
    roll: 0,
    sign: 1,
    appliedX: 0,
    appliedY: 0,
    appliedZ: 0,
    appliedPitch: 0,
    appliedYaw: 0,
    appliedRoll: 0,
    profile: FIRE_MOTION[fallback],
  };

  const removePrevious = (): void => {
    const root = rig.root;
    root.position.x -= s.appliedX;
    root.position.y -= s.appliedY;
    root.position.z -= s.appliedZ;
    root.rotation.x -= s.appliedPitch;
    root.rotation.y -= s.appliedYaw;
    root.rotation.z -= s.appliedRoll;
    s.appliedX = s.appliedY = s.appliedZ = 0;
    s.appliedPitch = s.appliedYaw = s.appliedRoll = 0;
  };

  rig.onFire = (tier: number, strength = 1): void => {
    originalFire(tier, strength);
    const id = String(game.weapons.carried?.id ?? fallback);
    const p = recoilProfileForWeapon(id);
    s.profile = p;
    s.sign *= -1;
    const tierMul = tier >= 2 ? 0.92 : tier === 1 ? 0.96 : 1;
    const impulse = Math.max(0.45, Math.min(1.6, strength)) * tierMul;
    s.z = Math.min(0.055, s.z + p.kickZ * impulse);
    s.pitch = Math.min(0.09, s.pitch + p.pitch * impulse);
    s.yaw = Math.max(-0.04, Math.min(0.04, s.yaw + p.yaw * s.sign * impulse));
    s.roll = Math.max(-0.055, Math.min(0.055, s.roll + p.roll * s.sign * impulse));
  };

  rig.update = (pose: ViewmodelPose, dt: number): void => {
    removePrevious();
    originalUpdate(pose, dt);

    const d = Math.max(0, Math.min(0.1, dt));
    const returnMul = Math.exp(-d * s.profile.returnHz);
    s.z *= returnMul;
    s.pitch *= returnMul;
    s.yaw *= returnMul;
    s.roll *= returnMul;

    if (!rig.root.visible) return;
    const accessibility = pose.reducedMotion ? 0.28 : 1;
    const aim = 1 - pose.ads * 0.2;
    const scale = accessibility * aim;
    const cycle = Math.max(0, 1 - pose.cycle * 3.6);
    const cycleX = s.profile.cycleX * s.sign * cycle * accessibility;

    s.appliedX = cycleX;
    s.appliedY = -s.pitch * 0.035 * scale;
    s.appliedZ = s.z * scale;
    s.appliedPitch = s.pitch * scale;
    s.appliedYaw = s.yaw * scale + s.sign * cycle * 0.0025 * accessibility;
    s.appliedRoll = s.roll * scale + s.sign * cycle * 0.004 * accessibility;

    const root = rig.root;
    root.position.x += s.appliedX;
    root.position.y += s.appliedY;
    root.position.z += s.appliedZ;
    root.rotation.x += s.appliedPitch;
    root.rotation.y += s.appliedYaw;
    root.rotation.z += s.appliedRoll;
  };

  rig.reset = (): void => {
    removePrevious();
    s.z = s.pitch = s.yaw = s.roll = 0;
    s.sign = 1;
    s.profile = FIRE_MOTION[fallback];
    originalReset();
  };
}

export function installGraphicsPhase4(game: Game): void {
  installZombieReactionPatch();
  installWeaponRigMotion(game, game.viewmodels.rifle, 'rifle');
  installWeaponRigMotion(game, game.viewmodels.pistol, 'pistol');
  installWeaponRigMotion(game, game.viewmodels.shotgun, 'shotgun');
}
