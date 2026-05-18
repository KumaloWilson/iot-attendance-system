import { type UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  employeeSchema,
  departmentSchema,
  deviceCreateSchema,
  deviceUpdateSchema,
  shiftSchema
} from "@/lib/validators";

type AuditActor = {
  id?: string | null;
  email?: string | null;
  role?: UserRole;
};

export async function createDepartment(input: unknown, actor?: AuditActor) {
  const parsed = departmentSchema.parse(input);
  const department = await prisma.department.create({
    data: { name: parsed.name.trim() }
  });
  return { department, actor };
}

export async function updateDepartment(id: string, input: unknown, actor?: AuditActor) {
  const parsed = departmentSchema.parse(input);
  const department = await prisma.department.update({
    where: { id },
    data: { name: parsed.name.trim() }
  });
  return { department, actor };
}

export async function deleteDepartment(id: string) {
  return prisma.department.delete({ where: { id } });
}

export async function createShift(input: unknown, actor?: AuditActor) {
  const parsed = shiftSchema.parse(input);
  const shift = await prisma.shift.create({
    data: {
      name: parsed.name.trim(),
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      graceMinutes: parsed.graceMinutes,
      expectedMinutes: parsed.expectedMinutes,
      halfDayMinutes: parsed.halfDayMinutes,
      overtimeAfterMinutes: parsed.overtimeAfterMinutes,
      missedCheckoutGraceMinutes: parsed.missedCheckoutGraceMinutes,
      weekendAttendanceEnabled: parsed.weekendAttendanceEnabled
    }
  });
  return { shift, actor };
}

export async function updateShift(id: string, input: unknown, actor?: AuditActor) {
  const parsed = shiftSchema.parse(input);
  const shift = await prisma.shift.update({
    where: { id },
    data: {
      name: parsed.name.trim(),
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      graceMinutes: parsed.graceMinutes,
      expectedMinutes: parsed.expectedMinutes,
      halfDayMinutes: parsed.halfDayMinutes,
      overtimeAfterMinutes: parsed.overtimeAfterMinutes,
      missedCheckoutGraceMinutes: parsed.missedCheckoutGraceMinutes,
      weekendAttendanceEnabled: parsed.weekendAttendanceEnabled
    }
  });
  return { shift, actor };
}

export async function deleteShift(id: string) {
  return prisma.shift.delete({ where: { id } });
}

export async function createDevice(input: unknown, actor?: AuditActor) {
  const parsed = deviceCreateSchema.parse(input);
  const secretHash = parsed.secret ? await hashPassword(parsed.secret) : null;
  const device = await prisma.device.create({
    data: {
      deviceCode: parsed.deviceCode.trim().toUpperCase(),
      name: parsed.name.trim(),
      location: parsed.location?.trim() || null,
      mode: parsed.mode,
      isActive: parsed.isActive,
      secretHash
    }
  });
  return { device, actor };
}

export async function updateDevice(id: string, input: unknown, actor?: AuditActor) {
  const parsed = deviceUpdateSchema.parse(input);
  const secretHash = parsed.secret ? await hashPassword(parsed.secret) : undefined;
  const device = await prisma.device.update({
    where: { id },
    data: {
      deviceCode: parsed.deviceCode.trim().toUpperCase(),
      name: parsed.name.trim(),
      location: parsed.location?.trim() || null,
      mode: parsed.mode,
      isActive: parsed.isActive,
      ...(typeof secretHash === "string" ? { secretHash } : {})
    }
  });
  return { device, actor };
}

export async function deleteDevice(id: string) {
  return prisma.device.delete({ where: { id } });
}

export async function createEmployee(input: unknown, actor?: AuditActor) {
  const parsed = employeeSchema.parse(input);
  const employee = await prisma.employee.create({
    data: {
      employeeNo: parsed.employeeNo.trim().toUpperCase(),
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      email: parsed.email?.trim() || null,
      phone: parsed.phone?.trim() || null,
      rfidUid: parsed.rfidUid.trim().toUpperCase(),
      departmentId: parsed.departmentId || null,
      shiftId: parsed.shiftId || null,
      status: parsed.status
    }
  });
  return { employee, actor };
}

export async function updateEmployee(id: string, input: unknown, actor?: AuditActor) {
  const parsed = employeeSchema.parse(input);
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      employeeNo: parsed.employeeNo.trim().toUpperCase(),
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      email: parsed.email?.trim() || null,
      phone: parsed.phone?.trim() || null,
      rfidUid: parsed.rfidUid.trim().toUpperCase(),
      departmentId: parsed.departmentId || null,
      shiftId: parsed.shiftId || null,
      status: parsed.status
    }
  });
  return { employee, actor };
}

export async function deleteEmployee(id: string) {
  return prisma.employee.delete({ where: { id } });
}
