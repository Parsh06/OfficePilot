import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  CalendarDays, 
  Zap
} from 'lucide-react';
import { useAuth } from './useAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, signInWithGoogle, error, clearError } = useAuth();
  
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirection when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      const destination =
        from && from !== '/login'
          ? from
          : user.onboardingCompleted
          ? '/dashboard'
          : '/onboarding';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user?.onboardingCompleted, navigate, location.state]);

  const handleGoogleSignIn = async () => {
    try {
      clearError();
      setIsSigningIn(true);
      const profile = await signInWithGoogle();
      if (profile) {
        if (!profile.onboardingCompleted) {
          navigate('/onboarding', { replace: true });
        } else {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      }
    } catch {
      // Error captured in AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d0c_1px,transparent_1px),linear-gradient(to_bottom,#1f293d0c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-md space-y-7 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center p-3.5 rounded-3xl bg-[#0e111d]/90 border border-slate-800/80 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/25 to-indigo-600/20 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <img
              src="/assets/full_logo.png"
              alt="Office Pilot"
              className="h-16 sm:h-20 w-auto max-w-[280px] object-contain relative z-10 drop-shadow-lg"
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto font-medium mt-1">
            Smart hybrid work mobility, route automation & enterprise travel intelligence.
          </p>
        </div>

        {/* Authentication Card */}
        <div className="p-8 rounded-3xl border border-slate-800/90 bg-[#0d101a]/90 backdrop-blur-2xl shadow-2xl shadow-black/80 space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-base font-bold text-white">Sign In to Your Workspace</h2>
            <p className="text-xs text-slate-400">
              Single Sign-On powered by Google Workspace & Firebase Authentication
            </p>
          </div>

          {/* Error Alert if any */}
          {error && (
            <div 
              data-testid="auth-error-banner"
              className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-950/30 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Authentication Alert</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Primary Google Login Button */}
          <div className="space-y-3 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={isSigningIn}
              onClick={handleGoogleSignIn}
              className="w-full h-12 text-sm font-semibold border-slate-700/90 bg-white hover:bg-slate-100 text-slate-900 gap-3 shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer"
            >
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </Button>
          </div>

          {/* Security & Tenant Guarantees */}
          <div className="p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Enterprise Grade Security</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your work calendar, commute expenses, and AI suggestions are isolated to your authenticated account with zero shared access.
            </p>
          </div>
        </div>

        {/* Product Highlights */}
        <div className="grid grid-cols-3 gap-3 text-center text-[11px] text-slate-500">
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-300">Hybrid Plan</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="font-medium text-slate-300">AI Routing</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-slate-300">Cost Control</span>
          </div>
        </div>
      </div>
    </div>
  );
};
