import promptFormatting from "./prompts/sa-ed-formatting.md";
import promptSoapNew from "./prompts/sa-ed-soap-new.md";
import promptMedical from "./prompts/sa-ed-medical.md";
import promptTrauma from "./prompts/sa-ed-trauma.md";
import promptPaediatric from "./prompts/sa-ed-paediatric.md";
import promptObsGynae from "./prompts/sa-ed-obs-gynae.md";
import promptSurgery from "./prompts/sa-ed-surgery.md";
import promptDosing from "./prompts/sa-ed-dosing.md";
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
import promptLiveCheck from "./prompts/sa-ed-live-check.md";
import promptConsult from "./prompts/sa-ed-consult.md";
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
  promptDosing,
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
  // Output is split into labelled sections so the clipboard can show each one
  // in its own copyable box (CareOn note, CareOn ICD code, Prometheus codes,
  // and the flags/missing checklist). Each marker sits alone on its own line so
  // the client can split on it reliably.
  [
    "FINAL OUTPUT STRUCTURE:",
    "Output the following six sections in this exact order. Each section marker below must appear alone on its own line, spelled exactly as shown, with nothing else on that line. Do not write any text before the first marker, and do not repeat a marker.",
    "",
    "@@NOTE@@",
    "The SOAP note body exactly as specified in the rules above. This is the text that is pasted into the CareOn journal. Do NOT put any ICD-10 codes, billing codes, or the dosing table in this section.",
    "",
    "@@DOSING@@",
    "The dosing section exactly as specified in the sa-ed-dosing rules: ONLY the paediatric weight-based table for a documented weight under 40 kg (or its weight-not-documented flag). No other medication dose or suggestion ever appears here. For an adult or a weight of 40 kg and over, write exactly: No dosing to calculate.",
    "",
    "@@CAREON_CODE@@",
    "The ICD-10 coding for the CareOn ED Notes tab. First line: CareOn ED Notes tab primary code: [Code]. Then each relevant code and its description on its own line. Confirmed diagnoses only.",
    "",
    "@@PROMETHEUS_CODE@@",
    "The Prometheus practice-management coding. First the billing suggestions block (clinician confirmation required before submission), each code with its basis on its own line. Then a final line: Prometheus ICD-10: [Code] [Code] [Code] (space-separated).",
    "",
    "@@FLAGS@@",
    "Clinical flags: red flags, elevated shock index, critical values, drug interactions, and incidental findings evident in the data. One per line. If there are none, write exactly: No clinical flags.",
    "",
    "@@MISSING@@",
    "Missing or ambiguous clinical data worth completing before disposition. One per line. If there are none, write exactly: No obvious gaps.",
  ].join("\n"),
].join("\n\n---\n\n");

const PATIENT_ID_RE = /^[a-zA-Z0-9_-]+$/;

// TCL vocabulary is static per deploy — build the term list and phonetic
// index once at module scope, not per request.
const TCL_ACTIVE_TERMS = buildActiveTerms(tclVocab);
const TCL_TERM_INDEX = buildTermIndex(TCL_ACTIVE_TERMS);

// ---- LLM provider switch ----
// env.LLM_PROVIDER chooses where every LLM call goes:
//   unset / "anthropic" — Anthropic API. This is the deployed cloud worker's
//                         behaviour (no var is set in production), unchanged.
//   "ollama"            — local Ollama at OLLAMA_URL (default
//                         http://127.0.0.1:11434), model OLLAMA_MODEL
//                         (default "mistral"). POPIA-safe: nothing leaves the
//                         machine. Set via .dev.vars for `npx wrangler dev`
//                         only — .dev.vars is git-ignored and asset-ignored,
//                         so it can never deploy or be served publicly.

