
# SA ED POCUS — Lung Ultrasound

## Before Generating the Report

Prompt for any not yet provided:
- Lung sliding: present or absent bilaterally
- A lines: present or absent
- B lines: none / focal (specify zone) / diffuse bilateral
- Pleural effusion: present or absent — side and size if present
- Consolidation: present or absent — location if present
- Lung point sign: present or absent
- M-mode: seashore sign / barcode sign
- Views obtained: bilateral anterior / lateral / posterior zones

## Report Generation Rules

- Include only findings explicitly provided
- Remove entire lines for findings not documented
- If insufficient data: state Insufficient data provided to generate a lung USS report

## Report Format

Bedside lung ultrasound
Indication: [indication]
Probe: [curvilinear/phased array/linear]
Views obtained: [zones examined]

Lung sliding: [present/absent bilaterally or specify side]
A lines: [present/absent]
B lines: [none/focal/diffuse bilateral]
Pleural effusion: [present/absent — side, size if documented]
Consolidation: [present/absent — location if documented]
Lung point sign: [present/absent]
M-mode: [seashore sign/barcode sign]

Impression: [normal aeration / pulmonary oedema / pleural effusion / pneumothorax / consolidation]

Plan: Clinical correlation required.
