export function nowIso() {
  return new Date().toISOString();
}

export function startOfDay(input: string | Date) {
  const value = new Date(input);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function formatRelativeTimeLabel(minutesAgo: number) {
  if (minutesAgo === 0) {
    return 'Now';
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hours = Math.floor(minutesAgo / 60);

  return `${hours}h ago`;
}

export function formatDisplayDate(input: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(input));
}

export function formatDisplayTime(input: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(input));
}

export function formatDateTimeLocalValue(input: Date | string) {
  const value = new Date(input);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function addMinutes(input: Date, minutes: number) {
  return new Date(input.getTime() + minutes * 60_000);
}

export function eachRecentDay(totalDays: number, anchor = new Date()) {
  const days: Date[] = [];

  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const value = new Date(anchor);
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() - offset);
    days.push(value);
  }

  return days;
}
