import type {
  AccessControlDoor,
  AccessControlSurveyData,
  BurglarAlarmSensor,
  BurglarAlarmSurveyData,
  BuildingMeasurements,
  CCTVSurveyData,
  FireAlarmSurveyData,
  FireProtectionSurveyData,
} from '../types';
import { SurveyType } from '../types';

type KeywordHit = {
  count: number;
  matchedNames: string[];
};

function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ceilPositive(n: number): number {
  const x = Number.isFinite(n) ? n : 0;
  if (x <= 0) return 0;
  return Math.ceil(x);
}

function normalizeRoomName(name: unknown): string {
  return String(name ?? '').trim().toLowerCase();
}

function countRoomsByKeywords(measurements: BuildingMeasurements | undefined, keywords: string[]): KeywordHit {
  const rooms = measurements?.rooms ?? [];
  const matchedNames: string[] = [];
  let count = 0;
  rooms.forEach((r) => {
    const rn = normalizeRoomName(r?.name);
    if (!rn) return;
    const hit = keywords.some((k) => rn.includes(k));
    if (hit) {
      count += 1;
      const nm = String(r?.name ?? '').trim();
      if (nm) matchedNames.push(nm);
    }
  });
  return { count, matchedNames };
}

/**
 * "Perimeter proxy" computed from room dimensions.
 * This is a heuristic since interior shared walls are counted multiple times.
 */
export function computePerimeterProxyFromRooms(measurements: BuildingMeasurements | undefined): number {
  const rooms = measurements?.rooms ?? [];
  let perimeter = 0;
  rooms.forEach((r) => {
    const L = safeNum((r as any)?.length, 0);
    const W = safeNum((r as any)?.width, 0);
    if (L > 0 && W > 0) {
      perimeter += 2 * (L + W);
      return;
    }

    const area = safeNum((r as any)?.area, 0);
    if (area > 0) {
      // assume roughly square when only area is available
      const side = Math.sqrt(area);
      perimeter += 4 * side;
    }
  });
  return perimeter;
}

export function computeOpenAreaSqm(measurements: BuildingMeasurements | undefined): number {
  const rooms = measurements?.rooms ?? [];
  const sum = rooms.reduce((acc, r) => acc + safeNum((r as any)?.area, 0), 0);
  if (sum > 0) return sum;
  return safeNum((measurements as any)?.totalArea, 0);
}

export type QuantityRange = { low: number; high: number };

function formatRange(range: QuantityRange, unit?: string): string {
  const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toString() : '0');
  if (unit) return `${fmt(range.low)}–${fmt(range.high)} ${unit}`;
  return `${fmt(range.low)}–${fmt(range.high)}`;
}

export type MaterialRuleSummary = {
  header: string;
  lines: string[];
};

export type CctvRuleQuantities = {
  floors: number;
  openAreaSqm: number;
  perimeterProxyMeters: number;
  corridorCount: number;
  entryExitCount: number;
  camerasLow: number;
  camerasHigh: number;
  camerasRecommended: number;
  cat6CableMetersLow: number;
  cat6CableMetersHigh: number;
  cat6CableMetersRecommended: number;
  junctionBoxesLow: number;
  junctionBoxesHigh: number;
  nvrLow: number;
  nvrHigh: number;
  conduitTrayMeters: number;
};

export type FireAlarmRuleQuantities = {
  floors: number;
  openAreaSqm: number;
  smokeDetectorsCount: number;
  heatDetectorsCount: number;
  manualCallPointsCount: number;
  fireAlarmZonesCount: number;
  sounderStrobeDeviceCount: number;
  cableMeters: number;
};

export type AccessControlRuleQuantities = {
  doorsCount: number;
  controllersQty: number;
  cardReadersQtyRecommended: number;
  electricLocksQty: number;
  powerSupplyQtyRecommended: number;
  upsRequiredRecommended: boolean;
  estimatedCableLengthRecommendedMeters: number;
};

