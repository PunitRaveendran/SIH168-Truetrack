import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useMissionStore } from '../../store/useMissionStore';
import { Terminal, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const EventStream: React.FC = () => {
  const eventLogs = useMissionStore((s) => s.eventLogs);
  const isCollapsed = useMissionStore((s) => s.isEventStreamCollapsed);
  const toggleCollapse = useMissionStore((s) => s.toggleEventStream);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'danger':
        return <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <GlassCard className="w-80 p-3">
      {/* Header with Collapse Toggle */}
      <div
        onClick={toggleCollapse}
        className="flex items-center justify-between cursor-pointer select-none border-b border-white/[0.08] pb-2 text-xs font-semibold text-slate-300"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-sky-400" />
          <span className="uppercase tracking-wider">Engine Event Stream</span>
          <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
            {eventLogs.length}
          </span>
        </div>
        <button className="text-slate-400 hover:text-slate-200">
          {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1 text-xs"
          >
            {eventLogs.map((evt) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 rounded-lg border border-white/5 bg-slate-900/50 p-2"
              >
                {getEventIcon(evt.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-200 truncate">{evt.title}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{evt.timeStr}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-tight">
                    {evt.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
