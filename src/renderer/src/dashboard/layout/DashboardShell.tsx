import React from 'react';
import { Sidebar } from './Sidebar';
import { PageContainer } from './PageContainer';

interface DashboardShellProps {
  activeTab: 'overview' | 'reminders' | 'timers' | 'ai' | 'settings';
  onTabChange: (tab: 'overview' | 'reminders' | 'timers' | 'ai' | 'settings') => void;
  children: React.ReactNode;
}

/**
 * ROA Canonical Dashboard Shell
 * 
 * Application layout orchestrator:
 * - Sidebar (220px fixed)
 * - Main content area (flex-1)
 * - Preserves all existing feature logic
 * - No routing library (uses local tab state)
 */
export const DashboardShell: React.FC<DashboardShellProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <PageContainer>{children}</PageContainer>
    </div>
  );
};
