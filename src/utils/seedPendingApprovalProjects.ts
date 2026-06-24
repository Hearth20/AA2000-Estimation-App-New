import type {
  AccessControlSurveyData,
  CCTVSurveyData,
  EstimationDetail,
  FireAlarmSurveyData,
  Project,
} from '../types';
import { SurveyType } from '../types';
import { ALL_SURVEY_TYPES_ORDERED } from './projectSurveyVisibility';
import { notifyAdminsProjectReadyForFinalization } from './inAppNotifications';

/** Fixed ids so seeding is idempotent (safe to run on every load in dev). */
const DEMO_CCTV_ID = 'demo-seed-wait-approval-cctv-v2';
const DEMO_FA_ID = 'demo-seed-wait-approval-fire-alarm-v2';
const DEMO_AC_ID = 'demo-seed-wait-approval-access-control-v2';

function selectionsFor(survey: SurveyType): boolean[] {
  return ALL_SURVEY_TYPES_ORDERED.map((t) => t === survey);
}

function minimalEstimation(): EstimationDetail {
  return {
    days: 2,
    techs: 1,
    manpowerBreakdown: [],
    consumablesList: [],
    additionalFees: [],
  };
}

function makeCctvSurvey(): CCTVSurveyData {
  return {
    buildingInfo: { type: 'Retail', otherType: '', floors: 2, isNew: true },
    cameras: [
      {
        id: 'seed-cam-1',
        locationName: 'Main entrance',
        purposes: ['Monitoring'],
        type: 'Dome',
        resolution: '4MP',
        lightingCondition: 'Good Lighting',
        environment: 'Indoor',
        mountingHeight: 3,
        coverageDistanceMeters: 12,
        scopeStatus: 'New Installation',
        cableType: 'Cat6',
        cableLength: 45,
      },
    ],
    infrastructure: {
      cablePath: 'Ceiling',
      wallType: 'Concrete',
      coreDrilling: false,
    },
    controlRoom: {
      nvrLocation: 'Security office',
      storageRequirementTB: 4,
      retentionDays: 30,
      rackAvailable: true,
      powerSocketAvailable: true,
      upsRequired: true,
      networkSwitchAvailable: true,
      internetAvailable: true,
    },
  };
}

function makeFireAlarmSurvey(): FireAlarmSurveyData {
  return {
    buildingInfo: { type: 'Warehouse', floors: 1, isNew: false },
    systemType: 'Addressable',
    integrations: [],
    detectionAreas: [
      {
        id: 'seed-da-1',
        name: 'Storage floor',
        devices: [{ type: 'Smoke', count: 14 }],
      },
    ],
    notification: {
      mcpRequired: true,
      mcpCount: 6,
      devices: ['Horn Strobe'],
      deviceCount: 10,
    },
    infrastructure: {
      cableType: 'Fire-rated',
      otherCableType: '',
      cableLength: 180,
      routing: 'Ceiling',
      otherRouting: '',
      wallType: 'Concrete',
      coreDrilling: false,
    },
    controlPanel: {
      location: 'GF electrical room',
      rackAvailable: true,
      powerAvailable: true,
      upsRequired: true,
      networkRequired: false,
    },
  };
}

function makeAccessControlSurvey(): AccessControlSurveyData {
  return {
    buildingInfo: { type: 'Office', floors: 3, isNew: true },
    doors: [
      {
        id: 'seed-door-1',
        name: 'Main lobby',
        location: 'Ground floor',
        accessMethod: ['Card + PIN'],
        accessMethodCapacity: '500 users',
        wireType: 'Cat6',
      },
    ],
    infrastructure: {
      cableType: 'Cat6',
      cablePath: 'Ceiling',
      powerPath: 'Separate',
    },
    controller: {
      location: 'GF IDF',
      additionalHardware: '',
      wiringNotes: 'Demo seed — awaiting finalization',
      poeAvailable: true,
      upsRequired: true,
      networkRequired: true,
    },
  };
}

function makeCctvRow(ts: string) {
  const completedAt = new Date().toISOString();
  const project: Project = {
    id: DEMO_CCTV_ID,
    name: 'Demo: Retail CCTV (awaiting Sales/Admin)',
    clientName: 'Demo Retail Philippines Inc.',
    clientContactName: 'Maria Santos',
    clientEmail: 'operations@demo-retail.test',
    clientContact: '09171234567',
    location: 'Quezon City, Metro Manila',
    locationName: 'Flagship store',
    startDate: '2026-04-01',
    endDate: '2026-04-20',
    projectSurveyTypes: [SurveyType.CCTV],
    projectSurveySelections: selectionsFor(SurveyType.CCTV),
    assignedTechnicians: [{ fullName: 'Demo Technician', email: 'demo.technician@example.com' }],
    technicianResponses: { 'demo.technician@example.com': 'ACCEPTED' },
    requiredTechnicians: 1,
    status: 'Completed',
    completedAt,
    completedBy: 'Demo Technician',
    technicianName: 'Demo Technician',
    date: 'April 10, 2026',
  };
  return {
    project,
    cctvData: makeCctvSurvey(),
    faData: null,
    fpData: null,
    acData: null,
    baData: null,
    otherData: null,
    estimations: { [SurveyType.CCTV]: minimalEstimation() },
    timestamp: ts,
  };
}

