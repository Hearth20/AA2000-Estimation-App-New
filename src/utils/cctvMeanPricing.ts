import { CCTVSurveyData } from '../types';

/**
 * Mean-average PH market pricing for CCTV components (research-aligned draft approved by user).
 */
export const CCTV_MEAN = {
  // Updated from company CCTV pricelist workbook (Apr 2026).
  DOME_BULLET: 2400,
  CAMERA_8MP: 8000,
  PTZ: 22000,
  FISHEYE: 9800,
  AI_FACE_REC: 15850,
  NVR_BASE: 5000,
  CAT6_PER_METER: 31,
} as const;

export interface CctvMeanCostResult {
  equipment: number;
  cableMeters: number;
  cablesCost: number;
}

/**
 * Computes CCTV equipment + cabling cost using PH mean-average pricing.
 */
export function computeCctvMeanCosts(data: CCTVSurveyData): CctvMeanCostResult {
  const cameras = Array.isArray(data?.cameras) ? data.cameras : [];
  let equipment = 0;

  cameras.forEach((cam) => {
    const camType = String(cam?.type || '').toLowerCase();
    const isFaceRec = Array.isArray(cam?.purposes) && cam.purposes.includes('Face Recognition');
    const is8MP = /8MP|8\s*MP|4K/i.test(String(cam?.resolution || ''));

    if (isFaceRec) {
      equipment += CCTV_MEAN.AI_FACE_REC;
      return;
    }
    if (camType === 'ptz') {
      equipment += CCTV_MEAN.PTZ;
      return;
    }
    if (camType === 'fisheye') {
      equipment += CCTV_MEAN.FISHEYE;
      return;
    }
    if (is8MP) {
      equipment += CCTV_MEAN.CAMERA_8MP;
      return;
    }
    equipment += CCTV_MEAN.DOME_BULLET;
  });

  if (cameras.length > 0) {
    equipment += CCTV_MEAN.NVR_BASE;
  }

  const cableMeters = cameras.reduce((sum, c) => sum + (Number(c?.cableLength) || 0), 0);
  const cablesCost = cableMeters * CCTV_MEAN.CAT6_PER_METER;

  return { equipment, cableMeters, cablesCost };
}

