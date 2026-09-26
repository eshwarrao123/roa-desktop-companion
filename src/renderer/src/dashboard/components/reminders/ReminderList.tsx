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
      <div className="border border-dashed border-roa-divider rounded-lg p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-roa-surface-tint mx-auto flex items-center justify-center">
          <Clock className="w-6 h-6 text-roa-text-muted" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-roa-text-primary">No reminders found</h3>
          <p className="text-sm text-roa-text-muted max-w-xs mx-auto mt-1">
            {searchQuery
              ? 'No reminders match your search query.'
              : filter === 'active'
              ? 'You have no active reminders right now.'
              : 'Get started by creating your first offline reminder.'}
          </p>
        </div>
        {!searchQuery && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-roa-primary-sage hover:bg-roa-dark-sage text-roa-surface text-sm font-semibold transition-colors mt-3"
          >
            <Plus className="w-4 h-4" />
            Create Reminder
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-roa-surface border border-roa-divider rounded-lg divide-y divide-roa-divider">
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
