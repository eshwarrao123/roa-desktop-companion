import React, { useEffect, useState } from 'react';
import { PetMood } from '@shared/types/pet';
import { Reminder } from '@shared/types/reminders';
import { SpriteAnimator } from './SpriteAnimator';
import { Bell, X } from 'lucide-react';

export const PetApp: React.FC = () => {
  const [mood, setMood] = useState<PetMood>('idle');
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    // Load initial mood from settings
    if (window.roa?.settings) {
      window.roa.settings.get('pet.currentMood').then((savedMood) => {
        if (savedMood) setMood(savedMood);
      });
    }

    // Subscribe to IPC mood changes from main/dashboard/tray
    const unsubscribeMood = window.roa?.pet?.onMoodChanged?.((newMood) => {
      setMood(newMood);
    });

    // Subscribe to reminder trigger events
    const unsubscribeReminder = window.roa?.pet?.onReminderFired?.((reminder) => {
      setActiveReminder(reminder);
      setMood('happy'); // Pet becomes alert/happy on reminder

      // Auto-dismiss bubble after 8 seconds
      setTimeout(() => {
        setActiveReminder((current) => (current?.id === reminder.id ? null : current));
      }, 8000);
    });

    return () => {
      unsubscribeMood?.();
      unsubscribeReminder?.();
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.roa?.pet?.openContextMenu?.();
  };

  const handleDoubleClick = () => {
    // Cycle mood on double click
    const nextMood: PetMood = mood === 'idle' ? 'happy' : mood === 'happy' ? 'sleeping' : 'idle';
    setMood(nextMood);
    window.roa?.pet?.setMood?.(nextMood);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      className="w-full h-full flex items-center justify-center bg-transparent select-none draggable-region overflow-hidden"
      title="Drag to reposition • Double-click to cheer up • Right-click for menu"
    >
      <div className="relative flex flex-col items-center">
        {/* Reminder Speech Bubble */}
        {activeReminder && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1A1A2E]/95 backdrop-blur-sm border border-indigo-200 dark:border-indigo-800/80 shadow-lg rounded-xl px-3 py-1.5 flex items-center gap-2 max-w-[190px] animate-bounce z-50 non-draggable">
            <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="text-[11px] leading-tight font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {activeReminder.title}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveReminder(null);
              }}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <SpriteAnimator mood={mood} />
      </div>
    </div>
  );
};

