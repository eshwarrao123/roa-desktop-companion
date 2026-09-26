import React from 'react';
import { GreetingSection } from './GreetingSection';
import { FocusSummary } from './FocusSummary';
import { TodayReminders } from './TodayReminders';
import { QuickAskRoa } from './QuickAskRoa';

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
    <div className="max-w-5xl space-y-8">
      {/* Greeting Section */}
      <GreetingSection />

      {/* Two-column layout for main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Focus */}
        <div className="space-y-8">
          <FocusSummary onNavigateToFocus={onNavigateToFocus} />
          <QuickAskRoa onNavigateToAI={onNavigateToAI} />
        </div>

        {/* Right Column: Reminders */}
        <div>
          <TodayReminders onNavigateToReminders={onNavigateToReminders} />
        </div>
      </div>
    </div>
  );
};
