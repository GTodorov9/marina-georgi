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
1. ✅ Envelope: embossed paper, gold wax seal М&Г; tap → light rises through the seal, washes it cream, seams glow, flap lifts away with the seal, the painting's sky shows through the V, the pocket slides away
2. ✅ Hero painting (Sofia meets Burgas) with names / Сватбен ден / Запазете датата; 'Денят настъпи!' section
3. ✅ Scratch-to-reveal date: ДЕН / МЕСЕЦ / ГОДИНА circles (canvas), 05 · Юни · 2027
4. Venue, RSVP

## Assets
Generated with Gemini (`gemini-3-pro-image`) via the AIContent cloud routine
(branch `oneoff/wedding-assets`, script `WeddingSite/oneoff/gen_envelope_assets.sh`).

## Cache busting
After changing styles.css / main.js / config.js, bump the `?v=` on their tags in index.html (phones cache them hard).
