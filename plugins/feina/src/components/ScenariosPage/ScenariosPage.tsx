import React, { useEffect, useState } from 'react';

const API_BASE = '/api/proxy/scenario-service';

export const ScenariosPage = () => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/scenarios`)
      .then(r => r.json())
      .then(data => { setScenarios(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Escenaris de Benchmark</h1>
      <p style={{ color: '#666' }}>Configuracions de càrrega per provar combinacions d'APIs asíncrones</p>
      {loading ? <p>Carregant...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1f1f1f', color: 'white' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Nom</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Arquitectura</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Protocol</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Broker</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Duració (s)</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Rate (msg/s)</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.filter(s => !s.test).map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: 8 }}>{s.name || '-'}</td>
                <td style={{ padding: 8 }}>{s.architecture || '-'}</td>
                <td style={{ padding: 8 }}>{s.protocol || '-'}</td>
                <td style={{ padding: 8 }}>{s.broker || '-'}</td>
                <td style={{ padding: 8 }}>{s.duration || '-'}</td>
                <td style={{ padding: 8 }}>{s.rate || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
