/**
 * ONE shared material for every zombie. Vertex colours carry the albedo, `aGlow` adds emissive light in the vertex
 * colour, and `aSpec` lerps roughness / metalness toward a hard-surface look (armour plates, visors, plastic, wet
 * wounds). A small tiling grunge map adds cloth, skin and dirt micro-detail. Result: a single draw call per rig.
 */
import * as THREE from 'three';
import { clamp } from './prng';

function periodicNoise(x: number, y: number, period: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number): number => {
    const aa = ((a % period) + period) % period;
    const bb = ((b % period) + period) % period;
    let n = Math.imul(aa + seed * 57, 374761393) + Math.imul(bb, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  };
  const a = h(ix, iy);
  const b = h(ix + 1, iy);
  const c = h(ix, iy + 1);
  const d = h(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function createDetailTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const low = periodicNoise(u * 4, v * 4, 4, 1) * 0.52 + periodicNoise(u * 8, v * 8, 8, 2) * 0.31 + periodicNoise(u * 16, v * 16, 16, 3) * 0.17;
      const fine = periodicNoise(u * 64, v * 64, 64, 4);
      const pores = periodicNoise(u * 96, v * 96, 96, 7);
      const stain = periodicNoise(u * 3, v * 3, 3, 9);
      let val = 0.87 + (low - 0.5) * 0.36 + (fine - 0.5) * 0.13 + (pores - 0.5) * 0.045;
      if (stain > 0.62) val -= (stain - 0.62) * 0.95;
      // Faint weave / cracked-skin microstructure. Kept grayscale so vertex colour still owns the appearance palette.
      val += Math.sin(u * Math.PI * 2 * 48) * Math.sin(v * Math.PI * 2 * 48) * 0.018;
      const g8 = Math.round(clamp(val, 0.32, 1) * 255);
      const o = (y * size + x) * 4;
      img.data[o] = g8;
      img.data[o + 1] = g8;
      img.data[o + 2] = g8;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function createZombieMaterial(map: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map,
    bumpMap: map,
    bumpScale: 1.85,
    roughness: 0.86,
    metalness: 0,
    envMapIntensity: 0.92,
  });
  mat.name = 'ZombieShared';
  mat.dithering = true;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow;\nattribute float aSpec;\nvarying float vGlow;\nvarying float vSpec;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;\nvSpec = aSpec;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;\nvarying float vSpec;')
      // Wet wounds and hard armour get a controlled highlight without turning flesh into chrome.
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.22, clamp(vSpec, 0.0, 1.0));')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.48, clamp(vSpec, 0.0, 1.0));')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float specK = clamp(vSpec, 0.0, 1.0);
        float glowK = clamp(vGlow, 0.0, 2.0);
        float ndv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        float rimK = pow(1.0 - ndv, 2.35);
        // Eyes / contaminated tissue retain the authored vertex glow.
        totalEmissiveRadiance += vColor.rgb * glowK * (1.0 + rimK * 0.35);
        // Cool moon edge on hard equipment, colour-preserving edge scatter on skin and fabric.
        vec3 softRim = vColor.rgb * vec3(0.070, 0.078, 0.088);
        vec3 hardRim = vec3(0.070, 0.125, 0.205);
        totalEmissiveRadiance += mix(softRim, hardRim, specK) * rimK * (1.0 - clamp(glowK, 0.0, 1.0));
        // A tiny warm bounce keeps faces and exposed tissue readable under the cold blue-hour key light.
        float fleshHint = clamp((vColor.r - vColor.b * 0.55) * (1.0 - specK), 0.0, 0.45);
        totalEmissiveRadiance += vec3(0.085, 0.025, 0.014) * fleshHint * (0.15 + rimK * 0.55);`,
      );
  };
  mat.customProgramCacheKey = () => 'zombie-shared-v2-surface';
  return mat;
}
