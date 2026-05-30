import { ScanRecord } from "../types";
import { isSupabaseConfigured } from "./supabase";

export interface UserSavedData {
  favoriteSpeakers: string[];
  favoriteSessions: string[];
  favoriteSponsors: string[];
  favoriteExhibitors: string[];
  scans: ScanRecord[];
}

export const emptyUserSavedData = (): UserSavedData => ({
  favoriteSpeakers: [],
  favoriteSessions: [],
  favoriteSponsors: [],
  favoriteExhibitors: [],
  scans: [],
});

export function readLocalUserSavedData(): UserSavedData {
  const readJson = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  return {
    favoriteSpeakers: readJson<string[]>("metfix_fav_speakers", []),
    favoriteSessions: readJson<string[]>("metfix_fav_sessions", []),
    favoriteSponsors: readJson<string[]>("metfix_fav_sponsors", []),
    favoriteExhibitors: readJson<string[]>("metfix_fav_exhibitors", []),
    scans: readJson<ScanRecord[]>("metfix_scans", []),
  };
}

export function writeLocalUserSavedData(data: UserSavedData): void {
  localStorage.setItem("metfix_fav_speakers", JSON.stringify(data.favoriteSpeakers));
  localStorage.setItem("metfix_fav_sessions", JSON.stringify(data.favoriteSessions));
  localStorage.setItem("metfix_fav_sponsors", JSON.stringify(data.favoriteSponsors));
  localStorage.setItem("metfix_fav_exhibitors", JSON.stringify(data.favoriteExhibitors));
  localStorage.setItem("metfix_scans", JSON.stringify(data.scans));
}

function mergeIdLists(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

function mergeScans(a: ScanRecord[], b: ScanRecord[]): ScanRecord[] {
  const byMemberId = new Map<string, ScanRecord>();

  for (const scan of [...a, ...b]) {
    const existing = byMemberId.get(scan.memberId);
    if (!existing || scan.timestamp > existing.timestamp) {
      byMemberId.set(scan.memberId, scan);
    }
  }

  return Array.from(byMemberId.values()).sort((left, right) => right.timestamp - left.timestamp);
}

export function mergeUserSavedData(local: UserSavedData, remote: UserSavedData): UserSavedData {
  return {
    favoriteSpeakers: mergeIdLists(local.favoriteSpeakers, remote.favoriteSpeakers),
    favoriteSessions: mergeIdLists(local.favoriteSessions, remote.favoriteSessions),
    favoriteSponsors: mergeIdLists(local.favoriteSponsors, remote.favoriteSponsors),
    favoriteExhibitors: mergeIdLists(local.favoriteExhibitors, remote.favoriteExhibitors),
    scans: mergeScans(local.scans, remote.scans),
  };
}

function mapRemoteRow(row: Record<string, unknown>): UserSavedData {
  return {
    favoriteSpeakers: Array.isArray(row.favorite_speakers) ? (row.favorite_speakers as string[]) : [],
    favoriteSessions: Array.isArray(row.favorite_sessions) ? (row.favorite_sessions as string[]) : [],
    favoriteSponsors: Array.isArray(row.favorite_sponsors) ? (row.favorite_sponsors as string[]) : [],
    favoriteExhibitors: Array.isArray(row.favorite_exhibitors) ? (row.favorite_exhibitors as string[]) : [],
    scans: Array.isArray(row.scans) ? (row.scans as ScanRecord[]) : [],
  };
}

async function callUserSavedDataApi(
  badgeId: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-saved-data`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ badge_id: badgeId, ...body }),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Failed to sync saved data.");
  }

  return result.data as Record<string, unknown>;
}

export async function fetchUserSavedData(badgeId: string): Promise<UserSavedData | null> {
  if (!isSupabaseConfigured()) return null;

  const row = await callUserSavedDataApi(badgeId, { action: "get" });
  return mapRemoteRow(row);
}

export async function saveUserSavedData(badgeId: string, data: UserSavedData): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await callUserSavedDataApi(badgeId, {
    action: "save",
    favorite_speakers: data.favoriteSpeakers,
    favorite_sessions: data.favoriteSessions,
    favorite_sponsors: data.favoriteSponsors,
    favorite_exhibitors: data.favoriteExhibitors,
    scans: data.scans,
  });
}

export async function loadAndMergeUserSavedData(badgeId: string): Promise<UserSavedData> {
  const local = readLocalUserSavedData();

  if (!isSupabaseConfigured()) {
    return local;
  }

  try {
    const remote = await fetchUserSavedData(badgeId);
    const merged = remote ? mergeUserSavedData(local, remote) : local;
    await saveUserSavedData(badgeId, merged);
    return merged;
  } catch (error) {
    console.warn("Failed to sync saved data from cloud:", error);
    return local;
  }
}
