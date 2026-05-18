# Viva Preparation

## 60-Second Project Pitch

“This project is an IoT-enabled workplace attendance platform for organizations. ESP32 RFID terminals capture employee taps and send them to a Next.js backend, which authenticates the device, validates the request, records attendance events, recalculates timesheets using configurable shift policy, and raises anomalies such as unknown cards, missed checkout, out-of-shift activity, and duplicate taps. On top of that, the platform supports manager-to-HR workflow for leave and correction approvals, device fleet monitoring, audit logs, and reporting. The key distinction value is that it combines hardware integration, business rules, workflow control, analytics, and governance in one system.”

## What To Emphasize

- `This is not just CRUD`: the backend makes decisions about attendance behavior.
- `This is not just scanning`: device telemetry and fleet health are tracked.
- `This is not just storage`: anomalies, notifications, and approvals create operational intelligence.
- `This is not hard-coded`: shift policy is configurable.
- `This is not single-user`: different organizational roles are supported.

## Likely Questions And Strong Answers

### Why did you choose RFID with ESP32?

RFID is low-cost, simple to deploy, and practical for workplace access and attendance. ESP32 was chosen because it provides WiFi connectivity, low cost, and enough capability to integrate RFID reading, device telemetry, and offline queuing behavior.

### Why is this an IoT system and not just a web application?

Because the system depends on physical devices that sense real-world events and communicate them to the platform. The attendance event starts at the device layer, not in the browser.

### How do you prevent duplicate attendance records?

The attendance service uses a duplicate tap window and optional idempotency keys. If the same user taps again too quickly, the system returns a handled duplicate response instead of creating a false check-out or extra event.

### How do you handle unknown or invalid cards?

The backend rejects them, records device error context, creates an anomaly, and opens a notification so the issue becomes visible to operations staff.

### What makes your system realistic for organizations?

- configurable shift rules
- manager then HR approvals
- device health monitoring
- anomaly detection
- audit trail
- payroll-oriented timesheets

That makes it closer to a real workforce operations platform.

### Why did you separate raw events from timesheets?

`AttendanceEvent` is the immutable source record. `Timesheet` is the derived daily summary used for reporting and payroll support. That separation improves auditability and allows recalculation when policy or corrections change.

### What security measures did you implement?

- per-device secrets
- optional shared API key fallback
- rate limiting
- role-based access control
- audit logging for important actions

### How is reliability handled on the device side?

The device firmware supports telemetry reporting and offline queue behavior, while the platform tracks last-seen times, errors, sync state, and a derived reliability score.

### How do approvals work?

Leave and correction requests move through a staged workflow: manager review first, HR finalization second. This matches organizational control rather than allowing direct single-step approval.

### Why is your anomaly layer important?

Because real attendance systems are not only about successful taps. They must also surface operational problems such as unknown cards, out-of-shift activity, missed checkout, and suspicious patterns across devices.

### What are the main limitations?

- notifications are currently internal rather than delivered by email/SMS
- rate limiting is in-memory rather than distributed
- reporting is strong but still demo-scale
- biometric anti-spoofing is outside the current scope

### If you had more time, what would you improve next?

- external notification channels
- distributed rate limiting
- broader automated testing
- production deployment hardening
- richer role-specific portal views

## Technical Decisions To Defend

### Next.js

Used because it supports UI pages, server actions, and API routes in one project, which reduces complexity for a full-stack academic build.

### Prisma

Used for a strongly typed data layer, fast iteration, and schema-driven development.

### PostgreSQL

Used because the domain is relational and requires integrity across employees, devices, events, anomalies, approvals, and audit logs.

### Policy In The Shift Model

Putting policy on shifts keeps the business logic configurable and avoids scattering magic numbers across the codebase.

## Good Closing Line

“The strongest part of this project is that it treats attendance as an operational system, not just a database of taps. It integrates IoT capture, policy logic, anomaly handling, workflow approval, reporting, and governance into one coherent workplace platform.”
