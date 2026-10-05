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

const moodOptions: { value: PetMood; label: string }[] = [
  { value: 'idle', label: 'Idle' },
  { value: 'happy', label: 'Happy' },
  { value: 'sleeping', label: 'Sleeping' },
  { value: 'thinking', label: 'Thinking' },
  { value: 'celebrating', label: 'Celebrating' },
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
      <div className="space-y-3">
        <div className="text-sm font-medium text-roa-text-primary">
          Choose your companion
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {characters.map((char) => {
            const isActive = character?.id === char.id;
            
            return (
              <button
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                disabled={isActive}
                className={`
                  p-3 rounded-roa border text-left transition-colors
                  ${isActive
                    ? 'border-roa-sage'
                    : 'border-roa-border hover:border-roa-sage/40'
                  }
                  disabled:cursor-default
                `}
              >
                <div className="space-y-2.5">
                  {/* Character Preview - Deferred until final artwork is ready */}
                  <div className="w-[120px] h-[120px] mx-auto rounded-roa-preview bg-roa-canvas border border-roa-border flex items-center justify-center">
                    <div className="text-center px-3">
                      <div className="text-[10px] font-medium text-roa-text-muted">
                        Character preview coming soon
                      </div>
                    </div>
                  </div>
                  
                  {/* Character Info */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
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
          Companion mood
        </div>
        <select
          value={mood}
          onChange={(e) => onMoodChange(e.target.value as PetMood)}
          className="w-full px-3 py-2.5 text-sm bg-roa-raised border border-roa-border rounded-roa text-roa-text-primary focus:outline-none focus:border-roa-sage focus:ring-1 focus:ring-roa-sage"
        >
          {moodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Divider />

      {/* Companion Behavior - Compact utility rows with dividers */}
      <div>
        <SettingsRow
          label="Companion visible"
          description="Show or hide your floating companion"
        >
          <Toggle checked={petVisible} onChange={onTogglePetVisible} />
        </SettingsRow>

        <Divider />

        <SettingsRow
          label="Always on top"
          description="Keep companion above other windows"
        >
          <Toggle checked={alwaysOnTop} onChange={onToggleAlwaysOnTop} />
        </SettingsRow>

        <Divider />

        <SettingsRow
          label="Click-through mode"
          description="Let clicks pass through to windows beneath"
        >
          <Toggle checked={clickThrough} onChange={onToggleClickThrough} />
        </SettingsRow>

        <Divider />

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
