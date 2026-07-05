// Admin API — password-protected backend for the web admin panel (/admin).
//
// Requires two Supabase secrets to be set before deploying:
//   ADMIN_PASSWORD      — the password used to log into /admin
//   ADMIN_TOKEN_SECRET   — any long random string, used to sign session tokens
//
// Deploy with:
//   supabase functions deploy admin-api --no-verify-jwt
//   supabase secrets set ADMIN_PASSWORD=your-password ADMIN_TOKEN_SECRET=some-long-random-string
//
// This function uses the service role key, so it bypasses Row Level Security —
// that's the whole point (the public anon key can only read, never write).
// Treat the ADMIN_PASSWORD like any other production secret.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12h session

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function makeToken(): string {
  const secret = Deno.env.get("ADMIN_TOKEN_SECRET");
  if (!secret) throw new Error("ADMIN_TOKEN_SECRET is not set");
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = JSON.stringify({ exp });
  const encoded = btoa(payload);
  const sig = sign(encoded, secret);
  return `${encoded}.${sig}`;
}

function verifyToken(token: string | null): boolean {
  if (!token) return false;
  const secret = Deno.env.get("ADMIN_TOKEN_SECRET");
  if (!secret) return false;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return false;
  const expected = sign(encoded, secret);
  try {
    const a = new TextEncoder().encode(sig);
    const b = new TextEncoder().encode(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const { exp } = JSON.parse(atob(encoded));
    return typeof exp === "number" && Math.floor(Date.now() / 1000) < exp;
  } catch {
    return false;
  }
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body || {};

    // ---- Login (no auth required) ----
    if (action === "login") {
      const password = Deno.env.get("ADMIN_PASSWORD");
      if (!password) return jsonRes({ error: "ADMIN_PASSWORD не настроен на сервере" }, 500);
      if (body.password !== password) return jsonRes({ error: "Неверный пароль" }, 401);
      try {
        return jsonRes({ token: makeToken() });
      } catch {
        return jsonRes({ error: "ADMIN_TOKEN_SECRET не настроен на сервере" }, 500);
      }
    }

    // ---- Everything else requires a valid session token ----
    if (!verifyToken(getBearer(req))) {
      return jsonRes({ error: "Требуется вход в админ-панель" }, 401);
    }

    switch (action) {
      // ===== CASES =====
      case "cases.list": {
        const { data, error } = await supabase.from("cases").select("*").order("sort_order");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "cases.upsert": {
        const { row } = body;
        if (!row) return jsonRes({ error: "row required" }, 400);
        const payload = { ...row, updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from("cases").upsert(payload).select().maybeSingle();
        if (error) throw error;
        return jsonRes({ data });
      }
      case "cases.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { error } = await supabase.from("cases").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== PRODUCTS =====
      case "products.list": {
        const { data, error } = await supabase.from("products").select("*").order("sort_order");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "products.upsert": {
        const { row } = body;
        if (!row) return jsonRes({ error: "row required" }, 400);
        const payload = { ...row, updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from("products").upsert(payload).select().maybeSingle();
        if (error) throw error;
        return jsonRes({ data });
      }
      case "products.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== REVIEWS =====
      case "reviews.list": {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return jsonRes({ data });
      }
      case "reviews.setStatus": {
        const { id, status } = body; // status: 'approved' | 'rejected' | 'pending'
        if (!id || !status) return jsonRes({ error: "id and status required" }, 400);
        const patch: Record<string, unknown> = { moderation_status: status };
        if (status === "approved") patch.verified = true;
        if (status === "rejected") patch.verified = false;
        const { error } = await supabase.from("reviews").update(patch).eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }
      case "reviews.update": {
        const { id, row } = body;
        if (!id || !row) return jsonRes({ error: "id and row required" }, 400);
        const { error } = await supabase.from("reviews").update(row).eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }
      case "reviews.delete": {
        const { id } = body;
        if (!id) return jsonRes({ error: "id required" }, 400);
        const { error } = await supabase.from("reviews").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      // ===== SITE SETTINGS =====
      case "settings.list": {
        const { data, error } = await supabase.from("site_settings").select("*").order("key");
        if (error) throw error;
        return jsonRes({ data });
      }
      case "settings.set": {
        const { key, value } = body;
        if (!key) return jsonRes({ error: "key required" }, 400);
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key, value: value ?? "", updated_at: new Date().toISOString() });
        if (error) throw error;
        return jsonRes({ ok: true });
      }

      default:
        return jsonRes({ error: `Неизвестное действие: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[admin-api] fatal", e);
    return jsonRes({ error: e?.message || "Internal error" }, 500);
  }
});
