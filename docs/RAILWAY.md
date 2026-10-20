# Railway deployment configuration

Deployed at https://gozero-crowd-launch-production.up.railway.app. Project, service and environment IDs are recorded in `DEPLOYED.md`.

## Service settings

- Source directory: this folder containing Dockerfile and railway.json.
- One persistent service and one replica. Disable sleeping for the event.
- Generate Railway public HTTPS domain; set target port to the running PORT (default Docker port 3100).
- Attach a persistent volume at `/app/data`. Server refuses Railway startup without an attached volume. Data directory is taken from `RAILWAY_VOLUME_MOUNT_PATH`.
- `NODE_ENV=production`, `HOST=0.0.0.0`, `ENABLE_LIVE=1`.
- Set fresh random `OPERATOR_PASSWORD` in Railway secrets, at least 16 characters; never include it in source or logs.
- Railway documents `RAILWAY_RUN_UID=0` for root-owned volume access with a non-root Docker image. Configure it on this service so the mounted directory is writable.
- PUBLIC_URL may be omitted after a generated domain exists: the app uses `https://${RAILWAY_PUBLIC_DOMAIN}`. For a custom domain, explicitly set PUBLIC_URL to that canonical HTTPS origin.
- Healthcheck `/health`, restart on failure, 60-second healthcheck timeout are declared in railway.json.

## Acceptance after deployment

Verify health, operator password login, unauthenticated action rejection, two independent participant devices, QR canonical origin, live/rehearsal isolation, LED updates, launch timestamp and state after service restart. Perform load testing in rehearsal only; reset rehearsal afterwards. Do not populate the live session during automated testing.

GitHub-linked updates can redeploy automatically. Pause automatic updates before the event, or freeze the release branch, because volume-backed redeployments may interrupt the connection. Preserve the volume across every update. Use the existing event SOP and AV acceptance checks.

References: https://docs.railway.com/config-as-code/reference and https://docs.railway.com/volumes.
