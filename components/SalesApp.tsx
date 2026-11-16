'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, Camera, Check, CheckCircle2, ChevronDown, ClipboardCopy,
  Cloud, CreditCard, HardDrive, Info, Laptop, Layers, MapPin, MemoryStick,
  Minus, Monitor, Package, Plus, Printer, RotateCcw, ShieldCheck, Sparkles,
  Target, Truck, X, Zap, type LucideIcon,
} from 'lucide-react';
import { ADDONS, CATALOG_DATE, DEPT_EXTRA, PACKAGES, type PackageId, type ProductId } from '@/lib/catalog';
import {
  DEFAULT_ANSWERS, DEFAULT_HARDWARE_NEEDS, estimateIndividualComponents,
  getRecommendations, price, type HardwareNeeds, type QuoteAnswers,
  type QuoteEvaluation,
} from '@/lib/quote';
import { STATES } from '@/lib/states';
import { getStateRate, stateHardwareTax, STATE_RATE_SOURCE, STATE_RATE_SOURCE_URL } from '@/lib/tax';

const INITIAL:QuoteAnswers={...DEFAULT_ANSWERS,hardwareNeeds:{...DEFAULT_HARDWARE_NEEDS}};
const EQUIPMENT: Array<{key:keyof HardwareNeeds;title:string;hint:string;icon:LucideIcon}>=[
  {key:'cameras',title:'360° cameras',hint:'Capture your action from every angle',icon:Camera},
  {key:'mounts',title:'Camera mounts',hint:'One comes with each package camera',icon:Target},
  {key:'sdCards',title:'Recording cards',hint:'One microSD comes with each camera',icon:MemoryStick},
  {key:'laptops',title:'Processing laptops',hint:'Configured and ready for capture',icon:Laptop},
  {key:'tripods',title:'Camera tripods',hint:'Portable setup at your venue',icon:Layers},
  {key:'cases',title:'Pelican cases',hint:'Protective equipment transport',icon:Package},
  {key:'ipads',title:'Refurbished iPads',hint:'Additional configured mobile access',icon:Monitor},
  {key:'backup',title:'6 TB backup drives',hint:'Optional local video backup',icon:HardDrive},
];
const count=(v:number,min=0,max=100)=>Number.isFinite(v)?Math.min(max,Math.max(min,Math.floor(v))):min;
const fmt=(v:number)=>new Intl.NumberFormat('en-US').format(v);
const stateLabel=(s:string)=>STATES.find(x=>x[0]===s)?.[1]??s;
function Quantity({label,value,onChange,min=0,max=100}:{label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number}){
  return <div className="qty" role="group" aria-label={label}>
    <button type="button" aria-label={`Remove one ${label}`} onClick={()=>onChange(count(value-1,min,max))} disabled={value<=min}><Minus size={16}/></button>
    <input aria-label={`${label} quantity`} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={e=>onChange(count(Number(e.target.value),min,max))}/>
    <button type="button" aria-label={`Add one ${label}`} onClick={()=>onChange(count(value+1,min,max))} disabled={value>=max}><Plus size={16}/></button>
  </div>;
}
function Radio<T extends string>({label,items,value,onChange}:{label:string;items:{value:T;name:string;hint?:string}[];value:T;onChange:(v:T)=>void}){
  return <div className="radio-options" role="radiogroup" aria-label={label}>{items.map(i=><label key={i.value} className={`radio-pill ${value===i.value?'active':''}`}>
    <input type="radio" name={label} checked={value===i.value} onChange={()=>onChange(i.value)}/>
    <span className="radio-check">{value===i.value&&<Check size={13}/>}</span>
    <span><strong>{i.name}</strong>{i.hint&&<small>{i.hint}</small>}</span>
  </label>)}</div>;
}
function PriceRow({label,value,soft=false}:{label:string;value:string;soft?:boolean}){return <div className={`price-row ${soft?'subtle':''}`}><span>{label}</span><strong>{value}</strong></div>;}
function valueBonuses(q:QuoteEvaluation,a:QuoteAnswers){
  const p=q.package;const h=a.hardwareNeeds??DEFAULT_HARDWARE_NEEDS;
  const kitCount=p.id==='department'?Math.max(5,a.teams):a.teams;
  const includedCameras=p.camerasPerTeam*kitCount;
  const includedCases=p.casePerTeam*kitCount;
  const list:string[]=[];
  if(includedCameras>h.cameras)list.push(`${includedCameras-h.cameras} additional 360° camera${includedCameras-h.cameras===1?'':'s'} with mounts and cards`);
  if(includedCases>h.cases)list.push(`${includedCases-h.cases} Pelican protective case${includedCases-h.cases===1?'':'s'}`);
  if(q.includedStorageGb>a.storageGb)list.push(`${fmt(q.includedStorageGb-a.storageGb)} GB more cloud storage than requested`);
  if(q.includedDeliveryGb>a.deliveryGb)list.push(`${fmt(q.includedDeliveryGb-a.deliveryGb)} GB/month extra video delivery capacity`);
  if(p.priority&&!a.priority)list.push('Priority technical support');
  if(p.protection&&!a.protection)list.push('Premium equipment protection');
  const includedTraining=p.trainingHoursPerTeam*kitCount;
  if(includedTraining>a.trainingHours)list.push(`${includedTraining-a.trainingHours} annual remote-training hour${includedTraining-a.trainingHours===1?'':'s'}`);
  if(p.retentionMonths>a.retentionMonths)list.push(`${p.retentionMonths}-month video retention`);
  if(p.departmentAdmin&&!a.departmentAdmin)list.push('Centralized department administration');
  if(!list.length)list.push('One mount and recording card per included camera','ProTracer software and standard technical support');
  return list.slice(0,5);
}
function pitch(q:QuoteEvaluation,a:QuoteAnswers){
  const name=q.package.id;
  if(name==='basic')return 'All the essentials for a strong start: a complete camera, mount, recording card and processing setup with ProTracer software, video storage and standard support.';
  if(name==='plus')return 'Cover more of the action: Team Plus includes two complete camera-and-mount setups and a Pelican case, while keeping the same recurring service price as Basic.';
  if(name==='premium')return 'Step up to larger cloud capacity, extended retention, priority service, premium protection and annual training—alongside your two complete camera systems.';
  return `Equip ${Math.max(5,a.teams)} named teams under one department account with individual camera kits, pooled video storage and centralized oversight.`;
}
function baseYear(q:QuoteEvaluation,a:QuoteAnswers){
  const p=q.package;const extra=p.id==='department'?Math.max(0,a.teams-5):0;
  const multiplier=p.id==='department'?1:a.teams;
  return p.hardware*multiplier+extra*DEPT_EXTRA.hardware+
    (a.billing==='annual'?(p.annualService*multiplier+extra*DEPT_EXTRA.annual):(p.monthlyService*multiplier+extra*DEPT_EXTRA.monthly)*12);
}

