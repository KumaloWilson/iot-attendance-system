# IoT Attendance Platform

RFID workplace attendance system for organizations, built with Next.js, Prisma, PostgreSQL, and ESP32 terminals. The platform covers live attendance capture, device fleet monitoring, policy-driven timesheets, staged approvals, anomaly detection, auditability, and reporting.

## Distinction Highlights

- `IoT + software integration`: ESP32 RFID devices post directly into the web platform.
- `Policy-driven attendance`: shifts now control grace period, half-day threshold, overtime threshold, missed-checkout grace, and weekend attendance behavior.
- `Operational intelligence`: duplicate tap suppression, unknown card rejection, rapid re-entry detection, out-of-shift checks, excessive lateness, multi-device conflict, and offline device alerts.
- `Enterprise workflow`: leave and attendance corrections now support manager review before HR finalization.
- `Governance`: audit log visibility for admin actions, enrollment changes, and workflow decisions.
- `Analytics`: attendance completion, overtime, alert aging, device reliability, department coverage, and leaderboard reporting.

## Stack

- Next.js App Router + TypeScript
- PostgreSQL
- Prisma ORM
- NextAuth credentials login
- Tailwind CSS
- ESP32 RFID IoT endpoint

## Key Modules

- `Dashboard`: live workforce operations view
- `Employees`: roster, dedicated create/edit management, RFID mapping, shift assignment, workflow counts
- `Attendance`: raw event stream, anomaly review, device health
- `Timesheets`: payroll-ready daily summaries
- `Reports`: monthly analytics, device reliability, overtime, alert aging
- `Operations`: dedicated leave/correction/enrollment/notification workflow pages
- `Settings`: dedicated department, device, and shift configuration pages plus admin audit history

## Quick Start

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Demo Users

- `admin@example.com / Admin@12345`
- `hr@example.com / Admin@12345`
- `manager@example.com / Admin@12345`
- `viewer@example.com / Admin@12345`

## Automated Validation

```bash
npm test
npm run build
```

The test suite covers:

- attendance policy evaluation
- duplicate tap suppression
- unknown card rejection
- anomaly generation
- leave-to-timesheet sync
- correction application
- employee create/update/delete management flow

## IoT Endpoints

Attendance:

```text
POST /api/iot/attendance
```

Enrollment:

```text
POST /api/iot/enrollment-scan
```

Headers:

```text
Content-Type: application/json
x-device-secret: per-device secret
```

Fallback shared-secret mode:

```text
x-api-key: value-from-IOT_API_KEY
```

## Example Attendance Payload

```json
{
  "uid": "46 14 33 07",
  "deviceCode": "ENTRANCE-01",
  "occurredAt": "2026-05-15T08:00:00.000Z",
  "firmwareVersion": "1.3.2",
  "ipAddress": "192.168.1.41",
  "signalStrength": -55,
  "source": "LIVE",
  "idempotencyKey": "ENTRANCE-01-1715580000-46143307"
}
```

## Suggested Demo Flow

1. Sign in as `admin@example.com`.
2. Show the dashboard control room and live device health.
3. Trigger a valid tap from `ENTRANCE-01`.
4. Repeat the same tap quickly to show duplicate suppression.
5. Trigger an unknown card to show alerting and anomaly capture.
6. Open `Operations` and show manager-reviewed, HR-pending leave/correction items.
7. Finalize an approval and show the timesheet/report change.
8. Open `Reports` to show overtime, reliability, alert aging, and anomaly summary.
9. Open `Settings` to show shift policy fields and audit evidence.

## Key Management Routes

- `/employees`, `/employees/new`, `/employees/[id]/edit`
- `/settings/departments`, `/settings/departments/new`, `/settings/departments/[id]/edit`
- `/settings/shifts`, `/settings/shifts/new`, `/settings/shifts/[id]/edit`
- `/settings/devices`, `/settings/devices/new`, `/settings/devices/[id]/edit`
- `/operations/leave/new`, `/operations/leave/[id]/review`
- `/operations/corrections/new`, `/operations/corrections/[id]/review`
- `/operations/enrollment/direct`, `/operations/enrollment/scans/[id]/assign`
- `/operations/notifications`, `/operations/notifications/[id]/review`

## Documentation

- [Architecture Notes](docs/architecture.md)
- [Demo Walkthrough](docs/demo-walkthrough.md)
- [Viva Preparation](docs/viva-prep.md)
- [Demo Troubleshooting](docs/demo-troubleshooting.md)

## Production Notes

- Move IoT rate limiting from memory to Redis or another shared store.
- Add email/SMS delivery for notifications and password resets.
- Add role-specific access hardening around more write actions.
- Extend analytics exports to PDF if required by stakeholders.
