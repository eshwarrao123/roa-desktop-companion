import { useState, useEffect, useRef, useCallback } from 'react';
import { PetMood, PetBehavior, CharacterManifest } from '@shared/types/pet';

interface UsePetBehaviorProps {
  character: CharacterManifest | null;
  currentMood: PetMood;
  isDragging: boolean;
  hasActiveReminder: boolean;
  onMoodChange: (mood: PetMood) => void;
}

export function usePetBehavior({
  character,
  currentMood,
  isDragging,
  hasActiveReminder,
  onMoodChange,
}: UsePetBehaviorProps) {
  const [behavior, setBehavior] = useState<PetBehavior>('idle');
  const [walkDirection, setWalkDirection] = useState<1 | -1>(1);

  const walkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const behaviorCycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingDistanceRef = useRef<number>(0);

  // Stop walking and clear timers
  const stopWalking = useCallback(() => {
    if (walkingTimerRef.current) {
      clearInterval(walkingTimerRef.current);
      walkingTimerRef.current = null;
    }
    setBehavior('idle');
    window.roa?.pet?.setBehavior?.('idle').catch(() => {});
  }, []);

  // Start walking routine
  const startWalking = useCallback(
    async (distancePx: number, initialDir: 1 | -1) => {
      if (isDragging || hasActiveReminder || currentMood === 'sleeping') return;

      stopWalking();
      setBehavior('walking');
      setWalkDirection(initialDir);
      window.roa?.pet?.setBehavior?.('walking').catch(() => {});

      let currentDir = initialDir;
      remainingDistanceRef.current = distancePx;

      // Walking step loop: every 50ms (~20 FPS window moves)
      walkingTimerRef.current = setInterval(async () => {
        if (!window.roa?.pet) return;

        try {
          const [currentPos, workArea] = await Promise.all([
            window.roa.pet.getPosition(),
            window.roa.pet.getWorkAreaBounds(),
          ]);

          const stepSize = 3; // 3px per 50ms = 60px/sec (gentle stroll)
          let nextX = currentPos.x + currentDir * stepSize;

          const minX = workArea.x + 10;
          const maxX = workArea.x + workArea.width - 210;

          // Boundary reversal
          if (nextX <= minX) {
            nextX = minX;
            currentDir = 1;
            setWalkDirection(1);
          } else if (nextX >= maxX) {
            nextX = maxX;
            currentDir = -1;
            setWalkDirection(-1);
          }

          await window.roa.pet.setPosition({ x: nextX, y: currentPos.y });

          remainingDistanceRef.current -= stepSize;
          if (remainingDistanceRef.current <= 0) {
            stopWalking();
          }
        } catch {
          stopWalking();
        }
      }, 50);
    },
    [isDragging, hasActiveReminder, currentMood, stopWalking]
  );

  // Autonomous behavior loop
  useEffect(() => {
    // If dragging or reminder active, pause autonomous transitions
    if (isDragging || hasActiveReminder) {
      stopWalking();
      return;
    }

    // Default intervals from character manifest or defaults
    const minIdle = character?.behaviors?.idleIntervalMs?.[0] ?? 6000;
    const maxIdle = character?.behaviors?.idleIntervalMs?.[1] ?? 14000;
    const walkProb = character?.behaviors?.walkProbability ?? 0.35;
    const minWalkDist = character?.behaviors?.walkDistancePx?.[0] ?? 90;
    const maxWalkDist = character?.behaviors?.walkDistancePx?.[1] ?? 200;

    const scheduleNextDecision = () => {
      const delay = Math.floor(Math.random() * (maxIdle - minIdle)) + minIdle;

      behaviorCycleTimerRef.current = setTimeout(() => {
        if (behavior !== 'idle' || isDragging || hasActiveReminder) {
          scheduleNextDecision();
          return;
        }

        const roll = Math.random();

        if (roll < walkProb) {
          // Walk
          const dist = Math.floor(Math.random() * (maxWalkDist - minWalkDist)) + minWalkDist;
          const randomDir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
          startWalking(dist, randomDir);
        } else if (roll < walkProb + 0.12) {
          // Nap briefly (6-10s)
          onMoodChange('sleeping');
          setTimeout(() => {
            onMoodChange('idle');
          }, 8000);
        } else if (roll < walkProb + 0.22) {
          // Wonder/thinking briefly (4s)
          onMoodChange('thinking');
          setTimeout(() => {
            onMoodChange('idle');
          }, 4000);
        }

        scheduleNextDecision();
      }, delay);
    };

    scheduleNextDecision();

    return () => {
      if (behaviorCycleTimerRef.current) {
        clearTimeout(behaviorCycleTimerRef.current);
      }
      stopWalking();
    };
  }, [
    character,
    behavior,
    isDragging,
    hasActiveReminder,
    onMoodChange,
    startWalking,
    stopWalking,
  ]);

  return {
    behavior,
    walkDirection,
    stopWalking,
  };
}
