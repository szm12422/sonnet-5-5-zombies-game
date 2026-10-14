# DEAD SIGNAL — Discord Activity setup

This branch converts DEAD SIGNAL into a Discord Activity while preserving normal browser play.

## Scope

- Desktop Discord Activity support
- Discord Embedded App SDK `ready()` handshake
- Existing Three.js/Vite game kept intact
- GitHub Pages deployment workflow
- Desktop-only guard for the current keyboard/mouse + Pointer Lock control scheme
- No OAuth, bot token, backend, database, or multiplayer added

## Discord application

- Application ID: `1560032636016140449`
- Production host after deployment: `https://szm12422.github.io/sonnet-5-5-zombies-game/`

The application ID is public metadata and is intentionally compiled into the Activity build. No repository secret is required for it.

## Required Discord configuration

1. Merge the Activity branch to `main`.
2. Wait for the `Deploy Discord Activity` workflow to succeed. The workflow enables/configures GitHub Pages and deploys `dist`.
3. Confirm the production URL opens: `https://szm12422.github.io/sonnet-5-5-zombies-game/`.
4. In Discord Developer Portal, open application `1560032636016140449`.
5. Open **Activities → URL Mappings**.
6. Add a mapping whose prefix/path is `/` and whose target is the production GitHub Pages URL above.
7. Save the URL Mapping.
8. Open **Activities → Settings** and enable Activities.
9. Activate the unpublished Activity for your Discord account/testers using the application ID if Discord asks for it.
10. Launch it from Discord Desktop and run the acceptance checklist below.

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
