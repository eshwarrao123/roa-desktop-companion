import React from 'react';
import { GreetingSection } from './GreetingSection';
import { FocusSummary } from './FocusSummary';
import { TodayReminders } from './TodayReminders';
import { ComingUp } from './ComingUp';
import { QuickActions } from './QuickActions';

interface HomeTabContentProps {
  onNavigateToFocus: () => void;
  onNavigateToReminders: () => void;
  onNavigateToAI: () => void;
}

export const HomeTabContent: React.FC<HomeTabContentProps> = ({
  onNavigateToFocus,
  onNavigateToReminders,
  onNavigateToAI,
}) => {
  return (
    <div className="max-w-6xl">
      {/* Greeting spans full width */}
      <GreetingSection />

      {/* Two-column desktop layout */}
      <div className="mt-8 grid grid-cols-[1fr_300px] gap-12">
        {/* Left Column: Focus + Today */}
        <div className="space-y-8">
          <FocusSummary onNavigateToFocus={onNavigateToFocus} />
          <TodayReminders onNavigateToReminders={onNavigateToReminders} />
        </div>

        {/* Right Column: Coming Up + Quick Actions */}
        <div className="space-y-8">
          <ComingUp />
          <QuickActions
            onNavigateToFocus={onNavigateToFocus}
            onNavigateToReminders={onNavigateToReminders}
            onNavigateToAI={onNavigateToAI}
          />
        </div>
      </div>
    </div>
  );
};
