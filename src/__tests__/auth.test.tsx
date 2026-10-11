import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import * as useAuthModule from '@/features/auth/useAuth';
import type { UserDocument, PreferencesDocument } from '@/types/firestore';

// Mock react-router-dom to be fully isolated and resilient across all test environments
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/dashboard', search: '', hash: '', state: null }),
  Navigate: ({ to, replace, state }: { to: string; replace?: boolean; state?: any }) => (
    <div data-testid="mock-navigate" data-to={to} data-replace={String(replace)} data-state={JSON.stringify(state)}>
      Redirected to {to}
    </div>
  ),
  useNavigate: () => vi.fn(),
}));

const mockPreferences: PreferencesDocument = {
  optimizationMode: 'BALANCED',
  currency: 'USD',
  preferredTravelMode: 'OPTIMAL',
  preferredNotificationStyle: 'STANDARD',
  aiEnabled: true,
  aiAutonomyLevel: 'ASSISTED',
  dateFormat: 'YYYY-MM-DD',
  weeklySummaryEnabled: true,
  updatedAt: new Date().toISOString(),
};

const mockCompletedUser: UserDocument = {
  uid: 'user-123',
  displayName: 'Alex Rivers',
  email: 'alex@worktrip.ai',
  photoURL: 'https://example.com/avatar.jpg',
  homeCity: 'San Francisco, CA',
  officeCity: 'Seattle, WA',
  organization: 'Acme Corp',
  timezone: 'America/Los_Angeles',
  currency: 'USD',
  onboardingCompleted: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockIncompleteUser: UserDocument = {
  ...mockCompletedUser,
  uid: 'user-456',
  onboardingCompleted: false,
};

describe('Authentication & Protected Routing', () => {
  it('renders loading state when authentication is resolving', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      firebaseUser: null,
      preferences: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
      signInWithGoogle: vi.fn(),
      signInWithDemoUser: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      updateProfile: vi.fn(),
      updatePreferences: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Dashboard Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('auth-loading-screen')).toBeInTheDocument();
    expect(screen.getByText(/verifying secure session/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login with state', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      firebaseUser: null,
      preferences: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      signInWithGoogle: vi.fn(),
      signInWithDemoUser: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      updateProfile: vi.fn(),
      updatePreferences: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Dashboard Content</div>
      </ProtectedRoute>
    );

    const redirectEl = screen.getByTestId('mock-navigate');
    expect(redirectEl).toBeInTheDocument();
    expect(redirectEl.getAttribute('data-to')).toBe('/login');
    expect(screen.getByText(/redirected to \/login/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects authenticated user with incomplete onboarding to /onboarding', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: mockIncompleteUser,
      firebaseUser: null,
      preferences: mockPreferences,
      isLoading: false,
      isAuthenticated: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signInWithDemoUser: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      updateProfile: vi.fn(),
      updatePreferences: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <ProtectedRoute requireOnboardingComplete={true}>
        <div>Protected Dashboard Content</div>
      </ProtectedRoute>
    );

    const redirectEl = screen.getByTestId('mock-navigate');
    expect(redirectEl).toBeInTheDocument();
    expect(redirectEl.getAttribute('data-to')).toBe('/onboarding');
    expect(screen.getByText(/redirected to \/onboarding/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('allows access to protected content when authenticated with completed onboarding', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: mockCompletedUser,
      firebaseUser: null,
      preferences: mockPreferences,
      isLoading: false,
      isAuthenticated: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signInWithDemoUser: vi.fn(),
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      updateProfile: vi.fn(),
      updatePreferences: vi.fn(),
      clearError: vi.fn(),
    });

    render(
      <ProtectedRoute requireOnboardingComplete={true}>
        <div>Welcome to Dashboard</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Welcome to Dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-navigate')).not.toBeInTheDocument();
  });
});
