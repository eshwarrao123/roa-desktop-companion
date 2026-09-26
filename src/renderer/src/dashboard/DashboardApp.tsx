import React, { useEffect, useState } from 'react';
import {
  Move,
  ShieldCheck,
  RotateCcw,
  Eye,
  EyeOff,
  Sun,
  Smile,
  Bed,
  Brain,
  PartyPopper,
  AlertCircle,
} from 'lucide-react';
import { PetMood, PetPosition, CharacterManifest } from '@shared/types/pet';
import { AppSettings } from '@shared/types/settings';
import { CharacterCard } from './components/CharacterCard';
import { FocusTabContent } from './components/focus';
import { AITabContent } from './components/ai/AITabContent';
import { HomeTabContent } from './components/home';
import { RemindersTabContent } from './components/reminders';
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
          <HomeTabContent
            onNavigateToFocus={() => setActiveTab('timers')}
            onNavigateToReminders={() => setActiveTab('reminders')}
            onNavigateToAI={() => setActiveTab('ai')}
          />
        )}

        {/* Phase 6: Full Local Reminders Interface */}
        {activeTab === 'reminders' && (
          <RemindersTabContent />
        )}

        {/* Phase 4: Full Local Timers & Pomodoro Interface */}
        {activeTab === 'timers' && (
          <FocusTabContent />
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

