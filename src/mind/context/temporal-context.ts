export const ARNA_TIME_ZONE = 'Asia/Almaty';

export type InterpretThoughtTemporalContext = {
  currentLocalDate: string;
  currentLocalDateTime: string;
  timeZone: typeof ARNA_TIME_ZONE;
  currentWeekday: string;
};

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = parts.find((part) => part.type === type)?.value;

  if (!value) {
    throw new Error('Unable to calculate local temporal context.');
  }

  return value;
}

function formatOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffset / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (absoluteOffset % 60).toString().padStart(2, '0');

  return `${sign}${hours}:${minutes}`;
}

export function formatDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}`;
}

export function createInterpretThoughtTemporalContext(
  now = new Date(),
): InterpretThoughtTemporalContext {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ARNA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'long',
  }).formatToParts(now);
  const year = getPart(parts, 'year');
  const month = getPart(parts, 'month');
  const day = getPart(parts, 'day');
  const hour = getPart(parts, 'hour');
  const minute = getPart(parts, 'minute');
  const second = getPart(parts, 'second');
  const localTimestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const currentTimestamp = Math.floor(now.getTime() / 1000) * 1000;
  const offsetMinutes = Math.round(
    (localTimestamp - currentTimestamp) / 60_000,
  );
  const currentLocalDate = `${year}-${month}-${day}`;

  return {
    currentLocalDate,
    currentLocalDateTime: `${currentLocalDate}T${hour}:${minute}:${second}${formatOffset(offsetMinutes)}`,
    timeZone: ARNA_TIME_ZONE,
    currentWeekday: getPart(parts, 'weekday'),
  };
}
