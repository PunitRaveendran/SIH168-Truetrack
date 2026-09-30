import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface HoldButtonProps {
  onConfirm: () => void;
  holdDurationMs?: number;
  label: string;
  activeLabel?: string;
  isActive?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const HoldButton: React.FC<HoldButtonProps> = ({
  onConfirm,
  holdDurationMs = 1200,
  label,
  activeLabel,
  isActive = false,
  className,
  icon
}) => {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const startHold = () => {
    if (isActive) {
      // If already active, one click toggles off
      onConfirm();
      return;
    }
    setIsHolding(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min(100, (elapsed / holdDurationMs) * 100);
      setProgress(p);

      if (p >= 100) {
        clearInterval(timerRef.current);
        setIsHolding(false);
        setProgress(0);
        onConfirm();
      }
    }, 20);
  };

  const cancelHold = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      className={cn(
        'relative overflow-hidden rounded-lg px-3.5 py-2 font-medium text-xs transition-all duration-200 select-none cursor-pointer',
        isActive
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-white/20',
        className
      )}
    >
      {/* Progress fill bar */}
      {isHolding && (
        <div
          className="absolute inset-y-0 left-0 bg-amber-500/30 transition-all duration-75 pointer-events-none"
          style={{ width: `${progress}%` }}
        />
      )}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {icon}
        <span>{isActive ? (activeLabel || `Clear ${label}`) : isHolding ? `Hold to Confirm (${Math.round(progress)}%)` : label}</span>
      </div>
    </button>
  );
};
