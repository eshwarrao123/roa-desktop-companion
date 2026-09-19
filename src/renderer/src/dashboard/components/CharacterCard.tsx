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
      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
        isActive
          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/80 dark:border-indigo-500/80 shadow-sm ring-1 ring-indigo-500/40'
          : 'bg-white dark:bg-[#252542] border-zinc-200 dark:border-[#3D3D6B] hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'
      }`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold border shadow-xs ${
                isCat
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600'
                  : 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600'
              }`}
            >
              {isCat ? '🐱' : '🐰'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {character.name}
                </h4>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  v{character.version}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">By {character.author}</p>
            </div>
          </div>

          {isActive && (
            <span className="flex items-center gap-1 text-[11px] font-medium bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-xs">
              <Check className="w-3 h-3" />
              Active
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {character.description}
        </p>

        {/* Personality Tags */}
        {character.personality && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(character.personality).map(([trait, val]) => (
              <span
                key={trait}
                className="text-[10px] capitalize px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-[#1E1E38] border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300 font-medium"
              >
                {trait}: {Math.round(val * 100)}%
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Select Action */}
      <div className="pt-4 mt-2 border-t border-zinc-100 dark:border-zinc-800/80">
        <button
          onClick={() => onSelect(character.id)}
          disabled={isActive}
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            isActive
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hover:shadow'
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
