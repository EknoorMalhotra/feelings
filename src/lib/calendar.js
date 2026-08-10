import { moodConfig } from './moods'
import { pad, daysInMonth, todayKey } from './dateUtils'

// Groups entries by day, each list sorted most-recent-first.
export function groupEntriesByDay(entries) {
  const byDay = new Map()
  for (const entry of entries) {
    const list = byDay.get(entry.day) ?? []
    list.push(entry)
    byDay.set(entry.day, list)
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  return byDay
}

// Builds `monthsShown` calendar month blocks, most recent month first.
// Each day cell carries that day's entries (most-recent-first) so the
// calendar dot can reflect the most recent entry's mood when multiple
// entries exist for the same day.
export function buildMonthBlocks(entries, monthsShown) {
  const byDay = groupEntriesByDay(entries)
  const now = new Date()
  const today = todayKey()
  const blocks = []

  for (let i = 0; i < monthsShown; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = monthDate.getFullYear()
    const monthIndex = monthDate.getMonth()
    const label = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    const firstDow = new Date(year, monthIndex, 1).getDay()
    const totalDays = daysInMonth(year, monthIndex)

    const cells = []
    for (let k = 0; k < firstDow; k++) cells.push(null)
    for (let d = 1; d <= totalDays; d++) {
      const key = `${year}-${pad(monthIndex + 1)}-${pad(d)}`
      const dayEntries = byDay.get(key) ?? []
      const latest = dayEntries[0] ?? null
      const isToday = key === today
      cells.push({
        day: d,
        key,
        dayEntries,
        latest,
        moodCfg: latest ? moodConfig(latest.mood) : null,
        isToday,
      })
    }
    while (cells.length % 7 !== 0) cells.push(null)
    blocks.push({ label, cells })
  }

  return blocks
}
