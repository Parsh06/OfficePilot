export type OptimizationMode = 'SAVER' | 'BALANCED' | 'COMFORT' | 'COST' | 'TIME';
export type PreferredTravelMode = 'FLIGHT' | 'TRAIN' | 'CAB' | 'OPTIMAL';
export type NotificationStyle = 'MINIMAL' | 'STANDARD' | 'PROACTIVE';
export type AIAutonomyLevel = 'SUGGEST_ONLY' | 'BALANCED' | 'MORE_AUTONOMOUS' | 'ASSISTED' | 'SEMI_AUTONOMOUS';
export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';

export type BaseWorkMode = 'WFO' | 'WFH' | 'OFF' | 'FLEXIBLE';

export interface UserDocument {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  homeCity: string;
  officeCity: string;
  organization?: string;
  timezone: string;
  currency: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreferencesDocument {
  optimizationMode: OptimizationMode;
  currency: string;
  preferredTravelMode: PreferredTravelMode;
  preferredNotificationStyle: NotificationStyle;
  aiEnabled: boolean;
  aiAutonomyLevel: AIAutonomyLevel;
  dateFormat: DateFormat;
  weeklySummaryEnabled: boolean;
  updatedAt: string;
}

export interface WorkScheduleDocument {
  userId: string;
  uid?: string;
  timezone: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD
  monday: BaseWorkMode;
  tuesday: BaseWorkMode;
  wednesday: BaseWorkMode;
  thursday: BaseWorkMode;
  friday: BaseWorkMode;
  saturday: BaseWorkMode;
  sunday: BaseWorkMode;
  homeCity?: string;
  officeCity?: string;
  wfoTargetDaysPerMonth?: number;
  standardWfoDays?: string[];
  batchingCadence?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TravelProfileDocument {
  userId?: string;
  uid?: string;
  homeLocation: string;
  officeLocation: string;
  outboundCostEstimate: number;
  returnCostEstimate: number;
  localTransportDailyCost: number;
  preferredTravelMode: PreferredTravelMode;
  preferredAirlines?: string[];
  seatPreference?: 'WINDOW' | 'AISLE' | 'ANY';
  preferredHotelChains?: string[];
  maxFlightDurationHours?: number;
  budgetLimitPerTrip?: number;
  updatedAt: string;
}

export interface AccommodationProfileDocument {
  userId?: string;
  uid?: string;
  nightlyRateEstimate: number;
  preferredTier: 'BUDGET' | 'STANDARD' | 'PREMIUM';
  amenitiesRequired: string[];
  maxNightlyRate?: number;
  updatedAt: string;
}

export interface ExpenseDefaultsDocument {
  userId?: string;
  uid?: string;
  breakfast: number;
  lunch: number;
  snacks: number;
  dinner: number;
  miscellaneous: number;
  currency: string;
  updatedAt: string;
}

export interface NotificationPreferencesDocument {
  uid?: string;
  userId?: string;
  emailAlerts: boolean;
  inAppAlerts: boolean;
  priceDropAlerts: boolean;
  scheduleReminders: boolean;
  weeklyDigest: boolean;
  updatedAt: string;
}

export interface ScheduleExceptionDocument {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD
  mode: 'WFO' | 'WFH' | 'LEAVE' | 'HOLIDAY' | 'TRAVEL';
  reason?: string;
  createdAt: string;
}
