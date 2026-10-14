import type { Game } from '../game/game';

export interface RuntimeBudgetInput {
  mobile: boolean;
  cores: number;
  memoryGb: number | null;
}

export interface RuntimeBudget {
  profile: 'desktop' | 'desktop-low' | 'mobile' | 'mobile-low';
  hudHz: number;
  zombieHz: number;
  renderScaleCap: number | null;
}

/** Pure device-budget selection so the policy can be regression-tested without a browser. */
export function chooseRuntimeBudget(input: RuntimeBudgetInput): RuntimeBudget {
  const cores = Number.isFinite(input.cores) ? Math.max(1, input.cores) : 8;
  const lowMemory = input.memoryGb !== null && input.memoryGb <= 4;
  if (input.mobile) {
    const low = cores <= 4 || lowMemory;
    return low
      ? { profile: 'mobile-low', hudHz: 24, zombieHz: 24, renderScaleCap: 0.68 }
      : { profile: 'mobile', hudHz: 30, zombieHz: 30, renderScaleCap: 0.78 };
  }
  const low = cores <= 4 || (input.memoryGb !== null && input.memoryGb <= 4);
  return low
    ? { profile: 'desktop-low', hudHz: 30, zombieHz: 45, renderScaleCap: 0.9 }
    : { profile: 'desktop', hudHz: 30, zombieHz: 60, renderScaleCap: null };
}

function deviceMemoryGb(): number | null {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const value = nav.deviceMemory;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Throttle a method whose first argument is delta-time. The most recent non-dt arguments are used and elapsed time is
 * accumulated, so simulation time is preserved instead of simply dropping work.
 */
function throttleDtMethod<T extends object>(target: T, key: keyof T, hz: number): void {
  if (!(hz > 0) || hz >= 58) return;
  const record = target as Record<string, unknown>;
  const name = String(key);
  const original = record[name];
  if (typeof original !== 'function') return;
  const fn = (original as (...args: unknown[]) => unknown).bind(target);
  const interval = 1 / hz;
  let accumulated = 0;
  record[name] = ((dt: number, ...rest: unknown[]): unknown => {
    if (!(dt > 0)) return fn(dt, ...rest);
    accumulated += dt;
    if (accumulated + 1e-6 < interval) return undefined;
    const step = Math.min(accumulated, 0.1);
    accumulated = Math.max(0, accumulated - step);
    return fn(step, ...rest);
  }) as unknown;
}

/** HUD has dt last instead of first, so use a specialised wrapper. */
function throttleHud(game: Game, hz: number): void {
  const hud = game.hud as unknown as { update(s: unknown, map: unknown, dt: number): void };
  const original = hud.update.bind(hud);
  const interval = 1 / Math.max(1, hz);
  let accumulated = 0;
  hud.update = (s: unknown, map: unknown, dt: number): void => {
    if (!(dt > 0)) {
      original(s, map, dt);
      return;
    }
    accumulated += dt;
    if (accumulated + 1e-6 < interval) return;
    const step = Math.min(accumulated, 0.12);
    accumulated = 0;
    original(s, map, step);
  };
}

/**
 * Safe performance pass: rendering/camera/input stay full-rate, while canvas-heavy HUD work and distant-enemy simulation
 * are budgeted separately. This produces a large mobile CPU win without changing mission timers or player physics.
 */
export function installRuntimePerformancePass(game: Game, mobile: boolean): RuntimeBudget {
  const budget = chooseRuntimeBudget({
    mobile,
    cores: navigator.hardwareConcurrency || 8,
    memoryGb: deviceMemoryGb(),
  });

  document.documentElement.dataset.performanceProfile = budget.profile;
  throttleHud(game, budget.hudHz);
  throttleDtMethod(game.zombies as unknown as Record<string, unknown>, 'update', budget.zombieHz);

  if (budget.renderScaleCap !== null && game.renderer.renderScale > budget.renderScaleCap) {
    game.renderer.setRenderScale(budget.renderScaleCap);
  }

  return budget;
}
