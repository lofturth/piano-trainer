# webapp-starter

A clean, minimal starter template for React, TypeScript, and Vite projects.

## Five-finger controller (local Wi-Fi)

Use Node.js 22.12+ and run `npm ci`. Start these in separate terminals:

```bash
npm run relay
npm run dev:lan
```

Open `http://localhost:5173/trainer` on the Mac and
`http://<Mac-LAN-IP>:5173/controller` in iPhone Safari. Use the actual port
printed by Vite if 5173 is occupied. Both devices must be on a reachable local
network; allow the Mac firewall and any browser local-network permission prompts.
The relay listens on port 8765; stop the two-iphones relay if it uses that port.
The original starter remains at `/`.

Index is bit 0, Middle bit 1, Ring bit 2, Pinky bit 3. The binary display is
Pinky/Ring/Middle/Index, so Index alone is `0001`. Each state transition sends
`{type:"fingers", state:0..15, thumb:boolean, seq, t}` immediately; `t` is the pointer event's
monotonic timestamp in milliseconds. Each new connection starts at sequence 0
with an all-released snapshot (`state:0, thumb:false`). Thumb is independent of
the unchanged four pitch bits: thumb-only transitions also increment sequence.
The relay accepts older messages without thumb as `false`. Phone timestamps are
not Mac wall-clock times.
Touches stay assigned to their original region until release or cancellation,
even when dragged across a boundary. Multiple touches in one region hold that
bit until the last touch releases.

The controller's colored playing surface fills the available viewport, including
safe-area backgrounds. Status and Calibrate float above it without reserving a
toolbar row; only the bottom-left gear (Calibrate) intercepts touches. The compact
gear/status/state overlay sits above the Home indicator's safe-area inset. Controls and labels remain
inside safe areas, while regions extend beneath iOS system overlays. The notch,
status bar and Home indicator remain controlled by iOS; edge gestures can cancel
touches. On first use, touch and lift Thumb, Index, Middle, Ring,
then Pinky at comfortable positions. The thumb gets a compact circular region
at its natural position, at most 72 CSS pixels in radius and smaller near other
centers or on narrow screens. The four pitch fingers retain generous nearest-center
regions outside that circle. Calibrate restarts this
flow and safely releases held fingers; calibration touches do not send presses.
Centers are saved in localStorage as normalized positions and survive refreshes
on the same browser origin. Five-finger calibration uses a new storage key;
older four-finger calibration requires one new calibration, not a guessed thumb
position. Changed IP/port, private browsing, or cleared site
data can require calibration again. If storage is unavailable, calibration still
works for the current page. Resizing releases held fingers and recomputes the
regions; recalibrate after rotating if the hand position is no longer comfortable.

In Safari, use Share → Add to Home Screen, then launch that icon for standalone
use without Safari's address/tool bars. Normal Safari remains supported; its
browser chrome and system edge gestures are controlled by iOS. There is no
fullscreen API dependency, service worker, or offline support. Refresh manually
after code edits; development HMR/live reload remains disabled.

