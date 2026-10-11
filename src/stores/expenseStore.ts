import { create } from 'zustand';
import type {
  ExpenseRecord,
  ExpenseTemplate,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethod,
  ExpenseSummaryMetrics,
} from '@/lib/expenseEngine';
import {
  generatePlannedExpensesForTrip,
  createDefaultExpenseTemplates,
  calculateExpenseSummary,
  calculateExpenseVariance,
} from '@/lib/expenseEngine';
import {
  getExpenses,
  saveExpense,
  batchSaveExpenses,
  deleteExpense as persistDeleteExpense,
  getExpenseTemplates,
  saveExpenseTemplate,
} from '@/lib/firebase/services/expenseService';
import type { TripBlock } from '@/lib/travelEngine';

interface ExpenseFilterState {
  category: ExpenseCategory | 'ALL';
  status: ExpenseStatus | 'ALL';
  tripId: string | 'ALL';
  searchQuery: string;
  startDate?: string;
  endDate?: string;
}

interface ExpenseState {
  userId: string;
  expenses: ExpenseRecord[];
  templates: ExpenseTemplate[];
  filters: ExpenseFilterState;
  selectedExpenseId: string | null;
  isLoading: boolean;

  // Filter setters
  setCategoryFilter: (category: ExpenseCategory | 'ALL') => void;
  setStatusFilter: (status: ExpenseStatus | 'ALL') => void;
  setTripFilter: (tripId: string | 'ALL') => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (start?: string, end?: string) => void;
  resetFilters: () => void;
  setSelectedExpenseId: (id: string | null) => void;

  // Sync & Data
  fetchUserExpenses: (userId: string) => Promise<void>;

  // CRUD
  addExpense: (
    expense: Partial<ExpenseRecord> & {
      title: string;
      date: string;
      category: ExpenseCategory;
      plannedAmount?: number;
      amount?: number;
    }
  ) => ExpenseRecord;
  updateExpense: (id: string, updates: Partial<ExpenseRecord>) => Promise<void>;
  markActual: (id: string, actualAmount: number, paymentMethod?: PaymentMethod) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Planned generation
  generateExpensesFromTrip: (trip: TripBlock) => Promise<ExpenseRecord[]>;

  // Templates
  saveTemplate: (template: Omit<ExpenseTemplate, 'id'> & { id?: string }) => Promise<ExpenseTemplate>;

  // Metrics & Queries
  getSummary: () => ExpenseSummaryMetrics;
  getTotalSpending: () => number;
  getReimbursablePending: () => number;
  getExpenseById: (id: string) => ExpenseRecord | undefined;
}

const defaultUserId = 'demo-traveler-uid-001';

