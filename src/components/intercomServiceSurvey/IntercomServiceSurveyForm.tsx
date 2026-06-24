import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { INITIAL_INTERCOM_SERVICE_FORM, type IntercomServiceFormState } from './types';
import { computeEstimation } from './computeEstimation';
import EstimationSummaryDock from './EstimationSummaryDock';
import IntercomServiceSurveyFormBody, { computeIntercomFormProgress } from './IntercomServiceSurveyFormBody';

interface Props {
  onBack: () => void;
}

const IntercomServiceSurveyForm: React.FC<Props> = ({ onBack }) => {
  const [form, setForm] = useState<IntercomServiceFormState>(INITIAL_INTERCOM_SERVICE_FORM);

  const breakdown = useMemo(() => computeEstimation(form), [form]);

  const progress = useMemo(() => computeIntercomFormProgress(form), [form]);

  const saveJson = () => {
    const blob = new Blob([JSON.stringify({ form, estimation: breakdown, savedAt: new Date().toISOString() }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `intercom-service-survey-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const resetForm = () => {
    if (window.confirm('Reset the entire form?')) setForm(INITIAL_INTERCOM_SERVICE_FORM);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-44 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 md:pb-36">
      <header className="sticky top-0 z-[80] border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-800 dark:text-blue-300">Field service</p>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white md:text-xl">Intercom Service Estimation Survey</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm dark:border-slate-600 dark:text-slate-200"
            >
              Back
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={resetForm}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={saveJson}
              className="flex items-center gap-1 rounded-xl bg-blue-900 px-3 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Save JSON
            </motion.button>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-3xl">
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

      <main className="mx-auto max-w-3xl px-4 py-6">
        <IntercomServiceSurveyFormBody form={form} setForm={setForm} bottomPaddingClass="pb-4" />
      </main>

      <EstimationSummaryDock breakdown={breakdown} />
    </div>
  );
};

export default IntercomServiceSurveyForm;
