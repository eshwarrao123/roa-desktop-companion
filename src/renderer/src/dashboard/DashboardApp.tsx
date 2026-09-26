import React, { useEffect, useState, useMemo } from 'react';
import {
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
  Filter,
  Brain,
  PartyPopper,
  Battery,
  Zap,
  Monitor,
  Keyboard,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { PetMood, PetPosition, CharacterManifest } from '@shared/types/pet';
import { AppSettings } from '@shared/types/settings';
import { Reminder, CreateReminderInput } from '@shared/types/reminders';
import { useRemindersStore } from './store/useRemindersStore';
import { ReminderModal } from './components/ReminderModal';
import { ReminderItem } from './components/ReminderItem';
import { CharacterCard } from './components/CharacterCard';
import { TimersTabContent } from './components/TimersTabContent';
import { AITabContent } from './components/AITabContent';
import { AIProviderStatus } from '@shared/types/ai';
import { DashboardShell } from './layout/DashboardShell';

export const DashboardApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reminders' | 'timers' | 'ai' | 'settings'>('overview');
  const [character, setCharacter] = useState<CharacterManifest | null>(null);
  const [characters, setCharacters] = useState<CharacterManifest[]>([]);
  const [mood, setMood] = useState<PetMood>('idle');
  const [position, setPosition] = useState<PetPosition>({ x: 0, y: 0 });
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [petVisible, setPetVisible] = useState(true);
  const [clickThrough, setClickThrough] = useState(false);
  const [startWithWindows, setStartWithWindows] = useState(false);
  const [lowBatteryNotif, setLowBatteryNotif] = useState(true);
  const [lowBatteryThreshold, setLowBatteryThreshold] = useState(20);
  const [idleReaction, setIdleReaction] = useState(false);
  const [idleThresholdSeconds, setIdleThresholdSeconds] = useState(300);
  const [shortcutRegistered, setShortcutRegistered] = useState(true);
  const [appVersion, setAppVersion] = useState('0.1.0');

  // AI Settings state
  const isElectron = typeof window !== 'undefined' && Boolean(window.roa);
  const [aiProvider, setAiProvider] = useState<'disabled' | 'gemini'>('disabled');
  const [aiMaskedKey, setAiMaskedKey] = useState('');
  const [aiInputKey, setAiInputKey] = useState('');
  const [aiStatus, setAiStatus] = useState<AIProviderStatus>('not_configured');
  const [aiCredentialStatus, setAiCredentialStatus] = useState<'not_configured' | 'verified' | 'invalid'>('not_configured');
  const [aiServiceStatus, setAiServiceStatus] = useState<'available' | 'temporarily_unavailable' | 'rate_limited' | 'daily_quota_exceeded' | 'offline' | 'unknown'>('unknown');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isEditingKey, setIsEditingKey] = useState(false);

  useEffect(() => {
    // Load initial data via typed IPC
    if (window.roa) {
      window.roa.character.getActive().then(setCharacter).catch(console.error);
      window.roa.character.list().then(setCharacters).catch(console.error);
      window.roa.settings.getAll().then((settings: AppSettings) => {
        setMood(settings['pet.currentMood']);
        setPosition(settings['pet.position']);
        setAlwaysOnTop(settings['pet.alwaysOnTop']);
        setPetVisible(settings['pet.visible']);
        setClickThrough(settings['pet.clickThrough']);
        setStartWithWindows(settings['app.startWithWindows']);
        setLowBatteryNotif(settings['system.lowBatteryNotification']);
        setLowBatteryThreshold(settings['system.lowBatteryThreshold']);
        setIdleReaction(settings['system.idleReaction']);
        setIdleThresholdSeconds(settings['system.idleThresholdSeconds']);
      }).catch(console.error);

      window.roa.system.getStartupStatus().then(setStartWithWindows).catch(console.error);
      window.roa.shortcuts.getStatus().then((status) => {
        setShortcutRegistered(status.registered);
      }).catch(console.error);

      window.roa.app.getVersion().then(setAppVersion).catch(console.error);

      window.roa.ai?.getStatus?.().then((info) => {
        setAiProvider(info.provider);
        setAiMaskedKey(info.maskedKey || '');
        setAiStatus(info.status);
        setAiCredentialStatus(info.credentialStatus ?? 'not_configured');
        setAiServiceStatus(info.serviceStatus ?? 'unknown');
      }).catch(console.error);

      // Listen for AI service status push updates (e.g. after a chat error)
      const unsubAiStatus = window.roa.ai?.onStatusChanged?.((info) => {
        setAiProvider(info.provider);
        setAiMaskedKey(info.maskedKey || '');
        setAiStatus(info.status);
        setAiCredentialStatus(info.credentialStatus ?? 'not_configured');
        setAiServiceStatus(info.serviceStatus ?? 'unknown');
      });

      // Listen for mood changes
      const unsubscribeMood = window.roa.pet.onMoodChanged((newMood) => {
        setMood(newMood);
      });

      // Listen for character changes
      const unsubscribeChar = window.roa.character.onChanged((newChar) => {
        setCharacter(newChar);
      });

      // Poll position when dashboard is open (every 1s)
      const posInterval = setInterval(() => {
        window.roa.pet.getPosition().then(setPosition).catch(() => {});
      }, 1000);

      return () => {
        unsubAiStatus?.();
        unsubscribeMood();
        unsubscribeChar();
        clearInterval(posInterval);
      };
    }
    return undefined;
  }, []);

  const handleSelectCharacter = (id: string) => {
    window.roa?.character?.setActive?.(id).catch(console.error);
  };

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

  const handleToggleClickThrough = () => {
    const nextVal = !clickThrough;
    setClickThrough(nextVal);
    window.roa?.pet?.setClickThrough?.(nextVal);
  };

  const handleToggleStartWithWindows = () => {
    const nextVal = !startWithWindows;
    setStartWithWindows(nextVal);
    window.roa?.system?.setStartupEnabled?.(nextVal).then(setStartWithWindows).catch(console.error);
  };

  const handleToggleLowBatteryNotif = () => {
    const nextVal = !lowBatteryNotif;
    setLowBatteryNotif(nextVal);
    window.roa?.settings?.set?.('system.lowBatteryNotification', nextVal);
  };

  const handleLowBatteryThresholdChange = (val: number) => {
    setLowBatteryThreshold(val);
    window.roa?.settings?.set?.('system.lowBatteryThreshold', val);
  };

  const handleToggleIdleReaction = () => {
    const nextVal = !idleReaction;
    setIdleReaction(nextVal);
    window.roa?.settings?.set?.('system.idleReaction', nextVal);
  };

  const handleIdleThresholdChange = (val: number) => {
    setIdleThresholdSeconds(val);
    window.roa?.settings?.set?.('system.idleThresholdSeconds', val);
  };

  const handleToggleAiProvider = async () => {
    if (!window.roa?.settings) return;
    const next = aiProvider === 'disabled' ? 'gemini' : 'disabled';
    setAiProvider(next);
    await window.roa.settings.set('ai.provider', next);
    const info = await window.roa.ai?.getStatus?.();
    if (info) {
      setAiStatus(info.status);
      setAiCredentialStatus(info.credentialStatus ?? 'not_configured');
      setAiServiceStatus(info.serviceStatus ?? 'unknown');
    }
  };

  const handleTestAiConnection = async () => {
    setAiTesting(true);
    setAiFeedback(null);
    try {
      if (!window.roa?.ai) {
        setAiFeedback('AI service is only available inside the ROA desktop application.');
        setAiStatus('not_configured');
        return;
      }
      const res = await window.roa.ai.testConnection(aiInputKey || undefined);
      if (res?.success) {
        setAiFeedback('Connection verified successfully.');
        setAiStatus('connected');
        setAiCredentialStatus('verified');
        setAiServiceStatus('available');
      } else {
        const code = res?.code as AIProviderStatus | undefined;
        setAiStatus(code ?? 'error');
        // Only mark credential invalid for actual auth failures
        if (code === 'invalid_credential') {
          setAiCredentialStatus('invalid');
          setAiFeedback('Invalid API key. Please check your key from Google AI Studio.');
        } else if (code === 'daily_quota_exceeded') {
          setAiCredentialStatus('verified');
          setAiServiceStatus('daily_quota_exceeded');
          setAiFeedback("Gemini's free daily limit has been reached. Your key is valid — try again after the quota resets.");
        } else if (code === 'temporarily_unavailable') {
          setAiCredentialStatus('verified');
          setAiServiceStatus('temporarily_unavailable');
          setAiFeedback('Gemini is temporarily unavailable. Your key is valid — try again in a moment.');
        } else if (code === 'rate_limited') {
          setAiCredentialStatus('verified');
          setAiServiceStatus('rate_limited');
          setAiFeedback('Rate limit reached. Please wait a moment and try again.');
        } else if (code === 'offline') {
          setAiServiceStatus('offline');
          setAiFeedback('Network error: Unable to reach Gemini. Please check your internet connection.');
        } else {
          setAiFeedback(`Connection failed: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      setAiFeedback(`Error: ${err?.message || err}`);
      setAiStatus('error');
    } finally {
      setAiTesting(false);
    }
  };

  const handleSaveAiCredential = async () => {
    if (!aiInputKey.trim()) return;
    if (!window.roa?.ai) {
      setAiFeedback('Cannot save credentials outside the ROA desktop application.');
      return;
    }
    setAiTesting(true);
    setAiFeedback(null);
    try {
      await window.roa.ai.saveCredential(aiInputKey);
      const info = await window.roa.ai.getStatus();
      if (info) {
        setAiProvider(info.provider);
        setAiMaskedKey(info.maskedKey || '');
        setAiStatus(info.status);
        setAiCredentialStatus(info.credentialStatus ?? 'not_configured');
        setAiServiceStatus(info.serviceStatus ?? 'unknown');
      }
      setAiInputKey('');
      setIsEditingKey(false);
      setAiFeedback('Credential saved and verified!');
    } catch (err: any) {
      setAiFeedback(`Save failed: ${err?.message || err}`);
    } finally {
      setAiTesting(false);
    }
  };

  const handleRemoveAiCredential = async () => {
    if (!window.roa?.ai) return;
    await window.roa.ai.removeCredential();
    setAiProvider('disabled');
    setAiMaskedKey('');
    setAiStatus('not_configured');
    setAiCredentialStatus('not_configured');
    setAiServiceStatus('unknown');
    setAiFeedback('Credential removed.');
  };


  return (
    <DashboardShell activeTab={activeTab} onTabChange={setActiveTab}>
        {!isElectron && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-100">Browser Preview Mode</h4>
              <p className="mt-0.5 text-amber-700 dark:text-amber-300">
                This screen is available inside the ROA desktop application. Full desktop functionality (pet window, offline reminders, system timers, and AI bridge) requires launching via Electron.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Home</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Your companion is here to help you stay focused and on track.
              </p>
            </div>

            {/* Current Companion */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Your Companion
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.map((char) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    isActive={character?.id === char.id}
                    onSelect={handleSelectCharacter}
                  />
                ))}
              </div>
            </div>

            {/* Mood Controller Card */}
            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Current Mood</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {character?.name ?? 'Your companion'} is currently <span className="capitalize font-medium text-zinc-700 dark:text-zinc-300">{mood}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                <button
                  onClick={() => handleMoodChange('idle')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
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
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
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
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    mood === 'sleeping'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-zinc-50 dark:bg-[#2D2D4E] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <Bed className="w-3.5 h-3.5" />
                  Sleeping
                </button>

                <button
                  onClick={() => handleMoodChange('thinking')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    mood === 'thinking'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-zinc-50 dark:bg-[#2D2D4E] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                  Thinking
                </button>

                <button
                  onClick={() => handleMoodChange('celebrating')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    mood === 'celebrating'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-zinc-50 dark:bg-[#2D2D4E] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <PartyPopper className="w-3.5 h-3.5" />
                  Celebrating
                </button>
              </div>
            </div>

            {/* Window & Placement Card */}
            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold">Window Placement</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#2D2D4E] border border-zinc-200/80 dark:border-zinc-700/60">
                  <span className="text-zinc-500 block mb-1">Coordinates</span>
                  <span className="font-mono text-sm font-medium">
                    X: {position.x}px • Y: {position.y}px
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#2D2D4E] border border-zinc-200/80 dark:border-zinc-700/60">
                  <span className="text-zinc-500 block mb-1">Status</span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Active
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

            {/* Privacy & Data Card */}
            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold">Privacy & Data</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded bg-zinc-50 dark:bg-[#2D2D4E]">
                  <span className="text-zinc-600 dark:text-zinc-400">All data stored locally</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-zinc-50 dark:bg-[#2D2D4E]">
                  <span className="text-zinc-600 dark:text-zinc-400">Works fully offline</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-zinc-50 dark:bg-[#2D2D4E]">
                  <span className="text-zinc-600 dark:text-zinc-400">Credentials encrypted</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Full Local Reminders Interface */}
        {activeTab === 'reminders' && (
          <RemindersTabContent />
        )}

        {/* Phase 4: Full Local Timers & Pomodoro Interface */}
        {activeTab === 'timers' && (
          <TimersTabContent />
        )}

        {/* Phase 5: Full Local AI Assistant Interface */}
        {activeTab === 'ai' && (
          <AITabContent onNavigateToSettings={() => setActiveTab('settings')} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Customize how ROA works with your desktop.
              </p>
            </div>

            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {/* Windows Startup */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Launch at Startup</h4>
                  <p className="text-zinc-500 mt-0.5">Open ROA automatically when Windows starts</p>
                </div>
                <button
                  onClick={handleToggleStartWithWindows}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                    startWithWindows ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {startWithWindows ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Global Shortcut */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Global Shortcut</h4>
                  <p className="text-zinc-500 mt-0.5">Press this anywhere to open ROA</p>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                    Ctrl + Shift + Space
                  </kbd>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    shortcutRegistered
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}>
                    {shortcutRegistered ? 'Active' : 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Pet Click-Through Mode */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Click-Through Mode</h4>
                  <p className="text-zinc-500 mt-0.5">Let clicks pass through your companion to windows beneath</p>
                </div>
                <button
                  onClick={handleToggleClickThrough}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                    clickThrough ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {clickThrough ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Low Battery Alert */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Low Battery Alert</h4>
                  <p className="text-zinc-500 mt-0.5">Get notified when battery is running low</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-[11px]">Threshold:</span>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={lowBatteryThreshold}
                      onChange={(e) => handleLowBatteryThresholdChange(parseInt(e.target.value, 10) || 20)}
                      className="w-14 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-center font-mono text-xs"
                    />
                    <span className="text-zinc-400 text-[11px]">%</span>
                  </div>
                  <button
                    onClick={handleToggleLowBatteryNotif}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                      lowBatteryNotif ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {lowBatteryNotif ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Idle Reaction */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Sleep When Idle</h4>
                  <p className="text-zinc-500 mt-0.5">Your companion takes a nap when you're away</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-[11px]">After:</span>
                    <input
                      type="number"
                      min="30"
                      max="1800"
                      step="30"
                      value={idleThresholdSeconds}
                      onChange={(e) => handleIdleThresholdChange(parseInt(e.target.value, 10) || 300)}
                      className="w-16 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-center font-mono text-xs"
                    />
                    <span className="text-zinc-400 text-[11px]">sec</span>
                  </div>
                  <button
                    onClick={handleToggleIdleReaction}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                      idleReaction ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {idleReaction ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Always on Top */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Always on Top</h4>
                  <p className="text-zinc-500 mt-0.5">Keep the pet window floating above normal desktop applications</p>
                </div>
                <button
                  onClick={handleToggleAlwaysOnTop}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                    alwaysOnTop ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {alwaysOnTop ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Reset Position */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Reset Position</h4>
                  <p className="text-zinc-500 mt-0.5">Move your companion back to the bottom-right corner</p>
                </div>
                <button
                  onClick={handleResetPosition}
                  className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 font-medium transition-colors"
                >
                  Reset Position
                </button>
              </div>

              {/* Tray Integration */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100">System Tray</h4>
                  <p className="text-zinc-500 mt-0.5">ROA stays in your system tray</p>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
              </div>
            </div>

            {/* AI Companion Configuration */}
            <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">

              {/* Header row */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">AI Assistant</h4>
                  <p className="text-zinc-500 mt-0.5">Powered by Google Gemini with your API key</p>
                </div>
                <button
                  onClick={handleToggleAiProvider}
                  disabled={!isElectron}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors disabled:opacity-50 ${
                    aiProvider === 'gemini'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {aiProvider === 'gemini' ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Credential section */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">API Key</h4>
                    <p className="text-zinc-500 mt-0.5">
                      {aiMaskedKey
                        ? 'Your key is stored securely on this device.'
                        : 'Get your free API key from Google AI Studio.'}
                    </p>
                  </div>
                  {aiMaskedKey && !isEditingKey && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
                        {aiMaskedKey}
                      </span>
                      <button
                        onClick={() => setIsEditingKey(true)}
                        className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                      >
                        Change Key
                      </button>
                      <button
                        onClick={handleRemoveAiCredential}
                        className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {(!aiMaskedKey || isEditingKey) && (
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={aiInputKey}
                      onChange={(e) => setAiInputKey(e.target.value)}
                      placeholder="AIzaSy..."
                      disabled={!isElectron}
                      className="flex-1 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono text-xs placeholder-zinc-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    />
                    <button
                      onClick={handleTestAiConnection}
                      disabled={aiTesting || !isElectron}
                      className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 font-medium transition-colors disabled:opacity-50"
                    >
                      {aiTesting ? 'Testing...' : 'Test Connection'}
                    </button>
                    {aiInputKey.trim() && (
                      <button
                        onClick={handleSaveAiCredential}
                        disabled={aiTesting || !isElectron}
                        className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        Save Key
                      </button>
                    )}
                    {isEditingKey && (
                      <button
                        onClick={() => {
                          setIsEditingKey(false);
                          setAiInputKey('');
                        }}
                        className="px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}

                {aiFeedback && (
                  <p
                    className={`text-xs ${
                      aiFeedback.includes('successfully') || aiFeedback.includes('verified') || aiFeedback.includes('saved')
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : aiFeedback.includes('limit') || aiFeedback.includes('unavailable') || aiFeedback.includes('rate')
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {aiFeedback}
                  </p>
                )}
              </div>

              {/* Provider Status section */}
              <div className="p-4 space-y-3">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Status</h4>

                {/* Credential status row */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">API Key</span>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    aiCredentialStatus === 'verified'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : aiCredentialStatus === 'invalid'
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {aiCredentialStatus === 'verified' ? 'Verified' : aiCredentialStatus === 'invalid' ? 'Invalid' : 'Not Configured'}
                  </span>
                </div>

                {/* Service status row */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Service</span>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    aiServiceStatus === 'available'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : aiServiceStatus === 'temporarily_unavailable' || aiServiceStatus === 'rate_limited'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : aiServiceStatus === 'daily_quota_exceeded'
                      ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                      : aiServiceStatus === 'offline'
                      ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {aiServiceStatus === 'available'
                      ? 'Available'
                      : aiServiceStatus === 'temporarily_unavailable'
                      ? 'Temporarily Unavailable'
                      : aiServiceStatus === 'daily_quota_exceeded'
                      ? 'Daily Limit Reached'
                      : aiServiceStatus === 'rate_limited'
                      ? 'Rate Limited'
                      : aiServiceStatus === 'offline'
                      ? 'Offline'
                      : 'Unknown'}
                  </span>
                </div>

                {/* Test connection action */}
                {aiMaskedKey && !isEditingKey && (
                  <div className="pt-1">
                    <button
                      onClick={handleTestAiConnection}
                      disabled={aiTesting || !isElectron}
                      className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 font-medium transition-colors disabled:opacity-50"
                    >
                      {aiTesting ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </DashboardShell>
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
          <h2 className="text-2xl font-semibold tracking-tight">Reminders</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Your reminders work offline and stay private on this device.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all hover:shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          New Reminder
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] shadow-sm">
          <span className="text-xs text-zinc-500 block mb-1">Active</span>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {activeCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] shadow-sm">
          <span className="text-xs text-zinc-500 block mb-1">Total</span>
          <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
            {reminders.length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] shadow-sm">
          <span className="text-xs text-zinc-500 block mb-1">Coming Up</span>
          <span className="text-sm font-semibold truncate text-emerald-600 dark:text-emerald-400 block mt-1">
            {nextReminder ? nextReminder.title : 'None'}
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

