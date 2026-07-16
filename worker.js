import promptFormatting from "./prompts/sa-ed-formatting.md";
import promptSoapNew from "./prompts/sa-ed-soap-new.md";
import promptMedical from "./prompts/sa-ed-medical.md";
import promptTrauma from "./prompts/sa-ed-trauma.md";
import promptPaediatric from "./prompts/sa-ed-paediatric.md";
import promptObsGynae from "./prompts/sa-ed-obs-gynae.md";
import promptSurgery from "./prompts/sa-ed-surgery.md";
import promptDecisionTools from "./prompts/sa-ed-decision-tools.md";
import promptBilling from "./prompts/sa-ed-billing.md";
import promptIcd10 from "./prompts/sa-ed-icd10.md";
import promptCriticalValues from "./prompts/sa-ed-critical-values.md";
import promptBloodGas from "./prompts/sa-ed-blood-gas.md";
import promptPocusCardiac from "./prompts/sa-ed-pocus-cardiac.md";
import promptPocusLung from "./prompts/sa-ed-pocus-lung.md";
import promptPocusAorta from "./prompts/sa-ed-pocus-aorta.md";
import promptPocusDvt from "./prompts/sa-ed-pocus-dvt.md";
import promptPocusEfast from "./prompts/sa-ed-pocus-efast.md";
import promptPocusGallbladder from "./prompts/sa-ed-pocus-gallbladder.md";
import promptPocusOcular from "./prompts/sa-ed-pocus-ocular.md";
import promptPocusPelvic from "./prompts/sa-ed-pocus-pelvic.md";
import promptPocusRush from "./prompts/sa-ed-pocus-rush.md";
import promptFinalReminders from "./prompts/sa-ed-final-reminders.md";
import promptTclCorrection from "./prompts/sa-ed-tcl-correction.md";
import tclVocab from "./tcl-vocab.json";
import { buildActiveTerms, buildTermIndex, stageACandidates } from "./tcl-stage-a.js";

// System prompt is assembled at request time from the bundled prompt files
// above. To change note formatting, wording, or clinical rules, edit the
// relevant file under prompts/ and redeploy — nothing here needs to change.
const SYSTEM_PROMPT = [
  "You are a South African emergency medicine physician assistant generating clinical documentation. Apply all rules below without exception.",
  promptFormatting,
  promptSoapNew,
  promptMedical,
  promptTrauma,
  promptPaediatric,
  promptObsGynae,
  promptSurgery,
  promptDecisionTools,
  promptBilling,
  promptIcd10,
  promptCriticalValues,
  promptBloodGas,
  promptPocusCardiac,
  promptPocusLung,
  promptPocusAorta,
  promptPocusDvt,
  promptPocusEfast,
  promptPocusGallbladder,
  promptPocusOcular,
  promptPocusPelvic,
  promptPocusRush,
  "FINAL OUTPUT STRUCTURE:\n[SOAP note]\n---\n[ICD-10 codes block]\n---\n[Billing suggestions block]\n[Clinical flags — missing data, drug interactions, incidental findings]",
].join("\n\n---\n\n");

const PATIENT_ID_RE = /^[a-zA-Z0-9_-]+$/;

// TCL vocabulary is static per deploy — build the term list and phonetic
// index once at module scope, not per request.
const TCL_ACTIVE_TERMS = buildActiveTerms(tclVocab);
const TCL_TERM_INDEX = buildTermIndex(TCL_ACTIVE_TERMS);

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
      // System prompt always comes from the bundled prompt files server-side —
      // never trust whatever the client sends here.
      body.system = SYSTEM_PROMPT;
      // Clinical documentation needs deterministic rule-following, not
      // creative variation — low temperature keeps formatting rules applied
      // consistently across runs.
      body.temperature = 0.2;
      // The rules the model most often drops are appended as the very last
      // thing it reads — end-of-message instructions carry far more weight
      // than the same rules buried mid-system-prompt. Editable in
      // prompts/sa-ed-final-reminders.md like every other clinical rule.
      if (Array.isArray(body.messages) && body.messages.length > 0) {
        const last = body.messages[body.messages.length - 1];
        if (last.role === "user" && Array.isArray(last.content)) {
          last.content.push({ type: "text", text: promptFinalReminders });
        }
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

    // POST /api/tcl — Transcript Correction Layer
    // Stage A: phonetic matching against the bundled SA EML vocabulary
    // (deterministic, free). Stage B: LLM contextual correction via
    // Anthropic. Returns the corrected transcript plus a correction log;
    // the client shows every correction to the clinician with a revert.
    if (request.method === "POST" && url.pathname === "/api/tcl") {
      let body;
      try { body = await request.json(); } catch(e) {
        return new Response(JSON.stringify({ error: { message: "Invalid request body" } }), { status: 400, headers: cors });
      }
      const rawTranscript = typeof body.text === "string" ? body.text : "";
      if (!rawTranscript.trim()) {
        return new Response(JSON.stringify({ error: { message: "No text provided" } }), { status: 400, headers: cors });
      }

      const candidates = stageACandidates(rawTranscript, TCL_ACTIVE_TERMS, TCL_TERM_INDEX);

      // Stage B gets a scoped vocabulary, not the full store: the phonetic
      // candidates found by Stage A plus the (small) acronym library. The
      // full store is 4,000+ terms — sending it on every call would cost
      // ~10k tokens per note add for no accuracy gain, since Stage A has
      // already matched against all of it locally.
      const scopedVocabulary = [
        ...tclVocab.acronyms.map(a => `${a.acronym} = ${a.full_phrase}`),
        ...candidates.map(c => c.vocabulary_match),
      ];

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 2000,
            // Correction task, not generation — keep it deterministic
            temperature: 0.1,
            system: promptTclCorrection,
            messages: [{
              role: "user",
              content: JSON.stringify({
                raw_transcript: rawTranscript,
                active_vocabulary: scopedVocabulary,
                phonetic_candidates: candidates,
              }),
            }],
          }),
        });
        const data = await response.json();
        if (data.error) {
          return new Response(JSON.stringify({ error: data.error }), { status: 502, headers: cors });
        }

        const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        // Tolerate stray markdown fences despite the JSON-only instruction
        const match = text.replace(/```(?:json)?/g, "").match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Correction response was not valid JSON");
        const result = JSON.parse(match[0]);
        if (typeof result.corrected_transcript !== "string") {
          throw new Error("Correction response missing corrected_transcript");
        }

        return new Response(JSON.stringify({
          corrected_transcript: result.corrected_transcript,
          corrections: Array.isArray(result.corrections) ? result.corrections : [],
          phonetic_candidates_count: candidates.length,
        }), { headers: cors });
      } catch(e) {
        return new Response(JSON.stringify({ error: { message: "TCL correction failed: " + e.message } }), { status: 502, headers: cors });
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
      if (!patientId || !PATIENT_ID_RE.test(patientId)) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid patient id" }), { status: 400, headers: cors });
      }
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
    // clipboard.theconsultr.com is the ED Shift Clipboard's home — serve that
    // app at "/" on this hostname specifically, instead of the default
    // index.html (which is the separate Note Prep tool). Every other
    // hostname this Worker responds on (workers.dev, a future
    // noteprep.theconsultr.com, etc.) keeps the default index.html at "/".
    if (url.pathname === "/" && url.hostname === "clipboard.theconsultr.com") {
      return env.ASSETS.fetch(new Request(new URL("/ed-shift-clipboard", request.url), request));
    }
    return env.ASSETS.fetch(request);
  },
};
