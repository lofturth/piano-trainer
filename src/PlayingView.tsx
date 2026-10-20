import { fingeringMappings, pitchForState } from './pitch-mapping.js'
import type { MappingName } from './pitch-mapping.js'
import './PlayingView.css'
import TouchMonitor from './TouchMonitor.tsx'
import type { Touchscreen } from './touchscreen.js'

const fingers = ['Index', 'Middle', 'Ring', 'Pinky']

export default function PlayingView({ history, fingerState, thumb, screen, baseOctave, onBaseOctave, mapping, onMapping }: {
  mapping: MappingName; onMapping: (mapping: MappingName) => void
  baseOctave: number; onBaseOctave: (octave: number) => void
  history: string[]; fingerState: number; thumb: boolean; screen: Touchscreen | null
}) {
  const current = history.at(-1)
  return <section className="playing-view" aria-label="Playing View">
    <div className="played-current">
      <p>Last played note</p>
      <label className="base-octave">Mapping <select value={mapping} onChange={event => onMapping(event.target.value as MappingName)}>
        <option>Candidate 1</option><option>Finger Roll</option>
      </select></label>
      <div className="base-octave" role="group" aria-label="Base octave">
        <button type="button" aria-label="Lower base octave" disabled={baseOctave === 1} onClick={() => onBaseOctave(baseOctave - 1)}>−</button>
        <span>Base Octave {baseOctave}</span>
        <button type="button" aria-label="Raise base octave" disabled={baseOctave === 7} onClick={() => onBaseOctave(baseOctave + 1)}>+</button>
      </div>
      <output aria-label="Last played note" aria-live="polite">{current || '—'}</output>
      {!current && <p>Enable MIDI in Trainer, select an output, then play.</p>}
    </div>
    <section className="live-fingering" aria-label="Live finger activity">
      <h2>Live fingering</h2>
      <div className="live-fingers">
        {fingers.map((finger, bit) => {
          const pressed = Boolean(fingerState & (1 << bit))
          return <div key={finger} className={pressed ? 'live-finger pressed' : 'live-finger'}
            role="img" aria-label={`${finger} ${pressed ? 'pressed' : 'released'}`}>
            <strong>{finger}</strong><span>{pressed ? 'Pressed' : 'Released'}</span>
          </div>
        })}
      </div>
      <p className="live-fingering-hint">Live fingers may change while the last played note stays the same.</p>
      <p className={thumb ? 'live-thumb held' : 'live-thumb'}>Thumb: {thumb ? 'held · octave +12' : 'up · base octave'}</p>
    </section>
    <TouchMonitor screen={screen} fingerState={fingerState} thumb={thumb} />
    <section className="played-history" aria-label="Note history">
      <h2>Last 20 notes</h2>
      <p>Oldest → newest</p>
      {history.length ? <ol>{history.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ol>
        : <p>No notes played yet.</p>}
    </section>
    <section className="fingering-reference" aria-label="Fingering reference">
      <h2>{mapping} · Fingerings</h2>
      <p>Index · Middle · Ring · Pinky</p>
      <p className="fingering-legend">Filled 1 = pressed · outlined 0 = released</p>
      <div className="fingering-cards piano-reference">
        {fingeringMappings[mapping].map(({ state, note }) => <div key={note}
          className={`fingering-card ${note.includes('#') ? 'chromatic' : 'natural'}${state === fingerState ? ' current' : ''}`}
          style={{ gridColumn: `${'CDEFGAB'.indexOf(note[0]) * 2 + (note.includes('#') ? 2 : 1)} / span 2`, gridRow: note.includes('#') ? 1 : 2 }}
          aria-current={state === fingerState ? 'true' : undefined}>
          <strong>{pitchForState(state, thumb, baseOctave, mapping)}</strong>
          <div className="fingering-bits">
            {fingers.map((finger, bit) => {
              const pressed = Boolean(state & (1 << bit))
              return <span key={finger} className={pressed ? 'pressed' : 'released'}
                aria-label={`${finger} ${pressed ? 'pressed' : 'released'}`}>{pressed ? '1' : '0'}</span>
            })}
          </div>
        </div>)}
      </div>
      <div className="unassigned-fingerings" aria-label="Available unassigned fingerings">
        <span>Available / unassigned:</span>
        {Array.from({ length: 15 }, (_, index) => index + 1)
          .filter(state => !fingeringMappings[mapping].some(entry => entry.state === state))
          .map(state => <code key={state} className={state === fingerState ? 'current' : ''}>
            {fingers.map((_, bit) => (state & (1 << bit)) ? '1' : '0').join('')}
          </code>)}
      </div>
    </section>
  </section>
}
