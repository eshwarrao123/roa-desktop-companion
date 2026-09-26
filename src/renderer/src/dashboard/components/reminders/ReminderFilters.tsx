import React from 'react';

interface ReminderFiltersProps {
  currentFilter: 'all' | 'active' | 'inactive';
  onFilterChange: (filter: 'all' | 'active' | 'inactive') => void;
}

export const ReminderFilters: React.FC<ReminderFiltersProps> = ({
  currentFilter,
  onFilterChange,
}) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-roa-background border border-roa-divider rounded-lg text-sm">
      <button
        onClick={() => onFilterChange('all')}
        className={`px-3 py-1.5 rounded font-medium transition-colors ${
          currentFilter === 'all'
            ? 'bg-roa-surface-tint text-roa-primary-sage'
            : 'text-roa-text-muted hover:text-roa-text-secondary'
        }`}
      >
        All
      </button>
      <button
        onClick={() => onFilterChange('active')}
        className={`px-3 py-1.5 rounded font-medium transition-colors ${
          currentFilter === 'active'
            ? 'bg-roa-surface-tint text-roa-primary-sage'
            : 'text-roa-text-muted hover:text-roa-text-secondary'
        }`}
      >
        Active
      </button>
      <button
        onClick={() => onFilterChange('inactive')}
        className={`px-3 py-1.5 rounded font-medium transition-colors ${
          currentFilter === 'inactive'
            ? 'bg-roa-surface-tint text-roa-primary-sage'
            : 'text-roa-text-muted hover:text-roa-text-secondary'
        }`}
      >
        Inactive
      </button>
    </div>
  );
};
