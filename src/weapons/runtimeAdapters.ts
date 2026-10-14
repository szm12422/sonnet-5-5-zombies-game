import type { Game } from '../game/game';
import type { WeaponId } from '../types';

const CASING_FAMILY: Record<string, WeaponId> = {
  smg: 'rifle',
  lmg: 'rifle',
  dmr: 'rifle',
  magnum: 'pistol',
  autoshotgun: 'shotgun',
};

/**
 * Reuse the original instanced casing pools for the extended weapons. This prevents invalid pool lookups while keeping
 * the effect bounded to the same two InstancedMeshes (brass + shotgun shells).
 */
export function installExtraWeaponFxAdapters(game: Game): void {
  const fx = game.fx;
  const originalCasing = fx.casing.bind(fx);
  fx.casing = ((p, vel, kind): void => {
    const mapped = CASING_FAMILY[kind as unknown as string] ?? kind;
    originalCasing(p, vel, mapped);
  }) as typeof fx.casing;
}
