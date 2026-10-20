# Revision v2 — reverse logo, audio and VIP slide

20 October 2026. Requested changes implemented on the existing GoZero application.

## Operator / VIP workflow

1. Open `/operator`, select REHEARSAL or LIVE EVENT.
2. In Session & readiness, choose **BUAT QR / LINK VIP**, confirm, and privately share that link or let the single VIP scan the QR. This QR must not be shown on the audience LED.
3. Pair the VIP phone before stage time. Status becomes **HP VIP TERPASANG**. The page presents a glass slider, initially disabled unless the server is in VIP READY.
4. On the show caller's instruction press **VIP READY** and confirm. Early activation still requires an operational reason and does not fabricate contributions.
5. VIP drags the circular handle to the far right and releases. A tap or partial drag returns to the start. Keyboard alternative: hold right arrow while focused on the slider.
6. One accepted VIP request starts the timestamped countdown on the LED. Repeating a completed request cannot launch twice. VIP sees an activated success screen.
7. Operator **TRIGGER LAUNCH** remains the manual fallback; EMERGENCY REVEAL still needs a reason and confirmation.

**CABUT AKSES** revokes that VIP device. Making another link invalidates the old token and device immediately. Rehearsal reset invalidates VIP access; make a fresh link for the next run. A pairing lasts eight hours maximum. Refresh on the same paired browser works without the fragment token. A bare `/vip/live` URL is not an activation credential.

## Branding

The official supplied reverse-white PNG is used with its original proportions and descriptor on dark blue. The older original blue PNG is retained as a reference asset, but v2 uses `/logo-reverse.png`. No recreated typography or recoloring is used.

## Audio and animation

Click **AKTIFKAN AUDIO** on exactly one physical LED browser output. Browser gesture is required by autoplay policies; sound cannot safely auto-start without it. Audio assets are fetched ahead of time. The preview iframe, participant phone, and VIP phone are silent.

- Original synthesized 24-second ambient bed loops through holding, QR, live participation, VIP standby and hero; it ducks during launch.
- Five preloaded spoken English numbers play at countdown boundaries, followed by GO and an original eight-second reveal score. Speech padding is trimmed so numbers do not overlap.
- Mute and volume controls affect the one browser output. Verify desk routing and event levels during on-site rehearsal.
- Countdown has a timed circular arc, orbital detail and animated number arrivals. Finale gathers the energy into a point, expands a blue/green ring, then resolves to clean title and photo hero. Reduced-motion preference simplifies decorative animation.

No sound service, CDN or production speech credentials are needed. Countdown WAVs were synthesized using the Windows system voice, stored as assets and normalized. `scripts/render-audio.mjs` generates the original ambient/reveal score; `scripts/countdown-voice.ps1` plus `scripts/prepare-voice.py` are optional authoring tools. Production only needs Node/Docker.

## Security and validation

Pairing and revocation require operator authentication. VIP access uses a high-entropy, single-use pairing token; only its hash is persisted. Cookie is signed, HttpOnly, SameSite Strict and Secure in production. Neither token nor device credential is present in public state, participant QR, or audit text. Pairing is per session; live and rehearsal stay isolated. Single browser is an access policy, not biometric VIP identity.

12 automated tests pass, including operator-only pairing, single-device exchange, not-ready rejection, invalid gesture payload, concurrent duplicate launch, contribution preservation, revocation, reissue and reset. Local Chromium mobile touch checks cover tap, cancelled partial drag and completed drag, plus scheduled audio source starts and LED reveal. Hardware audio routing and actual venue performance need a desk rehearsal.
