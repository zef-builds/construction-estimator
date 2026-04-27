"""
Field Reporting Pipeline — Laptop Prototype
============================================

Takes a folder containing photos and a voice memo from a site visit and
produces a structured progress report PDF.

Pipeline stages:
    1. Transcribe voice memo via local whisper.cpp
    2. Describe each photo via Claude vision
    3. Synthesize transcript + photo descriptions + site metadata
       into a structured progress report (Claude)
    4. Render to PDF with photos embedded

Usage:
    python run_pipeline.py input/sample_site_visit

Folder layout expected:
    input/<visit_name>/
        site.json           # site metadata (project, date, trades, weather)
        memo.m4a            # voice memo (or .mp3, .wav, .heic-ignored)
        photo1.jpg          # any number of photos (.jpg, .jpeg, .png, .heic)
        photo2.jpg
        ...

Output:
    output/<visit_name>_<date>.pdf
    output/<visit_name>_<date>.json    # structured intermediate, for inspection
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import anthropic
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CLAUDE_MODEL = "claude-sonnet-4-6"
WHISPER_BIN = os.environ.get("WHISPER_BIN", "whisper-cli")
WHISPER_MODEL = os.environ.get(
    "WHISPER_MODEL",
    str(Path.home() / "whisper.cpp/models/ggml-base.en.bin"),
)
SUPPORTED_PHOTO_EXTS = {".jpg", ".jpeg", ".png", ".heic", ".webp"}
SUPPORTED_AUDIO_EXTS = {".m4a", ".mp3", ".wav", ".aac"}
MAX_PHOTO_DIM = 1600  # resize before sending to vision API


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class SiteMetadata:
    project_name: str
    project_address: str
    visit_date: str
    weather: str = ""
    trades_on_site: list[str] = field(default_factory=list)
    reporter_name: str = ""
    notes: str = ""


@dataclass
class PhotoAnalysis:
    filename: str
    caption: str
    observed_elements: list[str]
    flags: list[str]  # e.g. "deficiency: <description>", "safety: <description>"


@dataclass
class ReportSections:
    summary: str
    work_observed: list[str]
    deficiencies: list[str]
    safety_notes: list[str]
    next_steps: list[str]


# ---------------------------------------------------------------------------
# Stage 1: Transcription via whisper.cpp
# ---------------------------------------------------------------------------


def transcribe_audio(audio_path: Path) -> str:
    """Run local whisper.cpp on the audio file and return the transcript."""
    if not audio_path.exists():
        return ""

    print(f"[1/4] Transcribing {audio_path.name} via whisper.cpp...")

    # whisper-cli writes <input>.txt next to the input
    output_txt = audio_path.with_suffix(audio_path.suffix + ".txt")

    cmd = [
        WHISPER_BIN,
        "-m", WHISPER_MODEL,
        "-f", str(audio_path),
        "-otxt",
        "-of", str(audio_path.with_suffix("")),  # output prefix
        "--no-prints",
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except FileNotFoundError:
        print(f"  ERROR: whisper-cli not found at '{WHISPER_BIN}'.")
        print(f"  Set WHISPER_BIN env var or install whisper.cpp.")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"  ERROR running whisper.cpp:\n{e.stderr}")
        sys.exit(1)

    transcript_path = audio_path.with_suffix("").with_suffix(".txt")
    if not transcript_path.exists():
        # fallback name
        transcript_path = output_txt

    transcript = transcript_path.read_text().strip()
    print(f"  → {len(transcript)} characters transcribed")
    return transcript


# ---------------------------------------------------------------------------
# Stage 2: Photo analysis via Claude vision
# ---------------------------------------------------------------------------


def prepare_image_for_vision(photo_path: Path) -> tuple[str, str]:
    """Resize and base64-encode a photo. Returns (base64_data, media_type)."""
    img = Image.open(photo_path)
    img = img.convert("RGB")

    # Downscale to keep token costs and latency reasonable
    if max(img.size) > MAX_PHOTO_DIM:
        img.thumbnail((MAX_PHOTO_DIM, MAX_PHOTO_DIM), Image.LANCZOS)

    import io
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    data = base64.standard_b64encode(buf.getvalue()).decode()
    return data, "image/jpeg"


def analyze_photos(
    client: anthropic.Anthropic,
    photo_paths: list[Path],
    metadata: SiteMetadata,
) -> list[PhotoAnalysis]:
    """Send each photo to Claude and get a structured caption."""
    analyses: list[PhotoAnalysis] = []
    print(f"[2/4] Analyzing {len(photo_paths)} photos via Claude vision...")

    system_prompt = (
        "You are an expert construction superintendent reviewing a site photo. "
        "Identify what trade and what work is shown, what stage it's at, and "
        "anything notable (good progress, deficiencies, safety concerns). "
        "Be concise and specific. Use construction terminology. "
        "Respond ONLY with a JSON object — no preamble, no markdown fences."
    )

    # FIX 1: flags now require a colon and specific description on every entry.
    # Previously the template showed bare category labels ("deficiency" | "safety" etc.)
    # which caused the model to return bare labels inconsistently on some photos.
    user_template = (
        "Project: {project}\n"
        "Address: {address}\n"
        "Visit date: {date}\n"
        "Trades on site: {trades}\n\n"
        "Analyze this site photo and respond with JSON:\n"
        "{{\n"
        '  "caption": "one-sentence description (15-25 words)",\n'
        '  "observed_elements": ["short bullet", "short bullet", ...],\n'
        '  "flags": [\n'
        '    "deficiency: <specific issue observed>",\n'
        '    "safety: <specific hazard observed>",\n'
        '    "milestone: <specific progress achieved>",\n'
        '    "general: <other observation>"\n'
        '  ]\n'
        "}}\n"
        "Include only flag types that apply. Every flag must include a colon "
        "and a specific description — never a bare category label."
    )

    for i, photo_path in enumerate(photo_paths, 1):
        print(f"  ({i}/{len(photo_paths)}) {photo_path.name}")
        try:
            data, media_type = prepare_image_for_vision(photo_path)
        except Exception as e:
            print(f"    SKIP: could not read image: {e}")
            continue

        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=600,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": data,
                        },
                    },
                    {
                        "type": "text",
                        "text": user_template.format(
                            project=metadata.project_name,
                            address=metadata.project_address,
                            date=metadata.visit_date,
                            trades=", ".join(metadata.trades_on_site) or "unknown",
                        ),
                    },
                ],
            }],
        )

        raw = message.content[0].text.strip()
        # Strip code fences if Claude added them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        try:
            parsed = json.loads(raw)
            analyses.append(PhotoAnalysis(
                filename=photo_path.name,
                caption=parsed.get("caption", ""),
                observed_elements=parsed.get("observed_elements", []),
                flags=parsed.get("flags", ["general: no specific flags identified"]),
            ))
        except json.JSONDecodeError as e:
            print(f"    WARN: could not parse JSON, using raw text")
            analyses.append(PhotoAnalysis(
                filename=photo_path.name,
                caption=raw[:200],
                observed_elements=[],
                flags=["general: photo analysis could not be parsed"],
            ))

    return analyses


# ---------------------------------------------------------------------------
# Stage 3: Synthesize the report
# ---------------------------------------------------------------------------


def synthesize_report(
    client: anthropic.Anthropic,
    metadata: SiteMetadata,
    transcript: str,
    photos: list[PhotoAnalysis],
) -> ReportSections:
    """Combine transcript + photo analyses into structured report sections."""
    print(f"[3/4] Synthesizing report sections...")

    photo_summary = "\n".join(
        f"- [{p.filename}] {p.caption} (flags: {', '.join(p.flags)})"
        for p in photos
    )

    # FIX 2: Added deduplication instruction — if an item appears in
    # deficiencies, safety_notes should reference it briefly rather than
    # restating it in full. Previously the same item appeared in both sections
    # with nearly identical language.
    system_prompt = (
        "You are a senior construction project manager writing a progress "
        "report. Synthesize the field observations from the site walk "
        "(voice memo transcript) and the photo log into a structured report. "
        "Be precise, professional, and concise. Use construction terminology. "
        "Distinguish clearly between what was observed, what is deficient, "
        "what is a safety concern, and what needs to happen next. "
        "Do not invent details not supported by the transcript or photos. "
        "If an item appears in deficiencies, reference it briefly in "
        "safety_notes rather than restating it in full — do not duplicate "
        "content across sections. "
        "Respond ONLY with a JSON object — no preamble, no markdown fences."
    )

    user_msg = f"""SITE VISIT METADATA
