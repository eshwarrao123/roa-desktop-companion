import React from 'react';
import { Reminder } from '@shared/types/reminders';
import { ReminderRow } from './ReminderRow';
import { Clock, Plus } from 'lucide-react';

interface ReminderListProps {
  reminders: Reminder[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onCreateNew: () => void;
  searchQuery: string;
  filter: 'all' | 'active' | 'inactive';
}

export const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  onToggle,
  onEdit,
  onDelete,
  onSnooze,
  onCreateNew,
  searchQuery,
  filter,
}) => {
  if (reminders.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <div>
          <h3 className="text-section-title-sm font-semibold text-roa-text-primary">
            {searchQuery ? 'No results' : filter === 'active' ? 'No active reminders' : 'No reminders yet'}
          </h3>
          <p className="text-secondary text-roa-text-secondary max-w-md mx-auto mt-2">
            {searchQuery
              ? 'Try adjusting your search or filter.'
              : filter === 'active'
              ? 'Create a reminder or enable an existing one.'
              : 'Set up your first reminder to get started.'}
          </p>
        </div>
        {!searchQuery && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-roa bg-roa-sage hover:bg-roa-sage-hover text-roa-canvas text-secondary font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Reminder
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-roa-border rounded-roa divide-y divide-roa-border">
      {reminders.map((reminder) => (
        <ReminderRow
          key={reminder.id}
          reminder={reminder}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onSnooze={onSnooze}
        />
      ))}
    </div>
  );
};
