# پیدا کن! (Find it!)

A tap-the-matching-picture game for toddlers. Installable PWA, works offline, no dependencies or build step.

## Run
```
cd peyda-kon/public && python3 -m http.server 8080
```
Open `http://<your-computer-ip>:8080` on the phone. Installing and offline play need HTTPS.

## Live
https://peyda-kon.aliab.workers.dev, served by Cloudflare Workers static assets from `public/`.

## Release
Push a version tag to deploy:
```
git tag v1.0.1 && git push origin v1.0.1
```
`.github/workflows/release.yml` then:
1. Sets the service worker cache name to the tag, so installed copies update.
2. Deploys `public/` to Cloudflare with `wrangler deploy`.
3. Creates a GitHub release with auto-generated notes.

Required repo secrets: `CLOUDFLARE_API_TOKEN` (an "Edit Cloudflare Workers" token) and `CLOUDFLARE_ACCOUNT_ID`.

## Gameplay
- A target picture is shown on the card, and the child taps the same picture in the scene.
- Right: a "dling" chime, a star burst, and a star flying into the progress bar. Wrong: a cartoon "boing" and a wobble.
- After 2 wrong taps, or about 11 s of no taps, the right item glows as a hint.
- 5 stars complete a level: crowd applause, cheers, and confetti, then a character runs across and wipes in the next level.
- Difficulty: 4 items on level 1, one more per level up to 12. Numbers join the mix from level 3.

## Notes
- All sounds and music are synthesised with Web Audio in `js/audio.js`, so there are no audio files.
- Releases bump the service worker cache name automatically. For a manual `npx wrangler deploy`, bump `CACHE` in `public/sw.js` yourself.
- The level is saved in `localStorage` (`pk-level`). To reset: `localStorage.removeItem('pk-level')`.
