# DEAD SIGNAL — Discord Activity setup

This branch converts DEAD SIGNAL into a Discord Activity while preserving normal browser play.

## Scope

- Desktop Discord Activity support
- Discord Embedded App SDK `ready()` handshake
- Existing Three.js/Vite game kept intact
- GitHub Pages deployment workflow
- Desktop-only guard for the current keyboard/mouse + Pointer Lock control scheme
- No OAuth, bot token, backend, database, or multiplayer added

## Required Discord configuration

1. Create an application in the Discord Developer Portal.
2. Copy the application ID.
3. In this GitHub repository, open **Settings → Secrets and variables → Actions → Variables**.
4. Create repository variable `DISCORD_CLIENT_ID` with the Discord application ID.
5. Open **Settings → Pages** and select **GitHub Actions** as the source.
6. Merge the Activity branch to `main` and wait for the `Deploy Discord Activity` workflow to succeed.
7. Copy the resulting GitHub Pages host/path.
8. In Discord Developer Portal open **Activities → URL Mappings** and map `/` to the deployed Pages location.
9. Enable Activities for the application.

The production build uses `VITE_DISCORD_CLIENT_ID`; GitHub Actions maps `DISCORD_CLIENT_ID` into it at build time.

## Local development

Create `.env.local`:

```env
VITE_DISCORD_CLIENT_ID=YOUR_DISCORD_APPLICATION_ID
```

Then:

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

For Discord-local testing, expose the Vite server through an HTTPS tunnel and point the Activity URL Mapping at that tunnel host.

## Acceptance checklist

Run these checks in the actual Discord Desktop client:

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

## Mobile

The current game requires keyboard, mouse, WebGL 2 and Pointer Lock. Discord mobile launches are detected and stopped with a clear desktop-only message. Mobile support should be treated as a separate input/UI project rather than a partial fallback.
