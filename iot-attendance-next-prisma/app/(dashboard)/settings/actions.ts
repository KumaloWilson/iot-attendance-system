"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import {
  createDepartment,
  createDevice,
  createShift,
  deleteDepartment,
  deleteDevice,
  deleteShift,
  updateDepartment,
  updateDevice,
  updateShift
} from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";

async function requireActionRole(role: UserRole) {
  const auth = await requireRole(role);
  if ("error" in auth) {
    throw new Error("Unauthorized");
  }
  return auth;
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
    if (error.name === "ZodError") return "Please review the form fields and try again.";
    if (error.message.includes("Unique constraint failed")) return "That record already exists. Use a different unique value and try again.";
    return error.message;
  }
  return fallback;
}

function finishSettingsMutation(redirectTo: string, flash: string) {
  revalidatePath("/settings");
  revalidatePath("/settings/departments");
  revalidatePath("/settings/shifts");
  revalidatePath("/settings/devices");
  redirect(withFlash(redirectTo, flash));
}

export async function createDepartmentAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/settings/departments");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const { department } = await createDepartment({
      name: String(formData.get("name") ?? "")
    });
    await writeAuditLog({
      ...actorFrom(auth),
      action: "CREATE",
      entityType: "Department",
      entityId: department.id,
      details: { name: department.name }
    });
    finishSettingsMutation(redirectTo, "Department created");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to create department"), "error"));
  }
}

export async function updateDepartmentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/settings/departments");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const { department } = await updateDepartment(id, {
      name: String(formData.get("name") ?? "")
    });
    await writeAuditLog({
      ...actorFrom(auth),
      action: "UPDATE",
      entityType: "Department",
      entityId: department.id,
      details: { name: department.name }
    });
    finishSettingsMutation(redirectTo, "Department updated");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to update department"), "error"));
  }
}

export async function deleteDepartmentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/settings/departments");
  try {
    const auth = await requireActionRole(UserRole.SUPER_ADMIN);
    const department = await deleteDepartment(id);
    await writeAuditLog({
      ...actorFrom(auth),
      action: "DELETE",
      entityType: "Department",
      entityId: department.id,
      details: { name: department.name }
    });
    finishSettingsMutation(redirectTo, "Department deleted");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to delete department"), "error"));
  }
}

export async function createShiftAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/settings/shifts");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const { shift } = await createShift({
      name: String(formData.get("name") ?? ""),
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      graceMinutes: Number(formData.get("graceMinutes") ?? 0),
      expectedMinutes: Number(formData.get("expectedMinutes") ?? 0),
      halfDayMinutes: Number(formData.get("halfDayMinutes") ?? 0),
      overtimeAfterMinutes: Number(formData.get("overtimeAfterMinutes") ?? 0),
      missedCheckoutGraceMinutes: Number(formData.get("missedCheckoutGraceMinutes") ?? 0),
      weekendAttendanceEnabled: formData.get("weekendAttendanceEnabled") === "on"
    });
    await writeAuditLog({
      ...actorFrom(auth),
      action: "CREATE",
      entityType: "Shift",
      entityId: shift.id,
      details: {
        name: shift.name,
        graceMinutes: shift.graceMinutes,
        halfDayMinutes: shift.halfDayMinutes,
        overtimeAfterMinutes: shift.overtimeAfterMinutes,
        missedCheckoutGraceMinutes: shift.missedCheckoutGraceMinutes,
        weekendAttendanceEnabled: shift.weekendAttendanceEnabled
      }
    });
    finishSettingsMutation(redirectTo, "Shift created");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to create shift"), "error"));
  }
}

export async function updateShiftAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/settings/shifts");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const { shift } = await updateShift(id, {
      name: String(formData.get("name") ?? ""),
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      graceMinutes: Number(formData.get("graceMinutes") ?? 0),
      expectedMinutes: Number(formData.get("expectedMinutes") ?? 0),
      halfDayMinutes: Number(formData.get("halfDayMinutes") ?? 0),
      overtimeAfterMinutes: Number(formData.get("overtimeAfterMinutes") ?? 0),
      missedCheckoutGraceMinutes: Number(formData.get("missedCheckoutGraceMinutes") ?? 0),
      weekendAttendanceEnabled: formData.get("weekendAttendanceEnabled") === "on"
    });
    await writeAuditLog({
      ...actorFrom(auth),
      action: "UPDATE",
      entityType: "Shift",
      entityId: shift.id,
      details: {
        name: shift.name,
        graceMinutes: shift.graceMinutes,
        halfDayMinutes: shift.halfDayMinutes,
        overtimeAfterMinutes: shift.overtimeAfterMinutes,
        missedCheckoutGraceMinutes: shift.missedCheckoutGraceMinutes,
        weekendAttendanceEnabled: shift.weekendAttendanceEnabled
      }
    });
    finishSettingsMutation(redirectTo, "Shift updated");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to update shift"), "error"));
  }
}

export async function deleteShiftAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/settings/shifts");
  try {
    const auth = await requireActionRole(UserRole.SUPER_ADMIN);
    const shift = await deleteShift(id);
    await writeAuditLog({
      ...actorFrom(auth),
      action: "DELETE",
      entityType: "Shift",
      entityId: shift.id,
      details: { name: shift.name }
    });
    finishSettingsMutation(redirectTo, "Shift deleted");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to delete shift"), "error"));
  }
}

export async function createDeviceAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/settings/devices");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const { device } = await createDevice({
      deviceCode: String(formData.get("deviceCode") ?? ""),
      name: String(formData.get("name") ?? ""),
      location: String(formData.get("location") ?? ""),
      mode: String(formData.get("mode") ?? "ENTRY_EXIT"),
      secret: String(formData.get("secret") ?? ""),
      isActive: formData.get("isActive") === "on"
    });
    await writeAuditLog({
      ...actorFrom(auth),
      action: "CREATE",
      entityType: "Device",
      entityId: device.id,
      details: { name: device.name, deviceCode: device.deviceCode }
    });
    finishSettingsMutation(redirectTo, "Device created");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to create device"), "error"));
  }
}

export async function updateDeviceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/settings/devices");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const { device } = await updateDevice(id, {
      deviceCode: String(formData.get("deviceCode") ?? ""),
      name: String(formData.get("name") ?? ""),
      location: String(formData.get("location") ?? ""),
      mode: String(formData.get("mode") ?? "ENTRY_EXIT"),
      secret: String(formData.get("secret") ?? ""),
      isActive: formData.get("isActive") === "on"
    });
    await writeAuditLog({
      ...actorFrom(auth),
      action: "UPDATE",
      entityType: "Device",
      entityId: device.id,
      details: { name: device.name, deviceCode: device.deviceCode, isActive: device.isActive }
    });
    finishSettingsMutation(redirectTo, "Device updated");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to update device"), "error"));
  }
}

export async function deleteDeviceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/settings/devices");
  try {
    const auth = await requireActionRole(UserRole.SUPER_ADMIN);
    const device = await deleteDevice(id);
    await writeAuditLog({
      ...actorFrom(auth),
      action: "DELETE",
      entityType: "Device",
      entityId: device.id,
      details: { name: device.name, deviceCode: device.deviceCode }
    });
    finishSettingsMutation(redirectTo, "Device deleted");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to delete device"), "error"));
  }
}
