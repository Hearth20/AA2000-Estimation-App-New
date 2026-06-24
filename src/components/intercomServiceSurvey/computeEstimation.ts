import type { IntercomServiceFormState } from './types';

export interface EstimationBreakdown {
  deviceCost: number;
  cablingCost: number;
  laborCost: number;
  totalCost: number;
  cablingSuggestion: string;
}

export function suggestCablingType(state: Pick<IntercomServiceFormState, 'intercomType' | 'networkType' | 'commRangeM'>): string {
  const { intercomType, networkType, commRangeM } = state;
  if (intercomType === 'IP') return 'Cat6';
  if (networkType === 'Wired') return '2-core cable';
  if ((commRangeM ?? 0) > 100) return 'Shielded cable';
  if (networkType === 'Wireless') return 'Wireless link / access points';
  return 'Standard structured cable';
}

export function computeEstimation(state: IntercomServiceFormState): EstimationBreakdown {
  const master = Math.max(0, Number(state.masterStations) || 0);
  const sub = Math.max(0, Number(state.substations) || 0);
  const cableLen = Math.max(0, Number(state.cableLengthM) || 0);
  const tech = Math.max(0, Number(state.technicians) || 0);
  const days = Math.max(0, Number(state.workDays) || 0);

  const deviceCost = master * 200 + sub * 100;
  const cablingCost = cableLen * 2;
  const laborCost = tech * days * 100;
  const totalCost = deviceCost + cablingCost + laborCost;

  return {
    deviceCost,
    cablingCost,
    laborCost,
    totalCost,
    cablingSuggestion: suggestCablingType(state),
  };
}
