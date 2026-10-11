import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { 
  Search, 
  LayoutDashboard, 
  Calendar, 
  Briefcase, 
  Sparkles, 
  Receipt, 
  BarChart3, 
  Bell, 
  Settings, 
  PlusCircle, 
  Bot,
  HelpCircle,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense?: () => void;
  onAddTrip?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onAddExpense,
  onAddTrip,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/4 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/4 rounded-2xl border border-slate-800 bg-[#111420] p-0 shadow-2xl overflow-hidden">
          <Command className="flex flex-col w-full h-full">
            <div className="flex items-center border-b border-slate-800 px-4 py-3">
              <Search className="mr-3 h-5 w-5 text-slate-400" />
              <Command.Input
                placeholder="Type a command or search pages..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
              />
              <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800/60 px-1.5 font-mono text-[10px] font-medium text-slate-400">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[340px] overflow-y-auto p-3 space-y-2">
              <Command.Empty className="py-6 text-center text-sm text-slate-400">
                No matching results found.
              </Command.Empty>

              <Command.Group heading="Navigation" className="text-xs font-semibold text-slate-500 uppercase px-2 py-1">
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/dashboard'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-indigo-400" />
                  <span>Dashboard Overview</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/plan/calendar'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span>Hybrid Work Calendar</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/plan/trips'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <Briefcase className="h-4 w-4 text-blue-400" />
                  <span>Trips & Bookings</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/plan/optimizer'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span>Travel Optimizer</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/plan/scenarios'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <span>Scenario Planning</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/expenses'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <span>Expenses & Reimbursements</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/analytics'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                  <span>Analytics & KPIs</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/ai'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <Bot className="h-4 w-4 text-purple-400" />
                  <span>AI Assistant</span>
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Quick Actions" className="text-xs font-semibold text-slate-500 uppercase px-2 py-1 pt-2">
                <Command.Item
                  onSelect={() => handleSelect(() => {
                    if (onAddExpense) onAddExpense();
                    else navigate('/expenses');
                  })}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <PlusCircle className="h-4 w-4 text-emerald-400" />
                  <span>Log New Expense</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => {
                    if (onAddTrip) onAddTrip();
                    else navigate('/plan/trips');
                  })}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <Briefcase className="h-4 w-4 text-blue-400" />
                  <span>Plan New Trip</span>
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Preferences & Help" className="text-xs font-semibold text-slate-500 uppercase px-2 py-1 pt-2">
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/notifications'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <Bell className="h-4 w-4 text-slate-400" />
                  <span>Notifications</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/settings'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Settings</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => navigate('/help'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-colors"
                >
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  <span>Help & Documentation</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
