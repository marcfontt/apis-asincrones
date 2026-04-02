import React from 'react';
const LIGHT={bgMain:'#f5f6f8',bgCard:'#ffffff',bgHover:'#f0f2f5',bgInput:'#ffffff',bgSubtle:'#f8f9fb',border:'#e1e4e8',borderHover:'#c8cdd4',textPrimary:'#111827',textSecondary:'#6b7280',textDisabled:'#9ca3af',accent:'#2563eb',success:'#16a34a',warning:'#d97706',error:'#dc2626',special:'#7c3aed',cyan:'#0891b2',shadowSm:'0 1px 3px rgba(0,0,0,0.08)',shadowMd:'0 4px 12px rgba(0,0,0,0.10)',shadowLg:'0 10px 30px rgba(0,0,0,0.12)'};
const DARK={bgMain:'#0d1117',bgCard:'#161b22',bgHover:'#1c2128',bgInput:'#0d1117',bgSubtle:'#13181f',border:'#30363d',borderHover:'#484f58',textPrimary:'#e6edf3',textSecondary:'#8b949e',textDisabled:'#484f58',accent:'#3b82f6',success:'#22c55e',warning:'#f59e0b',error:'#f87171',special:'#a78bfa',cyan:'#22d3ee',shadowSm:'0 1px 3px rgba(0,0,0,0.3)',shadowMd:'0 4px 12px rgba(0,0,0,0.4)',shadowLg:'0 10px 30px rgba(0,0,0,0.5)'};
export const CATEGORY_COLORS:Record<string,string>={architecture:'#2563eb',protocol:'#16a34a',platform:'#d97706',gateway:'#7c3aed'};
export function applyTheme(mode:'light'|'dark'){
  const t=mode==='dark'?DARK:LIGHT,r=document.documentElement;
  r.style.setProperty('--bg-main',t.bgMain);r.style.setProperty('--bg-card',t.bgCard);r.style.setProperty('--bg-hover',t.bgHover);r.style.setProperty('--bg-input',t.bgInput);r.style.setProperty('--bg-subtle',t.bgSubtle);r.style.setProperty('--border',t.border);r.style.setProperty('--border-hover',t.borderHover);r.style.setProperty('--text-primary',t.textPrimary);r.style.setProperty('--text-secondary',t.textSecondary);r.style.setProperty('--text-disabled',t.textDisabled);r.style.setProperty('--accent',t.accent);r.style.setProperty('--success',t.success);r.style.setProperty('--warning',t.warning);r.style.setProperty('--error',t.error);r.style.setProperty('--special',t.special);r.style.setProperty('--cyan',t.cyan);r.style.setProperty('--shadow-sm',t.shadowSm);r.style.setProperty('--shadow-md',t.shadowMd);r.style.setProperty('--shadow-lg',t.shadowLg);r.style.setProperty('--transition','150ms ease');
  r.style.setProperty('--modal-bg',mode==='dark'?'rgba(0,0,0,0.75)':'rgba(0,0,0,0.55)');
  r.style.setProperty('--btn-primary-shadow',mode==='dark'?'0 2px 8px rgba(59,130,246,0.35)':'0 2px 8px rgba(37,99,235,0.25)');
  r.style.setProperty('--modal-bg', mode==='dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)');
  r.style.setProperty('--btn-primary-shadow', mode==='dark' ? '0 2px 8px rgba(59,130,246,0.35)' : '0 2px 8px rgba(37,99,235,0.25)');
  r.style.setProperty('--input-bg-focus', mode==='dark' ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.04)');r.style.setProperty('--transition-md','200ms ease');r.style.setProperty('--transition-lg','300ms ease');r.style.setProperty('--font',"'Inter', system-ui, -apple-system, sans-serif");r.style.setProperty('--font-mono',"'JetBrains Mono', 'Fira Code', monospace");
  if(mode==='dark'){r.style.setProperty('--badge-blue-bg','#1d3461');r.style.setProperty('--badge-blue-fg','#60a5fa');r.style.setProperty('--badge-green-bg','#14532d');r.style.setProperty('--badge-green-fg','#4ade80');r.style.setProperty('--badge-yellow-bg','#451a03');r.style.setProperty('--badge-yellow-fg','#fbbf24');r.style.setProperty('--badge-purple-bg','#2e1065');r.style.setProperty('--badge-purple-fg','#c084fc');r.style.setProperty('--badge-red-bg','#450a0a');r.style.setProperty('--badge-red-fg','#fca5a5');r.style.setProperty('--badge-cyan-bg','#083344');r.style.setProperty('--badge-cyan-fg','#67e8f9');}
  else{r.style.setProperty('--badge-blue-bg','#dbeafe');r.style.setProperty('--badge-blue-fg','#1d4ed8');r.style.setProperty('--badge-green-bg','#dcfce7');r.style.setProperty('--badge-green-fg','#15803d');r.style.setProperty('--badge-yellow-bg','#fef3c7');r.style.setProperty('--badge-yellow-fg','#b45309');r.style.setProperty('--badge-purple-bg','#ede9fe');r.style.setProperty('--badge-purple-fg','#6d28d9');r.style.setProperty('--badge-red-bg','#fee2e2');r.style.setProperty('--badge-red-fg','#b91c1c');r.style.setProperty('--badge-cyan-bg','#cffafe');r.style.setProperty('--badge-cyan-fg','#0e7490');}
  r.setAttribute('data-theme',mode);
}
type CSSObj=React.CSSProperties;
const page:CSSObj={padding:'28px 32px',maxWidth:1160,margin:'0 auto',minHeight:'100vh',color:'var(--text-primary)',fontFamily:'var(--font)',animation:'fadeUp 0.2s ease'};
const card:CSSObj={background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,padding:20,transition:'box-shadow var(--transition-md), border-color var(--transition-md)'};
const tableHeader:CSSObj={background:'var(--bg-subtle)',borderBottom:'1px solid var(--border)'};
const tableRow:CSSObj={borderBottom:'1px solid var(--border)',transition:'background var(--transition)'};
const th:CSSObj={padding:'10px 16px',textAlign:'left' as const,fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-secondary)',whiteSpace:'nowrap' as const};
const td:CSSObj={padding:'12px 16px',fontSize:14,color:'var(--text-primary)',verticalAlign:'middle' as const};
const badge=(color:string):CSSObj=>({display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:'0.04em',background:color+'18',color:color,border:'1px solid '+color+'30'});
const btnPrimary:CSSObj={display:'inline-flex',alignItems:'center',gap:8,background:'var(--accent)',color:'white',border:'none',borderRadius:8,padding:'9px 20px',fontSize:14,fontWeight:600,cursor:'pointer',transition:'opacity var(--transition), transform var(--transition)',boxShadow:'var(--btn-primary-shadow)',letterSpacing:'-0.01em'};
const btn:CSSObj={display:'inline-flex',alignItems:'center',gap:8,background:'var(--bg-card)',color:'var(--text-primary)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 20px',fontSize:14,fontWeight:600,cursor:'pointer',transition:'background var(--transition), border-color var(--transition)'};
const input:CSSObj={background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 14px',fontSize:14,color:'var(--text-primary)',outline:'none',width:'100%',transition:'border-color var(--transition), box-shadow var(--transition)',fontFamily:'var(--font)'};
const chip=(active:boolean,color?:string):CSSObj=>({display:'inline-flex',alignItems:'center',gap:5,padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all var(--transition)',border:'1px solid '+(active?(color||'var(--accent)'):'var(--border)'),background:active?(color||'var(--accent)'):'var(--bg-card)',color:active?'white':'var(--text-secondary)'});
export const S={page,card,tableHeader,tableRow,th,td,badge,btn,btnPrimary,input,chip};
export const GLOBAL_CSS=`
  button:not(:disabled):hover{opacity:0.88;}
  input:focus,select:focus,textarea:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px rgba(37,99,235,0.12);outline:none;}
  .card-hover:hover{box-shadow:var(--shadow-md);border-color:var(--border-hover)!important;transform:translateY(-1px);}
  .table-row-hover:hover{background:var(--bg-hover)!important;cursor:pointer;}
  ::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
  [data-theme="dark"] ::selection{background:rgba(59,130,246,0.35);color:#e6edf3;}
  [data-theme="dark"] ::-webkit-scrollbar-thumb{background:var(--border-hover);}
  [data-theme="dark"] ::-webkit-scrollbar-track{background:var(--bg-subtle);}
  [data-theme="dark"] input,
  [data-theme="dark"] select,
  [data-theme="dark"] textarea{color-scheme:dark;}
  [data-theme="dark"] .card-hover:hover{box-shadow:0 4px 20px rgba(0,0,0,0.45);border-color:var(--border-hover)!important;}
  [data-theme="dark"] table{color-scheme:dark;}
\`;
