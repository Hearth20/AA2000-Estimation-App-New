import type { OtherSurveyData } from '../../types';
import type { IntercomServiceFormState } from './types';
import { INITIAL_INTERCOM_SERVICE_FORM } from './types';
import { computeEstimation, suggestCablingType } from './computeEstimation';

type IntercomSpec = NonNullable<OtherSurveyData['technicalSpecs']>['intercom'];

function workDaysToDuration(days: number): IntercomSpec['installationDuration'] {
  if (days <= 1) return '1 day';
  if (days <= 2) return '2 days';
  return '3+ days';
}

function mapIntercomType(form: IntercomServiceFormState): IntercomSpec['typeOfIntercom'] {
  if (form.intercomType === 'IP') return 'IP-based';
  if (form.intercomType === 'Audio') return 'Audio';
  if (form.intercomType === 'Video') return 'Video';
  return '';
}

function mapConnectivity(form: IntercomServiceFormState): IntercomSpec['connectivityType'] {
  const n = form.networkType;
  if (n === 'Wired' || n === 'Wireless' || n === 'IP') return n;
  return '';
}

function mapPower(form: IntercomServiceFormState): IntercomSpec['powerRequirement'] {
  const p = form.powerSource;
  if (p === '220V AC' || p === 'Low Voltage' || p === 'PoE' || p === 'Other') return p;
  return '';
}

function mapEnvironmental(form: IntercomServiceFormState): IntercomSpec['environmentalCondition'] {
  const e = form.environmental;
  if (e === 'Indoor' || e === 'Outdoor' || e === 'Mixed' || e === 'Dust' || e === 'Heat') return e;
  return '';
}

/** Build modal form state from Other Survey draft + stored intercom specs. */
export function otherSurveyToIntercomForm(data: OtherSurveyData): IntercomServiceFormState {
  const i = data.technicalSpecs?.intercom;
  if (!i) {
    return {
      ...INITIAL_INTERCOM_SERVICE_FORM,
      sitePhotoDataUrl: data.siteImage || null,
    };
  }

  const typeBack =
    i.typeOfIntercom === 'IP-based' ? 'IP' : i.typeOfIntercom === 'Audio' ? 'Audio' : i.typeOfIntercom === 'Video' ? 'Video' : '';

  const net = i.connectivityType === 'IP' ? 'IP' : i.connectivityType;

  let workDays = 1;
  if (i.installationDuration === '2 days') workDays = 2;
  if (i.installationDuration === '3+ days') workDays = 3;

  const mapScopeLabel = (s: string) => (s === 'Others (Specify)' ? 'Others' : s);

  const scopeFromSpecs = i.intercomScopeSelections?.length
    ? i.intercomScopeSelections.map(mapScopeLabel)
    : data.scopeOfWork
      ? [mapScopeLabel(data.scopeOfWork)]
      : [];

  const obstructionTypes =
    i.obstructionMaterialTypes?.length && i.obstructionsPresent
      ? [...i.obstructionMaterialTypes]
      : i.obstructionsPresent && i.obstructionDescription
        ? i.obstructionDescription.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

  return {
    ...INITIAL_INTERCOM_SERVICE_FORM,
    productLine: i.intercomProductBrand || '',
    productCode: i.intercomProductCode || '',
    priceTier: i.intercomPriceTier || '',
    scopeSelections: scopeFromSpecs.length ? scopeFromSpecs : INITIAL_INTERCOM_SERVICE_FORM.scopeSelections,
    otherScope: i.intercomOtherScope || data.otherScopeOfWork || '',
    buildingName: i.buildingSiteName || '',
    floorsCovered: i.floorsCovered || '',
    zonesRaw: i.zonesDepartments || '',
    coverageNotes: i.coverageNotesIntercom || '',
    intercomType: typeBack as IntercomServiceFormState['intercomType'],
    networkType: (net || '') as IntercomServiceFormState['networkType'],
    masterStations: i.numberOfMasterStations || 0,
    substations: i.numberOfSubstations || 0,
    commRangeM: i.communicationRangeM || 0,
    powerSource: (i.powerRequirement || '') as IntercomServiceFormState['powerSource'],
    installationAreas: i.installationAreaLabels?.length ? [...i.installationAreaLabels] : [],
    installationAreaDraft: '',
    distanceM: i.distanceBetweenDevicesM || 0,
    obstructionsPresent: i.obstructionsPresent ?? null,
    obstructionTypes,
    environmental: (i.environmentalCondition || '') as string,
    materialMaster: i.materialMasterUnitQty || 0,
    materialSub: i.materialSubstationsQty || 0,
    cableLengthM: i.materialCableLengthM || 0,
    pvcM: i.materialPvcConduitsM || 0,
    jbQty: i.materialJunctionBoxesQty || 0,
    accessories: i.materialAccessories || '',
    technicians: i.numberOfTechnicians || 0,
    workDays,
    observations: i.observations || '',
    recommendations: i.recommendations || '',
    sitePhotoDataUrl: data.siteImage || null,
  };
}

