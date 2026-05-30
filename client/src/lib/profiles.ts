import { Member } from "../types";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import {
  getSupabaseFunctionErrorMessage,
  getSupabaseFunctionHeaders,
  getSupabaseFunctionUrl,
} from "./supabaseFunctions";

export interface ProfileOverride {
  badge_id: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  company: string | null;
  role: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  bio: string | null;
  photo_url: string | null;
  updated_at?: string;
}

export interface ProfileUpdatePayload {
  badge_id: string;
  email?: string;
  phone?: string;
  website?: string;
  company?: string;
  role?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  bio?: string;
  photo_url?: string | null;
}

const EDITABLE_FIELDS = [
  "email",
  "phone",
  "website",
  "company",
  "role",
  "instagram",
  "facebook",
  "linkedin",
  "bio",
] as const;

export function applyProfileOverride<T extends Member>(
  member: T,
  override?: ProfileOverride | null
): T {
  if (!override) return member;

  const merged = { ...member };
  for (const field of EDITABLE_FIELDS) {
    const value = override[field];
    if (value !== null && value !== undefined) {
      merged[field] = value;
    }
  }

  if (override.photo_url) {
    merged.image = override.photo_url;
  } else if (override.photo_url === null) {
    merged.image = undefined;
  }

  return merged;
}

export function mergeMembersWithOverrides<T extends Member>(
  members: T[],
  overrides: ProfileOverride[]
): T[] {
  const overrideMap = new Map(overrides.map((o) => [o.badge_id, o]));
  return members.map((member) =>
    applyProfileOverride(member, overrideMap.get(member.id))
  );
}

export async function fetchProfileOverrides(): Promise<ProfileOverride[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profile_overrides")
    .select(
      "badge_id, email, phone, website, company, role, instagram, facebook, linkedin, bio, photo_url, updated_at"
    );

  if (error) {
    console.error("Failed to load profile overrides:", error);
    throw error;
  }

  return data ?? [];
}

async function callProfileFunction(
  path: string,
  init: RequestInit
): Promise<Record<string, unknown>> {
  const response = await fetch(getSupabaseFunctionUrl(path), {
    ...init,
    headers: {
      ...getSupabaseFunctionHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getSupabaseFunctionErrorMessage(result, "Profile request failed."));
  }

  return result.data as Record<string, unknown>;
}

export async function updateProfile(
  payload: ProfileUpdatePayload
): Promise<ProfileOverride> {
  if (!isSupabaseConfigured()) {
    throw new Error("Profile updates are not configured.");
  }

  const data = await callProfileFunction("update-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return data as unknown as ProfileOverride;
}

export async function uploadProfilePhoto(
  badgeId: string,
  file: File
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Profile photo uploads are not configured.");
  }

  const formData = new FormData();
  formData.append("badge_id", badgeId);
  formData.append("file", file);

  const data = await callProfileFunction("upload-profile-photo", {
    method: "POST",
    body: formData,
  });

  const photoUrl = data.photo_url;
  if (typeof photoUrl !== "string" || !photoUrl) {
    throw new Error("Upload succeeded but no photo URL was returned.");
  }

  return photoUrl;
}
