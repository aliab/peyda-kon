# پیدا کن! (Find it!)

A tap-the-matching-picture game for toddlers. Installable PWA, works offline, no dependencies or build step.

## Run
```
cd peyda-kon && python3 -m http.server 8080
```
Open `http://<your-computer-ip>:8080` on the phone. Installing and the service worker need HTTPS (or localhost), so deploy to any static host (Cloudflare Pages, Netlify, GitHub Pages) and use "Add to Home Screen".

## Gameplay
- A target picture is shown on the card, and the child taps the same picture in the scene.
- Right: a "dling" chime, a star burst, and a star flying into the progress bar. Wrong: a cartoon "boing" and a wobble.
- After 2 wrong taps, or about 11 s of no taps, the right item glows as a hint.
- 5 stars complete a level: crowd applause, cheers, and confetti, then a character runs across and wipes in the next level.
- Difficulty: 4 items on level 1, one more per level up to 12. Numbers join the mix from level 3.

## Notes
- All sounds and music are synthesised with Web Audio in `js/audio.js`, so there are no audio files.
- When you change any file, bump `CACHE` in `sw.js` so installed copies update.
- The level is saved in `localStorage` (`pk-level`). To reset: `localStorage.removeItem('pk-level')`.