/** Apply completed modal form into Other Survey data + intercom technical specs. */
export function applyIntercomFormToOtherSurvey(data: OtherSurveyData, form: IntercomServiceFormState): OtherSurveyData {
  const breakdown = computeEstimation(form);
  const cablingSuggestion = suggestCablingType(form);

  const installationLabels = form.installationAreas.filter(Boolean);
  const legacyAreas: IntercomSpec['installationAreas'] =
    installationLabels.length > 0 ? (['Others'] as const) : [];

  const obstructionDesc =
    form.obstructionsPresent === true
      ? (form.obstructionTypes.length ? form.obstructionTypes.join(', ') : 'See site survey')
      : '';

  const intercom: IntercomSpec = {
    typeOfIntercom: mapIntercomType(form),
    numberOfMasterStations: form.masterStations,
    numberOfSubstations: form.substations,
    communicationRangeM: form.commRangeM,
    connectivityType: mapConnectivity(form),
    powerRequirement: mapPower(form),
    stableInternetAvailable: form.intercomType === 'IP' ? true : false,
    installationAreas: legacyAreas.length ? legacyAreas : ['Others'],
    installationAreaLabels: installationLabels.length ? installationLabels : undefined,
    distanceBetweenDevicesM: form.distanceM,
    cablePathAvailability: 'Needs Installation',
    mountingType: 'Wall',
    obstructionsPresent: form.obstructionsPresent === true,
    obstructionDescription: obstructionDesc,
    obstructionMaterialTypes: form.obstructionsPresent === true && form.obstructionTypes.length ? [...form.obstructionTypes] : undefined,
    environmentalCondition: mapEnvironmental(form) || 'Indoor',
    materialMasterUnitQty: form.materialMaster,
    materialSubstationsQty: form.materialSub,
    materialCableLengthM: form.cableLengthM,
    materialPvcConduitsM: form.pvcM,
    materialJunctionBoxesQty: form.jbQty,
    materialAccessories: form.accessories,
    installationDuration: workDaysToDuration(form.workDays),
    numberOfTechnicians: form.technicians,
    laborScopeOfWork: ['Installation'],
    materialCost: breakdown.deviceCost + breakdown.cablingCost,
    laborCost: breakdown.laborCost,
    observations: form.observations,
    recommendations: form.recommendations,
    intercomProductBrand: form.productLine || undefined,
    intercomProductCode: form.productCode?.trim() || undefined,
    intercomPriceTier: form.priceTier || undefined,
    intercomScopeSelections: form.scopeSelections.length ? [...form.scopeSelections] : undefined,
    intercomOtherScope: form.scopeSelections.includes('Others') ? form.otherScope : undefined,
    buildingSiteName: form.buildingName || undefined,
    floorsCovered: form.floorsCovered || undefined,
    zonesDepartments: form.zonesRaw || undefined,
    coverageNotesIntercom: form.coverageNotes || undefined,
  };

  return {
    ...data,
    intercomEstimationSurveyApplied: true,
    siteImage: form.sitePhotoDataUrl || data.siteImage,
    scopeOfWork: form.scopeSelections.includes('Others')
      ? 'Others (Specify)'
      : form.scopeSelections[0] || data.scopeOfWork || '',
    otherScopeOfWork: form.scopeSelections.includes('Others') ? form.otherScope : '',
    coverageArea: form.buildingName ? 'Entire Building' : data.coverageArea,
    otherCoverageArea: form.zonesRaw || data.otherCoverageArea,
    ceilingType: 'OTHER',
    otherCeilingType: cablingSuggestion,
    technicalSpecs: {
      ...data.technicalSpecs,
      intercom,
    },
  };
}

export function isIntercomModalFormValid(form: IntercomServiceFormState): boolean {
  if (!form.scopeSelections.length) return false;
  if (form.scopeSelections.includes('Others') && !form.otherScope.trim()) return false;
  if (!form.buildingName.trim()) return false;
  if (!form.intercomType || !form.networkType) return false;
  if (form.masterStations < 1 || form.substations < 1) return false;
  if (form.commRangeM <= 0) return false;
  if (!form.powerSource) return false;
  if (!form.installationAreas.length) return false;
  if (form.distanceM <= 0) return false;
  if (form.obstructionsPresent === null) return false;
  if (form.obstructionsPresent === true && !form.obstructionTypes.length) return false;
  if (!form.environmental) return false;
  if (form.materialMaster < 1 || form.materialSub < 1) return false;
  if (form.cableLengthM <= 0) return false;
  if (form.technicians < 1 || form.workDays <= 0) return false;
  if (!form.observations.trim() || !form.recommendations.trim()) return false;
  return true;
}
