const LogoFull = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 30 }}>
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#2D6BE4" fillOpacity="0.18" />
      <rect width="32" height="32" rx="7" stroke="#2D6BE4" strokeWidth="1.2" fill="none" />
      <path
        d="M6.5 16 C6.5 16 9 11.5 12.5 16 C16 20.5 19.5 11.5 23 16"
        stroke="#00C896"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="6.5" cy="16" r="2" fill="#2D6BE4" />
      <circle cx="25.5" cy="16" r="2" fill="#2D6BE4" />
    </svg>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1 }}>
      <span style={{
        color: '#e6edf3',
        fontWeight: 800,
        fontSize: 13.5,
        letterSpacing: 0.1,
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        APIs <span style={{ color: '#2D6BE4' }}>Asíncrones</span>
      </span>
      <span style={{
        color: '#00C896',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        Benchmark Portal
      </span>
    </div>
  </div>
);

export default LogoFull;
