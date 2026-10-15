import { GRENADE, PLAYER, WEAPONS, type WeaponDef } from '../config';
import { createCarried, type Inventory } from '../logic/economy';
import type { Game, GameState } from './game';
import type { HudState, MapDynamic } from '../ui/hudTypes';
import type { WeaponId } from '../types';
import { EXTRA_WEAPON_IDS } from '../weapons/extraWeapons';

export type PracticeWeaponId = WeaponId | (typeof EXTRA_WEAPON_IDS)[number];

const BASE_WEAPONS: readonly WeaponId[] = ['rifle', 'pistol', 'shotgun'];
export const PRACTICE_WEAPON_IDS: readonly PracticeWeaponId[] = [...BASE_WEAPONS, ...EXTRA_WEAPON_IDS];

const runtimeWeapons = WEAPONS as unknown as Record<PracticeWeaponId, WeaponDef>;

export function equipPracticeWeapon(inv: Inventory, id: PracticeWeaponId): void {
  inv.slots[inv.activeSlot] = createCarried(id as WeaponId);
}

export function refillPracticeSupplies(inv: Inventory, vitals: { health: number; armor: number }): void {
  vitals.health = PLAYER.maxHealth;
  vitals.armor = PLAYER.maxArmor;
  inv.cash = Math.max(inv.cash, 999_999);
  inv.plates = PLAYER.maxPlates;
  inv.grenades = GRENADE.max;
  for (const weapon of inv.slots) {
    if (!weapon) continue;
    // Leave the magazine alone so empty-mag and reload animations remain testable.
    weapon.ammo.reserve = weapon.ammo.reserveMax;
  }
}

interface PracticeState {
  active: boolean;
  selectorOpen: boolean;
}

interface PracticeGameInternals {
  state: GameState;
  dirty: boolean;
  audio: Game['audio'];
  input: Game['input'];
  weapons: Game['weapons'];
  zombies: Game['zombies'];
  mission: Game['mission'];
  interaction: Game['interaction'];
  hud: Game['hud'];
  menus: Game['menus'];
  session: Game['session'];
  resetRun(initial: boolean): void;
  requestStart(restart: boolean): void;
  quitToTitle(): void;
  hurtPlayer(amount: number, srcX: number | null, srcZ: number | null, opts?: { ignoreArmor?: boolean; toxic?: boolean }): void;
}

interface PracticeUi {
  root: HTMLDivElement;
  panel: HTMLDivElement;
  trigger: HTMLButtonElement;
  style: HTMLStyleElement;
  setOpen(open: boolean): void;
  syncActive(id: string | null): void;
  dispose(): void;
}

