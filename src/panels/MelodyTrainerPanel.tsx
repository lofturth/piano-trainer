import { useEffect, useMemo, useState } from 'react'
import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'
import { demoMelody } from '../melody/demo-melody.js'
import { advanceProgression, initialProgression, rowContents } from '../melody/progression.js'
import { notationPitch } from '../melody/notation.js'
import MelodyStaff from '../melody/MelodyStaff.tsx'
import '../melody/MelodyTrainer.css'
import { advanceForNote } from '../melody/matching.js'
import type { SubscribeNoteOn } from '../note-events.js'

export default function MelodyTrainerPanel({ subscribeNoteOn }: { subscribeNoteOn?: SubscribeNoteOn } = {}) {
  const [progress, setProgress] = useState(initialProgression)
  useEffect(() => subscribeNoteOn?.(midi => {
    setProgress(previous => advanceForNote(previous, midi))
  }), [subscribeNoteOn])
  const [firstStart, secondStart] = progress.rowStarts
  const firstRow = useMemo(() => rowContents(demoMelody, firstStart), [firstStart])
  const secondRow = useMemo(() => rowContents(demoMelody, secondStart), [secondStart])
  const rows = [firstRow, secondRow]
  const complete = progress.position === demoMelody.length
  return <Panel definition={panelDefinitions.melody} className="melody-trainer-panel">
    <p>Play the highlighted pitch · quarter notes show pitch only; no rhythm or timing evaluation.</p>
    <div className="melody-actions">
      <button type="button" disabled={complete} onClick={() => setProgress(previous => advanceProgression(previous, demoMelody.length))}>Play next note (simulation)</button>
      <button type="button" onClick={() => setProgress(initialProgression())}>Reset</button>
      <p role="status" aria-live="polite">{complete ? `Melody complete · ${demoMelody.length} notes completed` :
        `Note ${progress.position + 1} of ${demoMelody.length} · ${notationPitch(demoMelody[progress.position]).label} · Row ${Math.floor(progress.position / 10) % 2 + 1}`}</p>
    </div>
    {rows.map((notes, row) => <MelodyStaff key={row} row={row + 1} notes={notes}
      start={progress.rowStarts[row]} position={progress.position} />)}
  </Panel>
}
