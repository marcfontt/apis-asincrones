const LogoFull = () => (
  <span
    aria-label="APIs Asíncrones Portal de proves"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 11,
      minWidth: 226,
      height: 42,
      color: 'var(--text-primary, #0f172a)',
    }}
  >
    <img
      src="/assets/async-logo-icon.svg"
      alt=""
      aria-hidden="true"
      style={{ display: 'block', width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
    />
    <span style={{ display: 'grid', gap: 1, lineHeight: 1 }}>
      <span
        style={{
          fontSize: 17,
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary, #0f172a)',
          whiteSpace: 'nowrap',
        }}
      >
        APIs <span style={{ color: 'var(--brand, #2563eb)' }}>Asíncrones</span>
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 850,
          letterSpacing: '0.16em',
          color: 'var(--teal, #059669)',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Portal de proves
      </span>
    </span>
  </span>
);

export default LogoFull;
