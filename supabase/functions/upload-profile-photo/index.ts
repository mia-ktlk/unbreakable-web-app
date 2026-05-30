import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extensionForType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
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

    const formData = await req.formData();
    const badgeId = String(formData.get("badge_id") ?? "").trim();
    const file = formData.get("file");

    if (!badgeId) {
      return jsonResponse({ error: "badge_id is required" }, 400);
    }

    if (!(file instanceof File)) {
      return jsonResponse({ error: "file is required" }, 400);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonResponse({ error: "Photo must be JPG, PNG, or WEBP" }, 400);
    }

    if (file.size > MAX_FILE_BYTES) {
      return jsonResponse({ error: "Photo must be 10MB or smaller" }, 400);
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

    const objectPath = `${badgeId}.${extensionForType(file.type)}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(objectPath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("profile photo upload failed:", uploadError);
      return jsonResponse({ error: "Failed to upload photo" }, 500);
    }

    const { data: publicUrlData } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(objectPath);

    const photoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: profileError } = await supabase
      .from("profile_overrides")
      .upsert({ badge_id: badgeId, photo_url: photoUrl }, { onConflict: "badge_id" });

    if (profileError) {
      console.error("profile_overrides photo_url update failed:", profileError);
      return jsonResponse({ error: "Failed to save photo URL" }, 500);
    }

    return jsonResponse({ data: { photo_url: photoUrl } });
  } catch (error) {
    console.error("upload-profile-photo error:", error);
    return jsonResponse({ error: "Invalid request" }, 400);
  }
});
