import { endOfMonth, startOfMonth } from "date-fns";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHero } from "@/components/ui/page-hero";
import { PrintButton } from "@/components/ui/print-button";
import { formatMinutes } from "@/lib/attendance";
import { calculateOvertimeMinutes } from "@/lib/attendance-policy";
import { getDeviceHealth, getDeviceReliabilityScore } from "@/lib/device-health";
import { getOpenNotifications } from "@/lib/operations";
import { prisma } from "@/lib/prisma";
import { countPresentStatuses, ensureTimesheetsForRange } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());

  const employees = await ensureTimesheetsForRange(start, end);
  const [timesheets, devices, anomalies, events, notifications] = await Promise.all([
    prisma.timesheet.findMany({
      where: { date: { gte: start, lte: end } },
      include: { employee: { include: { department: true, shift: true } } }
    }),
    prisma.device.findMany(),
    prisma.attendanceAnomaly.findMany({
      where: { detectedAt: { gte: start, lte: end } },
      include: { employee: true, device: true }
    }),
    prisma.attendanceEvent.findMany({
      where: { occurredAt: { gte: start, lte: end } },
      include: { device: true }
    }),
    getOpenNotifications(6)
  ]);

  const present = countPresentStatuses(timesheets);
  const late = timesheets.filter((row) => row.status === "LATE").length;
  const absent = timesheets.filter((row) => row.status === "ABSENT").length;
  const worked = timesheets.reduce((sum, row) => sum + row.workedMinutes, 0);
  const overtimeMinutes = timesheets.reduce((sum, row) => sum + calculateOvertimeMinutes(row.employee.shift, row.workedMinutes), 0);
  const lateMinutes = timesheets.reduce((sum, row) => sum + row.lateMinutes, 0);
  const healthyDevices = devices.filter((device) => getDeviceHealth(device) === "ONLINE" || getDeviceHealth(device) === "DEGRADED").length;
  const anomalyCount = anomalies.length;
  const averageReliability = devices.length === 0 ? 0 : Math.round(devices.reduce((sum, device) => sum + getDeviceReliabilityScore(device), 0) / devices.length);

  const employeeLeaderboard = Object.values(
    timesheets.reduce<Record<string, {
      id: string;
      name: string;
      department: string;
      workedMinutes: number;
      lateMinutes: number;
      absentDays: number;
      lateDays: number;
    }>>((acc, row) => {
      acc[row.employeeId] ??= {
        id: row.employeeId,
        name: `${row.employee.firstName} ${row.employee.lastName}`,
        department: row.employee.department?.name ?? "Unassigned",
        workedMinutes: 0,
        lateMinutes: 0,
        absentDays: 0,
        lateDays: 0
      };
      acc[row.employeeId].workedMinutes += row.workedMinutes;
      acc[row.employeeId].lateMinutes += row.lateMinutes;
      if (row.status === "ABSENT") acc[row.employeeId].absentDays += 1;
      if (row.status === "LATE") acc[row.employeeId].lateDays += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.workedMinutes - a.workedMinutes);

  const departmentSummary = Object.values(
    timesheets.reduce<Record<string, {
      name: string;
      present: number;
      absent: number;
      late: number;
      workedMinutes: number;
    }>>((acc, row) => {
      const key = row.employee.department?.name ?? "Unassigned";
      acc[key] ??= { name: key, present: 0, absent: 0, late: 0, workedMinutes: 0 };
      if (row.status === "ABSENT") acc[key].absent += 1;
      else acc[key].present += 1;
      if (row.status === "LATE") acc[key].late += 1;
      acc[key].workedMinutes += row.workedMinutes;
      return acc;
    }, {})
  ).sort((a, b) => b.workedMinutes - a.workedMinutes);

  const anomalySummary = Object.entries(
    anomalies.reduce<Record<string, number>>((acc, anomaly) => {
      acc[anomaly.type] = (acc[anomaly.type] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const deviceUtilization = Object.values(
    events.reduce<Record<string, { name: string; count: number }>>((acc, event) => {
      const key = event.device?.deviceCode ?? "UNASSIGNED";
      acc[key] ??= { name: event.device?.name ?? "Unassigned", count: 0 };
      acc[key].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const hourlyTraffic = Array.from({ length: 24 }, (_, hour) => {
    const count = events.filter((event) => event.occurredAt.getHours() === hour).length;
    return { hour, count };
  });
  const busiestHour = hourlyTraffic.reduce((best, current) => (current.count > best.count ? current : best), { hour: 0, count: 0 });
  const alertAging = notifications.reduce(
    (acc, item) => {
      const ageHours = Math.max(0, Math.round((Date.now() - item.createdAt.getTime()) / 3600000));
      if (ageHours < 4) acc.fresh += 1;
      else if (ageHours < 24) acc.stale += 1;
      else acc.critical += 1;
      return acc;
    },
    { fresh: 0, stale: 0, critical: 0 }
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Analytics"
        title="Monthly Reports"
        description="Roll-up metrics for attendance performance, punctuality, overtime exposure, alert aging, and device reliability."
        aside={
          <div className="flex flex-wrap justify-start gap-3 lg:justify-end">
            <a
              href={`/api/reports/summary?month=${new Date().toISOString().slice(0, 7)}&format=csv`}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Export current month CSV
            </a>
            <PrintButton />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active employees" value={employees.length} accent="slate" />
        <MetricCard label="Present days" value={present} accent="emerald" />
        <MetricCard label="Late days" value={late} accent="amber" />
        <MetricCard label="Absent days" value={absent} accent="rose" />
        <MetricCard label="Worked time" value={formatMinutes(worked)} accent="blue" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Attendance completion" value={`${timesheets.length === 0 ? 0 : Math.round((present / timesheets.length) * 100)}%`} accent="blue" />
        <MetricCard label="Healthy devices" value={healthyDevices} detail={`${devices.length} terminals provisioned`} accent="emerald" />
        <MetricCard label="Punctuality loss" value={formatMinutes(lateMinutes)} detail="Total late minutes this month" accent="amber" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Anomalies detected" value={anomalyCount} accent="rose" />
        <MetricCard label="Open alerts" value={notifications.length} detail={`${alertAging.critical} older than 24h`} accent="amber" />
        <MetricCard label="Busiest scan hour" value={`${String(busiestHour.hour).padStart(2, "0")}:00`} accent="slate" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Overtime minutes" value={formatMinutes(overtimeMinutes)} accent="blue" />
        <MetricCard label="Average device reliability" value={`${averageReliability}%`} accent="slate" />
        <MetricCard label="Alert aging" value={alertAging.stale} detail="Open alerts between 4h and 24h old" accent="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">Employee leaderboard</h2>
              <p className="text-sm text-slate-500">Highest worked minutes this month</p>
            </div>
            <p className="text-sm text-slate-500">{formatMinutes(lateMinutes)} total lateness</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2">Employee</th>
                  <th>Department</th>
                  <th>Worked</th>
                  <th>Late mins</th>
                  <th>Late days</th>
                  <th>Absent days</th>
                </tr>
              </thead>
              <tbody>
                {employeeLeaderboard.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-3 font-semibold">{row.name}</td>
                    <td>{row.department}</td>
                    <td>{formatMinutes(row.workedMinutes)}</td>
                    <td>{row.lateMinutes}</td>
                    <td>{row.lateDays}</td>
                    <td>{row.absentDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black">Department summary</h2>
          <div className="mt-4 space-y-3">
            {departmentSummary.map((department) => (
              <div key={department.name} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{department.name}</p>
                  <p className="text-sm text-slate-500">{formatMinutes(department.workedMinutes)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {department.present} present, {department.late} late, {department.absent} absent
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <h2 className="text-lg font-black">Hourly traffic</h2>
          <div className="mt-4 space-y-3">
            {hourlyTraffic.map((entry) => (
              <div key={entry.hour}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{`${String(entry.hour).padStart(2, "0")}:00`}</span>
                  <span>{entry.count} scans</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-brand-700"
                    style={{ width: `${Math.max(4, busiestHour.count === 0 ? 0 : (entry.count / busiestHour.count) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black">Device utilization</h2>
          <div className="mt-4 space-y-3">
            {deviceUtilization.map((device) => (
              <div key={device.name} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{device.name}</p>
                  <p className="text-sm text-slate-500">{device.count} scans</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-black">Reliability board</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => (
            <div key={device.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{device.name}</p>
                <p className="text-sm text-slate-500">{getDeviceReliabilityScore(device)}%</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {device.deviceCode} · {getDeviceHealth(device)} · RSSI {device.lastRssi ?? "--"} dBm
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-black">Anomaly summary</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {anomalySummary.map(([type, count]) => (
            <div key={type} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{type.replaceAll("_", " ")}</p>
              <p className="mt-2 text-2xl font-black">{count}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
