const INDO_MONTH_MAP = new Map<string, number>([
  ['jan', 0], ['januari', 0],
  ['feb', 1], ['februari', 1],
  ['mar', 2], ['maret', 2],
  ['apr', 3], ['april', 3],
  ['mei', 4],
  ['jun', 5], ['juni', 5],
  ['jul', 6], ['juli', 6],
  ['agu', 7], ['agt', 7], ['agustus', 7],
  ['sep', 8], ['september', 8],
  ['okt', 9], ['oktober', 9],
  ['nov', 10], ['november', 10],
  ['des', 11], ['desember', 11]
]);

export function parseTransactionDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  const matchIndo = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (matchIndo) {
    const day = parseInt(matchIndo[1], 10);
    const mStr = matchIndo[2].toLowerCase();
    const month = INDO_MONTH_MAP.get(mStr);
    const year = parseInt(matchIndo[3], 10);
    const hour = matchIndo[4] ? parseInt(matchIndo[4], 10) : 0;
    const min = matchIndo[5] ? parseInt(matchIndo[5], 10) : 0;
    const sec = matchIndo[6] ? parseInt(matchIndo[6], 10) : 0;
    if (month !== undefined) {
      return new Date(year, month, day, hour, min, sec);
    }
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}):(\d{2}))?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const sec = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function isWithinDateRange(
  targetDate: Date | null | undefined,
  startDate?: Date | null,
  endDate?: Date | null
): boolean {
  if (!targetDate) return false;
  const time = targetDate.getTime();

  if (startDate) {
    const startBoundary = new Date(startDate);
    startBoundary.setHours(0, 0, 0, 0);
    if (time < startBoundary.getTime()) return false;
  }

  if (endDate) {
    const endBoundary = new Date(endDate);
    endBoundary.setHours(23, 59, 59, 999);
    if (time > endBoundary.getTime()) return false;
  }

  return true;
}
