import { Card } from "@/components/ui/card";
import { deviceHealthTone, formatDeviceMode, getDeviceHealth, getDeviceReliabilityScore } from "@/lib/device-health";
import { syncDeviceOfflineAlerts } from "@/lib/operations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams
}: {
  searchParams?: { q?: string; source?: string; device?: string };
}) {
  await syncDeviceOfflineAlerts();
  const q = searchParams?.q?.trim() ?? "";
  const sourceFilter = searchParams?.source?.trim() ?? "";
  const deviceFilter = searchParams?.device?.trim() ?? "";

  const [events, devices, anomalies] = await Promise.all([
    prisma.attendanceEvent.findMany({
      where: {
        ...(sourceFilter ? { source: sourceFilter as never } : {}),
        ...(deviceFilter ? { device: { deviceCode: deviceFilter } } : {}),
        ...(q
          ? {
              OR: [
                { rfidUid: { contains: q, mode: "insensitive" } },
                { employee: { firstName: { contains: q, mode: "insensitive" } } },
                { employee: { lastName: { contains: q, mode: "insensitive" } } },
                { employee: { employeeNo: { contains: q, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: { employee: { include: { department: true } }, device: true },
      orderBy: { occurredAt: "desc" },
      take: 120
    }),
    prisma.device.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.attendanceAnomaly.findMany({
      include: { employee: true, device: true },
      orderBy: { detectedAt: "desc" },
      take: 12
    })
  ]);

  const latestTap = events[0]?.occurredAt ?? null;
  const onlineCount = devices.filter((device) => getDeviceHealth(device) === "ONLINE").length;
  const offlineCount = devices.filter((device) => getDeviceHealth(device) === "OFFLINE").length;

  return (
    <section className="space-y-6">
      <div className="mb-2">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-700">IoT Logs</p>
        <h1 className="text-3xl font-black">Attendance Events</h1>
        <p className="mt-2 text-sm text-slate-600">
          Event trail from physical RFID terminals, including card owner, terminal, and action taken.
        </p>
      </div>

      <Card>
        <form className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto]">
          <input name="q" defaultValue={q} placeholder="Search by employee, employee number, or RFID" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          <select name="source" defaultValue={sourceFilter} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="">All sources</option>
            <option value="LIVE">Live</option>
            <option value="OFFLINE_SYNC">Offline sync</option>
            <option value="SEEDED">Seeded</option>
          </select>
          <select name="device" defaultValue={deviceFilter} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="">All devices</option>
            {devices.map((device) => (
              <option key={device.id} value={device.deviceCode}>{device.deviceCode}</option>
            ))}
          </select>
          <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Filter</button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-slate-500">Captured events</p><p className="mt-2 text-3xl font-black">{events.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Devices healthy</p><p className="mt-2 text-3xl font-black">{onlineCount}</p><p className="mt-2 text-xs text-slate-500">{offlineCount} offline</p></Card>
        <Card><p className="text-sm text-slate-500">Latest tap</p><p className="mt-2 text-lg font-black">{latestTap ? latestTap.toLocaleString() : "No activity yet"}</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card>
          <h2 className="text-lg font-black">Event stream</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2">Date/Time</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>UID</th>
                  <th>Action</th>
                  <th>Source</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-slate-100">
                    <td className="py-3">{event.occurredAt.toLocaleString()}</td>
                    <td className="font-semibold">
                      {event.employee.firstName} {event.employee.lastName}
                    </td>
                    <td>{event.employee.department?.name ?? "-"}</td>
                    <td>{event.rfidUid}</td>
                    <td>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">
                        {event.type.replace("_", " ")}
                      </span>
                    </td>
                    <td>{event.source.replace("_", " ")}</td>
                    <td>{event.device?.name ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black">Connected terminals</h2>
          <div className="mt-4 space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
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
                  Firmware {device.firmwareVersion ?? "unknown"} · IP {device.lastIpAddress ?? "-"} · RSSI {device.lastRssi ?? "--"} dBm
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

      <Card>
        <h2 className="text-lg font-black">Detected anomalies</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Detected</th>
                <th>Type</th>
                <th>Employee</th>
                <th>Device</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((anomaly) => (
                <tr key={anomaly.id} className="border-t border-slate-100">
                  <td className="py-3">{anomaly.detectedAt.toLocaleString()}</td>
                  <td>{anomaly.type.replaceAll("_", " ")}</td>
                  <td>{anomaly.employee ? `${anomaly.employee.firstName} ${anomaly.employee.lastName}` : "-"}</td>
                  <td>{anomaly.device?.name ?? "-"}</td>
                  <td>{anomaly.resolvedAt ? "Resolved" : "Open"}</td>
                  <td>{anomaly.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
