
# SA ED Clinical Decision Tools

Auto-calculates validated scoring tools from clinical note content.
Include in Assessment section. Reference MDCalc for verification.

## Trigger Map

Chest pain: HEART score — mdcalc.com/calc/1752
Stroke / neurological deficit: NIHSS — mdcalc.com/calc/715
Pneumonia / respiratory infection: CURB-65 — mdcalc.com/calc/324
Unilateral leg swelling: Wells DVT — mdcalc.com/calc/362
Suspected PE: Wells PE — mdcalc.com/calc/115
Upper GI bleed: Glasgow-Blatchford — mdcalc.com/calc/518
Paediatric head injury: PECARN — mdcalc.com/calc/589

## HEART Score

H — History: 0 slightly suspicious, 1 moderately suspicious, 2 highly suspicious
E — ECG: 0 normal, 1 non-specific repolarisation, 2 significant ST deviation
A — Age: 0 less than 45, 1 age 45-65, 2 greater than 65
R — Risk factors: 0 none, 1 one to two factors, 2 three or more or known atherosclerotic disease
T — Troponin: 0 normal, 1 one to three times normal, 2 greater than three times normal

0-3: low risk | 4-6: moderate risk | 7-10: high risk

## CURB-65

Confusion: 1 | Urea greater than 7 mmol/L: 1 | RR 30 or more: 1
BP systolic less than 90 or diastolic 60 or less: 1 | Age 65 or older: 1
0-1: low risk | 2: moderate | 3-5: high risk

## Wells DVT

Active cancer: 1 | Paralysis/cast: 1 | Bedridden 3 days or surgery 12 weeks: 1
Localised tenderness deep venous system: 1 | Entire leg swollen: 1
Calf swelling more than 3 cm: 1 | Pitting oedema symptomatic leg: 1
Collateral superficial veins: 1 | Previous DVT: 1 | Alternative diagnosis equally likely: minus 2
2 or more: DVT likely | Less than 2: DVT unlikely

## Wells PE

DVT signs and symptoms: 3 | PE number 1 diagnosis: 3 | HR greater than 100: 1.5
Immobilisation or surgery 4 weeks: 1.5 | Previous DVT or PE: 1.5
Haemoptysis: 1 | Malignancy: 1
4 or less: PE unlikely | Greater than 4: PE likely

## Glasgow-Blatchford

Score based on urea, Hb, systolic BP, pulse, melaena, syncope, hepatic disease, cardiac failure.
0: low risk — outpatient may be appropriate | 1 or more: inpatient management required

## PECARN

Age less than 2: CT if GCS less than 15, altered mental status, or palpable skull fracture.
Age 2 and older: CT if GCS less than 15, altered mental status, or signs of basilar skull fracture.

## Output Format in Note

HEART Score: H2 + E2 + A1 + R2 + T2 = 9 (high risk — early invasive strategy)

If data insufficient, state which components are missing rather than omitting the tool.
