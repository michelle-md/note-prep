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

    const cors = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };

    // POST /api/claude — proxy to Anthropic
    if (request.method === "POST" && url.pathname === "/api/claude") {
      let body;
      try { body = await request.json(); } catch(e) {
        return new Response(JSON.stringify({ error: { message: "Invalid request body" } }), { status: 400, headers: cors });
      }
      try {
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
        return new Response(JSON.stringify(data), { headers: cors });
      } catch(e) {
        return new Response(JSON.stringify({ error: { message: "API request failed: " + e.message } }), { status: 502, headers: cors });
      }
    }

    // GET /api/shift — load shift index + all patients
    // Falls back to KV list scan if shift_index is missing or incomplete
    if (request.method === "GET" && url.pathname === "/api/shift") {
      try {
        const indexRaw = await env.SHIFT_STORE.get("shift_index");
        let patientIds = [];
        let shiftName = null;

        if (indexRaw) {
          const index = JSON.parse(indexRaw);
          patientIds = index.patientIds || [];
          shiftName = index.shiftName || null;
        }

        // Always scan KV for patient_ keys to catch any not in index
        const listed = await env.SHIFT_STORE.list({ prefix: "patient_" });
        const listedIds = listed.keys.map(k => k.name.replace("patient_", ""));

        // Merge — union of index IDs and listed IDs
        const allIds = [...new Set([...patientIds, ...listedIds])];

        // Load each patient
        const patients = [];
        for (const id of allIds) {
          const raw = await env.SHIFT_STORE.get("patient_" + id);
          if (raw) {
            try { patients.push(JSON.parse(raw)); } catch(e) {}
          }
        }

        // If scan found patients not in index, rebuild index automatically
        if (listedIds.some(id => !patientIds.includes(id)) && patients.length > 0) {
          const rebuilt = {
            shiftName: shiftName || patients[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            patientIds: allIds,
            updatedAt: new Date().toISOString(),
          };
          await env.SHIFT_STORE.put("shift_index", JSON.stringify(rebuilt), { expirationTtl: 86400 });
          shiftName = rebuilt.shiftName;
        }

        return new Response(JSON.stringify({
          shiftName,
          patientIds: allIds,
          patients,
        }), { headers: cors });

      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
      }
    }

    // POST /api/shift/index — save shift index only
    if (request.method === "POST" && url.pathname === "/api/shift/index") {
      try {
        const body = await request.text();
        await env.SHIFT_STORE.put("shift_index", body, { expirationTtl: 86400 });
        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: cors });
      }
    }

    // POST /api/patient/:id — save single patient
    if (request.method === "POST" && url.pathname.startsWith("/api/patient/")) {
      const patientId = url.pathname.replace("/api/patient/", "");
      if (!patientId) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: cors });
      try {
        const body = await request.text();
        await env.SHIFT_STORE.put("patient_" + patientId, body, { expirationTtl: 86400 });
        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: cors });
      }
    }

    // DELETE /api/shift — end shift, wipe everything
    if (request.method === "DELETE" && url.pathname === "/api/shift") {
      try {
        // List and delete all patient_ keys
        const listed = await env.SHIFT_STORE.list({ prefix: "patient_" });
        for (const key of listed.keys) {
          await env.SHIFT_STORE.delete(key.name);
        }
        await env.SHIFT_STORE.delete("shift_index");
        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: cors });
      }
    }

    // Static assets
    return env.ASSETS.fetch(request);
  },
};
