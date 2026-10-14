/** Small inline SVG icon set (24x24 grid) and weapon silhouettes. All drawn with `currentColor`. */
import type { WeaponId } from '../types';
import { svgEl } from './dom';

export type IconName =
  | 'cross'
  | 'shield'
  | 'plate'
  | 'grenade'
  | 'lock'
  | 'check'
  | 'x'
  | 'diamond'
  | 'diamondHollow'
  | 'hazard'
  | 'target'
  | 'signal';

interface IconPart {
  d: string;
  mode: 'fill' | 'stroke';
}

const ICONS: Record<IconName, IconPart[]> = {
  cross: [{ d: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z', mode: 'fill' }],
  shield: [{ d: 'M12 2 4 5v6c0 5.2 3.4 9.3 8 11 4.6-1.7 8-5.8 8-11V5z', mode: 'fill' }],
  plate: [{ d: 'M7.5 3h9L20 7v11l-3 3H7l-3-3V7z', mode: 'fill' }],
  grenade: [
    { d: 'M12 8.6a6.4 6.4 0 1 0 .001 0z', mode: 'fill' },
    { d: 'M10.4 3h3.2v4h-3.2z', mode: 'fill' },
    { d: 'M14 4.4 19.6 3l.6 1.7-5.6 1.7z', mode: 'fill' },
  ],
  lock: [{ d: 'M7 10V7a5 5 0 0 1 10 0v3h1.5v11h-13V10zm2.2 0h5.6V7a2.8 2.8 0 0 0-5.6 0z', mode: 'fill' }],
  check: [{ d: 'M4.5 12.5l5 5L20 6.5', mode: 'stroke' }],
  x: [{ d: 'M5.5 5.5l13 13M18.5 5.5l-13 13', mode: 'stroke' }],
  diamond: [{ d: 'M12 2.5l9.5 9.5-9.5 9.5L2.5 12z', mode: 'fill' }],
  diamondHollow: [{ d: 'M12 3.5l8.5 8.5-8.5 8.5L3.5 12z', mode: 'stroke' }],
  hazard: [
    { d: 'M12 3.2 21.6 20H2.4z', mode: 'stroke' },
    { d: 'M12 9.5v5.2M12 17.2v.1', mode: 'stroke' },
  ],
  target: [
    { d: 'M12 4.5a7.5 7.5 0 1 0 .001 0z', mode: 'stroke' },
    { d: 'M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4', mode: 'stroke' },
    { d: 'M12 10.6a1.4 1.4 0 1 0 .001 0z', mode: 'fill' },
  ],
  signal: [{ d: 'M4 20V15M9 20V11M14 20V7M19 20V3', mode: 'stroke' }],
};

export function icon(name: IconName, cls = ''): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 24 24', class: `ds-ic ${cls}`.trim(), 'aria-hidden': 'true', focusable: 'false' });
  for (const part of ICONS[name]) {
    const p = svgEl('path', { d: part.d }, svg);
    if (part.mode === 'fill') {
      p.setAttribute('fill', 'currentColor');
    } else {
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '2');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
    }
  }
  return svg;
}

/** Simple side-on weapon silhouettes (muzzle to the right), viewBox 0 0 160 50. */
const WEAPON_PATHS: Record<string, string[]> = {
  rifle: [
    'M4 21 30 19 34 30 9 36z',
    'M30 17h50v13H30z',
    'M42 11h26v5H42zM46 8h18v3H46z',
    'M80 19h44v9H80z',
    'M124 21h20v5h-20zM144 19h12v9h-12z',
    'M50 30h11l-4 15H46z',
    'M64 30h11l-1 17H61z',
    'M112 14h3v5h-3z',
  ],
  pistol: [
    'M14 10h70v13H14z',
    'M84 12h8v9h-8z',
    'M18 7h5v3h-5zM78 7h4v3h-4z',
    'M14 23h50l-6 8H34v-8z',
    'M14 23h22l-7 24H8z',
  ],
  shotgun: [
    'M3 20 34 18 38 30 8 38z',
    'M34 16h42v14H34z',
    'M76 17h78v5H76z',
    'M76 24h68v4H76z',
    'M96 23h30v9H96z',
    'M44 30h14l-2 6H46zM38 30h8l-4 12h-8z',
    'M148 13h4v4h-4z',
  ],
  smg: [
    'M10 21 30 20 33 29 15 34z',
    'M29 16h48v14H29z',
    'M76 19h32v8H76zM108 21h20v5h-20z',
    'M39 11h25v4H39z',
    'M46 30h12l-5 16H43z',
    'M62 30h11l2 17H62z',
  ],
  lmg: [
    'M2 21 29 18 35 31 8 38z',
    'M29 15h57v16H29z',
    'M85 18h55v9H85zM140 20h16v6h-16z',
    'M44 9h28v5H44z',
    'M50 31h12l-5 15H45z',
    'M65 29h25v17H63z',
    'M111 27l-8 19h4l9-19zM122 27l10 19h4l-9-19z',
  ],
  dmr: [
    'M3 22 31 18 35 30 8 37z',
    'M31 16h50v14H31z',
    'M80 19h52v8H80zM132 21h25v5h-25z',
    'M43 7h33v5H43zM51 4h17v3H51z',
    'M49 30h11l-4 16H45z',
    'M64 30h10l-1 14H62z',
  ],
  magnum: [
    'M10 11h88v14H10z',
    'M98 13h28v10H98z',
    'M15 8h6v3h-6zM91 8h5v3h-5z',
    'M12 25h55l-7 8H35v-8z',
    'M13 25h24l-8 23H6z',
    'M69 25h16l4 12H72z',
  ],
  autoshotgun: [
    'M4 21 31 18 37 31 10 38z',
    'M33 15h48v16H33z',
    'M80 17h73v6H80z',
    'M80 25h69v5H80z',
    'M91 22h31v10H91z',
    'M48 31h13l-4 6H47zM39 31h9l-5 13h-9z',
    'M64 30h14l2 15H63z',
  ],
};

export function weaponSilhouette(id: WeaponId | string, cls = ''): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 160 50', class: `ds-wsil ${cls}`.trim(), 'aria-hidden': 'true', focusable: 'false' });
  const paths = WEAPON_PATHS[id] ?? WEAPON_PATHS.rifle!;
  for (const d of paths) svgEl('path', { d, fill: 'currentColor' }, svg);
  return svg;
}
