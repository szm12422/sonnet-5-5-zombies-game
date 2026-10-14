import { WEAPONS, WEAPON_IDS, type WeaponDef } from '../config';
import type { AudioEngineApi, PlayOpts, SoundId } from '../audio/ids';
import type { Game } from '../game/game';
import type { WeaponId } from '../types';

export type ExtraWeaponId = 'smg' | 'lmg' | 'dmr' | 'magnum' | 'autoshotgun';

export const EXTRA_WEAPON_IDS: readonly ExtraWeaponId[] = ['smg', 'lmg', 'dmr', 'magnum', 'autoshotgun'] as const;

const tier = (
  label: string,
  description: string,
  cost: number,
  damageMul: number,
  magSizeAdd: number,
  reserveMaxAdd: number,
  fireRateMul: number,
  recoilMul: number,
  spreadMul: number,
  reloadMul: number,
  pelletsAdd: number,
  headshotMulAdd: number,
  armorPierce: number,
): WeaponDef['tiers'][number] => ({
  label,
  description,
  cost,
  damageMul,
  magSizeAdd,
  reserveMaxAdd,
  fireRateMul,
  recoilMul,
  spreadMul,
  reloadMul,
  pelletsAdd,
  headshotMulAdd,
  armorPierce,
});

/**
 * Extended arsenal. The original game keeps a narrow WeaponId union, so the extra IDs are injected into the existing
 * runtime catalog without changing save-data identifiers or the original balance module.
 */
