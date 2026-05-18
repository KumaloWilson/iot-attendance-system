"use server";

import {
  CorrectionRequestStatus,
  EnrollmentStatus,
  LeaveRequestStatus,
  NotificationStatus,
  UserRole
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";
import { applyApprovedCorrection, updateNotificationStatus } from "@/lib/operations";
import { prisma } from "@/lib/prisma";
import {
  correctionRequestSchema,
  correctionReviewSchema,
  employeeEnrollmentSchema,
  enrollmentAssignSchema,
  leaveRequestSchema,
  leaveReviewSchema,
  notificationUpdateSchema
} from "@/lib/validators";

async function requireActionRole(role: UserRole) {
  const auth = await requireRole(role);
  if ("error" in auth) throw new Error("Unauthorized");
  return auth;
}

function isHrRole(role: UserRole) {
  return role === UserRole.HR_ADMIN || role === UserRole.SUPER_ADMIN;
}

function actorFrom(auth: Awaited<ReturnType<typeof requireActionRole>>) {
  const user = auth.session.user ?? {};
  return {
    actorUserId: (user as { id?: string }).id ?? null,
    actorEmail: user.email ?? null
  };
}

function getRedirectTarget(formData: FormData, fallback: string) {
  return String(formData.get("redirectTo") ?? fallback) || fallback;
}

function withFlash(redirectTo: string, flash: string, tone: "success" | "error" | "info" | "warning" = "success") {
  const separator = redirectTo.includes("?") ? "&" : "?";
  return `${redirectTo}${separator}flash=${encodeURIComponent(flash)}&tone=${tone}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    if (error.name === "ZodError") return "Please review the workflow form fields and try again.";
    if (error.message.includes("Unique constraint failed")) return "That value is already assigned and cannot be reused here.";
    return error.message;
  }
  return fallback;
}

function refreshOperations() {
  revalidatePath("/operations");
  revalidatePath("/operations/leave/new");
  revalidatePath("/operations/corrections/new");
  revalidatePath("/operations/enrollment/direct");
  revalidatePath("/operations/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  revalidatePath("/timesheets");
  revalidatePath("/reports");
  revalidatePath("/settings");
  revalidatePath("/portal");
}

function finishOperationsMutation(redirectTo?: string, flash?: string) {
  refreshOperations();
  if (redirectTo) redirect(withFlash(redirectTo, flash ?? "Operation completed"));
}

export async function createLeaveRequestAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/operations");
  try {
    const auth = await requireActionRole(UserRole.MANAGER);
    const parsed = leaveRequestSchema.parse({
      employeeId: String(formData.get("employeeId") ?? ""),
      type: String(formData.get("type") ?? "ANNUAL"),
      startDate: new Date(String(formData.get("startDate") ?? "")).toISOString(),
      endDate: new Date(String(formData.get("endDate") ?? "")).toISOString(),
      reason: String(formData.get("reason") ?? "")
    });

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: parsed.employeeId,
        type: parsed.type,
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
        reason: parsed.reason.trim(),
        createdByUserId: actorFrom(auth).actorUserId
      }
    });

    await writeAuditLog({
      ...actorFrom(auth),
      action: "CREATE",
      entityType: "LeaveRequest",
      entityId: leave.id,
      details: { employeeId: leave.employeeId, type: leave.type }
    });

    finishOperationsMutation(redirectTo, "Leave request submitted");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to submit leave request"), "error"));
  }
}

export async function reviewLeaveRequestAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/operations");
  try {
    const auth = await requireActionRole(UserRole.MANAGER);
    const parsed = leaveReviewSchema.parse({
      status: String(formData.get("status") ?? ""),
      reviewNotes: String(formData.get("reviewNotes") ?? "")
    });
    const existing = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new Error("Leave request not found");

    const actor = actorFrom(auth);
    const now = new Date();
    let leave;

    if (parsed.status === LeaveRequestStatus.REJECTED) {
      leave = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.REJECTED,
          ...(isHrRole(auth.role)
            ? {
                reviewedByUserId: actor.actorUserId,
                reviewedAt: now,
                reviewNotes: parsed.reviewNotes || null
              }
            : {
                managerReviewedByUserId: actor.actorUserId,
                managerReviewedAt: now,
                managerReviewNotes: parsed.reviewNotes || null
              })
        }
      });
    } else if (!isHrRole(auth.role)) {
      leave = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.PENDING,
          managerReviewedByUserId: actor.actorUserId,
          managerReviewedAt: now,
          managerReviewNotes: parsed.reviewNotes || null
        }
      });
    } else {
      leave = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.APPROVED,
          managerReviewedByUserId: existing.managerReviewedByUserId ?? actor.actorUserId,
          managerReviewedAt: existing.managerReviewedAt ?? now,
          managerReviewNotes: (existing.managerReviewNotes ?? parsed.reviewNotes) || null,
          reviewedByUserId: actor.actorUserId,
          reviewedAt: now,
          reviewNotes: parsed.reviewNotes || null
        }
      });
    }

    await writeAuditLog({
      ...actor,
      action: parsed.status === LeaveRequestStatus.APPROVED
        ? isHrRole(auth.role)
          ? "HR_APPROVE"
          : "MANAGER_APPROVE"
        : "REJECT",
      entityType: "LeaveRequest",
      entityId: leave.id,
      details: {
        employeeId: leave.employeeId,
        status: leave.status,
        managerReviewedAt: leave.managerReviewedAt?.toISOString() ?? null,
        reviewedAt: leave.reviewedAt?.toISOString() ?? null
      }
    });

    finishOperationsMutation(redirectTo, parsed.status === LeaveRequestStatus.REJECTED ? "Leave request rejected" : "Leave review saved");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to review leave request"), "error"));
  }
}

export async function createCorrectionRequestAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/operations");
  try {
    const auth = await requireActionRole(UserRole.MANAGER);
    const date = new Date(String(formData.get("date") ?? ""));
    const requestedCheckIn = String(formData.get("requestedCheckIn") ?? "");
    const requestedCheckOut = String(formData.get("requestedCheckOut") ?? "");

    const parsed = correctionRequestSchema.parse({
      employeeId: String(formData.get("employeeId") ?? ""),
      date: date.toISOString(),
      requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn).toISOString() : "",
      requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut).toISOString() : "",
      reason: String(formData.get("reason") ?? "")
    });

    const correction = await prisma.attendanceCorrection.create({
      data: {
        employeeId: parsed.employeeId,
        date: new Date(parsed.date),
        requestedCheckIn: parsed.requestedCheckIn ? new Date(parsed.requestedCheckIn) : null,
        requestedCheckOut: parsed.requestedCheckOut ? new Date(parsed.requestedCheckOut) : null,
        reason: parsed.reason.trim(),
        requestedByUserId: actorFrom(auth).actorUserId
      }
    });

    await writeAuditLog({
      ...actorFrom(auth),
      action: "CREATE",
      entityType: "AttendanceCorrection",
      entityId: correction.id,
      details: { employeeId: correction.employeeId, date: correction.date.toISOString() }
    });

    finishOperationsMutation(redirectTo, "Correction request submitted");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to submit correction request"), "error"));
  }
}

export async function reviewCorrectionRequestAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/operations");
  try {
    const auth = await requireActionRole(UserRole.MANAGER);
    const parsed = correctionReviewSchema.parse({
      status: String(formData.get("status") ?? ""),
      reviewNotes: String(formData.get("reviewNotes") ?? "")
    });
    const existing = await prisma.attendanceCorrection.findUnique({ where: { id } });
    if (!existing) throw new Error("Correction request not found");

    const actor = actorFrom(auth);
    const now = new Date();
    let updated;

    if (parsed.status === CorrectionRequestStatus.REJECTED) {
      updated = await prisma.attendanceCorrection.update({
        where: { id },
        data: {
          status: CorrectionRequestStatus.REJECTED,
          ...(isHrRole(auth.role)
            ? {
                reviewedByUserId: actor.actorUserId,
                reviewedAt: now,
                reviewNotes: parsed.reviewNotes || null
              }
            : {
                managerReviewedByUserId: actor.actorUserId,
                managerReviewedAt: now,
                managerReviewNotes: parsed.reviewNotes || null
              })
        }
      });
    } else if (!isHrRole(auth.role)) {
      updated = await prisma.attendanceCorrection.update({
        where: { id },
        data: {
          status: CorrectionRequestStatus.PENDING,
          managerReviewedByUserId: actor.actorUserId,
          managerReviewedAt: now,
          managerReviewNotes: parsed.reviewNotes || null
        }
      });
    } else {
      updated = await prisma.attendanceCorrection.update({
        where: { id },
        data: {
          status: CorrectionRequestStatus.APPROVED,
          managerReviewedByUserId: existing.managerReviewedByUserId ?? actor.actorUserId,
          managerReviewedAt: existing.managerReviewedAt ?? now,
          managerReviewNotes: (existing.managerReviewNotes ?? parsed.reviewNotes) || null,
          reviewedByUserId: actor.actorUserId,
          reviewedAt: now,
          reviewNotes: parsed.reviewNotes || null
        }
      });
      await applyApprovedCorrection(id, actor.actorUserId, parsed.reviewNotes || null);
    }

    await writeAuditLog({
      ...actor,
      action: parsed.status === CorrectionRequestStatus.APPROVED
        ? isHrRole(auth.role)
          ? "HR_APPROVE"
          : "MANAGER_APPROVE"
        : parsed.status,
      entityType: "AttendanceCorrection",
      entityId: updated.id,
      details: {
        employeeId: updated.employeeId,
        status: updated.status,
        managerReviewedAt: updated.managerReviewedAt?.toISOString() ?? null,
        reviewedAt: updated.reviewedAt?.toISOString() ?? null
      }
    });

    finishOperationsMutation(redirectTo, parsed.status === CorrectionRequestStatus.REJECTED ? "Correction request rejected" : "Correction review saved");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to review correction request"), "error"));
  }
}

export async function updateNotificationStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/operations");
  try {
    const auth = await requireActionRole(UserRole.MANAGER);
    const parsed = notificationUpdateSchema.parse({
      status: String(formData.get("status") ?? "")
    });

    const notification = await updateNotificationStatus(id, parsed.status as NotificationStatus);
    await writeAuditLog({
      ...actorFrom(auth),
      action: parsed.status,
      entityType: "Notification",
      entityId: notification.id,
      details: { title: notification.title }
    });

    finishOperationsMutation(redirectTo, `Notification ${parsed.status.toLowerCase()}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to update notification"), "error"));
  }
}

