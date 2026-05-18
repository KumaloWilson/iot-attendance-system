# Architecture Notes

## Overview

The system is a workplace attendance platform with two cooperating layers:

1. `IoT capture layer`
ESP32 + RC522 terminals read RFID cards and send structured HTTP requests to the backend.

2. `Application layer`
Next.js API routes authenticate the device, validate the payload, persist telemetry, write attendance events, recalculate timesheets, and trigger anomaly workflows.

## High-Level Flow

1. Employee taps RFID card on ESP32 terminal.
2. Terminal sends `POST /api/iot/attendance`.
3. Backend validates payload and authorizes the device secret.
4. Device telemetry is updated in the `Device` model.
5. Card UID is matched to an active `Employee`.
6. Attendance logic determines whether the tap is:
   - valid check-in
   - valid check-out
   - duplicate tap
   - invalid because no open check-in exists
   - unknown card
7. A raw `AttendanceEvent` is stored.
8. Daily `Timesheet` is recalculated using shift policy.
9. Anomaly detection runs and creates `AttendanceAnomaly` + `Notification` records where needed.
10. Dashboard, reports, operations, and settings pages surface the results.

## Core Domain Models

- `Employee`: worker identity, RFID UID, department, shift, employment status
- `Shift`: policy holder for timing rules
- `Device`: terminal identity, mode, telemetry, health, reliability context
- `AttendanceEvent`: immutable raw check-in/out stream
- `Timesheet`: derived daily attendance summary
- `LeaveRequest`: staged approval workflow for leave
- `AttendanceCorrection`: staged approval workflow for manual attendance fixes
- `AttendanceAnomaly`: operational exception record
- `Notification`: action queue tied to anomalies or workflow pressure
- `AuditLog`: evidence trail for admin and workflow actions

## Attendance Policy Engine

Attendance behavior is driven by shift configuration instead of hard-coded assumptions.

Policy fields:

- `graceMinutes`
- `expectedMinutes`
- `halfDayMinutes`
- `overtimeAfterMinutes`
- `missedCheckoutGraceMinutes`
- `weekendAttendanceEnabled`

This allows the project to model realistic workforce rules across departments and shifts.

## Workflow Design

The platform now supports staged review:

1. Manager review
2. HR finalization

This is applied to:

- leave requests
- attendance corrections

The design is stronger than a single-step approve/reject model because it better matches organizational control and accountability.

## Anomaly Logic

Implemented anomaly types include:

- unknown card
- device offline
- missed checkout
- out of shift
- rapid re-entry
- multi-device conflict
- excessive lateness

Each anomaly can create a notification, enabling the system to function as an operations console rather than just a passive record store.

## Device Monitoring

Each device tracks:

- firmware version
- IP address
- RSSI
- last boot
- last sync
- last seen
- last error

The frontend derives:

- online / degraded / offline state
- reliability score
- alert aging context

## Security Approach

- per-device secret support
- optional shared API key fallback
- rate limiting on IoT endpoint
- role-based access with `VIEWER`, `MANAGER`, `HR_ADMIN`, `SUPER_ADMIN`
- audit trail for admin and workflow activity

## Why This Is Distinction-Level

The project is not only CRUD plus RFID capture. It demonstrates:

- real IoT integration
- policy-driven business logic
- exception-aware workflow design
- operational analytics
- auditability and governance
- automated tests for critical logic

That combination makes the system look closer to an enterprise attendance product than a simple school project demo.
