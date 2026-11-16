# Pawnisher : Checkmate — Release-readiness audit (2026-11-16)

Read-only audit of `/home/user/pawnisher_checkmate`, judged against the code that actually ships.
Main game = `index.html` → `src/slice/main.ts`. Nothing in the repo was edited. The build went to the scratchpad. `npm run build` was not run because it regenerates the tracked `src/data/preload-list.ts`.

## 0. What I ran

| Check | Result |
|---|---|
| `npm test` (vitest) | **PASS**: 60 files, 468 tests, 13.8 s |
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npx vite build --outDir <scratch>/dist` | **PASS** in 6 s. `main.js` 739 KB (329 KB gz) · `BoardRenderer.js` (Phaser) 1.35 MB (376 KB gz) · `main.css` 448 KB (167 KB gz) · `legacy.js` 120 KB · fonts about 2.0 MB woff2 · whole dist **23 MB** |
| Static asset refs (658 literal `ui/ scenes/ pieces/ fx/ guide/*.png` strings in slice/view/data/css/index.html) | **0 missing** in `public/` |
| `public/` | 819 PNGs, 18 MB (scenes 14 MB). Decoded RGBA ≈ 72 MB total. Largest file `scenes/act-0.png` is 529 KB |
| Real-device / 915×412 screen run | **NOT DONE (UNVERIFIED)**. No screenshots were taken in this audit |

## 1. Gap table (sorted by severity)

| # | Sev | Area | Gap | Evidence | Suggested fix | Who |
|---|---|---|---|---|---|---|
| 1 | **BLOCKER** | Settings | **The main game has no settings screen at all.** You cannot mute sound, change volume, reset data, see credits or licences, or see the version. The sound and music toggles exist only in the legacy 2.0 HUD | Title menu `src/slice/main.ts:4686-4692` offers only 본편/도전/이어하기/오늘의 도전/안내서/도감/프롤로그. `setSfx`/`setMusic` are called only from `src/ui/hud.ts:326-340` (legacy). In-battle UI has only `?` help (`index.html:41`, `main.ts:3810`) | Add a 설정 window (uikit `openWin`): SFX volume, music volume, reduced motion (override the OS setting), text-size step, data reset (double confirm), credits/licences, version, privacy link. Reach it from the title menu and from an in-battle pause button | Dev |
| 2 | **BLOCKER** | Audio | **No music plays in the main game.** `src/audio/music.ts` (6 WebAudio chiptune tracks, D-123) is imported only by legacy `src/ui/runUi.ts` and `src/ui/hud.ts`. SFX are procedural WebAudio beeps (`src/audio/sfx.ts:1-4`), with 86 `sfx()` calls in `main.ts`. There are no audio asset files | `grep "audio/music" src` → only `src/ui/*` | Short term: wire `music.ts` into slice scenes (title, map, battle, boss, ending). For a commercial release: commission or buy real music and SFX, then add a small audio manager with volume buses and suspend on `visibilitychange` | **User** (assets, budget) + Dev (wiring) |
| 3 | **BLOCKER** (Play) | Legal/store | **No privacy policy anywhere** (no file in docs, no in-game link). Play Console requires a privacy-policy URL and a Data safety form. The game stores telemetry locally (`src/slice/telemetry.ts`, up to 4000 events) | `grep -ril privacy docs` → nothing | Write a short policy ("no data leaves the device; local play logs only") and host it on the studio page. Link it in settings and the store listing | **User** (legal text, hosting, Play account) |
| 4 | **BLOCKER** (polish) | Android | **The splash screen is still the Capacitor default** (white background, blue cross logo) | `android/app/src/main/res/drawable*/splash.png` (viewed `drawable-land-hdpi/splash.png`). `values/styles.xml` uses `@drawable/splash` | Make a dark (#16141C) splash with the title-logo pixel art. Use `@capacitor/assets` or replace the drawables and set `windowSplashScreenBackground`/icon for Android 12+ | Dev (can reuse `ui/title-logo.png`) |
| 5 | HIGH | Legal | **Licence texts are not shipped.** Galmuri is OFL 1.1, which requires the licence and copyright notice to travel with the font. The woff2 files are bundled into the APK and EXE, but `ofl.md` is not. Phaser's MIT notice is stripped from the bundle (0 `@license` hits in `BoardRenderer.js`). game-icons.net (CC BY 3.0) attribution exists only on an external website, by user decision D-286 (`docs/CREDITS.md:1`, `src/data/credits.ts:2-9`) | see left | Add an in-app "Licences" page under settings that shows the `docs/CREDITS.md` content plus the OFL, MIT and CC-BY texts. This does not change the two-line credits roll. Optionally add `vite-plugin-license` / `rollup-plugin-license` | **User** decision (D-286 conflict), then Dev |
| 6 | HIGH | Steam | **Steam integration is not functional.** `steamworks.js` is not in `package.json` or `node_modules`, so `require` fails and `steam=null` (`electron/main.cjs:11-18`). The app id comes only from the `STEAM_APP_ID` env var, which is not set when launched from Steam. The native module would need `asarUnpack`. `unlockAchievement` is called **only from legacy** `src/ui/runUi.ts:689,995`, so the main game never unlocks anything. There is no overlay enablement and no Steam Cloud | see left | Add the `steamworks.js` dependency, a `steam_appid.txt` / hardcoded app id, `asarUnpack`, `electronEnableSteamOverlay()`, and achievement calls from slice events (crown clear, true ending, challenge levels, daily) | **User** (Steamworks account, app id, achievement list) + Dev |
| 7 | HIGH | Stability | **No global error handler or crash reporting.** Only battle animations are wrapped (`guarded()`, `src/slice/main.ts:1719-1731`). An exception on the map, event, shop, reward or cutscene screens has no recovery path. Window `error` / `unhandledrejection` listeners are absent | `grep unhandledrejection src` → none | Add `window.onerror` and `unhandledrejection` handlers that log to telemetry, show a "문제가 생겼습니다 — 지도로 돌아갑니다" window, and offer a return to title using the last save. Consider Sentry or Crashlytics after the privacy decision | Dev (+User if remote reporting) |
| 8 | HIGH | Save | **Corruption means silent total progress loss.** `readMeta` catches a JSON parse failure and returns `emptyMeta()` (`src/slice/save.ts:168-185`). The next `writeMeta` then overwrites the damaged meta, so all crowns, unlocks and records are gone. There is one slot and no backup key. `readSave` drops any save with `v !== 2` (`save.ts:160`), so the next schema bump silently deletes in-progress runs. There is no migration step. Writes fail silently when the quota is full (`safe()`), and telemetry shares the same quota (`telemetry.ts:47-55`) | see left | Write to `key` and `key.bak` (alternate or rotate), and on parse failure fall back to `.bak`. Add `migrate(v)` functions for RunSave and Meta. Cap or trim telemetry before save writes, and drop telemetry first when the quota is hit. Show a toast when a save write fails | Dev |
| 9 | HIGH | Platform PC | **No keyboard shortcuts or gamepad support.** The only key handler is Escape in uikit windows (`src/slice/uikit.ts:108,142`). There is no end-turn, rewind, card-select or confirm hotkey, and no `getGamepads`. Steam Deck "Verified" needs controller navigation | `grep keydown src/slice` | Add a keymap (1-9 cards, Space/Enter end turn, Z/Backspace rewind, Esc menu, arrows to move a board cursor), then gamepad mapping through the same actions. Rebinding is optional | Dev |
| 10 | HIGH | Electron | **The default Electron menu is still active** (no `Menu.setApplicationMenu(null)`; `autoHideMenuBar` only hides it), so Ctrl+R reload, Ctrl+Shift+I DevTools and Alt-menu stay reachable. There is no single-instance lock, so two instances can share localStorage LevelDB. There is no in-game Quit (needed on Steam Deck and in fullscreen). There is no fullscreen toggle in the game; `win.maximize()` only maximises the window (F11 exists only through the default menu) | `electron/main.cjs:29-80` | Set the menu to null, add `requestSingleInstanceLock`, expose `quit` and `toggleFullscreen` via preload, and add 전체 화면 and 끝내기 to settings | Dev |
| 11 | HIGH | Localization | **Korean only, no i18n layer.** About 1,788 Korean string literals sit in `src/slice` versus about 2,326 in `src/data` (≈43 % hardcoded in UI code). `src/data/josa.ts` builds Korean particles. There is no locale switch | count via grep (comments excluded, rough) | If a global Steam launch is wanted: move slice strings to `src/data/` tables keyed by id, add a locale loader, then translate (EN first). If the launch is Korean-only, state it on the store page | **User** (market decision, translation) + Dev |
| 12 | MEDIUM | Version | **Versions disagree.** `src/data/version.ts:2` says `'1.0.0'` (used only by legacy), `package.json` says `1.2.0`, Android `versionName` defaults to `1.2.0-beta` and `versionCode` defaults to run number or 5 (`android/app/build.gradle:11-12`). The main game shows no version | see left | Single source: read `package.json` version via Vite `define`, show it in settings, and pass it to Gradle in CI | Dev |
| 13 | MEDIUM | Save/Platform | **Quitting mid-battle restarts the battle.** The save happens only at battle start, map and reward (`save.ts:13-15`, D-488). On mobile an OS kill during a long boss fight loses all turns. The Android back button's "press twice to exit" in battle (`main.ts:986-1000`) exits with no save | see left | Optionally snapshot `b` (battle state is JSON-serialisable, `b.snap` already exists) on `visibilitychange: hidden`, and resume from it | Dev (design OK from User) |
| 14 | MEDIUM | Save | **No cloud save.** Android has `allowBackup="true"` (`AndroidManifest.xml:5`); whether WebView localStorage is included in Auto Backup is UNVERIFIED. Electron keeps saves in Chromium LevelDB under userData, which Steam Cloud cannot sync | — | For Steam: mirror saves to a JSON file in userData through IPC and register it for Steam Auto-Cloud. For Android: Play Games saved games (optional) | Dev + **User** (Steam Cloud config) |
| 15 | MEDIUM | Android icon | **Adaptive icon foreground is a full-bleed square with the wordmark.** It covers about 78 % of the canvas versus the 61 % safe zone, so circle and squircle masks clip "PAWNISHER CHECKMATE". It is also a smooth-shaded logo, not pixel art (D-216) | `mipmap-xxxhdpi/ic_launcher_foreground.png` (viewed) | Re-export the foreground with the mark only, inside the 66/108 safe zone, with a dark background colour. Use a monochrome layer for Android 13 themed icons | **User** (art) / Dev (re-cut) |
| 16 | MEDIUM | Accessibility | **No in-game text size, reduced-motion or colorblind options.** Reduced motion follows only the OS `prefers-reduced-motion` (`main.ts:31,1630,2472`). Text is fixed px (12/15) with pixel fonts at 915×412 | — | Text-size step (×1 / ×1.25 using the 12→15/24 scale), an in-game motion toggle that feeds the same `calm` flags, and optional high-contrast threat colours | Dev |
| 17 | MEDIUM | Performance | **Telemetry is always on** and `JSON.stringify`s the whole list (up to 4000 events) to localStorage on **every** `track()` call (`telemetry.ts:47-55`). That is a main-thread hitch and a quota risk (#8) | see left | Batch writes (debounce to idle or `visibilitychange`), lower the cap to about 500 in release builds, or disable it outside playtest builds | Dev |
| 18 | MEDIUM | Performance | Per-frame work. `BoardRenderer.update` clears and redraws two Graphics and allocates `new PixelPen` every frame (`src/view/BoardRenderer.ts:421-427`); the idle cap is 30 fps (`src/data/fx.ts:132`). `boardfx.sim` calls `matchMedia()` every 1/60 s substep on boss boards (`src/view/boardfx.ts:78-82`). A whole-body `MutationObserver` runs `querySelectorAll` on every DOM change (`main.ts:2987`). Battery impact is UNVERIFIED (no profiling) | see left | Cache the `PixelPen` and the reduced-motion flag, skip redraws when there is no anim, and scope the observer to overlay roots | Dev |
| 19 | MEDIUM | Balance | Per CLAUDE.md (D-080), no difficulty or win-rate tuning is done until the core fun is complete. So **there has been no release balance pass** on the renewed main game (the last release balance report covers 1.0 / 2.0 legacy) | `CLAUDE.md` quality gate, `docs/RELEASE-1.0.0.md` | Once content is frozen, run `/balance-check` (`npm run climb`) across the four crowns and challenge levels, then do human playtests | Dev + **User** (playtest) |
| 20 | MEDIUM | Content | Four crowns and endings exist in data (`src/data/campaign.ts:8-13`, `EndingKind = throne/depart/challenge/daily`). Progression rules are unit-tested (`tests/campaign.test.ts`: true-ending unlock, chapter order, challenge unlock). **A full playthrough of all four crowns to each ending was not verified in this audit (UNVERIFIED).** QA scripts exist (`tools/qa/endings.cjs`, `campaign-flow.cjs`, `fullrun.cjs`) but their output is git-ignored | — | Run `tools/qa/endings.cjs` and `fullrun.cjs` on the release candidate and keep the evidence | Dev |
| 21 | MEDIUM | Steam/PC | Windows builds are unsigned (`CSC_IDENTITY_AUTO_DISCOVERY: 'false'`, `.github/workflows/build.yml:111`). The Mac `dmg` is unsigned and not notarized, so Gatekeeper will block it. Steam needs an unpacked `dir` target for depots, not NSIS | `package.json` build block | Add a `dir` target for the Steam depot. Sign or notarize only if you distribute outside Steam | **User** (certs, Apple account) |
| 22 | LOW | Onboarding | Present and skippable. First run: prologue (skippable `cut-skip`, `src/slice/opening.ts:47,57`), then three drill boards with the adjutant tutorial (skip needs a double tap, `src/data/tutorial.ts:9-11`, `main.ts:4425`). The first run is softened (`first` = act-1 boss HP −35 %, `save.ts:57`), and the start-set pick is hidden until the tutorial is done (`main.ts:4578`). No gap found in code. The difficulty ramp feel is UNVERIFIED without play | — | — | — |
| 23 | LOW | Placeholders | No user-facing TODO, FIXME or lorem text in `src/slice`. The board "임시" chip for missing 2×2 boss art (`src/view/BoardRenderer.ts:756-768`, `src/data/giants.ts:52-54`) is now dormant, because all seven bosses × 2 phases exist in `public/pieces/s|l-boss-*`. Open or re-order art items remain in `docs/asset-order-master.md` (WG-01 re-order; the header still says GB-06/07 remain, but the files exist, so the doc is stale) | see left | Remove the temp-chip code path, or keep it as a fallback. Update the order doc header | Dev / **User** (art) |
| 24 | LOW | Build hygiene | The release build ships `legacy.html` and the 2.0 code (`vite.config.ts:10`). The `?debug` URL exposes `window.sliceApi` cheats (gold, win, act jump) in production web builds (`main.ts:4764`). `Galmuri7.woff2` (316 KB) is declared in `src/fonts.css` but never used | see left | Add a release flag that drops the legacy input and the debug API, and remove Galmuri7 | Dev |
| 25 | LOW | Load time | `warmup` pre-decodes **all** 815 public PNGs before the title, with a 9 s cap (`src/slice/warmup.ts:23-40`). That is fine offline in APK and EXE, but slow for web | — | Preload title, map and act-1 only, and lazy-load later acts and endings | Dev |
| 26 | LOW | Android | Platform basics are present and good. Back button goes through `window.__hwBack` with close-window or press-twice-to-exit (`MainActivity.java:17-26`, `main.ts:986`). Landscape is locked (`sensorLandscape`), the game is immersive fullscreen, safe-area insets are used (`src/slice/kit.css:13-14`, `slice.css:487,509`), and there is a portrait rotate notice (`index.html:47`). The `INTERNET` permission is unneeded (no network calls; `grep fetch` → none) | see left | Remove `INTERNET` if nothing needs it (simplifies Data safety) | Dev |
| 27 | LOW | Colorblind | Factions use brightness (white/black pieces), and threats use colour plus icons (CLAUDE.md UI rule 4, `BoardRenderer.ts:285`). There is no dedicated mode | — | Optional deuteranopia check on HP bars and the rarity colours | Dev |

## 2. Area notes

### 2.1 First run / onboarding
Flow: title tap → `firstRun()` → prologue → `begin()` → `DRILLS[0]` + `onboarding()` (`main.ts:4659-4664, 4576-4592`). The tutorial is skippable (double-tap 건너뛴다). The guide book stays reachable from the menu and from `?`. Gap: none in code. The feel of the ramp needs a human playtest (UNVERIFIED).

### 2.2 Settings
There is no settings screen in the main game (see #1). Present only in legacy: sfx and music on/off. There is no volume slider anywhere; the music volume is the constant `MUSIC_VOLUME` and SFX master gain is 0.5. Missing: language, text size, reduced motion (OS only), key rebinding, fullscreen/resolution (Electron zoom is automatic in `electron/main.cjs:44-50`), data reset, credits/licences screen (the credits roll exists only at run end, `src/slice/credits.ts`), privacy.

### 2.3 Audio
SFX: procedural WebAudio sfxr-style sounds, 18 kinds, on by default, stored in localStorage `pawnisher.sfx`. Music: a WebAudio chiptune sequencer that the slice game never calls. There are no audio files. Phaser sound is unused.

### 2.4 Save / load
localStorage keys `pawnisher.slice.save` and `pawnisher.slice.meta` (`save.ts:129-130`). If storage is unavailable, an in-memory store is used. Validation on read exists for the RunSave shape. Meta has a `campaignVersion` reset path for old 13-step data (a migration only for that one case). Resume points are map, battle start and reward (D-488). No backup, no generic migration, no cloud. See #8, #13, #14.

### 2.5 Platform
- Android: back button OK, landscape lock OK, immersive OK, safe-area OK. There is no pause-on-background for the game state, but turn-based play needs none. Music suspends on `visibilitychange` in the legacy module only. Splash is the default (#4).
- Electron: one window, 1600×900, min 960×540, auto zoom, smoke test in CI (good). Problems in #10.
- Steam: see #6. Keyboard and gamepad: see #9.

### 2.6 Content completeness
Asset references resolve (0 missing). All 7 boss 2×2 sprites and their p2 variants are present. Boss-fall scenes are present for 6 rules, and gilded uses its own path. Ending scenes `end-*` and `ending-*` are present. A full playthrough was not executed (UNVERIFIED).

### 2.7 Stability
Tests and typecheck pass. There is no global error trap (#7). Two `console.*` calls remain in slice, both intentional (`uikit.ts:117` window-height warning, `main.ts:1724`). The runtime console was not observed (UNVERIFIED).

### 2.8 Performance
JS ≈ 2.2 MB raw / about 750 KB gz including Phaser. CSS 448 KB (large; one data-URI). Fonts 2 MB. Images 18 MB. Notes in #17, #18, #25. No FPS or battery profiling was done (UNVERIFIED).

### 2.9 Legal / store
Package id `io.github.graviton94.pawnisher` (Capacitor, Gradle, electron-builder `appId`). Before Play release, check that the id uses a domain you control. App icon: custom (`build-res/icon.png`, Android mipmaps). Splash: default. AAB signing pipeline exists (`build.yml:185-226`, `android/keystore/upload.jks.gpg`). CREDITS: external only. Privacy policy: none. Store disclosure: scene and portrait art were made with an image generator (docs mention AI generation, `docs/art-assets.md:84`). Steam requires an AI-content disclosure on the store page (needs the user).

### 2.10 Accessibility & localization
`aria-label`s are present on key controls. Some focus styles exist (5 `:focus` rules in slice CSS). Korean only. Hardcoded string ratio as in #11.

## 3. Split: user-required vs developer-only

**Needs the user (assets, accounts, legal, decisions):**
- Music and SFX direction or commission (#2)
- Privacy policy text and hosting, Play Console Data safety (#3)
- Licence display in-game vs D-286 (#5)
- Steamworks app id, achievement list, Cloud config, AI-content disclosure (#6, #14, §2.9)
- Market and language decision, translation (#11)
- Code-signing certs or Apple account (#21)
- Icon re-art (#15)
- Playtests for balance and ramp (#19, #22)
- Package-id domain confirmation (§2.9)

**A developer can do alone:**
- Settings screen and in-battle menu (#1)
- Wire the existing chiptune music (#2, wiring only)
- Splash from existing logo (#4)
- Licences page plumbing (#5)
- Steam code hooks (#6)
- Global error handler (#7)
- Save backup and migration (#8)
- Keyboard and gamepad (#9)
- Electron menu, single-instance, quit, fullscreen (#10)
- Version unification (#12)
- Mid-battle snapshot (#13)
- File-mirror save (#14)
- Accessibility toggles (#16)
- Telemetry batching (#17)
- Per-frame cleanups (#18)
- QA endings run (#20)
- Release build flags, remove legacy, debug and Galmuri7 (#24)
- Lazy preload (#25)
- Remove the INTERNET permission (#26)
