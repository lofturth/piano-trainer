import type { ReactNode } from 'react'
import type { panelDefinitions } from './panel-definitions.ts'
import './Panel.css'

type Definition = typeof panelDefinitions[keyof typeof panelDefinitions]

export default function Panel({ definition, className = '', children }: {
  definition: Definition; className?: string; children: ReactNode
}) {
  return <section className={`instrument-panel ${className}`} data-panel-id={definition.id}
    aria-label={`${definition.id} ${definition.name}`}>
    <header className="panel-header"><span>{definition.id}</span><h2>{definition.name}</h2></header>
    {children}
  </section>
}
