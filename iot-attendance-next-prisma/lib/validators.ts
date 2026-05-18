import { z } from "zod";

const deviceModeSchema = z.enum(["ENTRY_EXIT", "ENTRY_ONLY", "EXIT_ONLY"]);
const attendanceSourceSchema = z.enum(["LIVE", "OFFLINE_SYNC", "SEEDED"]);
const leaveTypeSchema = z.enum(["ANNUAL", "SICK", "OFFICIAL", "OTHER"]);
const leaveStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const correctionStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "APPLIED"]);
const notificationStatusSchema = z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]);
const employeeStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]);

export const employeeSchema = z.object({
  employeeNo: z.string().min(2),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  rfidUid: z.string().min(4),
  departmentId: z.string().optional().or(z.literal("")),
  shiftId: z.string().optional().or(z.literal("")),
  status: employeeStatusSchema.optional().default("ACTIVE")
});

export const employeeEnrollmentSchema = z.object({
  employeeId: z.string().min(1),
  rfidUid: z.string().min(4)
});

export const iotAttendanceSchema = z.object({
  uid: z.string().min(4),
  deviceCode: z.string().min(2).default("ENTRANCE-01"),
  occurredAt: z.string().datetime().optional(),
  firmwareVersion: z.string().max(40).optional(),
  ipAddress: z.string().max(64).optional(),
  signalStrength: z.coerce.number().int().min(-150).max(0).optional(),
  bootedAt: z.string().datetime().optional(),
  syncBatchId: z.string().max(80).optional(),
  idempotencyKey: z.string().max(120).optional(),
  source: attendanceSourceSchema.optional().default("LIVE")
});

export const departmentSchema = z.object({
  name: z.string().min(2).max(80)
});

export const shiftSchema = z.object({
  name: z.string().min(2).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  graceMinutes: z.coerce.number().int().min(0).max(180),
  expectedMinutes: z.coerce.number().int().min(1).max(1440),
  halfDayMinutes: z.coerce.number().int().min(1).max(1440),
  overtimeAfterMinutes: z.coerce.number().int().min(1).max(1440),
  missedCheckoutGraceMinutes: z.coerce.number().int().min(0).max(1440),
  weekendAttendanceEnabled: z.coerce.boolean().optional().default(false)
});

export const deviceCreateSchema = z.object({
  deviceCode: z.string().min(2).max(50),
  name: z.string().min(2).max(80),
  location: z.string().max(120).optional().or(z.literal("")),
  mode: deviceModeSchema.optional().default("ENTRY_EXIT"),
  secret: z.string().min(8).max(128),
  isActive: z.coerce.boolean().optional().default(true)
});

export const deviceUpdateSchema = z.object({
  deviceCode: z.string().min(2).max(50),
  name: z.string().min(2).max(80),
  location: z.string().max(120).optional().or(z.literal("")),
  mode: deviceModeSchema.optional().default("ENTRY_EXIT"),
  secret: z.string().min(8).max(128).optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional().default(true)
});

export const leaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  type: leaveTypeSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(5).max(500)
});

export const leaveReviewSchema = z.object({
  status: leaveStatusSchema,
  reviewNotes: z.string().max(500).optional().or(z.literal(""))
});

export const correctionRequestSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().datetime(),
  requestedCheckIn: z.string().datetime().optional().or(z.literal("")),
  requestedCheckOut: z.string().datetime().optional().or(z.literal("")),
  reason: z.string().min(5).max(500)
});

export const correctionReviewSchema = z.object({
  status: correctionStatusSchema,
  reviewNotes: z.string().max(500).optional().or(z.literal(""))
});

export const enrollmentScanSchema = z.object({
  uid: z.string().min(4),
  deviceCode: z.string().min(2),
  scannedAt: z.string().datetime().optional(),
  notes: z.string().max(240).optional().or(z.literal(""))
});

export const enrollmentAssignSchema = z.object({
  employeeId: z.string().min(1),
  notes: z.string().max(240).optional().or(z.literal(""))
});

export const notificationUpdateSchema = z.object({
  status: notificationStatusSchema
});