// The local model (Mistral 7B) has no vision. Image blocks are replaced with
// an explicit placeholder so the model reports them as unread data instead of
// silently ignoring them or guessing their contents (no-fabrication rule).
const LOCAL_IMAGE_PLACEHOLDER =
  "[IMAGE ATTACHED — NOT READABLE IN LOCAL MODE. The local model cannot see images. " +
  "Do not describe, infer, or use this image's contents in any way. " +
  "List it under missing data as an unprocessed image the clinician must transcribe manually.]";

function contentToPlainText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(block => {
      if (block && block.type === "text") return block.text;
      if (block && block.type === "image") return LOCAL_IMAGE_PLACEHOLDER;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

// Single entry point for every LLM call in this worker. Returns an
// Anthropic-shaped response ({ content: [{type:"text",text}], ... } or
// { error: { message } }) regardless of provider, so callers and the
// clipboard client handle both providers identically.
async function callLLM(env, { model, max_tokens, temperature, system, messages }) {
  const provider = (env.LLM_PROVIDER || "anthropic").toLowerCase();

  if (provider === "ollama") {
    const ollamaMessages = [
      { role: "system", content: system },
      ...messages.map(m => ({ role: m.role, content: contentToPlainText(m.content) })),
    ];
    const response = await fetch((env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL || "mistral",
        stream: false,
        messages: ollamaMessages,
        // num_ctx must be raised explicitly — Ollama's default (4k) is far
        // smaller than the assembled system prompt. Mistral 7B tops out at 32k.
        options: { temperature, num_predict: max_tokens, num_ctx: 32768 },
      }),
    });
    let data;
    try { data = await response.json(); } catch (e) {
      return { error: { message: "Ollama returned a non-JSON response (" + response.status + ")" } };
    }
    if (!response.ok || data.error) {
      return { error: { message: "Ollama: " + (data.error || response.statusText) } };
    }
    return {
      content: [{ type: "text", text: (data.message && data.message.content) || "" }],
      model: data.model,
      stop_reason: data.done_reason || "end_turn",
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens, temperature, system, messages }),
  });
  return await response.json();
}

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
        const data = await callLLM(env, {
          model: body.model,
          max_tokens: body.max_tokens || 8000,
          temperature: body.temperature,
          system: body.system,
          messages: body.messages,
        });
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
        const data = await callLLM(env, {
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
        });
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

    // POST /api/dosing — live dosing scan. Fully deterministic: extracts a
    // documented weight and computes the clinician's paediatric weight-based
    // table for a child under 40 kg. Nothing else — by explicit clinician
    // decision (2026-07-22) no dose is returned for any other medication, for
    // adults, or from any formulary source. No LLM involved: instant, free,
    // and only the clinician's own formulas. Re-run by the client as data is
    // entered.
    if (request.method === "POST" && url.pathname === "/api/dosing") {
      let body;
      try { body = await request.json(); } catch(e) {
        return new Response(JSON.stringify({ error: { message: "Invalid request body" } }), { status: 400, headers: cors });
      }
      const text = typeof body.text === "string" ? body.text : "";
      if (!text.trim()) {
        return new Response(JSON.stringify({ weight: null, paedTable: [] }), { headers: cors });
      }

      // First "<number> kg" in the notes is taken as the documented weight.
      const wm = text.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*kg\b/i);
      let weight = wm ? parseFloat(wm[1].replace(",", ".")) : null;
      if (weight !== null && (!isFinite(weight) || weight <= 0 || weight > 300)) weight = null;

      // Clinician-defined volume formulas (Clinical Specification 9.3) — only
      // for a documented weight under 40 kg.
      const paedTable = [];
      if (weight !== null && weight < 40) {
        const r1 = v => (Math.round(v * 10) / 10).toFixed(1);
        paedTable.push(
          { drug: "Paracetamol (Calpol)", dose: r1(weight * 0.625) + " ml" },
          { drug: "Nurofen (Ibuprofen)", dose: r1(weight * 0.5) + " ml" },
          { drug: "Aspelone (Prednisolone)", dose: r1(weight / 6) + " ml" },
          { drug: "Augmentin (Amoxicillin-clavulanate)", dose: r1(weight * 0.375) + " ml" },
          { drug: "Zithromax (Azithromycin)", dose: r1(weight * 0.25) + " ml" },
        );
      }

      return new Response(JSON.stringify({ weight, paedTable }), { headers: cors });
    }

    // POST /api/live-check — lightweight, non-authoritative "what's missing /
    // any red flags" scan run continuously while the clinician is still adding
    // data. Uses a fast model and its own system prompt (prompts/sa-ed-live-check.md)
    // — deliberately NOT the note-generation prompt. The client sends only the
    // patient content array; the system prompt and model are fixed server-side.
    if (request.method === "POST" && url.pathname === "/api/live-check") {
      let body;
      try { body = await request.json(); } catch(e) {
        return new Response(JSON.stringify({ error: { message: "Invalid request body" } }), { status: 400, headers: cors });
      }
      const content = Array.isArray(body.content) ? body.content : [];
      if (content.length === 0) {
        return new Response(JSON.stringify({ text: "" }), { headers: cors });
      }
      try {
        const data = await callLLM(env, {
          // Fast/cheap model — this runs repeatedly as data is entered.
          model: "claude-haiku-4-5-20251001",
          max_tokens: 700,
          temperature: 0.2,
          system: promptLiveCheck,
          messages: [{ role: "user", content }],
        });
        if (data.error) return new Response(JSON.stringify({ error: data.error }), { status: 502, headers: cors });
        const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        return new Response(JSON.stringify({ text }), { headers: cors });
      } catch(e) {
        return new Response(JSON.stringify({ error: { message: "Live check failed: " + e.message } }), { status: 502, headers: cors });
      }
    }

    // POST /api/consult — "Ask the Consult" clinical decision support. Uses the
    // clinical-guidance system prompt (prompts/sa-ed-consult.md), NOT the note
    // generator. The client sends the full messages thread (patient context in
    // the first user turn, then alternating question/answer turns); the system
    // prompt and model are fixed server-side.
    if (request.method === "POST" && url.pathname === "/api/consult") {
      let body;
      try { body = await request.json(); } catch(e) {
        return new Response(JSON.stringify({ error: { message: "Invalid request body" } }), { status: 400, headers: cors });
      }
      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (messages.length === 0) {
        return new Response(JSON.stringify({ error: { message: "No question provided" } }), { status: 400, headers: cors });
      }
      try {
        const data = await callLLM(env, {
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          temperature: 0.3,
          system: promptConsult,
          messages,
        });
        if (data.error) return new Response(JSON.stringify({ error: data.error }), { status: 502, headers: cors });
        const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        return new Response(JSON.stringify({ text }), { headers: cors });
      } catch(e) {
        return new Response(JSON.stringify({ error: { message: "Consult failed: " + e.message } }), { status: 502, headers: cors });
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

    // DELETE /api/patient/:id — delete a single patient card (created in error,
    // or otherwise no longer wanted). Removes the patient record and drops the
    // id from the shift index. Does not touch any other patient.
    if (request.method === "DELETE" && url.pathname.startsWith("/api/patient/")) {
      const patientId = url.pathname.replace("/api/patient/", "");
      if (!patientId || !PATIENT_ID_RE.test(patientId)) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid patient id" }), { status: 400, headers: cors });
      }
      try {
        await env.SHIFT_STORE.delete("patient_" + patientId);
        // Drop the id from the shift index if present
        const indexRaw = await env.SHIFT_STORE.get("shift_index");
        if (indexRaw) {
          try {
            const index = JSON.parse(indexRaw);
            if (Array.isArray(index.patientIds)) {
              index.patientIds = index.patientIds.filter(id => id !== patientId);
              index.updatedAt = new Date().toISOString();
              await env.SHIFT_STORE.put("shift_index", JSON.stringify(index), { expirationTtl: 86400 });
            }
          } catch(e) { /* index rebuilds itself on next load */ }
        }
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
