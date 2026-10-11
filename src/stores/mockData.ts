import { 
  DaySchedule, 
  Trip, 
  Expense, 
  Scenario, 
  AIRecommendation, 
  UserProfile, 
  NotificationItem,
  AIMessage
} from '@/types';

export const initialUserProfile: UserProfile = {
  id: '',
  name: '',
  email: '',
  avatarUrl: '',
  role: 'Hybrid Professional',
  department: 'Enterprise',
  homeCity: 'Mumbai, Maharashtra',
  homeAddress: '',
  primaryOffice: 'Pune Technology Center',
  officeAddress: '',
  preferredAirlines: ['IndiGo', 'Air India', 'Vistara'],
  preferredHotelChains: ['Taj Hotels', 'Lemon Tree', 'Marriott Bonvoy'],
  monthlyTravelBudget: 25000,
  wfoTargetDaysPerMonth: 8,
  currency: 'INR',
  notificationsEnabled: true,
};

export const initialSchedules: DaySchedule[] = [];

export const initialTrips: Trip[] = [];

export const initialExpenses: Expense[] = [];

export const initialScenarios: Scenario[] = [
  {
    id: 'scen_01',
    name: 'Bi-Weekly Concentrated (AI Recommended)',
    description: 'Travel to Pune Tech Center once every 2 weeks for 4 consecutive office days. Minimizes travel fatigue and maximizes deep focus weeks.',
    wfoDaysPerWeek: 2,
    batchingCadence: 'BIWEEKLY',
    transportPreference: 'OPTIMAL',
    hotelTier: 'STANDARD',
    projectedMonthlyCost: 18500,
    projectedYearlyCost: 222000,
    projectedTravelHours: 12,
    savingsVsBaseline: 6500,
    isRecommended: true,
    isCurrent: true,
  },
  {
    id: 'scen_02',
    name: 'Weekly Distributed Commute',
    description: 'Weekly 2-day visit to office with frequent single-night hotel stays. High transit overhead.',
    wfoDaysPerWeek: 2,
    batchingCadence: 'WEEKLY',
    transportPreference: 'OPTIMAL',
    hotelTier: 'STANDARD',
    projectedMonthlyCost: 28000,
    projectedYearlyCost: 336000,
    projectedTravelHours: 24,
    savingsVsBaseline: 0,
    isRecommended: false,
    isCurrent: false,
  },
  {
    id: 'scen_03',
    name: 'Monthly Deep Immersion',
    description: 'Travel once a month for a full 8-day sprint block. Drastically cuts transit frequency and station commute friction.',
    wfoDaysPerWeek: 2,
    batchingCadence: 'MONTHLY',
    transportPreference: 'OPTIMAL',
    hotelTier: 'STANDARD',
    projectedMonthlyCost: 15500,
    projectedYearlyCost: 186000,
    projectedTravelHours: 6,
    savingsVsBaseline: 9000,
    isRecommended: false,
    isCurrent: false,
  },
];

export const initialRecommendations: AIRecommendation[] = [];

export const initialNotifications: NotificationItem[] = [];

export const initialAIMessages: AIMessage[] = [
  {
    id: 'msg_01',
    role: 'assistant',
    content: "Hello! I'm your Office Pilot AI Assistant. I can help you plan your hybrid work schedule, calculate commute expenses, and optimize your travel routes. How can I help you today?",
    timestamp: 'Just now',
  },
];
