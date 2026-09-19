import React, { useEffect, useState } from 'react';
import { PetMood } from '@shared/types/pet';
import { SpriteAnimator } from './SpriteAnimator';

export const PetApp: React.FC = () => {
  const [mood, setMood] = useState<PetMood>('idle');

  useEffect(() => {
    // Load initial mood from settings
    if (window.roa?.settings) {
      window.roa.settings.get('pet.currentMood').then((savedMood) => {
        if (savedMood) setMood(savedMood);
      });
    }

    // Subscribe to IPC mood changes from main/dashboard/tray
    if (window.roa?.pet?.onMoodChanged) {
      const unsubscribe = window.roa.pet.onMoodChanged((newMood) => {
        setMood(newMood);
      });
      return () => unsubscribe();
    }
    return undefined;
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
        <SpriteAnimator mood={mood} />
      </div>
    </div>
  );
};
