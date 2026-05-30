import { Member } from "../types";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

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
      "badge_id, email, phone, website, company, role, instagram, facebook, linkedin, updated_at"
    );

  if (error) {
    console.error("Failed to load profile overrides:", error);
    throw error;
  }

  return data ?? [];
}

export async function updateProfile(
  payload: ProfileUpdatePayload
): Promise<ProfileOverride> {
  if (!isSupabaseConfigured()) {
    throw new Error("Profile updates are not configured.");
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-profile`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Failed to update profile.");
  }

  return result.data as ProfileOverride;
}
