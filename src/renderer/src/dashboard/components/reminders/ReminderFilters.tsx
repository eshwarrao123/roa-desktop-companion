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
    <div className="flex items-center gap-1 p-1 bg-roa-raised border border-roa-border rounded-roa">
      <button
        onClick={() => onFilterChange('all')}
        className={`h-8 px-3 rounded-roa-sm text-secondary font-medium transition-colors ${
          currentFilter === 'all'
            ? 'bg-roa-canvas text-roa-text-primary'
            : 'text-roa-text-muted hover:text-roa-text-secondary'
        }`}
      >
        All
      </button>
      <button
        onClick={() => onFilterChange('active')}
        className={`h-8 px-3 rounded-roa-sm text-secondary font-medium transition-colors ${
          currentFilter === 'active'
            ? 'bg-roa-canvas text-roa-text-primary'
            : 'text-roa-text-muted hover:text-roa-text-secondary'
        }`}
      >
        Active
      </button>
      <button
        onClick={() => onFilterChange('inactive')}
        className={`h-8 px-3 rounded-roa-sm text-secondary font-medium transition-colors ${
          currentFilter === 'inactive'
            ? 'bg-roa-canvas text-roa-text-primary'
            : 'text-roa-text-muted hover:text-roa-text-secondary'
        }`}
      >
        Inactive
      </button>
    </div>
  );
};
