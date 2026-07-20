// Formulary lookup — deterministic recognition of medications mentioned in a
// patient's notes, against the bundled SA dataset (ed-formulary.json):
//   - 905 clinician-verified SA STG/EML dose entries (the ONLY source of doses)
//   - a recognition map of ~8,000 SA medication terms (SEP registry brands,
//     EML generics and their alternates, non-EML ingredients and their brands)
//
// Recognition and dosing are deliberately separate: every mentioned medication
// is LISTED, but a dose is only ever attached from the verified entries. A
// recognised drug with no verified dose (e.g. Xefo/lornoxicam, or an EML drug
// whose extracted doses are still requires_review) surfaces as "verify
// manually" — never with a guessed dose.
//
// Matching is token n-gram lookup, not regex-per-term: the note text is
// normalised once and every 1..4-word window is checked against the term map.
// That keeps ~8,000 terms O(text length) per request.
//
// Plain ES module (no imports) so it can be unit-tested in Node and bundled
// into the Worker.

// Shared normalisation — build_formulary.py applies the same rule to term keys.
export function normTerm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function displayName(normed) {
  return normed ? normed.charAt(0).toUpperCase() + normed.slice(1) : normed;
}

// Build the lookup index once at module scope from the bundled formulary.
export function buildFormularyIndex(formulary) {
  // byGeneric: lowercased generic name -> verified dose entries
  const byGeneric = new Map();
  for (const e of formulary.doses) {
    const g = e.generic.toLowerCase();
    if (!byGeneric.has(g)) byGeneric.set(g, []);
    byGeneric.get(g).push(e);
  }

  // genericByNorm: normalised generic -> byGeneric key, to decide verified-ness
  const genericByNorm = new Map();
  for (const g of byGeneric.keys()) {
    genericByNorm.set(normTerm(g), g);
  }

  // termMap: normalised mention term -> normalised generic
  const termMap = new Map();
  let maxTermWords = 1;
  const addTerm = (term, generic) => {
    const t = normTerm(term);
    const g = normTerm(generic);
    if (!t || !g) return;
    if (!termMap.has(t)) termMap.set(t, g);
    const words = t.split(" ").length;
    if (words > maxTermWords) maxTermWords = Math.min(words, 4);
  };
  // Verified generics are recognisable by their own name.
  for (const g of byGeneric.keys()) addTerm(g, g);
  // Full recognition map (brands, alternates, non-EML ingredients).
  for (const [term, generic] of Object.entries(formulary.brand_map || {})) {
    addTerm(term, generic);
  }
  // Hand-curated aliases always win.
  for (const [brand, generic] of Object.entries(formulary.brand_aliases || {})) {
    termMap.set(normTerm(brand), normTerm(generic));
  }

  return { byGeneric, genericByNorm, termMap, maxTermWords };
}

// Collapse an entry to a dedupe key so the same dose appearing under many
// indications is not repeated.
function entryKey(e) {
  return [e.adult_dose, e.paed_dose_per_kg, e.route, e.frequency].join("|");
}

// Find every medication mentioned in `text`. Returns:
//   verified:   [{generic, mentioned_as, doses: [...]}] — has verified SA doses
//   unverified: [{mention, generic}] — recognised, but no verified dose exists
export function matchMentionedDrugs(text, index, opts) {
  const MAX_VERIFIED = (opts && opts.maxDrugs) || 25;
  const MAX_UNVERIFIED = (opts && opts.maxUnverified) || 15;
  const MAX_DOSES_PER_DRUG = (opts && opts.maxDosesPerDrug) || 6;

  const result = { verified: [], unverified: [] };
  const tokens = normTerm(text).split(" ").filter(Boolean);
  if (tokens.length === 0) return result;

  // Longest-window-first n-gram scan so "magnesium sulphate" beats "sulphate".
  const seenGenerics = new Set();
  const mentions = []; // [{genericNorm, mention}] in order of first appearance
  for (let i = 0; i < tokens.length; i++) {
    const maxN = Math.min(index.maxTermWords, tokens.length - i);
    for (let n = maxN; n >= 1; n--) {
      const gram = tokens.slice(i, i + n).join(" ");
      const genericNorm = index.termMap.get(gram);
      if (genericNorm !== undefined) {
        if (!seenGenerics.has(genericNorm)) {
          seenGenerics.add(genericNorm);
          mentions.push({ genericNorm, mention: displayName(gram) });
        }
        i += n - 1; // consume the matched words
        break;
      }
    }
  }

  for (const m of mentions) {
    const key = index.genericByNorm.get(m.genericNorm);
    if (key) {
      if (result.verified.length >= MAX_VERIFIED) continue;
      const entries = index.byGeneric.get(key) || [];
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
      result.verified.push({
        generic: entries.length ? entries[0].generic : displayName(m.genericNorm),
        mentioned_as: m.mention,
        doses: deduped,
      });
    } else {
      if (result.unverified.length >= MAX_UNVERIFIED) continue;
      result.unverified.push({ mention: m.mention, generic: displayName(m.genericNorm) });
    }
  }
  return result;
}

// Back-compat wrapper: just the verified matches (used for the note-generation
// prompt injection).
export function matchFormularyDrugs(text, index, opts) {
  return matchMentionedDrugs(text, index, opts).verified;
}

// Render the scoped verified matches as a compact plain-text block for the
// model. Empty string when nothing matched, so the caller can omit the block.
export function formatFormularyForPrompt(matches) {
  if (!matches || matches.length === 0) return "";
  const lines = [];
  for (const m of matches) {
    const asBrand = m.mentioned_as && normTerm(m.mentioned_as) !== normTerm(m.generic)
      ? " (mentioned as " + m.mentioned_as + ")" : "";
    lines.push(m.generic + asBrand + ":");
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
