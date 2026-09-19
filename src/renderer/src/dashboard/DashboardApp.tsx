import React, { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  Settings,
  Bell,
  Bot,
  Move,
  Database,
  ShieldCheck,
  RotateCcw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Smile,
  Bed,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { PetMood, PetPosition, CharacterManifest } from '@shared/types/pet';
import { AppSettings } from '@shared/types/settings';
import { Reminder, CreateReminderInput } from '@shared/types/reminders';
import { useRemindersStore } from './store/useRemindersStore';
import { ReminderModal } from './components/ReminderModal';
import { ReminderItem } from './components/ReminderItem';


export const DashboardApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reminders' | 'ai' | 'settings'>('overview');
  const [character, setCharacter] = useState<CharacterManifest | null>(null);
  const [mood, setMood] = useState<PetMood>('idle');
  const [position, setPosition] = useState<PetPosition>({ x: 0, y: 0 });
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [petVisible, setPetVisible] = useState(true);
  const [appVersion, setAppVersion] = useState('0.1.0');

  useEffect(() => {
    // Load initial data via typed IPC
    if (window.roa) {
      window.roa.character.getActive().then(setCharacter).catch(console.error);
      window.roa.settings.getAll().then((settings: AppSettings) => {
        setMood(settings['pet.currentMood']);
        setPosition(settings['pet.position']);
        setAlwaysOnTop(settings['pet.alwaysOnTop']);
        setPetVisible(settings['pet.visible']);
      }).catch(console.error);

      window.roa.app.getVersion().then(setAppVersion).catch(console.error);

      // Listen for mood changes
      const unsubscribeMood = window.roa.pet.onMoodChanged((newMood) => {
        setMood(newMood);
      });

      // Poll position when dashboard is open (every 1s)
      const posInterval = setInterval(() => {
        window.roa.pet.getPosition().then(setPosition).catch(() => {});
      }, 1000);

      return () => {
        unsubscribeMood();
        clearInterval(posInterval);
      };
    }
    return undefined;
  }, []);

  const handleMoodChange = (newMood: PetMood) => {
    setMood(newMood);
    window.roa?.pet?.setMood?.(newMood);
  };

  const handleToggleAlwaysOnTop = () => {
    const nextVal = !alwaysOnTop;
    setAlwaysOnTop(nextVal);
    window.roa?.pet?.setAlwaysOnTop?.(nextVal);
  };

  const handleTogglePetVisible = () => {
    const nextVal = !petVisible;
    setPetVisible(nextVal);
    if (nextVal) {
      window.roa?.app?.showPet?.();
    } else {
      window.roa?.app?.hidePet?.();
    }
  };

  const handleResetPosition = () => {
    window.roa?.app?.resetPetPosition?.();
    setTimeout(() => {
      window.roa?.pet?.getPosition?.().then(setPosition);
    }, 100);
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] dark:bg-[#1A1A2E] text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-[#252542] border-r border-zinc-200 dark:border-[#3D3D6B] flex flex-col justify-between p-4 select-none">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              R
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-none tracking-tight">ROA</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Companion Shell</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#2D2D4E]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('reminders')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'reminders'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#2D2D4E]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-4 h-4" />
                Reminders
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                Phase 2
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#2D2D4E]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Bot className="w-4 h-4" />
                AI Assistant
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                Phase 5
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#2D2D4E]'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </nav>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-200 dark:border-[#3D3D6B] px-2 text-[11px] text-zinc-500 font-mono">
          <span>v{appVersion} • Phase 1 Shell</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Desktop Companion Overview</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Control your desktop pet, configure window placement, and monitor system storage.
              </p>
            </div>

            {/* Companion Card */}
            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl font-bold">
                    🐱
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{character?.name ?? 'Roa Cat'}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {character?.description ?? 'A curious and loyal desktop companion cat.'}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>

              {/* Mood Controller */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-2">
                  Pet Mood & Animation State:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleMoodChange('idle')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      mood === 'idle'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-zinc-50 dark:bg-[#2D2D4E] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Idle
                  </button>

                  <button
                    onClick={() => handleMoodChange('happy')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      mood === 'happy'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-zinc-50 dark:bg-[#2D2D4E] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5" />
                    Happy
                  </button>

                  <button
                    onClick={() => handleMoodChange('sleeping')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      mood === 'sleeping'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-zinc-50 dark:bg-[#2D2D4E] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <Bed className="w-3.5 h-3.5" />
                    Sleeping
                  </button>
                </div>
              </div>
            </div>

            {/* Window & Placement Card */}
            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold">Pet Window & Placement</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#2D2D4E] border border-zinc-200/80 dark:border-zinc-700/60">
                  <span className="text-zinc-500 block mb-1">Coordinates</span>
                  <span className="font-mono text-sm font-medium">
                    X: {position.x}px • Y: {position.y}px
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#2D2D4E] border border-zinc-200/80 dark:border-zinc-700/60">
                  <span className="text-zinc-500 block mb-1">Window Mode</span>
                  <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Transparent • Frameless
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleToggleAlwaysOnTop}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    alwaysOnTop
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  Always on Top: {alwaysOnTop ? 'Enabled' : 'Disabled'}
                </button>

                <button
                  onClick={handleTogglePetVisible}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {petVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {petVisible ? 'Hide Pet' : 'Show Pet'}
                </button>

                <button
                  onClick={handleResetPosition}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Bottom-Right
                </button>
              </div>
            </div>

            {/* Storage & Architecture Card */}
            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold">Local Storage & Security</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#2D2D4E]">
                  <span className="text-zinc-500 block text-[11px]">Database Engine</span>
                  <span>SQLite (better-sqlite3)</span>
                </div>
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#2D2D4E]">
                  <span className="text-zinc-500 block text-[11px]">Schema Version</span>
                  <span>v1 (Initial Migration)</span>
                </div>
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#2D2D4E]">
                  <span className="text-zinc-500 block text-[11px]">Journal Mode</span>
                  <span>WAL (Write-Ahead Logging)</span>
                </div>
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#2D2D4E]">
                  <span className="text-zinc-500 block text-[11px]">Credential Security</span>
                  <span className="text-indigo-600 dark:text-indigo-400">safeStorage (OS DPAPI)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Full Local Reminders Interface */}
        {activeTab === 'reminders' && (
          <RemindersTabContent />
        )}

        {/* Phase 5: AI Assistant Placeholder */}
        {activeTab === 'ai' && (
          <div className="max-w-3xl space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">AI Assistant (Optional)</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Gemini BYOK and local Ollama integrations. Scheduled for Phase 5.
              </p>
            </div>
            <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold">Phase 5: AI Provider Abstraction</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Credentials will be encrypted with Electron safeStorage, with tool calling allowlisted for local reminders and timers.
              </p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Application Settings</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Configure application preferences and system integration.
              </p>
            </div>

            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Always on Top</h4>
                  <p className="text-zinc-500 mt-0.5">Keep the pet window floating above normal desktop applications</p>
                </div>
                <button
                  onClick={handleToggleAlwaysOnTop}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                    alwaysOnTop ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                >
                  {alwaysOnTop ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Reset Pet Coordinates</h4>
                  <p className="text-zinc-500 mt-0.5">Restore the pet window to its default bottom-right position</p>
                </div>
                <button
                  onClick={handleResetPosition}
                  className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 font-medium"
                >
                  Reset Position
                </button>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">System Tray Integration</h4>
                  <p className="text-zinc-500 mt-0.5">ROA remains running in the Windows system tray when windows are closed</p>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">Active</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const RemindersTabContent: React.FC = () => {
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

    // Refresh on reminder triggers
    const unsubscribe = window.roa?.reminders?.onReminderTriggered?.(() => {
      fetchReminders();
    });

    return () => {
      unsubscribe?.();
    };
  }, [fetchReminders]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      // Filter tab
      if (filter === 'active' && !r.enabled) return false;
      if (filter === 'completed' && r.enabled) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.description?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [reminders, filter, searchQuery]);

  const activeCount = reminders.filter((r) => r.enabled).length;
  const nextReminder = reminders
    .filter((r) => r.enabled)
    .sort((a, b) => a.next_run_at - b.next_run_at)[0];

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
    <div className="max-w-3xl space-y-6">
      {/* Header & New Reminder Action */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Local Reminders Engine</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Offline-first scheduling backed by SQLite with watchdog recovery and native notifications.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all hover:shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Reminder
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] shadow-sm">
          <span className="text-[11px] text-zinc-500 block mb-1">Active Reminders</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {activeCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] shadow-sm">
          <span className="text-[11px] text-zinc-500 block mb-1">Total Scheduled</span>
          <span className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
            {reminders.length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] shadow-sm">
          <span className="text-[11px] text-zinc-500 block mb-1">Next Occurrence</span>
          <span className="text-xs font-semibold truncate text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">
            {nextReminder ? nextReminder.title : 'None scheduled'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#252542] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-[#1E1E38] rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white dark:bg-[#252542] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filter === 'active'
                ? 'bg-white dark:bg-[#252542] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-white dark:bg-[#252542] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.length > 0 ? (
          filteredReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onToggle={toggleReminder}
              onEdit={handleOpenEdit}
              onDelete={deleteReminder}
              onSnooze={snoozeReminder}
            />
          ))
        ) : (
          <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-10 text-center space-y-3 bg-zinc-50/50 dark:bg-[#1E1E38]/30">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">No reminders found</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-0.5">
                {searchQuery
                  ? 'No reminders match your search query.'
                  : filter === 'active'
                  ? 'You have no active reminders right now.'
                  : 'Get started by creating your first offline reminder.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Reminder
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveReminder}
        initialReminder={editingReminder}
      />
    </div>
  );
};

