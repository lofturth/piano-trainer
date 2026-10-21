import Panel from './Panel.tsx'
import { panelDefinitions } from './panel-definitions.ts'

export default function NoteHistoryPanel({ history }: { history: string[] }) {
  return <Panel definition={panelDefinitions.history} className="played-history">
    <p>Last 20 notes · Oldest → newest</p>
    {history.length ? <ol>{history.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ol>
      : <p>No notes played yet.</p>}
  </Panel>
}