export const EXTRA_WEAPONS: Record<ExtraWeaponId, WeaponDef> = {
  smg: {
    id: 'smg' as WeaponId,
    name: 'KX-9 Submachine Gun',
    short: 'KX-9',
    auto: true,
    damage: 19,
    pellets: 1,
    headshotMul: 2.0,
    fireInterval: 60 / 920,
    magSize: 36,
    reserveStart: 180,
    reserveMax: 252,
    reloadStyle: 'magazine',
    reloadTactical: 1.7,
    reloadEmpty: 2.08,
    reloadTransferAt: 0.7,
    shellStart: 0,
    shellEach: 0,
    shellEnd: 0,
    shellPump: 0,
    spreadHip: 2.75,
    spreadAds: 0.38,
    spreadMove: 1.85,
    spreadAir: 3.2,
    spreadPerShot: 0.18,
    spreadMax: 2.8,
    spreadRecover: 6.8,
    recoilPitch: 0.42,
    recoilYaw: 0.34,
    recoilRecover: 8.8,
    falloffStart: 16,
    falloffEnd: 46,
    minMul: 0.43,
    maxRange: 95,
    adsFovMul: 0.78,
    adsTime: 0.13,
    moveMul: 1.08,
    noise: 34,
    drawTime: 0.3,
    tracerColors: [0xffe3a3, 0xffad45, 0x6ff0ff],
    price: 900,
    ammoPrice: 220,
    tiers: [
      tier('MK II', '強化ボルト: 威力+18%、48発マガジン、反動軽減。', 1300, 1.18, 12, 72, 1.04, 0.86, 0.92, 0.9, 0, 0, 0.08),
      tier('MK III', '高速徹甲弾: 威力+38%、連射速度+12%、装甲貫通30%。', 2800, 1.38, 20, 108, 1.12, 0.72, 0.8, 0.8, 0, 0.15, 0.3),
    ],
  },
  lmg: {
    id: 'lmg' as WeaponId,
    name: 'MG-46 Light Machine Gun',
    short: 'MG-46',
    auto: true,
    damage: 31,
    pellets: 1,
    headshotMul: 2.0,
    fireInterval: 60 / 610,
    magSize: 75,
    reserveStart: 225,
    reserveMax: 300,
    reloadStyle: 'magazine',
    reloadTactical: 4.15,
    reloadEmpty: 4.85,
    reloadTransferAt: 0.74,
    shellStart: 0,
    shellEach: 0,
    shellEnd: 0,
    shellPump: 0,
    spreadHip: 3.2,
    spreadAds: 0.46,
    spreadMove: 2.1,
    spreadAir: 3.8,
    spreadPerShot: 0.24,
    spreadMax: 3.4,
    spreadRecover: 4.8,
    recoilPitch: 0.88,
    recoilYaw: 0.42,
    recoilRecover: 6.1,
    falloffStart: 38,
    falloffEnd: 105,
    minMul: 0.64,
    maxRange: 185,
    adsFovMul: 0.7,
    adsTime: 0.28,
    moveMul: 0.82,
    noise: 48,
    drawTime: 0.62,
    tracerColors: [0xffd88c, 0xffa43a, 0x6ff0ff],
    price: 1800,
    ammoPrice: 400,
    tiers: [
      tier('MK II', '給弾機構強化: 威力+16%、100発マガジン、反動軽減。', 2200, 1.16, 25, 75, 1.03, 0.88, 0.93, 0.88, 0, 0, 0.12),
      tier('MK III', '重徹甲弾: 威力+40%、装甲貫通45%、125発マガジン。', 4200, 1.4, 50, 150, 1.08, 0.74, 0.82, 0.78, 0, 0.2, 0.45),
    ],
  },
  dmr: {
    id: 'dmr' as WeaponId,
    name: 'MR-14 Marksman Rifle',
    short: 'MR-14',
    auto: false,
    damage: 62,
    pellets: 1,
    headshotMul: 2.55,
    fireInterval: 0.28,
    magSize: 15,
    reserveStart: 75,
    reserveMax: 120,
    reloadStyle: 'magazine',
    reloadTactical: 2.2,
    reloadEmpty: 2.65,
    reloadTransferAt: 0.72,
    shellStart: 0,
    shellEach: 0,
    shellEnd: 0,
    shellPump: 0,
    spreadHip: 1.65,
    spreadAds: 0.11,
    spreadMove: 1.0,
    spreadAir: 2.4,
    spreadPerShot: 0.34,
    spreadMax: 1.8,
    spreadRecover: 6.3,
    recoilPitch: 1.55,
    recoilYaw: 0.28,
    recoilRecover: 7.5,
    falloffStart: 55,
    falloffEnd: 135,
    minMul: 0.74,
    maxRange: 225,
    adsFovMul: 0.56,
    adsTime: 0.22,
    moveMul: 0.92,
    noise: 44,
    drawTime: 0.48,
    tracerColors: [0xffefbb, 0xffba54, 0x6ff0ff],
    price: 1600,
    ammoPrice: 300,
    tiers: [
      tier('MK II', '精密バレル: 威力+22%、20発マガジン、集弾性向上。', 1900, 1.22, 5, 40, 1.05, 0.9, 0.82, 0.9, 0, 0.2, 0.18),
      tier('MK III', '高初速徹甲弾: 威力+55%、HS倍率強化、装甲貫通50%。', 3800, 1.55, 10, 70, 1.12, 0.78, 0.68, 0.82, 0, 0.45, 0.5),
    ],
  },
  magnum: {
    id: 'magnum' as WeaponId,
    name: 'HX-44 Magnum',
    short: 'HX-44',
    auto: false,
    damage: 95,
    pellets: 1,
    headshotMul: 2.7,
    fireInterval: 0.42,
    magSize: 6,
    reserveStart: 42,
    reserveMax: 72,
    reloadStyle: 'magazine',
    reloadTactical: 2.0,
    reloadEmpty: 2.35,
    reloadTransferAt: 0.68,
    shellStart: 0,
    shellEach: 0,
    shellEnd: 0,
    shellPump: 0,
    spreadHip: 1.8,
    spreadAds: 0.18,
    spreadMove: 1.2,
    spreadAir: 2.8,
    spreadPerShot: 0.72,
    spreadMax: 2.5,
    spreadRecover: 5.8,
    recoilPitch: 3.15,
    recoilYaw: 0.58,
    recoilRecover: 7.0,
    falloffStart: 34,
    falloffEnd: 82,
    minMul: 0.62,
    maxRange: 135,
    adsFovMul: 0.76,
    adsTime: 0.17,
    moveMul: 1.02,
    noise: 46,
    drawTime: 0.34,
    tracerColors: [0xfff0c4, 0xffb347, 0x6ff0ff],
    price: 1200,
    ammoPrice: 260,
    tiers: [
      tier('MK II', '強装弾: 威力+28%、8発装填、反動軽減。', 1600, 1.28, 2, 24, 1.05, 0.88, 0.9, 0.9, 0, 0.2, 0.2),
      tier('MK III', 'ハンドキャノン弾: 威力+70%、連射速度+18%、装甲貫通45%。', 3400, 1.7, 4, 42, 1.18, 0.74, 0.76, 0.82, 0, 0.5, 0.45),
    ],
  },
  autoshotgun: {
    id: 'autoshotgun' as WeaponId,
    name: 'SG-12 Auto Shotgun',
    short: 'SG-12',
    auto: true,
    damage: 10,
    pellets: 8,
    headshotMul: 1.45,
    fireInterval: 0.3,
    magSize: 10,
    reserveStart: 40,
    reserveMax: 70,
    reloadStyle: 'shell',
    reloadTactical: 0,
    reloadEmpty: 0,
    reloadTransferAt: 0.55,
    shellStart: 0.42,
    shellEach: 0.33,
    shellEnd: 0.28,
    shellPump: 0.2,
    spreadHip: 5.0,
    spreadAds: 3.45,
    spreadMove: 1.35,
    spreadAir: 2.4,
    spreadPerShot: 0.08,
    spreadMax: 5.2,
    spreadRecover: 6.2,
    recoilPitch: 2.8,
    recoilYaw: 0.72,
    recoilRecover: 6.6,
    falloffStart: 5,
    falloffEnd: 20,
    minMul: 0.16,
    maxRange: 42,
    adsFovMul: 0.86,
    adsTime: 0.16,
    moveMul: 0.94,
    noise: 50,
    drawTime: 0.46,
    tracerColors: [0xffd9a0, 0xff9b35, 0x6ff0ff],
    price: 2200,
    ammoPrice: 340,
    tiers: [
      tier('MK II', 'ガスシステム強化: 威力+18%、12発チューブ、装填速度向上。', 2500, 1.18, 2, 24, 1.08, 0.88, 0.9, 0.8, 1, 0, 0.1),
      tier('MK III', '戦闘用特殊弾: 威力+42%、10ペレット、装甲貫通35%。', 4600, 1.42, 4, 40, 1.16, 0.74, 0.76, 0.72, 2, 0.15, 0.35),
    ],
  },
};

