export default function ThemeToggle({
  darkMode,
  onToggle,
}: {
  darkMode: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center btn-press"
      style={{
        background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(100,116,139,0.08)',
        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(226,232,240,0.8)'}`,
      }}
      title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Sun icon */}
      <svg
        className="absolute w-4 h-4"
        style={{
          opacity: darkMode ? 0 : 1,
          transform: `rotate(${darkMode ? '90deg' : '0deg'}) scale(${darkMode ? 0.5 : 1})`,
          color: '#F59E0B',
          transition: 'none',
        }}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      {/* Moon icon */}
      <svg
        className="absolute w-4 h-4"
        style={{
          opacity: darkMode ? 1 : 0,
          transform: `rotate(${darkMode ? '0deg' : '-90deg'}) scale(${darkMode ? 1 : 0.5})`,
          color: '#93C5FD',
          transition: 'none',
        }}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </button>
  );
}
