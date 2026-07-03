import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: string;
  title: string;
  companyName: string;
  date: string;
  read: boolean;
  type: 'ongoing' | 'upcoming' | 'missing' | 'approval' | 'finalize';
}

interface Props {
  notifications: Notification[];
  onViewAll: (type: string) => void;
}

const typeConfig = {
  ongoing:  { color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   label: 'Ongoing',  dot: '#2563EB', icon: '⚡' },
  upcoming: { color: '#059669', bg: 'rgba(5,150,105,0.08)',   label: 'Upcoming', dot: '#059669', icon: '📅' },
  missing:  { color: '#D97706', bg: 'rgba(217,119,6,0.08)',   label: 'Missing',  dot: '#D97706', icon: '⚠️' },
  approval: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',  label: 'Approval', dot: '#7C3AED', icon: '🛡️' },
  finalize: { color: '#059669', bg: 'rgba(5,150,105,0.08)',   label: 'Finalize', dot: '#059669', icon: '✅' },
};

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

export default function NotificationBell({ notifications, onViewAll }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Group notifications by type for display
  const grouped = (Object.keys(typeConfig) as Array<keyof typeof typeConfig>).reduce<
    Record<string, Notification[]>
  >((acc, type) => {
    const items = notifications.filter(n => n.type === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-500 btn-press"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[9px] font-black rounded-full flex items-center justify-center px-1 text-white bg-red-500 shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-84 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-scale-in"
          style={{ width: 320 }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <h3 className="text-xs font-black text-slate-800">Notifications</h3>
            </div>
            {unread > 0 && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                {unread} unread
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-400">All caught up!</p>
                <p className="text-[10px] text-slate-300 mt-0.5">No new notifications</p>
              </div>
            ) : (
              // Show flat list (up to 8 items)
              notifications.slice(0, 8).map(n => {
                const cfg = typeConfig[n.type] || typeConfig.ongoing;
                return (
                  <div
                    key={n.id}
                    onClick={() => { setOpen(false); onViewAll(n.type); }}
                    className="px-4 py-3 cursor-pointer transition-colors flex items-start gap-3 border-b border-slate-50 hover:bg-slate-50 group"
                    style={{ background: !n.read ? `${cfg.bg}` : 'transparent' }}
                  >
                    {/* Type icon */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] truncate ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium truncate">
                          {n.companyName}
                        </span>
                        <span className="text-[9px] text-slate-300 shrink-0">· {n.date}</span>
                      </div>
                    </div>
                    {/* Unread indicator */}
                    {!n.read && (
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: cfg.dot }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50/80">
            <button
              onClick={() => { setOpen(false); onViewAll('notifications'); }}
              className="w-full py-2 text-xs font-bold text-[#2563EB] hover:bg-white rounded-xl transition-all"
            >
              View All Notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { Notification };
