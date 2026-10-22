# Return point — 2026-10-22

Prototype mode: keep experiments disposable; no production hardening implied.

## Working paths

- Mac React/Vite app: Trainer, Playing View, Melody Trainer, and Force Microscope.
- Safari controller: saved five-finger calibration, live positions, fixed finger
  assignment until release/cancel, reconnect to the saved Mac hostname.
- Native `native/TouchMicroscope`: UIKit five-finger calibration, matching
  regions/colors, combined state per touch callback, timing table, Copy Results,
  Reset, and URLSession WebSocket connection. Press/release snapshots and immediate
  movement-only snapshots include normalized coordinates for the Mac TouchMonitor.
- MIDI mapping remains Mac-side. Thumb is independent octave shift; Index–Pinky
  occupy bits 0–3. Neither phone implements synthesis or MIDI output.

## Start / resume

1. In piano-trainer, use Node 22.12+ and `npm ci` if dependencies are missing.
   Run `npm run relay` and `npm run dev:lan` in separate terminals (ports 8765/5173).
   Reuse existing servers if already running. Automatic hot reload is disabled;
   manually refresh browser pages after edits.
2. Mac: `http://localhost:5173/trainer`; enable MIDI and select the intended output.
   Playing View shows fingertips; `/force-microscope` shows timing and MIDI traces.
3. Safari alternative: `http://<Mac-hostname>.local:5173/controller`; save to Home
   Screen. Calibrate Thumb, Index, Middle, Ring, Pinky if needed.
4. Native: open `native/TouchMicroscope/TouchMicroscope.xcodeproj` in Xcode 16+,
   select the iPhone and signing Team, Run (iOS 16+; Developer Mode required).
   Gear opens Connect, Calibrate, Reset, Copy Results, and diagnostics. Default
   address is `ws://Lofturs-MacBook-Air.local:8765`; edit for another Mac and allow
   Local Network access. Calibration persists; backgrounding requires Connect again.
   The latest coordinate version was built, installed, and launched on iPhone 14 Pro.
5. Use only one phone controller at a time: close Safari before connecting native,
   or disconnect native before returning to Safari. Devices need reachable LAN/mDNS.

## Experiments and defaults

- Mac settling window: 0 ms (off), Fixed mode. Options 0/8/16/24/40 ms;
  Restarting waits for quiet, Fixed uses the initial deadline. Settings are not saved.
  Only MIDI application is grouped; raw touch/receipt diagnostics remain immediate.
- Mac defaults: Finger Roll mapping, base octave 4; MIDI requires explicit enable.
- Native has no phone-side grouping, smoothing, or coordinate timer. UIKit can
  deliver simultaneous fingers in one callback, but may deliver separate callbacks.
- Force Microscope: first press per pitch finger per attempt; latest 20 update
  rows and 15 MIDI events. Lift fingers before Reset / Repeat for a press-first trace.
- See `docs/timing-experiments.md` for actual playing observations.

## Limitations / review

- Separate phone/Mac monotonic clock origins: compare intervals, not absolute
  cross-device latency. Three decimals do not guarantee microsecond accuracy.
- Confirm latest fingertip movement/removal and responsiveness in real playing;
  protocol checks and successful launch do not establish the physical interaction.
- Grouping deliberately delays MIDI and can discard short intermediate states/taps;
  compare against 0 ms. Restarting mode can defer output during continued changes.
- Native connection is manual after interruption, has no backpressure/retry policy,
  and keeps UI/network/timing in one view. Geometry is duplicated across Swift/JS;
  parity needs care when either implementation changes. Keep this simple for now.
- Force Microscope explanatory text still primarily describes Safari timestamps;
  native uses UITouch.timestamp and systemUptime with the same field units (ms).
- Relay is unauthenticated local-network tooling, one controller at a time; not an
  Internet service. Browser MIDI needs a secure context (Mac localhost is suitable).
- Both projects are MIT licensed; dependencies retain their own licenses.
- Native source now lives in this repository at `native/TouchMicroscope/` and is
  saved with piano-trainer. The old `../TouchMicroscope` directory is an untouched
  standalone backup (commit `2f131b0`); make future edits in the integrated copy.

## Next experiments

1. Compare native and Safari traces with Mac grouping off; check drags, releases,
   cancellation, orientation, and reconnects while playing.
2. Try phone-side grouping using native touch timestamps, with Mac grouping at
   0 ms, to compare responsiveness and unwanted intermediate notes. Not implemented.
3. Eventually prototype Hall-sensor input while preserving the existing finger-state
   mapping/diagnostic boundary; sensor electronics/firmware/transport are not built.

## Verification at this return point

`npx tsc -b` and 31 focused grouping/MIDI/trace/timing/relay checks passed.
Relay tests used ephemeral localhost ports, leaving running servers untouched.
Native signed iPhone build/install/launch passed earlier in this session; only
README and privacy-manifest housekeeping changed afterward. No full audit performed.

Integration verification: the relocated Xcode project builds for iPhone using
its existing bundle identifier and signing settings. Runtime behavior is unchanged;
no Mac code, protocol, or calibration keys were modified.
