import React, { useEffect, useState } from 'react';
import { PetMood, PetBehavior, CharacterManifest } from '@shared/types/pet';

interface SpriteAnimatorProps {
  character: CharacterManifest | null;
  mood: PetMood;
  behavior: PetBehavior;
  walkDirection?: 1 | -1;
}

export const SpriteAnimator: React.FC<SpriteAnimatorProps> = ({
  character,
  mood,
  behavior,
  walkDirection = 1,
}) => {
  const [blink, setBlink] = useState(false);
  const [animStep, setAnimStep] = useState(0);

  const characterId = character?.id ?? 'roa-cat';
  const effectiveState = behavior === 'walking' ? 'walking' : mood;

  // Blinking cycle for idle/thinking
  useEffect(() => {
    if (effectiveState !== 'idle' && effectiveState !== 'thinking') return;

    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3600);

    return () => clearInterval(blinkInterval);
  }, [effectiveState]);

  // General animation cycle (step counter for bobbing, walking, tail swishes)
  useEffect(() => {
    const frameRate = character?.animations?.[effectiveState]?.frameRate ?? 4;
    const intervalMs = Math.max(80, Math.floor(1000 / frameRate));

    const timer = setInterval(() => {
      setAnimStep((prev) => (prev + 1) % 8);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [character, effectiveState]);

  // Walking bob offset
  const walkBob = behavior === 'walking' ? (animStep % 2 === 0 ? -4 : 4) : 0;
  // Tail/ear angles
  const tailAngle = (animStep % 4) * 4 - 6;

  // State-specific animation class
  const getAnimationClass = () => {
    if (behavior === 'walking') return 'animate-bounce-subtle';
    switch (mood) {
      case 'happy':
      case 'celebrating':
        return 'animate-bounce';
      case 'sleeping':
        return 'animate-pulse';
      case 'reminding':
        return 'animate-pulse';
      case 'thinking':
        return 'animate-pulse';
      case 'idle':
      default:
        return 'animate-pet-idle';
    }
  };

  return (
    <div
      className={`relative w-44 h-44 flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform duration-200 ${getAnimationClass()}`}
      style={{
        transform: `scaleX(${walkDirection}) translateY(${walkBob}px)`,
      }}
    >
      {/* Floating State Effects */}
      {effectiveState === 'sleeping' && (
        <div className="absolute -top-1 right-5 pointer-events-none select-none z-10">
          <span className="absolute text-indigo-400 font-bold text-xs animate-zzz-1">z</span>
          <span className="absolute text-indigo-500 font-bold text-sm animate-zzz-2">Z</span>
        </div>
      )}

      {(effectiveState === 'happy' || effectiveState === 'celebrating') && (
        <div className="absolute -top-2 left-6 pointer-events-none select-none text-amber-400 text-xs animate-bounce z-10">
          ✦ ✧ ✦
        </div>
      )}

      {effectiveState === 'thinking' && (
        <div className="absolute -top-3 right-8 pointer-events-none select-none text-indigo-500 font-bold text-sm animate-bounce z-10">
          ?
        </div>
      )}

      {effectiveState === 'reminding' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none select-none text-amber-500 text-base animate-pulse z-10">
          🔔
        </div>
      )}

      {/* Render Character SVG based on ID */}
      {characterId === 'roa-bunny' ? (
        <BunnySvg
          mood={effectiveState}
          blink={blink}
          tailAngle={tailAngle}
          animStep={animStep}
        />
      ) : (
        <CatSvg
          mood={effectiveState}
          blink={blink}
          tailAngle={tailAngle}
          animStep={animStep}
        />
      )}
    </div>
  );
};

// --- Roa Cat Component ---
const CatSvg: React.FC<{
  mood: string;
  blink: boolean;
  tailAngle: number;
  animStep: number;
}> = ({ mood, blink, tailAngle }) => {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-xl overflow-visible">
      <defs>
        <radialGradient id="catFur" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="70%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>
        <linearGradient id="catChest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EDE9FE" />
        </linearGradient>
      </defs>

      {/* Tail */}
      <g
        transform={`translate(115, 110) rotate(${tailAngle * (mood === 'happy' ? 2 : 1)})`}
        style={{ transformOrigin: '0px 10px', transition: 'transform 0.15s ease-out' }}
      >
        <path
          d="M0,5 Q30,10 32,-15 Q24,-18 10,-2 Q2,12 0,5"
          fill="url(#catFur)"
          stroke="#4338CA"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M26,-10 Q32,-15 28,-18 Q22,-16 18,-8 Z" fill="#FFFFFF" />
      </g>

      {/* Body */}
      <ellipse cx="80" cy="105" rx="42" ry="36" fill="url(#catFur)" stroke="#4338CA" strokeWidth="3" />
      <ellipse cx="80" cy="110" rx="24" ry="22" fill="url(#catChest)" />

      {/* Left Ear */}
      <path d="M48,58 L32,22 Q46,26 62,44 Z" fill="url(#catFur)" stroke="#4338CA" strokeWidth="3" strokeLinejoin="round" />
      <path d="M47,52 L36,28 Q46,31 56,43 Z" fill="#FDA4AF" />

      {/* Right Ear */}
      <path d="M112,58 L128,22 Q114,26 98,44 Z" fill="url(#catFur)" stroke="#4338CA" strokeWidth="3" strokeLinejoin="round" />
      <path d="M113,52 L124,28 Q114,31 104,43 Z" fill="#FDA4AF" />

      {/* Head */}
      <ellipse cx="80" cy="68" rx="40" ry="33" fill="url(#catFur)" stroke="#4338CA" strokeWidth="3" />
      <ellipse cx="80" cy="78" rx="18" ry="13" fill="url(#catChest)" />
      <polygon points="76,73 84,73 80,78" fill="#F43F5E" />

      {/* Mouth */}
      {mood === 'happy' || mood === 'celebrating' ? (
        <path d="M74,78 Q80,86 86,78" fill="none" stroke="#4338CA" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M74,78 Q77,82 80,78 Q83,82 86,78" fill="none" stroke="#4338CA" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {/* Whiskers */}
      <g stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round">
        <line x1="55" y1="74" x2="35" y2="72" />
        <line x1="56" y1="78" x2="36" y2="81" />
        <line x1="105" y1="74" x2="125" y2="72" />
        <line x1="104" y1="78" x2="124" y2="81" />
      </g>

      {/* Eyes */}
      {mood === 'sleeping' ? (
        <g stroke="#312E81" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M57,67 Q65,74 73,67" />
          <path d="M87,67 Q95,74 103,67" />
        </g>
      ) : mood === 'happy' || mood === 'celebrating' ? (
        <g stroke="#312E81" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M57,68 Q65,60 73,68" />
          <path d="M87,68 Q95,60 103,68" />
        </g>
      ) : blink ? (
        <g stroke="#312E81" strokeWidth="3.5" strokeLinecap="round">
          <line x1="58" y1="66" x2="72" y2="66" />
          <line x1="88" y1="66" x2="102" y2="66" />
        </g>
      ) : (
        <g>
          <ellipse cx="65" cy="65" rx="7.5" ry="9" fill="#1E1B4B" />
          <ellipse cx="95" cy="65" rx="7.5" ry="9" fill="#1E1B4B" />
          <circle cx="63" cy="62" r="3" fill="#FFFFFF" />
          <circle cx="67" cy="67" r="1.5" fill="#FFFFFF" />
          <circle cx="93" cy="62" r="3" fill="#FFFFFF" />
          <circle cx="97" cy="67" r="1.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Paws */}
      <ellipse cx="62" cy="134" rx="11" ry="8" fill="#FFFFFF" stroke="#4338CA" strokeWidth="2.5" />
      <ellipse cx="98" cy="134" rx="11" ry="8" fill="#FFFFFF" stroke="#4338CA" strokeWidth="2.5" />
    </svg>
  );
};

// --- Roa Bunny Component ---
const BunnySvg: React.FC<{
  mood: string;
  blink: boolean;
  tailAngle: number;
  animStep: number;
}> = ({ mood, blink }) => {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-xl overflow-visible">
      <defs>
        <radialGradient id="bunnyFur" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="70%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </radialGradient>
        <linearGradient id="bunnyChest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#FED7AA" />
        </linearGradient>
      </defs>

      {/* Bunny Fluffy Tail */}
      <circle cx="120" cy="118" r="14" fill="#FFF7ED" stroke="#C2410C" strokeWidth="2.5" />

      {/* Body */}
      <ellipse cx="80" cy="110" rx="40" ry="34" fill="url(#bunnyFur)" stroke="#C2410C" strokeWidth="3" />
      <ellipse cx="80" cy="114" rx="22" ry="20" fill="url(#bunnyChest)" />

      {/* Long Left Ear */}
      <ellipse
        cx="54"
        cy="26"
        rx="11"
        ry="28"
        transform="rotate(-10 54 26)"
        fill="url(#bunnyFur)"
        stroke="#C2410C"
        strokeWidth="3"
      />
      <ellipse
        cx="54"
        cy="26"
        rx="6"
        ry="20"
        transform="rotate(-10 54 26)"
        fill="#FECDD3"
      />

      {/* Long Right Ear */}
      <ellipse
        cx="106"
        cy="26"
        rx="11"
        ry="28"
        transform="rotate(10 106 26)"
        fill="url(#bunnyFur)"
        stroke="#C2410C"
        strokeWidth="3"
      />
      <ellipse
        cx="106"
        cy="26"
        rx="6"
        ry="20"
        transform="rotate(10 106 26)"
        fill="#FECDD3"
      />

      {/* Head */}
      <ellipse cx="80" cy="74" rx="38" ry="31" fill="url(#bunnyFur)" stroke="#C2410C" strokeWidth="3" />
      <ellipse cx="80" cy="82" rx="16" ry="12" fill="url(#bunnyChest)" />

      {/* Cute Pink Nose */}
      <ellipse cx="80" cy="77" rx="4.5" ry="3.5" fill="#F43F5E" />

      {/* Bunny Cheeks */}
      <circle cx="56" cy="80" r="6" fill="#FDA4AF" opacity="0.6" />
      <circle cx="104" cy="80" r="6" fill="#FDA4AF" opacity="0.6" />

      {/* Mouth */}
      {mood === 'happy' || mood === 'celebrating' ? (
        <path d="M75,82 Q80,88 85,82" fill="none" stroke="#9A3412" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M75,81 Q80,85 85,81" fill="none" stroke="#9A3412" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {/* Eyes */}
      {mood === 'sleeping' ? (
        <g stroke="#7C2D12" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M57,72 Q65,79 73,72" />
          <path d="M87,72 Q95,79 103,72" />
        </g>
      ) : mood === 'happy' || mood === 'celebrating' ? (
        <g stroke="#7C2D12" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M57,73 Q65,65 73,73" />
          <path d="M87,73 Q95,65 103,73" />
        </g>
      ) : blink ? (
        <g stroke="#7C2D12" strokeWidth="3.5" strokeLinecap="round">
          <line x1="58" y1="71" x2="72" y2="71" />
          <line x1="88" y1="71" x2="102" y2="71" />
        </g>
      ) : (
        <g>
          <ellipse cx="65" cy="70" rx="7" ry="8.5" fill="#431407" />
          <ellipse cx="95" cy="70" rx="7" ry="8.5" fill="#431407" />
          <circle cx="63" cy="67" r="2.5" fill="#FFFFFF" />
          <circle cx="67" cy="72" r="1.2" fill="#FFFFFF" />
          <circle cx="93" cy="67" r="2.5" fill="#FFFFFF" />
          <circle cx="97" cy="72" r="1.2" fill="#FFFFFF" />
        </g>
      )}

      {/* Paws */}
      <ellipse cx="60" cy="136" rx="12" ry="7.5" fill="#FFF7ED" stroke="#C2410C" strokeWidth="2.5" />
      <ellipse cx="100" cy="136" rx="12" ry="7.5" fill="#FFF7ED" stroke="#C2410C" strokeWidth="2.5" />
    </svg>
  );
};
