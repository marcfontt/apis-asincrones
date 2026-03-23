import React, { useEffect, useState, useCallback } from 'react';
import { Page, Header, Content } from '@backstage/core-components';

const IconClock = ({ color = '#9ca3af' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const IconCheck = ({ color = '#16a34a' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const IconX = ({ color = '#dc2626' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const IconSpinner = ({ color = '#d97706' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const IconStop = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
);
const IconTrash = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);

interface Run {
  id: string;
  scenarioId: string;
  scenarioName?: string;
  architecture?: string;
  protocol?: string;
  platform?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

const BASE = '/api/proxy/benchmark-orchestrator';

const formatDuration = (start: string, end?: string): string => {
  const diff = Math.floor((new Date(end || Date.now()).getTime() - new Date(start).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
};

const StatusChip = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; fg: string; bd: string; label: string; icon: JSX.Element }> = {
    running:   { bg: '#fffbeb', fg: '#78350f', bd: '#fde68a', label: 'En execució', icon: <IconSpinner /> },
    completed: { bg: '#f0fdf4', fg: '#14532d', bd: '#bbf7d0', label: 'Completat',   icon: <IconCheck /> },
    failed:    { bg: '#fef2f2', fg: '#7f1d1d', bd: '#fecaca', label: 'Fallat',      icon: <IconX /> },
    cancelled: { bg: '#f9fafb', fg: '#374151', bd: '#e5e7eb', label: 'Cancel·lat',  icon: <IconClock /> },
    pending:   { bg: '#f9fafb', fg: '#374151', bd: '#e5e7eb', label: 'Pendent',     icon: <IconClock /> },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
      {c.icon} {c.label}
    </span>
  );
};

export const ExecucionsPage = () => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/runs`);
      if (res.ok) {
        const data = await res.json();
        setRuns(Array.isArray(data) ? data : (data.runs || []));
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRuns();
    const t = setInterval(fetchRuns, 8000);
    return () => clearInterval(t);
  }, [fetchRuns]);

  const handleStop = async (id: string) => {
    setStopping(id);
    try { await fetch(`${BASE}/runs/${id}/cancel`, { method: 'POST' }); } catch (_) {}
    await fetchRuns();
    setStopping(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`${BASE}/runs/${id}`, { method: 'DELETE' });
      setRuns(prev => prev.filter(r => r.id !== id));
    } catch (_) { await fetchRuns(); }
    setDeleting(null);
  };

  const active  = runs.filter(r => r.status === 'running' || r.status === 'pending');
  const history = runs.filter(r => r.status !== 'running' && r.status !== 'pending');

  const th: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle', fontSize: '13.5px' };

  const RunTable = ({ data, showStop }: { data: Run[]; showStop: boolean }) => (
    <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['Nom escenari','ID','Arquitectura','Protocol','Plataforma','Estat','Durada','Accions'].map(c => <th key={c} style={th}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((run, i) => (
            <tr key={run.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ ...td, fontWeight: 600, color: '#111827' }}>{run.scenarioName || run.scenarioId}</td>
              <td style={{ ...td, fontFamily: 'monospace', color: '#6b7280', fontSize: '12px' }}>{run.id.substring(0, 8)}</td>
              <td style={td}>{run.architecture || '-'}</td>
              <td style={td}>{run.protocol || '-'}</td>
              <td style={td}>{run.platform || '-'}</td>
              <td style={td}><StatusChip status={run.status} /></td>
              <td style={{ ...td, fontFamily: 'monospace' }}>{formatDuration(run.startedAt, run.completedAt)}</td>
              <td style={td}>
                {showStop ? (
                  <button onClick={() => handleStop(run.id)} disabled={stopping === run.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #fca5a5', background: stopping === run.id ? '#f3f4f6' : '#fef2f2', color: stopping === run.id ? '#9ca3af' : '#dc2626', cursor: stopping === run.id ? 'not-allowed' : 'pointer' }}>
                    <IconStop /> {stopping === run.id ? 'Aturant...' : 'Atura'}
                  </button>
                ) : (
                  <button onClick={() => handleDelete(run.id)} disabled={deleting === run.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #e5e7eb', background: '#fff', color: deleting === run.id ? '#9ca3af' : '#6b7280', cursor: deleting === run.id ? 'not-allowed' : 'pointer' }}>
                    <IconTrash /> {deleting === run.id ? 'Eliminant...' : 'Elimina'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const EmptyBox = ({ text }: { text: string }) => (
    <div style={{ padding: '28px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>{text}</div>
  );

  if (loading) return (
    <Page themeId="tool">
      <Header title="Execucions" subtitle="Historial d'execucions de benchmarks" />
      <Content><p style={{ color: '#6b7280', padding: '24px' }}>Carregant...</p></Content>
    </Page>
  );

  return (
    <Page themeId="tool">
      <Header title="Execucions" subtitle="Historial d'execucions de benchmarks" />
      <Content>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            <IconSpinner color="#6b7280" /> En execució / Pendents
            {active.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>{active.length}</span>}
          </h2>
          {active.length === 0 ? <EmptyBox text="Cap execució activa" /> : <RunTable data={active} showStop />}
        </div>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            <IconClock color="#6b7280" /> Historial
            {history.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>{history.length}</span>}
          </h2>
          {history.length === 0 ? <EmptyBox text="Cap execució finalitzada" /> : <RunTable data={history} showStop={false} />}
        </div>
      </Content>
    </Page>
  );
};
