import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  MapIcon,
  CpuChipIcon,
  MapPinIcon,
  CubeIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { SCOPE_OPTIONS, type IntercomServiceFormState } from './types';

export const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-inner outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400';

export const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400';

/** Matches TurnstileSpecsForm field styling */
export const turnstileFieldClass =
  'w-full bg-white border border-[#A0B0C0] p-3 rounded-2xl text-slate-900 font-bold text-xs focus:border-blue-900 outline-none';

const turnstileSectionLabel = 'text-[10px] font-black text-black uppercase ml-1 block mb-1.5 tracking-widest';

interface SectionProps {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  /** Flat sections with border-t dividers — same pattern as TurnstileSpecsForm */
  layout?: 'default' | 'inline';
}

export const SectionCard: React.FC<SectionProps> = ({ index, icon: Icon, title, children, layout = 'default' }) => {
  if (layout === 'inline') {
    return (
      <div className={index === 0 ? 'space-y-3 pt-2' : 'space-y-3 border-t border-[#A0B0C0]/35 pt-4'}>
        <label className={turnstileSectionLabel}>{title}</label>
        <div className="space-y-3">{children}</div>
      </div>
    );
  }
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/40 md:p-6"
    >
      <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
};

export function computeIntercomFormProgress(form: IntercomServiceFormState): number {
  let done = 0;
  const total = 11;
  if (form.scopeSelections.length) done++;
  if (form.buildingName.trim()) done++;
  if (form.intercomType) done++;
  if (form.networkType) done++;
  if (form.masterStations > 0) done++;
  if (form.substations > 0) done++;
  if (form.installationAreas.length) done++;
  if (form.distanceM > 0) done++;
  if (form.environmental) done++;
  if (form.technicians > 0 && form.workDays > 0) done++;
  if (form.observations.trim() && form.recommendations.trim()) done++;
  return Math.min(100, Math.round((done / total) * 100));
}

interface Props {
  form: IntercomServiceFormState;
  setForm: React.Dispatch<React.SetStateAction<IntercomServiceFormState>>;
  /** Extra bottom padding so content clears a fixed summary dock */
  bottomPaddingClass?: string;
  /** Embedded in Other Survey — Turnstile-style sections (no card borders) */
  layout?: 'default' | 'inline';
  /** When false, hide site photo block (parent page already has site photo). */
  showSitePhotoSection?: boolean;
}

