import type { Game } from '../game/game';
import type { Input, VirtualAction } from '../player/input';

interface MobileGameInternals {
  state: 'boot' | 'title' | 'playing' | 'paused' | 'ending' | 'results';
  dirty: boolean;
  pendingLock: 'none' | 'start' | 'resume';
  noLock: boolean;
  audio: Game['audio'];
  input: Input;
  renderer: Game['renderer'];
  settings: Game['settings'];
  interaction: Game['interaction'];
  applySettings(settings: Game['settings'], persist: boolean): void;
  resetRun(initial: boolean): void;
  beginPlaying(fresh: boolean): void;
  requestStart(restart: boolean): void;
  requestResume(): void;
  pause(reason: 'menu' | 'lost'): void;
}

/**
 * Game capability checks still require the Pointer Lock API on desktop. Mobile never uses pointer lock, so provide a
 * harmless capability shim before Game.init() on browsers where the method is missing.
 */
export function prepareMobileRuntime(): void {
  document.documentElement.dataset.mobileActivity = 'true';
  const proto = HTMLElement.prototype as unknown as { requestPointerLock?: () => void };
  if (typeof proto.requestPointerLock !== 'function') {
    Object.defineProperty(HTMLElement.prototype, 'requestPointerLock', {
      configurable: true,
      value: (): void => {},
    });
  }
}

function button(label: string, className: string, aria: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `mobile-control ${className}`;
  el.textContent = label;
  el.setAttribute('aria-label', aria);
  return el;
}

function bindHold(el: HTMLElement, setHeld: (held: boolean) => void): void {
  let pointerId: number | null = null;
  el.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    pointerId = ev.pointerId;
    el.setPointerCapture?.(ev.pointerId);
    setHeld(true);
  });
  const release = (ev: PointerEvent): void => {
    if (pointerId !== null && ev.pointerId !== pointerId) return;
    ev.preventDefault();
    ev.stopPropagation();
    pointerId = null;
    setHeld(false);
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', () => {
    if (pointerId !== null) {
      pointerId = null;
      setHeld(false);
    }
  });
}

function bindTap(el: HTMLElement, action: () => void): void {
  el.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    action();
  });
}

