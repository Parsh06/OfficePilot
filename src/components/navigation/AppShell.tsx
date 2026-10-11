import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { CommandPalette } from '@/components/ui/command-palette';
import { useAuth } from '@/features/auth/useAuth';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useTripStore } from '@/stores/tripStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { user } = useAuth();

  const fetchSchedule = useScheduleStore((s) => s.fetchUserScheduleData);
  const fetchTrips = useTripStore((s) => s.fetchUserTripsAndProfiles);
  const fetchExpenses = useExpenseStore((s) => s.fetchUserExpenses);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const updateProfile = useSettingsStore((s) => s.updateProfile);

  // Auto-sync authenticated user data into state stores
  useEffect(() => {
    if (user?.uid) {
      fetchSchedule(user.uid);
      fetchTrips(user.uid);
      fetchExpenses(user.uid);
      fetchNotifications();
      updateProfile({
        id: user.uid,
        name: user.displayName || 'Corporate Traveler',
        email: user.email || '',
        avatarUrl: user.photoURL,
        homeCity: user.homeCity || 'Mumbai, Maharashtra',
        primaryOffice: user.officeCity || 'Pune Technology Center',
        currency: user.currency || 'INR',
      });
    }
  }, [user?.uid, fetchSchedule, fetchTrips, fetchExpenses, fetchNotifications, updateProfile]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-row">
      {/* Desktop Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <MobileBottomNav />
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
      />
    </div>
  );
};
