export const panelDefinitions = {
  settings: { id: 'P01', name: 'Instrument Settings' },
  lastNote: { id: 'P02', name: 'Last Played Note' },
  liveFingers: { id: 'P03', name: 'Live Fingering' },
  touchscreen: { id: 'P04', name: 'Touchscreen Monitor' },
  history: { id: 'P05', name: 'Note History' },
  reference: { id: 'P06', name: 'Fingering Reference' },
  connection: { id: 'P07', name: 'Connection Status' },
  rawState: { id: 'P08', name: 'Controller State' },
  midi: { id: 'P09', name: 'MIDI Output' },
  melody: { id: 'P10', name: 'Melody Trainer' },
} as const
