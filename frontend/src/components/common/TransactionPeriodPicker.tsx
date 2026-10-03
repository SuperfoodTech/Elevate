import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check, RotateCcw } from 'lucide-react';
import {
  MONTH_NAMES_FULL,
  MONTH_NAMES_SHORT,
} from '../../utils/periodHelper';

export interface PeriodFilterValue {
  type: 'all' | 'month' | 'week' | 'custom';
  monthKey?: string;
  weekId?: string;
  label: string;
  startDate?: Date;
  endDate?: Date;
}

interface TransactionPeriodPickerProps {
  value: PeriodFilterValue;
  onChange: (val: PeriodFilterValue) => void;
  className?: string;
}

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function isSameDay(d1?: Date | null, d2?: Date | null): boolean {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isDateInRange(target: Date, start?: Date | null, end?: Date | null): boolean {
  if (!start || !end) return false;
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t >= Math.min(s, e) && t <= Math.max(s, e);
}

function formatRangeLabel(start?: Date, end?: Date): string {
  if (!start || !end) return 'Semua Periode';
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = MONTH_NAMES_SHORT[start.getMonth()];
  const endMonth = MONTH_NAMES_SHORT[end.getMonth()];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear === endYear && startMonth === endMonth && startDay === endDay) {
    return `${startDay} ${startMonth} ${startYear}`;
  }
  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
  }
  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
}

