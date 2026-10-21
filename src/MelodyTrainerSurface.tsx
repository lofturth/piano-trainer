import MelodyTrainerPanel from './panels/MelodyTrainerPanel.tsx'
import type { SubscribeNoteOn } from './note-events.js'
import type { MappingName } from './pitch-mapping.js'
import type { Touchscreen } from './touchscreen.js'
import TouchMonitor from './TouchMonitor.tsx'
import FingeringReferencePanel from './panels/FingeringReferencePanel.tsx'

export default function MelodyTrainerSurface({ subscribeNoteOn, screen, fingerState, thumb, baseOctave, mapping }: {
  subscribeNoteOn?: SubscribeNoteOn
  screen: Touchscreen | null; fingerState: number; thumb: boolean; baseOctave: number; mapping: MappingName
}) {
  return <section className="melody-surface" aria-label="Melody Trainer surface">
    <MelodyTrainerPanel subscribeNoteOn={subscribeNoteOn} baseOctave={baseOctave}
      fingerState={fingerState} thumb={thumb} mapping={mapping} />
    <div className="melody-support-panels">
      <TouchMonitor screen={screen} fingerState={fingerState} thumb={thumb} />
      <FingeringReferencePanel mapping={mapping} fingerState={fingerState} thumb={thumb} baseOctave={baseOctave} />
    </div>
  </section>
}