export type BurglarAlarmRuleQuantities = {
  pirSensorsCount: number;
  doorContactSensorsCount: number;
  sirenIndoorQty: number;
  sirenOutdoorQty: number;
  controlPanelZonesCount: number;
  keypadsQtyRecommended: number;
};

function doorAccessMethodCount(door: AccessControlDoor): number {
  const methods = Array.isArray(door?.accessMethod) ? door.accessMethod : [];
  const normalized = methods.map((m) => String(m ?? '').toLowerCase());
  const distinct = new Set(normalized.filter(Boolean));
  const count = distinct.size;
  // rule-of-thumb: 1-2 readers per door
  return Math.max(1, Math.min(2, count > 0 ? count : 1));
}

function isDoorContactSensorType(t: BurglarAlarmSensor['type']): boolean {
  const s = String(t ?? '').toLowerCase();
  return /^door\s*contact/i.test(s) || /door\s*\/\s*window/i.test(s) || /door\s*\/\s*window/i.test(s) || /door\/window/i.test(s) || /door\s*window/i.test(s);
}

function roomKeywordCount(measurements: BuildingMeasurements | undefined, keywords: string[]): number {
  return countRoomsByKeywords(measurements, keywords).count;
}

export function computeCctvRuleSummary(args: {
  cctvData: CCTVSurveyData;
  measurements: BuildingMeasurements | undefined;
}): MaterialRuleSummary {
  const { cctvData, measurements } = args;
  const floors = Math.max(1, safeNum(cctvData?.buildingInfo?.floors, 1));
  const openAreaSqm = computeOpenAreaSqm(measurements);

  const corridorCount = roomKeywordCount(measurements, ['corridor', 'hallway', 'hall ', 'passage', 'corrid']);
  const entryExitCount = roomKeywordCount(measurements, ['entry', 'exit', 'entrance', 'egress', 'lobby', 'drop', 'door']);

  const camFromAreaLow = openAreaSqm > 0 ? ceilPositive(openAreaSqm / 50) : 0;
  const camFromAreaHigh = openAreaSqm > 0 ? ceilPositive(openAreaSqm / 30) : 0;

  const camerasLow = camFromAreaLow + corridorCount + entryExitCount;
  const camerasHigh = camFromAreaHigh + corridorCount + entryExitCount;

  const perimeterProxy = computePerimeterProxyFromRooms(measurements);
  const cableBaseMeters = perimeterProxy > 0 ? perimeterProxy * floors : 0;
  const cableCat6Low = cableBaseMeters * 1.3;
  const cableCat6High = cableBaseMeters * 1.3;
  const conduitTrayLow = cableBaseMeters / 3;
  const conduitTrayHigh = cableBaseMeters / 3;

  const junctionBoxesLow = camerasLow > 0 ? ceilPositive(camerasLow / 4) : 0; // 1 per 4
  const junctionBoxesHigh = camerasHigh > 0 ? ceilPositive(camerasHigh / 3) : 0; // 1 per 3

  const nvrLow = camerasLow > 0 ? ceilPositive(camerasLow / 16) : 0; // 1 per 16
  const nvrHigh = camerasHigh > 0 ? ceilPositive(camerasHigh / 8) : 0; // 1 per 8

  const matchedAreasNote = openAreaSqm > 0 ? `Open area (proxy): ${Math.round(openAreaSqm)} sqm` : 'Open area: not available';
  const perimeterNote =
    perimeterProxy > 0
      ? `Perimeter proxy (from room L/W): ${Math.round(perimeterProxy)} m`
      : 'Perimeter proxy: not available (missing room L/W)';

  return {
    header: 'CCTV (Rule-of-thumb Material Quantities)',
    lines: [
      matchedAreasNote,
      `Cameras: ${formatRange({ low: camerasLow, high: camerasHigh })} (Area ${openAreaSqm > 0 ? '1 per 30–50 sqm' : 'n/a'} + Corridors ${corridorCount} + Entry/Exit ${entryExitCount})`,
      perimeterNote,
      `Cat6 cable (routing factor 1.3): ${formatRange({ low: cableCat6Low, high: cableCat6High }, 'm')}`,
      `Cable tray/conduit (shared runs ÷3): ${formatRange({ low: conduitTrayLow, high: conduitTrayHigh }, 'm')}`,
      `Junction boxes (1 per 3–4 cams): ${formatRange({ low: junctionBoxesLow, high: junctionBoxesHigh })}`,
      `NVR/DVR (1 per 8–16 cams): ${formatRange({ low: nvrLow, high: nvrHigh })}`,
    ],
  };
}

