import type { AccessControlSurveyData, AccessControlDoor } from "../types";

/**
 * Mean-average Access Control pricing (PHP) derived from the PH market scan on 18 Mar 2026.
 * These are used ONLY for Access Control cost computations (BOQ + estimates + summary).
 *
 * Assumptions (because the survey schema selects multiple methods):
 * - We count exactly 1 "authentication terminal" per door using a priority:
 *   Facial (if specified in "Other") > Fingerprint > RFID > Pin code.
 * - We count 1 lock, 1 exit/REX device, 1 door contact sensor per door.
 * - For "Mechanical lock" / "Dropbolt", we currently price them using the same mean as electric strike/maglock
 *   since we only have mean averages for electric locks.
 * - For REX type (push/no-touch/breakglass), we currently use the mean push-to-exit price for all.
 * - If controller estimated cable length is missing, we fallback to 10m per door.
 */

export const ACCESS_CONTROL_MEAN = {
  // Updated from company Access Control pricelist workbook (Apr 2026).
  BIOMETRIC_READER: 6650,
  RFID_CARD_READER: 9000,
  FACIAL_RECOGNITION_TERMINAL: 12000,
  CONTROLLER: 7900,

  ELECTRIC_LOCK: 4500,
  EXIT_BUTTON: 500,
  DOOR_CONTACT_SENSOR: 290,
  POWER_SUPPLY: 1850,

  CABLING_PER_METER: 31, // aligned with current CAT6 roll rates from company pricelist
  CONTROLLER_DOORS_SUPPORTED: 4, // used to translate door count to controller quantity
} as const;

type DoorTerminalKind = "biometric" | "rfid" | "facial" | "pin";

const includesAny = (text: string, needles: string[]) => needles.some((n) => text.includes(n));

const getDoorTerminalKind = (door: AccessControlDoor): DoorTerminalKind => {
  const methods = Array.isArray(door.accessMethod) ? door.accessMethod : [];
  const normalized = methods.map((m) => String(m).toLowerCase());

  const hasFace = normalized.some((m) => includesAny(m, ["face", "facial"]));
  if (hasFace) return "facial";

  const hasFingerprint = normalized.some((m) => m.includes("fingerprint") || m.includes("bio"));
  if (hasFingerprint) return "biometric";

  const hasRFID = normalized.some((m) => m.includes("rfid") || m.includes("card"));
  if (hasRFID) return "rfid";

  const hasPin = normalized.some((m) => m.includes("pin"));
  if (hasPin) return "pin";

  // If nothing matches, default to RFID/card reader cost to avoid returning 0.
  return "rfid";
};

export function computeAccessControlMeanCosts(acData: AccessControlSurveyData) {
  const doors = Array.isArray(acData?.doors) ? acData.doors : [];
  const doorCount = doors.length;

  // Controllers: base is translated using the typical 4-door controller capacity mean.
  const baseControllers = Math.max(1, Math.ceil(doorCount / ACCESS_CONTROL_MEAN.CONTROLLER_DOORS_SUPPORTED));
  const controllersQty = baseControllers * (acData?.controller?.redundantControllers ? 2 : 1);

  let biometricReadersQty = 0;
  let rfidCardReadersQty = 0;
  let facialRecognitionQty = 0;

  // Hardware per door
  let electricLocksQty = doorCount; // 1 lock per door (schema is per-door)
  let exitButtonsQty = doorCount; // REX per door
  let doorContactQty = doorCount; // 1 door contact per door

  // Power supply: count per door unless PoE is selected
  let powerSuppliesQty = doors.filter((d) => d.lockPowerType !== "PoE").length;

  // Cabling
  const cableMetersRaw = Number(acData?.controller?.estimatedCableLength);
  const cableMeters =
    Number.isFinite(cableMetersRaw) && cableMetersRaw > 0 ? cableMetersRaw : doorCount * 10;

  // Terminal per door (priority logic)
  doors.forEach((door) => {
    const kind = getDoorTerminalKind(door);
    if (kind === "facial") facialRecognitionQty += 1;
    else if (kind === "biometric") biometricReadersQty += 1;
    else if (kind === "pin") rfidCardReadersQty += 1; // keypad-only priced using RFID reader mean as closest available mean
    else rfidCardReadersQty += 1;
  });

  // Equipment totals
  const biometricReadersCost = biometricReadersQty * ACCESS_CONTROL_MEAN.BIOMETRIC_READER;
  const rfidCardReadersCost = rfidCardReadersQty * ACCESS_CONTROL_MEAN.RFID_CARD_READER;
  const facialRecognitionCost = facialRecognitionQty * ACCESS_CONTROL_MEAN.FACIAL_RECOGNITION_TERMINAL;
  const controllersCost = controllersQty * ACCESS_CONTROL_MEAN.CONTROLLER;
  const electricLocksCost = electricLocksQty * ACCESS_CONTROL_MEAN.ELECTRIC_LOCK;
  const exitButtonsCost = exitButtonsQty * ACCESS_CONTROL_MEAN.EXIT_BUTTON;
  const doorContactsCost = doorContactQty * ACCESS_CONTROL_MEAN.DOOR_CONTACT_SENSOR;
  const powerSuppliesCost = powerSuppliesQty * ACCESS_CONTROL_MEAN.POWER_SUPPLY;

  const equipment = biometricReadersCost + rfidCardReadersCost + facialRecognitionCost + controllersCost +
    electricLocksCost + exitButtonsCost + doorContactsCost + powerSuppliesCost;

  const cablesCost = cableMeters * ACCESS_CONTROL_MEAN.CABLING_PER_METER;

  return {
    equipment,
    cableMeters,
    cablesCost,
    breakdown: {
      biometricReadersQty,
      rfidCardReadersQty,
      facialRecognitionQty,
      controllersQty,
      electricLocksQty,
      exitButtonsQty,
      doorContactsQty: doorContactQty,
      powerSuppliesQty,
    },
  };
}

