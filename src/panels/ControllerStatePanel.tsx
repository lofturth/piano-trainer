import { pitchForState } from '../pitch-mapping.js'
import type { MappingName } from '../pitch-mapping.js'
import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'

const fingers = ['Index', 'Middle', 'Ring', 'Pinky']

export default function ControllerStatePanel({ fingerState, thumb, baseOctave, mapping }: {
  fingerState: number; thumb: boolean; baseOctave: number; mapping: MappingName
}) {
  return <Panel definition={panelDefinitions.rawState}>
    <output className="trainer-note" aria-label="Mapped note" aria-live="polite">{pitchForState(fingerState, thumb, baseOctave, mapping)}</output>
    <output className="finger-state" aria-label="Finger state">{fingerState.toString(2).padStart(4, '0')}</output>
    <p>Bits: Pinky · Ring · Middle · Index (Index = bit 0)</p>
    <p className={thumb ? 'trainer-thumb held' : 'trainer-thumb'}>Thumb: {thumb ? 'pressed' : 'released'}</p>
    <div className="finger-zones">
      {fingers.map((finger, index) => <div key={finger} className={(fingerState & (1 << index)) ? 'held' : ''}>{finger}</div>)}
    </div>
  </Panel>
}
