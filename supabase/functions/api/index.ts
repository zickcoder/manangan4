// ============================================================================
// GOVSERVE / PAFMS EDGE FUNCTION FOR SELF-HOSTED PROVIDER (eProvider / Supabase)
// Deploy this to your provider's Edge Functions: function name "api"
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configure CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

// Auto-detect Tenant ID and Service Role Key from environment or defaults
const TENANT_ID = Deno.env.get("TENANT_ID") || "330a2e7808deec92591a";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || `https://supa.eprovider.site/${TENANT_ID}`;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";

// Initialize Supabase Admin client with Service Role Key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Strip out function base path if present
  let path = url.pathname.replace(/^\/api/, "").replace(/^\/functions\/v1\/api/, "");
  if (!path.startsWith("/")) path = "/" + path;

  try {
    // ------------------------------------------------------------------------
    // 1. STATS
    // ------------------------------------------------------------------------
    if (path === "/stats" && req.method === "GET") {
      const [fac, res, plots, bur, utl, ast] = await Promise.all([
        supabase.from("facilities").select("id", { count: "exact" }),
        supabase.from("facility_reservations").select("id, status"),
        supabase.from("cemetery_plots").select("id, status"),
        supabase.from("burial_records").select("id", { count: "exact" }),
        supabase.from("utility_requests").select("id, status"),
        supabase.from("assets").select("id, current_condition"),
      ]);

      const resList = res.data || [];
      const plotList = plots.data || [];
      const utlList = utl.data || [];
      const astList = ast.data || [];

      return jsonResponse({
        success: true,
        data: {
          totalFacilities: fac.count || 0,
          pendingReservations: resList.filter((r) => r.status === "Pending" || r.status === "Pending Review").length,
          approvedReservations: resList.filter((r) => r.status === "Approved").length,
          totalCemeteryPlots: plotList.length,
          occupiedPlots: plotList.filter((p) => p.status === "Occupied").length,
          availablePlots: plotList.filter((p) => p.status === "Available").length,
          totalBurials: bur.count || 0,
          openUtilityRequests: utlList.filter((u) => u.status !== "Resolved").length,
          resolvedUtilityRequests: utlList.filter((u) => u.status === "Resolved").length,
          totalAssets: astList.length,
          assetsNeedingMaintenance: astList.filter((a) => a.current_condition !== "Operational").length,
          systemStatus: "Operational (Edge Function)",
          uptime: "99.99%",
        },
      });
    }

    // ------------------------------------------------------------------------
    // 2. FACILITIES
    // ------------------------------------------------------------------------
    if (path === "/facilities" && req.method === "GET") {
      const category = url.searchParams.get("category");
      let query = supabase.from("facilities").select("*").order("id", { ascending: true });
      if (category && category !== "all") {
        query = query.ilike("category", `%${category}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path === "/facilities" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("facilities").insert([body]).select().single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path.startsWith("/facilities/") && req.method === "PUT") {
      const id = path.split("/")[2];
      const body = await req.json();
      const { data, error } = await supabase.from("facilities").update(body).eq("id", id).select().single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path.startsWith("/facilities/") && req.method === "DELETE") {
      const id = path.split("/")[2];
      const { error } = await supabase.from("facilities").delete().eq("id", id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    // ------------------------------------------------------------------------
    // 3. FACILITY RESERVATIONS
    // ------------------------------------------------------------------------
    if (path === "/facilities/reservations" && req.method === "GET") {
      const status = url.searchParams.get("status");
      let query = supabase.from("facility_reservations").select("*").order("id", { ascending: false });
      if (status && status !== "all") {
        query = query.eq("status", status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path === "/facilities/reservations" && req.method === "POST") {
      const body = await req.json();
      const refNo = body.reference_no || `RES-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const { data, error } = await supabase
        .from("facility_reservations")
        .insert([{ ...body, reference_no: refNo }])
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    const resStatusMatch = path.match(/^\/facilities\/reservations\/(\d+)\/status$/);
    if (resStatusMatch && (req.method === "PATCH" || req.method === "PUT")) {
      const id = resStatusMatch[1];
      const body = await req.json();
      const { data, error } = await supabase
        .from("facility_reservations")
        .update(body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    // ------------------------------------------------------------------------
    // 4. CEMETERY PLOTS & BURIALS
    // ------------------------------------------------------------------------
    if (path === "/cemetery/plots" && req.method === "GET") {
      const status = url.searchParams.get("status");
      let query = supabase.from("cemetery_plots").select("*").order("id", { ascending: true });
      if (status && status !== "all") {
        query = query.eq("status", status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path.startsWith("/cemetery/plots/") && req.method === "PATCH") {
      const id = path.split("/")[3];
      const body = await req.json();
      const { data, error } = await supabase.from("cemetery_plots").update(body).eq("id", id).select().single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path === "/cemetery/burials" && req.method === "GET") {
      const { data, error } = await supabase.from("burial_records").select("*").order("id", { ascending: false });
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path === "/cemetery/burials" && req.method === "POST") {
      const body = await req.json();
      const refNo = body.reference_no || `BUR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
      const { data, error } = await supabase
        .from("burial_records")
        .insert([{ ...body, reference_no: refNo }])
        .select()
        .single();
      if (error) throw error;

      if (body.plot_id) {
        await supabase.from("cemetery_plots").update({ status: "Occupied" }).eq("id", body.plot_id);
      }
      return jsonResponse({ success: true, data });
    }

    // ------------------------------------------------------------------------
    // 5. UTILITY REQUESTS
    // ------------------------------------------------------------------------
    if (path === "/utilities" && req.method === "GET") {
      const { data, error } = await supabase.from("utility_requests").select("*").order("id", { ascending: false });
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path === "/utilities" && req.method === "POST") {
      const body = await req.json();
      const ticketNo = body.ticket_no || `UTL-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
      const { data, error } = await supabase
        .from("utility_requests")
        .insert([{ ...body, ticket_no: ticketNo }])
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    const utlStatusMatch = path.match(/^\/utilities\/(\d+)\/status$/);
    if (utlStatusMatch && req.method === "PATCH") {
      const id = utlStatusMatch[1];
      const body = await req.json();
      const { data, error } = await supabase.from("utility_requests").update(body).eq("id", id).select().single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    // ------------------------------------------------------------------------
    // 6. ASSETS
    // ------------------------------------------------------------------------
    if (path === "/assets" && req.method === "GET") {
      const { data, error } = await supabase.from("assets").select("*").order("id", { ascending: true });
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (path === "/assets" && req.method === "POST") {
      const body = await req.json();
      const tag = body.asset_tag || `AST-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
      const { data, error } = await supabase
        .from("assets")
        .insert([{ ...body, asset_tag: tag }])
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    // ------------------------------------------------------------------------
    // 7. TRACKING (Universal Ref Search)
    // ------------------------------------------------------------------------
    if (path.startsWith("/track/") && req.method === "GET") {
      const refNo = path.replace("/track/", "").trim();
      const [resMatch, burMatch, utlMatch] = await Promise.all([
        supabase.from("facility_reservations").select("*").ilike("reference_no", refNo).maybeSingle(),
        supabase.from("burial_records").select("*").ilike("reference_no", refNo).maybeSingle(),
        supabase.from("utility_requests").select("*").ilike("ticket_no", refNo).maybeSingle(),
      ]);

      if (resMatch.data) return jsonResponse({ success: true, type: "reservation", data: resMatch.data });
      if (burMatch.data) return jsonResponse({ success: true, type: "burial", data: burMatch.data });
      if (utlMatch.data) return jsonResponse({ success: true, type: "utility", data: utlMatch.data });
      return jsonResponse({ success: false, message: "Record not found" }, 404);
    }

    // ------------------------------------------------------------------------
    // 8. AUTH
    // ------------------------------------------------------------------------
    if (path === "/auth/login" && req.method === "POST") {
      const { email, password } = await req.json();
      const { data, error } = await supabase.from("users").select("*").eq("email", email).eq("password", password).maybeSingle();
      if (error || !data) return jsonResponse({ success: false, message: "Invalid email or password" }, 401);
      return jsonResponse({ success: true, user: data });
    }

    if (path === "/auth/register-citizen" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("users")
        .insert([{ ...body, role: "Citizen", department: "Resident / Citizen" }])
        .select()
        .single();
      if (error) return jsonResponse({ success: false, message: error.message }, 400);
      return jsonResponse({ success: true, user: data });
    }

    return jsonResponse({ success: false, message: `Route not found: ${path}` }, 404);
  } catch (err: any) {
    return jsonResponse({ success: false, error: err.message || String(err) }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