export function computeCctvRuleQuantities(args: {
  cctvData: CCTVSurveyData;
  measurements: BuildingMeasurements | undefined;
}): CctvRuleQuantities {
  const { cctvData, measurements } = args;
  const floors = Math.max(1, safeNum(cctvData?.buildingInfo?.floors, 1));
  const openAreaSqm = computeOpenAreaSqm(measurements);

  const corridorCount = roomKeywordCount(measurements, ['corridor', 'hallway', 'hall ', 'passage', 'corrid']);
  const entryExitCount = roomKeywordCount(measurements, ['entry', 'exit', 'entrance', 'egress', 'lobby', 'drop', 'door']);

  const camFromAreaLow = openAreaSqm > 0 ? ceilPositive(openAreaSqm / 50) : 0;
  const camFromAreaHigh = openAreaSqm > 0 ? ceilPositive(openAreaSqm / 30) : 0;

  const camerasLow = camFromAreaLow + corridorCount + entryExitCount;
  const camerasHigh = camFromAreaHigh + corridorCount + entryExitCount;
  const camerasRecommended = Math.max(camerasLow, Math.ceil(camerasHigh));

  const perimeterProxyMeters = computePerimeterProxyFromRooms(measurements);
  const cableBaseMeters = perimeterProxyMeters > 0 ? perimeterProxyMeters * floors : 0;
  const cat6CableMetersLow = cableBaseMeters * 1.3;
  const cat6CableMetersHigh = cableBaseMeters * 1.3;
  const cat6CableMetersRecommended = cat6CableMetersHigh;

  const junctionBoxesLow = camerasLow > 0 ? ceilPositive(camerasLow / 4) : 0;
  const junctionBoxesHigh = camerasHigh > 0 ? ceilPositive(camerasHigh / 3) : 0;

  const nvrLow = camerasLow > 0 ? ceilPositive(camerasLow / 16) : 0;
  const nvrHigh = camerasHigh > 0 ? ceilPositive(camerasHigh / 8) : 0;

  return {
    floors,
    openAreaSqm,
    perimeterProxyMeters,
    corridorCount,
    entryExitCount,
    camerasLow,
    camerasHigh,
    camerasRecommended,
    cat6CableMetersLow,
    cat6CableMetersHigh,
    cat6CableMetersRecommended,
    junctionBoxesLow,
    junctionBoxesHigh,
    nvrLow,
    nvrHigh,
    conduitTrayMeters: cableBaseMeters / 3,
  };
}

