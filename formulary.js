// Formulary lookup — deterministic scoping of the bundled verified SA EML dose
// dataset (ed-formulary.json) down to just the drugs mentioned in one patient's
// notes. Mirrors the TCL pattern: the full store is ~900 verified entries and
// far too large to send on every generation, so we match locally and pass the
// model only the doses for drugs it will actually write about.
//
// SAFETY: this module only ever surfaces clinician-verified entries — the build
// step already excluded every requires_review dose. The model is instructed to
// use ONLY the doses passed to it and never its own dose knowledge; this module
// is what makes that instruction cheap and reliable.
//
// Plain ES module (no imports) so it can be unit-tested in Node and bundled into
// the Worker.

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build a lookup index once at module scope from the bundled formulary.
// - byGeneric: lowercased generic name -> array of verified dose entries
// - terms: [{ match, generic }] where `match` is a term to search for in the
//   note text (the generic itself, or a brand alias resolving to that generic)
export function buildFormularyIndex(formulary) {
  const byGeneric = new Map();
  for (const e of formulary.doses) {
    const g = e.generic.toLowerCase();
    if (!byGeneric.has(g)) byGeneric.set(g, []);
    byGeneric.get(g).push(e);
  }

  const terms = [];
  for (const g of byGeneric.keys()) {
    terms.push({ match: g, generic: g });
  }
  // Brand aliases only help if their generic is actually in the verified set.
  for (const [brand, generic] of Object.entries(formulary.brand_aliases || {})) {
    if (byGeneric.has(generic.toLowerCase())) {
      terms.push({ match: brand.toLowerCase(), generic: generic.toLowerCase() });
    }
  }
  // Longest match first so "amoxicillin-clavulanate" wins over "amoxicillin".
  terms.sort((a, b) => b.match.length - a.match.length);

  // Pre-compile a word-boundary-ish regex per term. \b is unreliable next to
  // hyphens, so we require a non-letter (or string edge) on each side.
  for (const t of terms) {
    t.re = new RegExp("(?:^|[^a-z])" + escapeRegex(t.match) + "(?:[^a-z]|$)", "i");
  }
  return { byGeneric, terms };
}

// Collapse an entry to the fields we surface, and to a dedupe key so the same
// dose appearing under many indications is not repeated.
function entryKey(e) {
  return [e.adult_dose, e.paed_dose_per_kg, e.route, e.frequency].join("|");
}

// Find the verified drugs mentioned in `text` and return their scoped dose
// entries. Bounded so a note mentioning many drugs cannot blow up the payload:
//   - at most MAX_DRUGS distinct drugs
//   - at most MAX_DOSES_PER_DRUG distinct dose variants each (by indication)
export function matchFormularyDrugs(text, index, opts) {
  const MAX_DRUGS = (opts && opts.maxDrugs) || 25;
  const MAX_DOSES_PER_DRUG = (opts && opts.maxDosesPerDrug) || 6;
  const lower = (text || "").toLowerCase();
  if (!lower.trim()) return [];

  const hitGenerics = [];
  const seen = new Set();
  for (const t of index.terms) {
    if (seen.has(t.generic)) continue;
    if (t.re.test(lower)) {
      seen.add(t.generic);
      hitGenerics.push(t.generic);
      if (hitGenerics.length >= MAX_DRUGS) break;
    }
  }

  const results = [];
  for (const g of hitGenerics) {
    const entries = index.byGeneric.get(g) || [];
    const deduped = [];
    const doseSeen = new Set();
    for (const e of entries) {
      const k = entryKey(e);
      if (doseSeen.has(k)) continue;
      doseSeen.add(k);
      deduped.push({
        generic: e.generic,
        adult_dose: e.adult_dose,
        paed_dose_per_kg: e.paed_dose_per_kg,
        max_dose: e.max_dose,
        frequency: e.frequency,
        route: e.route,
        indication: e.indication,
        source: e.source,
      });
      if (deduped.length >= MAX_DOSES_PER_DRUG) break;
    }
    results.push({ generic: e0Name(entries), doses: deduped });
  }
  return results;
}

// Preserve the original (cased) generic name for display.
function e0Name(entries) {
  return entries.length ? entries[0].generic : "";
}

// Render the scoped matches as a compact plain-text block for the model. Empty
// string when nothing matched, so the caller can omit the block entirely.
export function formatFormularyForPrompt(matches) {
  if (!matches || matches.length === 0) return "";
  const lines = [];
  for (const m of matches) {
    lines.push(m.generic + ":");
    for (const d of m.doses) {
      const bits = [];
      if (d.adult_dose) bits.push("adult " + d.adult_dose);
      if (d.paed_dose_per_kg) bits.push("paediatric " + d.paed_dose_per_kg);
      if (d.route) bits.push(d.route);
      if (d.frequency) bits.push(d.frequency);
      if (d.max_dose) bits.push("max " + d.max_dose);
      let line = "  - " + bits.join(", ");
      if (d.indication) line += " [" + d.indication + "]";
      if (d.source) line += " (" + d.source + ")";
      lines.push(line);
    }
  }
  return lines.join("\n");
}
