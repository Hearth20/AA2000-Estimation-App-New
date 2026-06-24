import React from 'react';
import type { OtherSurveyData } from '../types';

export type TurnstileSpecs = NonNullable<OtherSurveyData['technicalSpecs']>['turnstile'];

interface Props {
  specs: TurnstileSpecs;
  onChange: (patch: Partial<TurnstileSpecs>) => void;
  startVoiceInput: (field: string, setter: (val: any) => void, isNumeric?: boolean) => void;
  activeVoiceField: string | null;
}

const label = 'text-[10px] font-black text-black uppercase ml-1 block mb-1.5 tracking-widest';
const card = 'space-y-3';

const tile = (active: boolean) =>
  `min-h-[52px] rounded-2xl font-black border transition uppercase tracking-tight flex items-center justify-center text-center leading-tight text-[8.5px] px-1 py-2 ${
    active ? 'bg-blue-900 text-white border-blue-900 shadow-sm' : 'border-[#A0B0C0] bg-white text-black'
  }`;

const Mic = ({
  onClick,
  active,
}: {
  onClick: () => void;
  active: boolean;
}) => (
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

/**
 * Turnstile specification blocks — matches Other Survey Service Details typography & borders.
 */
const TurnstileSpecsForm: React.FC<Props> = ({ specs, onChange, startVoiceInput, activeVoiceField }) => {
  const t = specs;

  const toggleAccess = (key: TurnstileSpecs['accessControlTypes'][number], checked: boolean) => {
    const cur = t.accessControlTypes || [];
    onChange({
      accessControlTypes: checked ? [...cur, key] : cur.filter((x) => x !== key),
    });
  };

  const toggleWeather = (key: TurnstileSpecs['weatherConditions'][number], checked: boolean) => {
    const cur = t.weatherConditions || [];
    onChange({
      weatherConditions: checked ? [...cur, key] : cur.filter((x) => x !== key),
    });
  };

  return (
    <div className="text-left pt-4 border-t border-[#A0B0C0]/35 space-y-4">
      <label className={label}>Turnstile Technical Specifications</label>

      <div className="space-y-6 rounded-2xl bg-white p-4 md:p-5 shadow-none">
        {/* 2 */}
        <div className="space-y-3 pt-2">
          <label className={label}>Turnstile Type &amp; Quantity</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Type of Turnstile</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { v: 'Tripod' as const, l: 'TRIPOD' },
                    { v: 'Half-Height' as const, l: 'HALF-HEIGHT' },
                    { v: 'Full-Height' as const, l: 'FULL-HEIGHT' },
                    { v: 'Speed Gate/Flap Barrier' as const, l: 'SPEED GATE' },
                  ] as const
                ).map((o) => (
                  <button key={o.v} type="button" onClick={() => onChange({ turnstileType: o.v })} className={tile(t.turnstileType === o.v)}>
                    {o.l}
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
                  value={t.numberOfUnits === 0 ? '' : t.numberOfUnits}
                  onChange={(e) => onChange({ numberOfUnits: Math.max(0, Number(e.target.value) || 0) })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('ts_units', (val) => onChange({ numberOfUnits: Math.max(1, Number(val) || 1) }), true)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'ts_units' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-xl"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Installation</span>
              <div className="grid grid-cols-2 gap-2">
                {(['Indoor', 'Outdoor'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ installation: o })} className={tile(t.installation === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3 */}
        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Access Control Integration</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Integrate with access control system?</span>
              <YesNo
                value={t.integrateWithAccessControl}
                onYes={() => onChange({ integrateWithAccessControl: true })}
                onNo={() => onChange({ integrateWithAccessControl: false, accessControlTypes: [], requiredDirection: '' })}
              />
            </div>
            {t.integrateWithAccessControl === true && (
              <div className="space-y-2 pt-1">
                <span className={label}>Type (multi-select)</span>
                {(['RFID Card', 'Biometric (Fingerprint/Face)', 'QR Code/Barcode'] as const).map((feature) => (
                  <label key={feature} className="flex items-center gap-2 rounded-2xl border border-[#A0B0C0] bg-white px-3 py-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={t.accessControlTypes?.includes(feature) || false}
                      onChange={(e) => toggleAccess(feature, e.target.checked)}
                    />
                    {feature}
                  </label>
                ))}
                <div className="space-y-2">
                  <span className={label}>Required Direction</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['One-way', 'Two-way'] as const).map((o) => (
                      <button key={o} type="button" onClick={() => onChange({ requiredDirection: o })} className={tile(t.requiredDirection === o)}>
                        {o.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4 */}
        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Site &amp; Installation Details</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Installation Area</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(['Entrance/Exit', 'Lobby', 'Perimeter/Outdoor'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ installationArea: o })} className={tile(t.installationArea === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Floor Condition</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(
                  [
                    { v: 'Concrete' as const, l: 'CONCRETE' },
                    { v: 'Tiles' as const, l: 'TILES' },
                    { v: 'Raised Flooring' as const, l: 'RAISED FLOORING' },
                  ] as const
                ).map((o) => (
                  <button key={o.v} type="button" onClick={() => onChange({ floorCondition: o.v })} className={tile(t.floorCondition === o.v)}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={label}>Width</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full bg-white border border-[#A0B0C0] p-4 pr-16 rounded-2xl text-slate-900 font-bold focus:border-blue-900 outline-none"
                    value={t.widthM === 0 ? '' : t.widthM}
                    onChange={(e) => onChange({ widthM: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput('ts_w', (val) => onChange({ widthM: Math.max(0, Number(val) || 0) }), true)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'ts_w' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                  >
                    <i className="fas fa-microphone text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className={label}>Length (m)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full bg-white border border-[#A0B0C0] p-4 pr-16 rounded-2xl text-slate-900 font-bold focus:border-blue-900 outline-none"
                    value={t.lengthM === 0 ? '' : t.lengthM}
                    onChange={(e) => onChange({ lengthM: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput('ts_l', (val) => onChange({ lengthM: Math.max(0, Number(val) || 0) }), true)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'ts_l' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                  >
                    <i className="fas fa-microphone text-xl"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5 */}
        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Power &amp; Network Requirements</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Power Supply</span>
              <div className="grid grid-cols-2 gap-2">
                {(['220V AC', 'Others (specify)'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ powerSupply: o, powerOtherSpecify: o === '220V AC' ? '' : t.powerOtherSpecify })} className={tile(t.powerSupply === o)}>
                    {o === 'Others (specify)' ? 'OTHERS (SPECIFY)' : o}
                  </button>
                ))}
              </div>
            </div>
            {t.powerSupply === 'Others (specify)' && (
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-2xl border border-[#A0B0C0] bg-white p-3 pr-10 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-900"
                  placeholder="Specify power supply"
                  value={t.powerOtherSpecify || ''}
                  onChange={(e) => onChange({ powerOtherSpecify: e.target.value })}
                />
                <Mic active={activeVoiceField === 'ts_power'} onClick={() => startVoiceInput('ts_power', (val) => onChange({ powerOtherSpecify: val }))} />
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
                  value={t.distanceFromPowerM === 0 ? '' : t.distanceFromPowerM}
                  onChange={(e) => onChange({ distanceFromPowerM: Math.max(0, Number(e.target.value) || 0) })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('ts_distP', (val) => onChange({ distanceFromPowerM: Math.max(0, Number(val) || 0) }), true)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'ts_distP' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-xl"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Network Requirement</span>
              <div className="grid grid-cols-3 gap-2">
                {(['LAN', 'WiFi', 'None'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ networkRequirement: o })} className={tile(t.networkRequirement === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 6 */}
        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Safety &amp; Additional Features</label>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className={label}>Emergency Mode (free passage on power failure)?</span>
              <YesNo value={t.emergencyMode} onYes={() => onChange({ emergencyMode: true })} onNo={() => onChange({ emergencyMode: false })} />
            </div>
            <div className="space-y-2">
              <span className={label}>Fire Alarm Integration?</span>
              <YesNo value={t.fireAlarmIntegration} onYes={() => onChange({ fireAlarmIntegration: true })} onNo={() => onChange({ fireAlarmIntegration: false })} />
            </div>
            <div className="space-y-2">
              <span className={label}>Anti-tailgating feature?</span>
              <YesNo value={t.antiTailgating} onYes={() => onChange({ antiTailgating: true })} onNo={() => onChange({ antiTailgating: false })} />
            </div>
            <div className="space-y-2">
              <span className={label}>LED Indicators / Alarm Sound?</span>
              <YesNo value={t.ledIndicatorsAlarm} onYes={() => onChange({ ledIndicatorsAlarm: true })} onNo={() => onChange({ ledIndicatorsAlarm: false })} />
            </div>
          </div>
        </div>

        {/* 7 */}
        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Environmental Conditions</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Exposure</span>
              <div className="grid grid-cols-2 gap-2">
                {(['Indoor', 'Outdoor'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ exposure: o, weatherConditions: o === 'Indoor' ? [] : t.weatherConditions })} className={tile(t.exposure === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {t.exposure === 'Outdoor' && (
              <div className="space-y-2">
                <span className={label}>Weather Conditions (if outdoor)</span>
                {(['Rain', 'Heat', 'Dust Exposure'] as const).map((w) => (
                  <label key={w} className="flex items-center gap-2 rounded-2xl border border-[#A0B0C0] bg-white px-3 py-2 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={t.weatherConditions?.includes(w) || false} onChange={(e) => toggleWeather(w, e.target.checked)} />
                    {w}
                  </label>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <span className={label}>Estimated Foot Traffic</span>
              <div className="grid grid-cols-3 gap-2">
                {(['Low', 'Medium', 'High'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => onChange({ footTraffic: o })} className={tile(t.footTraffic === o)}>
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 8 */}
        <div className="space-y-3 pt-4 border-t border-[#A0B0C0]/35">
          <label className={label}>Additional Requirements / Notes</label>
          <div className={card}>
            <div className="space-y-2">
              <span className={label}>Special instructions or client requirements</span>
              <div className="relative">
                <textarea
                  className="w-full min-h-[120px] resize-none rounded-2xl border border-[#A0B0C0] bg-white p-4 pr-12 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-900"
                  placeholder="Required"
                  value={t.specialInstructions}
                  onChange={(e) => onChange({ specialInstructions: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('ts_notes', (val) => onChange({ specialInstructions: val }))}
                  className={`absolute right-4 top-4 transition ${activeVoiceField === 'ts_notes' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                >
                  <i className="fas fa-microphone text-lg"></i>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className={label}>Preferred brand or specifications (optional)</span>
              <div className="relative">
                <textarea
                  className="w-full min-h-[120px] resize-none rounded-2xl border border-[#A0B0C0] bg-white p-4 pr-12 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-900"
                  placeholder="Optional"
                  value={t.preferredBrandSpecs}
                  onChange={(e) => onChange({ preferredBrandSpecs: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('ts_brand', (val) => onChange({ preferredBrandSpecs: val }))}
                  className={`absolute right-4 top-4 transition ${activeVoiceField === 'ts_brand' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
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

export default TurnstileSpecsForm;