Project: {metadata.project_name}
Address: {metadata.project_address}
Visit date: {metadata.visit_date}
Weather: {metadata.weather or 'not noted'}
Trades on site: {', '.join(metadata.trades_on_site) or 'not noted'}
Reporter: {metadata.reporter_name or 'not noted'}
Pre-visit notes: {metadata.notes or 'none'}

VOICE MEMO TRANSCRIPT
{transcript or '[no voice memo provided]'}

PHOTO LOG
{photo_summary or '[no photos provided]'}

Generate the report sections. Respond with JSON:
{{
  "summary": "2-3 sentence executive summary of the visit",
  "work_observed": ["specific observation 1", "specific observation 2", ...],
  "deficiencies": ["specific deficiency with location if known", ...],
  "safety_notes": ["safety observation or concern", ...],
  "next_steps": ["actionable follow-up", ...]
}}

Empty arrays are fine if there's nothing to report in a section."""

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4000
        system=system_prompt,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    # Strip any trailing fence that wasn't caught above
    if raw.endswith("```"):
        raw = raw[:-3].strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  ERROR: could not parse synthesis JSON: {e}")
        print(f"  Raw response (first 500 chars):\n{raw[:500]}")
        sys.exit(1)
    return ReportSections(
        summary=parsed.get("summary", ""),
        work_observed=parsed.get("work_observed", []),
        deficiencies=parsed.get("deficiencies", []),
        safety_notes=parsed.get("safety_notes", []),
        next_steps=parsed.get("next_steps", []),
    )


