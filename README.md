# SIGSIF Importer — Poultry

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome / Edge](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-informational)](https://www.microsoft.com/edge)

[Português (BR)](README.pt-BR.md)

Chrome / Edge extension that automates poultry diagnosis entry (total and partial condemnation) on the **Alterar Mapa de Abate** (Slaughter Map Edit) screen of [SIGSIF](https://www.gov.br/agricultura) — Brazil’s federal meat inspection system.

Built to eliminate a repetitive, error-prone task in the daily workflow of sanitary inspection (SIF / MBRF).

---

## Problem

On a typical SIF shift, recording condemnations on the slaughter map means:

1. Opening the batch on the *Alterar Mapa de Abate* screen
2. Finding each diagnosis in the table
3. Filling in the number of affected animals
4. Inserting the affected part (carcass / partial)
5. Choosing the destination (total or partial condemnation)
6. Confirming — and repeating for dozens of rows

It burns time, causes fatigue, and raises the risk of typos or posting under the wrong disease.

## Solution

The extension injects a floating panel **only** on that screen. The user pastes a free-text batch summary (expected format), validates, and runs. The script:

- Parses the text (tolerant key matching)
- Checks that every diagnosis exists in the batch table
- Fills fields and clicks buttons via the DOM, respecting the **PrimeFaces** AJAX lifecycle
- Refuses to post under the wrong diagnosis (explicit check on the Diagnosis field)
- Supports mid-run interruption and reports what was already written

No external executable, no network port, no special permissions, no privilege elevation — plain JavaScript in the page context (`world: MAIN`).

---

## Features

| Feature | Description |
|--------|-------------|
| **Text parser** | Accepts `Lote` (batch), `Aves total` (total birds), diagnosis name, `Condenação total` / `parcial` |
| **Test** | Simulates the full flow without writing to SIGSIF |
| **Validate** | Confirms every diagnosis from the text exists in the batch table |
| **Run** | Posts affected counts + parts (total and partial) with progress and log |
| **Stop** | Halts after the current step and reports what was already completed |
| **Confirm map** | Manual or automatic at the end of the run |
| **Shadow DOM** | Isolated UI — no CSS clashes with the host system |
| **Safe posting** | Aborts if the Diagnosis field does not match the expected value |

### Recognized diagnoses

`AEROSSACULITE`, `ALTERAÇÕES MUSCULARES`, `ARTRITE/TENOSSINOVITE (1 ARTICULAÇÃO)`, `ARTRITE/TENOSSINOVITE (2 ARTICULAÇÕES)`, `ASPECTO REPUGNANTE`, `CANIBALISMO`, `CAQUEXIA`, `CELULITE`, `CONTAMINAÇÃO GASTROINTESTINAL E BILIAR`, `CONTAMINAÇÃO NÃO GASTROINTESTINAL`, `ESCALDADO VIVO`, `FALHAS TECNOLÓGICAS`, `LESÃO DE PELE`, `LESÃO INFLAMATÓRIA`, `LESÃO TRAUMÁTICA`, `MAGREZA`, `NEOPLASIA`, `SEPTICEMIA`, `SÍNDROME ASCÍTICA`

---

## Tech stack

- **Manifest V3** (Chrome / Edge)
- **Content script** in `world: MAIN` (access to `PrimeFaces` and the real page DOM)
- Vanilla JavaScript (no bundler, no framework)
- **Shadow DOM** + `CSSStyleSheet` for the panel
- Explicit wait on the PrimeFaces AJAX queue (`PrimeFaces.ajax.Queue`)
- Unicode NFD normalization to match diagnoses with/without accents

### Architecture (overview)

```
content.js
├── Config (diagnoses, CSS selectors, parts/destinations)
├── Text parser → batches + items (total / partial / affected)
├── Page automation
│   ├── setValor / escolherOpcao (event dispatch)
│   ├── aguardarAjax (PrimeFaces)
│   ├── validarNoSigsif / lancarItem / lancarParte
│   └── confirmarMapa
└── UI (floating panel in Shadow DOM)
    ├── Read text → summary table
    ├── Test | Validate | Run | Stop
    └── Timestamped log + copy log
```

---

## Installation

1. Clone or download this repository into a permanent folder:

   ```bash
   git clone https://github.com/VictorHUBy/sigsif-importador-aves.git
   ```

2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder (the one that contains `manifest.json`)

> The browser warning about “developer mode extensions” is expected. On IT-managed machines, policy may block unpacked extensions.

### Different SIGSIF domain?

Edit `manifest.json` → `matches` array and add the domain, for example:

```json
"https://*.yourdomain.gov.br/*"
```

Save and reload the extension on the extensions page.

---

## Usage

1. Sign in to SIGSIF → open the batch → **Alterar Mapa de Abate** screen
2. In the bottom-right corner, click the blue **SIGSIF Importador** button
3. Paste the text in the format below and click **Ler texto** (Read text)
4. **Testar** (Test) → **Validar** (Validate) → **Executar** (Run)
5. Review on screen and confirm the map (or check “confirmar mapa ao final”)

### Sample input

```text
Lote: 5045
Aves total: 43535
AEROSSACULITE
Condenação total: 353
Condenação parcial: 3434
CELULITE
Condenação total: 12
Condenação parcial: 88
```

Parser rules:

- `Affected animals = Total condemnation + Partial condemnation`
- Blank lines are ignored
- Diagnosis can appear as a standalone key or as `DIAGNÓSTICO: name`
- Numbers accept `.` and `,` as separators

---

## Repository layout

```text
.
├── manifest.json      # Manifest V3 — matches, content_scripts
├── content.js         # Parser + automation + UI (single file)
├── INSTALAR.txt       # Quick install notes (Portuguese)
├── LICENSE            # MIT
├── README.md          # This file (English)
└── README.pt-BR.md    # Portuguese version
```

---

## Limitations & caveats

- Only works on the **Alterar Mapa de Abate** screen (detected via the disease table selector)
- Depends on the current HTML / PrimeFaces structure of SIGSIF — system updates may require selector changes in `SEL`
- On mid-run failure, the log shows what was already posted; **do not re-run without checking**, to avoid duplicates
- Operational / internal use: does not replace the inspector’s professional responsibility for what is recorded

---

## License

MIT © Victor Machado ([@VictorHUBy](https://github.com/VictorHUBy))

---

## Author

**Victor Machado** — SIF / MBRF apprentice  
A project born from a real shop-floor pain point: automate the repetitive so time remains for what matters.
