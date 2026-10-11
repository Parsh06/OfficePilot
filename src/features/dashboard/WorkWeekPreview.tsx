import React from 'react';
import { Card } from '@/components/ui/card';
import { useScheduleStore } from '@/stores/scheduleStore';
import { NavLink } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WorkWeekPreview: React.FC = () => {
  const schedules = useScheduleStore((s) => s.schedules);

  // Get current week's 7 days (Mon-Sun)
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const distanceToMonday = (currentDayOfWeek + 6) % 7;
  
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - distanceToMonday + i);
    const dateStr = d.toISOString().split('T')[0];
    const sched = schedules.find((s) => s.date === dateStr);
    const isToday = dateStr === now.toISOString().split('T')[0];

    return {
      date: d,
      dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      mode: sched?.mode || (d.getDay() === 0 || d.getDay() === 6 ? 'LEAVE' : 'WFH'),
      location: sched?.location,
      isToday,
    };
  });

  return (
    <Card variant="elevated" className="p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current Week Schedule
            </span>
          </div>
          <NavLink
            to="/plan/calendar"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-medium transition-colors"
          >
            Full Calendar <ArrowUpRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        {/* 7-day pill row */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                'flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all',
                day.isToday
                  ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50'
                  : 'border-slate-800/80 bg-[#0e111a] hover:border-slate-700'
              )}
            >
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                {day.dayName}
              </span>
              <span
                className={cn(
                  'text-sm font-bold my-1',
                  day.isToday ? 'text-indigo-300' : 'text-slate-200'
                )}
              >
                {day.dayNumber}
              </span>

              {/* Mode indicator pill */}
              <div className="mt-1 w-full flex justify-center">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    day.mode === 'WFO' && 'bg-blue-400 shadow-sm shadow-blue-400/50',
                    day.mode === 'WFH' && 'bg-emerald-400',
                    day.mode === 'TRAVEL' && 'bg-amber-400',
                    day.mode === 'LEAVE' && 'bg-purple-400',
                    day.mode === 'HOLIDAY' && 'bg-rose-400'
                  )}
                  title={`${day.dayName}: ${day.mode}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> WFO (Office)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> WFH (Remote)
          </span>
        </div>
        <span className="text-slate-500">Tap day on calendar to edit</span>
      </div>
    </Card>
  );
};
