# Demo Troubleshooting

## If The App Does Not Start

Run:

```bash
docker compose up -d
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

## If Login Fails

Use one of the seeded accounts:

- `admin@example.com / Admin@12345`
- `hr@example.com / Admin@12345`
- `manager@example.com / Admin@12345`

If needed, reseed:

```bash
npm run db:seed
```

## If The Database Looks Wrong

Re-run migration and seed:

```bash
npx prisma migrate dev
npm run db:seed
```

## If A Demo Tap Does Not Show In The UI

Check:

1. the app is running on port `3000`
2. the device secret matches the seeded device
3. the UID exists for a known employee if you expect a valid tap
4. you are not accidentally reusing the same idempotency key

Known seeded values:

- device: `ENTRANCE-01`
- secret: `entrance-demo-01`
- valid UID: `46 14 33 07`

## If You Need A Guaranteed Valid Tap

Use:

```bash
curl -X POST http://localhost:3000/api/iot/attendance \
  -H "Content-Type: application/json" \
  -H "x-device-secret: entrance-demo-01" \
  -d '{"uid":"46 14 33 07","deviceCode":"ENTRANCE-01","firmwareVersion":"1.3.2","ipAddress":"192.168.1.41","signalStrength":-55,"source":"LIVE","idempotencyKey":"demo-valid-live-1"}'
```

## If You Need A Guaranteed Unknown Card

Use:

```bash
curl -X POST http://localhost:3000/api/iot/attendance \
  -H "Content-Type: application/json" \
  -H "x-device-secret: entrance-demo-01" \
  -d '{"uid":"FF FF FF FF","deviceCode":"ENTRANCE-01","firmwareVersion":"1.3.2","ipAddress":"192.168.1.41","signalStrength":-55,"source":"LIVE","idempotencyKey":"demo-unknown-live-1"}'
```

## If A Duplicate Tap Does Not Demonstrate Correctly

Trigger two taps for the same employee within a short interval using different idempotency keys. The first should create the event, and the second should be handled as a duplicate.

## If Examiner Asks For Evidence The Logic Works

Run:

```bash
npm test
```

Then explain that the suite covers:

- policy evaluation
- duplicate suppression
- unknown card handling
- anomaly generation
- leave sync
- correction application

## If Time Is Running Short

Use this compressed flow:

1. show dashboard
2. trigger valid tap
3. trigger unknown card
4. open operations
5. open reports
6. show settings audit log

That still demonstrates IoT, workflow, analytics, and governance.
