import { majorScaleMapping } from './pitch-mapping.js'
import './PlayingView.css'
import TouchMonitor from './TouchMonitor.tsx'
import type { Touchscreen } from './touchscreen.js'

const fingers = ['Index', 'Middle', 'Ring', 'Pinky']

export default function PlayingView({ history, fingerState, thumb, screen }: {
  history: string[]; fingerState: number; thumb: boolean; screen: Touchscreen | null
}) {
  const current = history.at(-1)
  return <section className="playing-view" aria-label="Playing View">
    <div className="played-current">
      <p>Last played note</p>
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
    <section className="fingering-reference" aria-label="Major-scale fingering reference">
      <h2>Candidate 1 · Major-scale fingerings</h2>
      <p>Index · Middle · Ring · Pinky</p>
      <p className="fingering-legend">Filled 1 = pressed · outlined 0 = released</p>
      <div className="fingering-cards">
        {majorScaleMapping.map(({ state, note }) => <div key={note}
          className={state === fingerState ? 'fingering-card current' : 'fingering-card'}
          aria-current={state === fingerState ? 'true' : undefined}>
          <strong>{note}</strong>
          <div className="fingering-bits">
            {fingers.map((finger, bit) => {
              const pressed = Boolean(state & (1 << bit))
              return <span key={finger} className={pressed ? 'pressed' : 'released'}
                aria-label={`${finger} ${pressed ? 'pressed' : 'released'}`}>{pressed ? '1' : '0'}</span>
            })}
          </div>
        </div>)}
      </div>
    </section>
  </section>
}
