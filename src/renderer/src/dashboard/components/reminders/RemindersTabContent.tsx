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
    <div className="w-full max-w-[840px] mx-auto pt-roa-margin px-roa-gutter space-y-6">
      {/* Header with Summary */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-page-title text-roa-text-primary">Reminders</h1>
          <p className="text-secondary text-roa-text-secondary mt-1">
            Offline reminders that stay private on this device
          </p>
          <div className="mt-3">
            <ReminderSummary reminders={reminders} />
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="h-9 flex items-center gap-2 px-4 rounded-roa border border-roa-sage bg-transparent hover:bg-roa-sage hover:text-roa-canvas text-roa-sage text-secondary font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Reminder
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-roa-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-roa border border-roa-border bg-roa-raised text-body text-roa-text-primary placeholder-roa-text-muted focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
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
