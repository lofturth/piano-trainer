import { useLayoutEffect, useMemo, useState } from 'react'
import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'
import { rowContents } from '../melody/progression.js'
import { notationPitch } from '../melody/notation.js'
import MelodyStaff from '../melody/MelodyStaff.tsx'
import '../melody/MelodyTrainer.css'
import { initialPractice, newPracticeSequence, playPracticeNote, practiceNotes, resetPractice, simulatePracticeNote, togglePracticeNote } from '../melody/practice.js'
import type { SubscribeNoteOn } from '../note-events.js'
import type { MappingName } from '../pitch-mapping.js'
import { midiNoteForPitch, midiNoteForState } from '../midi-output.js'
import { createPracticeHold } from '../melody/hold.js'

export default function MelodyTrainerPanel({ subscribeNoteOn, baseOctave = 4, fingerState = 0, thumb = false, mapping = 'Finger Roll', onPracticeReset }: {
  onPracticeReset?: () => void
  subscribeNoteOn?: SubscribeNoteOn; baseOctave?: number; fingerState?: number; thumb?: boolean; mapping?: MappingName
} = {}) {
  const [practice, setPractice] = useState(() => initialPractice())
  const [hold] = useState(() => createPracticeHold())
  const [mixedReading, setMixedReading] = useState(false)
  const [holdDuration, setHoldDuration] = useState(500)
  const [holdProgress, setHoldProgress] = useState(0)
  const { progress, sequence, selected } = practice
  const melody = useMemo(() => sequence.map(note => `${note}${baseOctave}`), [sequence, baseOctave])
  useLayoutEffect(() => {
    const midi = subscribeNoteOn ? midiNoteForState(fingerState, thumb, baseOctave, mapping) : null
    hold.update(`${fingerState}:${thumb}:${baseOctave}:${mapping}`, midi,
      midiNoteForPitch(melody[progress.position]), note => {
        setPractice(previous => playPracticeNote(previous, note, baseOctave))
      }, holdDuration)
    setHoldProgress(0)
    let frame: number
    const drawProgress = () => {
      const value = hold.progress()
      if (value === null) return
      setHoldProgress(value)
      if (value < 1) frame = requestAnimationFrame(drawProgress)
    }
    frame = requestAnimationFrame(drawProgress)
    return () => {
      hold.cancel()
      cancelAnimationFrame(frame)
    }
  }, [hold, subscribeNoteOn, fingerState, thumb, baseOctave, mapping, melody, progress, holdDuration])
  const [firstStart, secondStart] = progress.rowStarts
  const firstRow = useMemo(() => rowContents(melody, firstStart), [melody, firstStart])
  const secondRow = useMemo(() => rowContents(melody, secondStart), [melody, secondStart])
  const rows = [firstRow, secondRow]
  const complete = progress.position === melody.length
  return <Panel definition={panelDefinitions.melody} className="melody-trainer-panel">
    <p>Play the highlighted pitch · quarter notes show pitch only; no rhythm or timing evaluation.</p>
    <div className="practice-note-selector" role="group" aria-label="Practice notes">
      <span>Practice notes</span>
      {practiceNotes.map(note => <button key={note} type="button" aria-pressed={selected.includes(note)}
        disabled={selected.length === 1 && selected[0] === note}
        onClick={() => { hold.cancel(); onPracticeReset?.(); setPractice(previous => togglePracticeNote(previous, note)) }}>
        {note.replace('#', '♯')}
      </button>)}
    </div>
    <div className="melody-actions">
      <button type="button" onClick={() => { hold.cancel(); onPracticeReset?.(); setPractice(previous => newPracticeSequence(previous)) }}>New Sequence</button>
      <button type="button" disabled={complete} onClick={() => { hold.cancel(); setPractice(simulatePracticeNote) }}>Play next note (simulation)</button>
      <button type="button" onClick={() => { hold.cancel(); onPracticeReset?.(); setPractice(resetPractice) }}>Reset</button>
      <p role="status" aria-live="polite">{complete ? `Melody complete · ${melody.length} notes completed` :
        `Note ${progress.position + 1} of ${melody.length} · ${mixedReading ? '' : `${notationPitch(melody[progress.position]).label} · `}Row ${Math.floor(progress.position / 10) % 2 + 1}`}</p>
    </div>
    <div className="melody-hold-controls">
      <label><input type="checkbox" checked={mixedReading}
        onChange={event => setMixedReading(event.target.checked)} /> Mixed Reading</label>
      <progress aria-label="Current note hold progress" max={1} value={holdProgress} />
      <label>Hold <input type="range" min={100} max={1000} step={50} value={holdDuration}
        onChange={event => {
          hold.cancel()
          setHoldProgress(0)
          setHoldDuration(Number(event.target.value))
        }} /> <output>{holdDuration} ms</output></label>
    </div>
    {rows.map((notes, row) => <MelodyStaff key={row} row={row + 1} notes={notes}
      start={progress.rowStarts[row]} position={progress.position}
      presentations={mixedReading ? practice.presentations : undefined} />)}
  </Panel>
}
