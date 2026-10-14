import { describe, expect, it } from 'vitest';
import { WEAPONS, WEAPON_IDS } from '../src/config';
import { createInventory, purchaseUpgrade } from '../src/logic/economy';
import { buyMenu, purchaseBuy } from '../src/logic/extendedEconomy';
import { EXTRA_WEAPON_IDS, EXTRA_WEAPONS } from '../src/weapons/extraWeapons';

describe('extended arsenal', () => {
  it('injects five balanced weapon families into the runtime catalog', () => {
    const runtime = WEAPONS as unknown as Record<string, typeof WEAPONS.rifle>;
    expect(EXTRA_WEAPON_IDS).toEqual(['smg', 'lmg', 'dmr', 'magnum', 'autoshotgun']);
    for (const id of EXTRA_WEAPON_IDS) {
      expect(runtime[id]).toBe(EXTRA_WEAPONS[id]);
      expect((WEAPON_IDS as unknown as string[])).toContain(id);
      expect(runtime[id]!.damage).toBeGreaterThan(0);
      expect(runtime[id]!.magSize).toBeGreaterThan(0);
      expect(runtime[id]!.fireInterval).toBeGreaterThan(0);
      expect(runtime[id]!.tiers).toHaveLength(2);
    }
  });

  it('exposes a complete nine-key buy station menu', () => {
    const inv = createInventory();
    inv.cash = 100000;
    const menu = buyMenu(inv);
    expect(menu).toHaveLength(9);
    expect(menu.map((item) => item.key)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(menu.map((item) => item.id)).toEqual(['ammo', 'plate', 'grenades', 'shotgun', 'smg', 'lmg', 'dmr', 'magnum', 'autoshotgun']);
  });

  it('buys an extended weapon, replaces the active slot and upgrades through MK III', () => {
    const inv = createInventory();
    inv.cash = 20000;
    inv.activeSlot = 1;
    const result = purchaseBuy(inv, 'smg');
    expect(result.ok).toBe(true);
    expect(inv.slots[1]!.id as unknown as string).toBe('smg');
    expect(inv.slots[1]!.ammo.magSize).toBe(EXTRA_WEAPONS.smg.magSize);

    expect(purchaseUpgrade(inv, 1).ok).toBe(true);
    expect(inv.slots[1]!.tier).toBe(1);
    expect(purchaseUpgrade(inv, 1).ok).toBe(true);
    expect(inv.slots[1]!.tier).toBe(2);
    expect(purchaseUpgrade(inv, 1).ok).toBe(false);
  });

  it('prevents duplicate purchases of a carried extended weapon', () => {
    const inv = createInventory();
    inv.cash = 10000;
    expect(purchaseBuy(inv, 'magnum').ok).toBe(true);
    const cash = inv.cash;
    const again = purchaseBuy(inv, 'magnum');
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('owned');
    expect(inv.cash).toBe(cash);
  });
});
