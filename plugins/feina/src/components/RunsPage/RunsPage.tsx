import { useEffect, useState } from 'react';

const API_BASE = '/api/proxy/benchmark-orchestrator';
const STATUS_COLORS: Record<string, string> = {
  pending: '#f0ad4e', running: '#5bc0de', completed: '#5cb85c', error: '#d9534f', cleanup: '#999',
};

export const RunsPage = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = () => {
    setLoading(true);
    fetch(`${API_BASE}/runs`)
      .then(r => r.json())
      .then(data => { setRuns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRuns(); }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Execucions de Benchmark</h1>
          <p style={{ color: '#666' }}>Historial de runs de proves sobre combinacions d'APIs asíncrones</p>
        </div>
        <button onClick={fetchRuns} style={{ padding: '8px 16px', cursor: 'pointer' }}>Actualitzar</button>
      </div>
      {loading ? <p>Carregant...</p> : runs.filter(r => !r.test).length === 0 ? (
        <p style={{ color: '#999' }}>No hi ha execucions encara.</p>
      ) : (
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
              <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
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
  );
};
