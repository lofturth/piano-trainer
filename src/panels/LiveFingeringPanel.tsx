import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'

const fingers = ['Index', 'Middle', 'Ring', 'Pinky']

export default function LiveFingeringPanel({ fingerState, thumb }: { fingerState: number; thumb: boolean }) {
  return <Panel definition={panelDefinitions.liveFingers} className="live-fingering">
    <div className="live-fingers">
      {fingers.map((finger, bit) => {
        const pressed = Boolean(fingerState & (1 << bit))
        return <div key={finger} className={pressed ? 'live-finger pressed' : 'live-finger'}
          role="img" aria-label={`${finger} ${pressed ? 'pressed' : 'released'}`}>
          <strong>{finger}</strong><span>{pressed ? 'Pressed' : 'Released'}</span>
        </div>
      })}
    </div>
    <p className="live-fingering-hint">Live fingers may change while the last played note stays the same.</p>
    <p className={thumb ? 'live-thumb held' : 'live-thumb'}>Thumb: {thumb ? 'held · octave +12' : 'up · base octave'}</p>
  </Panel>
}
