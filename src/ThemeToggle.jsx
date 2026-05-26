export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 900,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid var(--theme-toggle-border)',
        background: 'var(--theme-toggle-bg)',
        color: 'var(--theme-toggle-text)',
        fontSize: 18,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
