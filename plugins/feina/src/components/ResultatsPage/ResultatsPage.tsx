import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f0ad4e', running: '#5bc0de', completed: '#5cb85c', error: '#d9534f', cleanup: '#999',
};

const TAB_STYLE = (active: boolean) => ({
  padding: '10px 28px',
  cursor: 'pointer',
  border: 'none',
  borderBottom: active ? '3px solid #4a9eed' : '3px solid transparent',
  background: 'none',
  fontWeight: active ? 700 : 400,
  fontSize: 15,
  color: active ? '#4a9eed' : '#555',
});

export const ResultatsPage = () => {
  const [tab, setTab] = useState<'live' | 'historial'>('historial');
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRuns = () => {
    setLoading(true);
    fetch('/api/proxy/benchmark-orchestrator/runs')
      .then(r => r.json())
      .then(data => { setRuns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Resultats</h1>
      <p style={{ color: '#666' }}>Visualitza els resultats de les execucions de benchmark en temps real o consulta l'historial complet.</p>

      <div style={{ borderBottom: '1px solid #e0e0e0', marginBottom: 24, display: 'flex' }}>
        <button style={TAB_STYLE(tab === 'live')}     onClick={() => setTab('live')}>Live</button>
        <button style={TAB_STYLE(tab === 'historial')} onClick={() => { setTab('historial'); fetchRuns(); }}>Historial</button>
      </div>

      {tab === 'live' && (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>...</div>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Monitoratge en temps real</div>
          <div style={{ fontSize: 14 }}>Quan hi hagi un benchmark en execució, aquí es mostraran les mètriques live: latència, throughput i errors per segon.</div>
        </div>
      )}

      {tab === 'historial' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={fetchRuns} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' }}>
              Actualitzar
            </button>
          </div>
          {loading && <p>Carregant...</p>}
          {!loading && runs.filter(r => !r.test).length === 0 && (
            <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>No hi ha execucions registrades encara.</p>
          )}
          {!loading && runs.filter(r => !r.test).length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1f1f1f', color: 'white' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Escenari</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Arquitectura</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Protocol</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Estat</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Creat</th>
                </tr>
              </thead>
              <tbody>
                {runs.filter(r => !r.test).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{r.id?.slice(0,8)}...</td>
                    <td style={{ padding: 8 }}>{r.scenarioId || '-'}</td>
                    <td style={{ padding: 8 }}>{r.architecture || '-'}</td>
                    <td style={{ padding: 8 }}>{r.protocol || '-'}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{ background: STATUS_COLORS[r.status] || '#ccc', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                        {r.status || '-'}
                      </span>
                    </td>
                    <td style={{ padding: 8, fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleString('ca') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
