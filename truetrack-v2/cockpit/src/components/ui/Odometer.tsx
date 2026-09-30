import React from 'react';
import { cn } from '../../lib/utils';

interface OdometerProps {
  value: number | string;
  unit?: string;
  decimals?: number;
  className?: string;
  unitClassName?: string;
}

export const Odometer: React.FC<OdometerProps> = ({
  value,
  unit,
  decimals = 1,
  className,
  unitClassName
}) => {
  const displayValue =
    typeof value === 'number'
      ? isNaN(value)
        ? '—'
        : value.toFixed(decimals)
      : value;

  return (
    <div className={cn('inline-flex items-baseline font-mono-numbers font-bold tracking-tight', className)}>
      <span>{displayValue}</span>
      {unit && (
        <span className={cn('ml-1 text-sm font-normal text-slate-400', unitClassName)}>
          {unit}
        </span>
      )}
    </div>
  );
};
