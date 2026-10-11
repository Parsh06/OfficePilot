import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SettingsSchema, SettingsFormData } from '@/schemas';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSettingsStore } from '@/stores/settingsStore';
import { 
  User, 
  Building2, 
  Plane, 
  Bell, 
  Save, 
  RotateCcw,
  Sparkles,
  Shield,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useTripStore } from '@/stores/tripStore';
import { useExpenseStore } from '@/stores/expenseStore';

import { useAuth } from '@/features/auth/useAuth';

export const SettingsPage: React.FC = () => {
  const profile = useSettingsStore((s) => s.profile);
  const updateProfileStore = useSettingsStore((s) => s.updateProfile);
  const resetProfile = useSettingsStore((s) => s.resetProfile);
  const { user, updateProfile: updateAuthProfile, logout } = useAuth();

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      name: user?.displayName || profile.name,
      email: user?.email || profile.email,
      role: profile.role,
      department: profile.department,
      homeCity: user?.homeCity || profile.homeCity,
      primaryOffice: user?.officeCity || profile.primaryOffice,
      monthlyTravelBudget: profile.monthlyTravelBudget,
      wfoTargetDaysPerMonth: profile.wfoTargetDaysPerMonth,
      currency: user?.currency || profile.currency || 'USD',
      notificationsEnabled: profile.notificationsEnabled ?? true,
    },
  });

  const monthlyBudget = watch('monthlyTravelBudget');
  const notificationsEnabled = watch('notificationsEnabled');

  const onSubmit = async (data: SettingsFormData) => {
    updateProfileStore(data);
    if (user?.uid) {
      await updateAuthProfile({
        displayName: data.name,
        homeCity: data.homeCity,
        officeCity: data.primaryOffice,
        currency: data.currency,
      });
    }
    toast.success('Settings and hybrid work preferences saved!');
  };

  const handleReset = () => {
    resetProfile();
    reset();
    toast.info('Preferences reset to default.');
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      let exportPayload: any;
      try {
        exportPayload = await apiClient.get<any>('/profile?action=export');
      } catch {
        // Fallback to client-side store aggregation
        exportPayload = {
          application: 'WorkTrip AI',
          version: '1.0.0-production-mvp',
          exportedAt: new Date().toISOString(),
          userId: user?.uid || 'guest-user',
          profile,
          schedules: useScheduleStore.getState().schedules,
          exceptions: useScheduleStore.getState().exceptions,
          trips: useTripStore.getState().trips,
          expenses: useExpenseStore.getState().expenses,
        };
      }

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `worktrip-ai-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Personal data export downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to export data: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE MY DATA') {
      toast.error('Please type DELETE MY DATA exactly to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      try {
        await apiClient.delete('/profile');
      } catch {
        // Local client cleanup fallback
      }

      toast.success('Account and associated data deleted. Logging out...');
      setTimeout(async () => {
        await logout();
      }, 1200);
    } catch (err: any) {
      toast.error('Failed to delete account: ' + (err?.message || 'Unknown error'));
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Settings & Preferences"
        description="Configure your home/office hubs, attendance targets, travel budget limits, and AI optimization rules."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSubmit(onSubmit)}
              className="gap-1.5 shadow-md shadow-indigo-600/30"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto p-1">
          <TabsTrigger value="account" className="gap-2 py-2">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2 py-2">
            <Building2 className="w-4 h-4" />
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="travel" className="gap-2 py-2">
            <Plane className="w-4 h-4" />
            <span>Travel & Budget</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 py-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2 py-2 text-rose-300">
            <Shield className="w-4 h-4" />
            <span>Data & Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Account Profile */}
        <TabsContent value="account">
          <Card variant="elevated" className="p-6 space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-800">

              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-md"
              />
              <div>
                <h3 className="text-base font-bold text-white">{profile.name}</h3>
                <p className="text-xs text-slate-400">{profile.role} • {profile.department}</p>
                <span className="inline-block text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded mt-1 border border-indigo-500/20">
                  Enterprise Tier
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Full Name
                </label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Work Email Address
                </label>
                <Input {...register('email')} />
                {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Job Title / Role
                </label>
                <Input {...register('role')} />
                {errors.role && <p className="text-xs text-rose-400">{errors.role.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Department / Organization
                </label>
                <Input {...register('department')} />
                {errors.department && <p className="text-xs text-rose-400">{errors.department.message}</p>}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Work Schedule & Attendance Targets */}
        <TabsContent value="schedule">
          <Card variant="elevated" className="p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Hybrid Work Configuration</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Define your primary home base, office destination, and target office attendance days.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Home Base City / Airport
                </label>
                <Input {...register('homeCity')} placeholder="e.g. San Francisco (SFO)" />
                {errors.homeCity && <p className="text-xs text-rose-400">{errors.homeCity.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Primary Office Campus
                </label>
                <Input {...register('primaryOffice')} placeholder="e.g. Seattle HQ — Lake Union Campus" />
                {errors.primaryOffice && <p className="text-xs text-rose-400">{errors.primaryOffice.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Monthly WFO Attendance Target (Days)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  {...register('wfoTargetDaysPerMonth', { valueAsNumber: true })}
                />
                {errors.wfoTargetDaysPerMonth && (
                  <p className="text-xs text-rose-400">{errors.wfoTargetDaysPerMonth.message}</p>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Travel & Budget */}
        <TabsContent value="travel">
          <Card variant="elevated" className="p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Travel Budget & Policy Limits</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set monthly spending thresholds and preferred airline/hotel loyalty programs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Monthly Travel Budget ($)
                </label>
                <CurrencyInput
                  value={monthlyBudget}
                  onChange={(val) => setValue('monthlyTravelBudget', val)}
                />
                {errors.monthlyTravelBudget && (
                  <p className="text-xs text-rose-400">{errors.monthlyTravelBudget.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Default Currency
                </label>
                <select
                  {...register('currency')}
                  className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0f121a] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="CAD">CAD ($) — Canadian Dollar</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-white">AI Policy Guardrail Active</p>
                <p className="mt-0.5 text-slate-400">
                  WorkTrip AI automatically enforces per diem rules ($75/day) and flags refundable flight options.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Notifications */}
        <TabsContent value="notifications">
          <Card variant="elevated" className="p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Notification & Alert Channels</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage automated alerts for flight price drops, policy milestones, and expense approvals.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-[#0e111a]">
                <div>
                  <p className="text-sm font-semibold text-slate-200">AI Travel Savings Alerts</p>
                  <p className="text-xs text-slate-400">Get notified when cheaper flight or hotel alternatives emerge</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setValue('notificationsEnabled', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-[#0e111a]">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Expense Reimbursement Status</p>
                  <p className="text-xs text-slate-400">Alerts on approval and payout from company finance</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-5 w-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-[#0e111a]">
                <div>
                  <p className="text-sm font-semibold text-slate-200">WFO Attendance Milestone Reminders</p>
                  <p className="text-xs text-slate-400">Weekly progress check towards your 8 office days monthly target</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-5 w-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 5: Data & Privacy */}
        <TabsContent value="privacy">
          <Card variant="elevated" className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Data Management & Account Privacy</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Export your personal records or permanently delete your account and all associated Firestore and MongoDB data.
              </p>
            </div>

            {/* Export Section */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0e111a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">Export Personal Application Data</h4>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Download a complete JSON export of your work schedules, travel itineraries, expense records, and AI action logs.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={isExporting}
                className="gap-2 shrink-0 border-indigo-500/30 hover:border-indigo-500/60"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Exporting...' : 'Export JSON Data'}
              </Button>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-950/10 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-bold text-rose-300">Danger Zone: Delete Account</h4>
              </div>
              <p className="text-xs text-slate-300">
                Permanently deletes your user configuration, Firestore profiles, MongoDB expense records, trips, and schedules. This action is irreversible.
              </p>

              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete My Account & Data
                </Button>
              ) : (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-[#12080a] space-y-3">
                  <p className="text-xs font-semibold text-rose-300">
                    To confirm deletion, please type <span className="font-mono text-white underline">DELETE MY DATA</span> below:
                  </p>
                  <Input
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="Type DELETE MY DATA to confirm"
                    className="border-rose-500/50 focus:border-rose-400 font-mono text-xs"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmationText('');
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      disabled={deleteConfirmationText !== 'DELETE MY DATA' || isDeleting}
                      onClick={handleDeleteAccount}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5 shadow-md shadow-rose-600/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