export function computeFireAlarmRuleSummary(args: {
  faData: FireAlarmSurveyData;
  measurements: BuildingMeasurements | undefined;
}): MaterialRuleSummary {
  const { faData, measurements } = args;
  const floors = Math.max(1, safeNum(faData?.buildingInfo?.floors, 1));
  const openAreaSqm = computeOpenAreaSqm(measurements);

  const smokeLow = openAreaSqm > 0 ? ceilPositive(openAreaSqm / 40) : 0;
  const smokeHigh = smokeLow;

  const kitchenCount = roomKeywordCount(measurements, ['kitchen']);
  const serverRoomCount = roomKeywordCount(measurements, ['server', 'data room', 'computer room']);
  const utilityRoomCount = roomKeywordCount(measurements, ['utility', 'gen', 'generator', 'pump', 'plant']);

  const heatCount = kitchenCount + serverRoomCount + utilityRoomCount;

  const exitRooms = roomKeywordCount(measurements, ['exit', 'egress', 'escape', 'stair', 'stairwell', 'fire exit']);
  const exitPerFloor = Math.max(1, floors > 0 ? Math.round(exitRooms / floors) : 1);
  const mcpCount = exitPerFloor * floors;

  const totalDetectorsForZones = smokeLow + heatCount + mcpCount; // per your rule ("total detectors")
  const zoneCount = ceilPositive(totalDetectorsForZones / 20);

  const sounderStrobeLow = floors + zoneCount;
  const sounderStrobeHigh = floors + zoneCount;

  const perimeterProxy = computePerimeterProxyFromRooms(measurements);
  const cableBaseMeters = perimeterProxy > 0 ? perimeterProxy * floors : 0;
  const cableLow = cableBaseMeters * 1.4;
  const cableHigh = cableBaseMeters * 1.4;

  return {
    header: 'Fire Alarm / FDAS (Rule-of-thumb Material Quantities)',
    lines: [
      `Floors: ${floors}`,
      openAreaSqm > 0
        ? `Smoke detectors (1 per ~40 sqm): ${formatRange({ low: smokeLow, high: smokeHigh })}`
        : 'Smoke detectors: open area not available',
      `Heat detectors (Kitchen + Server + Utility): ${heatCount}`,
      `Manual call points (1 per floor exit): ${mcpCount} (exit rooms proxy: ${exitRooms}, exit/floor: ${exitPerFloor})`,
      `Fire alarm zones: ceil(total detectors ÷ 20) = ${zoneCount}`,
      `Sounder / strobe: 1 per floor + 1 per zone = ${sounderStrobeLow}`,
      perimeterProxy > 0
        ? `Shielded 2-core cable (routing factor 1.4): ${formatRange({ low: cableLow, high: cableHigh }, 'm')}`
        : 'Cable length: perimeter proxy not available',
    ],
  };
}

export function computeFireAlarmRuleQuantities(args: {
  faData: FireAlarmSurveyData;
  measurements: BuildingMeasurements | undefined;
}): FireAlarmRuleQuantities {
  const { faData, measurements } = args;
  const floors = Math.max(1, safeNum(faData?.buildingInfo?.floors, 1));
  const openAreaSqm = computeOpenAreaSqm(measurements);

  const smokeDetectorsCount = openAreaSqm > 0 ? ceilPositive(openAreaSqm / 40) : 0;

  const kitchenCount = roomKeywordCount(measurements, ['kitchen']);
  const serverRoomCount = roomKeywordCount(measurements, ['server', 'data room', 'computer room']);
  const utilityRoomCount = roomKeywordCount(measurements, ['utility', 'gen', 'generator', 'pump', 'plant']);
  const heatDetectorsCount = kitchenCount + serverRoomCount + utilityRoomCount;

  const exitRooms = roomKeywordCount(measurements, ['exit', 'egress', 'escape', 'stair', 'stairwell', 'fire exit']);
  const exitPerFloor = Math.max(1, floors > 0 ? Math.round(exitRooms / floors) : 1);
  const manualCallPointsCount = exitPerFloor * floors;

  const totalDetectorsForZones = smokeDetectorsCount + heatDetectorsCount + manualCallPointsCount;
  const fireAlarmZonesCount = ceilPositive(totalDetectorsForZones / 20);

  const sounderStrobeDeviceCount = floors + fireAlarmZonesCount;

  const perimeterProxyMeters = computePerimeterProxyFromRooms(measurements);
  const cableMeters = perimeterProxyMeters > 0 ? perimeterProxyMeters * floors * 1.4 : 0;

  return {
    floors,
    openAreaSqm,
    smokeDetectorsCount,
    heatDetectorsCount,
    manualCallPointsCount,
    fireAlarmZonesCount,
    sounderStrobeDeviceCount,
    cableMeters,
  };
}

