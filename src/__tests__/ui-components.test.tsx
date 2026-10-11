import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { WorkModeBadge } from '@/components/ui/work-mode-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DollarSign } from 'lucide-react';

describe('Design System & UI Components', () => {
  it('renders Button with variants properly', () => {
    const { rerender } = render(<Button variant="ai">Ask WorkTrip AI</Button>);
    expect(screen.getByRole('button', { name: /ask worktrip ai/i })).toBeInTheDocument();

    rerender(<Button variant="destructive">Delete Item</Button>);
    expect(screen.getByRole('button', { name: /delete item/i })).toBeInTheDocument();
  });

  it('renders MetricCard with title, value, and trend', () => {
    render(
      <MetricCard
        title="Monthly Travel Savings"
        value="$840.00"
        subtitle="Saved vs baseline"
        icon={DollarSign}
        trend={{ value: '+18%', isPositive: true }}
      />
    );

    expect(screen.getByText('Monthly Travel Savings')).toBeInTheDocument();
    expect(screen.getByText('$840.00')).toBeInTheDocument();
    expect(screen.getByText('+18%')).toBeInTheDocument();
  });

  it('renders WorkModeBadge for WFO and WFH', () => {
    const { rerender } = render(<WorkModeBadge mode="WFO" />);
    expect(screen.getByText(/Office \(WFO\)/i)).toBeInTheDocument();

    rerender(<WorkModeBadge mode="WFH" />);
    expect(screen.getByText(/Remote \(WFH\)/i)).toBeInTheDocument();

    rerender(<WorkModeBadge mode="TRAVEL" />);
    expect(screen.getByText(/In Transit/i)).toBeInTheDocument();
  });

  it('renders StatusBadge for reimbursement and trip statuses', () => {
    const { rerender } = render(<StatusBadge status="CONFIRMED" />);
    expect(screen.getByText(/Confirmed/i)).toBeInTheDocument();

    rerender(<StatusBadge status="APPROVED" />);
    expect(screen.getByText(/Approved/i)).toBeInTheDocument();
  });

  it('renders EmptyState with action button', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Trips Found"
        description="You have not created any trips yet."
        actionLabel="Create Trip"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Trips Found')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /create trip/i });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
