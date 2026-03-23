import { useEffect, useState, useRef, useCallback } from 'react';

const METRICS_BASE  = '/api/proxy/metrics-api';
const SCENARIOS_BASE= '/api/proxy/scenario-service';
const ORCHESTRATOR  = '/api/proxy/benchmark-orchestrator';

const BarChart = ({ data, title, unit='', color='#3b82f6', height=140 }: { data: {label:string;value:number}[]; title:string; unit?:string; color?:string; height?:number }) => {
  if (!data.length) return <div style={{textAlign:'center',color:'#94a3b8',padding:24,fontSize:13}}>Sense dades</div>;
  const W=480, max=Math.max(...data.map(d=>d.value),0.01);
  const barW=Math.max(20,(W-16-data.length*6)/data.length);
  return (
    <div>
      <div style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>{title}</div>
      <svg width="100%" viewBox={`0 0 ${W} ${height+44}`} style={{overflow:'visible'}}>
        {[0.25,0.5,0.75,1].map(f=><line key={f} x1={8} y1={height-f*height} x2={W-8} y2={height-f*height} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 2"/>)}
        {data.map((d,i)=>{
          const bh=(d.value/max)*height, x=8+i*(barW+6), y=height-bh;
          return <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={color} rx={3} opacity={0.85}/>
            <text x={x+barW/2} y={y-5} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600">{d.value>0?`${d.value.toFixed(1)}${unit}`:''}</text>
            <text x={x+barW/2} y={height+14} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label.length>12?d.label.slice(0,11)+'…':d.label}</text>
          </g>;
        })}
        <line x1={8} y1={height} x2={W-8} y2={height} stroke="#e2e8f0" strokeWidth="1.5"/>
      </svg>
    </div>
  );
};

const LiveLineChart = ({ data, color='#3b82f6', label }: { data:number[]; color?:string; label:string }) => {
  if (data.length<2) return <div style={{textAlign:'center',color:'#94a3b8',fontSize:12,padding:'8px 0'}}>Esperant dades...</div>;
  const W=480, H=80, max=Math.max(...data,0.01);
  const pts=data.map((v,i)=>`${data.length<2?W/2:(i/(data.length-1))*(W-20)+10},${H-(v/max)*(H-10)-4}`).join(' ');
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <span style={{fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:700}}>{label}</span>
        <span style={{fontSize:13,fontFamily:'monospace',fontWeight:700,color}}>{data[data.length-1].toFixed(2)}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

const HistorialTab = () => {
  const [summary,  setSummary]  = useState<any[]>([]);
  const [scenarios,setScenarios]= useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes,scRes] = await Promise.all([
        fetch(`${METRICS_BASE}/metrics/summary`).then(r=>r.json()),
        fetch(`${SCENARIOS_BASE}/scenarios`).then(r=>r.json()),
      ]);
      setSummary(Array.isArray(sumRes)?sumRes:[]);
      setScenarios(Array.isArray(scRes)?scRes:[]);
    } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(()=>{fetchData();},[fetchData]);

  const nameMap = Object.fromEntries(scenarios.map((s:any)=>[s.id,s.name||s.id?.slice(0,8)]));
  const lat  = summary.map(s=>({label:nameMap[s.scenarioId]||s.scenarioId?.slice(0,8)||'?', value:s.avgLatency   ??0}));
  const tput = summary.map(s=>({label:nameMap[s.scenarioId]||s.scenarioId?.slice(0,8)||'?', value:s.avgThroughput??0}));
  const err  = summary.map(s=>({label:nameMap[s.scenarioId]||s.scenarioId?.slice(0,8)||'?', value:s.avgErrorRate ??0}));

  if (loading) return <p style={{color:'#94a3b8',textAlign:'center',padding:48}}>Carregant...</p>;
  if (!summary.length) return (
    <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',textAlign:'center',padding:64}}>
      <div style={{fontSize:40,marginBottom:12}}>📊</div>
      <div style={{fontSize:15,color:'#475569',fontWeight:600}}>Encara no hi ha resultats</div>
      <div style={{fontSize:13,color:'#94a3b8',marginTop:6}}>Executa escenaris per veure les comparatives aquí.</div>
    </div>
  );

  const best = [...summary].sort((a,b)=>(a.avgLatency??999)-(b.avgLatency??999))[0];
  const bestName = nameMap[best?.scenarioId]||best?.scenarioId?.slice(0,8)||'—';

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:28}}>
        {[{label:'Escenaris comparats',value:String(summary.length),color:'#3b82f6',icon:'🔢'},{label:'Millor latència',value:`${best?.avgLatency?.toFixed(1)??'—'}ms`,color:'#22c55e',icon:'⚡'},{label:'Millor escenari',value:bestName,color:'#f59e0b',icon:''}].map(c=>(
          <div key={c.label} style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:'20px 24px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize:24,marginBottom:8}}>{c.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:c.color,fontFamily:'monospace'}}>{c.value}</div>
            <div style={{fontSize:12,color:'#94a3b8',marginTop:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}><BarChart data={lat}  title="Latència mitjana (ms)"   unit="ms" color="#f59e0b"/></div>
        <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}><BarChart data={tput} title="Throughput mitjà (msg/s)" unit=""   color="#22c55e"/></div>
      </div>
      <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)',marginBottom:20}}>
        <BarChart data={err} title="Taxa d'error mitjana (%)" unit="%" color="#ef4444" height={100}/>
      </div>
      <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontWeight:700,fontSize:14,color:'#1e293b'}}>Taula comparativa</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Escenari','Arquitectura','Protocol','Broker','Latència avg','Throughput avg','Error rate','Mostres'].map(h=>(
            <th key={h} style={{padding:'10px 14px',textAlign:h==='Escenari'?'left':'right',fontSize:11,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'2px solid #f1f5f9'}}>{h}</th>
          ))}</tr></thead>
          <tbody>{summary.map((s,i)=>(
            <tr key={i} style={{borderBottom:'1px solid #f8fafc',background:i===0?'#f0fdf4':'white'}}>
              <td style={{padding:'11px 14px',fontWeight:600,color:'#1e293b',fontSize:13}}>{i===0&&<span style={{marginRight:6}}></span>}{nameMap[s.scenarioId]||s.scenarioId?.slice(0,12)}</td>
              <td style={{padding:'11px 14px',textAlign:'right'}}>{s.architecture?<span style={{background:'#eff6ff',color:'#1d4ed8',padding:'2px 7px',borderRadius:4,fontSize:11,fontWeight:600}}>{s.architecture}</span>:'—'}</td>
              <td style={{padding:'11px 14px',textAlign:'right'}}>{s.protocol?<span style={{background:'#f0fdf4',color:'#166534',padding:'2px 7px',borderRadius:4,fontSize:11,fontWeight:600}}>{s.protocol}</span>:'—'}</td>
              <td style={{padding:'11px 14px',textAlign:'right',color:'#475569',fontSize:13}}>{s.broker||'—'}</td>
              <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'monospace',fontSize:13,fontWeight:600,color:'#f59e0b'}}>{s.avgLatency?.toFixed(2)??'—'}ms</td>
              <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'monospace',fontSize:13,fontWeight:600,color:'#22c55e'}}>{s.avgThroughput?.toFixed(1)??'—'}</td>
              <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'monospace',fontSize:13,fontWeight:600,color:'#ef4444'}}>{s.avgErrorRate?.toFixed(3)??'—'}%</td>
              <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'monospace',fontSize:12,color:'#94a3b8'}}>{s.count}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
        <button onClick={fetchData} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontSize:12,fontWeight:600,color:'#475569'}}>Actualitzar</button>
      </div>
    </div>
  );
};

