export function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey() {
  return dayKey(new Date())
}

export function formatSeconds(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}
