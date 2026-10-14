import { ECONOMY, GRENADE, PLAYER, WEAPONS } from '../config';
import type { WeaponId } from '../types';
import { EXTRA_WEAPON_IDS, EXTRA_WEAPONS, type ExtraWeaponId } from '../weapons/extraWeapons';
import {
  activeWeapon,
  carries,
  createCarried,
  purchaseUpgrade,
  spendCash,
  upgradeMenu,
  type Inventory,
  type ItemState,
  type PurchaseResult,
  type StationItem,
} from './economy';
import { isFull } from './ammo';

export type ExtendedBuyItemId = 'ammo' | 'plate' | 'grenades' | 'shotgun' | ExtraWeaponId;

const WEAPON_SHOP_IDS: readonly (ExtendedBuyItemId & string)[] = ['shotgun', ...EXTRA_WEAPON_IDS];

const fail = (reason: PurchaseResult['reason'], cost: number, message: string): PurchaseResult => ({
  ok: false,
  reason,
  cost,
  message,
});

function stateFor(inv: Inventory, cost: number, blocked: ItemState | null): ItemState {
  if (blocked) return blocked;
  return inv.cash >= cost ? 'ok' : 'unaffordable';
}

function weaponDetail(id: string): string {
  switch (id) {
    case 'shotgun': return '近距離向けポンプ式ショットガン';
    case 'smg': return '高連射・高機動の近距離SMG';
    case 'lmg': return '大容量マガジンを備えた制圧用LMG';
    case 'dmr': return '中遠距離向け高精度セミオートライフル';
    case 'magnum': return '高威力・高反動の大型ハンドガン';
    case 'autoshotgun': return '高連射で群体を押し返す自動ショットガン';
    default: return '';
  }
}

/**
 * Mobile-friendly buy menu: one ammo action plus armour, grenades and all six purchasable weapon families.
 * Upgrade stations remain the original 1/2 slot UI.
 */
export function buyMenu(inv: Inventory): StationItem[] {
  const equipped = activeWeapon(inv);
  const items: StationItem[] = [];

  if (equipped) {
    const def = (WEAPONS as unknown as Record<string, typeof WEAPONS.rifle>)[equipped.id as unknown as string];
    items.push({
      id: 'ammo',
      key: '1',
      label: `弾薬補充 - ${def.short}`,
      detail: `装備中武器のマガジンと予備弾を最大まで補充（${equipped.ammo.reserve}/${equipped.ammo.reserveMax}）`,
      cost: def.ammoPrice,
      state: stateFor(inv, def.ammoPrice, isFull(equipped.ammo) ? 'full' : null),
      note: '装備中',
    });
  } else {
    items.push({ id: 'ammo', key: '1', label: '弾薬補充', detail: '装備中の武器がありません', cost: 0, state: 'unavailable' });
  }

  items.push({
    id: 'plate',
    key: '2',
    label: 'アーマープレート',
    detail: `所持 ${inv.plates}/${PLAYER.maxPlates}・使用時アーマー+${PLAYER.plateArmor}`,
    cost: ECONOMY.platePrice,
    state: stateFor(inv, ECONOMY.platePrice, inv.plates >= PLAYER.maxPlates ? 'full' : null),
  });

  items.push({
    id: 'grenades',
    key: '3',
    label: `フラググレネード ×${GRENADE.purchaseAmount}`,
    detail: `所持 ${inv.grenades}/${GRENADE.max}`,
    cost: GRENADE.price,
    state: stateFor(inv, GRENADE.price, inv.grenades >= GRENADE.max ? 'full' : null),
  });

  let key = 4;
  for (const id of WEAPON_SHOP_IDS) {
    const def = id === 'shotgun' ? WEAPONS.shotgun : EXTRA_WEAPONS[id as ExtraWeaponId];
    items.push({
      id,
      key: String(key++),
      label: def.name,
      detail: weaponDetail(id),
      cost: def.price,
      state: stateFor(inv, def.price, carries(inv, id as WeaponId) ? 'owned' : null),
      note: equipped && !carries(inv, id as WeaponId) ? `装備中の ${((WEAPONS as unknown as Record<string, typeof WEAPONS.rifle>)[equipped.id as unknown as string]).short} と入れ替え` : undefined,
    });
  }
  return items;
}

export function isWeaponPurchase(id: string): boolean {
  return (WEAPON_SHOP_IDS as readonly string[]).includes(id);
}

function giveWeapon(inv: Inventory, id: 'shotgun' | ExtraWeaponId): string {
  const slot = inv.activeSlot;
  const old = inv.slots[slot];
  const runtimeId = id as unknown as WeaponId;
  inv.slots[slot] = createCarried(runtimeId);
  const def = id === 'shotgun' ? WEAPONS.shotgun : EXTRA_WEAPONS[id];
  const oldDef = old ? (WEAPONS as unknown as Record<string, typeof WEAPONS.rifle>)[old.id as unknown as string] : null;
  return oldDef ? `${def.short} を装備（${oldDef.short} と交換）` : `${def.short} を入手`;
}

export function purchaseBuy(inv: Inventory, id: ExtendedBuyItemId): PurchaseResult {
  const item = buyMenu(inv).find((m) => m.id === id);
  if (!item) return fail('invalid', 0, '不明なアイテムです');
  if (item.state === 'unavailable') return fail('unavailable', item.cost, '利用できません');
  if (item.state === 'full') return fail('full', item.cost, 'すでに満杯です');
  if (item.state === 'owned') return fail('owned', item.cost, 'すでに所持しています');
  if (item.state === 'unaffordable') return fail('unaffordable', item.cost, '資金が不足しています');
  if (!spendCash(inv, item.cost)) return fail('unaffordable', item.cost, '資金が不足しています');

  switch (id) {
    case 'ammo': {
      const w = activeWeapon(inv)!;
      w.ammo.reserve = w.ammo.reserveMax;
      w.ammo.mag = w.ammo.magSize;
      w.ammo.reload = null;
      const def = (WEAPONS as unknown as Record<string, typeof WEAPONS.rifle>)[w.id as unknown as string];
      return { ok: true, reason: 'ok', cost: item.cost, message: `${def.short} の弾薬を補充` };
    }
    case 'plate':
      inv.plates += 1;
      return { ok: true, reason: 'ok', cost: item.cost, message: 'アーマープレートを入手' };
    case 'grenades':
      inv.grenades = Math.min(GRENADE.max, inv.grenades + GRENADE.purchaseAmount);
      return { ok: true, reason: 'ok', cost: item.cost, message: 'フラググレネードを入手' };
    case 'shotgun':
      return { ok: true, reason: 'ok', cost: item.cost, message: giveWeapon(inv, 'shotgun') };
    default:
      return { ok: true, reason: 'ok', cost: item.cost, message: giveWeapon(inv, id) };
  }
}

export { purchaseUpgrade, upgradeMenu };
export type { StationItem } from './economy';
