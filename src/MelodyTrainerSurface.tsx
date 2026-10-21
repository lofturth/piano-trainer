import MelodyTrainerPanel from './panels/MelodyTrainerPanel.tsx'

export default function MelodyTrainerSurface() {
  return <main className="melody-surface">
    <nav><a href="/">Starter</a> · <a href="/trainer">Trainer / Playing View</a> · <a href="/controller">Controller</a></nav>
    <h1>Melody Trainer</h1>
    <MelodyTrainerPanel />
  </main>
}
