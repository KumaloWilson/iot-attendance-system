import assert from "node:assert/strict";
import test from "node:test";
import { createEmployee, deleteEmployee, updateEmployee } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

test("create, update, and delete employee management flow works end to end", { concurrency: false }, async () => {
  const suffix = `employee-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const department = await prisma.department.create({
    data: { name: `EMP-DEPT-${suffix}` }
  });
  const shift = await prisma.shift.create({
    data: {
      name: `EMP-SHIFT-${suffix}`,
      startTime: "08:00",
      endTime: "17:00",
      graceMinutes: 15,
      expectedMinutes: 480,
      halfDayMinutes: 240,
      overtimeAfterMinutes: 540,
      missedCheckoutGraceMinutes: 180,
      weekendAttendanceEnabled: false
    }
  });

  let employeeId: string | null = null;

  try {
    const created = await createEmployee({
      employeeNo: `emp-${suffix}`,
      firstName: "Grace",
      lastName: "Moyo",
      email: "grace.moyo@example.com",
      phone: "+263771123456",
      rfidUid: `uid-${suffix}`,
      departmentId: department.id,
      shiftId: shift.id,
      status: "ACTIVE"
    });

    employeeId = created.employee.id;

    assert.equal(created.employee.employeeNo.startsWith("EMP-"), true);
    assert.equal(created.employee.rfidUid.startsWith("UID-"), true);
    assert.equal(created.employee.status, "ACTIVE");

    const updated = await updateEmployee(created.employee.id, {
      employeeNo: `emp-${suffix}`,
      firstName: "Grace",
      lastName: "Ncube",
      email: "grace.ncube@example.com",
      phone: "+263771123457",
      rfidUid: `uid-${suffix}`,
      departmentId: department.id,
      shiftId: shift.id,
      status: "SUSPENDED"
    });

    assert.equal(updated.employee.lastName, "Ncube");
    assert.equal(updated.employee.status, "SUSPENDED");
    assert.equal(updated.employee.email, "grace.ncube@example.com");

    const deleted = await deleteEmployee(created.employee.id);
    employeeId = null;

    assert.equal(deleted.id.length > 0, true);
  } finally {
    if (employeeId) {
      await prisma.employee.deleteMany({ where: { id: employeeId } });
    }
    await prisma.shift.deleteMany({ where: { id: shift.id } });
    await prisma.department.deleteMany({ where: { id: department.id } });
  }
});