export function computeAccessControlRuleSummary(args: {
  acData: AccessControlSurveyData;
  measurements: BuildingMeasurements | undefined;
}): MaterialRuleSummary {
  const { acData } = args;
  const doors = Array.isArray(acData?.doors) ? acData.doors : [];
  const doorCount = Math.max(0, doors.length);

  const controllersQty = Math.max(1, doorCount); // 1 per controlled door (rule states controllers per controlled door)

  let readersLow = doorCount;
  let readersHigh = 0;
  doors.forEach((d) => {
    readersHigh += doorAccessMethodCount(d);
  });

  const electricLocksLow = doorCount;
  const electricLocksHigh = doorCount;

  const powerLow = doorCount > 0 ? ceilPositive(doorCount / 8) : 0;
  const powerHigh = doorCount > 0 ? ceilPositive(doorCount / 4) : 0;

  const distanceFromPanel = safeNum(acData?.controller?.estimatedCableLength, 0);
  // Rule says: distance from panel × doors × 1.2.
  // We assume `estimatedCableLength` is a distance per door; if user provided total meters, this will overcount.
  const cableLow = distanceFromPanel > 0 ? distanceFromPanel * doorCount * 1.2 : doorCount * 10 * 1.2;
  const cableHigh = cableLow;

  return {
    header: 'Access Control (Rule-of-thumb Material Quantities)',
    lines: [
      `Doors / controlled doors: ${doorCount}`,
      `Door controllers (1 per door): ${controllersQty}`,
      `Card readers (1–2 per door): ${formatRange({ low: readersLow, high: readersHigh })}`,
      `Electric locks (1 per door): ${electricLocksLow}`,
      `Cabling from panel (distance × doors × 1.2): ${formatRange({ low: cableLow, high: cableHigh }, 'm')}`,
      `Power supply / UPS (1 per 4–8 doors): ${formatRange({ low: powerLow, high: powerHigh })}`,
    ],
  };
}

export function computeAccessControlRuleQuantities(args: {
  acData: AccessControlSurveyData;
  measurements: BuildingMeasurements | undefined;
}): AccessControlRuleQuantities {
  const { acData } = args;
  const doors = Array.isArray(acData?.doors) ? acData.doors : [];
  const doorsCount = Math.max(0, doors.length);

  const controllersQty = Math.max(1, doorsCount);
  const cardReadersQtyRecommended = Math.max(0, doorsCount); // start with 1 per door (rule says 1–2)
  const electricLocksQty = doorsCount;

  const powerSupplyQtyRecommended = doorsCount > 0 ? Math.max(1, Math.ceil(doorsCount / 8)) : 0;
  // Rule-of-thumb: power supply/UPS 1 per 4–8 doors.
  // This app stores a boolean flag for UPS presence, so we turn it on for 4+ doors.
  const upsRequiredRecommended = doorsCount >= 4;

  // Default distance from panel proxy: 10m unless user already set estimated cable.
  const defaultDistanceFromPanelM = 10;
  const estimatedCableLengthRecommendedMeters = doorsCount > 0 ? defaultDistanceFromPanelM * doorsCount * 1.2 : 0;

  return {
    doorsCount,
    controllersQty,
    cardReadersQtyRecommended,
    electricLocksQty,
    powerSupplyQtyRecommended,
    upsRequiredRecommended,
    estimatedCableLengthRecommendedMeters,
  };
}