# ---------------------------------------------------------------------------
# Stage 4: Render PDF
# ---------------------------------------------------------------------------


def render_pdf(
    output_path: Path,
    metadata: SiteMetadata,
    sections: ReportSections,
    photos: list[PhotoAnalysis],
    photo_dir: Path,
) -> None:
    """Render the structured report to a PDF with embedded photos."""
    print(f"[4/4] Rendering PDF to {output_path.name}...")

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=18, spaceAfter=12)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, spaceAfter=8, spaceBefore=14)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=10, leading=14)
    small = ParagraphStyle("Small", parent=styles["BodyText"], fontSize=8, leading=11, textColor=colors.grey)
    caption_style = ParagraphStyle("Caption", parent=body, fontSize=9, leading=12, alignment=1)

    story: list[Any] = []

    # Header
    story.append(Paragraph("Site Progress Report", h1))
    meta_table_data = [
        ["Project:", metadata.project_name],
        ["Address:", metadata.project_address],
        ["Visit date:", metadata.visit_date],
        ["Weather:", metadata.weather or "—"],
        ["Trades on site:", ", ".join(metadata.trades_on_site) or "—"],
        ["Reporter:", metadata.reporter_name or "—"],
    ]
    meta_table = Table(meta_table_data, colWidths=[1.5 * inch, 5 * inch])
    meta_table.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)

    # Summary
    story.append(Paragraph("Summary", h2))
    story.append(Paragraph(sections.summary or "—", body))

    def bullet_section(title: str, items: list[str]) -> None:
        story.append(Paragraph(title, h2))
        if not items:
            story.append(Paragraph("None noted.", body))
            return
        for item in items:
            story.append(Paragraph(f"• {item}", body))

    bullet_section("Work observed", sections.work_observed)
    bullet_section("Deficiencies", sections.deficiencies)
    bullet_section("Safety notes", sections.safety_notes)
    bullet_section("Next steps", sections.next_steps)

    # Photo log on a new page
    if photos:
        story.append(PageBreak())
        story.append(Paragraph("Photo log", h1))

        for p in photos:
            photo_path = photo_dir / p.filename
            if not photo_path.exists():
                continue
            try:
                img = Image.open(photo_path).convert("RGB")
                img.thumbnail((1200, 1200), Image.LANCZOS)
                tmp = photo_dir / f"_pdf_{p.filename}.jpg"
                img.save(tmp, format="JPEG", quality=85)

                rl_img = RLImage(
                    str(tmp),
                    width=4.5 * inch,
                    height=4.5 * inch * img.size[1] / img.size[0],
                )
                story.append(rl_img)
                story.append(Paragraph(p.caption, caption_style))
                story.append(Paragraph(
                    f"Flags: {', '.join(p.flags)}  |  {p.filename}",
                    small,
                ))
                story.append(Spacer(1, 0.2 * inch))
            except Exception as e:
                print(f"  WARN: could not embed {p.filename}: {e}")

    # Footer
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(
        f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} by field-reporter prototype.",
        small,
    ))

    doc.build(story)
    print(f"  → {output_path}")


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def load_metadata(input_dir: Path) -> SiteMetadata:
    site_json = input_dir / "site.json"
    if not site_json.exists():
        print(f"ERROR: missing {site_json}")
        sys.exit(1)
    raw = json.loads(site_json.read_text())
    return SiteMetadata(
        project_name=raw.get("project_name", "Unnamed Project"),
        project_address=raw.get("project_address", ""),
        visit_date=raw.get("visit_date", datetime.now().strftime("%Y-%m-%d")),
        weather=raw.get("weather", ""),
        trades_on_site=raw.get("trades_on_site", []),
        reporter_name=raw.get("reporter_name", ""),
        notes=raw.get("notes", ""),
    )


