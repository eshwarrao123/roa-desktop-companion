import { create } from 'zustand';
import { Reminder, CreateReminderInput, UpdateReminderInput } from '@shared/types/reminders';

interface RemindersState {
  reminders: Reminder[];
  isLoading: boolean;
  filter: 'all' | 'active' | 'completed';
  searchQuery: string;

  fetchReminders: () => Promise<void>;
  createReminder: (input: CreateReminderInput) => Promise<Reminder>;
  updateReminder: (id: string, input: UpdateReminderInput) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string, enabled: boolean) => Promise<void>;
  snoozeReminder: (id: string, minutes: number) => Promise<void>;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  setSearchQuery: (query: string) => void;
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  reminders: [],
  isLoading: false,
  filter: 'all',
  searchQuery: '',

  fetchReminders: async () => {
    if (!window.roa?.reminders) return;
    set({ isLoading: true });
    try {
      const list = await window.roa.reminders.list();
      set({ reminders: list });
    } catch (err) {
      console.error('[RemindersStore] Failed to fetch reminders:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  createReminder: async (input: CreateReminderInput) => {
    if (!window.roa?.reminders) throw new Error('ROA API not available');
    const created = await window.roa.reminders.create(input);
    set((state) => ({
      reminders: [...state.reminders, created].sort((a, b) => a.next_run_at - b.next_run_at),
    }));
    return created;
  },

  updateReminder: async (id: string, input: UpdateReminderInput) => {
    if (!window.roa?.reminders) throw new Error('ROA API not available');
    const updated = await window.roa.reminders.update(id, input);
    set((state) => ({
      reminders: state.reminders
        .map((r) => (r.id === id ? updated : r))
        .sort((a, b) => a.next_run_at - b.next_run_at),
    }));
    return updated;
  },

  deleteReminder: async (id: string) => {
    if (!window.roa?.reminders) return;
    await window.roa.reminders.delete(id);
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
  },

  toggleReminder: async (id: string, enabled: boolean) => {
    if (!window.roa?.reminders) return;
    if (enabled) {
      await window.roa.reminders.enable(id);
    } else {
      await window.roa.reminders.disable(id);
    }
    await get().fetchReminders();
  },

  snoozeReminder: async (id: string, minutes: number) => {
    if (!window.roa?.reminders) return;
    await window.roa.reminders.snooze(id, minutes);
    await get().fetchReminders();
  },

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
