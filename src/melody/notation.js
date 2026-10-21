export function notationPitch(pitch) {
  const match = /^([A-G])([#b]?)([3-6])$/.exec(pitch)
  if (!match) throw new Error(`Unsupported demonstration pitch: ${pitch}`)
  const [, letter, accidental, octave] = match
  return { key: `${letter.toLowerCase()}${accidental}/${octave}`,
    accidental: accidental || 'n', label: `${letter}${accidental.replace('#', '♯').replace('b', '♭')}${octave}` }
}
