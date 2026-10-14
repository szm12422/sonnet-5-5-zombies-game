import * as THREE from 'three';
import type { Game } from '../game/game';
import type { RuntimeBudget } from '../perf/runtimeBudget';

export type GraphicsProfile = RuntimeBudget['profile'];

export interface GraphicsPreset {
  environment: number;
  viewEnvironment: number;
  fogMul: number;
  materialDetail: number;
  canvasGrade: boolean;
  vignetteOpacity: number;
  flashDistance: number;
  explosionDistance: number;
  flareDistance: number;
}

/**
 * Presentation budget kept separate from simulation quality. Mobile profiles avoid extra compositor work while still
 * benefiting from lighting/material tuning that does not add draw calls.
 */
export function graphicsPresetForProfile(profile: GraphicsProfile): GraphicsPreset {
  switch (profile) {
    case 'desktop':
      return {
        environment: 0.58,
        viewEnvironment: 0.92,
        fogMul: 0.96,
        materialDetail: 1,
        canvasGrade: true,
        vignetteOpacity: 1,
        flashDistance: 19,
        explosionDistance: 46,
        flareDistance: 34,
      };
    case 'desktop-low':
      return {
        environment: 0.54,
        viewEnvironment: 0.86,
        fogMul: 1,
        materialDetail: 0.9,
        canvasGrade: true,
        vignetteOpacity: 0.78,
        flashDistance: 17,
        explosionDistance: 40,
        flareDistance: 30,
      };
    case 'mobile':
      return {
        environment: 0.52,
        viewEnvironment: 0.84,
        fogMul: 1.04,
        materialDetail: 0.82,
        canvasGrade: false,
        vignetteOpacity: 0,
        flashDistance: 15,
        explosionDistance: 34,
        flareDistance: 26,
      };
    case 'mobile-low':
      return {
        environment: 0.48,
        viewEnvironment: 0.78,
        fogMul: 1.08,
        materialDetail: 0.72,
        canvasGrade: false,
        vignetteOpacity: 0,
        flashDistance: 13,
        explosionDistance: 30,
        flareDistance: 23,
      };
  }
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function setUniformColor(uniforms: Record<string, THREE.IUniform>, key: string, hex: number): void {
  const value = uniforms[key]?.value;
  if (value instanceof THREE.Color) value.setHex(hex);
}

function tuneSky(game: Game, atmosphere: number): void {
  const uniforms = game.renderer.sky.userData.uniforms;
  setUniformColor(uniforms, 'uZenith', 0x08172b);
  setUniformColor(uniforms, 'uMid', 0x193655);
  setUniformColor(uniforms, 'uHorizon', 0x4b647f);
  setUniformColor(uniforms, 'uGlow', 0xe09261);
  setUniformColor(uniforms, 'uMoonColor', 0xb8d5ff);
  setUniformColor(uniforms, 'uHazeColor', 0x35485f);
  const haze = uniforms.uHazeStrength;
  if (haze) haze.value = 0.82 + atmosphere * 0.08;
}

function materialFinishFactor(name: string): number {
  const n = name.toLowerCase();
  if (/glass|asphaltwet|puddle/.test(n)) return 1.28;
  if (/steel|metal|corrugated|container|paint|barrel|grating|labpanel/.test(n)) return 1.14;
  if (/rubber|canvas|sandbag|cardboard|wood|brick|concrete|dirt|grass/.test(n)) return 0.9;
  return 1;
}

function tuneMaterials(scene: THREE.Scene, detail: number, viewmodel: boolean): void {
  const seen = new Set<THREE.Material>();
  scene.traverse((obj) => {
    const candidate = (obj as THREE.Mesh).material;
    if (!candidate) return;
    const materials = Array.isArray(candidate) ? candidate : [candidate];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial) || seen.has(material)) continue;
      seen.add(material);
      if (material.userData.graphicsPhase1 === true) continue;
      material.userData.graphicsPhase1 = true;
      material.dithering = true;

      const finish = viewmodel ? 1.12 : materialFinishFactor(material.name);
      material.envMapIntensity = Math.max(material.envMapIntensity, finish * (0.82 + detail * 0.22));

      if (material.normalMap && !viewmodel) {
        const normalBoost = 1 + detail * 0.08;
        material.normalScale.multiplyScalar(normalBoost);
      }

      const lower = material.name.toLowerCase();
      if (/glass|asphaltwet|puddle/.test(lower)) material.roughness = Math.max(0.08, material.roughness * 0.93);
      else if (/steel|metal|corrugated|container|paint|barrel/.test(lower)) material.roughness = Math.max(0.18, material.roughness * 0.96);

      material.needsUpdate = true;
    }
  });
}

