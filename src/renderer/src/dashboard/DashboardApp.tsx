import React, { useEffect, useState } from 'react';
import { PetMood, PetPosition, CharacterManifest } from '@shared/types/pet';
import { AppSettings } from '@shared/types/settings';
import { FocusTabContent } from './components/focus';
import { AITabContent } from './components/ai/AITabContent';
import { HomeTabContent } from './components/home';
import { RemindersTabContent } from './components/reminders';
import { SettingsTabContent } from './components/settings';
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

  const handleTestAiConnection = async (testKey?: string) => {
    setAiTesting(true);
    setAiFeedback(null);
    try {
      if (!window.roa?.ai) {
        setAiFeedback('AI service is only available inside the ROA desktop application.');
        setAiStatus('not_configured');
        return;
      }
      const res = await window.roa.ai.testConnection(testKey);
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

  const handleSaveAiCredential = async (key: string) => {
    if (!key.trim()) return;
    if (!window.roa?.ai) {
      setAiFeedback('Cannot save credentials outside the ROA desktop application.');
      return;
    }
    setAiTesting(true);
    setAiFeedback(null);
    try {
      await window.roa.ai.saveCredential(key);
      const info = await window.roa.ai.getStatus();
      if (info) {
        setAiProvider(info.provider);
        setAiMaskedKey(info.maskedKey || '');
        setAiStatus(info.status);
        setAiCredentialStatus(info.credentialStatus ?? 'not_configured');
        setAiServiceStatus(info.serviceStatus ?? 'unknown');
      }
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

        {/* Phase 7: Settings Interface */}
        {activeTab === 'settings' && (
          <SettingsTabContent
            character={character}
            characters={characters}
            mood={mood}
            alwaysOnTop={alwaysOnTop}
            petVisible={petVisible}
            clickThrough={clickThrough}
            startWithWindows={startWithWindows}
            shortcutRegistered={shortcutRegistered}
            lowBatteryNotif={lowBatteryNotif}
            lowBatteryThreshold={lowBatteryThreshold}
            isElectron={isElectron}
            aiProvider={aiProvider}
            aiMaskedKey={aiMaskedKey}
            aiStatus={aiStatus}
            aiCredentialStatus={aiCredentialStatus}
            aiServiceStatus={aiServiceStatus}
            aiTesting={aiTesting}
            aiFeedback={aiFeedback}
            onSelectCharacter={handleSelectCharacter}
            onMoodChange={handleMoodChange}
            onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
            onTogglePetVisible={handleTogglePetVisible}
            onToggleClickThrough={handleToggleClickThrough}
            onResetPosition={handleResetPosition}
            onToggleStartWithWindows={handleToggleStartWithWindows}
            onToggleLowBatteryNotif={handleToggleLowBatteryNotif}
            onLowBatteryThresholdChange={handleLowBatteryThresholdChange}
            onToggleAiProvider={handleToggleAiProvider}
            onTestAiConnection={handleTestAiConnection}
            onSaveAiCredential={handleSaveAiCredential}
            onRemoveAiCredential={handleRemoveAiCredential}
          />
        )}
    </DashboardShell>
  );
};
