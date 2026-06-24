import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { IntercomServiceFormState } from './types';
import { computeEstimation } from './computeEstimation';
import EstimationSummaryDock from './EstimationSummaryDock';
import IntercomServiceSurveyFormBody, { computeIntercomFormProgress } from './IntercomServiceSurveyFormBody';
import { isIntercomModalFormValid } from './mapOtherSurveyIntercom';

interface Props {
  open: boolean;
  form: IntercomServiceFormState;
  setForm: React.Dispatch<React.SetStateAction<IntercomServiceFormState>>;
  onClose: () => void;
  onApply: () => void;
}

const IntercomServiceSurveyModal: React.FC<Props> = ({ open, form, setForm, onClose, onApply }) => {
  const breakdown = useMemo(() => computeEstimation(form), [form]);
  const progress = useMemo(() => computeIntercomFormProgress(form), [form]);
  const canApply = isIntercomModalFormValid(form);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="intercom-survey-modal-title"
            className="relative z-[1310] flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border-0 bg-gradient-to-b from-slate-50 via-white to-slate-100 shadow-2xl dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:rounded-3xl"
            initial={{ y: 48, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <header className="shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-800 dark:text-blue-300">Intercom</p>
                  <h2 id="intercom-survey-modal-title" className="text-base font-black tracking-tight text-slate-900 dark:text-white md:text-lg">
                    Service estimation survey
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-700 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400">{progress}% complete</p>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <IntercomServiceSurveyFormBody form={form} setForm={setForm} bottomPaddingClass="pb-4" />
            </div>

            <div className="shrink-0 border-t border-slate-200/70 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
              <EstimationSummaryDock variant="inline" breakdown={breakdown} />
            </div>

            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/95">
              <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canApply}
                  onClick={onApply}
                  className="rounded-xl bg-blue-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save & apply to survey
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntercomServiceSurveyModal;
