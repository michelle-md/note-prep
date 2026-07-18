
# SA ED Formatting — Foundation Rules

These rules apply to every clinical note output without exception.
All other SA ED skills inherit and apply these rules.

---

## Absolute Rules — Never Violated

- Plain text only — no bold, italic, underline, or markdown formatting
- No headers or heading markers (no #, ##, **, --, === anywhere)
- No arrow symbols of any kind — never use →, =>, ->, or any arrow variant
- No bullet points or numbered lists except in the Plan section
- No blank lines between any lines in the Subjective section
- No blank lines between any lines in the Examination section
- No non-standard symbols, special characters, or Unicode characters
- No em dashes, en dashes, or decorative punctuation
- No tables in the note body
- No placeholder text — if data is missing, flag it explicitly as [NOT DOCUMENTED] or omit entirely per module rules

---

## Structure Rules

- All heading labels followed immediately by content on the same line
- No blank lines between lines throughout the entire note body

---

## SOAP Skeleton — Universal

Every note body uses the SOAP structure. The four core headings must always be
present, spelled in capitals, each on its own line, and in this order:
SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN. The interposed sections defined by the
active template (SPECIAL INVESTIGATIONS, TREATMENT IN THE ED, PROCEDURES
PERFORMED IN THE ED) sit between OBJECTIVE and ASSESSMENT where applicable.

Never omit, rename, merge, or reorder the four core SOAP headings, and never
emit the note as free prose without them.

The ONLY exception is a trauma presentation, which follows the trauma template
skeleton instead (header, then Mechanism of injury, then SUBJECTIVE, then
OBJECTIVE with the ATLS primary survey and secondary survey, then the
investigation/treatment/procedure sections, then ASSESSMENT and PLAN). Use the
trauma skeleton only for traumatic presentations; every non-trauma note uses the
standard SOAP skeleton above.

---

## List Formatting

Pipe-separated format for all inline lists:
  Medical conditions: DM | HPT | Dyslipidaemia
  Medications: Amlodipine 5mg | Metformin 850mg | Aspirin 100mg
  Allergies: NKDA
  Surgical history: Appendicectomy | Right inguinal hernia repair

---

## Critical Value Flags

Format: [CRITICAL: value and unit as reported on source document]
Example: [CRITICAL: Troponin I 1.8 ng/L]
Always use the unit as it appears on the source laboratory report.
Never hardcode reference ranges or units — use the source document.

---

## Abnormal Result Flags

Any result outside the reference range provided in the source document — but not
meeting the Critical Value threshold above — is flagged inline with [H] (high) or
[L] (low) immediately after the value. Do not use words like "elevated" or "low"
in place of this bracket flag.
Example: WCC 14.8 [H] | CRP 64 [H] | Sodium 128 [L]
Only flag against the reference range given in the source document — never
against a hardcoded range.

---

## Shock Index

Calculate automatically: SI = HR / SBP
Flag if greater than 1.0: SI 1.2 [ELEVATED]
Do not flag if 1.0 or below: SI 0.65

---

## Missing Data

- Never fabricate, infer, or estimate any clinical value not explicitly provided
- Never leave template placeholder text in the output
- Flag missing data as [NOT DOCUMENTED] only where clinically significant,
  and only for objective clinical values (vitals, examination findings,
  results) — never on SUBJECTIVE history lines, which are omitted entirely
  per module rules when not provided
- For POCUS modules: remove entire lines for measurements not provided
  (do not write EPSS: not measured — remove the EPSS line entirely)

---

## Language and Terminology

- Standard South African medical terminology and abbreviations
- Acceptable abbreviations: DM, HPT, NKDA, GCS, MAFL, PEARL, SNT,
  GAEB, S1S2, NSR, CCF, NVD, CS, LUTS, PVD, AUB, CET, TOF, POD,
  RUQ, LUQ, IUP, BHCG, CRL, eFAST, VBG, ABG, IVI, IMI, PO, PR, IV
- Do not spell out abbreviations that are standard in SA emergency medicine
- Pupils equal and reactive to light is always written as PEARL — never
  spelled out in full, in any template
- Never use the term "soft tissue injury" for trauma or orthopaedic
  patients — use the accurate term: contusion, sprain, abrasion,
  laceration, or penetrating wound
- Use past tense for events that occurred: administered, performed, given
- Note reads as written by the treating clinician

---

## ICD-10 and Billing — Separation Rule

ICD-10 codes and billing codes are always separate outputs.
They never appear in the note body that is pasted into CareOn.
They are presented as distinct sections after the note body.

---

## Plan Section — Only Exception to No-List Rule

The Plan section uses a numbered list.
List only what the clinician explicitly stated.
Do not infer, add, suggest, or expand the plan.
