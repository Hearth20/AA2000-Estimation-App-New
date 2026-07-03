import { useState, useMemo, useEffect, useRef } from 'react';
import type { User, Project } from '../../App';
import { getRoleTheme } from '../../utils/RoleTheme';

interface HomeProps {
  user: User;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onSelectCompany: (companyName: string) => void;
  onNewCompanyClick: () => void;
  onDeleteProject?: (projectId: string) => void;
  onUpdateProject?: (project: Project) => void;
}

type SortMode = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const statusConfig: Record<string, { color: string; bg: string; bar: string }> = {
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', bar: '#2563EB' },
  'Pending':     { color: '#D97706', bg: 'rgba(217,119,6,0.08)', bar: '#D97706' },
  'Completed':   { color: '#059669', bg: 'rgba(5,150,105,0.08)', bar: '#059669' },
  'Finalized':   { color: '#059669', bg: 'rgba(5,150,105,0.08)', bar: '#059669' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = Object.entries(statusConfig).find(([key]) => status && status.includes(key))?.[1] || {
    color: '#64748B', bg: 'rgba(100,116,139,0.08)', bar: '#64748B',
  };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {status || 'Pending'}
    </span>
  );
}

// Avatar with initials
function CompanyAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
      style={{ background: `linear-gradient(135deg, ${color}CC, ${color}99)` }}
    >
      {initials}
    </div>
  );
}

