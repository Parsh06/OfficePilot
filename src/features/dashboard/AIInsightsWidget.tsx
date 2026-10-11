import React from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { AIInsightCard } from '@/components/ui/ai-insight-card';
import { useAIStore } from '@/stores/aiStore';
import { NavLink } from 'react-router-dom';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export const AIInsightsWidget: React.FC = () => {
  const recommendations = useAIStore((s) => s.recommendations);
  const applyRecommendation = useAIStore((s) => s.applyRecommendation);
  const dismissRecommendation = useAIStore((s) => s.dismissRecommendation);

  const activeRecs = recommendations.slice(0, 2);

  const handleApply = (id: string) => {
    applyRecommendation(id);
    toast.success('AI Optimization applied to your schedule and travel plan!');
  };

  return (
    <SectionCard
      variant="glow"
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="font-semibold text-white">AI Recommendations & Savings</span>
        </div>
      }
      description="Real-time hybrid travel optimizations tailored to your policy and calendar"
      action={
        <NavLink
          to="/plan/optimizer"
          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5 font-medium transition-colors"
        >
          Explore Optimizer <ArrowUpRight className="w-3.5 h-3.5" />
        </NavLink>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeRecs.map((rec) => (
          <AIInsightCard
            key={rec.id}
            recommendation={rec}
            onApply={handleApply}
            onDismiss={dismissRecommendation}
          />
        ))}
      </div>
    </SectionCard>
  );
};
