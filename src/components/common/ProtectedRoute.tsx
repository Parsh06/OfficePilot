import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Loader2 } from 'lucide-react';

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
        className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="relative flex flex-col items-center justify-center p-4 rounded-3xl bg-[#0e111d]/90 border border-slate-800/80 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl">
            <img 
              src="/assets/full_logo.png" 
              alt="Office Pilot" 
              className="h-14 sm:h-16 w-auto max-w-[260px] object-contain drop-shadow-md animate-pulse" 
            />
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#111422] border border-slate-800/80 text-xs text-slate-300 shadow-inner">
            <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
            <span className="font-medium">Verifying secure session...</span>
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
  const isCompleted = Boolean(
    user?.onboardingCompleted ||
    (user?.uid && localStorage.getItem(`officepilot_onboarding_completed_${user.uid}`) === 'true') ||
    localStorage.getItem('officepilot_onboarding_completed') === 'true'
  );

  if (requireOnboardingComplete && user && !isCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
