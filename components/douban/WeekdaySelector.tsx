'use client';

import { useEffect, useState } from 'react';

interface WeekdaySelectorProps {
  onWeekdayChange: (weekday: string) => void;
}

const WEEKDAYS = [
  { value: 'Mon', label: '周一' },
  { value: 'Tue', label: '周二' },
  { value: 'Wed', label: '周三' },
  { value: 'Thu', label: '周四' },
  { value: 'Fri', label: '周五' },
  { value: 'Sat', label: '周六' },
  { value: 'Sun', label: '周日' },
];

function getTodayWeekday(): string {
  const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return weekdayMap[new Date().getDay()];
}

/**
 * 星期选择器（移植自 LunaTV WeekdaySelector），用于动漫「每日放送」。
 */
export function WeekdaySelector({ onWeekdayChange }: WeekdaySelectorProps) {
  const [selectedWeekday, setSelectedWeekday] = useState<string>(getTodayWeekday);

  useEffect(() => {
    onWeekdayChange(getTodayWeekday());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="inline-flex gap-1 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1 overflow-x-auto">
      {WEEKDAYS.map((weekday) => {
        const isActive = selectedWeekday === weekday.value;

        return (
          <button
            key={weekday.value}
            type="button"
            onClick={() => {
              setSelectedWeekday(weekday.value);
              onWeekdayChange(weekday.value);
            }}
            className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)]'
            }`}
          >
            {weekday.label}
          </button>
        );
      })}
    </div>
  );
}
