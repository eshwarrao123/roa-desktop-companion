import React from 'react';
import { CharacterManifest } from '@shared/types/pet';
import { Check, Sparkles } from 'lucide-react';

interface CharacterCardProps {
  character: CharacterManifest;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isActive,
  onSelect,
}) => {
  const isCat = character.id === 'roa-cat';

  return (
    <div
      className={`p-4 rounded-roa-preview border transition-all flex flex-col justify-between ${
        isActive
          ? 'bg-roa-raised border-roa-sage'
          : 'bg-roa-raised border-roa-border hover:border-roa-sage/50'
      }`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-roa-preview flex items-center justify-center text-2xl font-bold border border-roa-border bg-roa-canvas">
              {isCat ? '🐱' : '🐰'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-semibold text-roa-text-primary">
                  {character.name}
                </h4>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-roa-sm bg-roa-canvas border border-roa-border text-roa-text-muted">
                  v{character.version}
                </span>
              </div>
              <p className="text-[11px] text-roa-text-muted">By {character.author}</p>
            </div>
          </div>

          {isActive && (
            <span className="flex items-center gap-1 text-[11px] font-medium bg-roa-sage text-roa-canvas px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              Active
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-roa-text-secondary line-clamp-2 leading-relaxed">
          {character.description}
        </p>

        {/* Personality Tags */}
        {character.personality && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(character.personality).map(([trait, val]) => (
              <span
                key={trait}
                className="text-[10px] capitalize px-2 py-0.5 rounded-roa-sm bg-roa-canvas border border-roa-border text-roa-text-secondary font-medium"
              >
                {trait}: {Math.round(val * 100)}%
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Select Action */}
      <div className="pt-4 mt-2 border-t border-roa-border">
        <button
          onClick={() => onSelect(character.id)}
          disabled={isActive}
          className={`w-full py-2 px-3 rounded-roa text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            isActive
              ? 'bg-roa-canvas text-roa-text-muted cursor-default'
              : 'bg-roa-sage hover:bg-roa-sage-hover text-roa-canvas'
          }`}
        >
          {isActive ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Current Companion
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Choose {character.name}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
