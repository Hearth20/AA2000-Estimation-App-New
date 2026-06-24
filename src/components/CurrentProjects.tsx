import React, { useEffect, useMemo, useRef, useState } from 'react';
import SurveySummary from './SurveySummary';
import { User, SurveyType, type Project } from '../types';
import type { ThemeMode } from './Profile';
import type { ProjectSortMode } from './App';
import PortalLayout, { PortalNavKey } from './PortalLayout';
import type { InAppNotification } from '../utils/inAppNotifications';
import { downloadFinalizedReportPdf } from '../utils/finalizedReportPdf';
import { DEFAULT_DATE_FILTER, matchDateFilter, toDisplayDateMDY, toIsoDate, type DateFilterState } from '../utils/dateFilters';

interface Props {
  user: User | null;
  userRole: 'TECHNICIAN' | 'ADMIN' | null;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  compactMode: boolean;
  onCompactModeChange: (compact: boolean) => void;
  onPortalNavigate: (key: PortalNavKey) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onViewProject: (project: any) => void;
  onEditProject: (project: any, index: number) => void;
  onEditAuditFromList?: (projectRecord: any, index: number, surveyType: SurveyType) => void;
  onGoToDashboardSection?: (section: 'ONGOING' | 'UPCOMING' | 'HISTORY') => void;
  onNotificationNavigate: (n: InAppNotification) => void;
  projectSortMode: ProjectSortMode;
  onProjectSortModeChange: (mode: ProjectSortMode) => void;
}

/**
 * CURRENT PROJECTS COMPONENT
 * Purpose: A searchable archive of all finalized survey reports stored on the device.
 * Logic: Fetches data from localStorage and implements a manual coordinate-based PDF export.
 */
