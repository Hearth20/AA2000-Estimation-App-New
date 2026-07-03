import { useState } from 'react';
import type { User } from '../../App';
import logo from '../../images/aa2000 logo.png';
import { getRoleTheme } from '../../utils/RoleTheme';

interface Props {
  onLogin: (user: User) => void;
}

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    label: 'Site Survey',
    desc: 'On-location security system assessments',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    label: 'Cost Estimation',
    desc: 'Labor, materials & fees in one report',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    label: 'Workflow Tracking',
    desc: 'Assignment → Approval → Finalize pipeline',
  },
];

const roleConfigs: Record<string, { label: string; color: string; activeBg: string; placeholder: string }> = {
  technician: { label: 'Technician', color: '#2563EB', activeBg: '#1D4ED8', placeholder: 'tech@aa2000.com' },
  sales:       { label: 'Sales',      color: '#22C55E', activeBg: '#16A34A', placeholder: 'sales@aa2000.com' },
  admin:       { label: 'Admin',      color: '#4F46E5', activeBg: '#4338CA', placeholder: 'admin@aa2000.com' },
};

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; password?: boolean }>({});
  const [role, setRole] = useState<'technician' | 'sales' | 'admin'>('technician');
  const [loading, setLoading] = useState(false);

  const theme = getRoleTheme(
    role === 'admin' ? 'ADMIN' : role === 'sales' ? 'SALES' : 'TECHNICIAN'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors: { email?: boolean; password?: boolean } = {};
    if (!email.trim()) errors.email = true;
    if (!password.trim()) errors.password = true;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
    onLogin({
      id: role === 'admin' ? 'admin-1' : role === 'sales' ? 'sales-1' : 'tech-1',
      fullName: role === 'admin' ? 'Admin User' : role === 'sales' ? 'Sales User' : 'John Technician',
      email: email || (role === 'admin' ? 'admin@aa2000.com' : role === 'sales' ? 'sales@aa2000.com' : 'tech@aa2000.com'),
      role: role === 'admin' ? 'ADMIN' : role === 'sales' ? 'SALES' : 'TECHNICIAN',
    });
  };

  const rc = roleConfigs[role];

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: 'radial-gradient(ellipse at 60% 20%, rgba(191,219,254,0.35) 0%, #EEF5FF 50%, #F8FAFC 100%)',
      }}
    >
      {/* ── Left Brand Panel ── */}
      <div
        className="hidden lg:flex flex-col w-[480px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}
      >
        {/* Animated mesh grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#1E3A8A 1px, transparent 1px), linear-gradient(90deg, #1E3A8A 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating decorative shapes */}
        <div
          className="absolute animate-float-a pointer-events-none"
          style={{
            width: 140, height: 140, right: -30, top: 60,
            borderRadius: '38% 62% 63% 37% / 41% 44% 56% 59%',
            background: `linear-gradient(135deg, ${theme.primary}22, ${theme.accent}18)`,
          }}
        />
        <div
          className="absolute animate-float-b pointer-events-none"
          style={{
            width: 90, height: 90, right: 60, top: 220,
            borderRadius: '63% 37% 37% 63% / 43% 37% 63% 57%',
            background: `linear-gradient(135deg, ${theme.accent}15, ${theme.primary}10)`,
          }}
        />
        <div
          className="absolute animate-float-a pointer-events-none"
          style={{
            width: 60, height: 60, left: 20, bottom: 200,
            borderRadius: '50%',
            background: `${theme.primary}12`,
          }}
        />

        {/* Logo */}
        <div className="flex items-center justify-center mb-4 relative z-10">
          <img src={logo} alt="AA2000 Logo" className="h-38 object-contain" />
        </div>

        {/* Headline */}
        <div className="relative z-10 mt-2 animate-fade-in-up">
          <h1 className="text-4xl font-black leading-tight mb-4 text-[#0F172A]" style={{ fontFamily: 'Manrope, Inter, sans-serif' }}>
            Survey smarter,<br />
            <span style={{ color: theme.primary }}>estimate faster.</span>
          </h1>
          <p className="text-sm leading-relaxed mb-8 text-slate-500 font-medium">
            Built for field technicians and sales teams managing electronic security installations across multiple sites in the Philippines.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map((f, i) => (
              <div
                key={f.label}
                className="flex items-start gap-4 animate-fade-in-up"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-105"
                  style={{
                    background: `${theme.primary}10`,
                    color: theme.primary,
                    border: `1px solid ${theme.primary}20`,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1E293B]">{f.label}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-auto pt-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-[10px] font-bold text-emerald-700 tracking-wider">SYSTEM ONLINE</span>
          </div>
          <p className="text-[10px] font-bold text-[#94A3B8]">© 2026 AA2000 CONNECT. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right Login Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-sm animate-scale-in"
          style={{ border: '1px solid #E5E7EB' }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <img src={logo} alt="AA2000 Logo" className="h-12 object-contain" />
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-black mb-1 text-slate-800" style={{ fontFamily: 'Manrope, Inter, sans-serif' }}>
              Welcome back
            </h2>
            <p className="text-xs text-slate-400 font-medium">Sign in to your command center account</p>
          </div>

          {/* Role Toggle */}
          <div className="flex gap-1 p-1 rounded-xl mb-6 bg-slate-50 border border-slate-100">
            {(['technician', 'sales', 'admin'] as const).map((r) => {
              const cfg = roleConfigs[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 btn-press"
                  style={
                    role === r
                      ? {
                          background: cfg.activeBg,
                          color: '#fff',
                          boxShadow: `0 2px 10px ${cfg.color}35`,
                        }
                      : { color: '#64748B' }
                  }
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Role indicator pill */}
          <div className="flex justify-center mb-4">
            <span
              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300"
              style={{ background: `${theme.primary}12`, color: theme.primary }}
            >
              {theme.roleEmoji} {theme.roleLabel}
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: false })); }}
                  placeholder={rc.placeholder}
                  className="search-input w-full pl-9 pr-4 py-3 rounded-xl text-xs font-medium bg-slate-50 border outline-none text-slate-700 focus:bg-white transition-all"
                  style={{ borderColor: fieldErrors.email ? '#EF4444' : '#E2E8F0' }}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[10px] text-red-500 font-bold mt-1">Email is required</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: false })); }}
                  placeholder="Enter your password"
                  className="search-input w-full pl-9 pr-10 py-3 rounded-xl text-xs font-medium bg-slate-50 border outline-none text-slate-700 focus:bg-white transition-all"
                  style={{ borderColor: fieldErrors.password ? '#EF4444' : '#E2E8F0' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[10px] text-red-500 font-bold mt-1">Password is required</p>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-xs font-bold bg-red-50 border border-red-100 text-red-500 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold text-white transition-all duration-200 btn-press relative overflow-hidden"
              style={{
                background: loading ? '#E2E8F0' : theme.buttonGradient,
                color: loading ? '#94A3B8' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : `0 4px 14px ${theme.primary}35`,
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                `Sign In as ${rc.label}`
              )}
            </button>
          </form>

          <p className="text-center text-[10px] font-bold text-slate-400 mt-5">
            Any password works for this demo
          </p>
        </div>
      </div>
    </div>
  );
}