def discover_inputs(input_dir: Path) -> tuple[Path | None, list[Path]]:
    audio_files = [
        p for p in input_dir.iterdir()
        if p.suffix.lower() in SUPPORTED_AUDIO_EXTS
    ]
    photo_files = sorted([
        p for p in input_dir.iterdir()
        if p.suffix.lower() in SUPPORTED_PHOTO_EXTS
    ])
    audio = audio_files[0] if audio_files else None
    return audio, photo_files


def main() -> None:
    parser = argparse.ArgumentParser(description="Field reporting pipeline prototype")
    parser.add_argument("input_dir", type=Path, help="Folder with site.json + audio + photos")
    parser.add_argument("--output-dir", type=Path, default=Path("output"))
    parser.add_argument("--skip-transcribe", action="store_true",
                        help="Use existing memo.txt instead of re-running whisper")
    args = parser.parse_args()

    input_dir: Path = args.input_dir
    if not input_dir.is_dir():
        print(f"ERROR: {input_dir} is not a directory")
        sys.exit(1)

    args.output_dir.mkdir(parents=True, exist_ok=True)

    metadata = load_metadata(input_dir)
    audio_path, photo_paths = discover_inputs(input_dir)

    print(f"\nRunning pipeline for: {metadata.project_name}")
    print(f"  Date: {metadata.visit_date}")
    print(f"  Audio: {audio_path.name if audio_path else '(none)'}")
    print(f"  Photos: {len(photo_paths)}\n")

    # Stage 1
    transcript_cache = input_dir / "memo.txt"
    if args.skip_transcribe and transcript_cache.exists():
        print(f"[1/4] Using cached transcript at {transcript_cache.name}")
        transcript = transcript_cache.read_text().strip()
    elif audio_path:
        transcript = transcribe_audio(audio_path)
        transcript_cache.write_text(transcript)
    else:
        print("[1/4] No audio file — skipping transcription")
        transcript = ""

    # Stages 2 & 3 require the API
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("\nERROR: ANTHROPIC_API_KEY environment variable not set.")
        sys.exit(1)
    client = anthropic.Anthropic(api_key=api_key)

    photo_analyses = analyze_photos(client, photo_paths, metadata) if photo_paths else []
    sections = synthesize_report(client, metadata, transcript, photo_analyses)

    # Save intermediate JSON for inspection
    out_stem = f"{input_dir.name}_{metadata.visit_date}"
    json_out = args.output_dir / f"{out_stem}.json"
    json_out.write_text(json.dumps({
        "metadata": metadata.__dict__,
        "transcript": transcript,
        "photos": [p.__dict__ for p in photo_analyses],
        "sections": sections.__dict__,
    }, indent=2))

    # Stage 4
    pdf_out = args.output_dir / f"{out_stem}.pdf"
    render_pdf(pdf_out, metadata, sections, photo_analyses, input_dir)

    # Cleanup temp images embedded in PDF
    for p in input_dir.glob("_pdf_*.jpg"):
        p.unlink()

    print(f"\nDone.")
    print(f"  PDF: {pdf_out}")
    print(f"  JSON: {json_out}")


if __name__ == "__main__":
    main()