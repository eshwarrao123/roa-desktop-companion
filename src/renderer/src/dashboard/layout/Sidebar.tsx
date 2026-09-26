import React from 'react';
import { Home, MessageSquare, Clock, Bell, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: 'overview' | 'reminders' | 'timers' | 'ai' | 'settings';
  onTabChange: (tab: 'overview' | 'reminders' | 'timers' | 'ai' | 'settings') => void;
}

/**
 * ROA Canonical Sidebar Navigation
 * 
 * Visual specifications from DESIGN.md:
 * - 220px fixed width
 * - #FFFDF9 surface background
 * - 1px #E4DED5 right divider
 * - Active: 3px sage left accent, #EEF2EE tint, sage text, 600 weight
 * - Inactive: transparent, muted text, 400 weight
 * - No character illustration in sidebar
 * - "Works offline" footer in micro text
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
    <aside className="w-[220px] bg-roa-surface border-r border-roa-divider flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-roa-sage flex items-center justify-center text-white font-bold text-sm shadow-sm">
            R
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-sm leading-tight text-roa-text">
              ROA Desktop Companion
            </h1>
          </div>
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
                  relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                  text-sm transition-all duration-base
                  ${isActive 
                    ? 'bg-roa-surface-tint text-roa-sage font-semibold' 
                    : 'text-roa-text-muted font-normal hover:bg-roa-surface-tint/50 hover:text-roa-text-secondary'
                  }
                `}
              >
                {/* Active accent bar */}
                {isActive && (
                  <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-roa-sage rounded-r" />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-roa-divider">
        <p className="text-micro text-roa-text-light px-2">
          Works offline
        </p>
      </div>
    </aside>
  );
};
