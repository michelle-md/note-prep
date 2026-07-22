// TCL Stage A — deterministic phonetic pre-processing for transcript
// correction. Ported from the ED AI system's Python TCL
// (ed-ai-system/tcl/transcript_correction_layer.py).
//
// Flags transcript words that sound like a known clinical term (Soundex or
// simplified-phonetic-key match) and are within Levenshtein distance 2 of
// it. Candidates are hints for Stage B (LLM contextual correction) — the
// clinician always sees and can revert every applied correction, so false
// positives here are cheap.
//
// Plain ES module with no imports so it can be unit-tested directly in Node
// as well as bundled into the Worker.

export function soundex(word) {
  const s = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";
  const codes = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };
  // Depart from classic Soundex: the first letter is CODED, not kept literal.
  // Voice transcription regularly swaps sound-alike initials (Zefo for Xefo,
  // Cetamol for Ketamol), and classic Soundex can never match those because it
  // compares the raw first letter. Coding it puts X/Z/C/K/S-initial variants
  // in the same class; the Levenshtein <= 2 gate still applies afterwards, and
  // candidates are only hints for Stage B with a clinician-visible revert.
  let result = codes[s[0]] || s[0];
  let prevCode = codes[s[0]] || "";
  for (let i = 1; i < s.length && result.length < 4; i++) {
    const c = s[i];
    const code = codes[c] || "";
    // H and W are transparent: a consonant on either side of them still
    // counts as adjacent for the repeated-code rule
    if (c === "H" || c === "W") continue;
    if (code && code !== prevCode) result += code;
    prevCode = code;
  }
  return result.padEnd(4, "0");
}

// Simplified metaphone-style key: normalises common English/medical
// spelling variations to a consonant skeleton, so "morphene" and
// "morphine" produce the same key.
export function phoneticKey(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  w = w
    .replace(/ph/g, "f")
    .replace(/gh/g, "g")
    .replace(/kn/g, "n")
    .replace(/wr/g, "r")
    .replace(/qu/g, "kw")
    .replace(/x/g, "ks")
    .replace(/ce/g, "se").replace(/ci/g, "si").replace(/cy/g, "sy")
    .replace(/c/g, "k")
    .replace(/z/g, "s")
    .replace(/tion/g, "shun")
    .replace(/ou|au/g, "o")
    .replace(/ee|ea|ie|ei/g, "e");
  // Keep the leading character (vowel or consonant), drop other vowels,
  // then collapse repeats
  const head = w[0];
  const tail = w.slice(1).replace(/[aeiouy]/g, "");
  return (head + tail).replace(/(.)\1+/g, "$1");
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

// Builds the flat list of correctable terms from the vocab bundle.
export function buildActiveTerms(vocab) {
  const terms = new Set();
  for (const med of vocab.medications) terms.add(med.toLowerCase());
  for (const a of vocab.acronyms) {
    terms.add(a.acronym.toLowerCase());
    terms.add(a.full_phrase.toLowerCase());
  }
  return [...terms].sort();
}

// Pre-computes phonetic codes for single-word terms. Multi-word terms are
// left to Stage B's contextual matching.
export function buildTermIndex(activeTerms) {
  const index = [];
  for (const term of activeTerms) {
    if (term.includes(" ")) continue;
    index.push({ term, soundex: soundex(term), key: phoneticKey(term) });
  }
  return index;
}

export function stageACandidates(rawTranscript, activeTerms, termIndex) {
  const activeSet = new Set(activeTerms);
  const words = rawTranscript.match(/[A-Za-z][A-Za-z\-']+/g) || [];
  const seen = new Set();
  const candidates = [];

  for (const word of words) {
    const w = word.toLowerCase();
    if (w.length < 3 || seen.has(w)) continue;
    seen.add(w);
    if (activeSet.has(w)) continue; // already spelled correctly

    const wSoundex = soundex(w);
    const wKey = phoneticKey(w);

    for (const t of termIndex) {
      if (wSoundex !== t.soundex && wKey !== t.key) continue;
      const distance = levenshtein(w, t.term);
      if (distance > 0 && distance <= 2) {
        candidates.push({
          transcript_word: word,
          vocabulary_match: t.term,
          levenshtein_distance: distance,
        });
        break;
      }
    }
  }
  return candidates;
}
