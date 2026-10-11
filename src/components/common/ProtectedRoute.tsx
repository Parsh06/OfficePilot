import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { PlaneTakeoff, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboardingComplete?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOnboardingComplete = true,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div 
        data-testid="auth-loading-screen"
        className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-2xl shadow-indigo-600/40 animate-pulse">
              <PlaneTakeoff className="h-8 w-8" />
            </div>
            <Loader2 className="absolute -top-1 -right-1 h-6 w-6 text-indigo-400 animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">
              WorkTrip <span className="text-indigo-400 font-mono text-xs">AI</span>
            </h2>
            <p className="text-xs text-slate-400">Verifying secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated, but has not completed onboarding and page requires onboarding
  if (requireOnboardingComplete && user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