export default function SalesApp(){
  const [answers,setAnswers]=useState<QuoteAnswers>(INITIAL);
  const [selected,setSelected]=useState<PackageId|null>(null);
  const [extrasOpen,setExtrasOpen]=useState(false);
  const [compareOpen,setCompareOpen]=useState(false);
  const [breakdownOpen,setBreakdownOpen]=useState(false);
  const [copied,setCopied]=useState(false);
  const [zipStatus,setZipStatus]=useState<'empty'|'checking'|'found'|'not-found'|'error'>('empty');
  const [zipCity,setZipCity]=useState('');
  const h=answers.hardwareNeeds??DEFAULT_HARDWARE_NEEDS;
  const recom=useMemo(()=>getRecommendations(answers),[answers]);
  const independent=useMemo(()=>estimateIndividualComponents(answers),[answers]);
  const preferred=recom.recommended;
  const manuallySelected=recom.comparisons.find(p=>p.package.id===selected&&p.eligible);
  const configured=manuallySelected??preferred;
  const stateRate=getStateRate(answers.shippingState);
  const independentStateTax=stateHardwareTax(independent.taxableBase,answers.shippingState);
  const pickedExtras=ADDONS.filter(x=>(answers.addonQuantities[x.id]??0)>0);
  const extraCount=pickedExtras.reduce((n,x)=>n+(answers.addonQuantities[x.id]??0),0);
  const extraEstimate=pickedExtras.reduce((n,x)=>n+x.price*(answers.addonQuantities[x.id]??0),0);
  const firstYear=configured?(configured.firstYearTotal??configured.firstYearBeforeTax):null;
  const selectionDiffers=preferred&&configured&&preferred.package.id!==configured.package.id;

  function update<K extends keyof QuoteAnswers>(field:K,value:QuoteAnswers[K],clearSelection=true){
    setAnswers(prev=>({...prev,[field]:value}));if(clearSelection)setSelected(null);
  }
  function reset(){setAnswers({...INITIAL,hardwareNeeds:{...DEFAULT_HARDWARE_NEEDS},addonQuantities:{}});setSelected(null);setZipStatus('empty');setZipCity('');setCopied(false);}
  function changeTeamCount(n:number){
    setAnswers(a=>{
      const prev=a.hardwareNeeds??DEFAULT_HARDWARE_NEEDS;
      const updated={...prev};
      for(const key of ['cameras','mounts','sdCards','laptops','tripods'] as const){
        const prior=prev[key];
        updated[key]=count(prior===a.teams*2?n*2:prior===a.teams?n:prior+(n-a.teams));
      }
      return {...a,teams:n,hardwareNeeds:updated};
    });setSelected(null);
  }
  function changeHardware(key:keyof HardwareNeeds,n:number){
    setAnswers(a=>{
      const prev=a.hardwareNeeds??DEFAULT_HARDWARE_NEEDS;
      const updated={...prev,[key]:n};
      if(key==='cameras'){
        const delta=n-prev.cameras;
        updated.mounts=count(prev.mounts+delta);
        updated.sdCards=count(prev.sdCards+delta);
      }
      return {...a,hardwareNeeds:updated};
    });setSelected(null);
  }
  function changeAddon(id:ProductId,value:number){
    setAnswers(a=>({...a,addonQuantities:{...a.addonQuantities,[id]:value}}));setSelected(null);
  }
  function setState(state:string){
    setAnswers(a=>({...a,shippingState:state,shippingZip:''}));
    setZipStatus('empty');setZipCity('');
  }
  // ZIP autocomplete identifies the STATE, not an exact local sales tax district.
  useEffect(()=>{
    const zip=answers.shippingZip;
    if(!/^\d{5}$/.test(zip)){setZipStatus('empty');setZipCity('');return;}
    const controller=new AbortController();
    setZipStatus('checking');
    const timer=setTimeout(async()=>{
      try{
        const response=await fetch(`https://api.zippopotam.us/us/${zip}`,{signal:controller.signal});
        if(!response.ok){setZipStatus('not-found');return;}
        const data=await response.json() as {'places'?:Array<{'state abbreviation'?:string,'place name'?:string}>};
        const place=data.places?.[0];
        const state=place?.['state abbreviation']??'';
        if(getStateRate(state)===null){setZipStatus('not-found');return;}
        setAnswers(a=>a.shippingZip===zip?{...a,shippingState:state}:a);
        setZipCity(place?.['place name']??'');setZipStatus('found');
      }catch(e){if(!controller.signal.aborted)setZipStatus('error');}
    },320);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[answers.shippingZip]);

  function summary(){
    const quote=configured;
    const headline=quote?.package.title??'Custom package – consultation required';
    const destination=answers.shippingState?`${stateLabel(answers.shippingState)} (${answers.shippingState})`:'Not entered';
    const lines=[
      'PROTRACER | PERSONALIZED PACKAGE ESTIMATE',
      `Program: ${answers.teams} named team(s)`,
      `Requested: ${h.cameras} cameras, ${h.mounts} mounts, ${h.sdCards} microSD cards, ${h.laptops} laptops, ${h.tripods} tripods, ${h.cases} Pelican cases`,
      `Recommended: ${preferred?.package.title??'Custom review required'}`,
      `Configured selection: ${headline}`,
      `Individually priced catalog reference (first year): ${price(independent.firstYear)} before tax; not an independent product offering`,
      `Recommended base package: ${preferred?price(baseYear(preferred,answers)):'Contact ProTracer'}`,
      `Configured first-year price before tax: ${quote?price(quote.firstYearBeforeTax):'Custom quote needed'}`,
      `Hardware tax estimate: ${quote&&quote.taxAmount!==null?price(quote.taxAmount):'Not calculated (select state)'}`,
      `State-level rate: ${stateRate===null?'Not selected':stateRate+'%'}`,
      `Estimated first year including state-level tax: ${firstYear===null?'Custom quote needed':price(firstYear)}`,
      `Shipping location: ${destination}${answers.shippingZip?' '+answers.shippingZip:''}`,
      `Billing: ${answers.billing==='annual'?'Annual service prepaid':'Monthly service payments; hardware upfront'}`,
      '',
      'Included highlights:',...(quote?valueBonuses(quote,answers).map(v=>'• '+v):[]),
      '',
      'Estimate only. Local/district taxes, freight, exemptions and site-specific charges not included. One-time equipment/setup is treated as tangible hardware for this estimate; actual tax treatment must be confirmed. Prices subject to written quote. https://www.protracerofficial.com',
    ];
    return lines.join('\n');
  }
  async function copySummary(){
    try{await navigator.clipboard.writeText(summary());setCopied(true);setTimeout(()=>setCopied(false),2800);}catch{setCopied(false);}
  }

  return <main id="top" className="site">
    <header className="topbar"><div className="container topbar-content">
      <a href="#top" className="wordmark" aria-label="ProTracer package builder home"><img src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/protracer-logo.png`} alt="ProTracer"/><span>PACKAGE BUILDER</span></a>
      <nav aria-label="Site navigation"><a href="#build">Build your kit</a><a href="#packages">Compare packages</a><a href="https://www.protracerofficial.com/" target="_blank" rel="noopener noreferrer">ProTracer website <ArrowRight size={14}/></a></nav>
    </div></header>

    <section className="hero"><div className="container hero-body">
      <div className="hero-copy"><span className="eyebrow"><span className="light-dot"/> 360° VIDEO PERFORMANCE TECHNOLOGY</span><h1>Build your system.<br/><em>See every angle.</em></h1><p>Tell us what you need. We'll compare individual-item prices, find the best complete package and show you everything you get.</p><div className="hero-trust"><span><CheckCircle2 size={16}/> Simple quantities</span><span><CheckCircle2 size={16}/> Transparent pricing</span><span><CheckCircle2 size={16}/> No signup required</span></div></div>
      <div className="hero-display" aria-hidden="true"><div className="scope scope-one"/><div className="scope scope-two"/><div className="scope scope-three"/><div className="scope-center"><Camera size={68} strokeWidth={1.5}/></div><div className="display-label label-a"><Zap size={17}/> Every angle</div><div className="display-label label-b"><Target size={17}/> Built for your team</div></div>
    </div></section>

    <div className="container layout" id="build"><div className="builder">
      <div className="step-navigation"><div><span className="step-tag">01 · PROGRAM</span><span className="step-tag">02 · EQUIPMENT</span><span className="step-tag">03 · SERVICE</span><span className="step-tag">04 · RESULTS</span></div><button onClick={reset} className="text-button" type="button"><RotateCcw size={14}/> Reset all</button></div>

      <section className="card" aria-labelledby="program-heading"><div className="section-title"><span className="number">01</span><div><span className="kicker">LET'S START HERE</span><h2 id="program-heading">Who are we building for?</h2><p>One team or an entire athletic department—your choices update the price instantly.</p></div></div>
        <Radio label="Organization type" items={[{value:'school',name:'School / College'},{value:'club',name:'Club / Academy'},{value:'organization',name:'Athletic department'},{value:'other',name:'Other'}]} value={answers.buyerType} onChange={v=>update('buyerType',v)}/>
        <div className="setting-row"><div><strong>How many named teams?</strong><small>Varsity, JV, men's and women's teams each count separately.</small></div><Quantity label="Teams" min={1} max={50} value={answers.teams} onChange={changeTeamCount}/></div>
        <div className="toggle-card"><label><input type="checkbox" checked={answers.departmentAdmin} onChange={e=>update('departmentAdmin',e.target.checked)}/><span><strong>One shared department account</strong><small>Central team management and pooled cloud capacity.</small></span></label></div>
        {answers.teams>10&&<p className="warning"><Info size={16}/> More than 10 named teams requires custom department pricing.</p>}
      </section>

      <section className="card" aria-labelledby="equipment-heading"><div className="section-title"><span className="number">02</span><div><span className="kicker">SELECT EXACT QUANTITIES</span><h2 id="equipment-heading">What equipment do you need?</h2><p>Enter the <strong>total needed</strong>, not extra items on top of a package.</p></div></div>
        <div className="rule"><BadgeCheck size={23}/><span><strong>One camera = one included mount + recording card</strong><small>Every package includes a sport mount and microSD card per camera. We credit these automatically so you never pay twice.</small></span></div>
        <div className="quick-set"><span>Quick start</span><button type="button" onClick={()=>{setAnswers(a=>({...a,hardwareNeeds:{...(a.hardwareNeeds??DEFAULT_HARDWARE_NEEDS),cameras:a.teams,mounts:a.teams,sdCards:a.teams,laptops:a.teams,tripods:a.teams}}));setSelected(null);}}>1 camera / team</button><button type="button" onClick={()=>{setAnswers(a=>({...a,hardwareNeeds:{...(a.hardwareNeeds??DEFAULT_HARDWARE_NEEDS),cameras:a.teams*2,mounts:a.teams*2,sdCards:a.teams*2,laptops:a.teams,tripods:a.teams}}));setSelected(null);}}>2 cameras / team</button></div>
        <div className="equipment-grid">{EQUIPMENT.map(e=>{const Icon=e.icon;return <div className="equipment-row" key={e.key}><div className="equipment-icon"><Icon size={20}/></div><div className="equipment-copy"><strong>{e.title}</strong><small>{e.hint}</small></div><Quantity label={e.title} min={e.key==='cameras'?1:0} max={100} value={h[e.key]} onChange={v=>changeHardware(e.key,v)}/></div>;})}</div>
        <p className="helper"><Info size={15}/> Camera changes adjust mount and card quantities automatically; you can edit either independently.</p>
      </section>

      <section className="card" aria-labelledby="service-heading"><div className="section-title"><span className="number">03</span><div><span className="kicker">MAKE IT YOURS</span><h2 id="service-heading">Cloud, support and billing</h2><p>Choose the capabilities that matter to your program.</p></div></div>
        <div className="select-grid"><label>Cloud storage<select value={answers.storageGb} onChange={e=>update('storageGb',Number(e.target.value))}>{[500,1000,2000,3000,5000,10000,15000,20000,50000].map(v=><option key={v} value={v}>{v<1000?`${v} GB`:`${fmt(v/1000)} TB`}</option>)}</select></label>
          <label>Monthly video viewing / downloads<select value={answers.deliveryGb} onChange={e=>update('deliveryGb',Number(e.target.value))}>{[100,250,500,750,1000,1250,2000,2500,5000,10000].map(v=><option key={v} value={v}>{fmt(v)} GB / month</option>)}</select></label>
          <label>Video retention<select value={answers.retentionMonths} onChange={e=>update('retentionMonths',Number(e.target.value))}><option value={12}>12 months</option><option value={24}>24 months</option><option value={36}>36 months (custom)</option></select></label>
          <label>Requested training hours<div className="qty-wrapper"><Quantity label="Training hours" value={answers.trainingHours} max={100} onChange={v=>update('trainingHours',v)}/></div></label>
        </div>
        <div className="feature-toggles"><label><input type="checkbox" checked={answers.priority} onChange={e=>update('priority',e.target.checked)}/><span><strong>Priority technical support</strong><small>Premium + Department include this.</small></span></label><label><input type="checkbox" checked={answers.protection} onChange={e=>update('protection',e.target.checked)}/><span><strong>Premium equipment protection</strong><small>Included in Premium + Department.</small></span></label><label><input type="checkbox" checked={!answers.acceptOverages} onChange={e=>update('acceptOverages',!e.target.checked)}/><span><strong>Only show options within my cloud limits</strong><small>Request custom terms if your usage exceeds a package.</small></span></label></div>
        <div className="billing-section"><span className="form-label">How would you prefer to pay for software service?</span><Radio label="Billing frequency" items={[{value:'annual',name:'Annual prepay',hint:'Discounted service + hardware upfront'},{value:'monthly',name:'Monthly service',hint:'Hardware upfront + 12 monthly payments'}]} value={answers.billing} onChange={v=>update('billing',v,false)}/></div>
      </section>

      <section className="card extras-card" aria-labelledby="extras-heading"><div className="section-title"><span className="number">+</span><div><span className="kicker">OPTIONAL, NEVER REQUIRED</span><h2 id="extras-heading">Need anything extra?</h2><p>These are <strong>additional items beyond the quantities above</strong>.</p></div></div>
        <div className="extras-preview"><div className="extras-round"><Plus size={20}/></div><span><strong>{extraCount?`${extraCount} extra item${extraCount===1?'':'s'} added`:'No optional extras added'}</strong><small>{extraCount?`${price(extraEstimate)} at catalog rates before applicable tax`:'Add spare equipment, training, installation and more.'}</small></span><button type="button" className="button button-blue" onClick={()=>setExtrasOpen(true)}><Plus size={17}/> {extraCount?'Edit add-ons':'Add optional extras'}</button></div>
        {pickedExtras.length>0&&<div className="extra-chips">{pickedExtras.map(x=><span key={x.id}>{answers.addonQuantities[x.id]} × {x.name}</span>)}</div>}
      </section>

      <section className="card tax-card" aria-labelledby="tax-heading"><div className="section-title"><span className="number"><MapPin size={20}/></span><div><span className="kicker">AUTOMATIC TAX ESTIMATE</span><h2 id="tax-heading">Where will the equipment ship?</h2><p>Enter a ZIP code <strong>or</strong> choose a state. We'll calculate the state's rate on tangible hardware.</p></div></div>
        <div className="tax-fields"><label>ZIP code (auto-fills state)<input aria-label="US shipping ZIP code" placeholder="e.g. 33602" inputMode="numeric" maxLength={5} value={answers.shippingZip} onChange={e=>{setAnswers(a=>({...a,shippingZip:e.target.value.replace(/\D/g,'').slice(0,5),shippingState:''}));setZipCity('');setZipStatus('empty');}}/></label><span className="or">OR</span><label>Shipping state<select aria-label="Shipping state" value={answers.shippingState} onChange={e=>setState(e.target.value)}><option value="">Choose a state</option>{STATES.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select></label></div>
        {zipStatus==='checking'&&<p className="state-status" aria-live="polite">Finding the state for ZIP {answers.shippingZip}…</p>}
        {zipStatus==='found'&&<p className="state-status success" aria-live="polite"><CheckCircle2 size={15}/> Found {zipCity}, {stateLabel(answers.shippingState)}.</p>}
        {zipStatus==='not-found'&&<p className="state-status" role="status">ZIP not found. You can still select the state manually.</p>}
        {zipStatus==='error'&&<p className="state-status" role="status">ZIP lookup is unavailable. Choose the state manually to calculate state-level tax.</p>}
        <div className="tax-estimate"><div><span>Estimated state tax rate</span><strong>{stateRate===null?'—':`${stateRate}%`}</strong></div><div><span>On selected package hardware</span><strong>{configured&&configured.taxAmount!==null?price(configured.taxAmount):'Select state'}</strong></div></div>
        <p className="tax-disclaimer"><Info size={15}/> This is a <strong>state-only</strong> estimate. ZIP codes do not identify an exact city/county tax jurisdiction. Local and district sales taxes, exemptions, freight and any special rules are <strong>not included</strong>. No sales tax is estimated on subscriptions, training or other separately listed services. Final tax is confirmed when quoted. <a href={STATE_RATE_SOURCE_URL} target="_blank" rel="noopener noreferrer">Rate source: {STATE_RATE_SOURCE}</a>.</p>
      </section>

      <section className="card packages-card" id="packages" aria-labelledby="packages-heading"><div className="section-title"><span className="number">04</span><div><span className="kicker">YOUR OPTIONS, SIDE BY SIDE</span><h2 id="packages-heading">Compare complete packages</h2><p>Each estimate adds only what's missing from your requested quantities.</p></div></div>
        <div className="package-options">{recom.comparisons.map(q=>{const isPicked=configured?.package.id===q.package.id;const isBest=preferred?.package.id===q.package.id;const total=q.firstYearTotal??q.firstYearBeforeTax;const kits=q.package.id==='department'?Math.max(5,answers.teams):answers.teams*q.package.camerasPerTeam;return <button type="button" key={q.package.id} className={`package-option ${isPicked?'picked':''} ${!q.eligible?'not-eligible':''}`} disabled={!q.eligible} onClick={()=>setSelected(q.package.id)}><span className="package-option-icon">{isPicked?<Check size={16}/>:<Package size={17}/>}</span><span className="package-option-main"><span className="package-name">{q.package.title}{isBest&&<span className="tag">BEST FIT</span>}</span><span className="package-specs">{kits} camera{kits===1?'':'s'} + {kits} mounts · {fmt(q.includedStorageGb)} GB cloud</span>{!q.eligible&&<span className="package-error">Custom scope review required</span>}</span><span className="package-price"><strong>{q.eligible?price(total):'Custom'}</strong><small>{stateRate===null?'before tax':'incl. state-only tax'}</small></span></button>;})}</div>
        <button className="expand-button" type="button" aria-expanded={compareOpen} onClick={()=>setCompareOpen(!compareOpen)}>Compare all included features <ChevronDown size={17} className={compareOpen?'up':''}/></button>
        {compareOpen&&<div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>Included</th>{PACKAGES.map(p=><th key={p.id}>{p.title}</th>)}</tr></thead><tbody>{[
          ['Cameras / mounts',...PACKAGES.map(p=>String((p.id==='department'?Math.max(5,answers.teams):answers.teams*p.camerasPerTeam))+' / '+String(p.id==='department'?Math.max(5,answers.teams):answers.teams*p.mountPerTeam))],
          ['Recording cards',...PACKAGES.map(p=>String(p.id==='department'?Math.max(5,answers.teams):answers.teams*p.camerasPerTeam))],
          ['Pelican cases',...PACKAGES.map(p=>String(p.id==='department'?0:answers.teams*p.casePerTeam))],
          ['Storage',...recom.comparisons.map(q=>fmt(q.includedStorageGb)+' GB')],
          ['Video viewing/downloads',...recom.comparisons.map(q=>fmt(q.includedDeliveryGb)+' GB/mo')],
          ['Retention',...PACKAGES.map(p=>p.retentionMonths+' months')],
          ['Support',...PACKAGES.map(p=>p.priority?'Priority':'Standard')],
          ['Premium protection',...PACKAGES.map(p=>p.protection?'Included':'Optional')],
          ['Annual training',...PACKAGES.map(p=>p.trainingHoursPerTeam?`${p.trainingHoursPerTeam} hr / team`:'Optional')],
        ].map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th scope="row" key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
      </section>
    </div>

    <aside className="quote-column" aria-label="Live quote estimate"><div className="quote-box">
      <div className="quote-eyebrow"><span className="live-dot"/> YOUR LIVE ESTIMATE <small>USD</small></div>
      <div className="recommendation"><div className="recommend-chip"><Sparkles size={16}/> OUR RECOMMENDATION</div><h2>{preferred?.package.title??'Custom package'}</h2><p>{preferred?pitch(preferred,answers):'Your requirements need a custom conversation with ProTracer.'}</p></div>
      {configured&&<div className="bonus"><h3><BadgeCheck size={17}/> More value you receive</h3><ul>{valueBonuses(configured,answers).map(s=><li key={s}><CheckCircle2 size={16}/>{s}</li>)}</ul></div>}
      {selectionDiffers&&<div className="selection-banner">Viewing your selection: <strong>{configured?.package.title}</strong> · Recommended: <strong>{preferred?.package.title}</strong></div>}
      <div className="compare-prices">
        <div className="compare-price"><span>INDIVIDUAL CATALOG ITEMS</span><strong>{price(independent.firstYear+(independentStateTax??0))}</strong><small>Hardware + Basic software reference · {stateRate===null?'before tax':'incl. state-only tax'} · not sold as a standalone bundle</small></div>
        <div className="compare-price"><span>RECOMMENDED COMPLETE PACKAGE</span><strong>{preferred?price(baseYear(preferred,answers)):'Custom'}</strong><small>Published package base, before extras or tax</small></div>
        <div className="compare-price final"><span>YOUR CUSTOMIZED PACKAGE</span><strong>{firstYear===null?'Custom quote':price(firstYear)}</strong><small>{stateRate===null?'First year before tax':'First year including state tax estimate'} · upgrades + extras included</small></div>
      </div>
      {configured&&<><div className="quote-breakdown"><PriceRow label="Hardware + selected upgrades" value={price(configured.hardwareSubtotal)}/><PriceRow label="One-time professional services" value={price(configured.oneTimeServices)}/><PriceRow label={answers.billing==='annual'?'Annual service (prepaid)':'Monthly base service'} value={price(answers.billing==='annual'?configured.annualService:configured.monthlyBaseService)}/>{answers.billing==='monthly'&&configured.annualExtras>0&&<PriceRow label="Additional annual services" value={price(configured.annualExtras)}/>}<PriceRow label="State-only hardware tax estimate" value={configured.taxAmount===null?'Choose state':price(configured.taxAmount)} soft/></div>
        <div className="due-box"><span>ESTIMATED DUE UPFRONT</span><strong>{price(configured.dueNow??configured.dueBeforeTax)}</strong><small>{configured.taxAmount===null?'Before sales tax.':'Includes estimated state-only hardware tax.'} {answers.billing==='monthly'?'Hardware and first service month.':'Hardware and prepaid annual service.'}</small></div>
        <div className="billing-foot"><CreditCard size={16}/><span>{answers.billing==='annual'?'Annual payment saves on recurring service.':'Twelve monthly service installments; hardware is NOT financed.'}</span></div>
        {configured.estimatedUsageAnnual>0&&<p className="overage-message"><Info size={15}/> {price(configured.estimatedUsageAnnual)} of annual usage overages are estimated in the first-year number, but only charged if actually incurred.</p>}
        <button type="button" className="expand-button lines-link" aria-expanded={breakdownOpen} onClick={()=>setBreakdownOpen(!breakdownOpen)}>See every line item <ChevronDown className={breakdownOpen?'up':''} size={17}/></button>
        {breakdownOpen&&<div className="quote-lines">{configured.lines.filter(x=>x.amount>0).map((l,i)=><div key={`${l.name}-${i}`}><span>{l.name}<small>{l.quantity} × {price(l.unitPrice)} · {l.period==='year'?'yearly':'one-time'}</small></span><strong>{price(l.amount)}</strong></div>)}{configured.estimatedUsageAnnual>0&&<div><span>Usage overages (estimate)<small>Only billed for actual use</small></span><strong>{price(configured.estimatedUsageAnnual)}</strong></div>}</div>}
      </>}
      <div className="quote-actions"><button className="button button-light" type="button" onClick={()=>window.print()}><Printer size={18}/> Print</button><button className="button button-blue" type="button" onClick={copySummary}><ClipboardCopy size={17}/>{copied?'Copied!':'Copy summary'}</button></div>
      <a className="contact-link" href="https://www.protracerofficial.com/" target="_blank" rel="noopener noreferrer">Explore ProTracer <ArrowRight size={17}/></a>
      <p className="legal">Illustrative, nonbinding package estimate. State-only tax shown when selected; local taxes and freight are extra. Taxes apply here only to tangible equipment and one-time bundled equipment/setup charges pending final tax review. No account or invoice is created.</p>
    </div></aside></div>

    <footer className="footer"><div className="container footer-inner"><div><img src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/protracer-logo.png`} alt="ProTracer"/><span>Package Builder · Rates as of {CATALOG_DATE}</span></div><a href="https://www.protracerofficial.com/" target="_blank" rel="noopener noreferrer">ProTracerOfficial.com <ArrowRight size={15}/></a></div></footer>

    {extrasOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setExtrasOpen(false);}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="extras-modal-title"><div className="modal-top"><div><span className="kicker">BUILD YOUR CUSTOM SYSTEM</span><h2 id="extras-modal-title">Add optional extras</h2><p>These quantities are in <strong>addition</strong> to the equipment you entered above.</p></div><button className="icon-button" onClick={()=>setExtrasOpen(false)} aria-label="Close add-ons" type="button"><X size={22}/></button></div><div className="modal-content">{(['hardware','service','annual'] as const).map(group=><div className="addon-group" key={group}><h3>{group==='hardware'?'Extra equipment':group==='service'?'Professional services':'Additional annual options'}</h3>{ADDONS.filter(x=>x.category===group).map(a=><div className="addon-row" key={a.id}><div><strong>{a.name}</strong><small>{a.detail}</small><span>{price(a.price)}{group==='annual'?'/year':''}</span></div><Quantity label={a.name} value={answers.addonQuantities[a.id]??0} onChange={v=>changeAddon(a.id,v)}/></div>)}</div>)}</div><div className="modal-bottom"><span><strong>{extraCount} selected</strong><small>Catalog subtotal {price(extraEstimate)} before tax</small></span><button className="button button-blue" onClick={()=>setExtrasOpen(false)} type="button"><Check size={17}/> Apply extras</button></div></div></div>}
  </main>;
}
