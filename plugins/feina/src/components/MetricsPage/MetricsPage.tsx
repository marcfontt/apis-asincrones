import React, { useEffect, useState } from 'react';

const API_BASE = '/api/proxy/metrics-api';

export const MetricsPage = () => {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/metrics/summary`)
      .then(r => r.json())
      .then(data => { setSummary(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Mètriques de Rendiment</h1>
      <p style={{ color: '#666' }}>Resum agregat per escenari: latència, throughput i taxa d'error</p>
      {loading && <p>Carregant...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!loading && !error && summary.length === 0 && (
        <p style={{ color: '#999' }}>No hi ha mètriques encara. Executa un benchmark primer.</p>
      )}
      {summary.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1f1f1f', color: 'white' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Escenari</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Arquitectura</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Protocol</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Broker</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Latència avg (ms)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Throughput avg (msg/s)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Error rate (%)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Mostres</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{s.scenarioId?.slice(0,8)}...</td>
                <td style={{ padding: 8 }}>{s.architecture || '-'}</td>
                <td style={{ padding: 8 }}>{s.protocol || '-'}</td>
                <td style={{ padding: 8 }}>{s.broker || '-'}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{s.avgLatency?.toFixed(2) ?? '-'}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{s.avgThroughput?.toFixed(2) ?? '-'}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{s.avgErrorRate?.toFixed(2) ?? '-'}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{s.count ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