The surface uses fixed viewport edges rather than an explicit `100dvh` height;
there is no bottom padding or guessed pixel-height extension. Its ResizeObserver
and touch hit testing use the same surface rectangle, keeping calibration and
SVG regions aligned. Installed iOS apps have known viewport-size regressions
([WebKit 254868](https://bugs.webkit.org/show_bug.cgi?id=254868)) and can also
have system-owned strips outside the web layer
([WebKit 301994](https://bugs.webkit.org/show_bug.cgi?id=301994)). A screenshot
alone cannot distinguish these causes. If a strip remains after updating, compare
the surface's `getBoundingClientRect().bottom` to `window.innerHeight` in Safari's
remote inspector. Content cannot reclaim pixels outside the actual web viewport.
Close and reopen the Home Screen app to load the new layout and background.

One controller is accepted at a time. Controller heartbeats run every second;
the relay invalidates its state after four seconds without a message. Trainer
clients also clear their display and reconnect if relay messages stop. Hidden
pages disconnect; pointer cancellation, lost capture, or window blur release
touches. Lift and re-touch after reconnecting. Interruptions invalidate held
state rather than synthesizing timestamped finger events or replaying presses.
The trainer shows the latest event only; no event history is persisted.

This is an unauthenticated, unencrypted trusted-LAN prototype, not a public
service. HTTPS-hosted pages cannot use this plain `ws://` relay. Cloudflare
deployment does not deploy the Node relay. Actual iPhone testing is still needed
for five simultaneous touches, thumb comfort, Safari gestures, screen lock/backgrounding,
Wi-Fi loss, reconnection, and firewall/local-network permissions.

## Getting Started

### MIDI output on the Mac

The `/trainer` page has Trainer and Playing View buttons. Set up MIDI in Trainer,
then switch to Playing View for a large last-played note, a chronological history
of the last 20 notes (including repeats), and the current major-scale fingering
reference. Filled 1 means pressed; outlined 0 means released, in Index/Middle/Ring/Pinky
order. Switching views keeps MIDI controls mounted and does not stop playback.
The compact laptop layout places the last note beside the live fingers, followed
by a single-row 20-note history and seven-card Candidate 1 reference. Narrow
windows wrap the history and reference instead of hiding content.
Playing View also shows live Index/Middle/Ring/Pinky activity from raw bits 0–3
and highlights the reference fingering matching the current combination. These
are visual only: partial releases can change the live fingering/reference while
the sounding and last-played note stay unchanged. Thumb does not affect these
four indicators or the reference highlight.

Playing View records only successfully submitted MIDI Note On messages, not raw
finger changes; no output means no history entries. Note Off, unmapped presses,
partial releases and thumb-only events do not add entries or erase the last note.
History lasts for the current page session and is cleared by a browser refresh.

Open `/trainer` using `http://localhost:5173` in a Web MIDI-capable browser
(for example Chrome). Web MIDI requires a secure context; the plain LAN URL
used by the phone is not suitable for enabling MIDI. Click Enable MIDI, grant
access, then explicitly select an output. No SysEx permission is requested.

For inter-app routing to Vital, enable a bus in Audio MIDI Setup → MIDI Studio →
IAC Driver → Device is online. Select that bus as the trainer's output and as
the MIDI input in Vital or its host. See [Apple's IAC setup guide](https://support.apple.com/guide/audio-midi-setup/transfer-midi-information-between-apps-ams1013/mac).

The experimental Candidate 1 mapping uses fingering patterns in Index/Middle/Ring/Pinky
order: `1100→C4`, `1010→D4`, `1001→E4`, `0011→F4`, `0101→G4`,
`0110→A4`, `1000→B4` (MIDI 60, 62, 64, 65, 67, 69, 71). All other patterns
have no mapped pitch. The raw protocol still uses Index as bit 0, so Index alone is raw
`0001` but fingering `1000`; the raw binary displays are unchanged.
Output uses channel 1 and velocity 100. Thumb stays visible but has no musical effect.
MIDI attacks occur only when a pitch finger goes from up to down. A mapped press
releases the sounding note before starting the new pitch; an unmapped press leaves
the sounding note unchanged. Partial releases do not trigger or stop notes, even
if the displayed mapped pitch changes. Releasing all four pitch fingers stops the
sounding note. Duplicate states and thumb-only changes do nothing. Output selection
does not replay an already-held fingering; a fresh pitch-finger press is required.
Controller loss, MIDI disable/output switching, page hiding and navigation still
release the tracked note. Hidden pages do not send Note On. Output
loss requires selecting the port again; there is no automatic port selection.
MIDI is handled directly per received event, not from batched React rendering.
No internal sound is generated.

Test permission denial, IAC/Vital routing, pitch changes, duplicate/thumb-only
events, output hot-plugging, and cleanup on disconnect/hide/refresh manually.
Note Off delivery is best-effort when a port disappears or a browser/process
terminates abruptly; use Vital/host panic if necessary. Keep the trainer visible
while playing; switching to another app alone does not disable MIDI.

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Validation

```bash
npm test
npm run lint
npm run build
```

### Local Production Build

```bash
npm run build
npm run preview
```

These commands use Vite locally and do not require a Cloudflare account or
Cloudflare configuration.

## Optional Cloudflare Deployment

Cloudflare deployment is included but optional. A project can use only local
development and GitHub without configuring or deploying to Cloudflare.

The included deployment flow has two distinct targets:

```text
development → STAGING → deliberate deployment → PRODUCTION
```

Staging is the routine deployed environment:

```bash
npm run deploy:staging
```

Production changes only through an explicit production deployment:

```bash
npm run deploy:prod
```

The default Worker names are `webapp-starter-staging` and
`webapp-starter-production`. Change these in `wrangler.jsonc` when creating a
project so they are unique within your Cloudflare account. The deployment
commands build with the matching Cloudflare environment and then deploy only to
that target.

### Build Identity

Vite embeds the following metadata at build time, with no runtime GitHub or API
request:

- application version from `package.json`;
- the current short Git commit SHA;
- deployment environment: `LOCAL`, `STAGING`, or `PRODUCTION`.

The starter UI displays this unobtrusively in its footer, for example:
`STAGING · a1b2c3d · v0.0.0`. Normal local development and builds use `LOCAL`.

## Versioning & Releases

Projects created from this template follow Semantic Versioning (`MAJOR.MINOR.PATCH`):

- **Single source of truth**: `package.json` is the single source of truth for the application version; Vite exposes it at build time as `__APP_VERSION__`.
- **Commits vs. Releases**: Ordinary development is tracked by Git commits; version numbers identify releases.
- **Mechanical version bumps**: Version bumps should be performed mechanically with standard npm tooling (e.g. `npm version patch|minor|major --no-git-tag-version`) rather than maintaining duplicate version strings manually.
- **Data schema separation**: Application versioning is strictly separate from any future persisted-data or external-format schema versioning.

## Project Structure

```
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── assets/
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .oxlintrc.json
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── wrangler.jsonc
```
