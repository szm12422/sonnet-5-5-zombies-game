# DEAD SIGNAL — Discord Activity setup

This repository runs DEAD SIGNAL as a Discord Activity while preserving normal browser play.

## Scope

- Discord Desktop / Web Activity support
- Discord Android / iOS Activity touch support
- Discord Embedded App SDK `ready()` handshake
- Existing Three.js/Vite game kept intact
- GitHub Pages deployment workflow
- Desktop keyboard/mouse + Pointer Lock controls
- Mobile landscape touch controls without Pointer Lock
- Mobile conservative quality profile + adaptive resolution
- No OAuth, bot token, backend, database, or multiplayer added

## Discord application

- Application ID: `1560032636016140449`
- Production host: `https://szm12422.github.io/sonnet-5-5-zombies-game/`

The application ID is public metadata and is intentionally compiled into the Activity build. No repository secret is required for it.

## Required Discord configuration

1. Merge the validated branch to `main`.
2. Wait for the `Deploy Discord Activity` workflow to succeed.
3. Confirm the production URL opens: `https://szm12422.github.io/sonnet-5-5-zombies-game/`.
4. In Discord Developer Portal, open application `1560032636016140449`.
5. Open **Activities → URL Mappings**.
6. Map prefix `/` to `szm12422.github.io/sonnet-5-5-zombies-game/` (without `https://`).
7. Save the URL Mapping.
8. Open **Activities → Settings** and enable Activities.
9. Enable supported platforms for Desktop/Web and, after mobile acceptance testing passes, Android/iOS.
10. Launch from each enabled platform and run the acceptance checklist below.

Discord requires at least one URL Mapping before Activities can be enabled.

## Local development

Copy `.env.example` to `.env.local`, then run:

```bash
npm install
npm run dev
```

For a production-equivalent check:

```bash
npm run typecheck
npm test
npm run activity:build
```

For Discord-local testing, expose the Vite server through an HTTPS tunnel and temporarily point the Activity URL Mapping at that tunnel host.

## Desktop acceptance checklist

- Activity opens without a blank or 403 page.
- Discord SDK handshake completes.
- Title/loading flow renders.
- `DEPLOY` acquires Pointer Lock.
- WASD movement works.
- Mouse look works without a large first-frame jump.
- Left/right mouse fire and ADS work.
- Reload, interact, grenade, armor, map, slots, wheel, sprint, jump, and crouch work.
- `Esc` releases Pointer Lock and opens pause state.
- Resume reacquires Pointer Lock.
- Losing focus pauses safely.
- Audio starts after a user gesture and still works after resume.
- Settings and best-run data persist after reload.
- A full contract/extraction run can be completed.

## Mobile controls

Mobile uses a separate touch layer and does not request Pointer Lock.

- Landscape orientation is required. Portrait shows a rotate-device overlay.
- Left thumb: analog movement. Pushing far forward enables sprint automatically.
- Right-side drag: camera look.
- `FIRE`: hold to fire.
- `ADS`: hold to aim.
- `USE`: tap/hold interaction, including hold-to-use objectives.
- Dedicated jump, reload, grenade, armor, crouch, weapon-swap, map and pause buttons.
- When a supply/upgrade station panel is open, touch buttons `1` through `6` appear for purchases/upgrades.
- Mobile starts on the low quality preset at 0.82 render scale; the existing adaptive-resolution system can move toward 0.6–1.0 according to frame stability.

## Mobile acceptance checklist

Run on Discord Android and Discord iOS before enabling those platforms broadly:

- Activity loads and reaches the title screen in landscape.
- Portrait orientation blocks gameplay cleanly and asks for landscape.
- Deploy starts without a Pointer Lock prompt.
- Left stick movement and auto-sprint work in all directions.
- Right-side look works while moving with the left thumb simultaneously.
- Fire and ADS support hold gestures while movement/look remain active.
- Jump, reload, interact, grenade, armor, crouch, weapon swap, map and pause work.
- Hold interactions complete reliably without accidental camera motion.
- Station panel options 1–6 can be selected by touch.
- Pause/resume/restart work without Pointer Lock.
- Safe-area insets do not place controls under notches/system UI.
- UI remains usable on short/wide phone viewports.
- Audio starts after the first user gesture and resumes after pause.
- A full contract/extraction run can be completed.
- Sustained play does not show unacceptable thermal throttling or repeated frame drops.
