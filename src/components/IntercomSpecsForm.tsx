import React from 'react';
import type { OtherSurveyData } from '../types';

export type IntercomSpecs = NonNullable<OtherSurveyData['technicalSpecs']>['intercom'];

interface Props {
  specs: IntercomSpecs;
  onChange: (patch: Partial<IntercomSpecs>) => void;
  startVoiceInput: (field: string, setter: (val: any) => void, isNumeric?: boolean) => void;
  activeVoiceField: string | null;
}

const label = 'text-[10px] font-black text-black uppercase ml-1 block mb-1.5 tracking-widest';
const section = 'space-y-3 pt-4 border-t border-[#A0B0C0]/35';
const tile = (active: boolean) =>
  `min-h-[52px] rounded-2xl font-black border transition uppercase tracking-tight flex items-center justify-center text-center leading-tight text-[8.5px] px-1 py-2 ${
    active ? 'bg-blue-900 text-white border-blue-900 shadow-sm' : 'border-[#A0B0C0] bg-white text-black'
  }`;

const YesNo = ({ value, onYes, onNo }: { value: boolean | undefined; onYes: () => void; onNo: () => void }) => (
  <div className="grid grid-cols-2 gap-2">
    <button type="button" onClick={onYes} className={tile(value === true)}>YES</button>
    <button type="button" onClick={onNo} className={tile(value === false)}>NO</button>
  </div>
);

const InputWithMic = ({
  value,
  onChange,
  voiceField,
  startVoiceInput,
  activeVoiceField,
  type = 'number',
  min,
  step,
}: {
  value: string | number;
  onChange: (v: string) => void;
  voiceField: string;
  startVoiceInput: Props['startVoiceInput'];
  activeVoiceField: string | null;
  type?: string;
  min?: string;
  step?: string;
}) => (
  <div className="relative">
    <input
      type={type}
      min={min}
      step={step}
      className="w-full bg-white border border-[#A0B0C0] p-4 pr-12 rounded-2xl text-slate-900 font-bold focus:border-blue-900 outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <button
      type="button"
      onClick={() => startVoiceInput(voiceField, (val) => onChange(String(val)), type !== 'text')}
      className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === voiceField ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
    >
      <i className="fas fa-microphone text-xl"></i>
    </button>
  </div>
);

