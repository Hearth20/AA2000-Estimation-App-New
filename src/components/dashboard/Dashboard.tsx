import { useState, useMemo, useEffect, useRef } from 'react';
import type { User, Project } from '../../App';
import CreateProjectModal from '../projects/CreateProjectModal';
import Sidebar from './Sidebar';
import type { View } from './Sidebar';
import NotificationBell from '../notifications/NotificationBell';
import type { Notification } from '../notifications/NotificationBell';
import Home from './Home';
import CompanyDetail from '../projects/CompanyDetail';
import AccountDropdown from './AccountDropdown';
import { getRoleTheme } from '../../utils/RoleTheme';
import CalendarView from './CalendarView';
import ThemeToggle from './ThemeToggle';

interface Props {
  user: User;
  onLogout: () => void;
  projects: Project[];
  notifications: Notification[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (project: Project, keepOnHome?: boolean) => void;
  onSettings: () => void;
  onNavigateToCreate: () => void;
  selectedCompanyProject: Project | null;
  setSelectedCompanyProject: (project: Project | null) => void;
  onMarkNotificationsAsRead?: (type: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onUpdateProject?: (project: Project) => void;
  darkMode?: boolean;
  onToggleTheme?: () => void;
}

type SortMode = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const viewTitles: Record<string, string> = {
  home: 'Home', dashboard: 'Dashboard', workspace: 'Workspace', todo: 'To-do',
  assignment: 'All Assignments', missing: 'Missing Requirements', done: 'Done',
  history: 'History / Archive', approval: 'Approval Pipeline', finalize: 'Finalize Review',
  ongoing: 'Ongoing Surveys', upcoming: 'Upcoming Surveys', 'missing-notif': 'Missing Alerts',
  'approval-notif': 'Approval Alerts', 'finalize-notif': 'Finalize Alerts',
  notifications: 'All Notifications',
};

function filterProjects(projects: Project[], view: string): Project[] {
  const actualProjects = projects.filter(p => p.buildingType !== 'Other');
  const today = new Date().toISOString().split('T')[0];
  switch (view) {
    case 'workspace': case 'todo':
      return actualProjects.filter(p => p.status === 'Pending' || p.status === 'In Progress');
    case 'assignment': return actualProjects;
    case 'missing': return actualProjects.filter(p => !p.status || p.status === 'Pending');
    case 'done': return actualProjects.filter(p => p.status === 'Completed' || p.status?.includes('Finalized'));
    case 'history': return actualProjects.filter(p => p.status === 'Completed');
    case 'ongoing':
      return actualProjects.filter(p => {
        const isCompleted = p.status === 'Completed' || p.status?.includes('Finalized');
        return !isCompleted && p.startDate === today;
      });
    case 'upcoming':
      return actualProjects.filter(p => {
        const isCompleted = p.status === 'Completed' || p.status?.includes('Finalized');
        return !isCompleted && !!p.startDate && p.startDate > today;
      });
    case 'missing-notif':
      return actualProjects.filter(p => {
        const isCompleted = p.status === 'Completed' || p.status?.includes('Finalized');
        return !isCompleted && (!p.startDate || p.startDate < today);
      });
    case 'approval': case 'approval-notif':
      return actualProjects.filter(p => p.status === 'Finalized');
    case 'finalize': case 'finalize-notif':
      return actualProjects.filter(
        p => p.status === 'Finalized - Approved' || p.status === 'Finalized - Rejected' || p.status === 'Completed'
      );
    default: return actualProjects;
  }
}

function sortProjects(projects: Project[], sort: SortMode): Project[] {
  const s = [...projects];
  switch (sort) {
    case 'newest': return s.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'oldest': return s.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'name-asc': return s.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc': return s.sort((a, b) => b.name.localeCompare(a.name));
  }
}

const statusConfig: Record<string, { color: string; bg: string; bar: string }> = {
  'In Progress':         { color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   bar: '#2563EB' },
  'Pending':             { color: '#D97706', bg: 'rgba(217,119,6,0.08)',   bar: '#D97706' },
  'Completed':           { color: '#059669', bg: 'rgba(5,150,105,0.08)',   bar: '#059669' },
  'Finalized - Approved':{ color: '#059669', bg: 'rgba(5,150,105,0.08)',   bar: '#059669' },
  'Finalized - Rejected':{ color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   bar: '#DC2626' },
  'Finalized':           { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',  bar: '#7C3AED' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ||
    Object.entries(statusConfig).find(([key]) => status && status.includes(key))?.[1] || {
      color: '#64748B', bg: 'rgba(100,116,139,0.08)', bar: '#64748B',
    };
  return (
    <span
      className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {status || 'Pending'}
    </span>
  );
}

const typeConfig = {
  ongoing:  { color: '#2563EB', bg: 'rgba(37,99,235,0.08)',  label: 'Ongoing',  dot: '#2563EB' },
  upcoming: { color: '#059669', bg: 'rgba(5,150,105,0.08)',  label: 'Upcoming', dot: '#059669' },
  missing:  { color: '#D97706', bg: 'rgba(217,119,6,0.08)',  label: 'Missing',  dot: '#D97706' },
  approval: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Approval', dot: '#7C3AED' },
  finalize: { color: '#059669', bg: 'rgba(5,150,105,0.08)',  label: 'Finalize', dot: '#059669' },
};

// Animated stat card
function StatCard({
  label,
  value,
  sub,
  emoji,
  color,
  bg,
  delay = 0,
  onClick,
}: {
  label: string;
  value: number;
  sub: string;
  emoji: string;
  color: string;
  bg: string;
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex-1 min-w-0 bg-white rounded-2xl p-5 border relative overflow-hidden hover-lift animate-fade-in-up cursor-pointer"
      style={{ borderColor: '#E2E8F0', animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
          style={{ background: bg }}
        >
          {emoji}
        </div>
      </div>
      <p className="text-3xl font-black animate-count" style={{ color }}>{value}</p>
      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

export default function Dashboard({
  user,
  onLogout,
  projects,
  notifications,
  onSelectProject,
  onCreateProject,
  onSettings,
  onNavigateToCreate,
  selectedCompanyProject,
  setSelectedCompanyProject,
  onMarkNotificationsAsRead,
  onDeleteProject,
  onUpdateProject,
  darkMode,
  onToggleTheme,
}: Props) {
  const [view, setView] = useState<View>('home');
  const [showCreate, setShowCreate] = useState(false);
  const [isCompanyMode, setIsCompanyMode] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'ongoing' | 'upcoming' | 'missing' | 'approval' | 'finalize'>('ongoing');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('aa2000_pinned'); return s ? new Set(JSON.parse(s)) : new Set(); }
    catch { return new Set(); }
  });
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    localStorage.setItem('aa2000_pinned', JSON.stringify([...pinned]));
  }, [pinned]);

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const theme = getRoleTheme(user.role);

  useEffect(() => { setProjectList(projects); }, [projects]);

  useEffect(() => {
    if (onMarkNotificationsAsRead) {
      if (view === 'ongoing') onMarkNotificationsAsRead('ongoing');
      else if (view === 'upcoming') onMarkNotificationsAsRead('upcoming');
      else if (view === 'missing-notif') onMarkNotificationsAsRead('missing');
      else if (view === 'approval-notif') onMarkNotificationsAsRead('approval');
      else if (view === 'finalize-notif') onMarkNotificationsAsRead('finalize');
    }
  }, [view, onMarkNotificationsAsRead]);

  const isNotification = ['ongoing', 'upcoming', 'missing-notif', 'approval-notif', 'finalize-notif'].includes(view);

  const filtered = useMemo(() => {
    const f = filterProjects(projectList, view);
    const q = search.toLowerCase();
    return sortProjects(
      f.filter(p => p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)),
      sort
    );
  }, [projectList, view, search, sort]);

  const pinnedItems = filtered.filter(p => pinned.has(p.id));
  const unpinnedItems = filtered.filter(p => !pinned.has(p.id));
  const ordered = [...pinnedItems, ...unpinnedItems];

  // Stats
  const companyFolders = projectList.filter(p => p.buildingType === 'Other');
  const actualProjects = projectList.filter(p => p.buildingType !== 'Other');
  const totalProjects = actualProjects.length;
  const companyCount = companyFolders.length;

  // Derive display status for each company folder (matching Home.tsx logic)
  const folderStatusMap: Record<string, string> = {};
  for (const folder of companyFolders) {
    const children = actualProjects.filter(
      p => p.clientName === folder.name || p.clientName === folder.clientName
    );
    if (children.length === 0) {
      folderStatusMap[folder.id] = folder.status;
    } else {
      const priority = ['Completed', 'Finalized - Approved', 'Finalized', 'Finalized - Rejected', 'In Progress', 'Pending'];
      let found = folder.status;
      for (const s of priority) {
        if (children.some(c => c.status === s)) { found = s; break; }
      }
      folderStatusMap[folder.id] = found;
    }
  }

  const pendingCount = companyFolders.filter(p => (folderStatusMap[p.id] || p.status) === 'Pending').length;
  const inProgressCount = companyFolders.filter(p => (folderStatusMap[p.id] || p.status) === 'In Progress').length;
  const completedCount = companyFolders.filter(p => {
    const s = folderStatusMap[p.id] || p.status;
    return s === 'Completed' || s.includes('Finalized');
  }).length;

  const countOngoing = notifications.filter(n => n.type === 'ongoing').length;
  const countUpcoming = notifications.filter(n => n.type === 'upcoming').length;
  const countMissing = notifications.filter(n => n.type === 'missing').length;
  const countApproval = notifications.filter(n => n.type === 'approval').length;
  const countFinalize = notifications.filter(n => n.type === 'finalize').length;

  const categoryCounts = useMemo(() => {
    try {
      const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
      const counts: Record<string, number> = {
        CCTV: 0, FIRE_ALARM: 0, FIRE_PROTECTION: 0, ACCESS_CONTROL: 0, BURGLAR_ALARM: 0, OTHER: 0,
      };
      surveys.forEach((s: any) => { if (s.type && counts[s.type] !== undefined) counts[s.type]++; });
      return counts;
    } catch {
      return { CCTV: 0, FIRE_ALARM: 0, FIRE_PROTECTION: 0, ACCESS_CONTROL: 0, BURGLAR_ALARM: 0, OTHER: 0 };
    }
  }, [projectList]);

  const handleDelete = (id: string) => {
    const target = projectList.find(p => p.id === id);
    const idsToDelete = [id];
    if (target && target.buildingType === 'Other') {
      const children = projectList.filter(
        p => p.buildingType !== 'Other' && (p.clientName === target.name || p.clientName === target.clientName)
      );
      idsToDelete.push(...children.map(p => p.id));
    }
    setProjectList(prev => prev.filter(p => !idsToDelete.includes(p.id)));
    try {
      const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
      const remaining = surveys.filter((s: any) => !idsToDelete.includes(s.projectId));
      localStorage.setItem('aa2000_surveys', JSON.stringify(remaining));
    } catch {}
    setPinned(prev => { const n = new Set(prev); idsToDelete.forEach(dId => n.delete(dId)); return n; });
    idsToDelete.forEach(dId => { if (onDeleteProject) onDeleteProject(dId); });
    setDeleteConfirm(null);
    setMenuOpen(null);
  };

  const handleSaveEdit = (updated: Project) => {
    setProjectList(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (onUpdateProject) onUpdateProject(updated);
    setEditProject(null);
  };

  const handlePin = (id: string) => {
    setPinned(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setMenuOpen(null);
  };

  const navigate = (v: View) => {
    setSelectedCompanyProject(null);
    if (v === 'create-survey') { onNavigateToCreate(); return; }
    setView(v);
  };

  const navigateNotif = (type: string) => {
    setSelectedCompanyProject(null);
    const m: Record<string, View> = {
      notifications: 'notifications', ongoing: 'ongoing', upcoming: 'upcoming',
      missing: 'missing-notif', approval: 'approval-notif', finalize: 'finalize-notif',
    };
    setView(m[type] || 'dashboard');
    if (type === 'notifications' && onMarkNotificationsAsRead) onMarkNotificationsAsRead('all');
  };

  const pipelineStages = [
    { label: 'Pending',     count: pendingCount,     color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'In Progress', count: inProgressCount,  color: theme.primary, bg: theme.primaryAlpha08 },
    { label: 'Completed',   count: completedCount,   color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  ];

  // Today's date
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div
      className="flex h-screen overflow-hidden w-full"
      style={{
        background: darkMode
          ? '#0F172A'
          : 'radial-gradient(ellipse at 20% 20%, rgba(191,219,254,0.2) 0%, transparent 55%), #F8FAFC',
      }}
    >
      <div className="h-screen sticky top-0 z-40">
        <Sidebar user={user} currentView={view} onNavigate={navigate} notifications={notifications} darkMode={darkMode} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

        {/* ══════════════════════════════════════════
            TOP NAVIGATION BAR (Glassmorphism)
        ══════════════════════════════════════════ */}
        <div
          className="sticky top-0 z-50 px-6 h-14 flex items-center justify-between shrink-0 glass"
          style={{ borderBottom: `1px solid ${darkMode ? 'rgba(51,65,85,0.8)' : 'rgba(226,232,240,0.8)'}` }}
        >
          {/* Left: System status + date */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200 rounded-full px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[9px] font-bold text-emerald-800 tracking-wider">ONLINE</span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 hidden sm:block">{todayLabel}</span>
          </div>

          {/* Right: Search + Notifications + Account */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden sm:block">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input w-52 pl-9 pr-3 py-1.5 rounded-xl text-[11px] font-medium bg-slate-50/80 border border-slate-200 outline-none text-slate-700 focus:bg-white transition-all"
              />
            </div>

            {/* Notification Bell */}
            <NotificationBell notifications={notifications} onViewAll={navigateNotif} />

            {/* Theme Toggle (Dark/Light Mode) */}
            {onToggleTheme && <ThemeToggle darkMode={!!darkMode} onToggle={onToggleTheme} />}

            {/* Divider */}
            <div className="w-px h-5 bg-slate-200" />

            {/* Account dropdown */}
            <AccountDropdown user={user} onLogout={onLogout} onSettings={onSettings} />
          </div>
        </div>

        {/* ══════════════════════════════════════════
            PAGE CONTENT
        ══════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto">
          {selectedCompanyProject ? (
            <CompanyDetail
              user={user}
              companyProject={selectedCompanyProject}
              projects={projectList}
              onBack={() => setSelectedCompanyProject(null)}
              onSelectProject={onSelectProject}
              onNewSurvey={onNavigateToCreate}
              onDeleteProject={handleDelete}
            />
          ) : view === 'home' ? (
            <Home
              user={user}
              projects={projectList}
              onSelectCompany={companyName => {
                const found = projectList.find(p => p.name === companyName);
                if (found) setSelectedCompanyProject(found);
              }}
              onSelectProject={onSelectProject}
              onNewCompanyClick={() => { setIsCompanyMode(true); setShowCreate(true); }}
              onDeleteProject={handleDelete}
              onUpdateProject={handleSaveEdit}
            />
          ) : view === 'calendar' ? (
            <CalendarView
              projects={projectList}
              onSelectProject={onSelectProject}
              userRole={user.role || 'TECHNICIAN'}
            />
          ) : (
            <div className="pb-10">
              {/* Dashboard view: title + stats */}
              {view === 'dashboard' && (
                <>
                  <div className="px-6 pt-6 animate-fade-in-up">
                    <div className="flex items-end justify-between">
                      <div>
                        <h1
                          className="text-2xl font-black tracking-tight"
                          style={{ color: '#0F172A', fontFamily: 'Manrope, Inter, sans-serif' }}
                        >
                          Dashboard
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          AA2000 Security & Technology Solutions Inc. · Estimation Platform
                        </p>
                      </div>
                      {/* Role badge */}
                      <span
                        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: theme.primaryAlpha08, color: theme.primary }}
                      >
                        {theme.roleEmoji} {user.role === 'ADMIN' ? 'Admin' : user.role === 'SALES' ? 'Sales' : 'Technician'}
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="px-6 pt-5 flex flex-row gap-4 w-full flex-wrap">
                    <StatCard label="Companies"   value={companyCount}    sub="Company folders"   emoji="🏢" color={theme.primary} bg={theme.primaryAlpha08} delay={0}   onClick={() => navigate('home')} />
                    <StatCard label="Projects"    value={totalProjects}   sub="All site surveys"  emoji="📋" color={theme.primary} bg={theme.primaryAlpha08} delay={50}  onClick={() => navigate('assignment')} />
                    <StatCard label="In Progress" value={inProgressCount} sub="Ongoing surveys"   emoji="⚡" color={theme.primary} bg={theme.primaryAlpha08} delay={100} onClick={() => navigate('workspace')} />
                    <StatCard label="Pending"     value={pendingCount}    sub="Awaiting start"    emoji="🗓️" color="#D97706" bg="rgba(217,119,6,0.08)"  delay={150} onClick={() => navigate('workspace')} />
                    <StatCard label="Completed"   value={completedCount}  sub="Finalized surveys" emoji="✅" color="#059669" bg="rgba(5,150,105,0.08)" delay={200} onClick={() => navigate('done')} />
                  </div>

                  {/* Pipeline + Categories */}
                  <div className="px-6 pt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Pipeline */}
                    <div
                      className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-fade-in-up delay-225"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">Survey Workflow Pipeline</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Project status distribution</p>
                        </div>
                        <span
                          className="text-[9px] font-bold px-2 py-1 rounded-full"
                          style={{ background: theme.primaryAlpha08, color: theme.primary }}
                        >
                          {totalProjects} total
                        </span>
                      </div>

                      <div className="space-y-4">
                        {pipelineStages.map(stage => {
                          const pct = totalProjects > 0 ? Math.round((stage.count / totalProjects) * 100) : 0;
                          return (
                            <div key={stage.label}>
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                                  <span>{stage.label}</span>
                                </div>
                                <span className="text-slate-400">
                                  {stage.count} project{stage.count !== 1 ? 's' : ''} · {pct}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`, background: stage.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {totalProjects === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 mt-4">
                          <span className="text-2xl">📊</span>
                          <p className="text-xs font-bold text-slate-400">No projects yet. Create one to start tracking.</p>
                        </div>
                      )}
                    </div>

                    {/* Survey Categories */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col animate-fade-in-up delay-300">
                      <div className="mb-4">
                        <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">Survey Categories</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Available system types</p>
                      </div>
                      <div className="space-y-2 flex-1">
                        {[
                          { key: 'CCTV',             label: 'CCTV Surveillance',  icon: '📷', color: '#1E3A8A', bg: '#EFF6FF' },
                          { key: 'FIRE_ALARM',        label: 'Fire Alarm System',  icon: '🔔', color: '#B91C1C', bg: '#FEF2F2' },
                          { key: 'FIRE_PROTECTION',   label: 'Fire Protection',    icon: '🔥', color: '#D97706', bg: '#FFFBEB' },
                          { key: 'ACCESS_CONTROL',    label: 'Access Control',     icon: '🔑', color: '#047857', bg: '#ECFDF5' },
                          { key: 'BURGLAR_ALARM',     label: 'Burglar Alarm',      icon: '🛡️', color: '#6D28D9', bg: '#F5F3FF' },
                          { key: 'OTHER',             label: 'Other Systems',      icon: '⚙️', color: '#334155', bg: '#F8FAFC' },
                        ].map(cat => {
                          const count = categoryCounts[cat.key] || 0;
                          return (
                            <div
                              key={cat.label}
                              className="flex items-center justify-between px-3 py-2 rounded-xl transition-all hover:scale-[1.01]"
                              style={{ background: cat.bg }}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm">{cat.icon}</span>
                                <span className="text-[11px] font-bold" style={{ color: cat.color }}>{cat.label}</span>
                              </div>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/70 text-slate-700 border border-white shadow-sm">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Project Table (non-dashboard, non-notifications views) */}
              {view !== 'dashboard' && view !== 'notifications' && (
                <div className="px-6 pt-6">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in-up">
                    {/* Table header */}
                    <div
                      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4"
                      style={{ borderBottom: '1px solid #F1F5F9' }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-800 uppercase tracking-tight">
                            {viewTitles[view] || 'Projects'}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: theme.primaryAlpha08, color: theme.primary }}
                          >
                            {ordered.length}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          AA2000 Security · Estimation Platform
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:max-w-xs">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search projects..."
                            className="search-input w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:bg-white transition-all"
                          />
                        </div>
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
                      </div>
                    </div>

                    {/* Table body */}
                    <div className="overflow-x-auto">
                      {ordered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl animate-float-a"
                            style={{ background: theme.primaryAlpha08 }}
                          >
                            📋
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-600">No projects found</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {user.role === 'ADMIN' ? 'Create a new project to get started' : 'No assignments in this view yet'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              <th className="py-3 pl-6">Project / Client</th>
                              <th className="py-3 text-center">Status</th>
                              <th className="py-3 text-center">Date</th>
                              <th className="py-3 pr-6 text-right" />
                            </tr>
                          </thead>
                          <tbody>
                            {ordered.map((project, i) => {
                              const isPinned = pinned.has(project.id);
                              const isOpen = menuOpen === project.id;
                              const statusBar =
                                Object.entries(statusConfig).find(([key]) => project.status?.includes(key))?.[1]?.bar || '#64748B';

                              return (
                                <tr
                                  key={project.id}
                                  onClick={() => onSelectProject(project)}
                                  className="hover:bg-slate-50/80 cursor-pointer border-b border-slate-50 transition-colors group animate-fade-in-up"
                                  style={{ animationDelay: `${i * 30}ms` }}
                                >
                                  <td className="py-3.5 pl-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: statusBar }} />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-800">{project.name}</span>
                                          {isPinned && (
                                            <span
                                              className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide"
                                              style={{ background: theme.primaryAlpha08, color: theme.primary }}
                                            >
                                              Pinned
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                          {project.clientName} · {project.location}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 text-center">
                                    <StatusBadge status={project.status} />
                                  </td>
                                  <td className="py-3.5 text-center text-[11px] font-medium text-slate-500">
                                    {project.startDate || '—'}
                                  </td>
                                  <td className="py-3.5 pr-6 text-right relative" onClick={e => e.stopPropagation()}>
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
                                        <div className="absolute right-4 top-10 z-30 w-44 rounded-xl bg-white border border-slate-200 py-1.5 shadow-xl text-left animate-scale-in">
                                          <button
                                            onClick={() => { setEditProject(project); setMenuOpen(null); }}
                                            className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            Edit Project
                                          </button>
                                          <button
                                            onClick={() => handlePin(project.id)}
                                            className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                            {isPinned ? 'Unpin' : 'Pin Project'}
                                          </button>
                                          <button
                                            onClick={() => onSelectProject(project)}
                                            className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            View Details
                                          </button>
                                          <div className="border-t border-slate-100 my-1" />
                                          <button
                                            onClick={() => { setDeleteConfirm(project.id); setMenuOpen(null); }}
                                            className="w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete Project
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notification View */}
              {view === 'notifications' && (
                <div className="px-6 pt-6">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in-up">
                    {/* Tabs */}
                    <div className="px-6 pt-4 pb-0 border-b border-slate-100">
                      <div className="flex flex-wrap gap-1">
                        {[
                          { key: 'ongoing',  label: 'Ongoing',  count: countOngoing,  color: '#2563EB' },
                          { key: 'upcoming', label: 'Upcoming', count: countUpcoming, color: '#059669' },
                          { key: 'missing',  label: 'Missing',  count: countMissing,  color: '#D97706' },
                          ...(user.role === 'ADMIN' || user.role === 'TECHNICIAN' || user.role === 'SALES'
                            ? [
                                { key: 'approval', label: 'Approval', count: countApproval, color: '#7C3AED' },
                                { key: 'finalize', label: 'Finalize', count: countFinalize, color: '#059669' },
                              ]
                            : []),
                        ].map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveNotifTab(tab.key as any)}
                            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all mb-[-1px]"
                            style={
                              activeNotifTab === tab.key
                                ? { borderColor: tab.color, color: tab.color }
                                : { borderColor: 'transparent', color: '#94A3B8' }
                            }
                          >
                            {tab.label}
                            <span
                              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                              style={
                                activeNotifTab === tab.key
                                  ? { background: `${tab.color}15`, color: tab.color }
                                  : { background: '#F1F5F9', color: '#94A3B8' }
                              }
                            >
                              {tab.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-50">
                      {notifications.filter(n => n.type === activeNotifTab).length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3 text-xl">
                            🔔
                          </div>
                          <p className="text-xs font-bold text-slate-400">No alerts in this category</p>
                        </div>
                      ) : (
                        notifications
                          .filter(n => n.type === activeNotifTab)
                          .map(n => {
                            const cfg = typeConfig[n.type] || typeConfig.ongoing;
                            return (
                              <div
                                key={n.id}
                                onClick={() => navigateNotif(n.type)}
                                className="px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors group"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                                  style={{ background: !n.read ? cfg.dot : '#CBD5E1' }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>
                                    {n.title}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-xs text-slate-400 font-medium">
                                      {n.companyName} · {n.date}
                                    </span>
                                    <span
                                      className="text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide"
                                      style={{ background: cfg.bg, color: cfg.color }}
                                    >
                                      {cfg.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modals ── */}
        {showCreate && (
          <CreateProjectModal
            onClose={() => setShowCreate(false)}
            onCreate={p => { onCreateProject(p, isCompanyMode); setProjectList(prev => [...prev, p]); }}
            isCompanyMode={isCompanyMode}
          />
        )}

        {editProject && (
          <EditProjectModal project={editProject} onClose={() => setEditProject(null)} onSave={handleSaveEdit} />
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-white shadow-2xl border border-slate-100 text-center animate-scale-in">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-50">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-black text-slate-800 text-base mb-1">Delete Project?</h3>
              <p className="text-xs text-slate-400 mb-5">This action cannot be undone.</p>
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
      </main>
    </div>
  );
}

// ── Edit Project Modal (unchanged logic) ──
function EditProjectModal({
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
          <h2 className="text-sm font-black text-slate-800">Edit Project</h2>
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
            <label className={labelCls}>Project Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Company Name</label>
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
