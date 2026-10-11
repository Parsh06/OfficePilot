import React, { useState } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkModeBadge } from '@/components/ui/work-mode-badge';
import { useScheduleStore } from '@/stores/scheduleStore';
import { formatDate } from '@/lib/utils';
import {
  Building2,
  Home,
  Palmtree,
  CalendarHeart,
  Plane,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BedDouble,
  Coffee,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { LeaveCategory } from '@/lib/scheduleEngine';

interface DayScheduleDrawerProps {
  date: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

export const DayScheduleDrawer: React.FC<DayScheduleDrawerProps> = ({
  date,
  open,
  onOpenChange,
}) => {
  const getResolvedDay = useScheduleStore((s) => s.getResolvedDay);
  const addOrUpdateException = useScheduleStore((s) => s.addOrUpdateException);
  const resetDayToNormal = useScheduleStore((s) => s.resetDayToNormal);

  const [activeTab, setActiveTab] = useState<'quick' | 'leave' | 'holiday' | 'custom'>('quick');
  const [leaveCategory, setLeaveCategory] = useState<LeaveCategory>('CASUAL');
  const [leaveReason, setLeaveReason] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!date) return null;

  const resolved = getResolvedDay(date);

  const handleSetQuickMode = async (mode: 'WFO' | 'WFH' | 'OFF') => {
    setSaving(true);
    try {
      if (mode === 'WFO') {
        await addOrUpdateException({
          date,
          type: 'EXPLICIT_WFO_OVERRIDE',
          resolvedMode: 'WFO',
          reason: 'Manual WFO override',
          source: 'USER',
        });
      } else if (mode === 'WFH') {
        await addOrUpdateException({
          date,
          type: 'EXPLICIT_WFH_OVERRIDE',
          resolvedMode: 'WFH',
          reason: 'Manual WFH override',
          source: 'USER',
        });
      } else {
        await addOrUpdateException({
          date,
          type: 'EXPLICIT_OFF_OVERRIDE',
          resolvedMode: 'OFF',
          reason: 'Manual day off override',
          source: 'USER',
        });
      }
      toast.success(`Updated ${formatDate(date)} to ${mode}`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to update work mode.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLeave = async () => {
    setSaving(true);
    try {
      await addOrUpdateException({
        date,
        type: 'LEAVE',
        resolvedMode: 'LEAVE',
        leaveType: leaveCategory,
        reason: leaveReason || `${leaveCategory} Leave`,
        source: 'USER',
        status: 'APPROVED',
      });
      toast.success(`Recorded ${leaveCategory} leave for ${formatDate(date)}`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to record leave.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayName.trim()) {
      toast.error('Please specify a holiday name.');
      return;
    }
    setSaving(true);
    try {
      await addOrUpdateException({
        date,
        type: 'HOLIDAY',
        resolvedMode: 'HOLIDAY',
        holidayName: holidayName.trim(),
        source: 'USER',
      });
      toast.success(`Added holiday "${holidayName}" on ${formatDate(date)}`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to add holiday.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await resetDayToNormal(date);
      toast.info(`Reset ${formatDate(date)} to baseline normal schedule (${resolved.baseMode})`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to reset schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-3">
            <span>{formatDate(date)}</span>
            <span className="text-xs font-semibold text-slate-400 capitalize">({resolved.dayOfWeek})</span>
          </div>
          <WorkModeBadge mode={resolved.resolvedMode as any} size="sm" />
        </div>
      }
      description="Inspect schedule resolution, override attendance, and manage holidays or leaves."
      footer={
        <div className="flex items-center justify-between w-full">
          {resolved.isOverridden ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={handleReset}
              className="text-slate-400 hover:text-white gap-1.5 border-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Baseline ({resolved.baseMode})</span>
            </Button>
          ) : (
            <span className="text-[11px] text-slate-500">Following baseline weekly pattern</span>
          )}
          <Button type="button" variant="default" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Conflict / Requires Planning Alert Banner */}
        {resolved.conflict && (
          <div
            data-testid="conflict-alert-banner"
            className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-950/30 flex items-start gap-3 animate-in fade-in"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-amber-200">Schedule Conflict Detected</p>
              <p className="text-amber-300/90 text-[11px] leading-relaxed">
                {resolved.conflictMessage || 'This date has an attendance conflict that may require rescheduling.'}
              </p>
            </div>
          </div>
        )}

        {/* Schedule Resolution Overview Card */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#0e111a] space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">Baseline Normal Mode:</span>
            <span className="font-bold text-slate-200">{resolved.baseMode}</span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">Resolved State:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{resolved.resolvedMode}</span>
              {resolved.isOverridden && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Override Active
                </span>
              )}
            </div>
          </div>

          {/* Holiday Details */}
          {resolved.holiday && (
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CalendarHeart className="w-3.5 h-3.5 text-rose-400" />
                <span>Holiday:</span>
              </span>
              <span className="font-semibold text-rose-300">{resolved.holiday.name}</span>
            </div>
          )}

          {/* Leave Details */}
          {resolved.leave && (
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-purple-400" />
                <span>Leave ({resolved.leave.type}):</span>
              </span>
              <span className="font-semibold text-purple-300">{resolved.leave.reason || 'Approved Leave'}</span>
            </div>
          )}

          {/* Transit & Stay */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Plane className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transit: {resolved.resolvedMode === 'TRAVEL' ? 'In Corridor' : 'None'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <BedDouble className="w-3.5 h-3.5 text-purple-400" />
              <span>Overnight: {resolved.hasOvernightStay ? 'Hotel Stay' : 'Home'}</span>
            </div>
          </div>
        </div>

        {/* Action Tabs Header */}
        <div className="flex rounded-xl p-1 bg-[#0a0d16] border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={cn(
              'flex-1 py-1.5 rounded-lg font-semibold transition-all',
              activeTab === 'quick' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Quick Mode
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leave')}
            className={cn(
              'flex-1 py-1.5 rounded-lg font-semibold transition-all',
              activeTab === 'leave' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Add Leave
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('holiday')}
            className={cn(
              'flex-1 py-1.5 rounded-lg font-semibold transition-all',
              activeTab === 'holiday' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Add Holiday
          </button>
        </div>

        {/* TAB 1: Quick Mode Overrides */}
        {activeTab === 'quick' && (
          <div className="space-y-2.5 animate-in fade-in-50 duration-150">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Select Explicit Deviation
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSetQuickMode('WFO')}
                className={cn(
                  'p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all',
                  resolved.resolvedMode === 'WFO'
                    ? 'border-blue-500 bg-blue-950/40 text-blue-300'
                    : 'border-slate-800 bg-[#111420] text-slate-300 hover:border-slate-700'
                )}
              >
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Work Office (WFO)</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSetQuickMode('WFH')}
                className={cn(
                  'p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all',
                  resolved.resolvedMode === 'WFH'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                    : 'border-slate-800 bg-[#111420] text-slate-300 hover:border-slate-700'
                )}
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Remote (WFH)</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSetQuickMode('OFF')}
                className={cn(
                  'p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all',
                  resolved.resolvedMode === 'OFF'
                    ? 'border-slate-500 bg-slate-800 text-slate-200'
                    : 'border-slate-800 bg-[#111420] text-slate-300 hover:border-slate-700'
                )}
              >
                <Coffee className="w-4 h-4 text-slate-400" />
                <span>Day Off (OFF)</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Leave Form */}
        {activeTab === 'leave' && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-150">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Leave Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['CASUAL', 'SICK', 'PLANNED', 'OTHER'] as LeaveCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLeaveCategory(cat)}
                    className={cn(
                      'py-2 rounded-xl border text-[11px] font-bold transition-all',
                      leaveCategory === cat
                        ? 'border-purple-500 bg-purple-950/40 text-purple-200 shadow-sm'
                        : 'border-slate-800 bg-[#111420] text-slate-400 hover:border-slate-700'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Reason / Note (Optional)
              </label>
              <Input
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="e.g. Doctor appointment, family gathering..."
              />
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={saving}
              onClick={handleAddLeave}
              className="w-full h-10 gap-2 bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Palmtree className="w-4 h-4" />
              <span>Record Leave for this Date</span>
            </Button>
          </div>
        )}

        {/* TAB 3: Holiday Form */}
        {activeTab === 'holiday' && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-150">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Holiday Name
              </label>
              <Input
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="e.g. Independence Day, Diwali, Thanksgiving"
                required
              />
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={saving}
              onClick={handleAddHoliday}
              className="w-full h-10 gap-2 bg-rose-600 hover:bg-rose-500 text-white"
            >
              <CalendarHeart className="w-4 h-4" />
              <span>Add Observed Holiday</span>
            </Button>
          </div>
        )}

        {/* AI Recommendations Insight Banner */}
        <div className="p-3.5 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/30 to-purple-950/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-[11px]">AI Optimizer ready to evaluate batching for this week.</span>
          </div>
          <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-white text-[11px] h-7 px-2">
            <span>Optimize</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
