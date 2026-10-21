import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'

export default function LastNotePanel({ note }: { note?: string }) {
  return <Panel definition={panelDefinitions.lastNote} className="played-current">
    <output aria-label="Last played note" aria-live="polite">{note || '—'}</output>
    {!note && <p>Enable MIDI in Trainer, select an output, then play.</p>}
  </Panel>
}
