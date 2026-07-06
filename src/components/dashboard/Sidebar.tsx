import React, { useState } from 'react';
import type { User } from '../../App';
import type { Notification } from '../notifications/NotificationBell';
import { getRoleTheme } from '../../utils/RoleTheme';
import logo from '../../images/logo.png';

type View =
  | 'home' | 'dashboard' | 'workspace' | 'create-survey'
  | 'todo' | 'assignment' | 'missing' | 'done' | 'history'
  | 'approval' | 'finalize'
  | 'ongoing' | 'upcoming' | 'missing-notif' | 'approval-notif' | 'finalize-notif'
  | 'notifications' | 'calendar';

interface Props {
  user: User;
  currentView: View;
  onNavigate: (view: View) => void;
  notifications?: Notification[];
  darkMode?: boolean;
}

const navIcons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  dashboard: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  workspace: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  'create-survey': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  assignment: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  missing: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  done: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  history: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  approval: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  finalize: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  ongoing: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  upcoming: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'missing-notif': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  'approval-notif': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  'finalize-notif': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  notifications: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
};

export default function Sidebar({ user, currentView, onNavigate, notifications, darkMode }: Props) {
  const isAdmin = user.role === 'ADMIN';
  const theme = getRoleTheme(user.role);
  const [collapsed, setCollapsed] = useState(false);

  // Dark mode sidebar overrides
  const sidebarBg = darkMode ? '#0F172A' : theme.sidebarBg;
  const sidebarBorder = darkMode ? '#1E293B' : theme.sidebarBorder;
  const sidebarText = darkMode ? '#F1F5F9' : '#1E293B';
  const sidebarTextMuted = darkMode ? '#94A3B8' : '#64748B';
  const sidebarTextSubtle = darkMode ? '#64748B' : '#94A3B8';

  const getUnreadCount = (viewName: View) => {
    if (!notifications) return 0;
    if (viewName === 'notifications') {
      return notifications.filter(n => !n.read).length;
    }
    const viewToNotifType: Record<string, string> = {
      ongoing: 'ongoing',
      upcoming: 'upcoming',
      'missing-notif': 'missing',
      'approval-notif': 'approval',
      'finalize-notif': 'finalize',
    };
    const notifType = viewToNotifType[viewName];
    if (!notifType) return 0;
    return notifications.filter(n => n.type === notifType && !n.read).length;
  };

  const getNotificationCount = (viewName: View) => {
    if (!notifications) return 0;
    if (viewName === 'notifications') {
      return notifications.length;
    }
    const viewToNotifType: Record<string, string> = {
      ongoing: 'ongoing',
      upcoming: 'upcoming',
      'missing-notif': 'missing',
      'approval-notif': 'approval',
      'finalize-notif': 'finalize',
    };
    const notifType = viewToNotifType[viewName];
    if (!notifType) return 0;
    return notifications.filter(n => n.type === notifType).length;
  };

  const isNotificationView = [
    'notifications', 'ongoing', 'upcoming', 'missing-notif', 'approval-notif', 'finalize-notif'
  ].includes(currentView);

  const navGroups: { label: string; items: { label: string; view: View; accent?: string }[] }[] = isNotificationView ? [
    {
      label: 'NOTIFICATION',
      items: [
        { view: 'notifications', label: 'All Notifications', accent: theme.primary },
        { view: 'ongoing', label: 'Ongoing Surveys', accent: '#2563EB' },
        { view: 'upcoming', label: 'Upcoming Surveys', accent: '#10B981' },
        { view: 'missing-notif', label: 'Missing Alerts', accent: '#F59E0B' },
        ...((isAdmin || user.role === 'TECHNICIAN' || user.role === 'SALES')
          ? [
              { view: 'approval-notif' as View, label: 'Approval Alerts', accent: '#8B5CF6' },
              { view: 'finalize-notif' as View, label: 'Finalize Alerts', accent: '#10B981' },
            ]
          : []),
      ],
    },
  ] : [
    {
      label: 'SURVEYS',
      items: [
        { view: 'home', label: 'Home' },
        { view: 'dashboard', label: 'Dashboard' },
        { view: 'calendar', label: 'Survey Calendar' },
        { view: 'workspace', label: 'Workspace' },
        { view: 'assignment', label: 'All Projects', accent: theme.primary },
        { view: 'missing', label: 'Missing Specs', accent: '#F59E0B' },
      ],
    },
    {
      label: 'WORKFLOW',
      items: [
        ...((isAdmin || user.role === 'TECHNICIAN' || user.role === 'SALES')
          ? [
              { view: 'approval' as View, label: 'Approval Pipeline', accent: '#8B5CF6' },
              { view: 'finalize' as View, label: 'Finalize Review', accent: '#10B981' },
            ]
          : [{ view: 'done' as View, label: 'Completed Surveys', accent: '#10B981' }]),
        { view: 'history', label: 'History Archive', accent: '#64748B' },
      ],
    },
  ];

  const initials = (user.fullName || user.email || 'Admin User')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const totalUnread = notifications ? notifications.filter(n => !n.read).length : 0;

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden transition-all duration-300"
      style={{
        width: collapsed ? 64 : 240,
        background: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`,
      }}
    >
      {/* ── Brand Logo / Back + Collapse toggle ── */}
      <div
        className="px-3 h-16 flex items-center justify-between shrink-0"
        style={{ borderBottom: `1px solid ${sidebarBorder}` }}
      >
        {isNotificationView ? (
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 font-bold text-xs transition-colors"
            style={{ color: sidebarTextMuted }}
            onMouseEnter={e => (e.currentTarget.style.color = theme.primary)}
            onMouseLeave={e => (e.currentTarget.style.color = sidebarTextMuted)}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!collapsed && <span>Back to Dashboard</span>}
          </button>
        ) : (
          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity min-w-0"
            onClick={() => onNavigate('home')}
          >
            <img
              src={logo}
              alt="AA2000 Logo"
              className="w-8 h-8 rounded-lg shrink-0 transition-transform hover:scale-105 object-contain"
            />
            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <span className="text-sm font-black tracking-tight block" style={{ color: theme.primaryDark }}>
                  AA2000
                </span>
                <p className="text-[8px] font-medium leading-tight text-[#94A3B8]" style={{ marginTop: '0px' }}>
                  Security and Technology Solutions Inc.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1 rounded-md transition-colors shrink-0 ml-auto"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = theme.primary)}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* ── User Profile Card ── */}
      {!isNotificationView && (
        <div
          className="px-3 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${sidebarBorder}` }}
        >
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="relative shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-offset-1"
                style={{
                  background: theme.buttonGradient,
                  boxShadow: `0 0 0 2px ${theme.primary}40`,
                }}
              >
                {initials}
              </div>
              {/* Online indicator */}
              <div
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{ background: '#22C55E' }}
              />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate" style={{ color: sidebarText }}>
                  {user.fullName || user.email}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: theme.primaryAlpha12, color: theme.primary }}
                  >
                    {user.role === 'ADMIN' ? 'Admin' : user.role === 'SALES' ? 'Sales' : 'Tech'}
                  </span>
                  {totalUnread > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">
                      {totalUnread} new
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-3 space-y-5">
        {navGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p
                className="px-2.5 mb-1.5 text-[9px] font-bold uppercase tracking-widest"
                style={{ color: sidebarTextSubtle }}
              >
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = currentView === item.view;
                const isNotifItem = [
                  'notifications', 'ongoing', 'upcoming', 'missing-notif', 'approval-notif', 'finalize-notif'
                ].includes(item.view);

                const count = isNotifItem ? getNotificationCount(item.view) : getUnreadCount(item.view);
                const accentColor = item.accent || theme.primary;

                return (
                  <button
                    key={item.view}
                    onClick={() => onNavigate(item.view)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all duration-150 text-left relative group ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    style={
                      active
                        ? {
                            background: `${theme.primary}12`,
                            color: theme.primary,
                            borderLeft: collapsed ? undefined : `2.5px solid ${theme.primary}`,
                            paddingLeft: collapsed ? undefined : '8px',
                          }
                        : {
                            color: sidebarTextMuted,
                            borderLeft: collapsed ? undefined : '2.5px solid transparent',
                          }
                    }
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = `${theme.primary}08`;
                        (e.currentTarget as HTMLElement).style.color = sidebarText;
                        (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = sidebarTextMuted;
                        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    <span
                      className="shrink-0 transition-colors"
                      style={{ color: active ? theme.primary : sidebarTextSubtle }}
                    >
                      {navIcons[item.view]}
                    </span>

                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {(isNotifItem || count > 0) && (
                          <span
                            className="ml-auto shrink-0 min-w-[18px] px-1.5 py-0.5 rounded-full text-[9px] font-black text-center"
                            style={{
                              background: `${accentColor}15`,
                              color: accentColor,
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom: System status ── */}
      {!collapsed && (
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: `1px solid ${sidebarBorder}` }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[9px] font-bold text-emerald-700 tracking-wider">SYSTEM ONLINE</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1 font-medium">v5.0 · AA2000 Connect</p>
        </div>
      )}
    </aside>
  );
}

export type { View };
