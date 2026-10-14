/** Entry point: Discord Activity handshake, capability check, game construction, performance setup and dev hooks. */
import { Game } from './game/game';
import { installCombatFxPhase3 } from './fx/combatFxPhase3';
import { installJapanesePresentation, translateJa } from './i18n/ja';
import { installRuntimePerformancePass } from './perf/runtimeBudget';
import { prepareDiscordActivity } from './platform/discordActivity';
import { installMobileActivity, prepareMobileRuntime } from './platform/mobileActivity';
import { installMobileStationExtensions } from './platform/mobileStationExtensions';
import { installGraphicsPhase1 } from './render/graphicsPhase1';
import { installExtraWeaponAudio } from './weapons/extraWeapons';
import { installExtraWeaponFxAdapters } from './weapons/runtimeAdapters';

function showFatal(title: string, message: string): void {
  const root = document.getElementById('ui-root');
  if (!root) return;
  const box = document.createElement('div');
  box.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#05080c;color:#cfd8dc;font:14px/1.5 "Noto Sans JP","Yu Gothic UI","Hiragino Sans",Meiryo,system-ui,sans-serif;padding:24px;text-align:center;pointer-events:auto';
  const h = document.createElement('div');
  h.textContent = translateJa(title);
  h.style.cssText = 'font-size:20px;letter-spacing:0.08em;color:#e2b04a';
  const p = document.createElement('div');
  p.textContent = translateJa(message);
  p.style.maxWidth = '640px';
  p.style.whiteSpace = 'pre-line';
  box.append(h, p);
  root.appendChild(box);
}

async function main(): Promise<void> {
  installJapanesePresentation();

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiRoot = document.getElementById('ui-root');
  if (!canvas || !uiRoot) {
    showFatal('DEAD SIGNAL', 'The page is missing its canvas or UI root.');
    return;
  }

  try {
    const activity = await prepareDiscordActivity();
    const mobileActivity = activity.embedded && activity.platform === 'mobile';
    if (mobileActivity) prepareMobileRuntime();

    const game = new Game({ canvas, uiRoot });
    game.onFatal = (m) => showFatal('SOMETHING WENT WRONG', `${m}\n\nReload the page to try again.`);
    const ok = await game.init();
    if (!ok) return;

    // Touch controls establish the mobile quality baseline first; the runtime budget then applies the device-specific cap.
    if (mobileActivity) {
      installMobileActivity(game, uiRoot);
      installMobileStationExtensions(uiRoot);
    }
    installExtraWeaponAudio(game);
    installExtraWeaponFxAdapters(game);
    const performanceBudget = installRuntimePerformancePass(game, mobileActivity);
    installGraphicsPhase1(game, uiRoot, performanceBudget.profile);
    installCombatFxPhase3(game, performanceBudget.profile);

    if (import.meta.env.DEV) {
      const { installTestApi } = await import('./dev/testApi');
      installTestApi(game);
    }
  } catch (err) {
    console.error(err);
    showFatal('FAILED TO START', err instanceof Error ? err.message : String(err));
  }
}

void main();
