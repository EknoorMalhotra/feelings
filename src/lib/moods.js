// Ported verbatim from the HTML prototype's moodConfig() — terracotta / amber / olive.
export const MOODS = [
  { value: 1, label: 'Low', color: '#C77B6E', iconPath: 'M20,34 L44,34' },
  { value: 2, label: 'Good', color: '#D9A02E', iconPath: 'M18,28 Q32,42 46,28' },
  {
    value: 3,
    label: 'Great',
    color: '#79934A',
    iconPath: 'M17,26 Q32,46 47,26 Q32,35 17,26 Z',
  },
]

export function moodConfig(value) {
  return MOODS.find((m) => m.value === value) ?? null
}