const initialDefaultExpenses: ExpenseRecord[] = [
  {
    id: 'exp_init_1',
    userId: defaultUserId,
    date: '2026-10-13',
    title: 'Outbound: Vande Bharat Express (Mumbai ➔ Pune)',
    category: 'TRAVEL',
    subcategory: 'train',
    plannedAmount: 850,
    actualAmount: 850,
    variance: 0,
    currency: 'INR',
    paymentMethod: 'UPI',
    reimbursable: true,
    status: 'CONFIRMED',
    source: 'generated',
    tripId: 'trip_demo_101',
    notes: 'Confirmed morning departure',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'exp_init_2',
    userId: defaultUserId,
    date: '2026-10-13',
    title: 'Breakfast & Morning Coffee',
    category: 'FOOD',
    subcategory: 'breakfast',
    plannedAmount: 120,
    actualAmount: 95,
    variance: -25, // Saved ₹25
    currency: 'INR',
    paymentMethod: 'UPI',
    reimbursable: true,
    status: 'CONFIRMED',
    source: 'generated',
    tripId: 'trip_demo_101',
    notes: 'South Indian breakfast at station',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'exp_init_3',
    userId: defaultUserId,
    date: '2026-10-13',
    title: 'Client Lunch with Core Architecture Team',
    category: 'FOOD',
    subcategory: 'lunch',
    plannedAmount: 180,
    actualAmount: 220,
    variance: 40, // ₹40 over budget
    currency: 'INR',
    paymentMethod: 'CREDIT_CARD',
    reimbursable: true,
    status: 'CONFIRMED',
    source: 'user',
    tripId: 'trip_demo_101',
    notes: 'Team meal at cafeteria',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'exp_init_4',
    userId: defaultUserId,
    date: '2026-10-13',
    title: 'The Ritz Executive Suites (Night 1)',
    category: 'ACCOMMODATION',
    subcategory: 'hotel',
    plannedAmount: 3800,
    actualAmount: 3800,
    variance: 0,
    currency: 'INR',
    paymentMethod: 'CORPORATE_CARD',
    reimbursable: true,
    status: 'CONFIRMED',
    source: 'generated',
    tripId: 'trip_demo_101',
    notes: 'Hinjawadi Tech Park Suite',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'exp_init_5',
    userId: defaultUserId,
    date: '2026-10-14',
    title: 'Evening Snacks & Tea',
    category: 'FOOD',
    subcategory: 'snacks',
    plannedAmount: 80,
    actualAmount: undefined, // Pending actual entry
    variance: 0,
    currency: 'INR',
    paymentMethod: 'UPI',
    reimbursable: true,
    status: 'PLANNED',
    source: 'generated',
    tripId: 'trip_demo_101',
    notes: 'Planned evening snack break',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

const initialFilters: ExpenseFilterState = {
  category: 'ALL',
  status: 'ALL',
  tripId: 'ALL',
  searchQuery: '',
};

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  userId: defaultUserId,
  expenses: initialDefaultExpenses,
  templates: createDefaultExpenseTemplates(defaultUserId),
  filters: initialFilters,
  selectedExpenseId: null,
  isLoading: false,

  setCategoryFilter: (category) =>
    set((state) => ({ filters: { ...state.filters, category } })),

  setStatusFilter: (status) =>
    set((state) => ({ filters: { ...state.filters, status } })),

  setTripFilter: (tripId) =>
    set((state) => ({ filters: { ...state.filters, tripId } })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({ filters: { ...state.filters, searchQuery } })),

  setDateRange: (startDate, endDate) =>
    set((state) => ({ filters: { ...state.filters, startDate, endDate } })),

  resetFilters: () => set({ filters: initialFilters }),

  setSelectedExpenseId: (id) => set({ selectedExpenseId: id }),

  fetchUserExpenses: async (userId: string) => {
    if (!userId) return;
    set({ isLoading: true, userId });
    try {
      const [remoteExpenses, remoteTemplates] = await Promise.all([
        getExpenses(userId),
        getExpenseTemplates(userId),
      ]);

      set({
        expenses: remoteExpenses.length > 0 ? remoteExpenses : get().expenses,
        templates: remoteTemplates.length > 0 ? remoteTemplates : get().templates,
        isLoading: false,
      });
    } catch (err) {
      console.warn('[expenseStore] Fetch error:', err);
      set({ isLoading: false });
    }
  },

  addExpense: (expenseData) => {
    const { userId, expenses } = get();
    const planned = Number(expenseData.plannedAmount ?? expenseData.amount ?? 0);
    const actual =
      expenseData.actualAmount !== undefined && expenseData.actualAmount !== null
        ? Number(expenseData.actualAmount)
        : expenseData.amount !== undefined && expenseData.plannedAmount === undefined
        ? Number(expenseData.amount)
        : undefined;

    const variance = calculateExpenseVariance(planned, actual);

    const fullRecord: ExpenseRecord = {
      id: expenseData.id || `exp_${Date.now()}`,
      userId,
      date: expenseData.date || new Date().toISOString().substring(0, 10),
      title: expenseData.title,
      category: expenseData.category,
      subcategory: expenseData.subcategory || 'other',
      plannedAmount: planned,
      actualAmount: actual,
      variance,
      currency: expenseData.currency || 'INR',
      paymentMethod: expenseData.paymentMethod || 'UPI',
      reimbursable: expenseData.reimbursable ?? true,
      status: expenseData.status || (actual !== undefined ? 'CONFIRMED' : 'PLANNED'),
      source: expenseData.source || 'user',
      tripId: expenseData.tripId,
      workDayId: expenseData.workDayId,
      segmentId: expenseData.segmentId,
      notes: expenseData.notes,
      generationKey: expenseData.generationKey,
      tags: expenseData.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({ expenses: [fullRecord, ...expenses] });
    saveExpense(userId, fullRecord).catch((err) =>
      console.warn('[expenseStore] Persist error:', err)
    );

    return fullRecord;
  },

  updateExpense: async (id, updates) => {
    const { userId, expenses } = get();
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const planned =
      updates.plannedAmount !== undefined ? Number(updates.plannedAmount) : existing.plannedAmount;
    const actual =
      updates.actualAmount !== undefined
        ? updates.actualAmount !== null
          ? Number(updates.actualAmount)
          : undefined
        : existing.actualAmount;
    const variance = calculateExpenseVariance(planned, actual);

    const merged: ExpenseRecord = {
      ...existing,
      ...updates,
      plannedAmount: planned,
      actualAmount: actual,
      variance,
      updatedAt: new Date().toISOString(),
    };

    set({
      expenses: expenses.map((e) => (e.id === id ? merged : e)),
    });

    await saveExpense(userId, merged);
  },

  markActual: async (id, actualAmount, paymentMethod) => {
    const { userId, expenses } = get();
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const variance = calculateExpenseVariance(existing.plannedAmount, actualAmount);
    const updated: ExpenseRecord = {
      ...existing,
      actualAmount,
      variance,
      status: 'CONFIRMED',
      paymentMethod: paymentMethod || existing.paymentMethod || 'UPI',
      updatedAt: new Date().toISOString(),
    };

    set({
      expenses: expenses.map((e) => (e.id === id ? updated : e)),
    });

    await saveExpense(userId, updated);
  },

  deleteExpense: async (id) => {
    const { userId, expenses, selectedExpenseId } = get();
    set({
      expenses: expenses.filter((e) => e.id !== id),
      selectedExpenseId: selectedExpenseId === id ? null : selectedExpenseId,
    });
    await persistDeleteExpense(userId, id);
  },

  generateExpensesFromTrip: async (trip: TripBlock) => {
    const { userId, templates, expenses } = get();
    const newGenerated = generatePlannedExpensesForTrip(trip, templates, expenses);

    if (newGenerated.length > 0) {
      await batchSaveExpenses(userId, newGenerated);
      set({ expenses: [...newGenerated, ...expenses] });
    }

    return newGenerated;
  },

  saveTemplate: async (templateData) => {
    const { userId, templates } = get();
    const saved = await saveExpenseTemplate(userId, templateData);
    const filtered = templates.filter((t) => t.id !== saved.id);
    set({ templates: [...filtered, saved] });
    return saved;
  },

  getSummary: () => {
    return calculateExpenseSummary(get().expenses);
  },

  getTotalSpending: () => {
    return get().expenses.reduce((sum, e) => {
      const amt = e.actualAmount !== undefined ? e.actualAmount : e.plannedAmount;
      return sum + (amt || 0);
    }, 0);
  },

  getReimbursablePending: () => {
    return get()
      .expenses.filter((e) => e.reimbursable && (e.status === 'PENDING' || e.status === 'CONFIRMED'))
      .reduce((sum, e) => sum + (e.actualAmount ?? e.plannedAmount ?? 0), 0);
  },

  getExpenseById: (id) => {
    return get().expenses.find((e) => e.id === id);
  },
}));
