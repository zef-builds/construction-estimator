# Field Reporter — Prototype

Laptop-based prototype of the field reporting pipeline. Takes a folder
containing a voice memo and photos from a site visit and produces a
structured progress report PDF.

This exists to **test output quality before the Mac mini infrastructure
is built**. If the draft PDFs aren't good enough to be useful, that's a
problem to discover now — not in August after FastAPI, Tailscale, and a
job queue are already wired up.

## What it does

```
input/<visit>/
  site.json    +  memo.m4a  +  photo*.jpg
                       │
                       ▼
        ┌──────────────────────────────┐
        │ 1. Transcribe (whisper.cpp)  │
        │ 2. Caption photos (Claude)   │
        │ 3. Synthesize report (Claude)│
        │ 4. Render PDF (reportlab)    │
        └──────────────────────────────┘
                       │
                       ▼
              output/<visit>_<date>.pdf
              output/<visit>_<date>.json
```

The intermediate JSON is saved alongside the PDF — useful for spotting
where quality issues come from (transcription? photo captioning?
synthesis?).

## One-time setup

### 1. Python environment

```bash
cd field-reporter-prototype
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. whisper.cpp (transcription)

Install whisper.cpp locally. On macOS:

```bash
brew install whisper-cpp
# Download the base English model (~150 MB, good enough for prototype)
mkdir -p ~/whisper.cpp/models
curl -L -o ~/whisper.cpp/models/ggml-base.en.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
```

The script defaults to:

- `WHISPER_BIN=whisper-cli`
- `WHISPER_MODEL=~/whisper.cpp/models/ggml-base.en.bin`

Override with environment variables if you put them elsewhere.

### 3. Anthropic API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Stick this in your shell rc file so it persists.

## Running it

Drop a site visit folder into `input/`. Each folder needs:

- `site.json` — project metadata (see `input/sample_site_visit/site.json`)
- One audio file: `.m4a`, `.mp3`, `.wav`, or `.aac`
- Photos: `.jpg`, `.jpeg`, `.png`, or `.webp` (HEIC works on macOS with Pillow's HEIF plugin)

Then run:

```bash
python run_pipeline.py input/sample_site_visit
```

You'll get:

```
output/sample_site_visit_2026-04-25.pdf
output/sample_site_visit_2026-04-25.json
```

### Skipping re-transcription during iteration

When you're iterating on the report-synthesis prompt, you don't want to
re-run whisper every time. After the first run, `memo.txt` is cached in
the input folder. Re-run with:

```bash
python run_pipeline.py input/sample_site_visit --skip-transcribe
```

## What to evaluate after each run

The whole point of the prototype is calibrating output quality. After
running on a real site visit, ask yourself:

1. **Could you hand this PDF to a client or PM as-is?** If no — what
   specifically would you change?
2. **Did the synthesis invent anything not in the transcript or photos?**
   Hallucination is the deal-breaker. Check the JSON.
3. **Are deficiencies and safety items being correctly separated** from
   general work observations? Or is everything getting lumped together?
4. **Are the photo captions specific enough?** Generic ("workers
   constructing wall") vs. useful ("rough-in plumbing for kitchen island
   visible above unfinished slab, no insulation yet").
5. **What's the wall-clock time?** From "drop folder in" to "PDF in
   hand." This is the user experience that matters.
6. **What's the API cost per report?** Track this — the production
   model needs to support a $50-100/month SaaS price point eventually.

Log findings in the conversation thread or in `evaluation_notes.md`
(create it as you go).

## Tuning knobs

If output quality is poor, try these in order:

1. **Better prompts.** The prompts are inline in `run_pipeline.py`
   (search for `system_prompt`). Iterate on these first — cheapest fix.
2. **Larger Whisper model.** Swap `ggml-base.en.bin` for
   `ggml-small.en.bin` (~470 MB) or `ggml-medium.en.bin` (~1.5 GB) for
   better transcription, especially with site noise.
3. **Higher photo resolution.** Bump `MAX_PHOTO_DIM` from 1600 to 2048
   if vision is missing fine detail. Costs more in tokens.
4. **Add a project-context file.** Currently `site.json` carries some
   context. You could add a `project_brief.md` with scope, schedule,
   trades, etc. and pass it into the synthesis prompt.

## Architecture notes — toward production

This prototype intentionally hard-codes the field-reporting pipeline.
The Mac mini production version generalizes this:

- The four stages become **modular pipeline steps** registered with a
  generic runner (`pipelines/field_report.py`,
  `pipelines/change_order.py`, etc.)
- `run_pipeline.py` becomes a **FastAPI endpoint** that accepts uploads
  and returns a job ID
- A **SQLite job queue** holds pending work; a background worker picks
  it up
- A **mobile web UI** hosted by the Mac mini lets you upload from the
  field and check status

But none of that matters until the output quality is right. Get this
prototype producing good PDFs first, then build the infrastructure.

## File layout

```
field-reporter-prototype/
├── README.md
├── requirements.txt
├── run_pipeline.py
├── .gitignore
├── input/
│   └── sample_site_visit/
│       ├── site.json
│       ├── memo.m4a       # add yours
│       └── photo*.jpg     # add yours
└── output/                # PDFs + intermediate JSON land here
```
