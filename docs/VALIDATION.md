# Validation — 19 October 2026

Environment: Windows, Node.js v24.19.0, npm 11.17.0, local Chromium. Actual source checks and tests were run; no public deployment was performed.

| Check | Result / evidence |
| --- | --- |
| `npm run build` | PASS: JavaScript syntax, event configuration, original PNG presence, WAV asset, static asset package and offline hero generation |
| `npm test` | 9 tests, 9 pass, 0 fail |
| HTTP integration simulation | 100 anonymous device cookies; concurrent contribution requests cap at target 50; 10 repeated requests from one identity count once |
| Operator auth | Public action requests rejected 401; wrong password rejected; foreign origin rejected 403; stale revision rejected 409 |
| State recovery | After server restart, count, signed participant identity and launch timestamp recovered; operator must log in again |
| Realtime | SSE current snapshot received, browser participant action updates operator and LED |
| Session isolation | Live count remains zero during rehearsal load simulation; live cannot use rehearsal reset |
| Browser participant | 390×844 mobile viewport: waiting CTA disabled, CTA opens on START, success shown, success persists after refresh |
| Browser operator | Login, SHOW QR, START, PAUSE, RESUME, confirmed VIP, confirmed LAUNCH, automatic HERO observed |
| Browser 95% lock | 49 additional independent request contexts plus one mobile browser reach count 50 and 95% lock without synthetic contributions |
| Seven LED states | Holding, QR, live energy, 95% lock, VIP, countdown/reveal and hero rendered at 1920×1080 |
| Confirmation cancel | BATAL closes dialog without requiring reason or dispatching cue |
| Browser errors | Zero uncaught page errors observed in operator, participant and LED during exercised flow |
| Audio | Browser ARM AUDIO gesture accepted; audible output level/hardware routing not measured |
| Emergency | Server engine confirms reason/confirmation required and immediate hero without inventing count; offline hero opened successfully with original PNG |

An initial sandboxed test run failed at Windows temporary-file rename permission. The same test suite passed in the local Node runtime with filesystem access. Browser QA found and fixed an incorrect circular-canvas size override and reason-dialog cancel validation. Build and tests were repeated after changes.

This is an operational single-server MVP, ready for rehearsal and deployment review. It is not evidence of physical venue readiness. Docker is not installed in the authoring environment, so Docker build has not been run. No deployment URL, public HTTPS, physical QR scan, Wi-Fi venue load, LED processor mapping, hardware sync or audio desk check has been verified. Headless browser success does not prove stable 60fps on the event playback workstation. Use the deployment go/no-go checklist before the event.