function installVignette(uiRoot: HTMLElement, opacity: number): void {
  const host = uiRoot.parentElement ?? uiRoot;
  const old = host.querySelector<HTMLElement>(':scope > [data-graphics-vignette="1"]');
  if (opacity <= 0) {
    old?.remove();
    return;
  }
  const node = old ?? document.createElement('div');
  node.dataset.graphicsVignette = '1';
  node.setAttribute('aria-hidden', 'true');
  node.style.cssText = [
    'position:absolute',
    'inset:0',
    'pointer-events:none',
    `opacity:${opacity.toFixed(2)}`,
    'background:radial-gradient(ellipse at center,rgba(0,0,0,0) 50%,rgba(2,7,13,.08) 70%,rgba(1,4,9,.30) 88%,rgba(0,0,0,.48) 100%)',
  ].join(';');
  // Canvas is before this node and #ui-root is after it, so the treatment never darkens HUD text or touch controls.
  if (!old) host.insertBefore(node, uiRoot);
}

function applyStaticLightColors(game: Game, viewHemi: THREE.HemisphereLight | null): void {
  const r = game.renderer;
  r.light.hemi.color.setHex(0x739bd0);
  r.light.hemi.groundColor.setHex(0x293640);
  r.light.moon.color.setHex(0xb8d5ff);
  r.light.fill.color.setHex(0xff9868);
  r.viewSun.color.setHex(0xc4dcff);
  r.viewLamp.color.setHex(0xffad68);
  if (viewHemi) {
    viewHemi.color.setHex(0x83a9d8);
    viewHemi.groundColor.setHex(0x26313b);
  }
}

function tuneDynamicLighting(game: Game, preset: GraphicsPreset, indoor: number, viewHemi: THREE.HemisphereLight | null): void {
  const r = game.renderer;
  const k = clamp01(indoor);

  r.light.hemi.intensity = lerp(3.65, 1.05, k);
  r.light.moon.intensity = lerp(4.7, 0.22, k);
  r.light.fill.intensity = lerp(0.8, 0.05, k);
  r.scene.environmentIntensity = lerp(preset.environment, 0.12, k);

  r.viewSun.intensity = lerp(2.75, 0.24, k);
  r.viewLamp.intensity = lerp(0, 1.45, k);
  r.viewScene.environmentIntensity = lerp(preset.viewEnvironment, 0.17, k);
  if (viewHemi) viewHemi.intensity = lerp(2.25, 1.05, k);

  const fog = r.scene.fog;
  if (fog instanceof THREE.FogExp2) {
    fog.density = lerp(0.0101 * preset.fogMul, 0.0032, k);
  }

  r.renderer.toneMappingExposure = lerp(1.13, 1.2, k);
}

/**
 * Phase-1 visual upgrade: stronger blue-hour separation, warmer practical lights, improved material response, better
 * atmospheric depth and transient-light reach. It deliberately adds no WebGL draw calls on mobile profiles.
 */
export function installGraphicsPhase1(game: Game, uiRoot: HTMLElement, profile: GraphicsProfile): GraphicsPreset {
  const preset = graphicsPresetForProfile(profile);
  const r = game.renderer;
  document.documentElement.dataset.graphicsProfile = profile;

  tuneSky(game, preset.materialDetail);
  tuneMaterials(r.scene, preset.materialDetail, false);
  tuneMaterials(r.viewScene, preset.materialDetail, true);

  r.flashLight.color.setHex(0xffcf9c);
  r.flashLight.distance = preset.flashDistance;
  r.flashLight.decay = 1.7;
  r.explosionLight.color.setHex(0xff7d34);
  r.explosionLight.distance = preset.explosionDistance;
  r.explosionLight.decay = 1.65;
  r.flareLight.color.setHex(0xff3926);
  r.flareLight.distance = preset.flareDistance;
  r.flareLight.decay = 1.7;
  r.viewFlash.color.setHex(0xffd6aa);
  r.viewFlash.distance = 4.6;
  r.viewFlash.decay = 1.55;

  const viewHemi = r.viewScene.children.find((x): x is THREE.HemisphereLight => x instanceof THREE.HemisphereLight) ?? null;
  const internals = r as unknown as { indoor?: number };
  applyStaticLightColors(game, viewHemi);

  const fog = r.scene.fog;
  if (fog instanceof THREE.FogExp2) fog.color.setHex(0x35485f);
  tuneDynamicLighting(game, preset, internals.indoor ?? 0, viewHemi);

  if (preset.canvasGrade) {
    r.canvas.style.filter = profile === 'desktop' ? 'saturate(1.07) contrast(1.045) brightness(1.01)' : 'saturate(1.045) contrast(1.03)';
  } else {
    r.canvas.style.filter = '';
  }
  installVignette(uiRoot, preset.vignetteOpacity);

  // GameRenderer owns indoor interpolation. Re-apply the new visual baseline after it updates each frame so indoor/outdoor
  // transitions keep the same art direction without changing simulation or adding another rendering pass.
  const originalRender = r.render.bind(r);
  r.render = (dt: number, time: number): void => {
    originalRender(dt, time);
    tuneDynamicLighting(game, preset, internals.indoor ?? 0, viewHemi);
  };

  return preset;
}
