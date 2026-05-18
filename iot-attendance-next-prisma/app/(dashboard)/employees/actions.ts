"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { createEmployee, deleteEmployee, updateEmployee } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";

async function requireActionRole(role: UserRole) {
  const auth = await requireRole(role);
  if ("error" in auth) throw new Error("Unauthorized");
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
    if (error.name === "ZodError") return "Please review the employee form fields and try again.";
    if (error.message.includes("Unique constraint failed")) return "An employee with that number, email, or RFID already exists.";
    return error.message;
  }
  return fallback;
}

function finishEmployeeMutation(redirectTo: string, flash: string) {
  revalidatePath("/employees");
  redirect(withFlash(redirectTo, flash));
}

export async function createEmployeeAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/employees");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const { employee } = await createEmployee({
      employeeNo: String(formData.get("employeeNo") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      rfidUid: String(formData.get("rfidUid") ?? ""),
      departmentId: String(formData.get("departmentId") ?? ""),
      shiftId: String(formData.get("shiftId") ?? ""),
      status: String(formData.get("status") ?? "ACTIVE")
    });

    await writeAuditLog({
      ...actorFrom(auth),
      action: "CREATE",
      entityType: "Employee",
      entityId: employee.id,
      details: { employeeNo: employee.employeeNo, rfidUid: employee.rfidUid, status: employee.status }
    });

    finishEmployeeMutation(redirectTo, "Employee created");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to create employee"), "error"));
  }
}

export async function updateEmployeeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/employees");
  try {
    const auth = await requireActionRole(UserRole.HR_ADMIN);
    const { employee } = await updateEmployee(id, {
      employeeNo: String(formData.get("employeeNo") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      rfidUid: String(formData.get("rfidUid") ?? ""),
      departmentId: String(formData.get("departmentId") ?? ""),
      shiftId: String(formData.get("shiftId") ?? ""),
      status: String(formData.get("status") ?? "ACTIVE")
    });

    await writeAuditLog({
      ...actorFrom(auth),
      action: "UPDATE",
      entityType: "Employee",
      entityId: employee.id,
      details: { employeeNo: employee.employeeNo, rfidUid: employee.rfidUid, status: employee.status }
    });

    finishEmployeeMutation(redirectTo, "Employee updated");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to update employee"), "error"));
  }
}

export async function deleteEmployeeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const redirectTo = getRedirectTarget(formData, "/employees");
  try {
    const auth = await requireActionRole(UserRole.SUPER_ADMIN);
    const employee = await deleteEmployee(id);

    await writeAuditLog({
      ...actorFrom(auth),
      action: "DELETE",
      entityType: "Employee",
      entityId: employee.id,
      details: { employeeNo: employee.employeeNo, rfidUid: employee.rfidUid, status: employee.status }
    });

    finishEmployeeMutation(redirectTo, "Employee deleted");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(withFlash(redirectTo, getErrorMessage(error, "Unable to delete employee"), "error"));
  }
}
