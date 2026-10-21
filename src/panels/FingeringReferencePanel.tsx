import { fingeringMappings, pitchForState } from '../pitch-mapping.js'
import type { MappingName } from '../pitch-mapping.js'
import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'

const fingers = ['Index', 'Middle', 'Ring', 'Pinky']

export default function FingeringReferencePanel({ mapping, fingerState, thumb, baseOctave }: {
  mapping: MappingName; fingerState: number; thumb: boolean; baseOctave: number
}) {
  return <Panel definition={panelDefinitions.reference} className="fingering-reference">
    <p>{mapping} · Fingerings</p>
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
  </Panel>
}
