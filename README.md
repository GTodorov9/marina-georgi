# WeddingSite

Mobile-first digital wedding invitation. Static HTML/CSS/JS, no build step.

## Run locally
    python3 -m http.server 5180    # then open http://localhost:5180

## Structure
- `index.html`, `styles.css`, `main.js` — the page
- `config.js` — names, initials, date, optional music (edit this per couple)
- `assets/` — generated art: paper (Burgas sea + Vitosha + Sofia + IT motifs), wax seal (mountain/sea wreath), `seal-lines.webp` (glow layer)
- `assets/alt/` — unused variants: `tropical/` set, `paper-landscape-c.webp` (phase-2 candidate), other papers/seals
- `tools/seal_lines.py` — extracts the engraving ridges of a seal for the light-up glow
- After replacing an asset, bump the `?v=` query in styles.css / index.html / main.js
- `tools/cutout_seal.py` — removes the white background from a generated seal

## Phases
1. ✅ Envelope: embossed paper, gold wax seal М&Г; tap → light rises through the seal, washes it cream, seams glow, flap lifts away with the seal, light pours out, dissolve to cream with sparkles
2. Illustrated hero / letter expands full screen (parallax)
3. Scratch-to-reveal date, venue, RSVP

## Assets
Generated with Gemini (`gemini-3-pro-image`) via the AIContent cloud routine
(branch `oneoff/wedding-assets`, script `WeddingSite/oneoff/gen_envelope_assets.sh`).
