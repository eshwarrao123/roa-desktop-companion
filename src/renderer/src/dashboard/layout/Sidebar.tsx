import React from 'react';
import { Home, MessageSquare, Clock, Bell, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: 'overview' | 'reminders' | 'timers' | 'ai' | 'settings';
  onTabChange: (tab: 'overview' | 'reminders' | 'timers' | 'ai' | 'settings') => void;
}

/**
 * ROA Midnight Companion Sidebar Navigation
 * 
 * Visual specifications from DESIGN.md:
 * - 220px fixed width
 * - #0F1210 surface background
 * - 1px #303631 right divider
 * - Active: 2px sage left indicator, sage icon/text, weight 500
 * - Inactive: #9BA39D icon, #D3D9D4 text, weight 500
 * - ROA wordmark: 16px / 700
 * - No character illustration
 * - Version footer
 */
export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'overview' as const, label: 'Home', icon: Home },
    { id: 'ai' as const, label: 'Ask Roa', icon: MessageSquare },
    { id: 'timers' as const, label: 'Focus', icon: Clock },
    { id: 'reminders' as const, label: 'Reminders', icon: Bell },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[220px] bg-roa-surface border-r border-roa-border flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-4">
        <div className="mb-6 px-2">
          <h1 className="text-base font-bold text-roa-text-primary tracking-tight">
            ROA
          </h1>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`
                  relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-roa
                  text-nav transition-all duration-200
                  ${isActive 
                    ? 'text-roa-text-primary' 
                    : 'text-roa-text-secondary hover:bg-roa-text-primary/[0.04]'
                  }
                `}
              >
                {/* Active accent bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-roa-sage" />
                )}
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-roa-text-primary' : 'text-roa-text-muted'}`} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-roa-border">
        <p className="text-micro-sm text-roa-text-muted px-2">
          0.1.2
        </p>
      </div>
    </aside>
  );
};
