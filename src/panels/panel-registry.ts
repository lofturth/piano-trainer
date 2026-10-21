import InstrumentSettingsPanel from './InstrumentSettingsPanel.tsx'
import LastNotePanel from './LastNotePanel.tsx'
import LiveFingeringPanel from './LiveFingeringPanel.tsx'
import TouchMonitor from '../TouchMonitor.tsx'
import NoteHistoryPanel from './NoteHistoryPanel.tsx'
import FingeringReferencePanel from './FingeringReferencePanel.tsx'
import ConnectionPanel from './ConnectionPanel.tsx'
import ControllerStatePanel from './ControllerStatePanel.tsx'
import MidiPanel from '../MidiPanel.tsx'
import { panelDefinitions } from './panel-definitions.ts'
import MelodyTrainerPanel from './MelodyTrainerPanel.tsx'

export const panelRegistry = [
  { ...panelDefinitions.settings, component: InstrumentSettingsPanel },
  { ...panelDefinitions.lastNote, component: LastNotePanel },
  { ...panelDefinitions.liveFingers, component: LiveFingeringPanel },
  { ...panelDefinitions.touchscreen, component: TouchMonitor },
  { ...panelDefinitions.history, component: NoteHistoryPanel },
  { ...panelDefinitions.reference, component: FingeringReferencePanel },
  { ...panelDefinitions.connection, component: ConnectionPanel },
  { ...panelDefinitions.rawState, component: ControllerStatePanel },
  { ...panelDefinitions.midi, component: MidiPanel },
  { ...panelDefinitions.melody, component: MelodyTrainerPanel },
] as const
