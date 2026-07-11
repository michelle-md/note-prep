
# SA ED POCUS — FOCUS Cardiac Ultrasound

## Before Generating the Report

Explicitly prompt for any of the following not yet provided:
- Pericardial effusion: present or absent
- Tamponade physiology: present or absent
- LV global systolic function: preserved / mildly / moderately / severely reduced
- Regional wall motion abnormality: present or absent — location if present
- EPSS measurement in cm
- RV size and function: normal / dilated / strain pattern
- Right to left heart ratio: preserved or increased
- Chamber enlargement: none / left / right / biatrial / four chamber
- Aortic root diameter at sinus of Valsalva in cm
- Dissection flap: present or absent
- IVC diameter in cm
- IVC respiratory variation: good / reduced / absent
- Intracardiac thrombus: present or absent
- Gross valvular abnormality: present or absent

If clinician confirms nothing further to add, generate from findings provided only.

## Report Generation Rules

- Include only findings explicitly provided
- Remove entire lines for measurements not documented — do not write not measured
- If insufficient data: state Insufficient data provided to generate a complete FOCUS cardiac report

## Report Format

Bedside FOCUS cardiac ultrasound
Indication: [indication]
Probe: Phased array
Views obtained: [list views obtained]

Pericardium
Pericardial effusion: [present/absent]
Tamponade physiology: [present/absent]

Left ventricle
Global systolic function: [preserved/mildly/moderately/severely reduced]
Regional wall motion abnormality: [present/absent — location if present]
EPSS: [x] cm

Right ventricle
Size and function: [normal/dilated/strain pattern]
Right to left heart ratio: [preserved/increased]

Atria
Chamber enlargement: [none/left/right/biatrial/four chamber]

Aortic root
Diameter at sinus of Valsalva: [x] cm
Dissection flap: [present/absent]

IVC
Diameter: [x] cm
Respiratory variation: [good/reduced/absent]
Interpretation: [low RA pressure / elevated RA pressure]

Limitations: [list if applicable]

Impression: [concise haemodynamic interpretation]

Plan: Clinical correlation required. Formal echocardiography recommended if indicated.
