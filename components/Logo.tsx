'use client';

type Props = {
  size?: number;
  color: string;
  stroke?: number;
};

export function Logo({ size = 36, color, stroke = 6 }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      aria-label="daizu logo"
    >
      <path
        d="M 65 60 Q 60 35 75 40 Q 80 50 82 62"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 135 60 Q 140 35 125 40 Q 120 50 118 62"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="100" cy="115" rx="55" ry="65" stroke={color} strokeWidth={stroke} />
      <path
        d="M 100 60 Q 85 100 90 145 Q 95 165 100 175"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
