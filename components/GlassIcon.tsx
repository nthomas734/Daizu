'use client';

import { GlassType } from '@/lib/menu';

type Props = {
  type: GlassType;
  size?: number;
  color: string;
  stroke?: number;
};

// Brass-line glass icons. Drawn at an 80×90 native viewBox; use `size` to scale.
export function GlassIcon({ type, size = 22, color, stroke = 2 }: Props) {
  return (
    <svg
      viewBox="0 0 80 90"
      width={size}
      height={size}
      fill="none"
      aria-label={`${type} glass`}
      style={{ flexShrink: 0 }}
    >
      {type === 'rocks' && (
        <>
          <path d="M 8 2 L 72 2 L 68 82 L 12 82 Z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
          <path d="M 25 30 L 55 30 L 55 64 L 25 64 Z" stroke={color} strokeWidth={stroke * 0.7} strokeLinejoin="round" />
          <path d="M 25 30 L 32 24 L 62 24 L 55 30" stroke={color} strokeWidth={stroke * 0.7} strokeLinejoin="round" />
          <path d="M 55 30 L 62 24 L 62 58 L 55 64" stroke={color} strokeWidth={stroke * 0.7} strokeLinejoin="round" />
        </>
      )}

      {type === 'highball' && (
        <>
          <path d="M 22 2 L 58 2 L 56 82 L 24 82 Z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
          <circle cx="40" cy="34" r="9" stroke={color} strokeWidth={stroke * 0.7} />
          <circle cx="32" cy="52" r="7" stroke={color} strokeWidth={stroke * 0.7} />
          <circle cx="46" cy="60" r="1" fill={color} opacity="0.55" stroke="none" />
          <circle cx="42" cy="70" r="1.2" fill={color} opacity="0.55" stroke="none" />
          <circle cx="34" cy="66" r="0.8" fill={color} opacity="0.55" stroke="none" />
        </>
      )}

      {type === 'coupe' && (
        <>
          <path d="M 8 10 L 72 10 Q 72 44 40 44 Q 8 44 8 10 Z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
          <line x1="40" y1="44" x2="40" y2="74" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          <line x1="22" y1="82" x2="58" y2="82" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          <line x1="40" y1="74" x2="40" y2="82" stroke={color} strokeWidth={stroke * 0.8} />
        </>
      )}

      {type === 'shot' && (
        <>
          {/* Shot glass — narrow cylinder with slight taper */}
          <path d="M 26 4 L 54 4 L 52 82 L 28 82 Z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
          {/* Cream float layer near the top */}
          <path d="M 27 22 Q 40 26 53 22" stroke={color} strokeWidth={stroke * 0.6} strokeLinecap="round" fill="none" opacity="0.7" />
        </>
      )}
    </svg>
  );
}
