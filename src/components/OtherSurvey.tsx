import React, { useState, useEffect, useRef } from 'react';
import { OtherSurveyData } from '../types';
import { BUILDING_TYPES } from '../constants';
import { processNumeric, processTitleCase } from '../utils/voiceProcessing';
import FloorPlanManager from './FloorPlanManager';
import TurnstileSpecsForm from './TurnstileSpecsForm';
import BoomBarrierSpecsForm from './BoomBarrierSpecsForm';
import SurveyLayout from './SurveyLayout';
import IntercomServiceSurveyFormBody from './intercomServiceSurvey/IntercomServiceSurveyFormBody';
import { INITIAL_INTERCOM_SERVICE_FORM } from './intercomServiceSurvey/types';
import {
  otherSurveyToIntercomForm,
  applyIntercomFormToOtherSurvey,
  isIntercomModalFormValid,
} from './intercomServiceSurvey/mapOtherSurveyIntercom';

const DEFAULT_INTERCOM: NonNullable<OtherSurveyData['technicalSpecs']>['intercom'] = {
  typeOfIntercom: '',
  numberOfMasterStations: 0,
  numberOfSubstations: 0,
  communicationRangeM: 0,
  connectivityType: '',
  powerRequirement: '',
  stableInternetAvailable: false,
  installationAreas: [],
  distanceBetweenDevicesM: 0,
  cablePathAvailability: '',
  mountingType: '',
  obstructionsPresent: undefined,
  obstructionDescription: '',
  environmentalCondition: '',
  autoCalculateMaterials: false,
  materialMasterUnitQty: 0,
  materialSubstationsQty: 0,
  materialCableLengthM: 0,
  materialPvcConduitsM: 0,
  materialJunctionBoxesQty: 0,
  materialAccessories: '',
  installationDuration: '',
  numberOfTechnicians: 0,
  laborScopeOfWork: [],
  materialCost: 0,
  laborCost: 0,
  observations: '',
  recommendations: '',
};

const DEFAULT_TURNSTILE: NonNullable<OtherSurveyData['technicalSpecs']>['turnstile'] = {
  turnstileType: '',
  numberOfUnits: 0,
  installation: '',
  accessControlTypes: [],
  requiredDirection: '',
  installationArea: '',
  floorCondition: '',
  widthM: 0,
  lengthM: 0,
  powerSupply: '',
  powerOtherSpecify: '',
  distanceFromPowerM: 0,
  networkRequirement: '',
  weatherConditions: [],
  specialInstructions: '',
  preferredBrandSpecs: '',
  exposure: '',
  footTraffic: ''
};

const DEFAULT_BOOM_BARRIER: NonNullable<OtherSurveyData['technicalSpecs']>['boomBarrier'] = {
  barrierType: '',
  numberOfUnits: 0,
  installationType: '',
  armLengthM: 0,
  armType: '',
  openingDirection: '',
  speedRequirement: '',
  accessControlTypes: [],
  installationArea: '',
  roadWidthM: 0,
  surfaceCondition: '',
  mountingSurfaceAvailability: '',
  powerSupply: '',
  powerOtherSpecify: '',
  distanceFromPowerM: 0,
  networkRequirement: '',
  safetySensorsRequired: '',
  installationExposure: '',
  outdoorExposure: [],
  windCondition: '',
  specialInstructions: '',
  preferredBrandSpecs: ''
};

const SYSTEM_CATEGORY_OPTIONS = [
  'Intercom',
  'Turnstile',
  'Boom Barrier',
  'Room Alert',
  'EAS System',
  'PABX / Paging',
  'M2M',
  'POS System',
  'X-Ray / Metal Detector',
  'FDAS',
  'Fire Pro',
  'Parking Barrier',
  'Others (Specify)',
] as const;

const SYSTEM_SPEC_QUESTIONS: Record<string, string[]> = {
  'Room Alert': [
    'Type of Sensors (Temperature, Humidity, Motion)',
    'Coverage Zones',
    'Alert/Notification Method (SMS, Email, Dashboard)',
  ],
  'EAS System': [
    'Type of Tags (RF, AM, EM)',
    'Number of Detection Gates',
    'Coverage Area (Entrances/Exits)',
    'Sensitivity Level',
  ],
  'PABX / Paging': [
    'Number of Extensions',
    'Paging Zones',
    'System Capacity (Lines/Trunks)',
    'Integration with VoIP?',
  ],
  M2M: [
    'Device Type (Modem, Gateway, IoT Sensor)',
    'Connectivity (LAN, GSM, Wi-Fi)',
    'Data Transmission Frequency',
    'Security Requirements',
  ],
  'POS System': [
    'Number of Terminals',
    'Connectivity (LAN/Wi-Fi)',
    'Transaction Volume Capacity',
    'Integration with Inventory/ERP?',
  ],
  'X-Ray / Metal Detector': [
    'Type (Walk-through, Handheld, Conveyor X-ray)',
    'Detection Sensitivity Levels',
    'Throughput Capacity (people/items per hour)',
    'Power Requirements',
  ],
  FDAS: [
    'Number of Detectors (Smoke, Heat, Flame)',
    'Control Panel Specs',
    'Alarm Zones',
    'Integration with Sprinkler/Fire Suppression',
  ],
  'Fire Pro': [
    'Type of Fire Suppression (Gas, Foam, Water Mist)',
    'Coverage Area (sq. meters)',
    'Number of Cylinders/Modules',
    'Refill/Maintenance Requirements',
  ],
  'Parking Barrier': [
    'Type (Automatic, Manual, Hydraulic)',
    'Number of Lanes',
    'Integration with Ticketing/Access System',
    'Cycle Speed (seconds per operation)',
  ],
};

