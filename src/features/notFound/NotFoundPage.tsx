import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-center items-center p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mb-4">
        <Compass className="h-8 w-8" />
      </div>

      <h1 className="text-4xl font-extrabold text-white mb-2">404</h1>
      <h2 className="text-lg font-semibold text-slate-200 mb-2">
        Page Not Found
      </h2>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        The route you are looking for does not exist or has been relocated.
      </p>

      <Button
        variant="default"
        onClick={() => navigate('/dashboard')}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Button>
    </div>
  );
};
