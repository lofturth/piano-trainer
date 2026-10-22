# Touch Microscope

Tiny UIKit iPhone touch timing experiment. MIT licensed.

Open `TouchMicroscope.xcodeproj` in Xcode 16 or later. Select your iPhone,
choose your Team under Signing & Capabilities, and press Run. Enable Developer
Mode on the iPhone if prompted. Requires iOS 16 or later.

Touch anywhere with one or more fingers. The latest 10 touch beginnings appear
in a table; N is the number of touches delivered in that callback. IDs restart
on Reset. Touch and handler columns are relative to their respective first
timestamps after Reset; delay uses the original compatible timestamps. Copy
copies the displayed results. Buttons do not record touches.

The first statement in `touchesBegan` captures
`ProcessInfo.systemUptime`; then the app reads `UITouch.timestamp` and shows
`(handlerEntry - touchTimestamp) * 1000` in milliseconds to three decimals.
The label is updated once per callback, after every touch is recorded.

Apple explicitly defines [UITouch.timestamp](https://developer.apple.com/documentation/uikit/uitouch/timestamp)
in terms of [ProcessInfo.systemUptime](https://developer.apple.com/documentation/foundation/processinfo/systemuptime):
both use seconds of system awake time since restart, a compatible monotonic
clock. The privacy manifest declares the elapsed-time measurement reason.
This measures touch-event timestamp to handler entry, not physical contact
to display latency. Three decimal places are display precision, not an
accuracy guarantee. Try on a physical iPhone for meaningful timing.

## Mac relay comparison

Keep the existing piano-trainer relay and Mac Force Microscope running. Close
the Safari iPhone controller first: the relay accepts one controller. On the
same Wi-Fi, tap Connect (edit the ws://hostname.local:8765 address if needed),
and allow Local Network access. On first launch, calibrate Thumb, Index, Middle, Ring, Pinky by touching and
lifting each finger in a comfortable position. Calibration is saved locally.
The full-screen regions use Safari’s nearest-center geometry, thumb radius,
colors, labels, and held feedback. Pitch bits 0–3 and independent thumb bit 4
match Safari. Assignments persist until release/cancel. The gear reveals
Connect, Calibrate, Reset, and Copy Results plus timing diagnostics. Opening
the panel releases held notes. Portrait and landscape are supported; rotating
releases held notes, matching the web controller’s resize behavior.

Uses URLSessionWebSocketTask and the existing role, fingers, timing, timing-reset,
and heartbeat protocol. Each UIKit press/release callback sends at most one
combined fingers message; t is its earliest touch timestamp, handlerAt its
entry timestamp, sentAt its send timestamp, all in uptime milliseconds. The
separate timing summary preserves individual first-touch times per finger.
Local table timestamps retain every touch-down; it now shows 10 recent events
to leave space for the connection controls and touch regions. Reset clears the
local attempt and releases fingers without restarting the connection sequence.
Backgrounding disconnects; return and tap Connect. Mac and phone clock origins
are independent. No relay or Safari changes are needed.

## Session findings — 2026-10-21

In actual playing, the native UIKit controller feels substantially more responsive;
combined multitouch callbacks avoid some intermediate notes (user observations).
In one test, 8.36 ms phone touch separation corresponded to 25.2 ms Mac arrival
separation. This compares intervals on separate clocks, not network latency.
Mac-side 0–40 ms grouping remains experimental, defaulting to 0 ms.
Next experiment: group on the iPhone using touch timestamps, with Mac grouping
disabled. That experiment is not implemented yet.

## Live Mac fingertip positions

Finger-state messages also carry the existing `screen` snapshot: surface dimensions
in points, normalized calibration centers (Thumb first), and current touches with
stable integer IDs, normalized x/y coordinates, and the original finger assignment.
Movement sends immediate coordinate-only `touches` messages without changing notes.
Release/cancel/reset removes positions; orientation reset and reconnection clear
them. No coordinate timers or grouping delays are used. On the Mac, open Playing
View to check positions, drag across boundaries, and release all fingers.

The native project is self-contained and MIT licensed. It depends at runtime on
the piano-trainer relay and Mac app in the repository root, not on their build
tools. Native source is versioned with piano-trainer. See
[SESSION_STATE.md](../../SESSION_STATE.md) for startup instructions, experiment
defaults, and remaining limitations. Open the Xcode project in this directory;
the old standalone TouchMicroscope directory is only a backup.
