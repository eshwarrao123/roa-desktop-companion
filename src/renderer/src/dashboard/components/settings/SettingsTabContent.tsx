import React, { useEffect, useState } from 'react';
import { CharacterManifest, PetMood } from '@shared/types/pet';
import { AIProviderStatus } from '@shared/types/ai';
import { CompanionSettings } from './CompanionSettings';
import { DesktopSettings } from './DesktopSettings';
import { AISettings } from './AISettings';
import { AlertCircle } from 'lucide-react';

export interface SettingsTabContentProps {
  // Character state
  character: CharacterManifest | null;
  characters: CharacterManifest[];
  mood: PetMood;
  alwaysOnTop: boolean;
  petVisible: boolean;
  clickThrough: boolean;
  
  // Desktop state
  startWithWindows: boolean;
  shortcutRegistered: boolean;
  lowBatteryNotif: boolean;
  lowBatteryThreshold: number;
  
  // AI state
  isElectron: boolean;
  aiProvider: 'disabled' | 'gemini';
  aiMaskedKey: string;
  aiStatus: AIProviderStatus;
  aiCredentialStatus: 'not_configured' | 'verified' | 'invalid';
  aiServiceStatus: 'available' | 'temporarily_unavailable' | 'rate_limited' | 'daily_quota_exceeded' | 'offline' | 'unknown';
  aiTesting: boolean;
  aiFeedback: string | null;
  
  // Handlers
  onSelectCharacter: (id: string) => void;
  onMoodChange: (mood: PetMood) => void;
  onToggleAlwaysOnTop: () => void;
  onTogglePetVisible: () => void;
  onToggleClickThrough: () => void;
  onResetPosition: () => void;
  onToggleStartWithWindows: () => void;
  onToggleLowBatteryNotif: () => void;
  onLowBatteryThresholdChange: (val: number) => void;
  onToggleAiProvider: () => void;
  onTestAiConnection: (testKey?: string) => void;
  onSaveAiCredential: (key: string) => void;
  onRemoveAiCredential: () => void;
}

export const SettingsTabContent: React.FC<SettingsTabContentProps> = ({
  character,
  characters,
  mood,
  alwaysOnTop,
  petVisible,
  clickThrough,
  startWithWindows,
  shortcutRegistered,
  lowBatteryNotif,
  lowBatteryThreshold,
  isElectron,
  aiProvider,
  aiMaskedKey,
  aiStatus,
  aiCredentialStatus,
  aiServiceStatus,
  aiTesting,
  aiFeedback,
  onSelectCharacter,
  onMoodChange,
  onToggleAlwaysOnTop,
  onTogglePetVisible,
  onToggleClickThrough,
  onResetPosition,
  onToggleStartWithWindows,
  onToggleLowBatteryNotif,
  onLowBatteryThresholdChange,
  onToggleAiProvider,
  onTestAiConnection,
  onSaveAiCredential,
  onRemoveAiCredential,
}) => {
  return (
    <div className="max-w-3xl space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-page-title text-roa-text-primary">Settings</h2>
        <p className="text-secondary text-roa-text-muted mt-1">
          Configure Roa to fit your day
        </p>
      </div>

      {!isElectron && (
        <div className="p-4 rounded-roa bg-roa-raised border border-roa-border text-roa-text-secondary text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-roa-clay shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-roa-text-primary">Browser Preview Mode</h4>
            <p className="mt-0.5 text-roa-text-secondary">
              Full desktop functionality requires launching the Roa desktop application.
            </p>
          </div>
        </div>
      )}

      {/* Companion Section */}
      <CompanionSettings
        character={character}
        characters={characters}
        mood={mood}
        petVisible={petVisible}
        alwaysOnTop={alwaysOnTop}
        clickThrough={clickThrough}
        onSelectCharacter={onSelectCharacter}
        onMoodChange={onMoodChange}
        onTogglePetVisible={onTogglePetVisible}
        onToggleAlwaysOnTop={onToggleAlwaysOnTop}
        onToggleClickThrough={onToggleClickThrough}
        onResetPosition={onResetPosition}
      />

      {/* Desktop Section */}
      <DesktopSettings
        startWithWindows={startWithWindows}
        shortcutRegistered={shortcutRegistered}
        lowBatteryNotif={lowBatteryNotif}
        lowBatteryThreshold={lowBatteryThreshold}
        onToggleStartWithWindows={onToggleStartWithWindows}
        onToggleLowBatteryNotif={onToggleLowBatteryNotif}
        onLowBatteryThresholdChange={onLowBatteryThresholdChange}
      />

      {/* AI Section */}
      <AISettings
        isElectron={isElectron}
        aiProvider={aiProvider}
        aiMaskedKey={aiMaskedKey}
        aiCredentialStatus={aiCredentialStatus}
        aiServiceStatus={aiServiceStatus}
        aiTesting={aiTesting}
        aiFeedback={aiFeedback}
        onToggleAiProvider={onToggleAiProvider}
        onTestConnection={onTestAiConnection}
        onSaveCredential={onSaveAiCredential}
        onRemoveCredential={onRemoveAiCredential}
      />
    </div>
  );
};