function makeFaRow(ts: string) {
  const completedAt = new Date().toISOString();
  const project: Project = {
    id: DEMO_FA_ID,
    name: 'Demo: Warehouse fire alarm (awaiting Sales/Admin)',
    clientName: 'Demo Logistics Corp.',
    clientContactName: 'Juan Reyes',
    clientEmail: 'safety@demo-logistics.test',
    clientContact: '09179876543',
    location: 'Laguna Technopark',
    locationName: 'Warehouse B',
    startDate: '2026-03-15',
    endDate: '2026-04-30',
    projectSurveyTypes: [SurveyType.FIRE_ALARM],
    projectSurveySelections: selectionsFor(SurveyType.FIRE_ALARM),
    assignedTechnicians: [{ fullName: 'Demo Technician', email: 'demo.technician@example.com' }],
    technicianResponses: { 'demo.technician@example.com': 'ACCEPTED' },
    requiredTechnicians: 1,
    status: 'Completed',
    completedAt,
    completedBy: 'Demo Technician',
    technicianName: 'Demo Technician',
    date: 'April 10, 2026',
  };
  return {
    project,
    cctvData: null,
    faData: makeFireAlarmSurvey(),
    fpData: null,
    acData: null,
    baData: null,
    otherData: null,
    estimations: { [SurveyType.FIRE_ALARM]: minimalEstimation() },
    timestamp: ts,
  };
}

function makeAcRow(ts: string) {
  const completedAt = new Date().toISOString();
  const project: Project = {
    id: DEMO_AC_ID,
    name: 'Demo: Office access control (awaiting Sales/Admin)',
    clientName: 'Demo Property Management LLC',
    clientContactName: 'Ana Cruz',
    clientEmail: 'facilities@demo-property.test',
    clientContact: '09175551234',
    location: 'Makati CBD',
    locationName: 'Tower lobby & IDF',
    startDate: '2026-04-05',
    endDate: '2026-05-15',
    projectSurveyTypes: [SurveyType.ACCESS_CONTROL],
    projectSurveySelections: selectionsFor(SurveyType.ACCESS_CONTROL),
    assignedTechnicians: [{ fullName: 'Demo Technician', email: 'demo.technician@example.com' }],
    technicianResponses: { 'demo.technician@example.com': 'ACCEPTED' },
    requiredTechnicians: 1,
    status: 'Completed',
    completedAt,
    completedBy: 'Demo Technician',
    technicianName: 'Demo Technician',
    date: 'April 10, 2026',
  };
  return {
    project,
    cctvData: null,
    faData: null,
    fpData: null,
    acData: makeAccessControlSurvey(),
    baData: null,
    otherData: null,
    estimations: { [SurveyType.ACCESS_CONTROL]: minimalEstimation() },
    timestamp: ts,
  };
}

/**
 * Ensures three saved projects exist in `Completed` state (technician submitted),
 * with audit + estimation data but no Sales/Admin finalization yet.
 * Runs only in dev, or when `VITE_SEED_DEMO_PENDING_APPROVAL=true`.
 */
export function seedPendingApprovalProjectsIfNeeded(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const enabled =
      import.meta.env.DEV || String(import.meta.env.VITE_SEED_DEMO_PENDING_APPROVAL || '') === 'true';
    if (!enabled) return;

    const raw = localStorage.getItem('aa2000_saved_projects');
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;

    const next = [...parsed];
    const toNotify: Project[] = [];
    const base = Date.now();

    const upsertDemoRow = (id: string, rowFactory: (ts: string) => any, ts: string) => {
      const row = rowFactory(ts);
      const existingIndex = next.findIndex((p: { project?: Project }) => p.project?.id === id);
      if (existingIndex >= 0) {
        // Keep existing remarks/notes if any, but reset project to "Completed" ready for finalization.
        const existing = next[existingIndex] || {};
        const shouldNotify = existing?.project?.status !== 'Completed';
        next[existingIndex] = {
          ...row,
          remarks: existing.remarks,
          techNotes: existing.techNotes,
        };
        if (shouldNotify) toNotify.push(row.project);
      } else {
        next.push(row);
        toNotify.push(row.project);
      }
    };

    upsertDemoRow(DEMO_CCTV_ID, makeCctvRow, new Date(base - 180_000).toISOString());
    upsertDemoRow(DEMO_FA_ID, makeFaRow, new Date(base - 120_000).toISOString());
    upsertDemoRow(DEMO_AC_ID, makeAcRow, new Date(base - 60_000).toISOString());

    localStorage.setItem('aa2000_saved_projects', JSON.stringify(next));
    if (toNotify.length > 0) {
      for (const p of toNotify) {
        notifyAdminsProjectReadyForFinalization(p);
      }
    }
  } catch {
    /* ignore corrupt localStorage / JSON */
  }
}