const CurrentProjects: React.FC<Props> = ({
  user,
  userRole,
  theme,
  onThemeChange,
  compactMode,
  onCompactModeChange,
  onPortalNavigate,
  onOpenProfile,
  onLogout,
  onEditAuditFromList,
  onNotificationNavigate,
  projectSortMode,
  onProjectSortModeChange,
}) => {
  // --- COMPONENT STATE ---
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sending, setSending] = useState(false); // Controls PDF generation loading state
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);
  const finalizedDateInputRef = useRef<HTMLInputElement | null>(null);
  const openNativeDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      (input as HTMLInputElement & { showPicker: () => void }).showPicker();
      return;
    }
    input.focus();
  };

  useEffect(() => {
    loadProjects();
  }, []);

  /**
   * startVoiceInput: Standardized voice-to-text input handler for search filters.
   */
  // Added missing startVoiceInput function to handle speech recognition in the search field
  const startVoiceInput = (field: string, setter: (val: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setActiveVoiceField(field);
    };

    recognition.onend = () => {
      setActiveVoiceField(null);
    };

    recognition.onerror = () => {
      setActiveVoiceField(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setter(transcript);
    };

    recognition.start();
  };

  /**
   * loadProjects: Retrieves raw project data from localStorage.
   * Logic: Reverses the list to ensure the newest audits appear at the top.
   */
  const loadProjects = () => {
    const saved = localStorage.getItem('aa2000_saved_projects');
    if (saved) {
      const parsed = JSON.parse(saved);
      setProjects([...parsed].reverse());
    } else {
      setProjects([]);
    }
  };

  /**
   * handleDownloadPDF: The jsPDF coordinate-based drawing engine.
   * Purpose: Converts technical audit JSON data into a human-readable professional document.
   * Logic: Manually tracks the 'currentY' vertical cursor to handle page breaks and table layouts.
   */
  const handleDownloadPDF = async () => {
    if (!selectedProject || sending) return;
    if (selectedProject.project?.status !== 'Finalized - Approved' && selectedProject.project?.status !== 'Finalized') return;
    setSending(true);

    try {
      await downloadFinalizedReportPdf(selectedProject);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Could not generate the PDF. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const surveyTypeToKey: Record<SurveyType, string> = {
    [SurveyType.CCTV]: 'cctvData',
    [SurveyType.FIRE_ALARM]: 'faData',
    [SurveyType.FIRE_PROTECTION]: 'fpData',
    [SurveyType.ACCESS_CONTROL]: 'acData',
    [SurveyType.BURGLAR_ALARM]: 'baData',
    [SurveyType.OTHER]: 'otherData',
  };

  /**
   * handleDeleteSurvey: Removes a survey type from the currently viewed project and persists to localStorage.
   */
  const handleDeleteSurvey = (surveyType: SurveyType) => {
    if (!selectedProject) return;
    const key = surveyTypeToKey[surveyType];
    const updated = { ...selectedProject, [key]: null };
    const estimations = { ...(selectedProject.estimations || {}) };
    delete estimations[surveyType];
    updated.estimations = Object.keys(estimations).length ? estimations : undefined;
    setSelectedProject(updated);
    // Also update the in-memory projects list so the badges/audit types
    // disappear immediately when returning to the list view.
    setProjects(prev =>
      prev.map(p => (p.timestamp === selectedProject.timestamp ? updated : p))
    );
    const saved = localStorage.getItem('aa2000_saved_projects');
    if (saved) {
      const parsed = JSON.parse(saved);
      const idx = parsed.findIndex((p: any) => p.timestamp === selectedProject.timestamp);
      if (idx !== -1) {
        parsed[idx] = updated;
        localStorage.setItem('aa2000_saved_projects', JSON.stringify(parsed));
      }
    }
  };

  /**
   * handleDeleteProject: Permanently removes the currently viewed final report
   * from localStorage and from the in-memory projects list.
   */
  const handleDeleteProject = () => {
    if (!selectedProject) return;
    const ts = selectedProject.timestamp;

    // Update in-memory list so the card disappears immediately when returning.
    setProjects(prev => prev.filter(p => p.timestamp !== ts));

    // Persist removal in localStorage.
    const saved = localStorage.getItem('aa2000_saved_projects');
    if (saved) {
      const parsed = JSON.parse(saved);
      const next = parsed.filter((p: any) => p.timestamp !== ts);
      localStorage.setItem('aa2000_saved_projects', JSON.stringify(next));
    }

    // Close detail view and confirmation modal.
    setShowDeleteProjectConfirm(false);
    setSelectedProject(null);
    setSelectedIndex(null);
  };

  /**
   * openProject: Selects a project record to view in the SurveySummary component.
   */
  const openProject = (proj: any) => {
    const saved = localStorage.getItem('aa2000_saved_projects');
    if (saved) {
      const parsed = JSON.parse(saved);
      const actualIndex = parsed.findIndex((p: any) => p.timestamp === proj.timestamp);
      setSelectedProject(actualIndex >= 0 ? parsed[actualIndex] : proj);
      setSelectedIndex(actualIndex);
    }
  };

  /**
   * filteredProjects: Sales/Admin finalized list should show approved records only.
   */
  const filteredProjects = useMemo(() => {
    const getSortDate = (item: any) =>
      new Date(
        item?.project?.finalization?.actedAt ||
        item?.project?.completedAt ||
        item?.project?.startDate ||
        item?.timestamp ||
        0
      ).getTime();
    const getSortName = (item: any) => String(item?.project?.name || '').toLowerCase();
    const sorted = [...projects].sort((a, b) => {
      if (projectSortMode === 'oldest') return getSortDate(a) - getSortDate(b);
      if (projectSortMode === 'name-asc') return getSortName(a).localeCompare(getSortName(b));
      if (projectSortMode === 'name-desc') return getSortName(b).localeCompare(getSortName(a));
      return getSortDate(b) - getSortDate(a);
    });
    return sorted.filter((item) => {
      const status = item.project?.status;
      return status === 'Finalized' || status === 'Finalized - Approved';
    }).filter((item) => {
      const filterTargetDate = item.project?.finalization?.actedAt || item.timestamp || item.project?.startDate;
      return matchDateFilter(filterTargetDate, dateFilter);
    }).filter((item) => {
      const query = searchQuery.toLowerCase();
      const p = item.project;
      const types = [item.cctvData?'cctv':'', item.faData?'fire':'', item.fpData?'fire protection':'', item.acData?'access':'', item.baData?'burglar':'', item.otherData?'other':''].join(' ');
      const dateFormatted = new Date(item.timestamp).toLocaleDateString().toLowerCase();
      return (p.name+p.clientName+p.location+p.technicianName+types+dateFormatted).toLowerCase().includes(query);
    });
  }, [projects, projectSortMode, dateFilter, searchQuery]);

  // UI RENDERING - Report Details Overlay
  if (selectedProject) {
    const isOwner = userRole === 'TECHNICIAN' && user?.fullName === selectedProject.project.technicianName;
    // Sales/Admin should not be able to delete final reports from the list view.
    const canDelete = isOwner;
    const isFinalizedApproved = selectedProject.project?.status === 'Finalized - Approved' || selectedProject.project?.status === 'Finalized';
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950 animate-fade-in overflow-hidden">
        <header className="relative z-30 flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 bg-[#0a1628] p-4 text-white shadow-lg">
          <button
            type="button"
            onClick={() => { setShowDeleteProjectConfirm(false); setSelectedProject(null); }}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-black uppercase tracking-tight hover:bg-white/10"
          >
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            List
          </button>
          <div className="min-w-0 flex-1 pt-0.5 text-right">
            <h2 className="truncate text-[10px] font-black uppercase tracking-widest text-blue-200/90">Finalized report</h2>
            <p className="truncate text-sm font-bold text-white">{selectedProject.project?.name || 'Project'}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteProjectConfirm(true)}
                className="rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black uppercase shadow-md transition hover:bg-red-500 active:scale-95"
              >
                <i className="fas fa-trash mr-1" aria-hidden="true"></i> Delete
              </button>
            )}
            {isFinalizedApproved && userRole === 'ADMIN' && (
              <button
                type="button"
                title="Download finalized project report (PDF)."
                onClick={handleDownloadPDF}
                disabled={sending}
                className={`inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-70 ${sending ? 'cursor-wait' : ''}`}
              >
                {sending ? <i className="fas fa-circle-notch animate-spin" aria-hidden="true"></i> : <i className="fas fa-file-pdf" aria-hidden="true"></i>}
                {sending ? 'Generating…' : 'Download PDF'}
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <SurveySummary 
            userRole={userRole} 
            project={selectedProject.project} 
            cctvData={selectedProject.cctvData} 
            faData={selectedProject.faData} 
            fpData={selectedProject.fpData}
            acData={selectedProject.acData} 
            baData={selectedProject.baData}
            otherData={selectedProject.otherData} 
            estimations={selectedProject.estimations}
            onDone={() => setSelectedProject(null)} 
            hideDoneButton={true}
            onDeleteSurvey={handleDeleteSurvey}
            onEditAudit={onEditAuditFromList && selectedIndex != null && selectedIndex >= 0 ? (surveyType) => onEditAuditFromList(selectedProject, selectedIndex, surveyType) : undefined}
          />
          {showDeleteProjectConfirm && (
            <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDeleteProjectConfirm(false)}>
              <div
                className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-bold text-slate-800 text-center">
                  Are you sure you want to permanently delete this final report?
                </p>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteProjectConfirm(false)}
                    className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black rounded-xl text-[10px] uppercase tracking-wider"
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // UI RENDERING - Project List Home
  return (
    <PortalLayout
      user={user!}
      userRole={userRole}
      theme={theme}
      onThemeChange={onThemeChange}
      compactMode={compactMode}
      onCompactModeChange={onCompactModeChange}
      activeNav="finalized"
      onNavigate={onPortalNavigate}
      onOpenProfile={onOpenProfile}
      onLogout={onLogout}
      onNotificationNavigate={onNotificationNavigate}
      headerTitle="Finalized reports"
    >
      <div className="flex min-h-full flex-col overflow-hidden bg-white dark:bg-slate-950">
      <div className="z-10 shrink-0 border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900/80 md:px-5">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 md:text-lg">
              Finalized reports
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Search by company, project, location, or filter by finalized date.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
              <i className="fas fa-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" aria-hidden="true"></i>
              <input
                type="text"
                placeholder="Company, project, or location"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-11 text-sm text-slate-900 shadow-sm transition focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={() => startVoiceInput('search', setSearchQuery)}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition ${activeVoiceField === 'search' ? 'animate-pulse text-red-500' : 'text-slate-500 hover:bg-slate-200/80 hover:text-blue-800 dark:hover:bg-slate-700 dark:hover:text-blue-200'}`}
                aria-label="Search with voice"
              >
                <i className="fas fa-microphone text-sm" aria-hidden="true"></i>
              </button>
            </div>
            <button
              type="button"
              onClick={() => openNativeDatePicker(finalizedDateInputRef.current)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700/80"
              aria-label="Open finalized reports date picker"
            >
              <i className="fas fa-calendar-alt text-blue-700 dark:text-blue-300" aria-hidden="true"></i>
              <span>{dateFilter.specificDate ? toDisplayDateMDY(dateFilter.specificDate) : 'All dates'}</span>
            </button>
            <input
              ref={finalizedDateInputRef}
              type="date"
              value={dateFilter.specificDate}
              onChange={(e) =>
                setDateFilter((prev) => ({
                  ...prev,
                  specificDate: e.target.value,
                }))
              }
              className="sr-only"
              aria-label="Finalized reports date filter in M/D/YYYY format"
            />
            <label className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
              <i className="fas fa-sort text-blue-700 dark:text-blue-300" aria-hidden="true"></i>
              <select
                value={projectSortMode}
                onChange={(e) => onProjectSortModeChange(e.target.value as ProjectSortMode)}
                className="bg-transparent text-sm font-semibold outline-none"
                aria-label="Sort finalized projects"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3 overflow-y-auto bg-slate-50/50 p-3 dark:bg-slate-950 md:gap-3.5 md:p-5">
        {filteredProjects.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 pt-10 text-slate-300">
            <i className="fas fa-search text-5xl opacity-20"></i>
            <p className="text-[10px] font-bold uppercase tracking-widest">No reports yet</p>
          </div>
        ) : (
          filteredProjects.map((item) => {
            const status = item.project?.status as Project['status'] | undefined;
            const isApprovedFinal = status === 'Finalized' || status === 'Finalized - Approved';
            const isCompleted = status === 'Completed';
            const surveyTags = [
              item.cctvData && { label: 'CCTV', dot: 'bg-[#003399]' },
              item.faData && { label: 'FIRE', dot: 'bg-[#ED3237]' },
              item.fpData && { label: 'FIRE PRO', dot: 'bg-red-800' },
              item.acData && { label: 'ACCESS', dot: 'bg-amber-500' },
              item.baData && { label: 'BURGLAR', dot: 'bg-blue-700' },
              item.otherData && { label: 'OTHER', dot: 'bg-slate-500' },
            ].filter(Boolean) as { label: string; dot: string }[];
            const badgeCount = Math.max(surveyTags.length, 1);
            const finalizedIso =
              toIsoDate(item.project?.finalization?.actedAt) ||
              toIsoDate(item.timestamp) ||
              toDisplayDateMDY(item.timestamp);
            return (
              <div key={item.timestamp} className="relative animate-fade-in">
                <button
                  type="button"
                  onClick={() => openProject(item)}
                  className="w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-sm ring-1 ring-slate-900/[0.04] transition-[box-shadow,transform,border-color] hover:border-slate-300 hover:shadow-md active:scale-[0.995] dark:border-slate-700 dark:bg-slate-900/40 dark:ring-white/[0.06] dark:hover:border-slate-600"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/40 px-3 py-2.5 dark:border-slate-700 dark:from-slate-800/90 dark:to-slate-900/80 sm:px-4">
                    <div className="min-w-0 flex-1 text-left">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50 sm:text-[0.9375rem]">
                        {item.project.name}
                      </h3>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                        {item.project.clientName || 'Company'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold tabular-nums text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        title="Survey modules captured in this report"
                      >
                        <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
                          <i className="fas fa-layer-group text-[10px]"></i>
                        </span>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                      {isApprovedFinal ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/50 dark:text-emerald-100"
                          title="Approved by Sales / Admin"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                          Approved
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                            isCompleted
                              ? 'border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/50 dark:text-emerald-100'
                              : 'border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            aria-hidden="true"
                          />
                          {isCompleted ? 'Completed' : 'Ongoing'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
                    <div className="min-w-0 flex-1 space-y-2 text-left">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.project.technicianName || '—'}
                        </p>
                        <span className="hidden text-slate-300 sm:inline dark:text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          <span className="text-blue-700 dark:text-blue-300">Report</span>
                          <span className="mx-1 text-slate-300 dark:text-slate-600">—</span>
                          Finalized site survey
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>
                          <span className="font-medium text-slate-500 dark:text-slate-500">Date</span>{' '}
                          {finalizedIso}
                        </span>
                        <span className="hidden text-slate-300 sm:inline dark:text-slate-600" aria-hidden="true">
                          |
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium text-slate-500 dark:text-slate-500">Location</span>{' '}
                          <span className="text-slate-700 dark:text-slate-300">
                            {item.project.locationName || item.project.location || '—'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div
                      className="min-w-0 border-t border-slate-100 pt-3 dark:border-slate-700 sm:w-[min(42%,15.5rem)] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
                      aria-label="Survey types"
                    >
                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <i className="fas fa-clipboard-list text-blue-700 dark:text-blue-300" aria-hidden="true"></i>
                        Surveys
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {surveyTags.length === 0 ? (
                          <li className="text-xs font-medium text-slate-500 dark:text-slate-400">No survey data</li>
                        ) : (
                          surveyTags.map((tag) => (
                            <li key={tag.label}>
                              <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tag.dot}`} aria-hidden="true" />
                                <span className="min-w-0 truncate">{tag.label}</span>
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>

                </button>
              </div>
            );
          })
        )}
      </div>
      </div>
    </PortalLayout>
  );
};

export default CurrentProjects;