interface Props {
  /** Receives current draft so it can be restored when returning. */
  onBack: (draft?: OtherSurveyData) => void;
  onComplete: (data: OtherSurveyData) => void;
  onNewFloorPlan?: () => void;
  initialData?: OtherSurveyData;
  projectBuildingInfo?: {
    type: string;
    otherType?: string;
    floors: number;
    isNew: boolean;
  };
}

/**
 * OTHER SURVEY COMPONENT
 * Handles generic or custom technological audits.
 */
const OtherSurvey: React.FC<Props> = ({ onBack, onComplete, onNewFloorPlan, initialData, projectBuildingInfo }) => {
  const [step, setStep] = useState<'BUILDING' | 'DETAILS'>('BUILDING');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<OtherSurveyData>({
    buildingInfo: { type: '', otherType: '', floors: 0, isNew: undefined as any },
    siteImage: undefined,
    systemCategory: '',
    otherSystemCategory: '',
    scopeOfWork: '',
    otherScopeOfWork: '',
    coverageArea: '',
    otherCoverageArea: '',
    systemSpecificAnswers: {},
    serviceDetails: '',
    intercomEstimationSurveyApplied: false,
    technicalSpecs: {
      intercom: { ...DEFAULT_INTERCOM },
      turnstile: {
        ...DEFAULT_TURNSTILE,
        integrateWithAccessControl: undefined,
        emergencyMode: undefined,
        fireAlarmIntegration: undefined,
        antiTailgating: undefined,
        ledIndicatorsAlarm: undefined
      },
      boomBarrier: {
        ...DEFAULT_BOOM_BARRIER,
        integrateWithAccessControl: undefined,
        loopDetectorRequired: undefined,
        emergencyManualRelease: undefined,
        reflectiveOrLed: undefined,
        alarmBuzzer: undefined
      }
    },
    ceilingType: '',
    otherCeilingType: '',
  });

  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [isListeningBuilding, setIsListeningBuilding] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [intercomModalForm, setIntercomModalForm] = useState(INITIAL_INTERCOM_SERVICE_FORM);
  const prevIntercomSelectedRef = useRef(false);
  const hasSharedBuildingInfo =
    !!projectBuildingInfo?.type &&
    (projectBuildingInfo.type !== 'Other' || !!projectBuildingInfo.otherType?.trim()) &&
    Number(projectBuildingInfo.floors) > 0;
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }
  }, [initialData, hasSharedBuildingInfo, projectBuildingInfo]);

  /**
   * SCROLL RESET EFFECT
   * Logic: Resets the container scroll position whenever the step changes.
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [step]);

  /**
   * COMPUTED: isStep1Complete
   */
  const isStep1Complete = !!data.buildingInfo.type && (data.buildingInfo.type !== 'Other' || !!data.buildingInfo.otherType?.trim());
  const isIntercomSelected =
    data.systemCategory === 'Intercom' ||
    (data.systemCategory === 'Others (Specify)' && data.otherSystemCategory?.trim().toLowerCase() === 'intercom');

  useEffect(() => {
    if (!isIntercomSelected) {
      prevIntercomSelectedRef.current = false;
      return;
    }
    if (!prevIntercomSelectedRef.current) {
      setIntercomModalForm(otherSurveyToIntercomForm(data));
    }
    prevIntercomSelectedRef.current = true;
  }, [isIntercomSelected, data]);

  /** Align intercom form site photo with the main survey photo field. */
  useEffect(() => {
    if (!isIntercomSelected || step !== 'DETAILS') return;
    setIntercomModalForm((prev) => {
      const next = data.siteImage || null;
      if (prev.sitePhotoDataUrl === next) return prev;
      return { ...prev, sitePhotoDataUrl: next };
    });
  }, [data.siteImage, isIntercomSelected, step]);

  const isTurnstileSelected =
    data.systemCategory === 'Turnstile' ||
    (data.systemCategory === 'Others (Specify)' && data.otherSystemCategory?.trim().toLowerCase() === 'turnstile');
  const isBoomBarrierSelected =
    data.systemCategory === 'Boom Barrier' ||
    (data.systemCategory === 'Others (Specify)' && data.otherSystemCategory?.trim().toLowerCase() === 'boom barrier');
  const selectedSystemForSpecs = data.systemCategory === 'Others (Specify)' ? (data.otherSystemCategory || '').trim() : (data.systemCategory || '');
  const dynamicSystemQuestions = SYSTEM_SPEC_QUESTIONS[selectedSystemForSpecs] || [];
  const hasDynamicSystemQuestions = dynamicSystemQuestions.length > 0;
  const dynamicSpecsComplete =
    !hasDynamicSystemQuestions ||
    dynamicSystemQuestions.every((_, idx) => (data.systemSpecificAnswers?.[`${selectedSystemForSpecs}::${idx}`] || '').trim().length > 0);
  const turnstileSpecs = data.technicalSpecs?.turnstile;
  const boomBarrierSpecs = data.technicalSpecs?.boomBarrier;
  const turnstileMandatoryComplete = (() => {
    const t = turnstileSpecs;
    if (!t) return false;
    if (!t.turnstileType || !t.installation || (t.numberOfUnits ?? 0) < 1) return false;
    if (t.integrateWithAccessControl === undefined) return false;
    if (t.integrateWithAccessControl === true) {
      if (!t.accessControlTypes?.length || !t.requiredDirection) return false;
    }
    if (!t.installationArea || !t.floorCondition) return false;
    if ((t.widthM ?? 0) <= 0 || (t.lengthM ?? 0) <= 0) return false;
    if (!t.powerSupply) return false;
    if (t.powerSupply === 'Others (specify)' && !t.powerOtherSpecify?.trim()) return false;
    if ((t.distanceFromPowerM ?? 0) <= 0) return false;
    if (!t.networkRequirement) return false;
    if (
      t.emergencyMode === undefined ||
      t.fireAlarmIntegration === undefined ||
      t.antiTailgating === undefined ||
      t.ledIndicatorsAlarm === undefined
    )
      return false;
    if (!t.exposure) return false;
    if (t.exposure === 'Outdoor' && !(t.weatherConditions?.length ?? 0)) return false;
    if (!t.footTraffic) return false;
    if (!t.specialInstructions?.trim()) return false;
    return true;
  })();
  /** Intercom flow uses the animated modal; completion is tracked when the user saves from that survey. */
  const intercomMandatoryComplete = isIntercomModalFormValid(intercomModalForm);
  const boomBarrierMandatoryComplete = (() => {
    const b = boomBarrierSpecs;
    if (!b) return false;
    if (!b.barrierType || !b.installationType || (b.numberOfUnits ?? 0) < 1) return false;
    if ((b.armLengthM ?? 0) <= 0 || !b.armType || !b.openingDirection || !b.speedRequirement) return false;
    if (b.integrateWithAccessControl === undefined) return false;
    if (b.integrateWithAccessControl === true && !(b.accessControlTypes?.length ?? 0)) return false;
    if (b.loopDetectorRequired === undefined) return false;
    if (!b.installationArea || (b.roadWidthM ?? 0) <= 0 || !b.surfaceCondition || !b.mountingSurfaceAvailability) return false;
    if (!b.powerSupply) return false;
    if (b.powerSupply === 'Others (specify)' && !b.powerOtherSpecify?.trim()) return false;
    if ((b.distanceFromPowerM ?? 0) <= 0 || !b.networkRequirement) return false;
    if (!b.safetySensorsRequired) return false;
    if (b.emergencyManualRelease === undefined || b.reflectiveOrLed === undefined || b.alarmBuzzer === undefined) return false;
    if (!b.installationExposure) return false;
    if (b.installationExposure === 'Outdoor' && !(b.outdoorExposure?.length ?? 0)) return false;
    if (!b.windCondition) return false;
    if (!b.specialInstructions?.trim()) return false;
    return true;
  })();

  const updateTurnstileSpecs = (patch: Partial<NonNullable<OtherSurveyData['technicalSpecs']>['turnstile']>) => {
    setData((prev) => {
      const currentTurnstile = prev.technicalSpecs?.turnstile || {
        ...DEFAULT_TURNSTILE,
        integrateWithAccessControl: undefined,
        emergencyMode: undefined,
        fireAlarmIntegration: undefined,
        antiTailgating: undefined,
        ledIndicatorsAlarm: undefined
      };
      return {
        ...prev,
        technicalSpecs: {
          ...(prev.technicalSpecs || {}),
          turnstile: {
            ...currentTurnstile,
            ...patch
          }
        }
      };
    });
  };

  const updateBoomBarrierSpecs = (patch: Partial<NonNullable<OtherSurveyData['technicalSpecs']>['boomBarrier']>) => {
    setData((prev) => {
      const currentBoomBarrier = prev.technicalSpecs?.boomBarrier || {
        ...DEFAULT_BOOM_BARRIER,
        integrateWithAccessControl: undefined,
        loopDetectorRequired: undefined,
        emergencyManualRelease: undefined,
        reflectiveOrLed: undefined,
        alarmBuzzer: undefined
      };
      return {
        ...prev,
        technicalSpecs: {
          ...(prev.technicalSpecs || {}),
          boomBarrier: {
            ...currentBoomBarrier,
            ...patch
          }
        }
      };
    });
  };

  const handleHeaderBack = () => {
    if (step === 'DETAILS') {
      if (hasSharedBuildingInfo) onBack(data);
      else setStep('BUILDING');
    }
    else onBack(data);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({ ...prev, siteImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startVoiceInput = (field: string, setter: (val: any) => void, isNumeric = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setActiveVoiceField(field);
    recognition.onend = () => setActiveVoiceField(null);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (isNumeric) {
        const num = processNumeric(transcript);
        if (num !== null) setter(num);
      } else {
        setter(processTitleCase(transcript));
      }
    };
    recognition.start();
  };

  const startVoiceBuilding = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListeningBuilding(true);
    recognition.onend = () => setIsListeningBuilding(false);
    recognition.onerror = () => setIsListeningBuilding(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const match = BUILDING_TYPES.find(t => transcript.includes(t.toLowerCase()));
      if (match) {
        setData(prev => ({ ...prev, buildingInfo: { ...prev.buildingInfo, type: match } }));
      }
    };
    recognition.start();
  };

  return (
    <>
    <SurveyLayout
      title="Other Survey"
      contentRef={scrollRef}
    >
        {step === 'BUILDING' && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-6 mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-blue-900">Building Information</h3>
                <button 
                  onClick={startVoiceBuilding}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isListeningBuilding ? 'text-red-500 animate-pulse bg-red-50 shadow-inner' : 'text-blue-900 bg-slate-50'}`}
                  aria-label="Voice input building info"
                >
                  <i className="fas fa-microphone text-lg"></i>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {BUILDING_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setData(prev => ({...prev, buildingInfo: {...prev.buildingInfo, type}}))}
                    className={`py-4 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border-2 ${
                      data.buildingInfo.type === type 
                        ? 'bg-blue-900 text-white border-blue-900 shadow-md' 
                        : 'bg-slate-50 border-slate-50 text-slate-700 hover:border-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {data.buildingInfo.type === 'Other' && (
                <div className="animate-fade-in pt-2 text-left">
                  <label className="block text-[10px] uppercase font-bold text-[#A0B0C0] mb-1 ml-1">Specify Building Type</label>
                  <div className="relative">
                    <input 
                      className={`w-full bg-slate-50 border-2 p-3 pr-10 rounded-xl text-slate-900 focus:outline-none transition font-bold text-[10px] ${showErrors && data.buildingInfo.type === 'Other' && !data.buildingInfo.otherType?.trim() ? 'border-red-500' : 'border-slate-100 focus:border-blue-900'}`}
                      value={data.buildingInfo.otherType || ''}
                      autoComplete="off"
                      onChange={(e) => setData(prev => ({...prev, buildingInfo: {...prev.buildingInfo, otherType: e.target.value}}))}
                    />
                    <button 
                      type="button"
                      onClick={() => startVoiceInput('otherBuildingType', (val) => setData(prev => ({...prev, buildingInfo: {...prev.buildingInfo, otherType: val}})))}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'otherBuildingType' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0] hover:text-blue-900'}`}
                    >
                      <i className="fas fa-microphone"></i>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-100 text-left grid grid-cols-1 md:grid-cols-2 md:gap-6 md:space-y-0">
                <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4 md:col-span-2">Site Specifications</h4>
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 ml-1">Status</label>
                 <div className="grid grid-cols-2 gap-2">
                   <button
                     onClick={() => setData(prev => ({...prev, buildingInfo: {...prev.buildingInfo, isNew: true}}))}
                     className={`py-4 rounded-xl text-[10px] font-black border-2 transition ${data.buildingInfo.isNew === true ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                   >
                     NEW BUILD
                   </button>
                   <button
                     onClick={() => setData(prev => ({...prev, buildingInfo: {...prev.buildingInfo, isNew: false}}))}
                     className={`py-4 rounded-xl text-[10px] font-black border-2 transition ${data.buildingInfo.isNew === false ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                   >
                     RETROFIT
                   </button>
                 </div>
               </div>

               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 ml-1">Floors</label>
                 <div className="relative">
                   <input 
                     type="number" step="any" min="0"
                     className="w-full py-3 bg-slate-50 border-2 border-slate-100 px-4 pr-10 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-900"
                     value={data.buildingInfo.floors === 0 ? '' : data.buildingInfo.floors}
                     onChange={e => {
                       const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                       setData(prev => ({...prev, buildingInfo: {...prev.buildingInfo, floors: isNaN(val) ? 0 : Math.max(0, val)}}));
                     }}
                   />
                   <button 
                     type="button"
                     onClick={() => startVoiceInput('floors', (val) => setData(prev => ({...prev, buildingInfo: {...prev.buildingInfo, floors: val}})), true)}
                     className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'floors' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0] hover:text-blue-900'}`}
                   >
                     <i className="fas fa-microphone"></i>
                   </button>
                 </div>
               </div>
            </div>
            
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4 text-left">4.3 Floor Plan & Measurements</h4>
                <FloorPlanManager 
                  initialData={data.measurements}
                  onChange={(m) =>
                    setData(prev => {
                      const hasUploadedPlan =
                        m?.method === 'PLAN_UPLOAD' &&
                        (((m?.planImages?.length ?? 0) > 0) || !!m?.planImage);
                      if (!hasUploadedPlan) return { ...prev, measurements: m };
                      const inferredFloors = Math.max(1, m?.planImages?.length || (m?.planImage ? 1 : 0));
                      return {
                        ...prev,
                        measurements: m,
                        buildingInfo: {
                          ...prev.buildingInfo,
                          type: prev.buildingInfo.type || 'Office',
                          floors: Number(prev.buildingInfo.floors) > 0 ? prev.buildingInfo.floors : inferredFloors,
                          isNew: prev.buildingInfo.isNew === undefined ? false : prev.buildingInfo.isNew,
                        },
                      };
                    })
                  }
                  onNewUpload={onNewFloorPlan}
                  activeVoiceField={activeVoiceField}
                  startVoiceInput={startVoiceInput}
                />
              </div>
            </div>
            
            <div className="pb-10">
              <button 
                onClick={() => {
                  if (!isStep1Complete) {
                    setShowErrors(true);
                  } else {
                    setStep('DETAILS');
                  }
                }}
                className={`w-full py-6 font-black rounded-xl uppercase tracking-widest transition text-[10px] ${isStep1Complete ? 'bg-blue-900 text-white shadow-lg active:scale-95' : 'bg-slate-200 text-slate-400 shadow-none'}`}
              >
                NEXT: SERVICE DETAILS
              </button>
              {showErrors && !isStep1Complete && (
                <p className="text-[10px] text-red-500 font-black text-center mt-3 uppercase tracking-widest animate-pulse">
                  Complete building specifications to proceed
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'DETAILS' && (
          <div className="animate-fade-in space-y-6 pb-12">
            <div className="sticky top-0 z-20 bg-white">
              <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight border-l-4 border-amber-500 pl-3 text-left">
                Service Details
              </h3>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-[2rem] space-y-8 shadow-none">
              {/* SITE REFERENCE PHOTO SECTION */}
              <div className="text-left">
                <label className="text-[10px] font-black text-black uppercase ml-1 tracking-widest">Site Reference Photo</label>
                <div className="mt-2">
                  {data.siteImage ? (
                    <div className="relative group">
                      <img src={data.siteImage} className="w-full aspect-video object-cover rounded-2xl border-2 border-slate-100 shadow-sm max-h-[140px]" alt="Site Reference" />
                      <button 
                        onClick={() => setData(prev => ({ ...prev, siteImage: undefined }))}
                        className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-video max-h-[140px] border border-dashed border-[#A0B0C0] rounded-2xl cursor-pointer hover:bg-slate-50 transition bg-white text-black shadow-inner">
                      <i className="fas fa-camera text-3xl mb-2"></i>
                      <span className="text-[10px] font-black uppercase tracking-tight">Capture / Upload Photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              </div>

              {/* SYSTEM CATEGORY SECTION */}
              <div className="text-left space-y-3 pt-4 border-t border-[#A0B0C0]/35">
                <label className="text-[10px] font-black text-black uppercase ml-1 block tracking-widest">System Category</label>
                <select
                  className="w-full bg-white border border-[#A0B0C0] p-3 rounded-2xl text-slate-900 font-bold text-xs uppercase focus:border-blue-900 outline-none"
                  value={data.systemCategory || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setData((prev) => {
                      const stillIntercom =
                        v === 'Intercom' ||
                        (v === 'Others (Specify)' && prev.otherSystemCategory?.trim().toLowerCase() === 'intercom');
                      return {
                        ...prev,
                        systemCategory: v,
                        otherSystemCategory: v === 'Others (Specify)' ? prev.otherSystemCategory : '',
                        intercomEstimationSurveyApplied: stillIntercom ? prev.intercomEstimationSurveyApplied : false,
                      };
                    });
                  }}
                >
                  <option value="">SELECT SYSTEM CATEGORY</option>
                  {SYSTEM_CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.toUpperCase()}
                    </option>
                  ))}
                </select>

                {data.systemCategory === 'Others (Specify)' && (
                  <div className="animate-fade-in pt-2">
                    <label className="block text-[10px] uppercase font-bold text-black mb-1 ml-1">Specify System Category</label>
                    <div className="relative">
                      <input 
                        className={`w-full bg-white border p-3 pr-10 rounded-2xl text-slate-900 focus:outline-none transition font-bold text-xs ${showErrors && data.systemCategory === 'Others (Specify)' && !data.otherSystemCategory?.trim() ? 'border-red-500' : 'border-[#A0B0C0] focus:border-blue-900'}`}
                        value={data.otherSystemCategory || ''}
                        placeholder="Specify System Category"
                        onChange={(e) => {
                          const val = e.target.value;
                          setData((prev) => ({
                            ...prev,
                            otherSystemCategory: val,
                            intercomEstimationSurveyApplied:
                              prev.systemCategory === 'Others (Specify)' && val.trim().toLowerCase() === 'intercom'
                                ? prev.intercomEstimationSurveyApplied
                                : false,
                          }));
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => startVoiceInput('otherSystemCategory', (val) => setData(prev => ({...prev, otherSystemCategory: val})))}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'otherSystemCategory' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0] hover:text-blue-900'}`}
                      >
                        <i className="fas fa-microphone"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SCOPE OF WORK SECTION */}
              {!isIntercomSelected && (
              <div className="text-left space-y-3 pt-4 border-t border-[#A0B0C0]/35">
                <label className="text-[10px] font-black text-black uppercase ml-1 block tracking-widest">Scope of Work</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Supply & Install', 'Maintenance', 'Upgrade / Expansion', 'Others (Specify)'].map(scope => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setData(prev => ({...prev, scopeOfWork: scope}))}
                      className={`h-[52px] px-2 rounded-2xl font-black border transition uppercase tracking-tight flex items-center justify-center text-center leading-tight text-[8.5px] ${data.scopeOfWork === scope ? 'bg-blue-900 text-white border-blue-900 shadow-sm' : 'bg-white border-[#A0B0C0] text-black'}`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>

                {data.scopeOfWork === 'Others (Specify)' && (
                  <div className="animate-fade-in pt-2">
                    <label className="block text-[10px] uppercase font-bold text-black mb-1 ml-1">Specify Scope of Work</label>
                    <div className="relative">
                      <input 
                        className={`w-full bg-white border p-3 pr-10 rounded-2xl text-slate-900 focus:outline-none transition font-bold text-xs ${showErrors && data.scopeOfWork === 'Others (Specify)' && !data.otherScopeOfWork?.trim() ? 'border-red-500' : 'border-[#A0B0C0] focus:border-blue-900'}`}
                        value={data.otherScopeOfWork || ''}
                        placeholder="Specify Scope of Work"
                        onChange={(e) => setData(prev => ({...prev, otherScopeOfWork: e.target.value}))}
                      />
                      <button 
                        type="button"
                        onClick={() => startVoiceInput('otherScopeOfWork', (val) => setData(prev => ({...prev, otherScopeOfWork: val})))}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'otherScopeOfWork' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0] hover:text-blue-900'}`}
                      >
                        <i className="fas fa-microphone"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* COVERAGE AREA SECTION */}
              {!isIntercomSelected && (
              <div className="text-left space-y-3 pt-4 border-t border-[#A0B0C0]/35">
                <label className="text-[10px] font-black text-black uppercase ml-1 block tracking-widest">Coverage Area</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Single Room', 'Multiple Room', 'Entire Floor', 'Entire Building', 'Outdoor', 'Other'].map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setData(prev => ({...prev, coverageArea: area}))}
                      className={`h-[52px] px-1 rounded-2xl font-black border transition uppercase tracking-tight flex items-center justify-center text-center leading-tight text-[8.5px] ${data.coverageArea === area ? 'bg-blue-900 text-white border-blue-900 shadow-sm' : 'bg-white border-[#A0B0C0] text-black'}`}
                    >
                      {area}
                    </button>
                  ))}
                </div>

                {data.coverageArea === 'Other' && (
                  <div className="animate-fade-in pt-2">
                    <label className="block text-[10px] uppercase font-bold text-[#A0B0C0] mb-1 ml-1">Specify Coverage Area</label>
                    <div className="relative">
                      <input 
                        className={`w-full bg-white border p-3 pr-10 rounded-2xl text-slate-900 focus:outline-none transition font-bold text-xs ${showErrors && data.coverageArea === 'Other' && !data.otherCoverageArea?.trim() ? 'border-red-500' : 'border-[#A0B0C0] focus:border-blue-900'}`}
                        value={data.otherCoverageArea || ''}
                        placeholder="Specify Coverage Area"
                        onChange={(e) => setData(prev => ({...prev, otherCoverageArea: e.target.value}))}
                      />
                      <button 
                        type="button"
                        onClick={() => startVoiceInput('otherCoverageArea', (val) => setData(prev => ({...prev, otherCoverageArea: val})))}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'otherCoverageArea' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0] hover:text-blue-900'}`}
                      >
                        <i className="fas fa-microphone"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {isIntercomSelected && (
                <div className="text-left pt-4 border-t border-[#A0B0C0]/35 space-y-4">
                  <label className="text-[10px] font-black text-black uppercase ml-1 block mb-1.5 tracking-widest">Service estimation survey</label>
                  <div className="space-y-6 rounded-2xl bg-white p-4 md:p-5 shadow-none">
                    <IntercomServiceSurveyFormBody
                      layout="inline"
                      showSitePhotoSection={false}
                      form={intercomModalForm}
                      setForm={setIntercomModalForm}
                      bottomPaddingClass="pb-2"
                    />
                  </div>
                </div>
              )}

              {!isIntercomSelected && !isTurnstileSelected && !isBoomBarrierSelected && hasDynamicSystemQuestions && (
                <div className="text-left pt-3 border-t border-[#A0B0C0]/35 space-y-3">
                  <label className="text-[10px] font-black text-black uppercase ml-1 block mb-1.5 tracking-widest">
                    System-Specific Questions ({selectedSystemForSpecs})
                  </label>
                  {dynamicSystemQuestions.map((question, idx) => {
                    const key = `${selectedSystemForSpecs}::${idx}`;
                    const answer = data.systemSpecificAnswers?.[key] || '';
                    return (
                      <div key={key} className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-black mb-1 ml-1">{question}</label>
                        <div className="relative">
                          <textarea
                            className="w-full bg-white border border-[#A0B0C0] p-3 pr-10 rounded-2xl text-slate-900 focus:outline-none transition font-bold text-xs min-h-[72px] resize-none focus:border-blue-900"
                            value={answer}
                            onChange={(e) =>
                              setData((prev) => ({
                                ...prev,
                                systemSpecificAnswers: {
                                  ...(prev.systemSpecificAnswers || {}),
                                  [key]: e.target.value,
                                },
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              startVoiceInput(`systemSpecific_${idx}`, (val) =>
                                setData((prev) => ({
                                  ...prev,
                                  systemSpecificAnswers: {
                                    ...(prev.systemSpecificAnswers || {}),
                                    [key]: val,
                                  },
                                }))
                              )
                            }
                            className={`absolute right-3 top-3 transition ${
                              activeVoiceField === `systemSpecific_${idx}` ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'
                            }`}
                          >
                            <i className="fas fa-microphone"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isIntercomSelected && !isTurnstileSelected && !isBoomBarrierSelected && !hasDynamicSystemQuestions && (
                <div className="text-left pt-3 border-t border-[#A0B0C0]/35">
                  <label className="text-[10px] font-black text-black uppercase ml-1 block mb-1.5 tracking-widest">Description of the Device Required</label>
                  <div className="relative">
                    <textarea
                      className="w-full bg-white border border-[#A0B0C0] p-4 pr-12 rounded-2xl text-slate-900 font-bold focus:border-blue-900 outline-none min-h-[160px] resize-none"
                      value={data.serviceDetails}
                      onChange={e => setData(prev => ({...prev, serviceDetails: e.target.value}))}
                    />
                    <button
                      type="button"
                      onClick={() => startVoiceInput('serviceDetails', (val) => setData(prev => ({...prev, serviceDetails: val})))}
                      className={`absolute right-4 top-4 transition ${activeVoiceField === 'serviceDetails' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0]'}`}
                    >
                      <i className="fas fa-microphone text-xl"></i>
                    </button>
                  </div>
                </div>
              )}

              {isTurnstileSelected && (
                <TurnstileSpecsForm
                  specs={turnstileSpecs || DEFAULT_TURNSTILE}
                  onChange={updateTurnstileSpecs}
                  startVoiceInput={startVoiceInput}
                  activeVoiceField={activeVoiceField}
                />
              )}

              {isBoomBarrierSelected && (
                <BoomBarrierSpecsForm
                  specs={boomBarrierSpecs || DEFAULT_BOOM_BARRIER}
                  onChange={updateBoomBarrierSpecs}
                  startVoiceInput={startVoiceInput}
                  activeVoiceField={activeVoiceField}
                />
              )}

              {!isIntercomSelected && (
              <div className="text-left pt-4 border-t border-[#A0B0C0]/35">
                <label className="text-[10px] font-black text-black uppercase ml-1 block mb-1.5 tracking-widest">Cabling Type Required</label>
                <div className="grid grid-cols-2 gap-2">
                  {['CEILING', 'TRUNKING', 'OPEN CABLE', 'OTHER'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setData(prev => ({...prev, ceilingType: type}))}
                      className={`h-[52px] px-1 rounded-2xl font-black border transition uppercase tracking-tight flex items-center justify-center text-center leading-tight text-[8.5px] ${data.ceilingType === type ? 'bg-blue-900 text-white border-blue-900 shadow-sm' : 'bg-white border-[#A0B0C0] text-black'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {data.ceilingType === 'OTHER' && (
                  <div className="animate-fade-in pt-2">
                    <label className="block text-[10px] uppercase font-bold text-black mb-1 ml-1">Specify Cabling Type</label>
                    <div className="relative">
                      <input 
                        className={`w-full bg-white border p-3 pr-10 rounded-2xl text-slate-900 focus:outline-none transition font-bold text-xs ${showErrors && data.ceilingType === 'OTHER' && !data.otherCeilingType?.trim() ? 'border-red-500' : 'border-[#A0B0C0] focus:border-blue-900'}`}
                        value={data.otherCeilingType || ''}
                        placeholder="Specify Ceiling Type"
                        onChange={(e) => setData(prev => ({...prev, otherCeilingType: e.target.value}))}
                      />
                      <button 
                        type="button"
                        onClick={() => startVoiceInput('otherCeilingType', (val) => setData(prev => ({...prev, otherCeilingType: val})))}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'otherCeilingType' ? 'text-red-500 animate-pulse' : 'text-[#A0B0C0] hover:text-blue-900'}`}
                      >
                        <i className="fas fa-microphone"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

            </div>

            <div className="pt-10 space-y-3 pb-10">
              <button 
                disabled={
                  isBoomBarrierSelected
                    ? !boomBarrierMandatoryComplete
                    : isTurnstileSelected
                    ? !turnstileMandatoryComplete
                    : isIntercomSelected
                      ? !intercomMandatoryComplete
                      : hasDynamicSystemQuestions
                      ? !dynamicSpecsComplete
                      : !data.serviceDetails.trim()
                }
                onClick={() => {
                  if (isBoomBarrierSelected && boomBarrierSpecs && boomBarrierMandatoryComplete) {
                    const b = boomBarrierSpecs;
                    const access =
                      b.integrateWithAccessControl
                        ? ` Access control: ${(b.accessControlTypes || []).join(', ')}.`
                        : ' Access control: No.';
                    const exposure =
                      b.installationExposure === 'Outdoor'
                        ? ` Exposure: ${(b.outdoorExposure || []).join(', ')}.`
                        : '';
                    const powerExtra =
                      b.powerSupply === 'Others (specify)' && b.powerOtherSpecify?.trim()
                        ? ` (${b.powerOtherSpecify.trim()})`
                        : '';
                    const brand = b.preferredBrandSpecs?.trim()
                      ? ` Preferred brand/specs: ${b.preferredBrandSpecs.trim()}.`
                      : '';
                    const generatedServiceDetails =
                      `Boom barrier: ${b.barrierType}, ${b.numberOfUnits} unit(s), installation ${b.installationType}. ` +
                      `Arm length ${b.armLengthM}m, ${b.armType}, opening ${b.openingDirection}, speed ${b.speedRequirement}.` +
                      `${access} Loop detector required: ${b.loopDetectorRequired ? 'Yes' : 'No'}. ` +
                      `Site: ${b.installationArea}, road width ${b.roadWidthM}m, surface ${b.surfaceCondition}, mounting ${b.mountingSurfaceAvailability}. ` +
                      `Power: ${b.powerSupply}${powerExtra}, distance ${b.distanceFromPowerM}m. Network: ${b.networkRequirement}. ` +
                      `Safety sensors: ${b.safetySensorsRequired}. Emergency release: ${b.emergencyManualRelease ? 'Yes' : 'No'}. ` +
                      `Reflective/LED: ${b.reflectiveOrLed ? 'Yes' : 'No'}. Alarm/Buzzer: ${b.alarmBuzzer ? 'Yes' : 'No'}. ` +
                      `Environment: ${b.installationExposure}.${exposure} Wind: ${b.windCondition}. ` +
                      `Notes: ${b.specialInstructions.trim()}.${brand}`;
                    onComplete({ ...data, serviceDetails: generatedServiceDetails });
                    return;
                  }
                  if (isTurnstileSelected && turnstileSpecs && turnstileMandatoryComplete) {
                    const t = turnstileSpecs;
                    const ac =
                      t.integrateWithAccessControl === true
                        ? `Types: ${(t.accessControlTypes || []).join(', ') || 'N/A'}. Direction: ${t.requiredDirection}.`
                        : '';
                    const weather =
                      t.exposure === 'Outdoor' ? ` Weather: ${(t.weatherConditions || []).join(', ')}.` : '';
                    const powerExtra = t.powerSupply === 'Others (specify)' && t.powerOtherSpecify?.trim() ? ` (${t.powerOtherSpecify.trim()})` : '';
                    const brand = t.preferredBrandSpecs?.trim() ? ` Preferred brand/specs: ${t.preferredBrandSpecs.trim()}.` : '';
                    const generatedServiceDetails = `Turnstile: ${t.turnstileType}, ${t.numberOfUnits} unit(s), ${t.installation} installation. Access control integration: ${t.integrateWithAccessControl ? 'Yes' : 'No'}. ${ac} Site: ${t.installationArea}, floor: ${t.floorCondition}, available space ${t.widthM}m x ${t.lengthM}m. Power: ${t.powerSupply}${powerExtra}, ${t.distanceFromPowerM}m from source. Network: ${t.networkRequirement}. Safety: emergency mode ${t.emergencyMode ? 'Yes' : 'No'}, fire alarm ${t.fireAlarmIntegration ? 'Yes' : 'No'}, anti-tailgating ${t.antiTailgating ? 'Yes' : 'No'}, LED/alarm ${t.ledIndicatorsAlarm ? 'Yes' : 'No'}. Environment: ${t.exposure}.${weather} Foot traffic: ${t.footTraffic}. Notes: ${t.specialInstructions.trim()}.${brand}`;
                    onComplete({ ...data, serviceDetails: generatedServiceDetails });
                    return;
                  }
                  if (isIntercomSelected && isIntercomModalFormValid(intercomModalForm)) {
                    const merged = applyIntercomFormToOtherSurvey(data, intercomModalForm);
                    const i = merged.technicalSpecs?.intercom;
                    if (!i) return;
                    const internet = i.typeOfIntercom === 'IP-based' ? ` Stable internet: ${i.stableInternetAvailable ? 'Yes' : 'No'}.` : '';
                    const obstruction = i.obstructionsPresent ? ` Obstructions: ${i.obstructionDescription}.` : ' Obstructions: No.';
                    const areaLabels = i.installationAreaLabels?.length ? i.installationAreaLabels : i.installationAreas;
                    const laborScopes = (i.laborScopeOfWork && i.laborScopeOfWork.length ? i.laborScopeOfWork : ['Installation']).join(', ');
                    const generatedServiceDetails =
                      `Intercom: ${i.typeOfIntercom}, masters ${i.numberOfMasterStations}, substations ${i.numberOfSubstations}, range ${i.communicationRangeM}m. ` +
                      `Connectivity: ${i.connectivityType}, power: ${i.powerRequirement}.${internet} ` +
                      `Site: areas ${areaLabels.join(', ')}, distance ${i.distanceBetweenDevicesM}m, cable path ${i.cablePathAvailability}, mounting ${i.mountingType}, environment ${i.environmentalCondition}.${obstruction} ` +
                      `Materials: master ${i.materialMasterUnitQty}, sub ${i.materialSubstationsQty}, cable ${i.materialCableLengthM}m, PVC ${i.materialPvcConduitsM}m, JB ${i.materialJunctionBoxesQty}, accessories ${i.materialAccessories || 'N/A'}. ` +
                      `Labor: ${i.installationDuration}, techs ${i.numberOfTechnicians}, scope ${laborScopes}. ` +
                      `Observations: ${i.observations}. Recommendations: ${i.recommendations}.`;
                    onComplete({ ...merged, serviceDetails: generatedServiceDetails });
                    return;
                  }
                  if (hasDynamicSystemQuestions) {
                    const generatedServiceDetails = [
                      `${selectedSystemForSpecs} survey details:`,
                      ...dynamicSystemQuestions.map((q, idx) => {
                        const key = `${selectedSystemForSpecs}::${idx}`;
                        const value = data.systemSpecificAnswers?.[key] || '';
                        return `${q}: ${value}`;
                      }),
                    ].join(' ');
                    onComplete({ ...data, serviceDetails: generatedServiceDetails });
                    return;
                  }
                  onComplete({ ...data, serviceDetails: data.serviceDetails });
                }}
                className={`w-full py-4 font-black rounded-xl shadow-xl uppercase tracking-widest active:scale-95 transition ${
                  isBoomBarrierSelected
                    ? boomBarrierMandatoryComplete
                      ? 'bg-amber-500 text-blue-900'
                      : 'bg-slate-200 text-slate-400'
                    : isTurnstileSelected
                    ? turnstileMandatoryComplete
                      ? 'bg-amber-500 text-blue-900'
                      : 'bg-slate-200 text-slate-400'
                    : isIntercomSelected
                      ? intercomMandatoryComplete
                        ? 'bg-amber-500 text-blue-900'
                        : 'bg-slate-200 text-slate-400'
                      : hasDynamicSystemQuestions
                      ? dynamicSpecsComplete
                        ? 'bg-amber-500 text-blue-900'
                        : 'bg-slate-200 text-slate-400'
                      : data.serviceDetails.trim()
                        ? 'bg-amber-500 text-blue-900'
                        : 'bg-slate-200 text-slate-400'
                }`}
              >
                GENERATE ESTIMATION
              </button>
              <button onClick={() => setStep('BUILDING')} className="w-full text-blue-600 font-bold py-2 uppercase text-xs tracking-widest text-center">Back to Building Info</button>
            </div>
          </div>
        )}
    </SurveyLayout>
    </>
  );
};

export default OtherSurvey;
