import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkModeBadge } from '@/components/ui/work-mode-badge';
import { DayScheduleDrawer } from './DayScheduleDrawer';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useAuth } from '@/features/auth/useAuth';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Sparkles,
  AlertTriangle,
  Plane,
  BedDouble,
  LayoutGrid,
  Columns3,
  CalendarDays
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { ResolvedDaySchedule } from '@/lib/scheduleEngine';

export const PlanCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const normalSchedule = useScheduleStore((s) => s.normalSchedule);
  const currentMonth = useScheduleStore((s) => s.currentMonth);
  const setCurrentMonth = useScheduleStore((s) => s.setCurrentMonth);
  const viewMode = useScheduleStore((s) => s.viewMode);
  const setViewMode = useScheduleStore((s) => s.setViewMode);
  const getResolvedDay = useScheduleStore((s) => s.getResolvedDay);
  const getResolvedRange = useScheduleStore((s) => s.getResolvedRange);
  const getMonthlyMetrics = useScheduleStore((s) => s.getMonthlyMetrics);
  const fetchUserScheduleData = useScheduleStore((s) => s.fetchUserScheduleData);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchUserScheduleData(user.uid);
    }
  }, [user?.uid, fetchUserScheduleData]);

  // Month navigation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonth(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const prevWeek = new Date(currentMonth);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentMonth(prevWeek);
    } else {
      const prevDay = new Date(currentMonth);
      prevDay.setDate(prevDay.getDate() - 1);
      setCurrentMonth(prevDay);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const nextWeek = new Date(currentMonth);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentMonth(nextWeek);
    } else {
      const nextDay = new Date(currentMonth);
      nextDay.setDate(nextDay.getDate() + 1);
      setCurrentMonth(nextDay);
    }
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const currency = user?.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;

  // Monthly Metrics via Schedule Engine
  const metrics = getMonthlyMetrics(year, month);

  // Month Grid Calculation
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const paddingDaysBefore = (startDayOfWeek + 6) % 7; // Monday-first

  interface CalendarCell {
    dateObj: Date;
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    resolved: ResolvedDaySchedule;
  }

  const calendarCells: CalendarCell[] = [];

  // Previous month filler
  for (let i = paddingDaysBefore - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    const dateStr = d.toISOString().split('T')[0];
    calendarCells.push({
      dateObj: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      resolved: getResolvedDay(dateStr),
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month, d);
    const dateStr = dObj.toISOString().split('T')[0];
    calendarCells.push({
      dateObj: dObj,
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      resolved: getResolvedDay(dateStr),
    });
  }

  // Next month filler
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const dObj = new Date(year, month + 1, d);
    const dateStr = dObj.toISOString().split('T')[0];
    calendarCells.push({
      dateObj: dObj,
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      resolved: getResolvedDay(dateStr),
    });
  }

  // Week View Calculation
  const getWeekDays = (): ResolvedDaySchedule[] => {
    const curr = new Date(currentMonth);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
    const monday = new Date(curr.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const monStr = monday.toISOString().split('T')[0];
    const sunStr = sunday.toISOString().split('T')[0];
    return getResolvedRange(monStr, sunStr);
  };

  const weekDays = getWeekDays();

  const handleCellClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsDrawerOpen(true);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2.5">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <span>Hybrid Work Calendar</span>
          </h1>
          <p className="text-xs text-slate-400">
            Deterministic work mode resolution with exception overrides and conflict monitoring.
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex rounded-xl p-1 bg-[#111420] border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all',
                viewMode === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all',
                viewMode === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all',
                viewMode === 'day' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Day Detail</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs border-slate-800 bg-[#121520] hover:bg-slate-800"
          >
            Today
          </Button>

          <div className="flex items-center rounded-xl border border-slate-800 bg-[#121520]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Month Date & Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card variant="elevated" className="p-3 bg-[#10131f] border-slate-800/80 col-span-2 sm:col-span-2 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Period</p>
            <p className="text-base font-extrabold text-white">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-indigo-950/40 text-indigo-300 border border-indigo-500/30">
            {normalSchedule.timezone}
          </span>
        </Card>

        <Card variant="elevated" className="p-3 bg-[#10131f] border-slate-800/80 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In-Office (WFO)</p>
          <p className="text-lg font-black text-indigo-400">{metrics.wfoDays} Days</p>
          <p className="text-[10px] text-slate-500">{metrics.wfoPercentage}% compliance</p>
        </Card>

        <Card variant="elevated" className="p-3 bg-[#10131f] border-slate-800/80 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Remote (WFH)</p>
          <p className="text-lg font-black text-emerald-400">{metrics.wfhDays} Days</p>
          <p className="text-[10px] text-slate-500">{metrics.wfhPercentage}% remote</p>
        </Card>

        <Card variant="elevated" className="p-3 bg-[#10131f] border-slate-800/80 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leave / Holiday</p>
          <p className="text-lg font-black text-purple-400">{metrics.leaveDays + metrics.holidayDays} Days</p>
          <p className="text-[10px] text-slate-500">{metrics.holidayDays} hol / {metrics.leaveDays} leave</p>
        </Card>

        <Card
          variant="elevated"
          className={cn(
            'p-3 border text-center transition-all',
            metrics.conflictsCount > 0
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              : 'bg-[#10131f] border-slate-800/80 text-slate-400'
          )}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider">Conflicts</p>
          <p className="text-lg font-black text-amber-400">{metrics.conflictsCount}</p>
          <p className="text-[10px] text-amber-300/80">
            {metrics.conflictsCount > 0 ? 'Requires attention' : 'Zero conflicts'}
          </p>
        </Card>
      </div>

      {/* VIEW 1: MONTH VIEW */}
      {viewMode === 'month' && (
        <Card variant="elevated" className="p-4 sm:p-5 border-slate-800 bg-[#0d101a]/95">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800/80">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-slate-500">Sat</span>
            <span className="text-slate-500">Sun</span>
          </div>

          {/* Month Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, idx) => {
              const { dateStr, dayNumber, isCurrentMonth, resolved } = cell;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCellClick(dateStr)}
                  className={cn(
                    'min-h-[105px] sm:min-h-[115px] p-2 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 relative group outline-none',
                    !isCurrentMonth ? 'opacity-35 bg-[#090b10] border-slate-900' : 'bg-[#111420] border-slate-800/90 hover:border-indigo-500/60 hover:shadow-lg',
                    isToday && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#07090e]',
                    resolved.conflict && 'border-amber-500/50 bg-amber-950/15'
                  )}
                >
                  {/* Top Day Number & Status Icons */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        'text-xs font-black rounded-md px-1.5 py-0.5',
                        isToday ? 'bg-indigo-600 text-white' : 'text-slate-300 group-hover:text-white'
                      )}
                    >
                      {dayNumber}
                    </span>

                    <div className="flex items-center gap-1">
                      {resolved.conflict && (
                        <span title={resolved.conflictMessage || 'Conflict detected'}>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        </span>
                      )}
                      {resolved.hasOvernightStay && (
                        <span title="Overnight Stay / Hotel">
                          <BedDouble className="w-3.5 h-3.5 text-purple-400" />
                        </span>
                      )}
                      {resolved.resolvedMode === 'TRAVEL' && (
                        <span title="Travel Corridor">
                          <Plane className="w-3.5 h-3.5 text-indigo-400" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mode Badge Indicator */}
                  <div className="my-auto space-y-1">
                    <WorkModeBadge mode={resolved.resolvedMode as any} size="sm" />

                    {/* Sub-label for Holiday or Leave */}
                    {resolved.holiday && (
                      <p className="text-[10px] font-semibold text-rose-300 truncate max-w-[100px]">
                        {resolved.holiday.name}
                      </p>
                    )}
                    {resolved.leave && (
                      <p className="text-[10px] font-semibold text-purple-300 truncate max-w-[100px]">
                        {resolved.leave.type} Leave
                      </p>
                    )}
                  </div>

                  {/* Bottom Cost & Planning Flag */}
                  <div className="flex items-center justify-between w-full text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
                    {resolved.estimatedCost ? (
                      <span className="font-semibold text-slate-300 font-mono">
                        {currencySymbol}{resolved.estimatedCost}
                      </span>
                    ) : (
                      <span className="text-slate-600 font-mono">—</span>
                    )}

                    {resolved.isOverridden && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Schedule Override" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* VIEW 2: WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const isToday = day.date === todayStr;
            return (
              <Card
                key={day.date}
                variant="elevated"
                onClick={() => handleCellClick(day.date)}
                className={cn(
                  'p-4 space-y-4 border cursor-pointer transition-all hover:border-indigo-500/70 hover:shadow-xl',
                  isToday ? 'border-indigo-500 bg-[#121628]' : 'border-slate-800 bg-[#0e111a]',
                  day.conflict && 'border-amber-500/50 bg-amber-950/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-400 uppercase capitalize">{day.dayOfWeek}</p>
                    <p className="text-sm font-black text-white">{day.date}</p>
                  </div>
                  <WorkModeBadge mode={day.resolvedMode as any} size="sm" />
                </div>

                {/* Conflict Badge in Week View */}
                {day.conflict && (
                  <div className="p-2 rounded-xl border border-amber-500/30 bg-amber-950/40 flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="truncate">Conflict: Reschedule</span>
                  </div>
                )}

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Baseline:</span>
                    <span className="font-semibold">{day.baseMode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Working Day:</span>
                    <span className={day.isWorkingDay ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {day.isWorkingDay ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Estimated Transit:</span>
                    <span className="font-bold text-indigo-300">
                      {day.estimatedCost ? `${currencySymbol}${day.estimatedCost}` : '₹0'}
                    </span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full text-xs h-8">
                  Inspect Day
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* VIEW 3: DAY DETAIL VIEW */}
      {viewMode === 'day' && (
        <Card variant="elevated" className="p-6 space-y-6 border-slate-800 bg-[#0d101a] max-w-2xl mx-auto">
          {(() => {
            const activeDate = selectedDate || todayStr;
            const res = getResolvedDay(activeDate);

            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{formatDate(activeDate)}</h2>
                    <p className="text-xs text-slate-400 capitalize font-medium">{res.dayOfWeek} Schedule Resolution</p>
                  </div>
                  <WorkModeBadge mode={res.resolvedMode as any} size="lg" />
                </div>

                {res.conflict && (
                  <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-950/30 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-amber-200">Conflict / Requires Planning</p>
                      <p className="text-amber-300/90 text-[11px]">{res.conflictMessage}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-[#121520] space-y-1">
                    <p className="text-slate-400">Baseline Pattern:</p>
                    <p className="text-sm font-bold text-white">{res.baseMode}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-[#121520] space-y-1">
                    <p className="text-slate-400">Resolved Mode:</p>
                    <p className="text-sm font-bold text-indigo-300">{res.resolvedMode}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ai"
                  onClick={() => {
                    setSelectedDate(activeDate);
                    setIsDrawerOpen(true);
                  }}
                  className="w-full gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Modify Schedule or Add Exception</span>
                </Button>
              </div>
            );
          })()}
        </Card>
      )}

      {/* Day Schedule Drawer */}
      <DayScheduleDrawer
        date={selectedDate}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        currency={currency}
      />
    </div>
  );
};
