import { z } from 'zod';

export const WorkModeEnum = z.enum(['WFO', 'WFH', 'OFF', 'FLEXIBLE']);

export const OnboardingStep1Schema = z.object({
  homeCity: z.string().min(2, 'Home city must be at least 2 characters'),
  officeCity: z.string().min(2, 'Office city must be at least 2 characters'),
  timezone: z.string().min(1, 'Please select a valid timezone').default('Asia/Kolkata'),
  currency: z.string().min(3, 'Please select a currency').max(3).default('INR'),
});

export const OnboardingStep2Schema = z.object({
  monday: WorkModeEnum,
  tuesday: WorkModeEnum,
  wednesday: WorkModeEnum,
  thursday: WorkModeEnum,
  friday: WorkModeEnum,
  saturday: WorkModeEnum,
  sunday: WorkModeEnum,
});

export const OnboardingStep3Schema = z.object({
  outboundCostEstimate: z.number().min(0, 'Outbound cost must be non-negative'),
  returnCostEstimate: z.number().min(0, 'Return cost must be non-negative'),
  localTransportDailyCost: z.number().min(0, 'Daily local transport cost must be non-negative'),
  preferredTravelMode: z.enum(['FLIGHT', 'TRAIN', 'CAB', 'OPTIMAL']).default('FLIGHT'),
});

export const OnboardingStep4Schema = z.object({
  nightlyRateEstimate: z.number().min(0, 'Nightly rate must be non-negative'),
  preferredTier: z.enum(['BUDGET', 'STANDARD', 'PREMIUM']).default('STANDARD'),
  amenitiesRequired: z.array(z.string()).default(['High-speed WiFi', 'Work Desk']),
});

export const OnboardingStep5Schema = z.object({
  breakfast: z.number().min(0, 'Breakfast allowance cannot be negative'),
  lunch: z.number().min(0, 'Lunch allowance cannot be negative'),
  snacks: z.number().min(0, 'Snacks allowance cannot be negative'),
  dinner: z.number().min(0, 'Dinner allowance cannot be negative'),
  miscellaneous: z.number().min(0, 'Miscellaneous allowance cannot be negative'),
});

export const OnboardingStep6Schema = z.object({
  optimizationPreference: z.enum(['SAVER', 'BALANCED', 'COMFORT']).default('BALANCED'),
  aiAutonomyPreference: z.enum(['SUGGEST_ONLY', 'BALANCED', 'MORE_AUTONOMOUS']).default('BALANCED'),
  dateFormat: z.enum(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY']).default('YYYY-MM-DD'),
});

export const FullOnboardingSchema = OnboardingStep1Schema
  .merge(OnboardingStep2Schema)
  .merge(OnboardingStep3Schema)
  .merge(OnboardingStep4Schema)
  .merge(OnboardingStep5Schema)
  .merge(OnboardingStep6Schema);

export type FullOnboardingData = z.infer<typeof FullOnboardingSchema>;