const IntercomServiceSurveyFormBody: React.FC<Props> = ({
  form,
  setForm,
  bottomPaddingClass = 'pb-8',
  layout = 'default',
  showSitePhotoSection = true,
}) => {
  const fieldClass = layout === 'inline' ? turnstileFieldClass : inputClass;
  const innerLabelClass = layout === 'inline' ? turnstileSectionLabel : labelClass;
  const set = <K extends keyof IntercomServiceFormState>(key: K, value: IntercomServiceFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleScope = (id: string) => {
    setForm((f) => {
      const cur = f.scopeSelections.includes(id) ? f.scopeSelections.filter((x) => x !== id) : [...f.scopeSelections, id];
      return { ...f, scopeSelections: cur, otherScope: id === 'Others' && !cur.includes('Others') ? '' : f.otherScope };
    });
  };

  const addInstallationArea = () => {
    const t = form.installationAreaDraft.trim();
    if (!t) return;
    setForm((f) => ({
      ...f,
      installationAreas: [...f.installationAreas, t],
      installationAreaDraft: '',
    }));
  };

  const removeInstallationArea = (idx: number) =>
    setForm((f) => ({ ...f, installationAreas: f.installationAreas.filter((_, i) => i !== idx) }));

  const toggleObstructionType = (t: string) =>
    setForm((f) => ({
      ...f,
      obstructionTypes: f.obstructionTypes.includes(t) ? f.obstructionTypes.filter((x) => x !== t) : [...f.obstructionTypes, t],
    }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => set('sitePhotoDataUrl', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className={`${layout === 'inline' ? 'space-y-0' : 'space-y-5'} ${bottomPaddingClass}`}>
      {showSitePhotoSection && (
      <SectionCard index={0} layout={layout} icon={PhotoIcon} title="Site reference (optional)">
        {form.sitePhotoDataUrl ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <img src={form.sitePhotoDataUrl} alt="Site" className="max-h-48 w-full object-cover" />
            <button
              type="button"
              onClick={() => set('sitePhotoDataUrl', null)}
              className="absolute right-2 top-2 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase text-white"
            >
              Remove
            </button>
          </motion.div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 py-10 transition hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800/50">
            <PhotoIcon className="mb-2 h-10 w-10 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Upload site photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </label>
        )}
      </SectionCard>
      )}

      <SectionCard index={showSitePhotoSection ? 1 : 0} layout={layout} icon={ClipboardDocumentListIcon} title="Scope of work">
        <p className="text-xs text-slate-500 dark:text-slate-400">Multi-select — tap to toggle.</p>
        <div className="grid grid-cols-2 gap-2">
          {SCOPE_OPTIONS.map((id) => {
            const active = form.scopeSelections.includes(id);
            return (
              <motion.button
                key={id}
                type="button"
                layout
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleScope(id)}
                className={`min-h-[52px] rounded-2xl border font-black uppercase tracking-tight transition ${
                  active
                    ? 'border-blue-900 bg-blue-900 text-white shadow-md'
                    : 'border-[#A0B0C0] bg-white text-slate-900 hover:bg-slate-50'
                } text-[8.5px]`}
              >
                {id === 'Others' ? 'Others' : id}
              </motion.button>
            );
          })}
        </div>
        <AnimatePresence>
          {form.scopeSelections.includes('Others') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden"
            >
              <label className={innerLabelClass}>Specify scope</label>
              <input className={fieldClass} value={form.otherScope} onChange={(e) => set('otherScope', e.target.value)} placeholder="Describe custom scope" />
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      <SectionCard index={showSitePhotoSection ? 2 : 1} layout={layout} icon={MapIcon} title="Coverage area">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={innerLabelClass}>Building / site name</label>
            <input className={fieldClass} value={form.buildingName} onChange={(e) => set('buildingName', e.target.value)} placeholder="e.g. Terminal 2" />
          </div>
          <div>
            <label className={innerLabelClass}>Floors covered</label>
            <input className={fieldClass} value={form.floorsCovered} onChange={(e) => set('floorsCovered', e.target.value)} placeholder="e.g. 1–3" />
          </div>
        </div>
        <div>
          <label className={innerLabelClass}>Zones / departments (comma-separated)</label>
          <input
            className={fieldClass}
            value={form.zonesRaw}
            onChange={(e) => set('zonesRaw', e.target.value)}
            placeholder="Security, IT, Retail…"
          />
        </div>
        <div>
          <label className={innerLabelClass}>Coverage notes (optional)</label>
          <textarea className={`${fieldClass} min-h-[88px] resize-none`} value={form.coverageNotes} onChange={(e) => set('coverageNotes', e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard index={showSitePhotoSection ? 3 : 2} layout={layout} icon={CpuChipIcon} title="Intercom technical specifications">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={innerLabelClass}>Type of intercom</label>
            <select className={fieldClass} value={form.intercomType} onChange={(e) => set('intercomType', e.target.value as IntercomServiceFormState['intercomType'])}>
              <option value="">Select</option>
              <option value="Audio">Audio</option>
              <option value="Video">Video</option>
              <option value="IP">IP</option>
            </select>
          </div>
          <div>
            <label className={innerLabelClass}>Network type</label>
            <select className={fieldClass} value={form.networkType} onChange={(e) => set('networkType', e.target.value as IntercomServiceFormState['networkType'])}>
              <option value="">Select</option>
              <option value="Wired">Wired</option>
              <option value="Wireless">Wireless</option>
              <option value="IP">IP</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={innerLabelClass}>Master stations (qty)</label>
            <input type="number" min={0} className={fieldClass} value={form.masterStations || ''} onChange={(e) => set('masterStations', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className={innerLabelClass}>Substations (qty)</label>
            <input type="number" min={0} className={fieldClass} value={form.substations || ''} onChange={(e) => set('substations', Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
        <div>
          <label className={innerLabelClass}>Communication range (meters)</label>
          <input type="number" min={0} step="any" className={fieldClass} value={form.commRangeM || ''} onChange={(e) => set('commRangeM', Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div>
          <label className={innerLabelClass}>Power source</label>
          <select className={fieldClass} value={form.powerSource} onChange={(e) => set('powerSource', e.target.value as IntercomServiceFormState['powerSource'])}>
            <option value="">Select</option>
            <option value="220V AC">220V AC</option>
            <option value="Low Voltage">Low Voltage</option>
            <option value="PoE">PoE</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard index={showSitePhotoSection ? 4 : 3} layout={layout} icon={MapPinIcon} title="Site survey details">
        <div>
          <label className={innerLabelClass}>Installation areas</label>
          <div className="flex gap-2">
            <input
              className={fieldClass}
              value={form.installationAreaDraft}
              onChange={(e) => set('installationAreaDraft', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInstallationArea())}
              placeholder="Add area, press Enter or Add"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={addInstallationArea}
              className="shrink-0 rounded-2xl bg-blue-900 px-4 text-xs font-black uppercase tracking-widest text-white"
            >
              Add
            </motion.button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {form.installationAreas.map((a, i) => (
              <span key={`${a}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-800">
                {a}
                <button type="button" className="text-red-600" onClick={() => removeInstallationArea(i)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className={innerLabelClass}>Distance between devices (meters)</label>
          <input type="number" min={0} step="any" className={fieldClass} value={form.distanceM || ''} onChange={(e) => set('distanceM', Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div>
          <span className={innerLabelClass}>Obstructions present?</span>
          <div className="flex gap-2">
            {(['Yes', 'No'] as const).map((v) => {
              const active = (v === 'Yes' && form.obstructionsPresent === true) || (v === 'No' && form.obstructionsPresent === false);
              return (
                <motion.button
                  key={v}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => set('obstructionsPresent', v === 'Yes')}
                  className={`flex-1 rounded-2xl border py-3 text-xs font-black uppercase tracking-widest ${
                    active
                      ? 'border-blue-900 bg-blue-900 text-white'
                      : 'border-[#A0B0C0] bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {v}
                </motion.button>
              );
            })}
          </div>
        </div>
        <AnimatePresence>
          {form.obstructionsPresent === true && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <span className={innerLabelClass}>Obstruction materials</span>
              <div className="flex flex-wrap gap-2">
                {['Walls', 'Metal', 'Glass'].map((t) => {
                  const on = form.obstructionTypes.includes(t);
                  return (
                    <motion.button
                      key={t}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleObstructionType(t)}
                      className={`rounded-xl border px-4 py-2 text-xs font-black uppercase ${
                        on
                          ? 'border-amber-500 bg-amber-50 text-amber-950'
                          : 'border-[#A0B0C0] bg-white text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div>
          <label className={innerLabelClass}>Environmental condition</label>
          <select className={fieldClass} value={form.environmental} onChange={(e) => set('environmental', e.target.value)}>
            <option value="">Select</option>
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
            <option value="Dust">Dust</option>
            <option value="Heat">Heat</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard index={showSitePhotoSection ? 5 : 4} layout={layout} icon={CubeIcon} title="Materials estimation">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={innerLabelClass}>Intercom master unit (qty)</label>
            <input type="number" min={0} className={fieldClass} value={form.materialMaster || ''} onChange={(e) => set('materialMaster', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className={innerLabelClass}>Intercom substations (qty)</label>
            <input type="number" min={0} className={fieldClass} value={form.materialSub || ''} onChange={(e) => set('materialSub', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className={innerLabelClass}>Cable length (m)</label>
            <input type="number" min={0} step="any" className={fieldClass} value={form.cableLengthM || ''} onChange={(e) => set('cableLengthM', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className={innerLabelClass}>PVC conduits (m)</label>
            <input type="number" min={0} step="any" className={fieldClass} value={form.pvcM || ''} onChange={(e) => set('pvcM', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className={innerLabelClass}>Junction boxes (qty)</label>
            <input type="number" min={0} className={fieldClass} value={form.jbQty || ''} onChange={(e) => set('jbQty', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div className="sm:col-span-2">
            <label className={innerLabelClass}>Accessories</label>
            <input className={fieldClass} value={form.accessories} onChange={(e) => set('accessories', e.target.value)} placeholder="Optional list" />
          </div>
        </div>
      </SectionCard>

      <SectionCard index={showSitePhotoSection ? 6 : 5} layout={layout} icon={UserGroupIcon} title="Labor estimation">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={innerLabelClass}>Number of technicians</label>
            <input type="number" min={0} className={fieldClass} value={form.technicians || ''} onChange={(e) => set('technicians', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className={innerLabelClass}>Work duration (days)</label>
            <input type="number" min={0} step="any" className={fieldClass} value={form.workDays || ''} onChange={(e) => set('workDays', Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
      </SectionCard>

      <SectionCard index={showSitePhotoSection ? 7 : 6} layout={layout} icon={ChatBubbleLeftRightIcon} title="Notes & recommendations">
        <div>
          <label className={innerLabelClass}>Observations</label>
          <textarea className={`${fieldClass} min-h-[100px] resize-none`} value={form.observations} onChange={(e) => set('observations', e.target.value)} />
        </div>
        <div>
          <label className={innerLabelClass}>Recommendations</label>
          <textarea className={`${fieldClass} min-h-[100px] resize-none`} value={form.recommendations} onChange={(e) => set('recommendations', e.target.value)} />
        </div>
      </SectionCard>

      {layout === 'inline' ? (
        <div className="border-t border-[#A0B0C0]/35 pt-4 text-center">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Fill in survey-only technical details. Suggested cabling type still follows IP / wired / distance rules.
          </p>
        </div>
      ) : (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-center dark:border-slate-600 dark:bg-slate-800/40"
        >
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Fill in survey-only technical details. Suggested cabling type still follows IP / wired / distance rules.
          </p>
        </motion.section>
      )}
    </div>
  );
};

export default IntercomServiceSurveyFormBody;
