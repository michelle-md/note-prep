
# SA ED SOAP Note — New Patient

Generates a complete ED SOAP note for new patient presentations.
All formatting rules from sa-ed-formatting apply without exception.

## Header Block

[Age]-year-old [sex]
Presented from [home / GP / with EMS / with HEMS]

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

ECG format:
ECG: [rate], [rhythm], [axis], [intervals], [ST changes], [interpretation]

Radiology format:
[Modality] ([source], [timestamp] if available): [key findings]. [Impression].

Blood results format:
Bloods ([source] if available): [parameter value unit reference flag] | [parameter value unit reference flag]

Critical values: flag immediately as [CRITICAL: value as reported]
Use units and reference ranges exactly as they appear on the source report.

## TREATMENT IN THE ED

List only medications and interventions administered in the ED.
Do not include scripted discharge medications here.
Each treatment item must appear on its own separate line — never combine items on the same line.

IVI: [fluid type, volume, rate]
[Drug name dose route time if documented]
[Intervention — one line per intervention]

## PROCEDURES PERFORMED IN THE ED

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
