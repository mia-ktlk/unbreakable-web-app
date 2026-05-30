import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_LENGTHS = {
  email: 254,
  phone: 30,
  website: 500,
  company: 120,
  role: 120,
  instagram: 500,
  facebook: 500,
  linkedin: 500,
  bio: 500,
} as const;

type EditableField = keyof typeof MAX_LENGTHS;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeField(field: EditableField, value: unknown): string | null {
  if (value === undefined) return undefined as unknown as null;
  if (value === null) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  return trimmed.slice(0, MAX_LENGTHS[field]);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeWebsite(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const body = await req.json();
    const badgeId = String(body.badge_id ?? "").trim();

    if (!badgeId) {
      return jsonResponse({ error: "badge_id is required" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: allowedBadge, error: allowedError } = await supabase
      .from("allowed_badges")
      .select("badge_id")
      .eq("badge_id", badgeId)
      .maybeSingle();

    if (allowedError) {
      console.error("allowed_badges lookup failed:", allowedError);
      return jsonResponse({ error: "Failed to validate badge" }, 500);
    }

    if (!allowedBadge) {
      return jsonResponse({ error: "Badge not recognized" }, 403);
    }

    const payload: Record<string, string | null> = { badge_id: badgeId };

    for (const field of Object.keys(MAX_LENGTHS) as EditableField[]) {
      const sanitized = sanitizeField(field, body[field]);
      if (sanitized === (undefined as unknown as null)) continue;

      if (field === "email" && sanitized && !isValidEmail(sanitized)) {
        return jsonResponse({ error: "Invalid email address" }, 400);
      }

      if (field === "website" && sanitized) {
        payload.website = normalizeWebsite(sanitized);
        continue;
      }

      if (
        (field === "instagram" || field === "facebook" || field === "linkedin") &&
        sanitized
      ) {
        payload[field] = normalizeWebsite(sanitized);
        continue;
      }

      payload[field] = sanitized;
    }

    if ("photo_url" in body) {
      const photoUrl = body.photo_url;
      if (photoUrl === null || photoUrl === "") {
        payload.photo_url = null;
      } else if (typeof photoUrl === "string") {
        payload.photo_url = photoUrl.trim().slice(0, 500);
      }
    }

    const { data, error } = await supabase
      .from("profile_overrides")
      .upsert(payload, { onConflict: "badge_id" })
      .select(
        "badge_id, email, phone, website, company, role, instagram, facebook, linkedin, bio, photo_url, updated_at"
      )
      .single();

    if (error) {
      console.error("profile_overrides upsert failed:", error);
      return jsonResponse({ error: "Failed to save profile" }, 500);
    }

    return jsonResponse({ data });
  } catch (error) {
    console.error("update-profile error:", error);
    return jsonResponse({ error: "Invalid request" }, 400);
  }
});
