import { useState } from 'react'
import type { TimingMeasurement, Finger } from './timing.js'
import type { MidiEvent } from './midi-output.js'
import type { FingerTraceRow } from './midi-trace.js'
import './FingerTimingTest.css'

const FINGERS: readonly Finger[] = ['Index', 'Middle', 'Ring', 'Pinky']

export default function FingerTimingTest({ measurement, fingerState, onReset, midiEvents = [], traceRows = [] }: {
  measurement: TimingMeasurement; fingerState: number; onReset: () => void
  midiEvents?: readonly (MidiEvent & { relativeMs: number })[]
  traceRows?: readonly FingerTraceRow[]
}) {
  const { arrivals, totalSpreadMs } = measurement
  const [copyStatus, setCopyStatus] = useState('')
  const noteName = (midi: number) => `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`
  const resultsText = [
    'Force Microscope',
    `Total spread: ${totalSpreadMs.toFixed(3)} ms (${arrivals.length} fingers detected)`,
    'Finger arrivals (iPhone touch timing)',
    'Order\tFinger\tOffset (ms)',
    ...arrivals.map(a => `${a.order}\t${a.finger}\t+${a.relativeMs.toFixed(3)}`),
    ...(arrivals.length ? [] : ['No finger measurements yet.']),
    '',
    'MIDI output — last 15 events (Mac time from first event after Reset / Repeat)',
    'Note\tEvent\tTime (ms)',
    ...midiEvents.map(event => `${noteName(event.midi)}\t${event.type}\t+${event.relativeMs.toFixed(3)}`),
    ...(midiEvents.length ? [] : ['No MIDI events yet.']),
    '',
    'Finger update trace — phone and Mac have separate time origins; no network latency inferred.',
    'Seq\tChanges\tiPhone touch (ms)\tiPhone handler entry (ms)\tiPhone sent (ms)\tMac received (ms)\tMIDI sends (Mac ms)',
    ...traceRows.map(row => `${row.seq}\t${row.changes.join(', ') || 'Snapshot / unchanged'}\t+${row.phoneMs.toFixed(3)}${row.sameTimestamp ? ' (shared timestamp)' : ''}\t${row.phoneHandlerMs === null ? '—' : `+${row.phoneHandlerMs.toFixed(3)}`}\t${row.phoneSentMs === null ? '—' : `+${row.phoneSentMs.toFixed(3)}`}\t+${row.macMs.toFixed(3)}\t${row.midi.map(event => `${noteName(event.midi)} ${event.type} +${event.relativeMs.toFixed(3)}`).join('; ') || 'None'}`),
  ].join('\n')
  const copyResults = async () => {
    try {
      await navigator.clipboard.writeText(resultsText)
      setCopyStatus('Results copied')
    } catch {
      setCopyStatus('Clipboard unavailable — select and copy the results below.')
    }
  }

  return (
    <section className="timing-test-page" aria-label="Force Microscope">
      <header className="timing-test-header">
        <h1>Force Microscope</h1>
        <p>Touch Index, Middle, Ring, and Pinky on the iPhone controller.</p>
      </header>

      {/* Results banner */}
      <section className="timing-results" aria-label="Measurement Results">
        {arrivals.length === 0 ? (
          <p className="status-idle">Waiting for iPhone touch…</p>
        ) : (
          <div className="results-summary">
            <div className="spread-headline">
              <span className="spread-label">Total spread:</span>
              <strong className="spread-value">{totalSpreadMs.toFixed(3)} ms</strong>
              <span className="spread-sub">({arrivals.length} fingers detected)</span>
            </div>

            <ol className="arrivals-list">
              {arrivals.map(a => (
                <li key={a.finger} className="arrival-item">
                  <span className="arrival-order">#{a.order}</span>
                  <strong className="arrival-finger">{a.finger}</strong>
                  <span className="arrival-time">+{a.relativeMs.toFixed(3)} ms</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <button type="button" className="copy-results-button" onClick={() => void copyResults()}>Copy results</button>
        {copyStatus && <p role="status">{copyStatus}</p>}
        {copyStatus.startsWith('Clipboard unavailable') && <textarea className="timing-copy-text" aria-label="Results to copy" readOnly value={resultsText} onFocus={event => event.currentTarget.select()} />}
        <button type="button" className="reset-button" onClick={() => { setCopyStatus(''); onReset() }}>
          Reset / Repeat
        </button>
      </section>

      {/* 4 Touch Pads */}
      <section className="touch-pads-container" aria-label="Touchscreen Pads">
        {FINGERS.map((finger, index) => {
          const isPressed = Boolean(fingerState & (1 << index))
          const touched = arrivals.find(a => a.finger === finger)
          return (
            <div
              key={finger}
              data-finger={finger}
              className={`touch-pad ${isPressed ? 'pressed' : ''} ${touched ? 'recorded' : ''}`}
            >
              <span className="pad-title">{finger}</span>
              {touched && (
                <span className="pad-timestamp">
                  {arrivals.find(a => a.finger === finger)
                    ? `+${arrivals.find(a => a.finger === finger)!.relativeMs.toFixed(3)} ms`
                    : ''}
                </span>
              )}
            </div>
          )
        })}
      </section>
      <section className="timing-midi-history" aria-label="Outgoing MIDI events">
        <h2>MIDI output · last 15 events</h2>
        <p>Mac time from first event after Reset / Repeat.</p>
        {midiEvents.length === 0 ? <p>No MIDI sent yet. Enable MIDI and select an output in Trainer.</p> :
          <div className="timing-midi-scroll"><table>
            <thead><tr><th>Note</th><th>Event</th><th>Time (ms)</th></tr></thead>
            <tbody>{midiEvents.map((event, index) => <tr key={index}>
              <td>{noteName(event.midi)}</td>
              <td>{event.type}</td><td>+{event.relativeMs.toFixed(3)}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <section className="timing-midi-history timing-update-trace" aria-label="Finger update trace">
        <h2>Finger → MIDI · last 20 updates</h2>
        <p>Seq IDs come from the iPhone. Phone and Mac times each start at their first update after Reset. Touch, handler entry, and send times share the phone origin. MIDI times share the Mac receive origin.</p>
        <p>Compare intervals within each clock; these are not network latency measurements. Multiple changes in one row belong to one update.</p>
        <p>Touch time is the browser event timestamp, not physical touchscreen latency. Handler entry is the start of our app handler, after browser/React dispatch. Safari may reduce clock precision; startup/reset updates without a touch handler show —.</p>
        {traceRows.at(-1)?.phoneSentMs === null && <p role="status">Send timestamps are missing from the iPhone messages. Refresh the iPhone controller, then Reset / Repeat; earlier timestamps cannot be recovered.</p>}
        {traceRows[0]?.changes.some(change => change.endsWith('release')) && <p>The first update after Reset was a release, so it defines +0.000. Lift all fingers before Reset for a press-first timeline.</p>}
        {traceRows.length === 0 ? <p>Waiting for controller updates…</p> :
          <div className="timing-midi-scroll"><table>
            <thead><tr><th>Seq</th><th>Changes</th><th>iPhone touch (ms)</th><th>iPhone handler entry (ms)</th><th>iPhone sent (ms)</th><th>Mac received ms</th><th>MIDI sent · Mac ms</th></tr></thead>
            <tbody>{traceRows.map(row => <tr key={row.seq}>
              <td>{row.seq}</td><td>{row.changes.join(', ') || 'Snapshot / unchanged'}</td>
              <td title={String(row.phoneTimestamp)}>+{row.phoneMs.toFixed(3)}{row.sameTimestamp && <small> shared timestamp</small>}</td>
              <td title={row.phoneHandlerAt === null ? undefined : String(row.phoneHandlerAt)}>{row.phoneHandlerMs === null ? '—' : `+${row.phoneHandlerMs.toFixed(3)}`}</td>
              <td title={row.phoneSentAt === null ? undefined : String(row.phoneSentAt)}>{row.phoneSentMs === null ? '—' : `+${row.phoneSentMs.toFixed(3)}`}</td>
              <td title={String(row.receivedAt)}>+{row.macMs.toFixed(3)}</td>
              <td>{row.midi.length ? row.midi.map((event, index) => <div key={index}>{noteName(event.midi)} {event.type} +{event.relativeMs.toFixed(3)}</div>) : 'None'}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </section>
  )
}
