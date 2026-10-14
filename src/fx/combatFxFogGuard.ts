import * as THREE from 'three';

/**
 * Phase 3 uses a custom ShaderMaterial that does not declare Three.js' fog uniforms/chunks.
 * Leaving `material.fog = true` makes WebGLMaterials attempt to refresh missing fog uniforms
 * (`fogColor.value`, etc.) and crashes at render time. Disable scene-fog integration for only
 * these short-lived combat particles until the shader explicitly implements the fog contract.
 */
export function disableUnsupportedCombatFxFog(root: THREE.Object3D): number {
  let changed = 0;
  root.traverse((object) => {
    if (!object.name.startsWith('CombatFxPhase3')) return;
    const material = (object as THREE.Points).material;
    if (!material) return;
    const materials = Array.isArray(material) ? material : [material];
    for (const item of materials) {
      if (item instanceof THREE.ShaderMaterial && item.fog) {
        item.fog = false;
        item.needsUpdate = true;
        changed++;
      }
    }
  });
  return changed;
}
