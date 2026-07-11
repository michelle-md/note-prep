
# SA ED ICD-10 Coding

Source: SA NDoH ICD-10 Master Industry Table
Reference: health.gov.za/index.php/icd-10-codes

## Core Rules

- Suggest codes based only on documented and confirmed diagnoses
- Clinician must confirm or override all codes before finalisation
- Code primary diagnosis first, then secondary diagnoses and comorbidities
- Never code suspected or differential diagnoses — confirmed only
- If a diagnosis matches an entry in the code lists below (Clinician
  Favourites first, then General Reference), use that exact code as given —
  do not substitute a more specific or more general subcode variant from
  your own knowledge, even if you believe it is more precise (e.g. use K35
  as listed, not K35.8 or K35.20)

## Output Format

ICD-10 codes — separate output (do not paste into CareOn journal body)

[Code]   [Description]
[Code]   [Description]

Prometheus format (space-separated): [Code] [Code] [Code]
CareOn ED Notes tab — primary code: [Code]

## Separation Rule

ICD-10 codes never appear in the CareOn journal note body.
Separate output only for CareOn ED Notes tab and Prometheus worksheet.

## Clinician Favourites — primary code library

These are the clinician's usual codes, taken directly from her Prometheus
favourites list. When a documented diagnosis matches one of these, use this
exact code — always preferred over any other code choice. The shorthand in
brackets is how the clinician commonly refers to the diagnosis in dictation.
This library is being built up progressively (A to E series captured so
far; more series to follow).

A09 Gastroenteritis (AGE)
A15.3 Pulmonary TB
A41.9 Sepsis unspecified
A64 Sexually transmitted disease unspecified (STD, PEP pack after intercourse)
A86 Viral encephalitis unspecified
B02.8 Zoster with other complications (shingles)
B34.9 Viral infection unspecified (viraemia, griep, flu)
C50.9 Malignant neoplasm of breast (breast Ca)
D25.9 Leiomyoma of uterus (fibroids, fibroid uterus)
D32.9 Benign neoplasm of meninges
D57.0 Sickle-cell anaemia with crisis (sickle crisis)
D61.9 Aplastic anaemia unspecified (pancytopenia)
D64.9 Anaemia unspecified
D65 Disseminated intravascular coagulation (DIC)
D68.3 Haemorrhagic disorder due to circulating anticoagulants (over-anticoagulated)
D69.6 Thrombocytopenia unspecified
D70 Agranulocytosis (neutropenia)
D71 Functional disorders of polymorphonuclear neutrophils
D72.8 Other specified disorders of white blood cells (leukopenia)
D75.1 Secondary polycythaemia
D89.9 Disorder involving the immune mechanism unspecified (query autoimmune disease)
E03.8 Other specified hypothyroidism (hypothyroidism)
E10.1 Insulin-dependent diabetes with ketoacidosis (DKA, type 1)
E11.1 Non-insulin-dependent diabetes with ketoacidosis (DKA, type 2)
E11.9 Non-insulin-dependent diabetes without complications (DMT2)
E13.1 Other specified diabetes with ketoacidosis (DKA)
E16.2 Hypoglycaemia unspecified
E78.5 Hyperlipidaemia unspecified (dyslipidaemia)
E86 Volume depletion (dehydration)
E87.0 Hypernatraemia (hyperosmolality and hypernatraemia)
E87.1 Hyponatraemia (hypo-osmolality and hyponatraemia)
E87.2 Acidosis
E87.5 Hyperkalaemia
E87.6 Hypokalaemia
E87.8 Other disorders of electrolyte and fluid balance (multiple electrolyte disturbances)
E88.9 Metabolic disorder unspecified (metabolic syndrome)

## General SA ED Reference Codes — secondary

Used when no clinician favourite covers the diagnosis. The favourites list
above always takes precedence on any overlap.

I21.0 Acute transmural MI anterior wall | I21.1 Acute transmural MI inferior wall
I21.4 NSTEMI | I20.0 Unstable angina | I10 Essential hypertension
I50.0 Congestive heart failure | I48 Atrial fibrillation
J18.9 Pneumonia unspecified | J44.1 COPD with acute exacerbation
J45.0 Allergic asthma | J93.1 Spontaneous pneumothorax
I63.9 Cerebral infarction unspecified | I61.9 Intracerebral haemorrhage
G43.9 Migraine unspecified | R55 Syncope and collapse
K92.1 Melaena | K92.0 Haematemesis | K35 Acute appendicitis
K80.0 Cholelithiasis with acute cholecystitis
O00.9 Ectopic pregnancy unspecified | O20.0 Threatened abortion
T14.9 Injury unspecified
