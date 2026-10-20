# GoZero% Crowd-Powered Launch v2

Operational MVP for **KICK START ZERO WASTE TO LANDFILL — THE TELKOM HUB**.
Official supplied reverse-white GoZero PNG is used unchanged. Blue `#004781` leads the visual system.

## Live application

- Participant: https://gozero-crowd-launch-production.up.railway.app/join/live
- LED: https://gozero-crowd-launch-production.up.railway.app/led/live
- Operator: https://gozero-crowd-launch-production.up.railway.app/operator

Production operator password is stored only in Railway Variables (`OPERATOR_PASSWORD`). This repository contains the source baseline for the Railway application; no runtime session data or production credentials. See `docs/DEPLOYED.md` for verified deployment details.

## Run locally

Requires Node.js 22 or 24 and npm. No database account or production credentials required.

```powershell
npm ci
npm run build
npm test
npm start
```

Open http://127.0.0.1:3100/operator. Local rehearsal password: **gozero-rehearsal**.

| Route | Purpose |
| --- | --- |
| `/operator` | Password-protected command center |
| `/join/rehearsal` | Mobile participant page |
| `/led/rehearsal` | 1920×1080 realtime output, scaled with letterboxing |
| `/api/qr/rehearsal` | QR generated locally from configured URL |
| `/health` | Process health |

The operator can use multiple devices, but commands carry a revision guard. A stale cue is rejected for review. Browser sessions expire after 8 hours or a server restart. The server persists show state, contribution identities, and launch timestamps under `data/`. SSE reconnects with the full current snapshot. A restart during launch resumes according to the persisted timestamp; it does not restart the countdown.

## Try the show

1. Open operator, LED and participant routes in separate windows/devices.
2. On the actual LED output click **AKTIFKAN AUDIO** once, verify output/volume, then **FULL SCREEN**. The ambient score loops through the show; countdown uses preloaded spoken English numbers and a GO cue. The embedded operator preview and participant/VIP phones are always silent.
3. Set a target from 30 to 100 while holding and before the first contribution. Default 50.
4. **SHOW QR**, then **START PARTICIPATION** on the MC's cue. Each browser device contributes once per epoch.
5. At target, audience energy locks automatically at 95%. Click **VIP READY** and confirm. VIP standby can hold indefinitely.
6. Use **BUAT QR / LINK VIP** in operator, privately pair one VIP phone, then **VIP READY** on caller cue. VIP completes the iPhone-style slide to start the 5-second spoken countdown → convergence → surge → burst → title → hero. **TRIGGER LAUNCH** remains a confirmed operator fallback.
7. **SHOW HERO SCREEN** bypasses the rest of the reveal after launch, or wait for automatic hero (17 seconds after GO by default).
8. **RESET REHEARSAL** creates a new rehearsal epoch. Live data cannot be reset using that control.

You can rehearse the finale with one participant: VIP READY before 95% asks for an operational reason. It leaves actual energy/count unchanged and writes an EARLY override to the audit. This is a real early cue, not synthetic audience activity. The final visual circle completes at reveal; metrics remain `min(95, count / target * 95)`.

## Phones on the venue Wi-Fi

Loopback QR URLs do not work on other phones. For a trusted LAN rehearsal, set a reachable address before startup:

```powershell
$env:HOST="0.0.0.0"
$env:PUBLIC_URL="http://192.168.1.50:3100"
$env:OPERATOR_PASSWORD="your-own-long-password"
npm start
```

Use the actual workstation IP and an isolated event network. HTTP LAN use is rehearsal only. For event production use HTTPS as described in `docs/DEPLOYMENT.md`. Set PUBLIC_URL to the one canonical participant origin; operator should use that same origin. QR is generated with that exact address. Confirm Wi-Fi client isolation does not block the server, and test from the back row with real phones.

## Event configuration

Edit `event.config.json`, run build and restart. Event title/title lines, reveal lines, venue, tagline, descriptor, color palette, logo URL, target, CTA, all core LED messages, countdown seconds, reveal duration and cinematic/reduced animation mode are configurable. The bundled server serves `/logo.png`; replace that file with an authorized asset for a future event. Do not distort or recolor the GoZero PNG. Use `titleLines` for holding and `revealLines` for the hero composition. Remove `data/` only for a new event while server is stopped and after archiving it; existing session targets are preserved across configuration restarts. Fonts are local system fonts; no CDN is required.

## Data and security boundaries

- No name, email, login, or personal form for participants. HttpOnly signed anonymous device cookie is hashed per session epoch before persistence. Browser reload and repeated/concurrent taps are idempotent.
- This is anonymous browser deduplication, not verified human identity. Clearing cookies, switching browsers, or private sessions can generate another identity. Stronger identity would require a different entry policy.
- Password verification uses scrypt; signed operator cookies are HttpOnly/SameSite Strict, Secure in production. Credentials and contribution IDs never enter public state. Production rejects a missing/short operator password and non-HTTPS PUBLIC_URL.
- Same-origin JSON POST checks, request-size limits, login and contribution throttles. The 240 contribution requests/minute/IP cap supports a shared NAT for 100 attendees; avoid repetitive automation during the live window.
- Audit is an append-only NDJSON application log, not tamper-proof storage. Restrict filesystem access, back up the volume, and retain only as needed. Operators are a shared role; individual operator attribution would require per-person accounts.
- Single Node process + persistent local volume. Do not run multiple replicas on the same state file. Container/process crash recovery is implemented; power-loss durability and HA are not claimed.
- Live browser count means unique anonymous browsers currently connected through participant SSE, not attendance. LED readiness is browser-reported heartbeat (12-second timeout), not confirmation of physical processor signal.
- Do not expose the rehearsal password on a public server. Production mode uses only the configured password. `/live` routes exist only when `ENABLE_LIVE=1`; the operator selects rehearsal or live explicitly.

## Deliverables

Source, seven LED states, realtime engine, branded mobile page, operator dashboard, generated QR, rehearsal sound, configuration, automated tests, Docker deployment files, operator SOP, director cue sheet and AV manifest are included. The server must run for realtime; `dist/` contains static assets only.

See `docs/OPERATOR-SOP.md`, `docs/CUE-SHEET.md`, `docs/AV-MANIFEST.json`, `docs/DEPLOYMENT.md`, and `docs/VALIDATION.md`.

## VIP access

The VIP page is `/vip/[sessionId]`, accessed through the private operator-generated link/QR. A fragment token is exchanged once for an HttpOnly signed cookie bound to one browser, session and epoch. Link expires after eight hours. Regenerating or revoking the link invalidates the old device. Ordinary participants cannot trigger the VIP endpoint. The slide is blocked until VIP READY and on connection loss. Partial drag or tap cannot launch. Keyboard users hold the right arrow. See `docs/REVISION-V2.md`.
