import React from 'react';

interface GreetingSectionProps {
  userName?: string;
}

export const GreetingSection: React.FC<GreetingSectionProps> = ({ userName = 'there' }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-2">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-roa-text-primary">
        {getGreeting()}, {userName}
      </h1>
      <p className="text-sm text-roa-text-muted">
        {getFormattedDate()}
      </p>
    </div>
  );
};
