# Tenerife Taxi Quest: track contract

Static HTML5 mobile game, plain `<script>` tags only (no modules, no fetch, no build step) so it works from `file://` and any static host. Portrait, logical canvas 180x320 scaled by an integer factor (image-rendering: pixelated), CRT overlay (scanlines, vignette, slight curvature) done in CSS.

## Folder layout (all under `game/`)
- `index.html`, `style.css`, `game.js`, `config.js`  -> ENGINE track
- `audio.js`                                          -> AUDIO track
- `assets/img/*.png`                                  -> ART track (may be missing while building; engine MUST fall back to code-drawn placeholders of the same size)
- `CONTRACT.md` this file

## Scene ids (shared by engine + audio)
`title`, `taxiA`, `taxiB`, `checkin`, `gate`, `plane`, `arrival`, `ending`

Flow: title -> taxiA (pick up family 1 at house A, drive to Oulu airport) -> taxiB (different taxi, pick up family 2 at house B, drive to airport) -> checkin (walk to counter, drop bags, get boarding passes) -> gate (walk to gate, board) -> plane (find seats, order a drink; blueberry juice "Mustikkamehu" is among the choices; show route Oulu > Helsinki > Madrid > Tenerife North as a little progress map) -> arrival (land, walk out, cold grey Finnish autumn palette fades into sunny warm palette) -> ending (happy feelgood screen, "THE TRIP BEGINS", confetti, credits).

## Audio API (audio.js defines global `GameAudio`; 100% WebAudio synthesis, no files)
- `GameAudio.unlock()`  call on first user gesture (creates/resumes AudioContext)
- `GameAudio.music(sceneId | null)`  crossfade (~1s) to that scene's lofi/chiptune loop; null = silence. Different tune per scene id, all chill lofi-chiptune, 70-95 bpm, warmer/brighter as the trip goes on; `ending` is the happiest.
- `GameAudio.sfx(name)` names: `tap select confirm back dialog_open honk engine_start engine_loop_start engine_loop_stop door pickup bump coin bag_drop stamp boarding_chime plane_takeoff plane_land ding pour sip cheer fanfare step`
- `GameAudio.speak(voiceId, text)`  plays pseudo talking blips for the text (one blip per ~2 letters, pitch contour per voiceId, punctuation pauses); returns duration in ms so the engine can sync typewriter text.
  voiceIds: `narrator driver clerk attendant a_adult1 a_adult2 a_kid1 a_kid2 b_adult1 b_adult2 b_kid1 b_kid2`
- `GameAudio.setMuted(bool)`, `GameAudio.isMuted()`
- Must never throw if called before unlock; queue or ignore.

## Image assets (ART track delivers; names fixed; all PNG, pixel art look, transparent bg for sprites)
Backgrounds, 180x320: `bg_title bg_checkin bg_gate bg_plane bg_arrival bg_ending`
Driving-map sprites: `taxi_a.png taxi_b.png` (24x40, top-down 3/4 view, taxi roof sign), `house_a.png` (pale grey 2-storey wooden house, dark blue roof, birch tree beside), `house_b.png` (small red-roofed house among pines, gravel yard), `airport_building.png` (Oulu airport terminal, 96x64), `tree_pine.png tree_birch.png tree_palm.png` (16x24), `snow_tile.png grass_tile.png road_tile.png` (16x16 seamless).
Characters, 24x36 front sprite each + `portrait_<id>.png` 48x48 for dialogue: ids `a_adult1 a_adult2 a_kid1 a_kid2 b_adult1 b_adult2 b_kid1 b_kid2 driver clerk attendant`.
Props: `suitcase.png` (16x16), `boarding_pass.png`, `juice.png` (blueberry juice glass/carton 16x16), `plane_side.png` (64x24), `sun.png` (32x32).

## Config (engine, `config.js`, global `GAME_CONFIG`)
`names`: object mapping the 8 passenger ids to display names (defaults "Mum A", "Dad A", "Kid A1"... editable by the user), plus `language: "fi"` (all in-game text is Finnish, kept in config.js `STORY`). All story text lives in one `STORY` object so it is easy to edit.

## Constraints
No fail state, no timers that punish; ages 6+. Big touch targets (>=44 CSS px), one-thumb play, tap-to-drive or virtual joystick. Whole game 8-12 minutes. Keyboard (arrows / WASD, space) also works for desktop testing. Text short, readable, bitmap-style font (use `Press Start 2P` from Google Fonts with a monospace fallback; also a canvas-drawn fallback is fine).
