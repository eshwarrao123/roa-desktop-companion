import React, { useEffect, useState } from 'react';
import { PetMood } from '@shared/types/pet';

interface SpriteAnimatorProps {
  mood: PetMood;
}

export const SpriteAnimator: React.FC<SpriteAnimatorProps> = ({ mood }) => {
  const [blink, setBlink] = useState(false);
  const [tailFrame, setTailFrame] = useState(0);

  // Blinking cycle for idle mood
  useEffect(() => {
    if (mood !== 'idle') return;

    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, [mood]);

  // Tail swish cycle
  useEffect(() => {
    const tailInterval = setInterval(() => {
      setTailFrame((prev) => (prev + 1) % 4);
    }, mood === 'happy' ? 140 : 350);

    return () => clearInterval(tailInterval);
  }, [mood]);

  const getAnimationClass = () => {
    switch (mood) {
      case 'happy':
        return 'animate-pet-happy';
      case 'sleeping':
        return 'animate-pet-sleeping';
      case 'idle':
      default:
        return 'animate-pet-idle';
    }
  };

  const tailAngles = [-6, 0, 8, 2];
  const currentTailAngle = tailAngles[tailFrame] * (mood === 'happy' ? 2.5 : 1);

  return (
    <div className={`relative w-44 h-44 flex items-center justify-center cursor-grab active:cursor-grabbing ${getAnimationClass()}`}>
      {/* Sleeping Zzz Effect */}
      {mood === 'sleeping' && (
        <div className="absolute -top-1 right-5 pointer-events-none select-none">
          <span className="absolute text-indigo-400 font-bold text-xs animate-zzz-1">z</span>
          <span className="absolute text-indigo-500 font-bold text-sm animate-zzz-2">Z</span>
        </div>
      )}

      {/* Happy Stars Effect */}
      {mood === 'happy' && (
        <div className="absolute -top-2 left-6 pointer-events-none select-none text-amber-400 text-xs animate-bounce">
          ✦
        </div>
      )}

      <svg
        viewBox="0 0 160 160"
        className="w-full h-full drop-shadow-xl overflow-visible"
      >
        <defs>
          <radialGradient id="furGradient" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="70%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </radialGradient>
          <linearGradient id="chestGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EDE9FE" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1E1B4B" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Tail */}
        <g
          transform={`translate(115, 110) rotate(${currentTailAngle})`}
          style={{ transformOrigin: '0px 10px', transition: 'transform 0.2s ease-out' }}
        >
          <path
            d="M0,5 Q30,10 32,-15 Q24,-18 10,-2 Q2,12 0,5"
            fill="url(#furGradient)"
            stroke="#4338CA"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Tail white tip */}
          <path
            d="M26,-10 Q32,-15 28,-18 Q22,-16 18,-8 Z"
            fill="#FFFFFF"
          />
        </g>

        {/* Cat Body */}
        <ellipse
          cx="80"
          cy="105"
          rx="42"
          ry="36"
          fill="url(#furGradient)"
          stroke="#4338CA"
          strokeWidth="3"
        />

        {/* Chest Fluff */}
        <ellipse
          cx="80"
          cy="110"
          rx="24"
          ry="22"
          fill="url(#chestGradient)"
        />

        {/* Left Ear */}
        <path
          d="M48,58 L32,22 Q46,26 62,44 Z"
          fill="url(#furGradient)"
          stroke="#4338CA"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Left Inner Ear (Pink) */}
        <path
          d="M47,52 L36,28 Q46,31 56,43 Z"
          fill="#FDA4AF"
        />

        {/* Right Ear */}
        <path
          d="M112,58 L128,22 Q114,26 98,44 Z"
          fill="url(#furGradient)"
          stroke="#4338CA"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Right Inner Ear (Pink) */}
        <path
          d="M113,52 L124,28 Q114,31 104,43 Z"
          fill="#FDA4AF"
        />

        {/* Head */}
        <ellipse
          cx="80"
          cy="68"
          rx="40"
          ry="33"
          fill="url(#furGradient)"
          stroke="#4338CA"
          strokeWidth="3"
        />

        {/* Muzzle (White) */}
        <ellipse
          cx="80"
          cy="78"
          rx="18"
          ry="13"
          fill="url(#chestGradient)"
        />

        {/* Nose */}
        <polygon
          points="76,73 84,73 80,78"
          fill="#F43F5E"
        />

        {/* Mouth */}
        {mood === 'happy' ? (
          <path
            d="M74,78 Q80,86 86,78"
            fill="none"
            stroke="#4338CA"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M74,78 Q77,82 80,78 Q83,82 86,78"
            fill="none"
            stroke="#4338CA"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Whiskers */}
        <g stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round">
          {/* Left whiskers */}
          <line x1="55" y1="74" x2="35" y2="72" />
          <line x1="56" y1="78" x2="36" y2="81" />
          {/* Right whiskers */}
          <line x1="105" y1="74" x2="125" y2="72" />
          <line x1="104" y1="78" x2="124" y2="81" />
        </g>

        {/* Eyes */}
        {mood === 'sleeping' ? (
          // Sleeping eyes: curved lines (- -)
          <g stroke="#312E81" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M57,67 Q65,74 73,67" />
            <path d="M87,67 Q95,74 103,67" />
          </g>
        ) : mood === 'happy' ? (
          // Happy eyes: joyful arches (^ ^)
          <g stroke="#312E81" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M57,68 Q65,60 73,68" />
            <path d="M87,68 Q95,60 103,68" />
          </g>
        ) : blink ? (
          // Blinking eye lines
          <g stroke="#312E81" strokeWidth="3.5" strokeLinecap="round">
            <line x1="58" y1="66" x2="72" y2="66" />
            <line x1="88" y1="66" x2="102" y2="66" />
          </g>
        ) : (
          // Open bright eyes
          <g>
            <ellipse cx="65" cy="65" rx="7.5" ry="9" fill="#1E1B4B" />
            <ellipse cx="95" cy="65" rx="7.5" ry="9" fill="#1E1B4B" />
            {/* Eye reflections */}
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
    </div>
  );
};
