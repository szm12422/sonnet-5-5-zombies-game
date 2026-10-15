import { describe, expect, it } from 'vitest';
import { GRENADE, PLAYER, WEAPONS } from '../src/config';
import { createInventory } from '../src/logic/economy';
import { equipPracticeWeapon, PRACTICE_WEAPON_IDS, refillPracticeSupplies } from '../src/game/practiceMode';

describe('practice mode', () => {
  it('exposes the complete eight-weapon arsenal exactly once', () => {
    expect(PRACTICE_WEAPON_IDS).toHaveLength(8);
    expect(new Set(PRACTICE_WEAPON_IDS).size).toBe(8);
    expect(PRACTICE_WEAPON_IDS).toEqual([
      'rifle',
      'pistol',
      'shotgun',
      'smg',
      'lmg',
      'dmr',
      'magnum',
      'autoshotgun',
    ]);
    for (const id of PRACTICE_WEAPON_IDS) {
      expect((WEAPONS as unknown as Record<string, unknown>)[id]).toBeTruthy();
    }
  });

  it('can freely replace the active slot with any practice weapon', () => {
    const inv = createInventory();
    const vitals = { health: PLAYER.maxHealth, armor: PLAYER.maxArmor };
    inv.activeSlot = 0;
    for (const id of PRACTICE_WEAPON_IDS) {
      equipPracticeWeapon(inv, id);
      refillPracticeSupplies(inv, vitals);
      expect(inv.slots[0]?.id).toBe(id);
      expect(inv.slots[0]?.ammo.mag).toBe(inv.slots[0]?.ammo.magSize);
      expect(inv.slots[0]?.ammo.reserve).toBe(inv.slots[0]?.ammo.reserveMax);
    }
  });

  it('keeps reserve ammunition and supplies unlimited without refilling the magazine', () => {
    const inv = createInventory();
    const vitals = { health: 13, armor: 7 };
    const active = inv.slots[inv.activeSlot]!;
    active.ammo.mag = 3;
    active.ammo.reserve = 0;
    inv.cash = 0;
    inv.plates = 0;
    inv.grenades = 0;

    refillPracticeSupplies(inv, vitals);

    expect(active.ammo.mag).toBe(3);
    expect(active.ammo.reserve).toBe(active.ammo.reserveMax);
    expect(inv.cash).toBeGreaterThanOrEqual(999_999);
    expect(inv.plates).toBe(PLAYER.maxPlates);
    expect(inv.grenades).toBe(GRENADE.max);
    expect(vitals.health).toBe(PLAYER.maxHealth);
    expect(vitals.armor).toBe(PLAYER.maxArmor);
  });
});