export function computeBurglarAlarmRuleSummary(args: {
  baData: BurglarAlarmSurveyData;
  measurements: BuildingMeasurements | undefined;
}): MaterialRuleSummary {
  const { baData, measurements } = args;
  const floors = Math.max(1, safeNum(baData?.buildingInfo?.floors, 1));
  const rooms = measurements?.rooms ?? [];
  const totalRooms = rooms.length;
  const corridorRooms = roomKeywordCount(measurements, ['corridor', 'hallway', 'hall ', 'passage', 'corrid']);
  const nonCorridorRooms = Math.max(0, totalRooms - corridorRooms);

  // PIR: 1 per room + 1 per corridor (>= 6m) -> we assume all corridor rooms are >= 6m.
  const pirEstimate = nonCorridorRooms + corridorRooms;

  // Door/window contacts: captured in survey (sensor counts)
  const sensors = Array.isArray(baData?.sensors) ? baData.sensors : [];
  const doorContactSensors = sensors.filter((s) => isDoorContactSensorType(s.type));
  const doorContactsQty = doorContactSensors.reduce((sum, s) => sum + Math.max(0, safeNum(s.count, 0)), 0);

  // Sirens: 1 indoor + 1 outdoor (rule)
  const sirenIndoorQty = 1;
  const sirenOutdoorQty = 1;

  const totalSensorsForZones = pirEstimate + doorContactsQty;
  const controlPanelZones = ceilPositive(totalSensorsForZones / 8);

  return {
    header: 'Burglar Alarm (Rule-of-thumb Material Quantities)',
    lines: [
      `Rooms (from floor plan): ${totalRooms} (corridors proxy: ${corridorRooms})`,
      `PIR sensors (1 per room + 1 per corridor; corridor length >= 6m assumed): ${pirEstimate}`,
      `Door/window contacts (from survey-captured door-contact sensors): ${doorContactsQty}`,
      `Sirens (1 indoor + 1 outdoor): ${sirenIndoorQty + sirenOutdoorQty} (${sirenIndoorQty} indoor, ${sirenOutdoorQty} outdoor)`,
      `Control panel zones: ceil(total sensors ÷ 8) = ${controlPanelZones}`,
      `Floors (not directly used in this rule set): ${floors}`,
    ],
  };
}

export function computeBurglarAlarmRuleQuantities(args: {
  baData: BurglarAlarmSurveyData;
  measurements: BuildingMeasurements | undefined;
}): BurglarAlarmRuleQuantities {
  const { baData, measurements } = args;
  const floors = Math.max(1, safeNum(baData?.buildingInfo?.floors, 1));
  const rooms = measurements?.rooms ?? [];
  const totalRooms = rooms.length;

  const corridorRooms = roomKeywordCount(measurements, ['corridor', 'hallway', 'hall ', 'passage', 'corrid']);
  const nonCorridorRooms = Math.max(0, totalRooms - corridorRooms);

  const pirSensorsCount = nonCorridorRooms + corridorRooms;
  const doorContactSensorsCount = 0; // not inferred from rooms; rule says survey-captured

  const sirenIndoorQty = 1;
  const sirenOutdoorQty = 1;

  const sensorsForZones = pirSensorsCount + doorContactSensorsCount;
  const controlPanelZonesCount = ceilPositive(sensorsForZones / 8);
  const keypadsQtyRecommended = Math.max(1, controlPanelZonesCount);

  void floors; // floors not needed for quantities here (reserved)
  return {
    pirSensorsCount,
    doorContactSensorsCount,
    sirenIndoorQty,
    sirenOutdoorQty,
    controlPanelZonesCount,
    keypadsQtyRecommended,
  };
}

