export interface DateFilterState {
  specificDate: string;
}

export const DEFAULT_DATE_FILTER: DateFilterState = {
  specificDate: '',
};

export const parseDateInput = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();

  // Support input from native <input type="date"> (yyyy-mm-dd)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  // Support ISO datetime strings (e.g. 2026-04-06T08:01:30.087Z)
  // by using only the date portion to avoid timezone day-shift in UI.
  const isoDateTimeMatch = /^(\d{4})-(\d{2})-(\d{2})T/.exec(trimmed);
  if (isoDateTimeMatch) {
    const year = Number(isoDateTimeMatch[1]);
    const month = Number(isoDateTimeMatch[2]);
    const day = Number(isoDateTimeMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  // Support explicit requested format m/d/yyyy (single or double digits)
  const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    const year = Number(usMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  return null;
};

const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const toIsoDate = (value?: string | null): string => {
  const parsed = parseDateInput(value);
  return parsed ? toDateKey(parsed) : '';
};

export const toDisplayDateMDY = (value?: string | null): string => {
  const parsed = parseDateInput(value);
  if (!parsed) return value?.trim() || '';
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
};

export const normalizeDateInput = (value?: string | null): string => {
  return toDisplayDateMDY(value);
};

export const matchDateFilter = (dateValue: string | undefined, filter: DateFilterState): boolean => {
  if (!filter.specificDate.trim()) return true;
  const target = parseDateInput(dateValue);
  const specific = parseDateInput(filter.specificDate);
  if (!target || !specific) return false;
  return toDateKey(target) === toDateKey(specific);
};
