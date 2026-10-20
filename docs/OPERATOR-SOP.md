# Operator SOP — GoZero% / The Telkom Hub

## Before doors (T−60 to T−15)

Assign show caller, operator, LED tech, audio tech, and network PIC. Use wired Ethernet on server and LED workstation, AC power and sleep/notification suppression. Hold the show on a dedicated output display, 1920×1080/60 Hz; match LED processor mapping. Test real native scan at venue distance, front and back, using iOS and Android and venue Wi-Fi. Confirm 30–100 target from run-of-show, and ensure every join URL/QR points to the canonical reachable HTTPS origin.

1. Check `/health`; log into operator at canonical origin. Confirm correct session pill.
2. In REHEARSAL, verify one tap, refresh, duplicate prevention, pause/resume, and target lock. These contribution numbers must never be represented as real waste quantities.
3. Open LED route on workstation, arm audio and full-screen. Use only one audible output, not both browser and vMix/Resolume audio. Verify audio cue, intended routing and level with audio tech.
4. Dashboard should show connected LED, preloaded assets, audio armed. Manually check the actual physical LED for correct color, typography, framing, QR, and legible official descriptor. A green heartbeat alone cannot verify the physical screen.
5. Rehearse countdown, energy reveal, hero and emergency. Confirm all seven states.
6. Open `backup/hero.html` from extracted local files in another window; verify official logo. Keep manual switch to backup available on the workstation/playback system. Keep `public/launch.wav` ready in playback software if audio is run separately.
7. Reset REHEARSAL. Select LIVE only when deployment has live mode enabled. Verify count is zero, target correct, main LED output points to `/led/live`, participant QR points to `/join/live`.

## Live cue sequence

Use `docs/CUE-SHEET.md`. Normal cue buttons do not require dialogs; VIP, lock, launch, hero, emergency, and rehearsal reset do. Each critical action has a server-side confirmation check. The operator confirms only after the caller has said GO. Keep the operator screen private and away from the LED feed.

**HOLDING** pauses intake and shows pre-launch. **SHOW QR** displays scan prompt but does not open intake. **START PARTICIPATION** opens intake. **PAUSE** leaves LED live energy visible and blocks new identities. **RESUME** restores intake. Audience target automatically locks at 95%; manual lock is allowed only when actual energy has reached 95%. It cannot fabricate the missing share.

**VIP READY** holds indefinitely. Early VIP requires a reason of at least 8 characters; actual count/energy remain unchanged. Final cue **TRIGGER LAUNCH** starts countdown on every connected screen using server timestamp. No auto-GO occurs merely because the audience target is reached.

## Exceptions

| Situation | Operator response |
| --- | --- |
| Too few contributions / VIP schedule changed | Show caller authorizes early VIP; enter a specific reason, verify actual numbers, then final GO. |
| Participant sees reconnecting | Ask them to wait. Do not clear cookies. Reconnect sends full state; repeating an accepted tap stays idempotent. |
| Stale revision warning | Read new state and retry the intended cue; do not rapidly click different controls. |
| Network interruption | LED holds last known state with disconnect warning. Restore network, or switch workstation to the already-open local backup hero on caller GO. Local backup is visual-only and does not write a server audit; document its cue time manually after show. |
| Server running, show must reveal immediately | EMERGENCY REVEAL + reason + confirmation. Server stores the override and shows hero. |
| Server restarts during reveal | Reopen LED; state and timestamp recover. Re-arm audio manually. Missed sound is not replayed late automatically. |
| No audio | Check arm status and physical routing. Play local WAV manually on caller cue; avoid double playback. |
| Screen/processor failure | Tech switches to alternate feed/workstation; browser heartbeat cannot diagnose hardware. |

## After show

Hold hero for documentation. Log out. Stop the owned process during load-out. Archive `data/sessions.json`, `data/audit.ndjson`, event config and source version securely; keep `data/secret` private for state continuity. Rehearsal reset does not touch live. A fresh live event is created offline using a new DATA_DIR/volume after the old one has been archived. Never delete the active event's state to fix a visual cue.
