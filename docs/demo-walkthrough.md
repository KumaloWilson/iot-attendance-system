# Demo Walkthrough

## Goal

Show that the system handles real workplace attendance operations, not just card scanning.

Keep the demo to 4-6 minutes.

## Pre-Demo Checklist

- Start PostgreSQL with `docker compose up -d`
- Run the app with `npm run dev`
- Ensure the database is migrated and seeded:

```bash
npx prisma migrate dev
npm run db:seed
```

- Sign-in accounts ready:
  - `admin@example.com / Admin@12345`
  - `hr@example.com / Admin@12345`
  - `manager@example.com / Admin@12345`

## Recommended Flow

### 1. Open the Dashboard

Say:

“this is the live workplace operations view, not just an attendance table”

Point out:

- coverage
- open sessions
- device reliability
- approval pressure
- recent RFID activity

### 2. Trigger a Valid Tap

Use:

```bash
curl -X POST http://localhost:3000/api/iot/attendance \
  -H "Content-Type: application/json" \
  -H "x-device-secret: entrance-demo-01" \
  -d '{"uid":"46 14 33 07","deviceCode":"ENTRANCE-01","firmwareVersion":"1.3.2","ipAddress":"192.168.1.41","signalStrength":-55,"source":"LIVE","idempotencyKey":"demo-valid-1"}'
```

Show:

- live feed update
- attendance event recorded
- timesheet impact

### 3. Trigger a Duplicate Tap

Reuse the same person immediately:

```bash
curl -X POST http://localhost:3000/api/iot/attendance \
  -H "Content-Type: application/json" \
  -H "x-device-secret: entrance-demo-01" \
  -d '{"uid":"46 14 33 07","deviceCode":"ENTRANCE-01","firmwareVersion":"1.3.2","ipAddress":"192.168.1.41","signalStrength":-55,"source":"LIVE","idempotencyKey":"demo-valid-2"}'
```

Say:

“the backend suppresses accidental duplicate taps instead of corrupting attendance”

### 4. Trigger an Unknown Card

```bash
curl -X POST http://localhost:3000/api/iot/attendance \
  -H "Content-Type: application/json" \
  -H "x-device-secret: entrance-demo-01" \
  -d '{"uid":"FF FF FF FF","deviceCode":"ENTRANCE-01","firmwareVersion":"1.3.2","ipAddress":"192.168.1.41","signalStrength":-55,"source":"LIVE","idempotencyKey":"demo-unknown-1"}'
```

Show:

- request rejected
- anomaly recorded
- notification visible in dashboard/operations

### 5. Show Workflow Maturity

Open `Operations`.

Explain:

- leave requests use staged manager then HR review
- attendance corrections follow the same control pattern
- this mirrors real organizational governance

If needed:

- sign in as `manager@example.com` and perform manager approval
- sign in as `hr@example.com` and finalize

### 6. Show Reports

Open `Reports` and highlight:

- overtime
- attendance completion
- late minutes
- anomaly volume
- alert aging
- device reliability board

Say:

“the project supports both real-time operations and management reporting”

### 7. Show Settings and Audit Trail

Open `Settings`.

Point out:

- shift policy fields
- device configuration
- audit history

Say:

“policy is configurable, not hard-coded, and important actions are auditable”

## Closing Summary

Use a short close:

“the distinction value of this system is that it combines IoT capture, business rules, anomaly intelligence, staged approvals, operational monitoring, and auditability in one workplace attendance platform”