const LiveTab = () => {
  const [activeRuns,    setActiveRuns]    = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [wsStatus,      setWsStatus]      = useState<'disconnected'|'connecting'|'connected'|'error'>('disconnected');
  const [metrics,       setMetrics]       = useState<any[]>([]);
  const wsRef = useRef<WebSocket|null>(null);

  const fetchActive = useCallback(()=>{
    fetch(`${ORCHESTRATOR}/runs/active`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setActiveRuns(d); }).catch(()=>{});
  },[]);

  useEffect(()=>{ fetchActive(); const i=setInterval(fetchActive,5000); return ()=>clearInterval(i); },[fetchActive]);
  useEffect(()=>{ if(!selectedRunId&&activeRuns.length>0) setSelectedRunId(activeRuns[0].id); },[activeRuns,selectedRunId]);

  useEffect(()=>{
    if(!selectedRunId) return;
    wsRef.current?.close();
    setWsStatus('connecting'); setMetrics([]);
    const proto=window.location.protocol==='https:'?'wss:':'ws:';
    try {
      const ws=new WebSocket(`${proto}//${window.location.host}/api/proxy/metrics-api`);
      wsRef.current=ws;
      ws.onopen=()=>{ setWsStatus('connected'); ws.send(JSON.stringify({action:'subscribe',runId:selectedRunId})); };
      ws.onmessage=e=>{ try{ const m=JSON.parse(e.data); if(m.event==='metric'&&m.data) setMetrics(p=>[...p.slice(-120),m.data]); }catch(_){} };
      ws.onerror=()=>setWsStatus('error');
      ws.onclose=()=>setWsStatus('disconnected');
    } catch(_){ setWsStatus('error'); }
    return ()=>{ wsRef.current?.close(); };
  },[selectedRunId]);

  const lat  = metrics.map(m=>m.latency   ??0);
  const tput = metrics.map(m=>m.throughput??0);
  const err  = metrics.map(m=>m.errorRate ??0);
  const avg  = (a:number[])=>a.length?(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2):'—';
  const wsC  = {disconnected:'#94a3b8',connecting:'#f59e0b',connected:'#22c55e',error:'#ef4444'};
  const wsL  = {disconnected:'Desconnectat',connecting:'Connectant...',connected:'Connectat',error:'Error'};
  const sel  = activeRuns.find(r=>r.id===selectedRunId);

  return (
    <div>
      <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:'16px 20px',marginBottom:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>Escenari en execució</div>
          {activeRuns.length===0
            ? <div style={{color:'#94a3b8',fontSize:14}}>Cap escenari actiu ara mateix.</div>
            : <select value={selectedRunId} onChange={e=>setSelectedRunId(e.target.value)} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:14,width:'100%',maxWidth:360}}>
                {activeRuns.map(r=><option key={r.id} value={r.id}>{r.scenarioName||r.id.slice(0,12)} — {r.protocol||'?'} / {r.architecture||'?'}</option>)}
              </select>
          }
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:wsC[wsStatus],display:'inline-block',boxShadow:wsStatus==='connected'?`0 0 6px ${wsC.connected}`:'none'}}/>
          <span style={{fontSize:13,color:wsC[wsStatus],fontWeight:600}}>{wsL[wsStatus]}</span>
        </div>
        {sel&&<div style={{display:'flex',gap:8}}>
          {sel.protocol    &&<span style={{background:'#f0fdf4',color:'#166534',padding:'3px 10px',borderRadius:5,fontSize:12,fontWeight:600}}>{sel.protocol}</span>}
          {sel.architecture&&<span style={{background:'#eff6ff',color:'#1d4ed8',padding:'3px 10px',borderRadius:5,fontSize:12,fontWeight:600}}>{sel.architecture}</span>}
          {sel.platform    &&<span style={{background:'#fdf4ff',color:'#7e22ce',padding:'3px 10px',borderRadius:5,fontSize:12,fontWeight:600}}>{sel.platform}</span>}
        </div>}
      </div>
      {activeRuns.length===0 ? (
        <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',textAlign:'center',padding:64}}>
          <div style={{fontSize:40,marginBottom:12}}>📡</div>
          <div style={{fontSize:15,color:'#475569',fontWeight:600}}>Cap execució activa</div>
          <div style={{fontSize:13,color:'#94a3b8',marginTop:6,maxWidth:360,margin:'8px auto 0'}}>Inicia un escenari des de la pàgina <strong>Escenaris</strong> i aquí apareixeran les mètriques en temps real.</div>
        </div>
      ) : <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20}}>
          {[{l:'Mostres rebudes',v:String(metrics.length),c:'#3b82f6'},{l:'Latència avg (ms)',v:avg(lat),c:'#f59e0b'},{l:'Throughput avg',v:avg(tput),c:'#22c55e'},{l:'Error rate avg (%)',v:avg(err),c:'#ef4444'}].map(c=>(
            <div key={c.l} style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:'18px 20px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <div style={{fontSize:26,fontWeight:800,color:c.c,fontFamily:'monospace'}}>{c.v}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{c.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
          {[{data:lat,color:'#f59e0b',label:'Latència (ms)'},{data:tput,color:'#22c55e',label:'Throughput (msg/s)'},{data:err,color:'#ef4444',label:'Error rate (%)'}].map(c=>(
            <div key={c.label} style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <LiveLineChart data={c.data} color={c.color} label={c.label}/>
            </div>
          ))}
        </div>
        {metrics.length>0&&(
          <div style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',overflow:'hidden',marginTop:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>Últimes mètriques</div>
            <div style={{maxHeight:240,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#f8fafc'}}>{['Hora','Latència','Throughput','Errors (%)'].map(h=>(
                  <th key={h} style={{padding:'8px 14px',textAlign:h==='Hora'?'left':'right',fontSize:11,color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>{h}</th>
                ))}</tr></thead>
                <tbody>{[...metrics].reverse().slice(0,50).map((m,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                    <td style={{padding:'7px 14px',fontFamily:'monospace',fontSize:12,color:'#475569'}}>{m.timestamp?new Date(m.timestamp).toLocaleTimeString('ca-ES'):'—'}</td>
                    <td style={{padding:'7px 14px',textAlign:'right',fontFamily:'monospace',fontSize:12,color:'#f59e0b',fontWeight:600}}>{m.latency?.toFixed(2)??'—'}</td>
                    <td style={{padding:'7px 14px',textAlign:'right',fontFamily:'monospace',fontSize:12,color:'#22c55e',fontWeight:600}}>{m.throughput?.toFixed(2)??'—'}</td>
                    <td style={{padding:'7px 14px',textAlign:'right',fontFamily:'monospace',fontSize:12,color:'#ef4444',fontWeight:600}}>{m.errorRate?.toFixed(3)??'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </>}
    </div>
  );
};

export const ResultatsPage = () => {
  const [tab,setTab]=useState<'live'|'historial'>('live');
  const ts=(a:boolean):React.CSSProperties=>({padding:'10px 24px',cursor:'pointer',border:'none',borderBottom:a?'2px solid #3b82f6':'2px solid transparent',background:'none',fontWeight:a?700:400,fontSize:14,color:a?'#3b82f6':'#64748b'});
  return (
    <div style={{padding:32,maxWidth:1200,margin:'0 auto',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:28,fontWeight:800,color:'#0f172a'}}>Resultats</h1>
        <p style={{margin:'6px 0 0',color:'#64748b',fontSize:15}}>Gràfiques de rendiment en temps real i comparatives d'escenaris</p>
      </div>
      <div style={{borderBottom:'1px solid #e2e8f0',marginBottom:24,display:'flex'}}>
        <button style={ts(tab==='live')} onClick={()=>setTab('live')}>
          <span style={{display:'flex',alignItems:'center',gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Live</span>
        </button>
        <button style={ts(tab==='historial')} onClick={()=>setTab('historial')}>
          <span style={{display:'flex',alignItems:'center',gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Historial & Comparatives</span>
        </button>
      </div>
      {tab==='live'      &&<LiveTab/>}
      {tab==='historial' &&<HistorialTab/>}
    </div>
  );
};
