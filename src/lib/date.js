export function formatDateKey(date) {
  const value = new Date(date)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfWeek(date) {
  const value = new Date(date)
  const day = value.getDay()
  const diff = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + diff)
  value.setHours(0, 0, 0, 0)
  return value
}

export function addDays(date, days) {
  const value = new Date(date)
  value.setDate(value.getDate() + days)
  return value
}

export function getWeekDates(date = new Date()) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function getWeekRange(date = new Date()) {
  const start = startOfWeek(date)
  const end = addDays(start, 6)
  return { start, end }
}

export function formatWeekdayLabel(date, locale = 'hu-HU') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function isToday(dateKey) {
  return formatDateKey(new Date()) === dateKey
}
