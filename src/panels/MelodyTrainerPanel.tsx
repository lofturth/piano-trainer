import { useMemo, useState } from 'react'
import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'
import { demoMelody } from '../melody/demo-melody.js'
import { advanceProgression, initialProgression, rowContents } from '../melody/progression.js'
import { notationPitch } from '../melody/notation.js'
import MelodyStaff from '../melody/MelodyStaff.tsx'
import '../melody/MelodyTrainer.css'

export default function MelodyTrainerPanel() {
  const [progress, setProgress] = useState(initialProgression)
  const [firstStart, secondStart] = progress.rowStarts
  const firstRow = useMemo(() => rowContents(demoMelody, firstStart), [firstStart])
  const secondRow = useMemo(() => rowContents(demoMelody, secondStart), [secondStart])
  const rows = [firstRow, secondRow]
  const complete = progress.position === demoMelody.length
  return <Panel definition={panelDefinitions.melody} className="melody-trainer-panel">
    <p>Visual demonstration · quarter notes show pitch only; no rhythm or timing evaluation.</p>
    <div className="melody-actions">
      <button type="button" disabled={complete} onClick={() => setProgress(previous => advanceProgression(previous, demoMelody.length))}>Play next note</button>
      <button type="button" onClick={() => setProgress(initialProgression())}>Reset</button>
      <p role="status" aria-live="polite">{complete ? `Melody complete · ${demoMelody.length} notes completed` :
        `Note ${progress.position + 1} of ${demoMelody.length} · ${notationPitch(demoMelody[progress.position]).label} · Row ${Math.floor(progress.position / 10) % 2 + 1}`}</p>
    </div>
    {rows.map((notes, row) => <MelodyStaff key={row} row={row + 1} notes={notes}
      start={progress.rowStarts[row]} position={progress.position} />)}
  </Panel>
}
