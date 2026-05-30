import type { Session } from "../types";

export const EVENT_TIMEZONE = "America/New_York";

export const DAY_TO_DATE: Record<number, string> = {
  1: "2026-05-30",
  2: "2026-05-31",
};

/**
 * Hard-coded test datetime (Eastern ISO, e.g. "2026-05-30T09:30:00-04:00").
 * Set to null to use the real clock. Can also be overridden via the dev UI or localStorage.
 */
export const SCHEDULE_TEST_NOW_DEFAULT: string | null = null;

let scheduleTestNow: string | null = SCHEDULE_TEST_NOW_DEFAULT;

export function getScheduleTestNow(): string | null {
  return scheduleTestNow;
}

export function setScheduleTestNow(iso: string | null): void {
  scheduleTestNow = iso;
}

export function isScheduleTestMode(): boolean {
  return scheduleTestNow !== null;
}

export function getScheduleNow(): Date {
  if (scheduleTestNow) return new Date(scheduleTestNow);
  return new Date();
}

/** Build an Eastern ISO string from date (YYYY-MM-DD) and 24h time (HH:mm). */
export function buildEasternTestDateTime(date: string, time: string): string {
  return `${date}T${time}:00-04:00`;
}

export function parseEasternTestDateTime(iso: string): { date: string; time: string } {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (match) return { date: match[1], time: match[2] };
  return { date: DAY_TO_DATE[1], time: "09:30" };
}

export function formatScheduleNowDisplay(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(now);
}

export type SessionStatus = "past" | "current" | "upcoming";

export function parseTime12h(time12h: string): { hours: number; minutes: number } {
  const [time, modifier] = time12h.trim().split(" ");
  const [hoursStr, minutesStr] = time.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (modifier === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/** Format 12h time as HHMMSS for ICS files. */
export function parseTimeTo24h(time12h: string): string {
  const { hours, minutes } = parseTime12h(time12h);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}${pad(minutes)}00`;
}

function getEasternOffset(_dateStr: string): string {
  // May 2026 summit dates fall in EDT (UTC-4)
  return "-04:00";
}

export function getSessionBounds(day: number, timeStr: string): { start: Date; end: Date } {
  const dateStr = DAY_TO_DATE[day] ?? DAY_TO_DATE[1];
  const offset = getEasternOffset(dateStr);
  const [startStr, endStr] = timeStr.split(" - ");
  const start = parseTime12h(startStr || "09:00 AM");
  const end = parseTime12h(endStr || "10:00 AM");

  const pad = (n: number) => n.toString().padStart(2, "0");
  const startIso = `${dateStr}T${pad(start.hours)}:${pad(start.minutes)}:00${offset}`;
  const endIso = `${dateStr}T${pad(end.hours)}:${pad(end.minutes)}:00${offset}`;

  return { start: new Date(startIso), end: new Date(endIso) };
}

export function getSessionStatus(day: number, timeStr: string, now: Date): SessionStatus {
  const { start, end } = getSessionBounds(day, timeStr);
  if (now >= end) return "past";
  if (now >= start) return "current";
  return "upcoming";
}

export function getEasternDateString(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function getLiveEventDay(now: Date): 1 | 2 | null {
  const today = getEasternDateString(now);
  if (today === DAY_TO_DATE[1]) return 1;
  if (today === DAY_TO_DATE[2]) return 2;
  return null;
}

export function isDayLive(day: number, agenda: Session[], now: Date): boolean {
  const dayDate = DAY_TO_DATE[day];
  if (!dayDate) return false;

  const today = getEasternDateString(now);
  if (today !== dayDate) return false;

  return agenda.some(session => getSessionStatus(day, session.time, now) !== "past");
}
