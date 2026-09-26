import React from 'react';
import { CharacterManifest, PetMood } from '@shared/types/pet';
import { SectionLabel } from '../ui/SectionLabel';
import { Divider } from '../ui/Divider';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { SettingsRow } from './SettingsRow';
import { Check } from 'lucide-react';

export interface CompanionSettingsProps {
  character: CharacterManifest | null;
  characters: CharacterManifest[];
  mood: PetMood;
  petVisible: boolean;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  onSelectCharacter: (id: string) => void;
  onMoodChange: (mood: PetMood) => void;
  onTogglePetVisible: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleClickThrough: () => void;
  onResetPosition: () => void;
}

const moodOptions: { value: PetMood; label: string; icon: string }[] = [
  { value: 'idle', label: 'Idle', icon: '😌' },
  { value: 'happy', label: 'Happy', icon: '😊' },
  { value: 'sleeping', label: 'Sleeping', icon: '😴' },
  { value: 'thinking', label: 'Thinking', icon: '🤔' },
  { value: 'celebrating', label: 'Celebrating', icon: '🎉' },
];

export const CompanionSettings: React.FC<CompanionSettingsProps> = ({
  character,
  characters,
  mood,
  petVisible,
  alwaysOnTop,
  clickThrough,
  onSelectCharacter,
  onMoodChange,
  onTogglePetVisible,
  onToggleAlwaysOnTop,
  onToggleClickThrough,
  onResetPosition,
}) => {
  return (
    <div className="space-y-6">
      <SectionLabel>COMPANION</SectionLabel>

      {/* Character Selection */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-roa-text-primary">
          Choose your companion
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {characters.map((char) => {
            const isActive = character?.id === char.id;
            
            return (
              <button
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                disabled={isActive}
                className={`
                  p-4 rounded-lg border text-left transition-all
                  ${isActive
                    ? 'bg-roa-surface-tint border-roa-sage ring-1 ring-roa-sage'
                    : 'bg-roa-surface border-roa-divider hover:border-roa-sage/40'
                  }
                  disabled:cursor-default
                `}
              >
                <div className="space-y-3">
                  {/* Character Preview - Deferred until final artwork is ready */}
                  <div className="w-full aspect-square rounded-lg bg-roa-background border border-roa-divider flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="text-xs font-medium text-roa-text-secondary mb-0.5">
                        {char.name}
                      </div>
                      <div className="text-[10px] text-roa-text-muted">
                        Character preview coming soon
                      </div>
                    </div>
                  </div>
                  
                  {/* Character Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-roa-text-primary">
                        {char.name}
                      </h4>
                      {isActive && (
                        <Check className="w-3.5 h-3.5 text-roa-sage shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-roa-text-muted line-clamp-2">
                      {char.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mood Selection */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-roa-text-primary">
          Mood
        </div>
        <div className="flex flex-wrap gap-2">
          {moodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onMoodChange(option.value)}
              className={`
                px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                flex items-center gap-2
                ${mood === option.value
                  ? 'bg-roa-surface-tint border-roa-sage text-roa-sage'
                  : 'bg-roa-surface border-roa-divider text-roa-text-secondary hover:border-roa-sage/40'
                }
              `}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Companion Behavior */}
      <div className="space-y-px bg-roa-surface border border-roa-divider rounded-lg divide-y divide-roa-divider">
        <SettingsRow
          label="Companion visible"
          description="Show or hide your floating companion"
        >
          <Toggle checked={petVisible} onChange={onTogglePetVisible} />
        </SettingsRow>

        <SettingsRow
          label="Always on top"
          description="Keep companion above other windows"
        >
          <Toggle checked={alwaysOnTop} onChange={onToggleAlwaysOnTop} />
        </SettingsRow>

        <SettingsRow
          label="Click-through mode"
          description="Let clicks pass through companion to windows beneath"
        >
          <Toggle checked={clickThrough} onChange={onToggleClickThrough} />
        </SettingsRow>

        <SettingsRow
          label="Position"
          description="Move companion back to default location"
        >
          <Button variant="secondary" size="sm" onClick={onResetPosition}>
            Reset Position
          </Button>
        </SettingsRow>
      </div>
    </div>
  );
};
