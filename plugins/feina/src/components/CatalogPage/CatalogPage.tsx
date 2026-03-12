import { useEffect, useState } from 'react';

const API_BASE = '/api/proxy/catalog-service';

export const CatalogPage = () => {
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/components`)
      .then(r => r.json())
      .then(data => { setComponents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Catàleg de Combinacions</h1>
      <p style={{ color: '#666' }}>Arquitectures, protocols, brokers i gateways disponibles</p>
      {loading ? <p>Carregant...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1f1f1f', color: 'white' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Nom</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Arquitectura</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Protocol</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Broker</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Gateway</th>
            </tr>
          </thead>
          <tbody>
            {components.filter(c => !c.test).map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: 8 }}>{c.name || '-'}</td>
                <td style={{ padding: 8 }}>{c.architecture || '-'}</td>
                <td style={{ padding: 8 }}>{c.protocol || '-'}</td>
                <td style={{ padding: 8 }}>{c.broker || '-'}</td>
                <td style={{ padding: 8 }}>{c.gateway || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
