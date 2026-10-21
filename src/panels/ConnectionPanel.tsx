import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'

export default function ConnectionPanel({ status, lastEvent }: {
  status: string; lastEvent: { seq: number; t: number } | null
}) {
  return <Panel definition={panelDefinitions.connection}>
    <p role="status">{status}</p>
    <p>{lastEvent ? `Sequence ${lastEvent.seq} · phone time ${lastEvent.t.toFixed(1)} ms` : 'No finger event in this connection'}</p>
    <p>Open /controller on your phone using this Mac’s LAN IP.</p>
  </Panel>
}
