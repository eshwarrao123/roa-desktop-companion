import React, { useState, useEffect, useMemo } from 'react';
import { useRemindersStore } from '../../store/useRemindersStore';
import { ReminderModal } from '../ReminderModal';
import { ReminderSummary } from './ReminderSummary';
import { ReminderFilters } from './ReminderFilters';
import { ReminderList } from './ReminderList';
import { Reminder, CreateReminderInput } from '@shared/types/reminders';
import { Plus, Search } from 'lucide-react';

export const RemindersTabContent: React.FC = () => {
  const {
    reminders,
    isLoading,
    filter,
    searchQuery,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    snoozeReminder,
    setFilter,
    setSearchQuery,
  } = useRemindersStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    fetchReminders();

    const unsubscribe = window.roa?.reminders?.onReminderTriggered?.(() => {
      fetchReminders();
    });

    return () => {
      unsubscribe?.();
    };
  }, [fetchReminders]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (filter === 'active' && !r.enabled) return false;
      if (filter === 'inactive' && r.enabled) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.description?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [reminders, filter, searchQuery]);

  const handleOpenCreate = () => {
    setEditingReminder(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  };

  const handleSaveReminder = async (input: CreateReminderInput) => {
    if (editingReminder) {
      await updateReminder(editingReminder.id, input);
    } else {
      await createReminder(input);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-roa-text-primary">Reminders</h2>
          <p className="text-sm text-roa-text-muted mt-1">
            Your reminders work offline and stay private on this device
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-roa-primary-sage hover:bg-roa-dark-sage text-roa-surface text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Reminder
        </button>
      </div>

      {/* Summary */}
      <ReminderSummary reminders={reminders} />

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-roa-text-light-muted" />
          <input
            type="text"
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-roa-divider bg-roa-surface text-sm text-roa-text-secondary placeholder-roa-text-light-muted focus:outline-none focus:border-roa-primary-sage transition-colors"
          />
        </div>

        <ReminderFilters
          currentFilter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* Reminders List */}
      <ReminderList
        reminders={filteredReminders}
        onToggle={toggleReminder}
        onEdit={handleOpenEdit}
        onDelete={deleteReminder}
        onSnooze={snoozeReminder}
        onCreateNew={handleOpenCreate}
        searchQuery={searchQuery}
        filter={filter}
      />

      {/* Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveReminder}
        initialReminder={editingReminder}
      />
    </div>
  );
};
