import React, { useEffect, useState } from 'react';
import { animate, motion } from 'framer-motion';
import type { EstimationBreakdown } from './computeEstimation';

function useAnimatedNumber(target: number, decimals = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, target, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setV(latest),
    });
    return () => c.stop();
  }, [target]);
  return decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
}

interface Props {
  breakdown: EstimationBreakdown;
  /** e.g. z-index when shown above other overlays */
  className?: string;
  /** `inline` = modal/footer; `fixed` = bottom dock */
  variant?: 'fixed' | 'inline';
}

const EstimationSummaryDock: React.FC<Props> = ({ breakdown, className = '', variant = 'fixed' }) => {
  const device = useAnimatedNumber(breakdown.deviceCost);
  const cabling = useAnimatedNumber(breakdown.cablingCost);
  const labor = useAnimatedNumber(breakdown.laborCost);
  const total = useAnimatedNumber(breakdown.totalCost);

  const shellClass =
    variant === 'fixed'
      ? `pointer-events-auto fixed bottom-0 left-0 right-0 z-[90] border-t border-slate-200/90 bg-white/95 p-4 shadow-[0_-8px_40px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/95 md:left-auto md:right-4 md:bottom-4 md:max-w-md md:rounded-2xl md:border md:shadow-2xl ${className}`
      : `pointer-events-auto relative z-10 mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_-8px_40px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/95 ${className}`;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className={shellClass}
    >
      <div className="mx-auto flex max-w-md flex-col gap-3 md:max-w-none">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-900 dark:text-blue-300">Estimation Summary</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
            Live
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
            <p className="font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Device cost</p>
            <p className="mt-0.5 font-black tabular-nums text-slate-900 dark:text-white">₱{device}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
            <p className="font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cabling cost</p>
            <p className="mt-0.5 font-black tabular-nums text-slate-900 dark:text-white">₱{cabling}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
            <p className="font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Labor cost</p>
            <p className="mt-0.5 font-black tabular-nums text-slate-900 dark:text-white">₱{labor}</p>
          </div>
          <div className="rounded-xl border-2 border-amber-400/80 bg-amber-50/90 px-3 py-2 dark:border-amber-500/50 dark:bg-amber-500/10">
            <p className="font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">Total</p>
            <p className="mt-0.5 font-black tabular-nums text-blue-950 dark:text-amber-100">₱{total}</p>
          </div>
        </div>
        <p className="text-[10px] leading-snug text-slate-500 dark:text-slate-400">
          Suggested cabling:{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{breakdown.cablingSuggestion}</span>
        </p>
      </div>
    </motion.div>
  );
};

export default EstimationSummaryDock;
