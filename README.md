# WeddingSite

Mobile-first digital wedding invitation. Static HTML/CSS/JS, no build step.

## Run locally
    python3 -m http.server 5180    # then open http://localhost:5180

## Structure
- `index.html`, `styles.css`, `main.js` — the page
- `config.js` — names, initials, date, optional music (edit this per couple)
- `assets/` — generated art (paper texture, wax seal); `assets/alt/` holds unused variants
- `tools/cutout_seal.py` — removes the white background from a generated seal

## Phases
1. ✅ Envelope: embossed paper, gold wax seal with initials, tap → seal pops, flap flips open in 3D, golden light, letter rises
2. Illustrated hero / letter expands full screen (parallax)
3. Scratch-to-reveal date, venue, RSVP

## Assets
Generated with Gemini (`gemini-3-pro-image`) via the AIContent cloud routine
(branch `oneoff/wedding-assets`, script `WeddingSite/oneoff/gen_envelope_assets.sh`).
