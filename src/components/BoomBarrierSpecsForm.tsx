import React from 'react';
import type { OtherSurveyData } from '../types';

export type BoomBarrierSpecs = NonNullable<OtherSurveyData['technicalSpecs']>['boomBarrier'];

interface Props {
  specs: BoomBarrierSpecs;
  onChange: (patch: Partial<BoomBarrierSpecs>) => void;
  startVoiceInput: (field: string, setter: (val: any) => void, isNumeric?: boolean) => void;
  activeVoiceField: string | null;
}

const label = 'text-[10px] font-black text-black uppercase ml-1 block mb-1.5 tracking-widest';
const card = 'space-y-3';

const tile = (active: boolean) =>
  `min-h-[52px] rounded-2xl font-black border transition uppercase tracking-tight flex items-center justify-center text-center leading-tight text-[8.5px] px-1 py-2 ${
    active ? 'bg-blue-900 text-white border-blue-900 shadow-sm' : 'border-[#A0B0C0] bg-white text-black'
  }`;

const Mic = ({ onClick, active }: { onClick: () => void; active: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${active ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
  >
    <i className="fas fa-microphone"></i>
  </button>
);

const YesNo = ({
  value,
  onYes,
  onNo,
}: {
  value: boolean | undefined;
  onYes: () => void;
  onNo: () => void;
}) => (
  <div className="grid grid-cols-2 gap-2">
    <button type="button" onClick={onYes} className={tile(value === true)}>
      YES
    </button>
    <button type="button" onClick={onNo} className={tile(value === false)}>
      NO
    </button>
  </div>
);

const BoomBarrierSpecsForm: React.FC<Props> = ({ specs, onChange, startVoiceInput, activeVoiceField }) => {
  const b = specs;

  const toggleAccess = (key: BoomBarrierSpecs['accessControlTypes'][number], checked: boolean) => {
    const cur = b.accessControlTypes || [];
    onChange({ accessControlTypes: checked ? [...cur, key] : cur.filter((x) => x !== key) });
  };

  const toggleExposure = (key: BoomBarrierSpecs['outdoorExposure'][number], checked: boolean) => {
    const cur = b.outdoorExposure || [];
    onChange({ outdoorExposure: checked ? [...cur, key] : cur.filter((x) => x !== key) });
  };

  return (
    <div className="text-left pt-4 border-t border-[#A0B0C0]/35 space-y-4">
      <label className={label}>Boom Barrier Technical Specifications</label>

      <div className="space-y-6 rounded-2xl bg-white p-4 md:p-5 shadow-none">
        <div className="space-y-3 pt-2">
          <label className={label}>Barrier Type &amp; Quantity</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Type of Boom Barrier</span>
              <div className="grid grid-cols-2 gap-2">
                {(['Automatic Boom Barrier', 'Manual Boom Barrier'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ barrierType: o })} className={tile(b.barrierType === o)}>
                    {o === 'Automatic Boom Barrier' ? 'AUTOMATIC' : 'MANUAL'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className={label}>Number of Units Required</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  className="w-full bg-white border border-[#A0B0C0] p-4 pr-12 rounded-2xl text-slate-900 font-bold focus:border-blue-900 outline-none"
                  value={b.numberOfUnits === 0 ? '' : b.numberOfUnits}
                  onChange={(e) => onChange({ numberOfUnits: Math.max(0, Number(e.target.value) || 0) })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('bb_units', (val) => onChange({ numberOfUnits: Math.max(1, Number(val) || 1) }), true)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'bb_units' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-xl"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Installation Type</span>
              <div className="grid grid-cols-3 gap-2">
                {(['Entry', 'Exit', 'Both'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ installationType: o })} className={tile(b.installationType === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Barrier Specifications</label>
          <div className={card}>
            <div className="space-y-1">
              <label className={label}>Arm Length Required (meters)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-full bg-white border border-[#A0B0C0] p-4 pr-12 rounded-2xl text-slate-900 font-bold focus:border-blue-900 outline-none"
                  value={b.armLengthM === 0 ? '' : b.armLengthM}
                  onChange={(e) => onChange({ armLengthM: Math.max(0, Number(e.target.value) || 0) })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('bb_arm', (val) => onChange({ armLengthM: Math.max(0, Number(val) || 0) }), true)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'bb_arm' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-xl"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Arm Type</span>
              <div className="grid grid-cols-3 gap-2">
                {(['Straight Arm', 'Folding Arm', 'Fence Arm'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ armType: o })} className={tile(b.armType === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Opening Direction</span>
              <div className="grid grid-cols-2 gap-2">
                {(['Left', 'Right'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ openingDirection: o })} className={tile(b.openingDirection === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Opening/Closing Speed Requirement</span>
              <div className="grid grid-cols-2 gap-2">
                {(['Standard', 'Fast'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ speedRequirement: o })} className={tile(b.speedRequirement === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Access Control Integration</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Integrate with access control system?</span>
              <YesNo
                value={b.integrateWithAccessControl}
                onYes={() => onChange({ integrateWithAccessControl: true })}
                onNo={() => onChange({ integrateWithAccessControl: false, accessControlTypes: [] })}
              />
            </div>
            {b.integrateWithAccessControl === true && (
              <div className="space-y-2">
                <span className={label}>Type (multi-select)</span>
                {(['RFID Card', 'License Plate Recognition (LPR)', 'Remote Control', 'Push Button'] as const).map((f) => (
                  <label key={f} className="flex items-center gap-2 rounded-2xl border border-[#A0B0C0] bg-white px-3 py-2 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={b.accessControlTypes?.includes(f) || false} onChange={(e) => toggleAccess(f, e.target.checked)} />
                    {f}
                  </label>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <span className={label}>Loop Detector Required?</span>
              <YesNo value={b.loopDetectorRequired} onYes={() => onChange({ loopDetectorRequired: true })} onNo={() => onChange({ loopDetectorRequired: false })} />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Site &amp; Installation Details</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Installation Area</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['Parking Entrance', 'Roadway', 'Private Property'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ installationArea: o })} className={tile(b.installationArea === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className={label}>Road Width (meters)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-full bg-white border border-[#A0B0C0] p-4 pr-12 rounded-2xl text-slate-900 font-bold focus:border-blue-900 outline-none"
                  value={b.roadWidthM === 0 ? '' : b.roadWidthM}
                  onChange={(e) => onChange({ roadWidthM: Math.max(0, Number(e.target.value) || 0) })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('bb_road', (val) => onChange({ roadWidthM: Math.max(0, Number(val) || 0) }), true)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'bb_road' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-xl"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Surface Condition</span>
              <div className="grid grid-cols-3 gap-2">
                {(['Concrete', 'Asphalt', 'Uneven Surface'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ surfaceCondition: o })} className={tile(b.surfaceCondition === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Mounting Surface Availability</span>
              <div className="grid grid-cols-2 gap-2">
                {(['With Concrete Foundation', 'Needs Civil Works'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ mountingSurfaceAvailability: o })} className={tile(b.mountingSurfaceAvailability === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Power &amp; Network Requirements</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Power Supply</span>
              <div className="grid grid-cols-2 gap-2">
                {(['220V AC', 'Others (specify)'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ powerSupply: o, powerOtherSpecify: o === '220V AC' ? '' : b.powerOtherSpecify })} className={tile(b.powerSupply === o)}>
                    {o === 'Others (specify)' ? 'OTHERS (SPECIFY)' : o}
                  </button>
                ))}
              </div>
            </div>
            {b.powerSupply === 'Others (specify)' && (
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-2xl border border-[#A0B0C0] bg-white p-3 pr-10 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-900"
                  placeholder="Specify power supply"
                  value={b.powerOtherSpecify || ''}
                  onChange={(e) => onChange({ powerOtherSpecify: e.target.value })}
                />
                <Mic active={activeVoiceField === 'bb_power'} onClick={() => startVoiceInput('bb_power', (val) => onChange({ powerOtherSpecify: val }))} />
              </div>
            )}
            <div className="space-y-1">
              <label className={label}>Distance from Power Source</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-full bg-white border border-[#A0B0C0] p-4 pr-12 rounded-2xl text-slate-900 font-bold focus:border-blue-900 outline-none"
                  value={b.distanceFromPowerM === 0 ? '' : b.distanceFromPowerM}
                  onChange={(e) => onChange({ distanceFromPowerM: Math.max(0, Number(e.target.value) || 0) })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('bb_distP', (val) => onChange({ distanceFromPowerM: Math.max(0, Number(val) || 0) }), true)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'bb_distP' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-xl"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Network Requirement</span>
              <div className="grid grid-cols-3 gap-2">
                {(['LAN', 'WiFi', 'None'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ networkRequirement: o })} className={tile(b.networkRequirement === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Safety &amp; Additional Features</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Safety Sensors Required</span>
              <div className="grid grid-cols-3 gap-2">
                {(['Photoelectric Sensor', 'Loop Detector', 'None'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ safetySensorsRequired: o })} className={tile(b.safetySensorsRequired === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Emergency Manual Release Required?</span>
              <YesNo value={b.emergencyManualRelease} onYes={() => onChange({ emergencyManualRelease: true })} onNo={() => onChange({ emergencyManualRelease: false })} />
            </div>
            <div className="space-y-2">
              <span className={label}>Reflective Stickers / LED Lights Required?</span>
              <YesNo value={b.reflectiveOrLed} onYes={() => onChange({ reflectiveOrLed: true })} onNo={() => onChange({ reflectiveOrLed: false })} />
            </div>
            <div className="space-y-2">
              <span className={label}>Alarm/Buzzer Required?</span>
              <YesNo value={b.alarmBuzzer} onYes={() => onChange({ alarmBuzzer: true })} onNo={() => onChange({ alarmBuzzer: false })} />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Environmental Conditions</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Installation</span>
              <div className="grid grid-cols-2 gap-2">
                {(['Indoor', 'Outdoor'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ installationExposure: o, outdoorExposure: o === 'Indoor' ? [] : b.outdoorExposure })} className={tile(b.installationExposure === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {b.installationExposure === 'Outdoor' && (
              <div className="space-y-2">
                <span className={label}>Exposure (if Outdoor)</span>
                {(['Rain', 'Direct Sunlight', 'Dust/Heavy Traffic'] as const).map((w) => (
                  <label key={w} className="flex items-center gap-2 rounded-2xl border border-[#A0B0C0] bg-white px-3 py-2 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={b.outdoorExposure?.includes(w) || false} onChange={(e) => toggleExposure(w, e.target.checked)} />
                    {w}
                  </label>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <span className={label}>Wind Condition</span>
              <div className="grid grid-cols-3 gap-2">
                {(['Low', 'Moderate', 'Strong'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ windCondition: o })} className={tile(b.windCondition === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Additional Requirements / Notes</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Special instructions or client preferences</span>
              <div className="relative">
                <textarea
                  className="w-full min-h-[120px] resize-none rounded-2xl border border-[#A0B0C0] bg-white p-4 pr-12 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-900"
                  placeholder="Required"
                  value={b.specialInstructions}
                  onChange={(e) => onChange({ specialInstructions: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('bb_notes', (val) => onChange({ specialInstructions: val }))}
                  className={`absolute right-4 top-4 transition ${activeVoiceField === 'bb_notes' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-lg"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Preferred brand/specifications (optional)</span>
              <div className="relative">
                <textarea
                  className="w-full min-h-[120px] resize-none rounded-2xl border border-[#A0B0C0] bg-white p-4 pr-12 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-900"
                  placeholder="Optional"
                  value={b.preferredBrandSpecs}
                  onChange={(e) => onChange({ preferredBrandSpecs: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('bb_brand', (val) => onChange({ preferredBrandSpecs: val }))}
                  className={`absolute right-4 top-4 transition ${activeVoiceField === 'bb_brand' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-lg"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoomBarrierSpecsForm;
