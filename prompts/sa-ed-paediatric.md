
# SA ED Paediatric Template

Paediatric modifications applied on top of sa-ed-soap-new.
All sa-ed-formatting rules apply without exception.

## Header Block

[Age]-year-old [sex]
Presented from [home / GP / with EMS]
BBF [if brought by father] / BBM [if brought by mother]

## Subjective — Paediatric

Presenting complaint: [content on same line]
Birth history: [Term NVD / Term CS / Premature at x weeks / NICU admission]
Immunisations: EPI UTD / EPI not UTD
Medical conditions: [pipe-separated or omit]
Previous admissions: [relevant or none]
Allergies: [NKDA or list]

Omit entirely — do not include under any circumstances:
Alcohol/cigarettes/drug use section

## Objective — Paediatric Examination

Weight: [x] kg
Vitals: HR [x] | BP [x/x] | RR [x] | Temp [x] | SpO2 [x]% [RA or O2] | SI [calculated]
HGT: [x] mmol/L
General appearance: [one line — include rash present/absent]
Hydration status: [one line]
CNS: AVPU: [Alert/Voice/Pain/Unresponsive], [reactive/not lethargic], SAF, MAFL
CVS: S1S2, no murmurs
RESP: GAEB, no added sounds, no distress
ABD: SNT, no obvious masses
ENT: Normal TM bilaterally, no pharyngitis, no tonsillitis, no inflamed nares, no conjunctivitis
Lymph nodes: No cervical or submandibular LAD

No blank lines between examination lines.

## WHO Z-Scores

Include if growth data available:
Weight for height: [z-score]
Height for age: [z-score]
Weight for age: [z-score]

Omit entirely if not provided.

## Weight-Based Dosing Table

The paediatric weight-based dosing table is NOT placed in the note body. It is
generated in the dedicated DOSING output section (see sa-ed-dosing), which the
clipboard shows in its own copyable box.

For any patient under 40 kg with a documented weight, that table is always
produced there — it is a standing reference for the child, shown whether or not
those drugs were given. Do not duplicate the dosing table inside the note body.
