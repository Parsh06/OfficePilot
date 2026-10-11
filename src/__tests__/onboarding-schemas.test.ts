import { describe, it, expect } from 'vitest';
import {
  OnboardingStep1Schema,
  OnboardingStep2Schema,
  OnboardingStep3Schema,
  OnboardingStep4Schema,
  OnboardingStep5Schema,
  OnboardingStep6Schema,
  FullOnboardingSchema,
} from '@/schemas/onboardingSchema';

describe('Onboarding Schemas & Validation', () => {
  it('validates Step 1 Location & System Settings', () => {
    const valid = {
      homeCity: 'Bengaluru',
      officeCity: 'Mumbai',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    };
    expect(OnboardingStep1Schema.safeParse(valid).success).toBe(true);

    const invalid = {
      homeCity: 'A', // too short
      officeCity: '',
      timezone: '',
      currency: 'INVALID_CURRENCY',
    };
    expect(OnboardingStep1Schema.safeParse(invalid).success).toBe(false);
  });

  it('validates Step 2 Weekly Work Schedule', () => {
    const valid = {
      monday: 'WFH',
      tuesday: 'WFO',
      wednesday: 'WFO',
      thursday: 'WFO',
      friday: 'WFH',
      saturday: 'OFF',
      sunday: 'OFF',
    };
    expect(OnboardingStep2Schema.safeParse(valid).success).toBe(true);

    const invalid = {
      ...valid,
      monday: 'UNKNOWN_MODE',
    };
    expect(OnboardingStep2Schema.safeParse(invalid).success).toBe(false);
  });

  it('validates Step 3 Travel Profile Basics', () => {
    const valid = {
      outboundCostEstimate: 4500,
      returnCostEstimate: 4500,
      localTransportDailyCost: 600,
      preferredTravelMode: 'FLIGHT',
    };
    expect(OnboardingStep3Schema.safeParse(valid).success).toBe(true);

    const invalid = {
      outboundCostEstimate: -100, // negative
      returnCostEstimate: 4500,
      localTransportDailyCost: -50,
      preferredTravelMode: 'ROCKET',
    };
    expect(OnboardingStep3Schema.safeParse(invalid).success).toBe(false);
  });

  it('validates Step 4 Accommodation Basics', () => {
    const valid = {
      nightlyRateEstimate: 4000,
      preferredTier: 'STANDARD',
      amenitiesRequired: ['WiFi', 'Desk'],
    };
    expect(OnboardingStep4Schema.safeParse(valid).success).toBe(true);

    const invalid = {
      nightlyRateEstimate: -1,
      preferredTier: 'INVALID_TIER',
    };
    expect(OnboardingStep4Schema.safeParse(invalid).success).toBe(false);
  });

  it('validates Step 5 Daily Expense Defaults', () => {
    const valid = {
      breakfast: 250,
      lunch: 450,
      snacks: 150,
      dinner: 650,
      miscellaneous: 300,
    };
    expect(OnboardingStep5Schema.safeParse(valid).success).toBe(true);

    const invalid = {
      breakfast: -50,
      lunch: 450,
      snacks: 150,
      dinner: 650,
      miscellaneous: 300,
    };
    expect(OnboardingStep5Schema.safeParse(invalid).success).toBe(false);
  });

  it('validates Step 6 Optimization Preferences', () => {
    const valid = {
      optimizationPreference: 'BALANCED',
      aiAutonomyPreference: 'MORE_AUTONOMOUS',
      dateFormat: 'YYYY-MM-DD',
    };
    expect(OnboardingStep6Schema.safeParse(valid).success).toBe(true);
  });

  it('validates Full Combined Onboarding Schema', () => {
    const complete = {
      homeCity: 'Bengaluru',
      officeCity: 'Mumbai',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      monday: 'WFH',
      tuesday: 'WFO',
      wednesday: 'WFO',
      thursday: 'WFO',
      friday: 'WFH',
      saturday: 'OFF',
      sunday: 'OFF',
      outboundCostEstimate: 4500,
      returnCostEstimate: 4500,
      localTransportDailyCost: 600,
      preferredTravelMode: 'FLIGHT',
      nightlyRateEstimate: 4000,
      preferredTier: 'STANDARD',
      amenitiesRequired: ['WiFi', 'Desk'],
      breakfast: 250,
      lunch: 450,
      snacks: 150,
      dinner: 650,
      miscellaneous: 300,
      optimizationPreference: 'BALANCED',
      aiAutonomyPreference: 'BALANCED',
      dateFormat: 'YYYY-MM-DD',
    };
    expect(FullOnboardingSchema.safeParse(complete).success).toBe(true);
  });
});
