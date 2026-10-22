# Timing experiments — 2026-10-21

- The native UIKit controller feels substantially more responsive in actual playing (user observation).
- Combined UIKit multitouch callbacks avoid some intermediate notes by sending one combined state per callback; they do not guarantee all intended fingers arrive together.
- Mac-side 0–40 ms grouping is experimental. The default is 0 ms; Fixed and Restarting modes are available for comparison.
- In one test, 8.36 ms of phone touch separation corresponded to 25.2 ms of Mac arrival separation. This is one observation, not a network-latency measurement: phone and Mac clocks are independent.
- Next experiment: group on the iPhone using touch timestamps, with Mac grouping disabled (0 ms). This has not been implemented.

## Validation and limitations

The browser build and focused grouping, MIDI-observer, trace, and relay checks passed during the session. The native controller was built and tried on a physical iPhone. On 2026-10-22 the coordinate update was built, installed, and launched on iPhone 14 Pro; its latest fingertip interaction still needs hands-on confirmation. No full suite was needed for the end-of-session review.

Force Microscope preserves raw phone touch/handler/send timestamps and Mac receive/MIDI timestamps, with sequence-ID matching. Three decimal places describe display formatting, not guaranteed clock accuracy. A release may legitimately be the first +0.000 event after Reset; the reported same-attempt press/release timestamp duplication was not reproduced. Safari pages must be manually refreshed after source edits.