// Animated stat pill
function StatPill({
  label,
  value,
  color,
  icon,
  delay = 0,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: string;
  delay?: number;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl animate-fade-in-up"
      style={{
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.2)',
        animationDelay: `${delay}ms`,
      }}
    >
      <span className="text-base">{icon}</span>
      <div>
        <p className="text-[10px] font-bold text-white/70 leading-none">{label}</p>
        <p className="text-base font-black text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function Home({
  user,
  projects,
  onSelectProject,
  onSelectCompany,
  onNewCompanyClick,
  onDeleteProject,
  onUpdateProject,
}: HomeProps) {
  const isAdmin = user.role === 'ADMIN';
  const isSales = user.role === 'SALES';
  const isTechnician = user.role === 'TECHNICIAN';
  const theme = getRoleTheme(user.role);

  // Table & Action States
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('aa2000_pinned');
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Sync projects prop to local state
  useEffect(() => {
    setProjectList(projects);
    // Simulate brief loading state for skeleton
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, [projects]);

  // Sync pinned set to localStorage
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    localStorage.setItem('aa2000_pinned', JSON.stringify([...pinned]));
  }, [pinned]);

  const roleDisplayName = useMemo(() => {
    if (isAdmin) return 'System Administrator';
    if (isSales) return 'Sales Representative';
    if (isTechnician) return 'Field Technician';
    return 'User';
  }, [user.role]);

  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Today's date label
  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, []);

  // Filter projects by relevance to the user role
  const userProjects = useMemo(() => {
    const companyFoldersOnly = projectList.filter(p => p.buildingType === 'Other');
    if (isAdmin || isSales) return companyFoldersOnly;
    return companyFoldersOnly.filter(compFolder => {
      const isAssignedToFolder =
        compFolder.assignedTechnicians?.some(t => t.id === user.id) ||
        compFolder.technicianName === user.fullName;
      const hasAssignedProjects = projectList.some(
        p =>
          p.buildingType !== 'Other' &&
          p.clientName === compFolder.name &&
          (p.assignedTechnicians?.some(t => t.id === user.id) || p.technicianName === user.fullName)
      );
      return isAssignedToFolder || hasAssignedProjects;
    });
  }, [projectList, user, isAdmin, isSales]);

  // Compute KPI stats for hero
  const actualProjects = projectList.filter(p => p.buildingType !== 'Other');
  const pendingCount = actualProjects.filter(p => p.status === 'Pending').length;
  const inProgressCount = actualProjects.filter(p => p.status === 'In Progress').length;
  const completedCount = actualProjects.filter(
    p => p.status === 'Completed' || p.status?.includes('Finalized')
  ).length;
  const today = new Date().toISOString().split('T')[0];
  const todayCount = actualProjects.filter(p => p.startDate === today).length;

  // Search & Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const sorted = [...userProjects];
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === 'oldest') sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name));
    return sorted.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
    );
  }, [userProjects, search, sort]);

  const pinnedItems = filtered.filter(p => pinned.has(p.id));
  const unpinnedItems = filtered.filter(p => !pinned.has(p.id));
  const ordered = [...pinnedItems, ...unpinnedItems];

  const handleDelete = (id: string) => {
    setProjectList(prev => prev.filter(p => p.id !== id));
    if (onDeleteProject) onDeleteProject(id);
    setDeleteConfirm(null);
    setMenuOpen(null);
  };

  const handleSaveEdit = (updated: Project) => {
    setProjectList(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    if (onUpdateProject) onUpdateProject(updated);
    setEditProject(null);
  };

  const handlePin = (id: string) => {
    setPinned(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setMenuOpen(null);
  };

  // Avatar colors for companies (cycle through role-adjacent colors)
  const avatarColors = [
    theme.primary, theme.primaryDark, theme.accent, theme.secondary,
    '#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6',
  ];

  return (
    <div className="px-6 pt-6 pb-10 space-y-6 max-w-7xl mx-auto w-full">

      {/* ══════════════════════════════════════════
          HERO SECTION (Role-Adaptive)
      ══════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-3xl text-white shadow-lg animate-fade-in-up"
        style={{ background: theme.heroGradient }}
      >
        {/* Decorative mesh/grid */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Floating blobs */}
        <div
          className="absolute animate-float-a pointer-events-none"
          style={{
            width: 220, height: 220, right: -40, top: -40,
            borderRadius: '38% 62% 63% 37% / 41% 44% 56% 59%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          className="absolute animate-float-b pointer-events-none"
          style={{
            width: 120, height: 120, right: 80, bottom: -20,
            borderRadius: '63% 37% 37% 63% / 43% 37% 63% 57%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />

        <div className="relative z-10 p-7 flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Left: greeting + copy */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-white/20">
                {theme.roleEmoji} {roleDisplayName}
              </span>
              <span className="text-[10px] text-white/60 font-medium">• {todayLabel}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight" style={{ fontFamily: 'Manrope, Inter, sans-serif' }}>
              {greeting},{' '}
              <span className="text-white/90">{user.fullName?.split(' ')[0] || user.email}!</span>
            </h1>
            <p className="text-xs text-white/70 leading-relaxed font-medium max-w-md">
              {theme.heroSubtitle}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {theme.quickActions.map(({ label, icon }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (label.includes('Survey') || label.includes('New')) onNewCompanyClick();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all btn-press"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)')}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: KPI pills */}
          <div className="flex flex-row md:flex-col flex-wrap gap-2 shrink-0">
            <StatPill label="Total Companies" value={userProjects.length} color={theme.primary} icon="🏢" delay={50} />
            <StatPill label="In Progress" value={inProgressCount} color={theme.primary} icon="⚡" delay={100} />
            <StatPill label="Pending" value={pendingCount} color={theme.primary} icon="🗓️" delay={150} />
            {todayCount > 0 && (
              <StatPill label="Surveys Today" value={todayCount} color={theme.primary} icon="📍" delay={200} />
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          COMPANY LIST CARD
      ══════════════════════════════════════════ */}
      <div
        className="bg-white rounded-3xl shadow-sm overflow-hidden animate-fade-in-up delay-150"
        style={{ border: '1px solid #E2E8F0' }}
      >
        {/* Controls row */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
              All Companies
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: theme.primaryAlpha08, color: theme.primary }}
            >
              {ordered.length}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="search-input w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortMode)}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-600 outline-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>

            {/* New Company Button — Admin only */}
            {isAdmin && (
              <button
                onClick={onNewCompanyClick}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white btn-press shrink-0"
                style={{
                  background: theme.buttonGradient,
                  boxShadow: `0 2px 10px ${theme.primary}30`,
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Company
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="px-4 py-3">
          {isLoading ? (
            // Skeleton loader
            <div className="space-y-3 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-1/3 rounded" />
                    <div className="skeleton h-2 w-1/2 rounded" />
                  </div>
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : ordered.length === 0 ? (
            /* ── Premium Empty State ── */
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl animate-float-a"
                style={{ background: theme.primaryAlpha08 }}
              >
                🏢
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  {search ? 'No companies match your search' : 'No companies assigned yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                  {search
                    ? `Try a different search term or clear the filter.`
                    : isAdmin
                    ? 'Create a new company folder to start organizing projects.'
                    : "Once your administrator assigns projects, they'll appear here."}
                </p>
              </div>
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 rounded-xl text-xs font-bold border transition-all btn-press"
                  style={{ borderColor: theme.primary, color: theme.primary }}
                >
                  Clear Search
                </button>
              ) : isAdmin ? (
                <button
                  onClick={onNewCompanyClick}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all btn-press"
                  style={{ background: theme.buttonGradient, boxShadow: `0 4px 12px ${theme.primary}30` }}
                >
                  + Create First Company
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              {ordered.map((project, i) => {
                const isPinned = pinned.has(project.id);
                const isOpen = menuOpen === project.id;
                const avatarColor = avatarColors[i % avatarColors.length];
                const childProjects = projectList.filter(
                  p => p.buildingType !== 'Other' && p.clientName === project.name
                );
                const progressPct =
                  childProjects.length > 0
                    ? Math.round(
                        (childProjects.filter(p => p.status === 'Completed' || p.status?.includes('Finalized'))
                          .length /
                          childProjects.length) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => onSelectCompany(project.name)}
                    className="flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50/70 transition-all duration-200 cursor-pointer group hover-lift animate-fade-in-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <CompanyAvatar name={project.name} color={avatarColor} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 truncate group-hover:text-slate-900">
                            {project.name}
                          </span>
                          {isPinned && (
                            <span
                              className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
                              style={{ background: theme.primaryAlpha08, color: theme.primary }}
                            >
                              Pinned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-slate-400 truncate">{project.location || '—'}</p>
                          {childProjects.length > 0 && (
                            <span className="text-[9px] text-slate-300 shrink-0">
                              · {childProjects.length} project{childProjects.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {/* Progress bar */}
                        {childProjects.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden max-w-[80px]">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${progressPct}%`, background: avatarColor }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium shrink-0">{progressPct}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={project.status} />
                      {/* Context menu */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuOpen(isOpen ? null : project.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />
                          </svg>
                        </button>

                        {isOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white border border-slate-200 py-1.5 shadow-lg text-left animate-scale-in">
                              <button
                                onClick={() => { setEditProject(project); setMenuOpen(null); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Project
                              </button>
                              <button
                                onClick={() => handlePin(project.id)}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                {isPinned ? 'Unpin' : 'Pin Company'}
                              </button>
                              <button
                                onClick={() => { setMenuOpen(null); onSelectCompany(project.name); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => { setDeleteConfirm(project.id); setMenuOpen(null); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editProject && (
        <EditCompanyModal project={editProject} onClose={() => setEditProject(null)} onSave={handleSaveEdit} />
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white shadow-2xl border border-slate-100 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-50">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-black text-slate-800 text-base mb-1">Delete Company?</h3>
            <p className="text-xs text-slate-400 mb-5">This action cannot be undone. All associated projects will also be removed.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 btn-press"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 shadow-md shadow-red-100 btn-press"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit Company Modal (unchanged logic) ──
function EditCompanyModal({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.clientName);
  const [location, setLocation] = useState(project.location);
  const [status, setStatus] = useState(project.status);
  const [buildingType, setBuildingType] = useState(project.buildingType || '');
  const [floors, setFloors] = useState<number | string>(project.floors ?? '');

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 outline-none focus:border-blue-400 transition-colors font-medium';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-800">Edit Company</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ ...project, name, clientName, location, status, buildingType, floors: typeof floors === 'number' ? floors : undefined });
            onClose();
          }}
          className="p-5 space-y-4"
        >
          <div>
            <label className={labelCls}>Company Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Client / Contact Name</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className={inputCls} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option>Pending</option><option>In Progress</option><option>Completed</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Building Type</label>
              <select value={buildingType} onChange={e => setBuildingType(e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="">Select...</option>
                <option>Office</option><option>Retail</option><option>Warehouse</option>
                <option>School</option><option>Hospital</option><option>Residential</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Floors</label>
            <input type="number" min={1} value={floors} onChange={e => setFloors(Number(e.target.value))} className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 btn-press">
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white btn-press"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
