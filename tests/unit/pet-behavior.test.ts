import { describe, it, expect } from 'vitest';
import { PetMood, PetBehavior } from '../../src/shared/types/pet';

/**
 * Pure helper function mirroring the boundary logic in usePetBehavior
 */
export function calculateNextWalkPosition(
  currentX: number,
  direction: 1 | -1,
  stepSize: number,
  workArea: { x: number; y: number; width: number; height: number },
  petWidth = 200
): { nextX: number; nextDirection: 1 | -1 } {
  const minX = workArea.x + 10;
  const maxX = workArea.x + workArea.width - (petWidth + 10);

  let nextX = currentX + direction * stepSize;
  let nextDirection = direction;

  if (nextX <= minX) {
    nextX = minX;
    nextDirection = 1;
  } else if (nextX >= maxX) {
    nextX = maxX;
    nextDirection = -1;
  }

  return { nextX, nextDirection };
}

/**
 * Pure transition engine mirroring the pet mood/behavior transition logic
 */
export interface PetTransitionState {
  mood: PetMood;
  behavior: PetBehavior;
}

export function handlePetEvent(
  state: PetTransitionState,
  event:
    | { type: 'REMINDER_FIRED' }
    | { type: 'REMINDER_DISMISSED' }
    | { type: 'WALK_START' }
    | { type: 'WALK_END' }
    | { type: 'USER_SET_MOOD'; mood: PetMood }
): PetTransitionState {
  switch (event.type) {
    case 'REMINDER_FIRED':
      return {
        mood: 'reminding',
        behavior: 'interacting',
      };
    case 'REMINDER_DISMISSED':
      return {
        mood: 'idle',
        behavior: 'idle',
      };
    case 'WALK_START':
      return {
        ...state,
        behavior: 'walking',
      };
    case 'WALK_END':
      return {
        ...state,
        behavior: 'idle',
      };
    case 'USER_SET_MOOD':
      return {
        mood: event.mood,
        behavior: event.mood === 'sleeping' ? 'sleeping' : 'idle',
      };
    default:
      return state;
  }
}

describe('Pet Behavior & Boundary Logic', () => {
  const workArea = { x: 0, y: 0, width: 1920, height: 1080 };

  it('steps smoothly within bounds without reversing', () => {
    const { nextX, nextDirection } = calculateNextWalkPosition(500, 1, 3, workArea);
    expect(nextX).toBe(503);
    expect(nextDirection).toBe(1);

    const { nextX: leftX, nextDirection: leftDir } = calculateNextWalkPosition(500, -1, 3, workArea);
    expect(leftX).toBe(497);
    expect(leftDir).toBe(-1);
  });

  it('reverses direction at left boundary', () => {
    // Left boundary is minX = 0 + 10 = 10
    const { nextX, nextDirection } = calculateNextWalkPosition(11, -1, 3, workArea);
    expect(nextX).toBe(10);
    expect(nextDirection).toBe(1);
  });

  it('reverses direction at right boundary', () => {
    // Right boundary is maxX = 0 + 1920 - 210 = 1710
    const { nextX, nextDirection } = calculateNextWalkPosition(1709, 1, 3, workArea);
    expect(nextX).toBe(1710);
    expect(nextDirection).toBe(-1);
  });

  it('respects non-zero workArea.x (e.g. secondary display offset or taskbar on left)', () => {
    const offsetWorkArea = { x: 100, y: 0, width: 1820, height: 1080 };
    // minX = 100 + 10 = 110
    const { nextX, nextDirection } = calculateNextWalkPosition(111, -1, 3, offsetWorkArea);
    expect(nextX).toBe(110);
    expect(nextDirection).toBe(1);
  });

  it('transitions mood to reminding and behavior to interacting on reminder fired', () => {
    const initial: PetTransitionState = { mood: 'idle', behavior: 'idle' };
    const next = handlePetEvent(initial, { type: 'REMINDER_FIRED' });
    expect(next.mood).toBe('reminding');
    expect(next.behavior).toBe('interacting');
  });

  it('returns to idle when reminder is dismissed', () => {
    const remindingState: PetTransitionState = { mood: 'reminding', behavior: 'interacting' };
    const next = handlePetEvent(remindingState, { type: 'REMINDER_DISMISSED' });
    expect(next.mood).toBe('idle');
    expect(next.behavior).toBe('idle');
  });

  it('handles user mood selection properly', () => {
    const initial: PetTransitionState = { mood: 'idle', behavior: 'idle' };
    const happy = handlePetEvent(initial, { type: 'USER_SET_MOOD', mood: 'happy' });
    expect(happy.mood).toBe('happy');
    expect(happy.behavior).toBe('idle');

    const sleeping = handlePetEvent(initial, { type: 'USER_SET_MOOD', mood: 'sleeping' });
    expect(sleeping.mood).toBe('sleeping');
    expect(sleeping.behavior).toBe('sleeping');
  });
});
