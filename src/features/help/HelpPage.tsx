import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { 
  HelpCircle, 
  Keyboard, 
  ChevronDown, 
  ChevronUp, 
  Mail
} from 'lucide-react';

export const HelpPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does WorkTrip AI calculate my monthly travel savings?',
      a: 'WorkTrip AI analyzes historical flight fare trends, corporate lodging rates, and local transit patterns. By clustering single-day visits into consolidated multi-day blocks, the engine eliminates redundant roundtrip airfares and airport commutes.',
    },
    {
      q: 'How do I log a trip that includes both flights and hotel bookings?',
      a: 'Navigate to Plan ➔ Trips & Bookings and tap "Plan New Trip". Enter your destination city and estimated dates. The system will automatically build linked flight and lodging segment placeholders that you can view in the itinerary drawer.',
    },
    {
      q: 'What is the difference between WFO and Travel day modes?',
      a: 'WFO represents full day attendance at an official corporate campus or regional hub. Travel mode is specifically designed for transit days (flights, trains, long commutes) so that team members know you are mobile and working asynchronously.',
    },
    {
      q: 'How does the reimbursement status pipeline work?',
      a: 'When an expense is logged as "Reimbursable", it starts in Pending status. When approved by your company travel policy, it transitions to Approved and subsequently Reimbursed once paid out.',
    },
  ];

  const shortcuts = [
    { keys: ['⌘', 'K'], desc: 'Open Command Search Palette' },
    { keys: ['ESC'], desc: 'Close open dialogs, drawers or menus' },
    { keys: ['G', 'D'], desc: 'Navigate to Dashboard' },
    { keys: ['G', 'C'], desc: 'Navigate to Calendar' },
    { keys: ['G', 'E'], desc: 'Navigate to Expenses' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Help & Documentation"
        description="Learn how to optimize your hybrid work schedule, automate travel budgets, and master keyboard shortcuts."
      />

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Keyboard Shortcuts Card */}
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">Keyboard Shortcuts</h3>
          </div>

          <div className="space-y-2.5">
            {shortcuts.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{s.desc}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k, i) => (
                    <kbd
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-200"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Support & Contact Card */}
        <Card variant="elevated" className="p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <Mail className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Enterprise Travel Support</h3>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Need assistance with corporate booking codes, policy exceptions, or billing inquiries? Our platform support team is available 24/7.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0e111a] text-xs space-y-1">
            <p className="text-slate-300 font-medium">Corporate Travel Desk</p>
            <p className="text-indigo-400 font-mono">support@worktrip.ai</p>
          </div>
        </Card>
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span>Frequently Asked Questions</span>
        </h3>

        <div className="space-y-2.5">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-800/80 bg-[#10131d] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-slate-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
