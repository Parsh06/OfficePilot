import React from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuth } from '@/features/auth/useAuth';
import { Sparkles, Calendar } from 'lucide-react';

export const GreetingSection: React.FC = () => {
  const { user } = useAuth();
  const profile = useSettingsStore((s) => s.profile);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.displayName || profile.name || '';
  const firstName = displayName.trim() ? displayName.split(' ')[0] : '';
  const homeCity = user?.homeCity || profile.homeCity || 'Mumbai, Maharashtra';
  const officeCity = user?.officeCity || profile.primaryOffice || 'Pune Technology Center';

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            AI Hybrid Work Overview
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-slate-400">
          Base: <span className="text-slate-200 font-medium">{homeCity}</span> • Office: <span className="text-slate-200 font-medium">{officeCity}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-[#121520] border border-slate-800 text-xs text-slate-300 shadow-sm">
        <Calendar className="w-4 h-4 text-indigo-400" />
        <span>{dateStr}</span>
      </div>
    </div>
  );
};