export function computeFireProtectionRuleSummary(args: {
  fpData: FireProtectionSurveyData;
  measurements: BuildingMeasurements | undefined;
}): MaterialRuleSummary {
  const { fpData } = args;
  const floors = Math.max(1, safeNum(fpData?.buildingInfo?.floors, 1));
  const zoningZones = Math.max(0, safeNum(fpData?.zoning?.zones, 0));
  const units = Array.isArray(fpData?.protectionUnits) ? fpData.protectionUnits : [];

  const openAreaSqm = units.reduce((sum, u) => sum + safeNum((u as any)?.buildingInfoArea, 0), 0);
  const sprinklerCoverageAreaSum = units.reduce((sum, u) => {
    const systems = Array.isArray((u as any)?.scope?.systems) ? (u as any).scope.systems : [];
    if (!systems.includes('Sprinkler')) return sum;
    return sum + safeNum((u as any)?.sprinkler?.coverageArea, 0);
  }, 0);

  // Range per hazard:
  let sprinklerHeadsLow = 0;
  let sprinklerHeadsHigh = 0;
  units.forEach((u) => {
    const systems = Array.isArray(u?.scope?.systems) ? u.scope.systems : [];
    if (!systems.includes('Sprinkler')) return;
    const area = safeNum(u?.sprinkler?.coverageArea, 0);
    if (area <= 0) return;

    const hazard = String(u?.hazardClassification || '').toLowerCase();
    const isLight = hazard.includes('light');
    const isOrdinary = hazard.includes('ordinary');

    if (isLight) {
      // Light hazard: 1 per 9–12 sqm
      sprinklerHeadsLow += ceilPositive(area / 12); // fewer heads
      sprinklerHeadsHigh += ceilPositive(area / 9); // more heads
    } else if (isOrdinary) {
      // Ordinary hazard: 1 per 6–9 sqm
      sprinklerHeadsLow += ceilPositive(area / 9);
      sprinklerHeadsHigh += ceilPositive(area / 6);
    } else {
      // fallback: treat unknown/extra as ordinary
      sprinklerHeadsLow += ceilPositive(area / 9);
      sprinklerHeadsHigh += ceilPositive(area / 6);
    }
  });

  // Pipe (25mm GI) based on area coverage grid layout.
  // Your existing pricing uses: heads ~ pipeLen/3. We invert that: pipeLen ~ heads * 3.
  const pipeLenLow = sprinklerHeadsLow * 3;
  const pipeLenHigh = sprinklerHeadsHigh * 3;

  // Alarm valve + flow switch: 1 per zone/floor.
  const alarmValveQty = zoningZones > 0 ? zoningZones * floors : 0;

  return {
    header: 'Fire Protection (Sprinkler Protection) Rule-of-thumb Material Quantities',
    lines: [
      `Floors: ${floors}`,
      `Zoning zones (from survey): ${zoningZones}`,
      sprinklerCoverageAreaSum > 0
        ? `Sprinkler coverage area (sum of sprinkler units): ${Math.round(sprinklerCoverageAreaSum)} sqm`
        : openAreaSqm > 0
          ? `Sprinkler coverage area: not available per unit (area proxy: ${Math.round(openAreaSqm)} sqm)`
          : 'Sprinkler coverage area: not available',
      `Sprinkler heads (by hazard): ${formatRange({ low: sprinklerHeadsLow, high: sprinklerHeadsHigh })}`,
      `Pipe length estimate (25mm GI; pipeLen ~= heads × 3): ${formatRange({ low: pipeLenLow, high: pipeLenHigh }, 'm')}`,
      `Alarm valve + flow switch: 1 per zone/floor = ${alarmValveQty}`,
    ],
  };
}

export function computeMaterialQuantityRulesSummary(args: {
  type: SurveyType;
  cctvData: CCTVSurveyData | null;
  faData: FireAlarmSurveyData | null;
  acData: AccessControlSurveyData | null;
  baData: BurglarAlarmSurveyData | null;
  fpData: FireProtectionSurveyData | null;
  measurements: BuildingMeasurements | undefined;
}): MaterialRuleSummary | null {
  const { type, cctvData, faData, acData, baData, fpData, measurements } = args;

  if (type === SurveyType.CCTV && cctvData) return computeCctvRuleSummary({ cctvData, measurements });
  if (type === SurveyType.FIRE_ALARM && faData) return computeFireAlarmRuleSummary({ faData, measurements });
  if (type === SurveyType.ACCESS_CONTROL && acData) return computeAccessControlRuleSummary({ acData, measurements });
  if (type === SurveyType.BURGLAR_ALARM && baData) return computeBurglarAlarmRuleSummary({ baData, measurements });
  if (type === SurveyType.FIRE_PROTECTION && fpData) return computeFireProtectionRuleSummary({ fpData, measurements });

  return null;
}

