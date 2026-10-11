import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/navigation/AppShell';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

// Lazy Loaded Features for code-splitting and bundle performance
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PlanLayout = lazy(() => import('@/features/plan/PlanLayout').then(m => ({ default: m.PlanLayout })));
const PlanCalendarPage = lazy(() => import('@/features/plan/PlanCalendarPage').then(m => ({ default: m.PlanCalendarPage })));
const PlanTripsPage = lazy(() => import('@/features/plan/PlanTripsPage').then(m => ({ default: m.PlanTripsPage })));
const PlanOptimizerPage = lazy(() => import('@/features/plan/PlanOptimizerPage').then(m => ({ default: m.PlanOptimizerPage })));
const PlanScenariosPage = lazy(() => import('@/features/plan/PlanScenariosPage').then(m => ({ default: m.PlanScenariosPage })));
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AIAssistantPage = lazy(() => import('@/features/ai/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('@/features/help/HelpPage').then(m => ({ default: m.HelpPage })));
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const NotFoundPage = lazy(() => import('@/features/notFound/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const withSuspense = (Component: React.ReactNode) => (
  <Suspense fallback={<LoadingState label="Loading view..." className="min-h-[400px]" />}>
    {Component}
  </Suspense>
);

const RouterErrorFallback = () => (
  <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-6">
    <ErrorState
      title="Application Error"
      message="We encountered an unexpected view error. Click below to reload."
      onRetry={() => window.location.reload()}
    />
  </div>
);

export const router = createBrowserRouter([
  // Public route
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
    errorElement: <RouterErrorFallback />,
  },

  // Onboarding route (Protected, but allows incomplete onboarding)
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute requireOnboardingComplete={false}>
        {withSuspense(<OnboardingPage />)}
      </ProtectedRoute>
    ),
    errorElement: <RouterErrorFallback />,
  },

  // Root redirect
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
    errorElement: <RouterErrorFallback />,
  },

  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <AppShell>
          {withSuspense(<DashboardPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/plan',
    element: (
      <ProtectedRoute>
        <AppShell>
          {withSuspense(<PlanLayout />)}
        </AppShell>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/plan/calendar" replace />,
      },
      {
        path: 'calendar',
        element: withSuspense(<PlanCalendarPage />),
      },
      {
        path: 'trips',
        element: withSuspense(<PlanTripsPage />),
      },
      {
        path: 'optimizer',
        element: withSuspense(<PlanOptimizerPage />),
      },
      {
        path: 'scenarios',
        element: withSuspense(<PlanScenariosPage />),
      },
    ],
  },
  {
    path: '/expenses',
    element: (
      <ProtectedRoute>
        <AppShell>
          {withSuspense(<ExpensesPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <AppShell>
          {withSuspense(<AnalyticsPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/ai',
    element: (
      <ProtectedRoute>
        <AppShell>
          {withSuspense(<AIAssistantPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <AppShell>
          {withSuspense(<NotificationsPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <AppShell>
          {withSuspense(<SettingsPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/help',
    element: (
      <ProtectedRoute>
        <AppShell>
          {withSuspense(<HelpPage />)}
        </AppShell>
      </ProtectedRoute>
    ),
  },

  // 404 Catch-All
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
  },
]);

