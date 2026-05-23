export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const corsHeaders = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };

    // POST /api/claude — proxy to Anthropic
    if (request.method === "POST" && url.pathname === "/api/claude") {
      const body = await request.json();
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // GET /api/shift — load current shift from KV
    if (request.method === "GET" && url.pathname === "/api/shift") {
      const data = await env.SHIFT_STORE.get("current_shift");
      if (!data) {
        return new Response(JSON.stringify({ patients: [] }), { headers: corsHeaders });
      }
      return new Response(data, { headers: corsHeaders });
    }

    // POST /api/shift — save shift to KV (24hr expiry)
    if (request.method === "POST" && url.pathname === "/api/shift") {
      const body = await request.text();
      await env.SHIFT_STORE.put("current_shift", body, { expirationTtl: 86400 });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // DELETE /api/shift — end shift, wipe all data
    if (request.method === "DELETE" && url.pathname === "/api/shift") {
      await env.SHIFT_STORE.delete("current_shift");
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // All other requests — serve static assets
    return env.ASSETS.fetch(request);
  },
};
