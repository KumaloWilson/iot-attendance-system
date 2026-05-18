import { DeviceMode, type Device } from "@prisma/client";

const ONLINE_THRESHOLD_MS = 5 * 60_000;
const DEGRADED_THRESHOLD_MS = 30 * 60_000;

export type DeviceHealthState = "ONLINE" | "DEGRADED" | "OFFLINE" | "INACTIVE";

export function getDeviceHealth(device: Pick<Device, "isActive" | "lastSeenAt">): DeviceHealthState {
  if (!device.isActive) return "INACTIVE";
  if (!device.lastSeenAt) return "OFFLINE";

  const ageMs = Date.now() - device.lastSeenAt.getTime();
  if (ageMs <= ONLINE_THRESHOLD_MS) return "ONLINE";
  if (ageMs <= DEGRADED_THRESHOLD_MS) return "DEGRADED";
  return "OFFLINE";
}

export function deviceHealthTone(state: DeviceHealthState) {
  switch (state) {
    case "ONLINE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "DEGRADED":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "INACTIVE":
      return "bg-slate-100 text-slate-500 ring-slate-200";
    case "OFFLINE":
    default:
      return "bg-rose-50 text-rose-700 ring-rose-200";
  }
}

export function formatDeviceMode(mode: DeviceMode) {
  switch (mode) {
    case DeviceMode.ENTRY_ONLY:
      return "Entry only";
    case DeviceMode.EXIT_ONLY:
      return "Exit only";
    case DeviceMode.ENTRY_EXIT:
    default:
      return "Entry + exit";
  }
}

export function getDeviceOfflineMinutes(device: Pick<Device, "lastSeenAt">) {
  if (!device.lastSeenAt) return null;
  return Math.max(0, Math.round((Date.now() - device.lastSeenAt.getTime()) / 60_000));
}

export function getDeviceReliabilityScore(device: Pick<Device, "isActive" | "lastSeenAt" | "lastErrorAt" | "lastRssi">) {
  if (!device.isActive) return 0;

  let score = 100;
  const offlineMinutes = getDeviceOfflineMinutes(device);
  if (offlineMinutes !== null) {
    if (offlineMinutes > 30) score -= 35;
    else if (offlineMinutes > 5) score -= 15;
  }

  if (device.lastErrorAt && Date.now() - device.lastErrorAt.getTime() < 24 * 60 * 60_000) {
    score -= 20;
  }

  if (typeof device.lastRssi === "number") {
    if (device.lastRssi < -85) score -= 20;
    else if (device.lastRssi < -70) score -= 10;
  }

  return Math.max(0, score);
}
