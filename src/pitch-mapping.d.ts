export type MappingName = 'Candidate 1' | 'Finger Roll'
export function pitchForState(state: number, thumb?: boolean, baseOctave?: number, mapping?: MappingName): string
export const fingeringMappings: Record<MappingName, typeof majorScaleMapping>
export const majorScaleMapping: ReadonlyArray<{ state: number; note: string }>
