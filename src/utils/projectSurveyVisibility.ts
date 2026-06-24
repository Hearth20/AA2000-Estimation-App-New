import { Project, SurveyType } from '../types';

/** Canonical ordering for scope pickers and modal buttons. */
export const ALL_SURVEY_TYPES_ORDERED: SurveyType[] = [
  SurveyType.CCTV,
  SurveyType.FIRE_ALARM,
  SurveyType.FIRE_PROTECTION,
  SurveyType.ACCESS_CONTROL,
  SurveyType.BURGLAR_ALARM,
  SurveyType.OTHER,
];

export function projectSurveyScope(project: Project | null | undefined): SurveyType[] {
  if (project?.projectSurveyTypes?.length) return [...project.projectSurveyTypes];
  return [...ALL_SURVEY_TYPES_ORDERED];
}

/** Surveys the given technician may run on this project (subset of scope). */
export function technicianSurveyTasks(project: Project | null | undefined, userEmail: string): SurveyType[] {
  const scope = projectSurveyScope(project);
  const key = userEmail.trim().toLowerCase();
  const raw = project?.technicianSurveyAssignments;
  const fromAssign = raw?.[key] ?? raw?.[userEmail];
  if (fromAssign && fromAssign.length) {
    return fromAssign.filter((s) => scope.includes(s));
  }
  /** Admin/Sales configured per-tech tasks but this user has none (or empty list). */
  if (raw && Object.keys(raw).length > 0) {
    return [];
  }
  /** Legacy projects: no assignment map — treat full scope as available to every assignee. */
  return [...scope];
}

/** Shared labels for survey selection modals and admin scope checkboxes. */
export const SURVEY_DISPLAY: Record<SurveyType, { label: string; desc: string; icon: string }> = {
  [SurveyType.CCTV]: { label: 'CCTV System', desc: 'Video Surveillance Audit', icon: 'fa-camera' },
  [SurveyType.FIRE_ALARM]: { label: 'Fire Alarm', desc: 'Safety & Detection Audit', icon: 'fa-fire-extinguisher' },
  [SurveyType.FIRE_PROTECTION]: { label: 'Fire Protection', desc: 'Suppression & Sprinkler Audit', icon: 'fa-shield-heart' },
  [SurveyType.ACCESS_CONTROL]: { label: 'Access Control', desc: 'Entry & Door Security Audit', icon: 'fa-id-card-clip' },
  [SurveyType.BURGLAR_ALARM]: { label: 'Burglar Alarm', desc: 'Intrusion Detection Audit', icon: 'fa-shield-halved' },
  [SurveyType.OTHER]: { label: 'Other', desc: 'Custom Technological Service', icon: 'fa-ellipsis-h' },
};

export const SURVEY_MODAL_ITEMS: Array<{
  type: SurveyType;
  label: string;
  desc: string;
  icon: string;
}> = ALL_SURVEY_TYPES_ORDERED.map((type) => ({
  type,
  ...SURVEY_DISPLAY[type],
}));
