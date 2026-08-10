// Ported verbatim from the HTML prototype's getTimeConfig()/getTimeKeyForHour().
export function getTimeKeyForHour(hour) {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'noon'
  return 'evening'
}

const TIME_CONFIGS = {
  morning: {
    greeting: 'Good morning',
    textColor: '#FBF1DD',
    background:
      'radial-gradient(48% 40% at 78% 10%, rgba(255,227,170,0.55), transparent 60%), radial-gradient(40% 34% at 30% 42%, rgba(224,140,150,0.3), transparent 62%), radial-gradient(52% 45% at 12% 68%, rgba(214,90,55,0.32), transparent 60%), radial-gradient(45% 40% at 58% 96%, rgba(110,55,18,0.45), transparent 55%), linear-gradient(160deg, #E8B24A 0%, #C9861F 45%, #7A4212 100%)',
  },
  noon: {
    greeting: 'Good afternoon',
    textColor: '#FBEAE3',
    background:
      'radial-gradient(48% 40% at 76% 8%, rgba(255,200,158,0.5), transparent 60%), radial-gradient(40% 34% at 34% 38%, rgba(255,206,90,0.32), transparent 60%), radial-gradient(52% 45% at 10% 62%, rgba(230,140,70,0.35), transparent 60%), radial-gradient(45% 40% at 60% 96%, rgba(58,14,14,0.5), transparent 55%), linear-gradient(160deg, #D9603D 0%, #A8342A 45%, #4A1210 100%)',
  },
  evening: {
    greeting: 'Good evening',
    textColor: '#EAF1F4',
    background:
      'radial-gradient(48% 38% at 76% 8%, rgba(206,236,230,0.4), transparent 60%), radial-gradient(40% 34% at 32% 40%, rgba(60,190,170,0.32), transparent 60%), radial-gradient(52% 45% at 12% 62%, rgba(70,130,140,0.38), transparent 60%), radial-gradient(45% 40% at 58% 96%, rgba(10,20,28,0.55), transparent 55%), linear-gradient(160deg, #3E7A82 0%, #2B4A5E 45%, #10202B 100%)',
  },
}

export function getTimeConfig(key) {
  return TIME_CONFIGS[key]
}
