export interface WeekPeriod {
  id: string;
  label: string;
  weekNumber: number;
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  dateRangeDisplay: string;
}

export interface MonthOption {
  key: string; // e.g. '2024-05'
  year: number;
  monthIndex: number; // 0 to 11
  monthNumber: number; // 1 to 12
  label: string; // e.g. 'Mei 2024'
  monthName: string;
}

export const MONTH_NAMES_FULL = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des'
];

const pad = (n: number): string => n.toString().padStart(2, '0');

/**
 * Calculates weeks for a specific month based on the business rule:
 * Week 1 begins on the first Monday of that month (not on the 1st of the month).
 * Complexity: O(1) time and space (maximum 5 weeks per month).
 */
export const getWeeksForMonth = (year: number, monthIndex: number): WeekPeriod[] => {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  // 0: Sunday, 1: Monday, ..., 6: Saturday
  const firstMondayDate = firstDay === 1 ? 1 : 1 + ((8 - firstDay) % 7);

  const weeks: WeekPeriod[] = [];
  let weekNumber = 1;
  let currentMonday = new Date(year, monthIndex, firstMondayDate);

  while (currentMonday.getMonth() === monthIndex) {
    const sunday = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate() + 6
    );

    const startDayStr = pad(currentMonday.getDate());
    const endDayStr = pad(sunday.getDate());
    const startMonthStr = MONTH_NAMES_SHORT[currentMonday.getMonth()];
    const endMonthStr = MONTH_NAMES_SHORT[sunday.getMonth()];
    const yearStr = sunday.getFullYear();

    let dateRangeDisplay = '';
    if (currentMonday.getMonth() === sunday.getMonth()) {
      dateRangeDisplay = `${startDayStr} - ${endDayStr} ${startMonthStr} ${yearStr}`;
    } else {
      dateRangeDisplay = `${startDayStr} ${startMonthStr} - ${endDayStr} ${endMonthStr} ${yearStr}`;
    }

    const label = `${dateRangeDisplay} (Minggu ${weekNumber})`;
    const id = `${year}-${pad(monthIndex + 1)}-w${weekNumber}`;

    weeks.push({
      id,
      label,
      weekNumber,
      weekLabel: `Minggu ${weekNumber}`,
      startDate: new Date(currentMonday),
      endDate: new Date(sunday),
      dateRangeDisplay
    });

    currentMonday = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate() + 7
    );
    weekNumber += 1;
  }

  return weeks;
};

/**
 * Generates month list grouped or ordered for selection.
 * From startYear up to current or target year.
 */
export const getAvailableMonths = (
  startYear: number = 2024,
  endYear: number = new Date().getFullYear(),
  endMonthIndex?: number
): { years: number[]; monthsByYear: Record<number, MonthOption[]> } => {
  const now = new Date();
  const targetEndYear = Math.max(startYear, endYear);
  const targetEndMonthIndex =
    endMonthIndex !== undefined
      ? endMonthIndex
      : targetEndYear === now.getFullYear()
      ? now.getMonth()
      : 11;

  const years: number[] = [];
  const monthsByYear: Record<number, MonthOption[]> = {};

  // Descending year order (latest years first)
  for (let y = targetEndYear; y >= startYear; y -= 1) {
    years.push(y);
    monthsByYear[y] = [];

    const maxMonth = y === targetEndYear ? targetEndMonthIndex : 11;
    // Descending month order (latest months first)
    for (let m = maxMonth; m >= 0; m -= 1) {
      const key = `${y}-${pad(m + 1)}`;
      monthsByYear[y].push({
        key,
        year: y,
        monthIndex: m,
        monthNumber: m + 1,
        label: `${MONTH_NAMES_FULL[m]} ${y}`,
        monthName: MONTH_NAMES_FULL[m]
      });
    }
  }

  return { years, monthsByYear };
};