function makePracticeUi(
  uiRoot: HTMLElement,
  onSelect: (id: PracticeWeaponId) => void,
  onOpenChange: (open: boolean) => void,
): PracticeUi {
  const style = document.createElement('style');
  style.dataset.practiceModeStyle = 'true';
  style.textContent = `
    .practice-tools { position:absolute; inset:0; z-index:86; pointer-events:none; font-family:"Noto Sans JP","Yu Gothic UI",Meiryo,system-ui,sans-serif; }
    .practice-trigger { position:absolute; left:50%; bottom:max(14px,calc(env(safe-area-inset-bottom) + 8px)); transform:translateX(-50%); min-width:112px; height:40px; padding:0 16px; border:1px solid rgba(92,215,235,.7); border-radius:10px; background:rgba(4,14,20,.82); color:#e8f7fa; font:700 13px/1 inherit; letter-spacing:.05em; box-shadow:0 0 18px rgba(60,200,230,.15),inset 0 0 16px rgba(60,200,230,.08); backdrop-filter:blur(5px); pointer-events:auto; touch-action:none; }
    .practice-trigger:active { transform:translateX(-50%) scale(.96); }
    .practice-panel { position:absolute; left:50%; bottom:max(62px,calc(env(safe-area-inset-bottom) + 56px)); transform:translateX(-50%); width:min(760px,calc(100vw - 24px)); max-height:min(72vh,460px); overflow:auto; box-sizing:border-box; padding:14px; border:1px solid rgba(104,207,226,.55); border-radius:14px; background:rgba(3,10,15,.94); color:#e8f2f4; box-shadow:0 16px 50px rgba(0,0,0,.48),inset 0 0 28px rgba(65,180,205,.06); backdrop-filter:blur(9px); pointer-events:auto; touch-action:pan-y; }
    .practice-panel[hidden] { display:none; }
    .practice-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:11px; }
    .practice-title { font-size:15px; font-weight:800; letter-spacing:.07em; }
    .practice-sub { margin-top:4px; color:rgba(210,231,235,.66); font-size:11px; line-height:1.5; }
    .practice-close { flex:none; width:36px; height:36px; border:1px solid rgba(190,220,225,.3); border-radius:9px; background:rgba(255,255,255,.05); color:#eef7f8; font-size:18px; pointer-events:auto; }
    .practice-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
    .practice-weapon { min-height:62px; padding:9px 10px; border:1px solid rgba(180,215,222,.24); border-radius:10px; background:rgba(255,255,255,.035); color:#e5eff1; text-align:left; pointer-events:auto; touch-action:none; }
    .practice-weapon .short { display:block; color:#7cdef0; font-size:14px; font-weight:800; letter-spacing:.06em; }
    .practice-weapon .name { display:block; margin-top:4px; color:rgba(228,239,241,.72); font-size:10px; line-height:1.3; }
    .practice-weapon.is-active { border-color:rgba(238,181,72,.88); background:rgba(197,139,40,.14); box-shadow:inset 0 0 18px rgba(220,160,55,.08); }
    .practice-hint { margin-top:10px; color:rgba(200,222,226,.55); font-size:10px; text-align:center; }
    @media (max-width:720px), (max-height:430px) { .practice-panel { max-height:68vh; padding:10px; bottom:max(56px,calc(env(safe-area-inset-bottom) + 50px)); } .practice-grid { grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; } .practice-weapon { min-height:54px; padding:7px; } .practice-weapon .short { font-size:12px; } .practice-weapon .name { font-size:9px; } .practice-trigger { height:36px; min-width:100px; font-size:11px; } }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'practice-tools';
  root.hidden = true;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'practice-trigger';
  trigger.textContent = '武器選択';
  trigger.setAttribute('aria-label', 'お試しモードの武器を選択');

  const panel = document.createElement('div');
  panel.className = 'practice-panel';
  panel.hidden = true;

  const head = document.createElement('div');
  head.className = 'practice-head';
  const headText = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'practice-title';
  title.textContent = 'お試しモード / 武器選択';
  const sub = document.createElement('div');
  sub.className = 'practice-sub';
  sub.textContent = '敵なし・所持金不要・予備弾無制限。マガジンは減るので射撃とリロードをそのまま確認できます。';
  headText.append(title, sub);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'practice-close';
  close.textContent = '×';
  close.setAttribute('aria-label', '武器選択を閉じる');
  head.append(headText, close);
  panel.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'practice-grid';
  for (const id of PRACTICE_WEAPON_IDS) {
    const def = runtimeWeapons[id];
    if (!def) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'practice-weapon';
    button.dataset.weaponId = id;
    const short = document.createElement('span');
    short.className = 'short';
    short.textContent = def.short;
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = def.name;
    button.append(short, name);
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(id);
    });
    grid.appendChild(button);
  }
  panel.appendChild(grid);
  const hint = document.createElement('div');
  hint.className = 'practice-hint';
  hint.textContent = 'PC: [ / ] でも前後の武器へ切替できます';
  panel.appendChild(hint);

  root.append(trigger, panel);
  uiRoot.appendChild(root);

  let open = false;
  const setOpen = (next: boolean): void => {
    open = next;
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    onOpenChange(open);
  };
  trigger.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(!open);
  });
  close.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  });

  return {
    root,
    panel,
    trigger,
    style,
    setOpen,
    syncActive(id: string | null): void {
      for (const button of grid.querySelectorAll<HTMLButtonElement>('.practice-weapon')) {
        button.classList.toggle('is-active', button.dataset.weaponId === id);
      }
    },
    dispose(): void {
      root.remove();
      style.remove();
    },
  };
}

function injectPracticeButton(host: PracticeGameInternals, startPractice: () => void): void {
  const actions = document.querySelector<HTMLElement>('.ds-title-main .actions');
  if (!actions || actions.querySelector('[data-practice-deploy]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ds-btn';
  button.dataset.practiceDeploy = 'true';
  button.textContent = 'お試しモード';
  button.setAttribute('aria-label', '敵なしのお試しモードを開始');
  button.title = '敵なし・武器自由選択・予備弾無制限';
  button.addEventListener('click', startPractice);
  const deploy = actions.querySelector('.primary.big');
  if (deploy?.nextSibling) actions.insertBefore(button, deploy.nextSibling);
  else actions.appendChild(button);
  void host;
}

/**
 * Adds a production-safe practice mode without forking the mission simulation.
 * Normal missions keep the original runtime; practice mode suppresses enemy population/director,
 * mission progression/damage/interactions and overlays a free weapon selector.
 */
export function installPracticeMode(game: Game, uiRoot: HTMLElement): () => void {
  const host = game as unknown as PracticeGameInternals;
  const state: PracticeState = { active: false, selectorOpen: false };

  const originalReset = host.resetRun.bind(game);
  const originalQuit = host.quitToTitle.bind(game);
  const originalHurt = host.hurtPlayer.bind(game);
  const originalShowTitle = host.menus.showTitle.bind(host.menus);
  const originalDirector = host.zombies.director.bind(host.zombies);
  const originalPopulate = host.zombies.populate.bind(host.zombies);
  const originalMissionUpdate = host.mission.update.bind(host.mission);
  const originalInteractionUpdate = host.interaction.update.bind(host.interaction);
  const originalHudUpdate = host.hud.update.bind(host.hud);

  const ui = makePracticeUi(
    uiRoot,
    (id) => {
      if (!state.active) return;
      host.weapons.cancelActions();
      equipPracticeWeapon(host.session.inv, id);
      refillPracticeSupplies(host.session.inv, host.session.vitals);
      host.weapons.reset();
      ui.syncActive(id);
      ui.setOpen(false);
    },
    (open) => {
      state.selectorOpen = open;
      host.input.clear();
      if (state.active && host.state === 'playing') host.input.setEnabled(!open);
    },
  );

  const afterReset = (): void => {
    host.mission.root.visible = !state.active;
    if (!state.active) return;
    host.zombies.clearAll();
    refillPracticeSupplies(host.session.inv, host.session.vitals);
  };

  host.resetRun = (initial: boolean): void => {
    originalReset(initial);
    afterReset();
  };

  (host.zombies as unknown as { populate: (...args: unknown[]) => void }).populate = (...args: unknown[]): void => {
    if (!state.active) (originalPopulate as (...xs: unknown[]) => void)(...args);
  };
  (host.zombies as unknown as { director: (...args: unknown[]) => void }).director = (...args: unknown[]): void => {
    if (!state.active) (originalDirector as (...xs: unknown[]) => void)(...args);
  };
  (host.mission as unknown as { update: (...args: unknown[]) => void }).update = (...args: unknown[]): void => {
    if (!state.active) (originalMissionUpdate as (...xs: unknown[]) => void)(...args);
  };
  (host.interaction as unknown as { update: (...args: unknown[]) => unknown }).update = (...args: unknown[]): unknown => {
    if (state.active) return { prompt: null, panel: null, panelOpen: false };
    return (originalInteractionUpdate as (...xs: unknown[]) => unknown)(...args);
  };

  host.hurtPlayer = (amount, srcX, srcZ, opts = {}): void => {
    if (state.active) return;
    originalHurt(amount, srcX, srcZ, opts);
  };

  (host.hud as unknown as { update: (hud: HudState, map: MapDynamic, dt: number) => void }).update = (
    hud: HudState,
    map: MapDynamic,
    dt: number,
  ): void => {
    if (state.active) {
      hud.objectives = [];
      hud.prompt = null;
      hud.panel = null;
      hud.subTimer = null;
      hud.timer = { label: 'お試しモード', seconds: 0, urgent: false };
      hud.hazard = { active: false, inside: false, message: null };
      hud.boss = null;
      map.enemies = [];
      map.hazard = null;
      map.markers = map.markers.filter((marker) => !['objective', 'hunt', 'helicopter', 'transmitter', 'lz'].includes(marker.kind));
    }
    originalHudUpdate(hud, map, dt);
  };

  const startPractice = (): void => {
    state.active = true;
    state.selectorOpen = false;
    host.resetRun(false);
    // Avoid a second reset inside both the desktop and mobile requestStart implementations.
    host.dirty = false;
    host.requestStart(false);
    ui.root.hidden = false;
    ui.setOpen(false);
    const active = host.session.inv.slots[host.session.inv.activeSlot]?.id ?? null;
    ui.syncActive(active as string | null);
  };

  host.quitToTitle = (): void => {
    state.active = false;
    state.selectorOpen = false;
    ui.setOpen(false);
    ui.root.hidden = true;
    originalQuit();
    host.mission.root.visible = true;
  };

  host.menus.showTitle = ((best) => {
    originalShowTitle(best);
    injectPracticeButton(host, startPractice);
  }) as Game['menus']['showTitle'];

  injectPracticeButton(host, startPractice);

  const onKey = (event: KeyboardEvent): void => {
    if (!state.active || host.state !== 'playing' || event.repeat) return;
    if (event.code !== 'BracketLeft' && event.code !== 'BracketRight') return;
    event.preventDefault();
    const current = host.session.inv.slots[host.session.inv.activeSlot]?.id as PracticeWeaponId | undefined;
    const at = Math.max(0, PRACTICE_WEAPON_IDS.indexOf(current ?? PRACTICE_WEAPON_IDS[0]!));
    const delta = event.code === 'BracketRight' ? 1 : -1;
    const next = PRACTICE_WEAPON_IDS[(at + delta + PRACTICE_WEAPON_IDS.length) % PRACTICE_WEAPON_IDS.length]!;
    host.weapons.cancelActions();
    equipPracticeWeapon(host.session.inv, next);
    refillPracticeSupplies(host.session.inv, host.session.vitals);
    host.weapons.reset();
    ui.syncActive(next);
  };
  window.addEventListener('keydown', onKey);

  let raf = 0;
  const sync = (): void => {
    const playing = state.active && host.state === 'playing';
    ui.root.hidden = !playing;
    if (state.active) {
      refillPracticeSupplies(host.session.inv, host.session.vitals);
      const active = host.session.inv.slots[host.session.inv.activeSlot]?.id ?? null;
      ui.syncActive(active as string | null);
    }
    if (!playing && state.selectorOpen) ui.setOpen(false);
    raf = requestAnimationFrame(sync);
  };
  raf = requestAnimationFrame(sync);

  return (): void => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    state.active = false;
    host.resetRun = originalReset;
    host.quitToTitle = originalQuit;
    host.hurtPlayer = originalHurt;
    host.menus.showTitle = originalShowTitle as Game['menus']['showTitle'];
    (host.zombies as unknown as { populate: typeof originalPopulate }).populate = originalPopulate;
    (host.zombies as unknown as { director: typeof originalDirector }).director = originalDirector;
    (host.mission as unknown as { update: typeof originalMissionUpdate }).update = originalMissionUpdate;
    (host.interaction as unknown as { update: typeof originalInteractionUpdate }).update = originalInteractionUpdate;
    (host.hud as unknown as { update: typeof originalHudUpdate }).update = originalHudUpdate;
    host.mission.root.visible = true;
    ui.dispose();
  };
}
