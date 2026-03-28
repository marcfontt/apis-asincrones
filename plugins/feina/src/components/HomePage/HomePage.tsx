import { useEffect, useState } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const STEPS=[
  {num:1,title:'Explora el Catàleg',desc:'Revisa les arquitectures, protocols, plataformes i gateways disponibles.',icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>},
  {num:2,title:'Configura un Escenari',desc:'Defineix arquitectura, protocol i plataforma. Ajusta la càrrega.',icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>},
  {num:3,title:'Llança el Benchmark',desc:'El sistema desplega automàticament la infraestructura a Kubernetes.',icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>},
  {num:4,title:'Analitza els Resultats',desc:"Compara latència, throughput i taxa d'error en temps real.",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
];
const CATEGORIES=[
  {key:'architecture',name:'Arquitectures',count:5,color:'#2563eb',items:['EDA','QBA','LCA','EMA','SEA'],href:'/catalog'},
  {key:'protocol',name:'Protocols',count:8,color:'#16a34a',items:['MQTT','AMQP','gRPC','WebSockets','SSE','CoAP','NATS','Kafka'],href:'/catalog'},
  {key:'platform',name:'Plataformes',count:5,color:'#d97706',items:['Apache Kafka','RabbitMQ','Confluent','Apache Pulsar','NATS Server'],href:'/catalog'},
  {key:'gateway',name:'Gateways',count:6,color:'#7c3aed',items:['Kong OSS','AWS EventBridge','Azure Event Grid','Google Eventarc','Solace PubSub+','Mosquitto'],href:'/catalog'},
];
const QUICK_SCENARIOS=[
  {name:'Kafka EDA — Alta Càrrega',architecture:'EDA',protocol:'Kafka',platform:'Kafka',description:'Throughput màxim amb Apache Kafka. Ideal per validar límits de capacitat.',defaults:{duration:60,rate:1000,payloadSize:256},accentColor:'#2563eb'},
  {name:'MQTT IoT — Baix Consum',architecture:'EDA',protocol:'MQTT',platform:'RabbitMQ',description:'Protocol lleuger per a escenaris IoT. Baix overhead, latència mínima.',defaults:{duration:30,rate:500,payloadSize:128},accentColor:'#16a34a'},
  {name:'gRPC — Serialització Binària',architecture:'LCA',protocol:'gRPC',platform:'NATS Server',description:'Comunicació RPC asíncrona amb serialització binària.',defaults:{duration:45,rate:2000,payloadSize:512},accentColor:'#7c3aed'},
  {name:'WebSockets — Temps Real',architecture:'SEA',protocol:'WS',platform:'Kafka',description:'Connexió bidireccional persistent per a streaming en temps real.',defaults:{duration:60,rate:800,payloadSize:256},accentColor:'#d97706'},
];
const STATS=[
  {label:'Arquitectures',value:'5',color:'#2563eb'},
  {label:'Protocols',value:'8',color:'#16a34a'},
  {label:'Plataformes',value:'5',color:'#d97706'},
  {label:'Combinacions',value:'200+',color:'#7c3aed'},
];
export const HomePage=()=>{
  const [hoveredStep,setHoveredStep]=useState<number|null>(null);
  const [hoveredScenario,setHoveredScenario]=useState<number|null>(null);
  const [hoveredCat,setHoveredCat]=useState<number|null>(null);
  useEffect(()=>{document.title='Inici | APIs Asíncrones';},[]);
  const handleCreateScenario=(sc:typeof QUICK_SCENARIOS[0])=>{
    const params=new URLSearchParams({create:'true',name:sc.name,architecture:sc.architecture,protocol:sc.protocol,platform:sc.platform,duration:String(sc.defaults.duration),rate:String(sc.defaults.rate),payloadSize:String(sc.defaults.payloadSize)});
    window.location.href='/escenaris?'+params.toString();
  };
  return(
    <div style={{...S.page,paddingTop:32}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{marginBottom:36,padding:'36px 40px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,right:0,width:420,height:'100%',background:'linear-gradient(135deg, transparent 40%, rgba(37,99,235,0.04) 100%)',pointerEvents:'none'}}/>
        <div style={{position:'relative'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--badge-blue-bg)',color:'var(--badge-blue-fg)',fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',padding:'4px 12px',borderRadius:20,marginBottom:18}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'var(--badge-blue-fg)',display:'inline-block'}}/>Plataforma de Benchmark · AKS
          </div>
          <h1 style={{margin:'0 0 12px',fontSize:30,fontWeight:800,color:'var(--text-primary)',lineHeight:1.2,letterSpacing:'-0.02em'}}>
            Mesura el rendiment de les<br/><span style={{color:'var(--accent)'}}>APIs Asíncrones</span> en temps real
          </h1>
          <p style={{color:'var(--text-secondary)',fontSize:15,margin:'0 0 28px',lineHeight:1.65,maxWidth:600}}>Dissenya escenaris de benchmark, desplega infraestructura real sobre Kubernetes i analitza latència, throughput i fiabilitat.</p>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <a href="/escenaris?create=true" style={{...S.btnPrimary,textDecoration:'none',fontSize:14}}>+ Crear escenari</a>
            <a href="/resultats" style={{...S.btn,textDecoration:'none',fontSize:14}}>Resultats en viu</a>
            <a href="/catalog" style={{...S.btn,textDecoration:'none',fontSize:14}}>Explorar catàleg</a>
          </div>
          <div style={{display:'flex',gap:32,marginTop:28,paddingTop:24,borderTop:'1px solid var(--border)',flexWrap:'wrap'}}>
            {STATS.map(stat=>(
              <div key={stat.label} style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:stat.color+'14',color:stat.color,flexShrink:0,fontSize:16,fontWeight:800}}>{stat.value}</div>
                <div style={{fontSize:12,color:'var(--text-secondary)',fontWeight:500}}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{marginBottom:32}}>
        <h2 style={{margin:'0 0 16px',fontSize:17,fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.01em'}}>Com funciona</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12}}>
          {STEPS.map((step,i)=>(
            <div key={step.num} className="card-hover" onMouseEnter={()=>setHoveredStep(i)} onMouseLeave={()=>setHoveredStep(null)}
              style={{...S.card,padding:18,cursor:'default',borderTop:'2px solid var(--accent)',boxShadow:hoveredStep===i?'var(--shadow-md)':'none',transform:hoveredStep===i?'translateY(-2px)':'none'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'var(--accent)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>{step.num}</div>
                <span style={{color:'var(--text-disabled)'}}>{step.icon}</span>
              </div>
              <div style={{fontWeight:600,fontSize:14,marginBottom:6,color:'var(--text-primary)',lineHeight:1.3}}>{step.title}</div>
              <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.55}}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginBottom:32}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:16}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.01em'}}>Escenaris predefinits</h2>
          <a href="/escenaris" style={{color:'var(--accent)',textDecoration:'none',fontSize:13,fontWeight:600}}>Veure tots →</a>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:12}}>
          {QUICK_SCENARIOS.map((sc,i)=>(
            <div key={sc.name} className="card-hover" onMouseEnter={()=>setHoveredScenario(i)} onMouseLeave={()=>setHoveredScenario(null)}
              style={{...S.card,borderLeft:'3px solid '+sc.accentColor,display:'flex',flexDirection:'column',gap:12,boxShadow:hoveredScenario===i?'var(--shadow-md)':'none',transform:hoveredScenario===i?'translateY(-1px)':'none'}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4,color:'var(--text-primary)',lineHeight:1.3}}>{sc.name}</div>
                <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.55,margin:0}}>{sc.description}</p>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <span style={{...S.badge('#2563eb'),fontSize:11}}>{sc.architecture}</span>
                <span style={{...S.badge('#16a34a'),fontSize:11}}>{sc.protocol}</span>
                <span style={{...S.badge('#d97706'),fontSize:11}}>{sc.platform}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',gap:14,fontSize:12,color:'var(--text-disabled)',fontFamily:'var(--font-mono)'}}>
                  <span>{sc.defaults.duration}s</span><span>{sc.defaults.rate} msg/s</span><span>{sc.defaults.payloadSize}B</span>
                </div>
                <button onClick={()=>handleCreateScenario(sc)} style={{background:sc.accentColor,color:'white',border:'none',borderRadius:6,padding:'6px 14px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Crear</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginBottom:32}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:16}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.01em'}}>Components del catàleg</h2>
          <a href="/catalog" style={{color:'var(--accent)',textDecoration:'none',fontSize:13,fontWeight:600}}>Explorar →</a>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12}}>
          {CATEGORIES.map((cat,i)=>(
            <a key={cat.key} href={cat.href} className="card-hover" onMouseEnter={()=>setHoveredCat(i)} onMouseLeave={()=>setHoveredCat(null)}
              style={{...S.card,textDecoration:'none',display:'block',borderTop:'2px solid '+cat.color,boxShadow:hoveredCat===i?'var(--shadow-md)':'none',transform:hoveredCat===i?'translateY(-2px)':'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:14,color:cat.color}}>{cat.name}</div>
                <span style={{...S.badge(cat.color),fontSize:11}}>{cat.count}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {cat.items.slice(0,4).map(item=>(
                  <div key={item} style={{fontSize:12,color:'var(--text-secondary)',padding:'3px 8px',background:'var(--bg-hover)',borderRadius:4,border:'1px solid var(--border)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item}</div>
                ))}
                {cat.items.length>4&&<div style={{fontSize:11,color:'var(--text-disabled)',paddingLeft:8,marginTop:2}}>+{cat.items.length-4} més</div>}
              </div>
            </a>
          ))}
        </div>
      </div>
      <div style={{padding:'16px 20px',background:'var(--bg-subtle)',borderRadius:10,border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <span style={{fontSize:12,color:'var(--text-secondary)'}}><strong style={{color:'var(--text-primary)'}}>APIs Asíncrones</strong> — Plataforma de benchmark per a APIs sobre AKS</span>
        <div style={{display:'flex',gap:8}}>
          {[{label:'Escenaris',href:'/escenaris'},{label:'Execucions',href:'/execucions'},{label:'Resultats',href:'/resultats'}].map(link=>(
            <a key={link.href} href={link.href} style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',textDecoration:'none',padding:'4px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-card)'}}>{link.label}</a>
          ))}
        </div>
      </div>
    </div>
  );
};
