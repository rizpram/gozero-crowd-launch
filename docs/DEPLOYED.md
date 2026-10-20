# Deployment verified — 19 October 2026

Public URL: https://gozero-crowd-launch-production.up.railway.app

Railway project: 292b5a1e-7cd7-45a1-987e-15fc77038121
Service: 5c5f5f99-21ae-4183-967b-72fa3334abb0
Environment: production (8425aa6f-45e9-47cc-897b-a8ea6a7e9c9f)
Successful deployment: c2c4f691-8d99-4570-a504-529cee10cbbf

One replica, iad region; 500 MB persistent volume mounted at /app/data. Sleep disabled. Operator password is configured in Railway Variables and excluded from this report/source.

Verified publicly: HTTPS /health 200; password login; operator and cue APIs reject unauthenticated requests with 401; foreign-origin POST rejected with 403; QR loads; mobile contribution updates dashboard and LED in realtime; accepted contribution survives browser reload without incrementing; early VIP preserves actual count/energy; countdown proceeds to hero; no uncaught page errors. Rehearsal reset to holding, zero contributions. Live session remains holding with zero contributions.

The first provisional start failed because the public URL was not configured yet. After completing environment configuration, redeployment reached SUCCESS. Physical venue Wi-Fi/LED/audio routing remain untested. Source uploaded through Railway CLI; GitHub autodeploy is not connected. Future releases can use the same project/service IDs with railway up.