const IntercomSpecsForm: React.FC<Props> = ({ specs: i, onChange, startVoiceInput, activeVoiceField }) => {
  const toggleArea = (x: IntercomSpecs['installationAreas'][number], checked: boolean) => {
    const cur = i.installationAreas || [];
    onChange({ installationAreas: checked ? [...cur, x] : cur.filter((a) => a !== x) });
  };
  const toggleScope = (x: IntercomSpecs['laborScopeOfWork'][number], checked: boolean) => {
    const cur = i.laborScopeOfWork || [];
    onChange({ laborScopeOfWork: checked ? [...cur, x] : cur.filter((a) => a !== x) });
  };

  const autoMaterials = () => {
    onChange({
      autoCalculateMaterials: true,
      materialMasterUnitQty: i.numberOfMasterStations || 0,
      materialSubstationsQty: i.numberOfSubstations || 0,
      materialCableLengthM: Math.max(0, (i.distanceBetweenDevicesM || 0) * Math.max(1, i.numberOfSubstations || 1)),
      materialPvcConduitsM: Math.max(0, (i.distanceBetweenDevicesM || 0) * Math.max(1, i.numberOfSubstations || 1)),
      materialJunctionBoxesQty: Math.max(0, i.numberOfSubstations || 0),
    });
  };

  return (
    <div className="text-left pt-4 border-t border-[#A0B0C0]/35 space-y-4">
      <label className={label}>Intercom Technical Specifications</label>
      <div className="space-y-6 rounded-2xl bg-white p-4 md:p-5 shadow-none">
        <div className="space-y-3 pt-2">
          <label className={label}>System Requirements</label>
          <div className="space-y-2">
            <span className={label}>Type of Intercom</span>
            <div className="grid grid-cols-3 gap-2">
              {(['Audio', 'Video', 'IP-based'] as const).map((o) => (
                <button key={o} type="button" onClick={() => onChange({ typeOfIntercom: o, stableInternetAvailable: o === 'IP-based' ? i.stableInternetAvailable : false })} className={tile(i.typeOfIntercom === o)}>{o.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={label}>Number of Master Stations</label>
              <InputWithMic
                value={i.numberOfMasterStations === 0 ? '' : i.numberOfMasterStations}
                onChange={(v) => onChange({ numberOfMasterStations: Math.max(0, Number(v) || 0) })}
                voiceField="ic_master"
                startVoiceInput={startVoiceInput}
                activeVoiceField={activeVoiceField}
                min="0"
              />
            </div>
            <div className="space-y-1">
              <label className={label}>Number of Substations</label>
              <InputWithMic
                value={i.numberOfSubstations === 0 ? '' : i.numberOfSubstations}
                onChange={(v) => onChange({ numberOfSubstations: Math.max(0, Number(v) || 0) })}
                voiceField="ic_sub"
                startVoiceInput={startVoiceInput}
                activeVoiceField={activeVoiceField}
                min="0"
              />
            </div>
          </div>
          <label className={label}>Communication Range (meters)</label>
          <InputWithMic value={i.communicationRangeM === 0 ? '' : i.communicationRangeM} onChange={(v) => onChange({ communicationRangeM: Math.max(0, Number(v) || 0) })} voiceField="ic_range" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} min="0" step="any" />
          <div className="grid grid-cols-2 gap-2">
            {(['Wired', 'Wireless'] as const).map((o) => <button key={o} type="button" onClick={() => onChange({ connectivityType: o })} className={tile(i.connectivityType === o)}>{o.toUpperCase()}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['220V AC', 'Low Voltage'] as const).map((o) => <button key={o} type="button" onClick={() => onChange({ powerRequirement: o })} className={tile(i.powerRequirement === o)}>{o.toUpperCase()}</button>)}
          </div>
          {i.typeOfIntercom === 'IP-based' && (
            <label className="flex items-center gap-2 rounded-2xl border border-[#A0B0C0] bg-white px-3 py-2 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={!!i.stableInternetAvailable} onChange={(e) => onChange({ stableInternetAvailable: e.target.checked })} />
              Stable Internet Available
            </label>
          )}
        </div>

        <div className={section}>
          <label className={label}>Site Survey Details</label>
          <span className={label}>Installation Areas</span>
          {(['Guardhouse', 'Office', 'Units', 'Others'] as const).map((x) => (
            <label key={x} className="flex items-center gap-2 rounded-2xl border border-[#A0B0C0] bg-white px-3 py-2 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={i.installationAreas?.includes(x) || false} onChange={(e) => toggleArea(x, e.target.checked)} />
              {x}
            </label>
          ))}
          <label className={label}>Distance Between Devices (meters)</label>
          <InputWithMic value={i.distanceBetweenDevicesM === 0 ? '' : i.distanceBetweenDevicesM} onChange={(v) => onChange({ distanceBetweenDevicesM: Math.max(0, Number(v) || 0) })} voiceField="ic_dist" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} min="0" step="any" />
          <div className="grid grid-cols-2 gap-2">
            {(['Existing', 'Needs Installation'] as const).map((o) => <button key={o} type="button" onClick={() => onChange({ cablePathAvailability: o })} className={tile(i.cablePathAvailability === o)}>{o.toUpperCase()}</button>)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['Wall', 'Desk', 'Post'] as const).map((o) => <button key={o} type="button" onClick={() => onChange({ mountingType: o })} className={tile(i.mountingType === o)}>{o.toUpperCase()}</button>)}
          </div>
          <span className={label}>Obstructions Present?</span>
          <YesNo value={i.obstructionsPresent} onYes={() => onChange({ obstructionsPresent: true })} onNo={() => onChange({ obstructionsPresent: false, obstructionDescription: '' })} />
          {i.obstructionsPresent && (
            <>
              <label className={label}>Obstruction Description</label>
              <InputWithMic value={i.obstructionDescription || ''} onChange={(v) => onChange({ obstructionDescription: v })} voiceField="ic_obs_desc" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} type="text" />
            </>
          )}
          <div className="grid grid-cols-3 gap-2">
            {(['Indoor', 'Outdoor', 'Mixed'] as const).map((o) => <button key={o} type="button" onClick={() => onChange({ environmentalCondition: o })} className={tile(i.environmentalCondition === o)}>{o.toUpperCase()}</button>)}
          </div>
        </div>

        <div className={section}>
          <label className={label}>Materials Estimation</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={autoMaterials} className={tile(!!i.autoCalculateMaterials)}>AUTO-CALCULATE</button>
            <button type="button" onClick={() => onChange({ autoCalculateMaterials: false })} className={tile(i.autoCalculateMaterials === false)}>MANUAL INPUT</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={label}>Intercom Master Unit</label>
              <InputWithMic value={i.materialMasterUnitQty === 0 ? '' : i.materialMasterUnitQty} onChange={(v) => onChange({ materialMasterUnitQty: Math.max(0, Number(v) || 0) })} voiceField="ic_m_master" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} min="0" />
            </div>
            <div className="space-y-1">
              <label className={label}>Intercom Substations</label>
              <InputWithMic value={i.materialSubstationsQty === 0 ? '' : i.materialSubstationsQty} onChange={(v) => onChange({ materialSubstationsQty: Math.max(0, Number(v) || 0) })} voiceField="ic_m_sub" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={label}>Cable Length</label>
              <InputWithMic value={i.materialCableLengthM === 0 ? '' : i.materialCableLengthM} onChange={(v) => onChange({ materialCableLengthM: Math.max(0, Number(v) || 0) })} voiceField="ic_m_cable" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} min="0" step="any" />
            </div>
            <div className="space-y-1">
              <label className={label}>PVC Conduits</label>
              <InputWithMic value={i.materialPvcConduitsM === 0 ? '' : i.materialPvcConduitsM} onChange={(v) => onChange({ materialPvcConduitsM: Math.max(0, Number(v) || 0) })} voiceField="ic_m_pvc" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} min="0" step="any" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={label}>Junction Boxes</label>
              <InputWithMic value={i.materialJunctionBoxesQty === 0 ? '' : i.materialJunctionBoxesQty} onChange={(v) => onChange({ materialJunctionBoxesQty: Math.max(0, Number(v) || 0) })} voiceField="ic_m_jb" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} min="0" />
            </div>
            <div className="space-y-1">
              <label className={label}>Accessories</label>
              <InputWithMic value={i.materialAccessories || ''} onChange={(v) => onChange({ materialAccessories: v })} voiceField="ic_m_acc" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} type="text" />
            </div>
          </div>
        </div>

        <div className={section}>
          <label className={label}>Labor Estimation</label>
          <div className="grid grid-cols-3 gap-2">
            {(['1 day', '2 days', '3+ days'] as const).map((o) => <button key={o} type="button" onClick={() => onChange({ installationDuration: o })} className={tile(i.installationDuration === o)}>{o.toUpperCase()}</button>)}
          </div>
          <label className={label}>Number of Technicians</label>
          <InputWithMic value={i.numberOfTechnicians === 0 ? '' : i.numberOfTechnicians} onChange={(v) => onChange({ numberOfTechnicians: Math.max(0, Number(v) || 0) })} voiceField="ic_l_tech" startVoiceInput={startVoiceInput} activeVoiceField={activeVoiceField} min="0" />
          <span className={label}>Scope of Work</span>
          {(
            [
              { value: 'Installation' as const, label: 'INSTALLATION' },
              { value: 'Cabling' as const, label: 'CABLING' },
              { value: 'Testing' as const, label: 'TESTING' },
              { value: 'Configuration' as const, label: 'CONFIGURATION' },
            ] as const
          ).map((x) => (
            <label key={x.value} className="flex items-center gap-2 rounded-2xl border border-[#A0B0C0] bg-white px-3 py-2.5 text-xs font-bold text-slate-700">
              <input type="checkbox" className="accent-blue-600" checked={i.laborScopeOfWork?.includes(x.value) || false} onChange={(e) => toggleScope(x.value, e.target.checked)} />
              {x.label}
            </label>
          ))}
        </div>

        <div className={section}>
          <label className={label}>Notes and Recommendations</label>
          <label className={label}>Observations</label>
          <div className="relative">
            <textarea className="w-full min-h-[120px] resize-none rounded-2xl border border-[#A0B0C0] bg-white p-4 pr-12 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-900" value={i.observations || ''} onChange={(e) => onChange({ observations: e.target.value })} />
            <button type="button" onClick={() => startVoiceInput('ic_obs', (val) => onChange({ observations: val }))} className={`absolute right-4 top-4 transition ${activeVoiceField === 'ic_obs' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}><i className="fas fa-microphone text-lg"></i></button>
          </div>
          <label className={label}>Recommendations</label>
          <div className="relative">
            <textarea className="w-full min-h-[120px] resize-none rounded-2xl border border-[#A0B0C0] bg-white p-4 pr-12 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-900" value={i.recommendations || ''} onChange={(e) => onChange({ recommendations: e.target.value })} />
            <button type="button" onClick={() => startVoiceInput('ic_rec', (val) => onChange({ recommendations: val }))} className={`absolute right-4 top-4 transition ${activeVoiceField === 'ic_rec' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}><i className="fas fa-microphone text-lg"></i></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntercomSpecsForm;