export async function assignEnrollmentScanAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/operations");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const parsed = enrollmentAssignSchema.parse({
      employeeId: String(formData.get("employeeId") ?? ""),
      notes: String(formData.get("notes") ?? "")
    });

    const employee = await prisma.employee.findUnique({ where: { id: parsed.employeeId } });
    const scan = await prisma.enrollmentScan.findUnique({ where: { id } });
    if (!employee) throw new Error("Employee not found");
    if (!scan) throw new Error("Enrollment scan not found");

    await prisma.$transaction([
      prisma.enrollmentScan.update({
        where: { id },
        data: {
          status: EnrollmentStatus.ASSIGNED,
          assignedEmployeeId: employee.id,
          assignedByUserId: actorFrom(auth).actorUserId,
          assignedAt: new Date(),
          notes: parsed.notes || null
        }
      }),
      prisma.employee.update({
        where: { id: employee.id },
        data: { rfidUid: scan.uid }
      })
    ]);

    await writeAuditLog({
      ...actorFrom(auth),
      action: "ASSIGN",
      entityType: "EnrollmentScan",
      entityId: id,
      details: { employeeId: employee.id }
    });

    finishOperationsMutation(redirectTo, "Enrollment scan assigned");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to assign enrollment scan"), "error"));
  }
}

export async function enrollEmployeeCardAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/operations");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const parsed = employeeEnrollmentSchema.parse({
      employeeId: String(formData.get("employeeId") ?? ""),
      rfidUid: String(formData.get("rfidUid") ?? "")
    });

    const employee = await prisma.employee.update({
      where: { id: parsed.employeeId },
      data: { rfidUid: parsed.rfidUid.trim().toUpperCase() }
    });

    await writeAuditLog({
      ...actorFrom(auth),
      action: "UPDATE",
      entityType: "EmployeeEnrollment",
      entityId: employee.id,
      details: { employeeId: employee.id, rfidUid: employee.rfidUid }
    });

    finishOperationsMutation(redirectTo, "Employee RFID updated");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to update RFID assignment"), "error"));
  }
}
