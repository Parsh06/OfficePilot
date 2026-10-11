import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/features/auth/useAuth';
import { saveWorkSchedule } from '@/lib/firebase/services/workScheduleService';
import { saveTravelProfile, saveAccommodationProfile } from '@/lib/firebase/services/travelProfileService';
import { saveExpenseDefaults } from '@/lib/firebase/services/expenseDefaultsService';
import { updateUserPreferences } from '@/lib/firebase/services/preferencesService';
import { 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  PlaneTakeoff, 
  Calendar,
  Building2,
  Hotel,
  Utensils,
  Sliders,
  CheckCircle2,
  Loader2,
  Plane,
  Train,
  Car,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { BaseWorkMode, WeekDay } from '@/lib/scheduleEngine';

const WEEKDAYS: { key: WeekDay; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)' },
  { value: 'America/New_York', label: 'America/New_York (EST -5:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST -8:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST -6:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT +0:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET +1:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST +10:00)' },
];

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹) - Indian Rupee' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
  { value: 'SGD', label: 'SGD (S$) - Singapore Dollar' },
  { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const totalSteps = 8;
  const [saving, setSaving] = useState(false);

  // Step 1: Location & System Settings
  const [homeCity, setHomeCity] = useState(user?.homeCity || 'Bengaluru');
  const [officeCity, setOfficeCity] = useState(user?.officeCity || 'Mumbai HQ');
  const [organization, setOrganization] = useState(user?.organization || 'Enterprise Corp');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [currency, setCurrency] = useState(user?.currency || 'INR');

  // Step 2: Normal Weekly Work Schedule
  const [schedule, setSchedule] = useState<Record<WeekDay, BaseWorkMode>>({
    monday: 'WFH',
    tuesday: 'WFO',
    wednesday: 'WFO',
    thursday: 'WFO',
    friday: 'WFH',
    saturday: 'OFF',
    sunday: 'OFF',
  });

  // Step 3: Travel Profile Basics
  const [outboundCost, setOutboundCost] = useState(currency === 'INR' ? 4500 : 80);
  const [returnCost, setReturnCost] = useState(currency === 'INR' ? 4500 : 80);
  const [localTransportCost, setLocalTransportCost] = useState(currency === 'INR' ? 600 : 15);
  const [travelMode, setTravelMode] = useState<'FLIGHT' | 'TRAIN' | 'CAB' | 'OPTIMAL'>('FLIGHT');

  // Step 4: Accommodation Basics
  const [nightlyRate, setNightlyRate] = useState(currency === 'INR' ? 4000 : 90);
  const [hotelTier, setHotelTier] = useState<'BUDGET' | 'STANDARD' | 'PREMIUM'>('STANDARD');
  const [amenities, setAmenities] = useState<string[]>(['High-speed WiFi', 'Work Desk', 'Breakfast Included']);

  // Step 5: Expense Defaults
  const [breakfast, setBreakfast] = useState(currency === 'INR' ? 250 : 15);
  const [lunch, setLunch] = useState(currency === 'INR' ? 450 : 25);
  const [snacks, setSnacks] = useState(currency === 'INR' ? 150 : 10);
  const [dinner, setDinner] = useState(currency === 'INR' ? 650 : 35);
  const [miscellaneous, setMiscellaneous] = useState(currency === 'INR' ? 300 : 20);

  // Step 6: Preferences
  const [optimizationPref, setOptimizationPref] = useState<'SAVER' | 'BALANCED' | 'COMFORT'>('BALANCED');
  const [aiAutonomy, setAiAutonomy] = useState<'SUGGEST_ONLY' | 'BALANCED' | 'MORE_AUTONOMOUS'>('BALANCED');
  const [dateFormat, setDateFormat] = useState<'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'>('YYYY-MM-DD');

  // Currency helper
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;

  // Preset Handlers for Weekly Schedule
  const applySchedulePreset = (type: 'HYBRID_3_2' | 'HYBRID_2_3' | 'ALL_WFH' | 'ALL_WFO' | 'FLEXIBLE') => {
    switch (type) {
      case 'HYBRID_3_2':
        setSchedule({
          monday: 'WFH',
          tuesday: 'WFO',
          wednesday: 'WFO',
          thursday: 'WFO',
          friday: 'WFH',
          saturday: 'OFF',
          sunday: 'OFF',
        });
        break;
      case 'HYBRID_2_3':
        setSchedule({
          monday: 'WFH',
          tuesday: 'WFO',
          wednesday: 'WFO',
          thursday: 'WFH',
          friday: 'WFH',
          saturday: 'OFF',
          sunday: 'OFF',
        });
        break;
      case 'ALL_WFH':
        setSchedule({
          monday: 'WFH',
          tuesday: 'WFH',
          wednesday: 'WFH',
          thursday: 'WFH',
          friday: 'WFH',
          saturday: 'OFF',
          sunday: 'OFF',
        });
        break;
      case 'ALL_WFO':
        setSchedule({
          monday: 'WFO',
          tuesday: 'WFO',
          wednesday: 'WFO',
          thursday: 'WFO',
          friday: 'WFO',
          saturday: 'OFF',
          sunday: 'OFF',
        });
        break;
      case 'FLEXIBLE':
        setSchedule({
          monday: 'FLEXIBLE',
          tuesday: 'FLEXIBLE',
          wednesday: 'FLEXIBLE',
          thursday: 'FLEXIBLE',
          friday: 'FLEXIBLE',
          saturday: 'OFF',
          sunday: 'OFF',
        });
        break;
    }
  };

  const toggleAmenity = (name: string) => {
    if (amenities.includes(name)) {
      setAmenities(amenities.filter((a) => a !== name));
    } else {
      setAmenities([...amenities, name]);
    }
  };

  // Live weekly WFO count calculation
  const weeklyWfoCount = Object.values(schedule).filter((mode) => mode === 'WFO').length;
  const estimatedMonthlyWfo = weeklyWfoCount * 4;

  // Validate step before proceeding
  const canProceed = () => {
    if (step === 1) {
      return homeCity.trim().length >= 2 && officeCity.trim().length >= 2;
    }
    if (step === 3) {
      return outboundCost >= 0 && returnCost >= 0 && localTransportCost >= 0;
    }
    if (step === 4) {
      return nightlyRate >= 0;
    }
    if (step === 5) {
      return breakfast >= 0 && lunch >= 0 && snacks >= 0 && dinner >= 0 && miscellaneous >= 0;
    }
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error('Please fill out all required fields with valid values.');
      return;
    }
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const uid = user?.uid || 'demo-traveler-uid-001';

      // 1. Save Work Schedule (Deterministic Model)
      await saveWorkSchedule(uid, {
        homeCity,
        officeCity,
        timezone,
        effectiveFrom: '2026-01-01',
        monday: schedule.monday,
        tuesday: schedule.tuesday,
        wednesday: schedule.wednesday,
        thursday: schedule.thursday,
        friday: schedule.friday,
        saturday: schedule.saturday,
        sunday: schedule.sunday,
        wfoTargetDaysPerMonth: estimatedMonthlyWfo || 8,
        version: 1,
      });

      // 2. Save Travel Profile Basics
      await saveTravelProfile(uid, {
        homeLocation: homeCity,
        officeLocation: officeCity,
        outboundCostEstimate: outboundCost,
        returnCostEstimate: returnCost,
        localTransportDailyCost: localTransportCost,
        preferredTravelMode: travelMode,
      });

      // 3. Save Accommodation Basics
      await saveAccommodationProfile(uid, {
        nightlyRateEstimate: nightlyRate,
        preferredTier: hotelTier,
        amenitiesRequired: amenities,
      });

      // 4. Save Expense Defaults
      await saveExpenseDefaults(uid, {
        breakfast,
        lunch,
        snacks,
        dinner,
        miscellaneous,
        currency,
      });

      // 5. Save Preferences
      await updateUserPreferences(uid, {
        optimizationMode: optimizationPref,
        aiAutonomyLevel: aiAutonomy,
        dateFormat,
        currency,
      });

      // 6. Complete Profile
      await updateProfile({
        homeCity,
        officeCity,
        organization,
        timezone,
        currency,
        onboardingCompleted: true,
      });

      toast.success('Onboarding complete! Your personalized schedule engine is now active.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      toast.error('Failed to complete setup. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl space-y-6 relative z-10 my-auto">
        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/30 mb-1">
            <PlaneTakeoff className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            WorkTrip Setup Wizard
          </h1>
          <p className="text-xs text-slate-400">
            Step {step} of {totalSteps}: {
              step === 1 ? 'Personal & Work Location' :
              step === 2 ? 'Normal Weekly Work Schedule' :
              step === 3 ? 'Travel Profile Basics' :
              step === 4 ? 'Accommodation Basics' :
              step === 5 ? 'Daily Expense Defaults' :
              step === 6 ? 'Optimization & AI Preferences' :
              step === 7 ? 'Review Configuration' : 'Complete Setup'
            }
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-1">
            <span>Progress</span>
            <span className="text-indigo-400 font-mono">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i + 1 <= step ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' : 'bg-slate-800/80'
                )}
              />
            ))}
          </div>
        </div>

        {/* Card Content Container */}
        <Card variant="elevated" className="p-6 sm:p-8 space-y-6 border-slate-800/80 bg-[#0d101a]/95 backdrop-blur-xl shadow-2xl">

          {/* STEP 1: Location & Timezone */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>Personal & Corporate Work Locations</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Defines your default travel corridor, timezone anchor, and financial currency.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Home Base / Residence City
                  </label>
                  <Input
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    placeholder="e.g. Bengaluru / San Francisco"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Primary Office / Campus City
                  </label>
                  <Input
                    value={officeCity}
                    onChange={(e) => setOfficeCity(e.target.value)}
                    placeholder="e.g. Mumbai HQ / Seattle"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Organization / Company Name
                </label>
                <div className="relative flex items-center">
                  <Building2 className="absolute left-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <Input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Acme Enterprise"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-800 bg-[#121520] text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Default Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-800 bg-[#121520] text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Normal Weekly Work Schedule */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Normal Weekly Work Schedule</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deterministic schedule engine resolves every week against this baseline pattern.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-300 text-xs font-semibold text-center shrink-0">
                  {weeklyWfoCount} WFO Days/Week (~{estimatedMonthlyWfo}/mo)
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applySchedulePreset('HYBRID_3_2')}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800/60 hover:border-indigo-500 text-slate-300 hover:text-white transition-colors"
                  >
                    Hybrid 3-2 (Tue-Thu Office)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset('HYBRID_2_3')}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800/60 hover:border-indigo-500 text-slate-300 hover:text-white transition-colors"
                  >
                    Hybrid 2-3 (Tue-Wed Office)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset('ALL_WFH')}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800/60 hover:border-indigo-500 text-slate-300 hover:text-white transition-colors"
                  >
                    All Remote (WFH)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset('ALL_WFO')}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800/60 hover:border-indigo-500 text-slate-300 hover:text-white transition-colors"
                  >
                    All Office (WFO)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySchedulePreset('FLEXIBLE')}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800/60 hover:border-indigo-500 text-slate-300 hover:text-white transition-colors"
                  >
                    Flexible
                  </button>
                </div>
              </div>

              {/* Weekday Grid Selector */}
              <div className="space-y-2 border border-slate-800/80 rounded-2xl p-3 bg-[#0a0d16]">
                {WEEKDAYS.map(({ key, label }) => {
                  const currentMode = schedule[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#111420] border border-slate-800/60"
                    >
                      <span className="text-xs font-bold text-slate-200 w-24">
                        {label}
                      </span>
                      <div className="grid grid-cols-4 gap-1.5 flex-1 max-w-sm">
                        {(['WFO', 'WFH', 'OFF', 'FLEXIBLE'] as BaseWorkMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSchedule({ ...schedule, [key]: mode })}
                            className={cn(
                              'py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all',
                              currentMode === mode
                                ? mode === 'WFO'
                                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                                  : mode === 'WFH'
                                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-sm'
                                  : mode === 'OFF'
                                  ? 'bg-slate-700 border-slate-500 text-slate-200'
                                  : 'bg-amber-600 border-amber-400 text-white shadow-sm'
                                : 'bg-[#161a29] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Travel Profile Basics */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plane className="w-4 h-4 text-indigo-400" />
                  <span>Travel Profile & Cost Estimates</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Baseline travel estimates used by the AI engine to evaluate trip batching versus weekly flights.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Outbound Transit Estimate ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={outboundCost}
                    onChange={(e) => setOutboundCost(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 4500"
                  />
                  <p className="text-[11px] text-slate-500">Home $\rightarrow$ Office city (one-way)</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Return Transit Estimate ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={returnCost}
                    onChange={(e) => setReturnCost(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 4500"
                  />
                  <p className="text-[11px] text-slate-500">Office $\rightarrow$ Home city (one-way)</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Daily Local Commute / Airport Cab ({currencySymbol})
                </label>
                <Input
                  type="number"
                  min={0}
                  value={localTransportCost}
                  onChange={(e) => setLocalTransportCost(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Preferred Travel Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { mode: 'FLIGHT', label: 'Flight', icon: Plane },
                    { mode: 'TRAIN', label: 'Train', icon: Train },
                    { mode: 'CAB', label: 'Drive/Cab', icon: Car },
                    { mode: 'OPTIMAL', label: 'Optimal', icon: Zap },
                  ].map(({ mode, label, icon: Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTravelMode(mode as any)}
                      className={cn(
                        'p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all',
                        travelMode === mode
                          ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-inner'
                          : 'border-slate-800 bg-[#121520] text-slate-400 hover:border-slate-700'
                      )}
                    >
                      <Icon className="w-4 h-4 text-indigo-400" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Accommodation Basics */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-purple-400" />
                  <span>Accommodation & Lodging Preferences</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Configures hotel budget thresholds and amenity requirements for multi-day in-office visits.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Estimated Nightly Hotel Rate ({currencySymbol})
                </label>
                <Input
                  type="number"
                  min={0}
                  value={nightlyRate}
                  onChange={(e) => setNightlyRate(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 4000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Lodging Standard
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { tier: 'BUDGET', title: 'Budget', desc: 'Functional & affordable' },
                    { tier: 'STANDARD', title: 'Standard', desc: 'Business-class quality' },
                    { tier: 'PREMIUM', title: 'Premium', desc: 'Luxury executive stays' },
                  ].map(({ tier, title, desc }) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setHotelTier(tier as any)}
                      className={cn(
                        'p-3.5 rounded-xl border text-left transition-all',
                        hotelTier === tier
                          ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-inner'
                          : 'border-slate-800 bg-[#121520] text-slate-400 hover:border-slate-700'
                      )}
                    >
                      <p className="text-xs font-bold text-white">{title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Required Amenities
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'High-speed WiFi',
                    'Work Desk',
                    'Breakfast Included',
                    'Fitness Center / Gym',
                    'Quiet Room',
                    'Late Check-out',
                  ].map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-colors',
                        amenities.includes(amenity)
                          ? 'border-indigo-500/50 bg-indigo-950/30 text-indigo-200'
                          : 'border-slate-800 bg-[#121520] text-slate-400'
                      )}
                    >
                      <span>{amenity}</span>
                      {amenities.includes(amenity) && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Expense Defaults */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-400" />
                  <span>Daily Meal & Miscellaneous Defaults</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Enter baseline daily per-diem estimates. These are defaults only, not actual expenses.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Breakfast Allowance ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={breakfast}
                    onChange={(e) => setBreakfast(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Lunch Allowance ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={lunch}
                    onChange={(e) => setLunch(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Snacks / Tea / Coffee ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={snacks}
                    onChange={(e) => setSnacks(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Dinner Allowance ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={dinner}
                    onChange={(e) => setDinner(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Miscellaneous / Incidentals ({currencySymbol})
                </label>
                <Input
                  type="number"
                  min={0}
                  value={miscellaneous}
                  onChange={(e) => setMiscellaneous(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-800 bg-[#121520] flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Estimated Daily Per-Diem:</span>
                <span className="font-bold text-amber-300">
                  {currencySymbol}{breakfast + lunch + snacks + dinner + miscellaneous} / day
                </span>
              </div>
            </div>
          )}

          {/* STEP 6: Preferences */}
          {step === 6 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Optimization Strategy & AI Autonomy</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Configure how aggressively the engine balances cost savings against travel comfort.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Optimization Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'SAVER', title: 'Saver', desc: 'Prioritize lowest total cost' },
                    { key: 'BALANCED', title: 'Balanced (Rec)', desc: 'Optimal cost & comfort' },
                    { key: 'COMFORT', title: 'Comfort', desc: 'Prioritize nonstop flights' },
                  ].map(({ key, title, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOptimizationPref(key as any)}
                      className={cn(
                        'p-3.5 rounded-xl border text-left transition-all',
                        optimizationPref === key
                          ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-inner'
                          : 'border-slate-800 bg-[#121520] text-slate-400 hover:border-slate-700'
                      )}
                    >
                      <p className="text-xs font-bold text-white">{title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  AI Autonomy Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'SUGGEST_ONLY', title: 'Suggest Only', desc: 'Passive recommendations' },
                    { key: 'BALANCED', title: 'Balanced (Default)', desc: 'Proactive recommendations' },
                    { key: 'MORE_AUTONOMOUS', title: 'More Autonomous', desc: 'Pre-drafts actions' },
                  ].map(({ key, title, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAiAutonomy(key as any)}
                      className={cn(
                        'p-3.5 rounded-xl border text-left transition-all',
                        aiAutonomy === key
                          ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-inner'
                          : 'border-slate-800 bg-[#121520] text-slate-400 hover:border-slate-700'
                      )}
                    >
                      <p className="text-xs font-bold text-white">{title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Preferred Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-800 bg-[#121520] text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601 Standard)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (UK / India / Europe)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 7: Review Configuration */}
          {step === 7 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Review Your Hybrid Configuration</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Double check your profile parameters. You can always adjust these later in Account Settings.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {/* Location summary */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-[#121520] space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400 font-semibold border-b border-slate-800/80 pb-1">
                    <span>1. Location & Anchor</span>
                    <button type="button" onClick={() => setStep(1)} className="text-indigo-400 hover:underline text-[11px]">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>Home: <span className="text-white font-medium">{homeCity}</span></div>
                    <div>Office: <span className="text-white font-medium">{officeCity}</span></div>
                    <div>Currency: <span className="text-white font-medium">{currency}</span></div>
                    <div>Timezone: <span className="text-white font-medium">{timezone}</span></div>
                  </div>
                </div>

                {/* Schedule summary */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-[#121520] space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400 font-semibold border-b border-slate-800/80 pb-1">
                    <span>2. Weekly Work Schedule (~{estimatedMonthlyWfo} WFO days/mo)</span>
                    <button type="button" onClick={() => setStep(2)} className="text-indigo-400 hover:underline text-[11px]">
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {WEEKDAYS.map(({ key, short }) => (
                      <span
                        key={key}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-bold',
                          schedule[key] === 'WFO' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' :
                          schedule[key] === 'WFH' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' :
                          'bg-slate-800 text-slate-400'
                        )}
                      >
                        {short}: {schedule[key]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Travel & Lodging summary */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-[#121520] space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400 font-semibold border-b border-slate-800/80 pb-1">
                    <span>3. Travel & Accommodation</span>
                    <button type="button" onClick={() => setStep(3)} className="text-indigo-400 hover:underline text-[11px]">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>Transit (Round-trip): <span className="text-white font-medium">{currencySymbol}{outboundCost + returnCost}</span></div>
                    <div>Hotel Rate: <span className="text-white font-medium">{currencySymbol}{nightlyRate} / night</span></div>
                    <div>Mode: <span className="text-white font-medium">{travelMode}</span></div>
                    <div>Tier: <span className="text-white font-medium">{hotelTier}</span></div>
                  </div>
                </div>

                {/* Defaults summary */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-[#121520] space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400 font-semibold border-b border-slate-800/80 pb-1">
                    <span>4. Daily Defaults & Strategy</span>
                    <button type="button" onClick={() => setStep(5)} className="text-indigo-400 hover:underline text-[11px]">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>Per-Diem Meals: <span className="text-white font-medium">{currencySymbol}{breakfast + lunch + snacks + dinner + miscellaneous} / day</span></div>
                    <div>Strategy: <span className="text-white font-medium">{optimizationPref}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Complete & Launch */}
          {step === 8 && (
            <div className="space-y-6 text-center animate-in fade-in-50 duration-200 py-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-500 text-white shadow-2xl shadow-emerald-600/30 ring-1 ring-white/20">
                <Sparkles className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-white">
                  You're All Set for Smarter Work Trips!
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your deterministic work schedule engine and cost models are configured. We will now initialize your workspace.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#121625] to-[#161224] max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Corridor:</span>
                  <span className="text-white font-semibold">{homeCity} $\leftrightarrow$ {officeCity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly WFO Goal:</span>
                  <span className="text-emerald-400 font-semibold">{estimatedMonthlyWfo} Days / Month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Schedule Engine:</span>
                  <span className="text-indigo-300 font-semibold">Deterministic & Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            {step > 1 && step < 8 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => setStep(step - 1)}
                className="gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>
            ) : (
              <div />
            )}

            {step < 8 ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleNext}
                className="gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <span>{step === 7 ? 'Proceed to Final Step' : 'Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ai"
                size="lg"
                disabled={saving}
                onClick={handleFinish}
                className="w-full h-11 text-sm font-semibold gap-2 shadow-xl shadow-indigo-600/40"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile & Launching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Launch WorkTrip AI Dashboard</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
