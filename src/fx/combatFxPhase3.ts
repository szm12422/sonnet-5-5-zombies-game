import * as THREE from 'three';
import type { Game } from '../game/game';
import type { RuntimeBudget } from '../perf/runtimeBudget';
import type { SurfaceKind, Vec3Like } from '../types';

export type CombatFxProfile = RuntimeBudget['profile'];

export interface CombatFxPreset {
  softCap: number;
  sparkCap: number;
  ambientHz: number;
  impactScale: number;
  smokeScale: number;
  explosionScale: number;
}

export function combatFxPresetForProfile(profile: CombatFxProfile): CombatFxPreset {
  switch (profile) {
    case 'desktop':
      return { softCap: 128, sparkCap: 96, ambientHz: 5, impactScale: 1, smokeScale: 1, explosionScale: 1 };
    case 'desktop-low':
      return { softCap: 96, sparkCap: 64, ambientHz: 3.5, impactScale: 0.86, smokeScale: 0.82, explosionScale: 0.82 };
    case 'mobile':
      return { softCap: 72, sparkCap: 48, ambientHz: 2.2, impactScale: 0.68, smokeScale: 0.64, explosionScale: 0.66 };
    case 'mobile-low':
      return { softCap: 48, sparkCap: 32, ambientHz: 1.2, impactScale: 0.5, smokeScale: 0.45, explosionScale: 0.48 };
  }
}

type RGB = readonly [number, number, number];

const linear = (hex: number, gain = 1): RGB => {
  const c = new THREE.Color(hex);
  return [c.r * gain, c.g * gain, c.b * gain];
};

const SPARK_METAL = linear(0xffc36a, 4.2);
const SPARK_GLASS = linear(0xccecff, 3.2);
const SPARK_STONE = linear(0xffd9a1, 2.15);
const EMBER = linear(0xff6d24, 3.5);
const FIRE = linear(0xffa047, 4.8);
const SMOKE = linear(0x78818a, 0.72);
const SMOKE_DARK = linear(0x31353a, 0.7);
const DUST = linear(0xa49a88, 0.72);
const BLOOD = linear(0x6a0b0a, 0.8);
const ASH = linear(0xaeb7c0, 0.68);

interface SpawnSpec {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  color: RGB;
  gravity?: number;
  drag?: number;
  grow?: number;
  alpha?: number;
}

const particleVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float perspective = clamp(160.0 / max(1.0, -mv.z), 0.55, 4.2);
    gl_PointSize = max(1.0, aSize * perspective * uPixelRatio);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = aAlpha;
  }
