import React from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'elevated';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variantClass =
    variant === 'subtle'
      ? 'bg-slate-900/60 border-white/[0.05]'
      : variant === 'elevated'
      ? 'bg-slate-900/95 border-white/[0.12] shadow-2xl'
      : 'glass-surface';

  return (
    <div
      className={cn(
        'rounded-xl text-slate-100 transition-all duration-200',
        variantClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