function installStyle(): HTMLStyleElement {
  const style = document.createElement('style');
  style.dataset.mobileActivityStyle = 'true';
  style.textContent = `
    html[data-mobile-activity="true"], html[data-mobile-activity="true"] body {
      overscroll-behavior: none;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
    }
    html[data-mobile-activity="true"] #game-canvas { touch-action: none; }
    .mobile-activity-shell {
      position: absolute;
      inset: 0;
      z-index: 60;
      pointer-events: none;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      -webkit-tap-highlight-color: transparent;
    }
    .mobile-play-controls { position: absolute; inset: 0; pointer-events: none; }
    .mobile-play-controls.is-hidden { display: none; }
    .mobile-look-zone {
      position: absolute;
      left: 34%; right: 0; top: 0; bottom: 0;
      pointer-events: auto;
      touch-action: none;
    }
    .mobile-joystick {
      position: absolute;
      left: max(18px, calc(env(safe-area-inset-left) + 12px));
      bottom: max(18px, calc(env(safe-area-inset-bottom) + 12px));
      width: 132px; height: 132px; border-radius: 50%;
      border: 1px solid rgba(160, 210, 230, .34);
      background: rgba(3, 10, 14, .28);
      box-shadow: inset 0 0 24px rgba(90, 190, 220, .07);
      pointer-events: auto; touch-action: none;
    }
    .mobile-joystick::before {
      content: ''; position: absolute; inset: 29%; border-radius: 50%;
      border: 1px solid rgba(190, 225, 235, .44);
      background: rgba(120, 190, 210, .13);
      transform: translate(var(--joy-x, 0px), var(--joy-y, 0px));
    }
    .mobile-control {
      position: absolute;
      display: grid; place-items: center;
      min-width: 48px; min-height: 48px;
      border: 1px solid rgba(190, 225, 235, .35);
      border-radius: 50%;
      background: rgba(5, 12, 17, .52);
      color: rgba(235, 246, 248, .92);
      font: 700 11px/1 ui-monospace, Menlo, Consolas, monospace;
      letter-spacing: .04em;
      box-shadow: inset 0 0 18px rgba(88, 198, 228, .06), 0 2px 10px rgba(0,0,0,.2);
      backdrop-filter: blur(3px);
      pointer-events: auto; touch-action: none;
    }
    .mobile-control:active { transform: scale(.94); background: rgba(70, 145, 165, .32); }
    .mobile-fire {
      right: max(18px, calc(env(safe-area-inset-right) + 12px));
      bottom: max(58px, calc(env(safe-area-inset-bottom) + 50px));
      width: 82px; height: 82px;
      border-color: rgba(235, 164, 94, .55);
      font-size: 12px;
    }
    .mobile-ads { right: max(112px, calc(env(safe-area-inset-right) + 106px)); bottom: max(86px, calc(env(safe-area-inset-bottom) + 78px)); width: 58px; height: 58px; }
    .mobile-jump { right: max(25px, calc(env(safe-area-inset-right) + 19px)); bottom: max(155px, calc(env(safe-area-inset-bottom) + 147px)); width: 54px; height: 54px; }
    .mobile-interact { right: max(105px, calc(env(safe-area-inset-right) + 99px)); bottom: max(158px, calc(env(safe-area-inset-bottom) + 150px)); width: 58px; height: 58px; }
    .mobile-reload { right: max(24px, calc(env(safe-area-inset-right) + 18px)); bottom: max(222px, calc(env(safe-area-inset-bottom) + 214px)); }
    .mobile-grenade { right: max(88px, calc(env(safe-area-inset-right) + 82px)); bottom: max(230px, calc(env(safe-area-inset-bottom) + 222px)); }
    .mobile-plate { right: max(151px, calc(env(safe-area-inset-right) + 145px)); bottom: max(225px, calc(env(safe-area-inset-bottom) + 217px)); }
    .mobile-crouch { right: max(174px, calc(env(safe-area-inset-right) + 168px)); bottom: max(145px, calc(env(safe-area-inset-bottom) + 137px)); }
    .mobile-weapon { right: max(176px, calc(env(safe-area-inset-right) + 170px)); bottom: max(78px, calc(env(safe-area-inset-bottom) + 70px)); }
    .mobile-map { left: max(18px, calc(env(safe-area-inset-left) + 12px)); top: max(16px, calc(env(safe-area-inset-top) + 10px)); }
    .mobile-pause { right: max(18px, calc(env(safe-area-inset-right) + 12px)); top: max(16px, calc(env(safe-area-inset-top) + 10px)); font-size: 16px; }
    .mobile-station-digits {
      position: absolute;
      left: 50%; bottom: max(18px, calc(env(safe-area-inset-bottom) + 12px));
      transform: translateX(-50%);
      display: none; gap: 7px; pointer-events: auto;
    }
    .mobile-station-digits.is-visible { display: flex; }
    .mobile-digit {
      position: static; width: 44px; height: 44px; min-width: 44px; min-height: 44px;
      border-radius: 12px; font-size: 15px;
    }
    .mobile-rotate {
      display: none; position: absolute; inset: 0; z-index: 100;
      align-items: center; justify-content: center; text-align: center;
      padding: 28px; box-sizing: border-box;
      pointer-events: auto;
      background: rgba(3, 7, 10, .94); color: #dce9ed;
      font: 700 15px/1.6 ui-monospace, Menlo, Consolas, monospace;
      letter-spacing: .05em;
    }
    @media (orientation: portrait) {
      .mobile-rotate { display: flex; }
      .mobile-play-controls { display: none !important; }
    }
    @media (max-height: 430px) {
      .mobile-joystick { width: 116px; height: 116px; }
      .mobile-fire { width: 72px; height: 72px; bottom: max(38px, calc(env(safe-area-inset-bottom) + 32px)); }
      .mobile-ads { bottom: max(66px, calc(env(safe-area-inset-bottom) + 60px)); }
      .mobile-jump { bottom: max(130px, calc(env(safe-area-inset-bottom) + 124px)); }
      .mobile-interact { bottom: max(135px, calc(env(safe-area-inset-bottom) + 129px)); }
      .mobile-reload, .mobile-grenade, .mobile-plate { bottom: max(194px, calc(env(safe-area-inset-bottom) + 188px)); }
      .mobile-crouch { bottom: max(120px, calc(env(safe-area-inset-bottom) + 114px)); }
      .mobile-weapon { bottom: max(55px, calc(env(safe-area-inset-bottom) + 49px)); }
    }
  `;
  document.head.appendChild(style);
  return style;
}

function pressDigit(digit: number): void {
  const code = `Digit${digit}`;
  document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
}

