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
  id: 'usr_01',
  name: 'Parsh Jain',
  email: 'parsh@worktrip.ai',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Staff Product Architect',
  department: 'Platform Engineering',
  homeCity: 'Mumbai, Maharashtra',
  homeAddress: 'Hiranandani Gardens, Powai, Mumbai 400076',
  primaryOffice: 'Pune Technology Center — Magarpatta Cybercity',
  officeAddress: 'Tower 7, Magarpatta Cybercity, Hadapsar, Pune 411028',
  preferredAirlines: ['IndiGo', 'Air India', 'Vistara'],
  preferredHotelChains: ['Taj Hotels', 'Lemon Tree', 'Marriott Bonvoy'],
  monthlyTravelBudget: 25000,
  wfoTargetDaysPerMonth: 8,
  currency: 'INR',
  notificationsEnabled: true,
};

// Generates an array of dates around current month
function generateInitialSchedules(): DaySchedule[] {
  const schedules: DaySchedule[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Generate 45 days of hybrid schedule
  for (let d = -10; d < 35; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = dateObj.toISOString().split('T')[0];
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat

    let mode: DaySchedule['mode'] = 'WFH';
    let location = 'Home Office (Mumbai)';
    let notes = '';

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      mode = 'LEAVE';
      location = 'Weekend';
    } else if (d >= 12 && d <= 15) {
      mode = 'WFO';
      location = 'Pune Tech Center';
      notes = 'Sprint Planning & Architecture Sync';
    } else if (d === 11) {
      mode = 'TRAVEL';
      location = 'Mumbai CSMT -> Pune (Vande Bharat)';
      notes = 'Morning Express 07:15 AM';
    } else if (d === 16) {
      mode = 'TRAVEL';
      location = 'Pune -> Mumbai CSMT (Vande Bharat)';
      notes = 'Evening Return 06:30 PM';
    } else if (d === 25) {
      mode = 'HOLIDAY';
      location = 'National Holiday';
      notes = 'Office Closed';
    } else if (dayOfWeek === 2 || dayOfWeek === 3) {
      // Periodic local office days
      mode = 'WFO';
      location = 'Mumbai Innovation Hub (BKC)';
      notes = 'Team Collaboration & Reviews';
    }

    schedules.push({
      id: `sched_${dateStr}`,
      date: dateStr,
      mode,
      location,
      notes,
      tripId: (d >= 11 && d <= 16) ? 'trip_pune_oct' : undefined,
    });
  }

  return schedules;
}

export const initialSchedules: DaySchedule[] = generateInitialSchedules();

export const initialTrips: Trip[] = [
  {
    id: 'trip_pune_oct',
    title: 'Q4 Core Architecture & Leadership Sync',
    origin: 'Mumbai CSMT',
    destination: 'Pune Junction',
    officeLocation: 'Pune Technology Center — Magarpatta',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 12).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 16).toISOString().split('T')[0],
    status: 'CONFIRMED',
    estimatedCost: 11800,
    actualCost: 11800,
    aiOptimizationScore: 94,
    aiSavingsEstimate: 3400,
    notes: 'Vande Bharat Express booked. 4 in-office days grouped.',
    createdAt: '2026-10-01T10:00:00Z',
    segments: [
      {
        id: 'seg_1',
        type: 'TRAIN',
        title: 'Vande Bharat Express (CSMT -> Pune)',
        provider: 'Indian Railways (IRCTC)',
        departureTime: '07:15 AM',
        arrivalTime: '10:20 AM',
        origin: 'Mumbai CSMT',
        destination: 'Pune Junction',
        cost: 1250,
        confirmationCode: 'PNR-84920194',
      },
      {
        id: 'seg_2',
        type: 'HOTEL',
        title: 'Lemon Tree Premier Pune (4 Nights)',
        provider: 'Lemon Tree Hotels',
        cost: 9300,
        confirmationCode: 'LTP-49201',
      },
      {
        id: 'seg_3',
        type: 'TRAIN',
        title: 'Vande Bharat Express (Pune -> CSMT)',
        provider: 'Indian Railways (IRCTC)',
        departureTime: '06:30 PM',
        arrivalTime: '09:40 PM',
        origin: 'Pune Junction',
        destination: 'Mumbai CSMT',
        cost: 1250,
        confirmationCode: 'PNR-84920195',
      },
    ],
  },
  {
    id: 'trip_blr_nov',
    title: 'Product Design & Enterprise Summit',
    origin: 'Mumbai (BOM)',
    destination: 'Bengaluru (BLR)',
    officeLocation: 'Outer Ring Road Innovation Campus',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 8).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 12).toISOString().split('T')[0],
    status: 'PLANNED',
    estimatedCost: 16500,
    aiOptimizationScore: 88,
    aiSavingsEstimate: 4200,
    notes: 'Direct morning flight via IndiGo. Hotel 10 mins from ORR.',
    createdAt: '2026-10-04T14:30:00Z',
    segments: [
      {
        id: 'seg_4',
        type: 'FLIGHT',
        title: 'IndiGo 6E 521 (BOM -> BLR)',
        provider: 'IndiGo',
        departureTime: '08:15 AM',
        arrivalTime: '10:05 AM',
        origin: 'BOM',
        destination: 'BLR',
        cost: 4500,
      },
      {
        id: 'seg_5',
        type: 'HOTEL',
        title: 'Fairfield by Marriott Bengaluru ORR (4 Nights)',
        provider: 'Marriott Bonvoy',
        cost: 12000,
      },
    ],
  },
];

