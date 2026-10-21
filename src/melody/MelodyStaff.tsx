import { useEffect, useRef, useState } from 'react'
import { notationPitch } from './notation.js'
import { notesPerRow } from './progression.js'

export default function MelodyStaff({ notes, start, position, row, presentations }: {
  notes: readonly (string | null)[]; start: number; position: number; row: number; presentations?: readonly ('letter' | 'staff')[]
}) {
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const currentPosition = useRef(position)

  useEffect(() => {
    const element = host.current!
    let disposed = false
    const draw = async () => {
      const { Renderer, Stave, StaveNote, Accidental, TickContext, ModifierContext } = await import('vexflow/bravura')
      await document.fonts.load('40px Bravura')
      await document.fonts.load('12px Academico')
      if (disposed) return
      element.replaceChildren()
      const renderer = new Renderer(element, Renderer.Backends.SVG)
      renderer.resize(1080, 230)
      const context = renderer.getContext()
      const stave = new Stave(10, 65, 1060).addClef('treble')
      stave.setContext(context).draw()
      const placements: { group: SVGElement; x: number; label: string; presentation?: 'letter' | 'staff' }[] = []
      let top = stave.getYForLine(0) - 20
      let bottom = stave.getYForLine(4) + 20
      notes.forEach((pitch, slot) => {
        if (!pitch) return
        const index = start + slot
        const { key, accidental, label } = notationPitch(pitch)
        const note = new StaveNote({ keys: [key], duration: 'q', autoStem: true })
          .addModifier(new Accidental(accidental), 0)
          .setStyle({ fillStyle: 'currentColor', strokeStyle: 'currentColor' })
        note.setStave(stave).setContext(context)
        const modifiers = new ModifierContext()
        note.addToModifierContext(modifiers)
        modifiers.preFormat()
        new TickContext().addTickable(note).preFormat().setX(35 + slot * 97)
        const group = context.openGroup('melody-note')
        group.classList.add('melody-note')
        group.dataset.noteIndex = String(index)
        group.dataset.state = index < currentPosition.current ? 'completed' : index === currentPosition.current ? 'current' : 'upcoming'
        const x = note.getAbsoluteX() + 5
        note.draw()
        const stem = note.getStemExtents()
        top = Math.min(top, note.getYs()[0] - 22, stem.topY - 8, stem.baseY - 8)
        bottom = Math.max(bottom, note.getYs()[0] + 22, stem.topY + 8, stem.baseY + 8)
        const presentation = presentations?.[index]
        if (presentation === 'letter') group.replaceChildren()
        placements.push({ group, x, label, presentation })
        context.closeGroup()
      })
      const svg = element.querySelector('svg')!
      top = Math.floor(top) - 8
      const labelY = Math.ceil(bottom) + 20
      const height = labelY - top + 12
      placements.forEach(({ group, x, label, presentation }) => {
        const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        highlight.setAttribute('class', 'note-highlight')
        highlight.setAttribute('x', String(x - 34))
        highlight.setAttribute('y', String(top + 4))
        highlight.setAttribute('width', '70')
        highlight.setAttribute('height', String(height - 8))
        highlight.setAttribute('rx', '7')
        group.prepend(highlight)
        if (presentation === 'staff') return
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', String(x))
        text.setAttribute('y', String(labelY))
        text.setAttribute('class', 'melody-note-label')
        text.textContent = presentation === 'letter' ? label.replace(/[0-9]+$/, '').replace('♯', '#') : label
        group.append(text)
      })
      renderer.resize(1080, height)
      svg.setAttribute('viewBox', `0 ${top} 1080 ${height}`)
      svg.setAttribute('aria-hidden', 'true')
    }
    void draw().catch(reason => {
      if (!disposed) setError(`Notation could not load: ${String(reason)}`)
    })
    return () => { disposed = true; element.replaceChildren() }
  }, [notes, start, presentations])

  useEffect(() => {
    currentPosition.current = position
    host.current?.querySelectorAll<SVGGElement>('[data-note-index]').forEach(group => {
      const index = Number(group.dataset.noteIndex)
      group.dataset.state = index < position ? 'completed' : index === position ? 'current' : 'upcoming'
    })
  }, [position])

  return <div className="melody-row" aria-label={`Melody row ${row}`}>
    <div ref={host} className="melody-staff" />
    {error && <p role="alert">{error}</p>}
    <ol className="melody-accessible-notes">
      {Array.from({ length: notesPerRow }, (_, slot) => {
        const pitch = notes[slot]
        const index = start + slot
        return <li key={slot} aria-current={pitch && index === position ? 'step' : undefined}>
          {pitch ? `${index + 1}: ${notationPitch(pitch).label}${index < position ? ' completed' : ''}` : 'Empty slot'}
        </li>
      })}
    </ol>
  </div>
}