/** Enable landscape touch controls and a no-pointer-lock start/resume path for Discord mobile Activities. */
export function installMobileActivity(game: Game, uiRoot: HTMLElement): () => void {
  const host = game as unknown as MobileGameInternals;
  const style = installStyle();

  host.noLock = true;
  host.requestStart = (restart: boolean): void => {
    host.audio.init();
    if (restart || host.dirty) host.resetRun(false);
    host.dirty = true;
    host.pendingLock = 'none';
    host.beginPlaying(true);
  };
  host.requestResume = (): void => {
    host.audio.init();
    host.pendingLock = 'none';
    host.beginPlaying(false);
  };

  // Mobile starts conservative and the existing adaptive-resolution loop can recover upward when performance allows.
  host.applySettings({ ...host.settings, quality: 'low' }, false);
  host.renderer.setRenderScale(0.82);

  const shell = document.createElement('div');
  shell.className = 'mobile-activity-shell';
  shell.setAttribute('aria-label', 'Mobile game controls');

  const rotate = document.createElement('div');
  rotate.className = 'mobile-rotate';
  rotate.textContent = 'DEAD SIGNAL\n\n端末を横向きにしてください';
  rotate.style.whiteSpace = 'pre-line';

  const play = document.createElement('div');
  play.className = 'mobile-play-controls is-hidden';

  const look = document.createElement('div');
  look.className = 'mobile-look-zone';
  look.setAttribute('aria-label', 'Swipe to look');
  let lookPointer: number | null = null;
  let lookX = 0;
  let lookY = 0;
  look.addEventListener('pointerdown', (ev) => {
    if (!host.input.enabled || lookPointer !== null) return;
    ev.preventDefault();
    lookPointer = ev.pointerId;
    lookX = ev.clientX;
    lookY = ev.clientY;
    look.setPointerCapture?.(ev.pointerId);
  });
  look.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== lookPointer || !host.input.enabled) return;
    ev.preventDefault();
    const dx = ev.clientX - lookX;
    const dy = ev.clientY - lookY;
    lookX = ev.clientX;
    lookY = ev.clientY;
    host.input.addVirtualLook(dx * 1.18, dy * 1.18);
  });
  const releaseLook = (ev: PointerEvent): void => {
    if (ev.pointerId === lookPointer) lookPointer = null;
  };
  look.addEventListener('pointerup', releaseLook);
  look.addEventListener('pointercancel', releaseLook);

  const joystick = document.createElement('div');
  joystick.className = 'mobile-joystick';
  joystick.setAttribute('aria-label', 'Movement joystick');
  let joyPointer: number | null = null;
  const updateStick = (ev: PointerEvent): void => {
    const rect = joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.42);
    const dx = ev.clientX - (rect.left + rect.width / 2);
    const dy = ev.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    joystick.style.setProperty('--joy-x', `${x}px`);
    joystick.style.setProperty('--joy-y', `${y}px`);
    const strafe = x / radius;
    const forward = -y / radius;
    const magnitude = Math.min(1, length / radius);
    host.input.setVirtualMove(strafe, forward, magnitude > 0.88 && forward > 0.62);
  };
  joystick.addEventListener('pointerdown', (ev) => {
    if (!host.input.enabled || joyPointer !== null) return;
    ev.preventDefault();
    joyPointer = ev.pointerId;
    joystick.setPointerCapture?.(ev.pointerId);
    updateStick(ev);
  });
  joystick.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== joyPointer || !host.input.enabled) return;
    ev.preventDefault();
    updateStick(ev);
  });
  const releaseStick = (ev: PointerEvent): void => {
    if (ev.pointerId !== joyPointer) return;
    joyPointer = null;
    joystick.style.setProperty('--joy-x', '0px');
    joystick.style.setProperty('--joy-y', '0px');
    host.input.setVirtualMove(0, 0, false);
  };
  joystick.addEventListener('pointerup', releaseStick);
  joystick.addEventListener('pointercancel', releaseStick);

  const fire = button('FIRE', 'mobile-fire', 'Fire');
  const ads = button('ADS', 'mobile-ads', 'Aim down sights');
  const jump = button('JUMP', 'mobile-jump', 'Jump');
  const interact = button('USE', 'mobile-interact', 'Interact');
  const reload = button('R', 'mobile-reload', 'Reload');
  const grenade = button('G', 'mobile-grenade', 'Grenade');
  const plate = button('ARM', 'mobile-plate', 'Apply armor plate');
  const crouch = button('C', 'mobile-crouch', 'Crouch');
  const weapon = button('SWAP', 'mobile-weapon', 'Switch weapon');
  const map = button('MAP', 'mobile-map', 'Tactical map');
  const pause = button('Ⅱ', 'mobile-pause', 'Pause');

  bindHold(fire, (held) => host.input.setVirtualFire(held));
  bindHold(ads, (held) => host.input.setVirtualAds(held));
  bindHold(interact, (held) => host.input.setVirtualInteract(held));
  const tapAction = (el: HTMLElement, action: VirtualAction): void => bindTap(el, () => host.input.pressVirtual(action));
  tapAction(jump, 'jump');
  tapAction(reload, 'reload');
  tapAction(grenade, 'grenade');
  tapAction(plate, 'plate');
  tapAction(crouch, 'crouch');
  tapAction(map, 'map');
  bindTap(weapon, () => host.input.cycleVirtualWeapon(1));
  bindTap(pause, () => host.pause('menu'));

  const digits = document.createElement('div');
  digits.className = 'mobile-station-digits';
  for (let i = 1; i <= 6; i++) {
    const d = button(String(i), 'mobile-digit', `Station option ${i}`);
    bindTap(d, () => pressDigit(i));
    digits.appendChild(d);
  }

  play.append(look, joystick, fire, ads, jump, interact, reload, grenade, plate, crouch, weapon, map, pause, digits);
  shell.append(play, rotate);
  uiRoot.appendChild(shell);

  let raf = 0;
  const sync = (): void => {
    const playing = host.state === 'playing';
    play.classList.toggle('is-hidden', !playing);
    digits.classList.toggle('is-visible', playing && host.interaction.panelOpen);
    raf = requestAnimationFrame(sync);
  };
  raf = requestAnimationFrame(sync);

  return (): void => {
    cancelAnimationFrame(raf);
    host.input.clear();
    shell.remove();
    style.remove();
  };
}
