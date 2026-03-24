import React, { useEffect, useState, useCallback } from 'react';
import { Page, Header, Content } from '@backstage/core-components';

const IconClock   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCheck   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconX       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconSpinner = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const IconStop    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>;
const IconTrash   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>;

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

const BASE             = '/api/proxy/benchmark-orchestrator';
const SCENARIO_SERVICE = '/api/proxy/scenario-service';

const formatDuration = (start: string, end?: string): string => {
  const diff = Math.floor((new Date(end || Date.now()).getTime() - new Date(start).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
};

const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const StatusChip = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; fg: string; bd: string; label: string; icon: JSX.Element }> = {
    running:   { bg: 'rgba(210,153,34,0.12)',  fg: 'var(--warning)',        bd: 'var(--warning)',  label: 'En execució', icon: <IconSpinner /> },
    completed: { bg: 'rgba(63,185,80,0.12)',   fg: 'var(--success)',        bd: 'var(--success)',  label: 'Completat',   icon: <IconCheck /> },
    failed:    { bg: 'rgba(248,81,73,0.12)',   fg: 'var(--error)',          bd: 'var(--error)',    label: 'Fallit',      icon: <IconX /> },
    cancelled: { bg: 'rgba(139,148,158,0.12)', fg: 'var(--text-secondary)', bd: 'var(--border)',   label: 'Cancel·lat',  icon: <IconClock /> },
    pending:   { bg: 'rgba(139,148,158,0.12)', fg: 'var(--text-secondary)', bd: 'var(--border)',   label: 'Pendent',     icon: <IconClock /> },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
      {c.icon} {c.label}
    </span>
  );
};

export const ExecucionsPage = () => {
  const [runs,     setRuns]     = useState<Run[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [stopping, setStopping] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { document.title = 'Execucions | APIs Asíncrones'; }, []);

  const resolveScenarioNames = useCallback(async (rawRuns: Run[]): Promise<Run[]> => {
    const needResolve = rawRuns.filter(r => !r.scenarioName || isUUID(r.scenarioName));
    if (!needResolve.length) return rawRuns;

    const uniqueIds = [...new Set(needResolve.map(r => r.scenarioId))];
    const resolved: Record<string, any> = {};

    await Promise.all(uniqueIds.map(async (id) => {
      try {
        const res = await fetch(`${SCENARIO_SERVICE}/scenarios/${id}`);
        if (res.ok) resolved[id] = await res.json();
      } catch (_) {}
    }));

    return rawRuns.map(r => {
      const sc = resolved[r.scenarioId];
      if (!sc) return r;
      return {
        ...r,
        scenarioName: sc.name || r.scenarioName,
        architecture: r.architecture || sc.architecture || '',
        protocol:     r.protocol     || sc.protocol     || '',
        platform:     r.platform     || sc.platform     || '',
      };
    });
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/runs`);
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data) ? data : (data.runs || []);
        const resolved = await resolveScenarioNames(raw);
        setRuns(resolved);
      }
    } catch (_) {}
    setLoading(false);
  }, [resolveScenarioNames]);

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

  const th: React.CSSProperties = {
    padding: '9px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)',
    background: 'var(--bg-main)', whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '11px 14px', borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle', fontSize: '13.5px', color: 'var(--text-primary)',
  };

  const scenarioLabel = (run: Run): string => {
    if (run.scenarioName && !isUUID(run.scenarioName)) return run.scenarioName;
    const parts = [run.architecture, run.protocol, run.platform].filter(Boolean);
    if (parts.length) return parts.join(' · ');
    return (run.scenarioId || run.id)?.substring(0, 8) + '...';
  };

  const RunTable = ({ data, showStop }: { data: Run[]; showStop: boolean }) => (
    <div style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
        <thead>
          <tr>
            {['Nom escenari', 'ID', 'Arquitectura', 'Protocol', 'Plataforma', 'Estat', 'Durada', 'Accions'].map(c => (
              <th key={c} style={th}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((run, i) => (
            <tr key={run.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
              <td style={{ ...td, fontWeight: 600 }}>{scenarioLabel(run)}</td>
              <td style={{ ...td, fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '12px' }}>{run.id.substring(0, 8)}</td>
              <td style={td}>
                {run.architecture
                  ? <span style={{ background: 'rgba(88,166,255,0.15)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{run.architecture}</span>
                  : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
              </td>
              <td style={td}>
                {run.protocol
                  ? <span style={{ background: 'rgba(63,185,80,0.15)', color: 'var(--success)', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{run.protocol}</span>
                  : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
              </td>
              <td style={{ ...td, color: 'var(--text-secondary)' }}>{run.platform || <span style={{ color: 'var(--text-disabled)' }}>—</span>}</td>
              <td style={td}><StatusChip status={run.status} /></td>
              <td style={{ ...td, fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 12 }}>{formatDuration(run.startedAt, run.completedAt)}</td>
              <td style={td}>
                {showStop ? (
                  <button
                    onClick={() => handleStop(run.id)}
                    disabled={stopping === run.id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--error)', background: stopping === run.id ? 'var(--bg-hover)' : 'rgba(248,81,73,0.1)', color: stopping === run.id ? 'var(--text-secondary)' : 'var(--error)', cursor: stopping === run.id ? 'not-allowed' : 'pointer' }}
                  >
                    <IconStop /> {stopping === run.id ? 'Aturant...' : 'Atura'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete(run.id)}
                    disabled={deleting === run.id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-main)', color: deleting === run.id ? 'var(--text-disabled)' : 'var(--text-secondary)', cursor: deleting === run.id ? 'not-allowed' : 'pointer' }}
                  >
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
    <div style={{ padding: '28px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
      {text}
    </div>
  );

  if (loading) return (
    <Page themeId="tool">
      <Header title="Execucions" subtitle="Historial d'execucions de benchmarks" />
      <Content><p style={{ color: 'var(--text-secondary)', padding: '24px' }}>Carregant...</p></Content>
    </Page>
  );

  return (
    <Page themeId="tool">
      <Header title="Execucions" subtitle="Historial d'execucions de benchmarks" />
      <Content>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            <span style={{ color: 'var(--warning)' }}><IconSpinner /></span> En execució / Pendents
            {active.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(210,153,34,0.15)', color: 'var(--warning)', border: '1px solid var(--warning)' }}>
                {active.length}
              </span>
            )}
          </h2>
          {active.length === 0 ? <EmptyBox text="Cap execució activa" /> : <RunTable data={active} showStop />}
        </div>

        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}><IconClock /></span> Historial
            {history.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {history.length}
              </span>
            )}
          </h2>
          {history.length === 0 ? <EmptyBox text="Cap execució finalitzada" /> : <RunTable data={history} showStop={false} />}
        </div>
      </Content>
    </Page>
  );
};