export const TransactionPeriodPicker: React.FC<TransactionPeriodPickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current view month & year (for navigation)
  const initialYear = value.startDate ? value.startDate.getFullYear() : 2026;
  const initialMonth = value.startDate ? value.startDate.getMonth() : 8; // September (0-indexed 8)
  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  // Temporary selection inside popover
  const [tempStart, setTempStart] = useState<Date | undefined>(value.startDate);
  const [tempEnd, setTempEnd] = useState<Date | undefined>(value.endDate);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Sync temp state when opening
  useEffect(() => {
    if (isOpen) {
      setTempStart(value.startDate);
      setTempEnd(value.endDate);
      if (value.startDate) {
        setViewYear(value.startDate.getFullYear());
        setViewMonth(value.startDate.getMonth());
      } else {
        setViewYear(2026);
        setViewMonth(8);
      }
    }
  }, [isOpen, value.startDate, value.endDate]);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate 42 calendar grid cells (Monday-based)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday
    const mondayBasedIndex = (dayOfWeek + 6) % 7; // 0 is Monday, 6 is Sunday

    const prevMonthLastDate = new Date(viewYear, viewMonth, 0).getDate();
    const currentMonthLastDate = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: {
      date: Date;
      isCurrentMonth: boolean;
      isPrevMonth: boolean;
      isNextMonth: boolean;
      dayNumber: number;
    }[] = [];

    // Previous month filler days
    for (let i = mondayBasedIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const prevDate = new Date(viewYear, viewMonth - 1, d);
      cells.push({
        date: prevDate,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
        dayNumber: d,
      });
    }

    // Current month days
    for (let d = 1; d <= currentMonthLastDate; d++) {
      const currentDate = new Date(viewYear, viewMonth, d);
      cells.push({
        date: currentDate,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
        dayNumber: d,
      });
    }

    // Next month filler days (to make total 42 cells = 6 full rows)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      cells.push({
        date: nextDate,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
        dayNumber: d,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Date click handler
  const handleDateClick = (clickedDate: Date) => {
    const d = new Date(clickedDate);

    // If no start date or both start and end are already selected, start a fresh range
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(d);
      setTempEnd(undefined);
    } else {
      // One date already picked, set the second date
      if (d.getTime() < tempStart.getTime()) {
        // Clicked date is earlier than start: make it start, previous start becomes end
        setTempEnd(new Date(tempStart.getFullYear(), tempStart.getMonth(), tempStart.getDate(), 23, 59, 59, 999));
        setTempStart(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
      } else {
        setTempEnd(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));
      }
    }
  };

  // Quick preset handlers
  const handleSelectPreset = (presetType: string) => {
    let start: Date | undefined;
    let end: Date | undefined;
    let label = '';

    if (presetType === 'all') {
      onChange({
        type: 'all',
        label: 'Semua Periode',
        startDate: undefined,
        endDate: undefined,
      });
      setIsOpen(false);
      return;
    }

    if (presetType === 'last7') {
      end = new Date(2026, 8, 30, 23, 59, 59, 999);
      start = new Date(2026, 8, 24, 0, 0, 0, 0);
      label = '24 - 30 Sep 2026 (7 Hari Terakhir)';
      setViewYear(2026);
      setViewMonth(8);
    } else if (presetType === 'last30') {
      end = new Date(2026, 8, 30, 23, 59, 59, 999);
      start = new Date(2026, 8, 1, 0, 0, 0, 0);
      label = 'September 2026 (30 Hari Terakhir)';
      setViewYear(2026);
      setViewMonth(8);
    } else if (presetType === 'august') {
      start = new Date(2026, 7, 1, 0, 0, 0, 0);
      end = new Date(2026, 7, 31, 23, 59, 59, 999);
      label = 'Agustus 2026';
      setViewYear(2026);
      setViewMonth(7);
    } else if (presetType === 'september') {
      start = new Date(2026, 8, 1, 0, 0, 0, 0);
      end = new Date(2026, 8, 30, 23, 59, 59, 999);
      label = 'September 2026';
      setViewYear(2026);
      setViewMonth(8);
    } else if (presetType === 'q3') {
      start = new Date(2026, 6, 1, 0, 0, 0, 0);
      end = new Date(2026, 8, 30, 23, 59, 59, 999);
      label = 'Kuartal 3 (Jul - Sep 2026)';
      setViewYear(2026);
      setViewMonth(8);
    } else if (presetType === 'all_ingest') {
      start = new Date(2026, 2, 1, 0, 0, 0, 0);
      end = new Date(2026, 8, 30, 23, 59, 59, 999);
      label = '1 Mar - 30 Sep 2026 (Semua Ingesti)';
      setViewYear(2026);
      setViewMonth(8);
    }

    if (start && end) {
      onChange({
        type: 'custom',
        label,
        startDate: start,
        endDate: end,
      });
      setIsOpen(false);
    }
  };

  // Apply custom selected range
  const handleApply = () => {
    if (!tempStart) {
      handleSelectPreset('all');
      return;
    }

    const start = new Date(tempStart.getFullYear(), tempStart.getMonth(), tempStart.getDate(), 0, 0, 0, 0);
    const end = tempEnd
      ? new Date(tempEnd.getFullYear(), tempEnd.getMonth(), tempEnd.getDate(), 23, 59, 59, 999)
      : new Date(tempStart.getFullYear(), tempStart.getMonth(), tempStart.getDate(), 23, 59, 59, 999);

    const actualStart = start.getTime() <= end.getTime() ? start : end;
    const actualEnd = start.getTime() <= end.getTime() ? end : start;

    const label = formatRangeLabel(actualStart, actualEnd);

    onChange({
      type: 'custom',
      label,
      startDate: actualStart,
      endDate: actualEnd,
    });
    setIsOpen(false);
  };

  // Reset to empty selection
  const handleReset = () => {
    setTempStart(undefined);
    setTempEnd(undefined);
    setHoverDate(null);
  };

  // Determine effective range for preview highlighting
  const effectiveStart = tempStart;
  const effectiveEnd = tempEnd || (tempStart && hoverDate ? hoverDate : undefined);
  const normalizedStart = effectiveStart && effectiveEnd ? (effectiveStart.getTime() <= effectiveEnd.getTime() ? effectiveStart : effectiveEnd) : effectiveStart;
  const normalizedEnd = effectiveStart && effectiveEnd ? (effectiveStart.getTime() <= effectiveEnd.getTime() ? effectiveEnd : effectiveStart) : effectiveEnd;

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent min-w-[220px] text-left transition-colors cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="truncate font-medium">{value.label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col md:flex-row w-[340px] md:w-[620px]">
          {/* Left Presets Sidebar */}
          <div className="w-full md:w-56 bg-gray-50/70 p-3.5 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Pilihan Cepat
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('all')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                    value.type === 'all'
                      ? 'bg-blue-100/70 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-200/60'
                  }`}
                >
                  <span>Semua Periode</span>
                  {value.type === 'all' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('last7')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200/60 transition-colors"
                >
                  7 Hari Terakhir
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('last30')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200/60 transition-colors"
                >
                  30 Hari Terakhir
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('september')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200/60 transition-colors"
                >
                  September 2026
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('august')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200/60 transition-colors"
                >
                  Agustus 2026
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('q3')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200/60 transition-colors"
                >
                  Kuartal 3 (Jul - Sep)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('all_ingest')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200/60 transition-colors"
                >
                  Semua Data Ingesti
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 mt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Pilihan</span>
              </button>
            </div>
          </div>

          {/* Right Calendar Section */}
          <div className="flex-1 p-4 flex flex-col justify-between">
            {/* Header: Month & Year Selector with Navigation */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <select
                    value={viewMonth}
                    onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                    className="font-bold text-sm text-gray-900 bg-transparent hover:bg-gray-100 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {MONTH_NAMES_FULL.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewYear}
                    onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                    className="font-bold text-sm text-gray-900 bg-transparent hover:bg-gray-100 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {[2024, 2025, 2026].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                    aria-label="Bulan sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                    aria-label="Bulan berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Names Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAY_NAMES.map((day) => (
                  <span key={day} className="text-[11px] font-semibold text-gray-400 py-1">
                    {day}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div
                className="grid grid-cols-7 gap-y-1 text-center"
                onMouseLeave={() => setHoverDate(null)}
              >
                {calendarCells.map((cell, idx) => {
                  const isStart = isSameDay(cell.date, normalizedStart);
                  const isEnd = isSameDay(cell.date, normalizedEnd);
                  const isSingle = isStart && isEnd;
                  const inRange = isDateInRange(cell.date, normalizedStart, normalizedEnd);

                  let wrapperBg = '';
                  if (inRange && !isSingle) {
                    wrapperBg = 'bg-blue-50 ';
                  }
                  if (isStart && !isSingle) {
                    wrapperBg += 'rounded-l-lg ';
                  }
                  if (isEnd && !isSingle) {
                    wrapperBg += 'rounded-r-lg ';
                  }

                  let buttonClasses = 'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium cursor-pointer transition-colors ';
                  if (isStart || isEnd) {
                    buttonClasses += 'bg-[#2563EB] text-white font-bold shadow-sm hover:bg-blue-700 ';
                  } else if (inRange) {
                    buttonClasses += 'text-blue-900 hover:bg-blue-100 font-semibold ';
                  } else if (!cell.isCurrentMonth) {
                    buttonClasses += 'text-gray-300 hover:text-gray-500 hover:bg-gray-50 ';
                  } else {
                    buttonClasses += 'text-gray-800 hover:bg-gray-100 ';
                  }

                  return (
                    <div
                      key={idx}
                      className={`${wrapperBg} flex items-center justify-center`}
                      onMouseEnter={() => {
                        if (tempStart && !tempEnd) {
                          setHoverDate(cell.date);
                        }
                      }}
                      onClick={() => handleDateClick(cell.date)}
                    >
                      <button
                        type="button"
                        className={buttonClasses}
                        aria-label={cell.date.toDateString()}
                      >
                        {cell.dayNumber}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Footer: Status and Action Buttons */}
            <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="text-xs text-gray-500 truncate">
                {tempStart ? (
                  <span>
                    <span className="font-semibold text-gray-800">
                      {formatRangeLabel(tempStart, tempEnd || tempStart)}
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-400">Pilih rentang tanggal</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
