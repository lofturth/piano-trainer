import { useCallback, useEffect, useRef, useState } from 'react'
import { MidiOutput } from './midi-output.js'

export default function MidiPanel({ register, onNoteOn }: {
  register: (receive: (state: number, thumb?: boolean) => void) => void
  onNoteOn: (note: string) => void
}) {
  const [player] = useState(() => new MidiOutput(onNoteOn))
  const [enabled, setEnabled] = useState(false)
  const [permission, setPermission] = useState('Not requested')
  const [outputs, setOutputs] = useState<MIDIOutput[]>([])
  const [selected, setSelected] = useState('')
  const [outputStatus, setOutputStatus] = useState('MIDI disabled')
  const access = useRef<MIDIAccess | null>(null)
  const output = useRef<MIDIOutput | null>(null)
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])

  const detach = useCallback(() => {
    output.current = null
    setSelected('')
    player.setOutput(null)
  }, [player])
  const fail = useCallback((error: unknown) => {
    try { detach() } catch {}
    setOutputStatus(`MIDI error: ${error instanceof Error ? error.message : String(error)}`)
    if (error instanceof DOMException && error.name === 'SecurityError') setPermission('Denied or revoked')
  }, [detach])

  useEffect(() => {
    register((state, thumb = false) => {
      try { if (!document.hidden) player.play(state, thumb) } catch (error) { fail(error) }
    })
    const stop = () => {
      try { player.stop() } catch (error) { fail(error) }
    }
    const visibility = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', stop)
    window.addEventListener('beforeunload', stop)
    return () => {
      invalidate()
      register(() => {})
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', stop)
      window.removeEventListener('beforeunload', stop)
      if (access.current) access.current.onstatechange = null
      try { player.setOutput(null) } catch {}
    }
  }, [register, player, fail, invalidate])

  const enable = async () => {
    if (!window.isSecureContext) {
      setPermission('Unavailable: open the trainer on http://localhost:5173 or HTTPS')
      return
    }
    if (!navigator.requestMIDIAccess) {
      setPermission('Web MIDI unsupported in this browser')
      return
    }
    const request = ++generation.current
    setPermission('Requesting MIDI access…')
    try {
      const midi = await navigator.requestMIDIAccess({ sysex: false })
      if (request !== generation.current) return
      access.current = midi
      setEnabled(true)
      setPermission('Granted (no SysEx)')
      const refresh = () => {
        const available = [...midi.outputs.values()].filter(port => port.state === 'connected')
        setOutputs(available)
        if (output.current?.state === 'disconnected') {
          invalidate()
          try { detach() } catch (error) { fail(error) }
          setOutputStatus('Output disconnected · select an output again')
        } else if (!output.current) {
          setOutputStatus(available.length ? 'Select a MIDI output' : 'No MIDI outputs available')
        }
      }
      midi.onstatechange = refresh
      refresh()
    } catch (error) {
      if (request !== generation.current) return
      setPermission(`Denied or unavailable: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const disable = () => {
    invalidate()
    if (access.current) access.current.onstatechange = null
    access.current = null
    try {
      detach()
      setOutputStatus('MIDI disabled')
    } catch (error) { fail(error) }
    setEnabled(false)
    setOutputs([])
  }

  const choose = async (id: string) => {
    const request = ++generation.current
    try {
      detach()
      if (!id) { setOutputStatus('No output selected'); return }
      const port = access.current?.outputs.get(id)
      if (!port || port.state !== 'connected') throw new Error('Output unavailable')
      setSelected(id)
      setOutputStatus('Opening MIDI output…')
      await port.open()
      if (request !== generation.current) return
      if (port.state !== 'connected') throw new Error('Output disconnected')
      output.current = port
      player.setOutput(port)
      setOutputStatus(`Connected: ${port.name || port.id} · channel 1 · velocity 100`)
    } catch (error) {
      if (request === generation.current) fail(error)
    }
  }

  return <section className="midi-panel" aria-label="MIDI output">
    <button type="button" onClick={enabled ? disable : enable} disabled={permission === 'Requesting MIDI access…'}>
      {enabled ? 'Disable MIDI' : 'Enable MIDI'}
    </button>
    <label>MIDI output <select value={selected} disabled={!enabled} onChange={event => void choose(event.target.value)}>
      <option value="">Select output…</option>
      {outputs.map(port => <option key={port.id} value={port.id}>{port.name || port.id}</option>)}
    </select></label>
    <p role="status">Permission: {permission} · {outputStatus}</p>
  </section>
}
