import React, { useEffect, useState, useCallback } from 'react';
import { PetMood, CharacterManifest } from '@shared/types/pet';
import { Reminder } from '@shared/types/reminders';
import { SpriteAnimator } from './SpriteAnimator';
import { usePetBehavior } from './hooks/usePetBehavior';
import { Bell, X } from 'lucide-react';

export const PetApp: React.FC = () => {
  const [character, setCharacter] = useState<CharacterManifest | null>(null);
  const [mood, setMood] = useState<PetMood>('idle');
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMoodChange = useCallback((newMood: PetMood) => {
    setMood(newMood);
    window.roa?.pet?.setMood?.(newMood).catch(() => {});
  }, []);

  const { behavior, walkDirection, stopWalking } = usePetBehavior({
    character,
    currentMood: mood,
    isDragging,
    hasActiveReminder: Boolean(activeReminder),
    onMoodChange: handleMoodChange,
  });

  useEffect(() => {
    // 1. Load active character
    if (window.roa?.character) {
      window.roa.character.getActive().then(setCharacter).catch(console.error);
    }

    // 2. Load initial mood from settings
    if (window.roa?.settings) {
      window.roa.settings.get('pet.currentMood').then((savedMood) => {
        if (savedMood) setMood(savedMood);
      });
    }

    // 3. Listen for character changes (hot-swapped in place!)
    const unsubscribeChar = window.roa?.character?.onChanged?.((newChar) => {
      console.log('[PetApp] Character switched to:', newChar.name);
      setCharacter(newChar);
      setMood('idle');
    });

    // 4. Subscribe to IPC mood changes from main/dashboard/tray
    const unsubscribeMood = window.roa?.pet?.onMoodChanged?.((newMood) => {
      setMood(newMood);
    });

    // 5. Subscribe to reminder trigger events
    const unsubscribeReminder = window.roa?.pet?.onReminderFired?.((reminder) => {
      stopWalking();
      setActiveReminder(reminder);
      setMood('reminding');

      // Auto-dismiss bubble after 8 seconds and return to idle
      setTimeout(() => {
        setActiveReminder((current) => {
          if (current?.id === reminder.id) {
            setMood('idle');
            return null;
          }
          return current;
        });
      }, 8000);
    });

    // 6. Subscribe to timer and system events (Phase 4)
    const unsubscribeTimer = window.roa?.pet?.onTimerEvent?.((event) => {
      stopWalking();
      let nextMood: PetMood = 'idle';
      let autoDismissMs = 4000;

      switch (event.type) {
        case 'timerStarted':
        case 'focusStarted':
        case 'aiThinking':
          nextMood = 'thinking';
          break;
        case 'breakStarted':
          nextMood = 'happy';
          break;
        case 'timerCompleted':
        case 'focusCompleted':
        case 'aiComplete':
          nextMood = 'celebrating';
          autoDismissMs = 5000;
          break;
        case 'lowBattery':
        case 'systemIdle':
          nextMood = 'sleeping';
          autoDismissMs = 6000;
          break;
        case 'systemActive':
          nextMood = 'idle';
          autoDismissMs = 3000;
          break;
      }

      setMood(nextMood);
      setActiveReminder({
        id: 'system-timer-event',
        title: event.message || event.title,
        description: '',
        schedule_type: 'one_time',
        schedule_data: { targetTimestamp: Date.now() },
        timezone: 'local',
        enabled: true,
        next_run_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      setTimeout(() => {
        setActiveReminder((current) => {
          if (current?.id === 'system-timer-event') {
            if (event.type !== 'systemIdle') {
              setMood('idle');
            }
            return null;
          }
          return current;
        });
      }, autoDismissMs);
    });

    return () => {
      unsubscribeChar?.();
      unsubscribeMood?.();
      unsubscribeReminder?.();
      unsubscribeTimer?.();
    };
  }, [stopWalking]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    stopWalking();
    window.roa?.pet?.openContextMenu?.();
  };

  const handleDoubleClick = () => {
    stopWalking();
    // Temporary positive reaction (celebrating/happy) -> auto returns to idle after 4s
    const nextMood: PetMood = mood === 'idle' ? 'celebrating' : mood === 'celebrating' ? 'happy' : 'idle';
    setMood(nextMood);
    window.roa?.pet?.setMood?.(nextMood);

    if (nextMood !== 'idle') {
      setTimeout(() => {
        setMood('idle');
        window.roa?.pet?.setMood?.('idle');
      }, 4000);
    }
  };

  // Get reminder flair text based on character personality
  const getReminderFlair = (title: string) => {
    if (character?.id === 'roa-bunny') {
      return `🥕 Hop to it! Time for ${title}`;
    }
    return `🐾 Meow! Time for ${title}`;
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onMouseDown={() => {
        setIsDragging(true);
        stopWalking();
      }}
      onMouseUp={() => setIsDragging(false)}
      className="w-full h-full flex items-center justify-center bg-transparent select-none draggable-region overflow-hidden"
      title="Drag to reposition • Double-click to cheer up • Right-click for menu"
    >
      <div className="relative flex flex-col items-center">
        {/* Reminder Speech Bubble */}
        {activeReminder && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1A1A2E]/95 backdrop-blur-sm border border-indigo-200 dark:border-indigo-800/80 shadow-lg rounded-xl px-3 py-1.5 flex items-center gap-2 max-w-[190px] animate-bounce z-50 non-draggable">
            <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="text-[11px] leading-tight font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {getReminderFlair(activeReminder.title)}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveReminder(null);
                setMood('idle');
              }}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <SpriteAnimator
          character={character}
          mood={mood}
          behavior={behavior}
          walkDirection={walkDirection}
        />
      </div>
    </div>
  );
};