export const initialExpenses: Expense[] = [
  {
    id: 'exp_01',
    title: 'Vande Bharat Express (Mumbai - Pune)',
    category: 'COMMUTE',
    amount: 1250.00,
    currency: 'INR',
    date: '2026-10-05',
    tripId: 'trip_pune_oct',
    location: 'Mumbai, Maharashtra',
    reimbursable: true,
    status: 'APPROVED',
    tags: ['Rail Transit', 'IRCTC'],
    createdAt: '2026-10-05T12:00:00Z',
  },
  {
    id: 'exp_02',
    title: 'Lemon Tree Premier Pune Booking',
    category: 'HOTEL',
    amount: 9300.00,
    currency: 'INR',
    date: '2026-10-05',
    tripId: 'trip_pune_oct',
    location: 'Pune, Maharashtra',
    reimbursable: true,
    status: 'PENDING',
    tags: ['Accommodation'],
    createdAt: '2026-10-05T12:30:00Z',
  },
  {
    id: 'exp_03',
    title: 'Ola Cab (Powai Home -> CSMT Station)',
    category: 'COMMUTE',
    amount: 650.00,
    currency: 'INR',
    date: '2026-10-03',
    location: 'Mumbai, Maharashtra',
    reimbursable: true,
    status: 'REIMBURSED',
    tags: ['Ground Transport', 'Ola'],
    createdAt: '2026-10-03T18:00:00Z',
  },
  {
    id: 'exp_04',
    title: 'Team Working Dinner (Koregaon Park)',
    category: 'MEALS',
    amount: 2800.00,
    currency: 'INR',
    date: '2026-10-02',
    location: 'Pune, Maharashtra',
    reimbursable: true,
    status: 'APPROVED',
    tags: ['Meals & Per Diem'],
    createdAt: '2026-10-02T13:45:00Z',
  },
  {
    id: 'exp_05',
    title: 'WeWork Day Pass — Magarpatta Cybercity',
    category: 'COWORKING',
    amount: 999.00,
    currency: 'INR',
    date: '2026-09-28',
    location: 'Pune, Maharashtra',
    reimbursable: true,
    status: 'REIMBURSED',
    tags: ['Workspace'],
    createdAt: '2026-09-28T09:00:00Z',
  },
];

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

export const initialRecommendations: AIRecommendation[] = [
  {
    id: 'rec_01',
    title: 'Batch Bengaluru trips to save ₹4,200',
    description: 'Combining your 2 separate Bengaluru days into a single consecutive 3-day block avoids an extra roundtrip airfare.',
    type: 'COST_SAVING',
    potentialSavings: 4200,
    impactLevel: 'HIGH',
    confidenceScore: 96,
    actionLabel: 'Merge Trip Schedule',
    applied: false,
    createdAt: '2026-10-07T09:00:00Z',
  },
  {
    id: 'rec_02',
    title: 'Shift Vande Bharat train timing to save ₹400',
    description: 'Taking the 07:15 AM departure instead of peak executive taxi reduces commute cost with zero meeting conflicts.',
    type: 'TRAVEL_DEAL',
    potentialSavings: 400,
    impactLevel: 'MEDIUM',
    confidenceScore: 92,
    actionLabel: 'Update Train Timing',
    applied: false,
    createdAt: '2026-10-06T14:20:00Z',
  },
  {
    id: 'rec_03',
    title: 'Policy Reminder: 8 WFO Days target',
    description: 'You currently have 6 WFO days scheduled for this month. 2 additional days recommended to meet platform team guidelines.',
    type: 'POLICY_ALERT',
    impactLevel: 'LOW',
    confidenceScore: 100,
    actionLabel: 'Auto-Fill WFO Days',
    applied: false,
    createdAt: '2026-10-05T08:00:00Z',
  },
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'notif_01',
    title: 'AI Travel Savings Available',
    message: 'Office Pilot found an optimal route saving ₹3,400 for your upcoming Pune trip.',
    type: 'AI_SUGGESTION',
    timestamp: '10m ago',
    read: false,
    link: '/plan/optimizer',
  },
  {
    id: 'notif_02',
    title: 'Expense Report Approved',
    message: 'Your expense for ₹1,250.00 (Vande Bharat Ticket) has been approved by Finance.',
    type: 'SUCCESS',
    timestamp: '2h ago',
    read: false,
    link: '/expenses',
  },
  {
    id: 'notif_03',
    title: 'Calendar Sync Notice',
    message: 'Sprint Planning on Oct 14 coincides with your confirmed Pune WFO day.',
    type: 'INFO',
    timestamp: 'Yesterday',
    read: true,
    link: '/plan/calendar',
  },
];

export const initialAIMessages: AIMessage[] = [
  {
    id: 'msg_01',
    role: 'assistant',
    content: "Namaste! I'm your Office Pilot assistant. I've analyzed your hybrid schedule and commute patterns between Mumbai and Pune for this month. You're currently projected to save **₹6,500** compared to weekly commutes with our bi-weekly batching scenario. How can I help optimize your schedule today?",
    timestamp: 'Just now',
  },
];
