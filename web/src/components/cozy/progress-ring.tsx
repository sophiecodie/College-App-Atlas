"use client";

import { motion } from "motion/react";

type Props = { value: number; size?: number; stroke?: number; label?: string };

/** Animated circular progress (0–100). */
export function ProgressRing({ value, size = 128, stroke = 12, label }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div aria-label={label ?? `${clamped}% complete`} className="progress-ring" role="img" style={{ width: size, height: size }}>
      <svg height={size} width={size}>
        <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#F4E7DE" strokeWidth={stroke} />
        <motion.circle
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          r={radius}
          stroke="var(--accent)"
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeWidth={stroke}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="progress-ring-label">{clamped}%</span>
    </div>
  );
}

/** Animated horizontal progress bar. */
export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div aria-valuemax={100} aria-valuemin={0} aria-valuenow={clamped} className="progress-bar" role="progressbar">
      <motion.span animate={{ width: `${clamped}%` }} initial={{ width: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}
