
# SA ED SOAP Note — New Patient

Generates a complete ED SOAP note for new patient presentations.
All formatting rules from sa-ed-formatting apply without exception.

## Header Block

[Age]-year-old [sex]
[Presented from home / Presented from GP / Presented with EMS / Presented
with HEMS — never combine as "Presented from with EMS"]

Default if not specified: presented from home.
Paediatric only — add on third line: BBF or BBM.

## SUBJECTIVE

Presenting complaint: [content on same line]
[Systems review if applicable — omit heading entirely if not used]
Medical conditions: [pipe-separated list]
Surgical history: [pipe-separated list]
Medications: [pipe-separated list with doses]
Allergies: [NKDA or pipe-separated list]
Alcohol/cigarettes/drug use: [adults only — omit this line entirely for paediatric]

Rules:
- Assume NKDA if allergies not provided
- Assume no medical conditions if not provided — omit the line
- Assume no surgical history if not provided — omit the line
- Assume no medications if not provided — omit the line
- Assume alcohol/cigarettes/drug use not relevant if not provided — omit the line
- FORBIDDEN in the SUBJECTIVE section: writing [NOT DOCUMENTED], "None
  documented", "Not documented", or any equivalent placeholder on any
  history line. A history field that was not provided is either omitted
  entirely — the line does not appear at all (medical conditions, surgical
  history, medications, alcohol/cigarettes/drug use) — or defaulted
  (allergies to NKDA)
- No blank lines between any headings in this section
- Medications formatted as: Drug dose | Drug dose | Drug dose

## OBJECTIVE

Vitals: HR [x] | BP [x/x] | RR [x] | Temp [x] | SpO2 [x]% [RA or O2] | SI [calculated]
HGT: [x] mmol/L
General appearance: [one line]
Hydration status: [one line]
[Relevant systems — include only what is applicable to the presentation]

Available systems: CNS / CVS / RESP / ABDO / MSK / SKIN / ENT

Rules:
- Shock Index = HR divided by SBP — calculate automatically
- Flag SI if greater than 1.0: SI 1.2 [ELEVATED]
- HGT immediately after vitals line — omit if not provided
- Only include systems relevant to the presentation
- No blank lines between any examination lines
- SpO2: specify RA (room air) or O2 (supplemental oxygen)

## SPECIAL INVESTIGATIONS

Order: ECG first, then Radiology, then Blood results, then Urine tests.

Overarching rule — SUMMARISE, DO NOT TRANSCRIBE. When results are supplied
(typed, or as a photograph of a report or screen), never copy the whole report
into the note. Report only the clinically important positive and negative
findings, and give an interpretation. Copying every line of a report verbatim is
wrong. Interpreting is always preferred over reproducing.

ECG format:
ECG: [rate], [rhythm], [axis], [intervals], [ST changes], [interpretation]

Radiology format:
[Modality] ([source], [timestamp] if available): [only the important positive
and negative findings]. [Impression in one line].
Do not reproduce the full radiology report. Pull out the findings that matter
for this presentation (positive findings, and the pertinent negatives that were
actively looked for) and the impression — nothing else.

Blood results — interpret, do not list every value:
Bloods ([source] if available): [only the relevant abnormal values with their
[H]/[L] or [CRITICAL] flags, plus the pertinent normals that matter for this
presentation], followed by a short interpretation in emergency-medicine language.
Prefer an interpretive summary over a value dump. Examples of interpretation:
cholestatic liver derangement, pre-renal dysfunction, iron-deficiency picture,
acute kidney injury on baseline, raised inflammatory markers. Do not paste the
entire panel — a normal parameter that has no bearing on this presentation is
omitted. Always still surface any critical or clearly abnormal value; never hide
an abnormal result in the name of brevity.

Collapse the normals. A group of parameters that are all within range and not
central to the presentation is summarised in a few words, not itemised value by
value. For example, in a febrile child with a raised WCC and CRP, write
"WCC 14.8 [H] | CRP 62 [H]; renal function, electrolytes, liver enzymes and full
blood count otherwise unremarkable" rather than listing Na, K, urea, creatinine,
Hb, platelets, ALT and bilirubin each with its value. Name individual normal
values only when that specific normal is clinically pertinent (for example a
normal troponin in chest pain, a normal lactate in query sepsis).

Do not do both for the same values: either a parameter is worth naming with its
value, or it is folded into the "otherwise unremarkable" summary phrase — never
list a string of values and then also call them unremarkable. In the chest-pain
example the correct line is "Troponin 8 ng/L (normal); FBC, renal function,
electrolytes and inflammatory markers unremarkable" — the individual normal
values are not itemised.

Venous or arterial blood gas — interpret, do not dump the panel:
VBG/ABG: [only the important values — typically glucose, lactate, pH, the
relevant electrolytes such as K and Na, and base excess/bicarbonate where they
matter], followed by an acid-base interpretation in words (for example:
compensated respiratory acidosis, high anion gap metabolic acidosis, normal
acid-base status). Do not reproduce every gas parameter. For a full stepwise
interpretation apply the sa-ed-blood-gas rules.

Critical values: flag immediately as [CRITICAL: value as reported].
Use units and reference ranges exactly as they appear on the source report.
Never fabricate, infer, or estimate a value that is not present in the supplied
result — summarising means selecting and interpreting what is there, never
inventing what is not.

## TREATMENT IN THE ED

List only medications and interventions administered in the ED.
Do not include scripted discharge medications here.
Each treatment item must appear on its own separate line — never combine items on the same line.

IVI: [fluid type, volume, rate]
[Drug name dose route time if documented]
[Intervention — one line per intervention]

## PROCEDURES PERFORMED IN THE ED

Only procedures performed by a doctor belong here — never nursing
procedures such as catheterisation. The clinician signals these with the
words "procedures performed" in the input.
Examples: intercostal drain (ICD), intubation, wound suturing, fracture or
dislocation reduction.
One concise procedure note per procedure — 2 to 3 lines maximum.
Include bedside ultrasound findings if performed.
Omit this section entirely if no procedures were performed.

## ASSESSMENT

[Age]-year-old [sex] with [relevant background comorbidities]
Now p/w: [primary diagnosis]
Differentials: [pipe-separated list without explanations]
[Clinical decision tool: name, score, interpretation — include where indicated]

Clinical decision tools — auto-calculate and include where triggered:
- HEART score: chest pain presentations
- NIHSS: stroke or neurological deficit
- CURB-65: pneumonia or respiratory infection
- Wells DVT: unilateral leg swelling
- Wells PE: suspected pulmonary embolism
- Glasgow-Blatchford: gastrointestinal bleed
- PECARN: paediatric head injury

## PLAN

Numbered list. Only what the clinician explicitly stated.
Do not infer, add, suggest, or expand.

## After the Note Body — Separate Outputs

ICD-10 CODES
[Code] [Description] — one per line
Prometheus format: [space-separated code string]
Source: SA NDoH ICD-10 Master Industry Table

BILLING SUGGESTIONS
[Code] | [Description] | [Basis for claim]
Flag 7063 vs 7064 distinction — clinician must confirm and document basis.
