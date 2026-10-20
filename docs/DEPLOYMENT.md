# Deployment

The realtime Node/SSE server requires one persistent process and writable disk. A static upload of `dist/` cannot provide contribution intake or operator control. Serverless functions without persistent process/disk are not supported by this implementation. The application is deployed on Railway; see `DEPLOYED.md` for the verified public deployment.

## Docker on a dedicated host or isolated service

1. Extract package into its own directory. Choose an unused loopback port; the sample uses 3100. Leave existing apps, Nginx, Hestia, PM2 and firewall unchanged until a hosting plan is approved.
2. Copy `.env.example` to `.env` and insert a fresh random operator password of at least 16 characters. Use an actual HTTPS canonical URL, not the example. Restrict file access (`chmod 600 .env` on Linux). Never commit credentials.
3. Run `docker compose build`, then `docker compose up -d`.
4. Confirm `docker compose ps`, `docker compose logs --tail=50`, and `curl http://127.0.0.1:3100/health` report healthy. No Docker build or live host deployment has been executed in the authoring environment.
5. At your authorized reverse proxy terminate HTTPS and forward only to this service. SSE needs HTTP/1.1, buffering disabled, no cache, and read timeout ≥3600s. Example location inside this service's own virtual host:

```nginx
location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
}
```

6. Open the canonical HTTPS `/operator`, `/led/live`, and `/join/live`. Verify cookies, QR origin and actual SSE updates with two physical devices. Use only the canonical origin for POST requests; aliases are deliberately rejected.
7. Copy approved WAV over `public/launch.wav` before build. Match the cue sheet timing or update both manifest and event config. Preserve license/approval for any replacement sound. No direct hardware integration is claimed.

The Compose volume `show-data` stores identity signing secret, show snapshots and audit log. Back up after show; do not remove the volume during the event. Single replica only. Keep rehearsal and live targets/config verified independently. For a future event provision a fresh volume/directory while preserving the old archive. Change the production password on every event and after personnel changes.

## Node without Docker

Run `npm ci --omit=dev`, `npm run build`, then set `NODE_ENV=production`, `OPERATOR_PASSWORD`, `PUBLIC_URL=https://…`, `ENABLE_LIVE=1`, and `HOST=127.0.0.1` using your host's secret/service manager. Start `node server.mjs` under your authorized process supervisor. Set working directory and persistent `DATA_DIR`. Do not put credentials into source files or shell history. Apply HTTPS/SSE proxy settings as above. A restart invalidates operator login; show state persists.

## Go/no-go checklist

Production acceptance still needs real-phone QR scanning, 30–100 attendee venue Wi-Fi rehearsal, long-duration display run, measured smoothness on the playback workstation, physical LED processor mapping, actual audio level/routing and a backup-switch drill. Local simulation proves application correctness, not venue network capacity or physical AV synchronization.