`;

const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    float soft = 1.0 - smoothstep(0.46, 1.0, r);
    float a = soft * vAlpha;
    if (a < 0.005) discard;
    gl_FragColor = vec4(vColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

class PooledPoints {
  readonly points: THREE.Points;
  private readonly active: Uint8Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly velocity: Float32Array;
  private readonly gravity: Float32Array;
  private readonly drag: Float32Array;
  private readonly baseSize: Float32Array;
  private readonly grow: Float32Array;
  private readonly baseAlpha: Float32Array;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private cursor = 0;

  constructor(readonly cap: number, additive: boolean, renderOrder: number) {
    this.active = new Uint8Array(cap);
    this.life = new Float32Array(cap);
    this.maxLife = new Float32Array(cap);
    this.velocity = new Float32Array(cap * 3);
    this.gravity = new Float32Array(cap);
    this.drag = new Float32Array(cap);
    this.baseSize = new Float32Array(cap);
    this.grow = new Float32Array(cap);
    this.baseAlpha = new Float32Array(cap);
    this.positions = new Float32Array(cap * 3);
    this.colors = new Float32Array(cap * 3);
    this.sizes = new Float32Array(cap);
    this.alphas = new Float32Array(cap);
    this.positions.fill(99999);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttr = new THREE.BufferAttribute(this.colors, 3);
    this.sizeAttr = new THREE.BufferAttribute(this.sizes, 1);
    this.alphaAttr = new THREE.BufferAttribute(this.alphas, 1);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aColor', this.colorAttr);
    geo.setAttribute('aSize', this.sizeAttr);
    geo.setAttribute('aAlpha', this.alphaAttr);

    const mat = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: { uPixelRatio: { value: Math.min(1.5, globalThis.devicePixelRatio || 1) } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      toneMapped: true,
      fog: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.name = additive ? 'CombatFxPhase3Sparks' : 'CombatFxPhase3Soft';
    this.points.frustumCulled = false;
    this.points.renderOrder = renderOrder;
  }

  spawn(s: SpawnSpec): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.cap;
    const o = i * 3;
    this.active[i] = 1;
    this.life[i] = Math.max(0.03, s.life);
    this.maxLife[i] = Math.max(0.03, s.life);
    this.positions[o] = s.x;
    this.positions[o + 1] = s.y;
    this.positions[o + 2] = s.z;
    this.velocity[o] = s.vx;
    this.velocity[o + 1] = s.vy;
    this.velocity[o + 2] = s.vz;
    this.colors[o] = s.color[0];
    this.colors[o + 1] = s.color[1];
    this.colors[o + 2] = s.color[2];
    this.gravity[i] = s.gravity ?? 0;
    this.drag[i] = s.drag ?? 0.5;
    this.baseSize[i] = s.size;
    this.grow[i] = s.grow ?? 0;
    this.baseAlpha[i] = s.alpha ?? 1;
    this.sizes[i] = s.size;
    this.alphas[i] = s.alpha ?? 1;
  }

  update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.cap; i++) {
      if (!this.active[i]) continue;
      dirty = true;
      const life = this.life[i]! - dt;
      this.life[i] = life;
      const o = i * 3;
      if (life <= 0) {
        this.active[i] = 0;
        this.positions[o] = 99999;
        this.positions[o + 1] = 99999;
        this.positions[o + 2] = 99999;
        this.alphas[i] = 0;
        continue;
      }
      const damp = Math.exp(-this.drag[i]! * dt);
      this.velocity[o] *= damp;
      this.velocity[o + 1] = this.velocity[o + 1]! * damp - this.gravity[i]! * dt;
      this.velocity[o + 2] *= damp;
      this.positions[o] += this.velocity[o]! * dt;
      this.positions[o + 1] += this.velocity[o + 1]! * dt;
      this.positions[o + 2] += this.velocity[o + 2]! * dt;
      const t = Math.max(0, life / this.maxLife[i]!);
      const elapsed = 1 - t;
      this.alphas[i] = this.baseAlpha[i]! * Math.min(1, t * 1.65) * Math.min(1, elapsed * 8 + 0.15);
      this.sizes[i] = this.baseSize[i]! * (1 + this.grow[i]! * elapsed);
    }
    if (!dirty) return;
    this.posAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  clear(): void {
    this.active.fill(0);
    this.alphas.fill(0);
    this.positions.fill(99999);
    this.posAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

class CombatFxPhase3 {
  readonly root = new THREE.Group();
  private readonly soft: PooledPoints;
  private readonly sparks: PooledPoints;
  private state = 0x7f4a7c15;
  private ambientAcc = 0;
  private readonly cameraPos = new THREE.Vector3();

  constructor(readonly preset: CombatFxPreset) {
    this.root.name = 'CombatFxPhase3';
    this.soft = new PooledPoints(preset.softCap, false, 20);
    this.sparks = new PooledPoints(preset.sparkCap, true, 21);
    this.root.add(this.soft.points, this.sparks.points);
  }

  private rand(): number {
    let x = this.state | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 4294967296;
  }

  private signed(): number {
    return this.rand() * 2 - 1;
  }

  private count(base: number, scale: number): number {
    return Math.max(1, Math.round(base * scale));
  }

  impact(p: Vec3Like, n: Vec3Like, surface: SurfaceKind, strong: boolean): void {
    if (surface === 'flesh') return;
    const scale = this.preset.impactScale * (strong ? 1.3 : 1);
    const isHard = surface === 'metal' || surface === 'glass' || surface === 'concrete';
    const sparkColor = surface === 'glass' ? SPARK_GLASS : surface === 'metal' ? SPARK_METAL : SPARK_STONE;
    const sparkCount = isHard ? this.count(surface === 'metal' ? 8 : 5, scale) : this.count(2, scale);
    for (let i = 0; i < sparkCount; i++) {
      const speed = (1.8 + this.rand() * 4.2) * (strong ? 1.18 : 1);
      let vx = n.x * speed + this.signed() * 1.5;
      let vy = Math.max(0.1, n.y * speed) + this.rand() * 2.0;
      let vz = n.z * speed + this.signed() * 1.5;
      if (!isHard) {
        vx *= 0.55;
        vy *= 0.55;
        vz *= 0.55;
      }
      this.sparks.spawn({
        x: p.x + n.x * 0.025,
        y: p.y + n.y * 0.025,
        z: p.z + n.z * 0.025,
        vx,
        vy,
        vz,
        life: 0.12 + this.rand() * 0.24,
        size: isHard ? 2.1 + this.rand() * 1.8 : 1.2 + this.rand(),
        color: sparkColor,
        gravity: 8.5,
        drag: 1.4,
      });
    }

    const dustColor = surface === 'dirt' || surface === 'wood' || surface === 'fabric' ? DUST : SMOKE;
    const puffCount = this.count(strong ? 4 : 2, this.preset.smokeScale);
    for (let i = 0; i < puffCount; i++) {
      this.soft.spawn({
        x: p.x + n.x * 0.035,
        y: p.y + n.y * 0.035,
        z: p.z + n.z * 0.035,
        vx: n.x * (0.25 + this.rand() * 0.45) + this.signed() * 0.18,
        vy: 0.18 + this.rand() * 0.32 + n.y * 0.25,
        vz: n.z * (0.25 + this.rand() * 0.45) + this.signed() * 0.18,
        life: 0.32 + this.rand() * 0.32,
        size: 6 + this.rand() * 5,
        color: dustColor,
        drag: 2.1,
        grow: 1.1,
        alpha: 0.36,
      });
    }
  }

  blood(p: Vec3Like, dir: Vec3Like, amount: number, head: boolean, kill: boolean): void {
    const scale = this.preset.impactScale * Math.max(0.45, amount) * (head ? 1.25 : 1) * (kill ? 1.35 : 1);
    const drops = this.count(7, scale);
    for (let i = 0; i < drops; i++) {
      const speed = 0.8 + this.rand() * (head ? 2.8 : 1.9);
      this.soft.spawn({
        x: p.x + this.signed() * 0.025,
        y: p.y + this.signed() * 0.025,
        z: p.z + this.signed() * 0.025,
        vx: dir.x * speed + this.signed() * 0.65,
        vy: dir.y * speed + 0.25 + this.rand() * 1.15,
        vz: dir.z * speed + this.signed() * 0.65,
        life: 0.28 + this.rand() * 0.42,
        size: head ? 3.6 + this.rand() * 2.6 : 2.8 + this.rand() * 2.2,
        color: BLOOD,
        gravity: 6.8,
        drag: 0.55,
        alpha: 0.72,
      });
    }
    if (head || kill) {
      const mist = this.count(head && kill ? 5 : 3, this.preset.smokeScale);
      for (let i = 0; i < mist; i++) {
        this.soft.spawn({
          x: p.x,
          y: p.y,
          z: p.z,
          vx: dir.x * (0.25 + this.rand() * 0.5) + this.signed() * 0.22,
          vy: 0.12 + this.rand() * 0.28,
          vz: dir.z * (0.25 + this.rand() * 0.5) + this.signed() * 0.22,
          life: 0.25 + this.rand() * 0.2,
          size: 7 + this.rand() * 5,
          color: BLOOD,
          drag: 2.7,
          grow: 0.75,
          alpha: 0.24,
        });
      }
    }
  }

  muzzleSmoke(p: Vec3Like, dir: Vec3Like, strong: boolean): void {
    const count = this.count(strong ? 4 : 2, this.preset.smokeScale);
    for (let i = 0; i < count; i++) {
      const speed = 0.22 + this.rand() * 0.38;
      this.soft.spawn({
        x: p.x + dir.x * 0.03,
        y: p.y + dir.y * 0.03,
        z: p.z + dir.z * 0.03,
        vx: dir.x * speed + this.signed() * 0.08,
        vy: 0.16 + this.rand() * 0.18,
        vz: dir.z * speed + this.signed() * 0.08,
        life: 0.42 + this.rand() * 0.35,
        size: (strong ? 7.5 : 5.5) + this.rand() * 4,
        color: SMOKE,
        drag: 1.35,
        grow: 1.5,
        alpha: strong ? 0.32 : 0.24,
      });
    }
  }

  explosion(p: Vec3Like, radius: number): void {
    const scale = this.preset.explosionScale;
    this.sparks.spawn({
      x: p.x,
      y: p.y + 0.35,
      z: p.z,
      vx: 0,
      vy: 0.05,
      vz: 0,
      life: 0.16,
      size: 22 + Math.min(18, radius * 2.5),
      color: FIRE,
      drag: 0,
      grow: 0.55,
      alpha: 0.95,
    });

    const sparkCount = this.count(26, scale);
    for (let i = 0; i < sparkCount; i++) {
      const a = this.rand() * Math.PI * 2;
      const up = 0.25 + this.rand() * 0.75;
      const speed = 2.4 + this.rand() * (3.5 + radius * 0.35);
      const flat = Math.sqrt(Math.max(0, 1 - up * up));
      this.sparks.spawn({
        x: p.x,
        y: p.y + 0.2,
        z: p.z,
        vx: Math.cos(a) * flat * speed,
        vy: up * speed,
        vz: Math.sin(a) * flat * speed,
        life: 0.24 + this.rand() * 0.55,
        size: 2 + this.rand() * 2.8,
        color: this.rand() < 0.35 ? EMBER : SPARK_METAL,
        gravity: 7.5,
        drag: 0.65,
      });
    }

    const smokeCount = this.count(14, scale * this.preset.smokeScale);
    for (let i = 0; i < smokeCount; i++) {
      const a = this.rand() * Math.PI * 2;
      const r = this.rand() * Math.min(1.3, radius * 0.14);
      this.soft.spawn({
        x: p.x + Math.cos(a) * r,
        y: p.y + 0.15 + this.rand() * 0.5,
        z: p.z + Math.sin(a) * r,
        vx: Math.cos(a) * (0.18 + this.rand() * 0.55),
        vy: 0.65 + this.rand() * 1.25,
        vz: Math.sin(a) * (0.18 + this.rand() * 0.55),
        life: 0.85 + this.rand() * 1.15,
        size: 10 + this.rand() * 10,
        color: this.rand() < 0.45 ? SMOKE_DARK : SMOKE,
        drag: 1.05,
        grow: 2.3,
        alpha: 0.38,
      });
    }
  }

  update(dt: number, camera: THREE.Camera, reducedMotion: boolean): void {
    this.soft.update(dt);
    this.sparks.update(dt);
    if (reducedMotion || this.preset.ambientHz <= 0) return;
    this.ambientAcc += dt * this.preset.ambientHz;
    if (this.ambientAcc < 1) return;
    const count = Math.min(2, Math.floor(this.ambientAcc));
    this.ambientAcc -= count;
    camera.getWorldPosition(this.cameraPos);
    for (let i = 0; i < count; i++) {
      const a = this.rand() * Math.PI * 2;
      const r = 3 + this.rand() * 10;
      this.soft.spawn({
        x: this.cameraPos.x + Math.cos(a) * r,
        y: Math.max(0.5, this.cameraPos.y - 2 + this.rand() * 5),
        z: this.cameraPos.z + Math.sin(a) * r,
        vx: 0.03 + this.signed() * 0.04,
        vy: 0.015 + this.rand() * 0.035,
        vz: 0.015 + this.signed() * 0.04,
        life: 3.2 + this.rand() * 2.2,
        size: 1.2 + this.rand() * 1.8,
        color: ASH,
        drag: 0.08,
        grow: 0.15,
        alpha: 0.25,
      });
    }
  }

  clear(): void {
    this.soft.clear();
    this.sparks.clear();
    this.ambientAcc = 0;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.soft.dispose();
    this.sparks.dispose();
  }
}

/**
 * Installs a bounded two-draw-call combat presentation layer over the existing FX pools. Existing effects stay intact;
 * this pass only adds short-lived detail and scales down aggressively on mobile profiles.
 */
export function installCombatFxPhase3(game: Game, profile: CombatFxProfile): CombatFxPreset {
  const preset = combatFxPresetForProfile(profile);
  const fx = game.fx;
  const layer = new CombatFxPhase3(preset);
  fx.root.add(layer.root);

  const originalImpact = fx.impact.bind(fx);
  const originalBlood = fx.blood.bind(fx);
  const originalExplosion = fx.explosion.bind(fx);
  const originalMuzzleSmoke = fx.muzzleSmoke.bind(fx);
  const originalUpdate = fx.update.bind(fx);
  const originalClear = fx.clear.bind(fx);
  const originalDispose = fx.dispose.bind(fx);

  fx.impact = (p, n, surface, opts) => {
    originalImpact(p, n, surface, opts);
    layer.impact(p, n, surface, opts?.strong ?? false);
  };
  fx.blood = (p, dir, opts) => {
    originalBlood(p, dir, opts);
    layer.blood(p, dir, opts?.amount ?? 1, opts?.head ?? false, opts?.kill ?? false);
  };
  fx.explosion = (p, radius) => {
    originalExplosion(p, radius);
    layer.explosion(p, radius);
  };
  fx.muzzleSmoke = (p, dir, strong) => {
    originalMuzzleSmoke(p, dir, strong);
    layer.muzzleSmoke(p, dir, strong ?? false);
  };
  fx.update = (dt, camera) => {
    originalUpdate(dt, camera);
    layer.update(dt, camera, game.settings.reducedMotion);
  };
  fx.clear = () => {
    originalClear();
    layer.clear();
  };
  fx.dispose = () => {
    layer.dispose();
    originalDispose();
  };

  return preset;
}
