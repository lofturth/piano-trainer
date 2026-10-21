import type { MappingName } from './pitch-mapping.js'
import './PlayingView.css'
import TouchMonitor from './TouchMonitor.tsx'
import type { Touchscreen } from './touchscreen.js'
import InstrumentSettingsPanel from './panels/InstrumentSettingsPanel.tsx'
import LastNotePanel from './panels/LastNotePanel.tsx'
import LiveFingeringPanel from './panels/LiveFingeringPanel.tsx'
import NoteHistoryPanel from './panels/NoteHistoryPanel.tsx'
import FingeringReferencePanel from './panels/FingeringReferencePanel.tsx'

export default function PlayingView({ history, fingerState, thumb, screen, baseOctave, onBaseOctave, mapping, onMapping }: {
  mapping: MappingName; onMapping: (mapping: MappingName) => void
  baseOctave: number; onBaseOctave: (octave: number) => void
  history: string[]; fingerState: number; thumb: boolean; screen: Touchscreen | null
}) {
  return <section className="playing-view" aria-label="Playing View">
    <div className="playing-note-column">
      <InstrumentSettingsPanel mapping={mapping} onMapping={onMapping} baseOctave={baseOctave} onBaseOctave={onBaseOctave} />
      <LastNotePanel note={history.at(-1)} />
    </div>
    <LiveFingeringPanel fingerState={fingerState} thumb={thumb} />
    <TouchMonitor screen={screen} fingerState={fingerState} thumb={thumb} />
    <NoteHistoryPanel history={history} />
    <FingeringReferencePanel mapping={mapping} fingerState={fingerState} thumb={thumb} baseOctave={baseOctave} />
  </section>
}
