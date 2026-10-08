import React from 'react';

interface CharacterPreviewProps {
  characterId: string;
  size?: number;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({ 
  characterId,
  size = 120 
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {characterId === 'roa-bunny' ? (
        <BunnyPreview size={size} />
      ) : (
        <CatPreview size={size} />
      )}
    </div>
  );
};

const CatPreview: React.FC<{ size: number }> = ({ size }) => {
  return (
    <svg 
      viewBox="0 0 160 160" 
      className="w-full h-full"
      style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
    >
      <defs>
        <radialGradient id="catFurPreview" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#B8AFA6" />
          <stop offset="70%" stopColor="#9B9189" />
          <stop offset="100%" stopColor="#867D75" />
        </radialGradient>
        <linearGradient id="catChestPreview" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4F1ED" />
          <stop offset="100%" stopColor="#E8E4DF" />
        </linearGradient>
      </defs>

      {/* Tail */}
      <path
        d="M115,110 Q145,120 147,95 Q139,92 125,98 Q117,122 115,110"
        fill="url(#catFurPreview)"
        stroke="#6B6259"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Body */}
      <ellipse cx="80" cy="105" rx="42" ry="36" fill="url(#catFurPreview)" stroke="#6B6259" strokeWidth="3" />
      <ellipse cx="80" cy="110" rx="24" ry="22" fill="url(#catChestPreview)" />

      {/* Left Ear */}
      <path d="M48,58 L32,22 Q46,26 62,44 Z" fill="url(#catFurPreview)" stroke="#6B6259" strokeWidth="3" strokeLinejoin="round" />
      <path d="M47,52 L36,28 Q46,31 56,43 Z" fill="#D4C4B8" />

      {/* Right Ear */}
      <path d="M112,58 L128,22 Q114,26 98,44 Z" fill="url(#catFurPreview)" stroke="#6B6259" strokeWidth="3" strokeLinejoin="round" />
      <path d="M113,52 L124,28 Q114,31 104,43 Z" fill="#D4C4B8" />

      {/* Head */}
      <ellipse cx="80" cy="68" rx="40" ry="33" fill="url(#catFurPreview)" stroke="#6B6259" strokeWidth="3" />
      <ellipse cx="80" cy="78" rx="18" ry="13" fill="url(#catChestPreview)" />
      <polygon points="76,73 84,73 80,78" fill="#8B7866" />

      {/* Mouth */}
      <path d="M74,78 Q77,82 80,78 Q83,82 86,78" fill="none" stroke="#6B6259" strokeWidth="2.5" strokeLinecap="round" />

      {/* Whiskers */}
      <g stroke="#A8C4B0" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <line x1="55" y1="74" x2="35" y2="72" />
        <line x1="56" y1="78" x2="36" y2="81" />
        <line x1="105" y1="74" x2="125" y2="72" />
        <line x1="104" y1="78" x2="124" y2="81" />
      </g>

      {/* Eyes - idle state */}
      <g>
        <ellipse cx="65" cy="65" rx="7.5" ry="9" fill="#2D2419" />
        <ellipse cx="95" cy="65" rx="7.5" ry="9" fill="#2D2419" />
        <circle cx="63" cy="62" r="3" fill="#FFFFFF" />
        <circle cx="67" cy="67" r="1.5" fill="#FFFFFF" />
        <circle cx="93" cy="62" r="3" fill="#FFFFFF" />
        <circle cx="97" cy="67" r="1.5" fill="#FFFFFF" />
      </g>

      {/* Paws */}
      <ellipse cx="62" cy="134" rx="11" ry="8" fill="#F4F1ED" stroke="#6B6259" strokeWidth="2.5" />
      <ellipse cx="98" cy="134" rx="11" ry="8" fill="#F4F1ED" stroke="#6B6259" strokeWidth="2.5" />
    </svg>
  );
};

const BunnyPreview: React.FC<{ size: number }> = ({ size }) => {
  return (
    <svg 
      viewBox="0 0 160 160" 
      className="w-full h-full"
      style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
    >
      <defs>
        <radialGradient id="bunnyFurPreview" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#E8DFD6" />
          <stop offset="70%" stopColor="#D4C7BB" />
          <stop offset="100%" stopColor="#C9B8A8" />
        </radialGradient>
        <linearGradient id="bunnyChestPreview" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8F6F4" />
        </linearGradient>
      </defs>

      {/* Bunny Fluffy Tail */}
      <circle cx="120" cy="118" r="14" fill="#FFFFFF" stroke="#8B7866" strokeWidth="2.5" />

      {/* Body */}
      <ellipse cx="80" cy="110" rx="40" ry="34" fill="url(#bunnyFurPreview)" stroke="#8B7866" strokeWidth="3" />
      <ellipse cx="80" cy="114" rx="22" ry="20" fill="url(#bunnyChestPreview)" />

      {/* Long Left Ear */}
      <ellipse
        cx="54"
        cy="26"
        rx="11"
        ry="28"
        transform="rotate(-10 54 26)"
        fill="url(#bunnyFurPreview)"
        stroke="#8B7866"
        strokeWidth="3"
      />
      <ellipse
        cx="54"
        cy="26"
        rx="6"
        ry="20"
        transform="rotate(-10 54 26)"
        fill="#E8DDD4"
      />

      {/* Long Right Ear */}
      <ellipse
        cx="106"
        cy="26"
        rx="11"
        ry="28"
        transform="rotate(10 106 26)"
        fill="url(#bunnyFurPreview)"
        stroke="#8B7866"
        strokeWidth="3"
      />
      <ellipse
        cx="106"
        cy="26"
        rx="6"
        ry="20"
        transform="rotate(10 106 26)"
        fill="#E8DDD4"
      />

      {/* Head */}
      <ellipse cx="80" cy="74" rx="38" ry="31" fill="url(#bunnyFurPreview)" stroke="#8B7866" strokeWidth="3" />
      <ellipse cx="80" cy="82" rx="16" ry="12" fill="url(#bunnyChestPreview)" />

      {/* Cute Nose */}
      <ellipse cx="80" cy="77" rx="4.5" ry="3.5" fill="#8B7866" />

      {/* Bunny Cheeks */}
      <circle cx="56" cy="80" r="6" fill="#D4C7BB" opacity="0.5" />
      <circle cx="104" cy="80" r="6" fill="#D4C7BB" opacity="0.5" />

      {/* Mouth */}
      <path d="M75,81 Q80,85 85,81" fill="none" stroke="#8B7866" strokeWidth="2.5" strokeLinecap="round" />

      {/* Eyes - idle state */}
      <g>
        <ellipse cx="65" cy="70" rx="7" ry="8.5" fill="#3D2E22" />
        <ellipse cx="95" cy="70" rx="7" ry="8.5" fill="#3D2E22" />
        <circle cx="63" cy="67" r="2.5" fill="#FFFFFF" />
        <circle cx="67" cy="72" r="1.2" fill="#FFFFFF" />
        <circle cx="93" cy="67" r="2.5" fill="#FFFFFF" />
        <circle cx="97" cy="72" r="1.2" fill="#FFFFFF" />
      </g>

      {/* Paws */}
      <ellipse cx="60" cy="136" rx="12" ry="7.5" fill="#FFFFFF" stroke="#8B7866" strokeWidth="2.5" />
      <ellipse cx="100" cy="136" rx="12" ry="7.5" fill="#FFFFFF" stroke="#8B7866" strokeWidth="2.5" />
    </svg>
  );
};
