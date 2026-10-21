import type { MappingName } from '../pitch-mapping.js'
import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'

export default function InstrumentSettingsPanel({ mapping, onMapping, baseOctave, onBaseOctave }: {
  mapping: MappingName; onMapping: (mapping: MappingName) => void
  baseOctave: number; onBaseOctave: (octave: number) => void
}) {
  return <Panel definition={panelDefinitions.settings}>
    <label className="base-octave">Mapping <select value={mapping} onChange={event => onMapping(event.target.value as MappingName)}>
      <option>Candidate 1</option><option>Finger Roll</option>
    </select></label>
    <div className="base-octave" role="group" aria-label="Base octave">
      <button type="button" aria-label="Lower base octave" disabled={baseOctave === 1} onClick={() => onBaseOctave(baseOctave - 1)}>−</button>
      <span>Base Octave {baseOctave}</span>
      <button type="button" aria-label="Raise base octave" disabled={baseOctave === 7} onClick={() => onBaseOctave(baseOctave + 1)}>+</button>
    </div>
  </Panel>
}