const runtimeWeapons = WEAPONS as unknown as Record<string, WeaponDef>;
for (const id of EXTRA_WEAPON_IDS) {
  runtimeWeapons[id] = EXTRA_WEAPONS[id];
  if (!(WEAPON_IDS as readonly string[]).includes(id)) WEAPON_IDS.push(id as WeaponId);
}

export function isExtraWeaponId(id: string): id is ExtraWeaponId {
  return (EXTRA_WEAPON_IDS as readonly string[]).includes(id);
}

interface AudioAlias {
  id: SoundId;
  rate: number;
  volume: number;
}

const SHOT_ALIAS: Record<ExtraWeaponId, { base: 'rifle' | 'pistol' | 'shotgun'; rate: number; volume: number }> = {
  smg: { base: 'rifle', rate: 1.2, volume: 0.82 },
  lmg: { base: 'rifle', rate: 0.82, volume: 1.1 },
  dmr: { base: 'rifle', rate: 0.72, volume: 1.05 },
  magnum: { base: 'pistol', rate: 0.7, volume: 1.18 },
  autoshotgun: { base: 'shotgun', rate: 1.08, volume: 0.95 },
};

function aliasShot(id: string): AudioAlias | null {
  const upgraded = id.endsWith('_shot_up');
  const raw = upgraded ? id.slice(0, -8) : id.endsWith('_shot') ? id.slice(0, -5) : '';
  if (!raw || !isExtraWeaponId(raw)) return null;
  const a = SHOT_ALIAS[raw];
  return { id: `${a.base}_shot${upgraded ? '_up' : ''}` as SoundId, rate: a.rate, volume: a.volume };
}

/**
 * The audio bank only has the three original procedural firearm families. Alias the five added weapons onto those
 * synthesis recipes with distinct pitch/loudness profiles, avoiding five more decoded sound banks on mobile.
 */
export function installExtraWeaponAudio(game: Game): void {
  const audio = game.audio as AudioEngineApi;
  const original = audio.play.bind(audio);
  audio.play = ((id: SoundId, opts: PlayOpts = {}): void => {
    const shot = aliasShot(id as string);
    if (shot) {
      original(shot.id, {
        ...opts,
        rate: (opts.rate ?? 1) * shot.rate,
        volume: (opts.volume ?? 1) * shot.volume,
      });
      return;
    }

    const active = game.weapons?.carried?.id as unknown as string | undefined;
    if (active === 'smg' || active === 'lmg' || active === 'dmr') {
      if (id === 'pistol_mag_out') id = 'rifle_mag_out';
      else if (id === 'pistol_mag_in') id = 'rifle_mag_in';
      else if (id === 'pistol_slide') id = 'rifle_bolt';
    }
    original(id, opts);
  }) as AudioEngineApi['play'];
}
