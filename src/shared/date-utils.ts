export type DateKey = `${number}-${number}-${number}`;

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatLocalDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}` as DateKey;
}

export function getTodayKey(now = new Date()): DateKey {
  return formatLocalDateKey(now);
}

export function addDaysToKey(dateKey: DateKey | string, days: number): DateKey {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return formatLocalDateKey(date);
}
