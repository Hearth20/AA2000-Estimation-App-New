export type IntercomType = 'Audio' | 'Video' | 'IP' | '';
export type NetworkType = 'Wired' | 'Wireless' | 'IP' | '';
export type PowerSource = '220V AC' | 'Low Voltage' | 'PoE' | 'Other' | '';

export interface IntercomServiceFormState {
  productLine: string;
  /** Optional SKU / internal code */
  productCode: string;
  /** Commercial package tier */
  priceTier: string;
  scopeSelections: string[];
  otherScope: string;
  buildingName: string;
  floorsCovered: string;
  zonesRaw: string;
  coverageNotes: string;
  intercomType: IntercomType;
  networkType: NetworkType;
  masterStations: number;
  substations: number;
  commRangeM: number;
  powerSource: PowerSource;
  installationAreas: string[];
  installationAreaDraft: string;
  distanceM: number;
  obstructionsPresent: boolean | null;
  obstructionTypes: string[];
  environmental: string;
  materialMaster: number;
  materialSub: number;
  cableLengthM: number;
  pvcM: number;
  jbQty: number;
  accessories: string;
  technicians: number;
  workDays: number;
  observations: string;
  recommendations: string;
  sitePhotoDataUrl: string | null;
}

export const SCOPE_OPTIONS = ['Supply & Install', 'Maintenance', 'Upgrade / Expansion', 'Others'] as const;

export const INITIAL_INTERCOM_SERVICE_FORM: IntercomServiceFormState = {
  productLine: '',
  productCode: '',
  priceTier: '',
  scopeSelections: [],
  otherScope: '',
  buildingName: '',
  floorsCovered: '',
  zonesRaw: '',
  coverageNotes: '',
  intercomType: '',
  networkType: '',
  masterStations: 0,
  substations: 0,
  commRangeM: 0,
  powerSource: '',
  installationAreas: [],
  installationAreaDraft: '',
  distanceM: 0,
  obstructionsPresent: null,
  obstructionTypes: [],
  environmental: '',
  materialMaster: 0,
  materialSub: 0,
  cableLengthM: 0,
  pvcM: 0,
  jbQty: 0,
  accessories: '',
  technicians: 0,
  workDays: 0,
  observations: '',
  recommendations: '',
  sitePhotoDataUrl: null,
};
