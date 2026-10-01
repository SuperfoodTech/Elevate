import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check, X } from 'lucide-react';
import {
  getAvailableMonths,
  getWeeksForMonth,
  MONTH_NAMES_FULL,
  type WeekPeriod
} from '../../utils/periodHelper';

export interface PeriodFilterValue {
  type: 'all' | 'month' | 'week';
  monthKey: string;
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

export const TransactionPeriodPicker: React.FC<TransactionPeriodPickerProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Available months grouped by year (2024 to 2026)
  const availableMonthsData = useMemo(() => getAvailableMonths(2024, 2026), []);

  // Internal month view for the popover (defaults to value.monthKey or '2026-08')
  const [activeMonthKey, setActiveMonthKey] = useState<string>(value.monthKey || '2026-08');

  // Compute year and monthIndex from activeMonthKey
  const [activeYear, activeMonthIndex] = useMemo(() => {
    const [y, m] = activeMonthKey.split('-').map((v) => parseInt(v, 10));
    return [y, m - 1];
  }, [activeMonthKey]);

  // Compute available weeks for the active month
  const availableWeeks = useMemo(() => {
    return getWeeksForMonth(activeYear, activeMonthIndex);
  }, [activeYear, activeMonthIndex]);

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

  const handleSelectAll = () => {
    onChange({
      type: 'all',
      monthKey: activeMonthKey,
      label: 'Semua Periode',
      startDate: undefined,
      endDate: undefined
    });
    setIsOpen(false);
  };

  const handleSelectFullMonth = () => {
    const monthName = MONTH_NAMES_FULL[activeMonthIndex] || '';
    const start = new Date(activeYear, activeMonthIndex, 1, 0, 0, 0, 0);
    const end = new Date(activeYear, activeMonthIndex + 1, 0, 23, 59, 59, 999);

    onChange({
      type: 'month',
      monthKey: activeMonthKey,
      label: `${monthName} ${activeYear}`,
      startDate: start,
      endDate: end
    });
    setIsOpen(false);
  };

  const handleSelectWeek = (week: WeekPeriod) => {
    const start = new Date(week.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(week.endDate);
    end.setHours(23, 59, 59, 999);

    onChange({
      type: 'week',
      monthKey: activeMonthKey,
      weekId: week.id,
      label: `${week.dateRangeDisplay} (${week.weekLabel})`,
      startDate: start,
      endDate: end
    });
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent min-w-[210px] text-left transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate font-medium">{value.label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-900">Pilih Periode Tanggal</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 rounded p-0.5"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Month & Year Select */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Bulan &amp; Tahun
            </label>
            <div className="relative">
              <select
                value={activeMonthKey}
                onChange={(e) => setActiveMonthKey(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-xs font-semibold text-gray-800 cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {availableMonthsData.years.map((year) => (
                  <optgroup key={year} label={`Tahun ${year}`}>
                    {availableMonthsData.monthsByYear[year].map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1 mb-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors text-left ${
                value.type === 'all'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Semua Periode (Tanpa Filter)</span>
              {value.type === 'all' && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </button>

            <button
              type="button"
              onClick={handleSelectFullMonth}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors text-left ${
                value.type === 'month' && value.monthKey === activeMonthKey
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Seluruh Bulan ({MONTH_NAMES_FULL[activeMonthIndex]} {activeYear})</span>
              {value.type === 'month' && value.monthKey === activeMonthKey && (
                <Check className="w-3.5 h-3.5 text-blue-600" />
              )}
            </button>
          </div>

          {/* List of Weeks for the Active Month */}
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Pilihan Mingguan
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {availableWeeks.map((week) => {
                const isSelected =
                  value.type === 'week' &&
                  value.monthKey === activeMonthKey &&
                  value.weekId === week.id;

                return (
                  <button
                    key={week.id}
                    type="button"
                    onClick={() => handleSelectWeek(week)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left border ${
                      isSelected
                        ? 'border-blue-200 bg-blue-50/70 text-blue-800 font-semibold'
                        : 'border-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-gray-900 block">{week.weekLabel}</span>
                      <span className="text-[11px] text-gray-500">{week.dateRangeDisplay}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
