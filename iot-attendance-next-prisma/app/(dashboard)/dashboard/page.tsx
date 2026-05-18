import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHero } from "@/components/ui/page-hero";
import { formatMinutes } from "@/lib/attendance";
import { calculateOvertimeMinutes } from "@/lib/attendance-policy";
import { deviceHealthTone, formatDeviceMode, getDeviceHealth, getDeviceReliabilityScore } from "@/lib/device-health";
import { getOpenNotifications, syncDeviceOfflineAlerts } from "@/lib/operations";
import { prisma } from "@/lib/prisma";
import { countPresentStatuses, ensureTimesheetsForRange, statusTone } from "@/lib/reporting";
import { endOfDay, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  await ensureTimesheetsForRange(todayStart, todayEnd);
  await syncDeviceOfflineAlerts();

  const [todayTimesheets, recentEvents, devices, openNotifications, approvedLeaves, pendingLeaves, pendingCorrections] = await Promise.all([
    prisma.timesheet.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      include: { employee: { include: { department: true, shift: true } } },
      orderBy: [{ status: "asc" }, { employee: { firstName: "asc" } }]
    }),
    prisma.attendanceEvent.findMany({
      include: { employee: true, device: true },
      orderBy: { occurredAt: "desc" },
      take: 10
    }),
    prisma.device.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    getOpenNotifications(6),
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart }
      }
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendanceCorrection.count({ where: { status: "PENDING" } })
  ]);

  const activeEmployees = todayTimesheets.length;
  const present = countPresentStatuses(todayTimesheets);
  const late = todayTimesheets.filter((row) => row.status === "LATE").length;
  const absent = todayTimesheets.filter((row) => row.status === "ABSENT").length;
  const halfDay = todayTimesheets.filter((row) => row.status === "HALF_DAY").length;
  const pendingCheckout = todayTimesheets.filter((row) => row.firstCheckIn && !row.lastCheckOut).length;
  const workedMinutes = todayTimesheets.reduce((sum, row) => sum + row.workedMinutes, 0);
  const overtimeMinutes = todayTimesheets.reduce((sum, row) => sum + calculateOvertimeMinutes(row.employee.shift, row.workedMinutes), 0);
  const onlineDevices = devices.filter((device) => getDeviceHealth(device) === "ONLINE").length;
  const degradedDevices = devices.filter((device) => getDeviceHealth(device) === "DEGRADED").length;
  const offlineDevices = devices.filter((device) => getDeviceHealth(device) === "OFFLINE").length;
  const averageReliability = devices.length === 0 ? 0 : Math.round(devices.reduce((sum, device) => sum + getDeviceReliabilityScore(device), 0) / devices.length);

  const departmentBoard = Object.values(
    todayTimesheets.reduce<Record<string, { name: string; present: number; late: number; absent: number }>>((acc, row) => {
      const key = row.employee.department?.name ?? "Unassigned";
      acc[key] ??= { name: key, present: 0, late: 0, absent: 0 };
      if (row.status === "ABSENT") acc[key].absent += 1;
      else acc[key].present += 1;
      if (row.status === "LATE") acc[key].late += 1;
      return acc;
    }, {})
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Control Room"
        title="Attendance Dashboard"
        description="Today’s workforce coverage, device heartbeat, approval pressure, and exception risk in one operating view."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.6rem] bg-slate-950 px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-sky-200">Coverage</p>
              <p className="mt-2 text-3xl font-black">{activeEmployees === 0 ? 0 : Math.round((present / activeEmployees) * 100)}%</p>
              <p className="text-sm text-slate-300">Checked in or worked today</p>
            </div>
            <div className="rounded-[1.6rem] bg-white px-4 py-4 ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Open sessions</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{pendingCheckout}</p>
              <p className="text-sm text-slate-500">Employees without checkout</p>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Active employees" value={activeEmployees} accent="slate" />
        <MetricCard label="Present today" value={present} accent="emerald" />
        <MetricCard label="Late today" value={late} accent="amber" />
        <MetricCard label="Absent today" value={absent} accent="rose" />
        <MetricCard label="Half-day" value={halfDay} accent="blue" />
        <MetricCard label="Worked today" value={formatMinutes(workedMinutes)} accent="slate" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Devices online" value={onlineDevices} detail={`${degradedDevices} degraded, ${offlineDevices} offline`} accent="emerald" />
        <MetricCard label="Recent device activity" value={recentEvents.length} detail="Last 10 taps across all terminals" accent="blue" />
        <MetricCard label="Open exceptions" value={pendingCheckout + offlineDevices} detail="Pending checkouts and offline terminals" accent="rose" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active alerts" value={openNotifications.length} detail={`${pendingLeaves} leave and ${pendingCorrections} correction items in workflow`} accent="amber" />
        <MetricCard label="Approved leave today" value={approvedLeaves} accent="blue" />
        <MetricCard label="Device reliability" value={`${averageReliability}%`} detail="Fleet health score across active terminals" accent="slate" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Overtime logged" value={formatMinutes(overtimeMinutes)} detail="Policy-based overtime above shift thresholds" accent="blue" />
        <MetricCard label="Awaiting HR" value={pendingLeaves + pendingCorrections} detail="Requests still in the approval pipeline" accent="amber" />
        <MetricCard label="Live refresh" value="12s" detail="Dashboard auto-refresh cadence" accent="slate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Today&apos;s Roster</p>
              <h2 className="text-xl font-black">Operational status by employee</h2>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2">Employee</th>
                  <th>Department</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Worked</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayTimesheets.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-3 font-semibold">
                      {row.employee.firstName} {row.employee.lastName}
                      <div className="text-xs font-normal text-slate-500">{row.employee.employeeNo}</div>
                    </td>
                    <td>{row.employee.department?.name ?? "-"}</td>
                    <td>{row.firstCheckIn?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "-"}</td>
                    <td>{row.lastCheckOut?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "-"}</td>
                    <td>{formatMinutes(row.workedMinutes)}</td>
                    <td>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(row.status)}`}>
                        {row.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Departments</p>
            <h2 className="text-xl font-black">Today&apos;s coverage</h2>
            <div className="mt-4 space-y-3">
              {departmentBoard.map((department) => (
                <div key={department.name} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{department.name}</p>
                    <p className="text-sm text-slate-500">{department.present} present</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {department.late} late, {department.absent} absent
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Device Heartbeat</p>
            <h2 className="text-xl font-black">Terminal status</h2>
            <div className="mt-4 space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{device.name}</p>
                      <p className="text-xs uppercase tracking-widest text-slate-500">{device.deviceCode}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${deviceHealthTone(getDeviceHealth(device))}`}>
                      {getDeviceHealth(device)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{device.location ?? "No location set"}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDeviceMode(device.mode)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Last seen {device.lastSeenAt ? device.lastSeenAt.toLocaleString() : "never"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Firmware {device.firmwareVersion ?? "unknown"} · RSSI {device.lastRssi ?? "--"} dBm
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Reliability score {getDeviceReliabilityScore(device)}%</p>
                  {device.lastErrorMessage ? (
                    <p className="mt-2 text-xs font-medium text-rose-700">{device.lastErrorMessage}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Live Feed</p>
        <h2 className="text-xl font-black">Recent IoT activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Time</th>
                <th>Employee</th>
                <th>Action</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id} className="border-t border-slate-100">
                  <td className="py-3">{event.occurredAt.toLocaleString()}</td>
                  <td>{event.employee.firstName} {event.employee.lastName}</td>
                  <td>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{event.type.replace("_", " ")}</span>
                  </td>
                  <td>{event.device?.name ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Alert Queue</p>
        <h2 className="text-xl font-black">Open notifications</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {openNotifications.map((notification) => (
            <div key={notification.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{notification.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{notification.severity}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
              <p className="mt-2 text-xs text-slate-500">{notification.createdAt.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
