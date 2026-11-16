'use client';
import { useMemo, useState } from 'react';
import {
  ArrowRight, ArrowLeft, BadgeCheck, Building2, Camera, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clock3, FileDown, FileText, HardDrive,
  Headphones, Info, Laptop, Layers3, LockKeyhole, MapPin, Minus, Plus, Printer,
  RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Target, Trophy, X
} from 'lucide-react';
import { ADDONS, CATALOG_DATE, type PackageId, type ProductId } from '@/lib/catalog';
import { DEFAULT_ANSWERS, getRecommendations, price, type QuoteAnswers, type QuoteEvaluation } from '@/lib/quote';
import { STATES } from '@/lib/states';

type Mode='customer'|'staff';
type Contact={billingName:string;organization:string;teamNames:string;email:string;representative:string;existingCustomerNumber:string};
type Saved={id:string;invoiceNumber:string;customerNumber:string;dueNow:number};
const EMPTY_CONTACT:Contact={billingName:'',organization:'',teamNames:'',email:'',representative:'',existingCustomerNumber:''};
const STEPS=[{eyebrow:'01 / YOUR PROGRAM',title:'Tell us about your team',short:'Your program'},
  {eyebrow:'02 / YOUR NEEDS',title:'What does great coverage look like?',short:'Your needs'},
  {eyebrow:'03 / YOUR SETUP',title:'Make the setup yours',short:'Your setup'},
  {eyebrow:'04 / YOUR MATCH',title:'Your best-fit ProTracer setup',short:'Your match'}] as const;
function RadioSet<T extends string|number>({name,items,value,onChange,columns=3}: {name:string;items:{value:T;label:string;detail?:string}[];value:T;onChange:(value:T)=>void;columns?:number}){
  return <div className={'radio-grid cols-'+columns} role="radiogroup" aria-label={name}>{items.map(item=><label key={String(item.value)} className={'radio-tile '+(value===item.value?'is-selected':'')}>
    <input type="radio" name={name} value={String(item.value)} checked={value===item.value} onChange={()=>onChange(item.value)}/>
    <span className="radio-symbol"><Check size={13}/></span><span><strong>{item.label}</strong>{item.detail&&<small>{item.detail}</small>}</span>
  </label>)}</div>;
}
function Field({label,children,hint,required=false}:{label:string;children:React.ReactNode;hint?:string;required?:boolean}){
  return <div className="field"><label className="field-label">{label}{required&&<span className="required"> *</span>}</label>{children}{hint&&<span className="field-hint">{hint}</span>}</div>;
}
function CaptionIcon({type}:{type:'camera'|'storage'|'support'|'retention'}){
  return type==='camera'?<Camera size={16}/>:type==='storage'?<HardDrive size={16}/>:type==='support'?<Headphones size={16}/>:<Clock3 size={16}/>;
}
function QtyControl({value,onChange}:{value:number;onChange:(x:number)=>void}){
  return <div className="qty-control"><button aria-label="Remove one" type="button" disabled={value<=0} onClick={()=>onChange(Math.max(0,value-1))}><Minus size={15}/></button><span aria-live="polite">{value}</span><button aria-label="Add one" type="button" disabled={value>=100} onClick={()=>onChange(Math.min(100,value+1))}><Plus size={15}/></button></div>;
}
function TotalTag({amount,muted=false}:{amount:number|null;muted?:boolean}){
  return <span className={muted?'muted':''}>{amount===null?'Tax pending':price(amount)}</span>;
}
function PackageCard({item,recommended,selected,onSelect}:{item:QuoteEvaluation;recommended:boolean;selected:boolean;onSelect:(x:PackageId)=>void}){
  const p=item.package;
  return <article className={'package-card '+(selected?'chosen ':'')+(recommended?'best':'')}>
    <div className="package-top"><span className="package-badge">{recommended?<><Sparkles size={12}/> Recommended</>:p.badge}</span>{!item.eligible&&<span className="tiny-warning">Custom review</span>}</div>
    <h3>{p.title}</h3><p className="package-subtitle">{p.subtitle}</p>
    <div className="package-price"><strong>{price(item.firstYearBeforeTax)}</strong><span>estimated year one, before tax</span></div>
    <div className="package-meta"><span><strong>{price(item.hardwareSubtotal)}</strong> one-time hardware</span><span><strong>{price(item.annualService)}</strong> / yr service</span></div>
    <div className="package-divider"/>
    <ul className="feature-list">
      <li><Check size={15}/>{p.camerasPerTeam} included camera{p.camerasPerTeam>1?'s':''} per active team</li>
      <li><Check size={15}/>{item.includedStorageGb.toLocaleString()} GB retained cloud</li>
      <li><Check size={15}/>{item.includedDeliveryGb.toLocaleString()} GB monthly delivery</li>
      <li><Check size={15}/>{p.retentionMonths} months retention</li>
      <li><Check size={15}/>{p.priority?'Priority':'Standard'} support</li>
    </ul>
    {item.reasons.length>0&&<div className="package-reason"><Info size={15}/><span>{item.reasons[0]}</span></div>}
    <button type="button" className={'select-package '+(selected?'active':'')} onClick={()=>onSelect(p.id)} disabled={!item.eligible}>
      {selected?'Selected package':item.eligible?'Compare this package':'Requires custom quote'}{selected?<CheckCircle2 size={17}/>:<ArrowRight size={16}/>}
    </button>
  </article>;
}

export default function SalesApp(){
  const [step,setStep]=useState(0);
  const [mode,setMode]=useState<Mode>('customer');
  const [answers,setAnswers]=useState<QuoteAnswers>(DEFAULT_ANSWERS);
  const [contact,setContact]=useState<Contact>(EMPTY_CONTACT);
  const [selection,setSelection]=useState<PackageId|null>(null);
  const [detailsOpen,setDetailsOpen]=useState(true);
  const [showAllExtras,setShowAllExtras]=useState(false);
  const [saveOpen,setSaveOpen]=useState(false);
  const [repKey,setRepKey]=useState('');
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState('');
  const [saved,setSaved]=useState<Saved|null>(null);
  const recommendations=useMemo(()=>getRecommendations(answers),[answers]);
  const explicitChoice=recommendations.comparisons.find(q=>q.package.id===selection);
  const chosen=(explicitChoice?.eligible?explicitChoice:null)||recommendations.recommended;
  const recommended=recommendations.recommended;
  const canSave=mode==='staff'&&Boolean(chosen?.eligible&&chosen?.taxReady);
  function update<K extends keyof QuoteAnswers>(name:K,value:QuoteAnswers[K]){setAnswers(p=>({...p,[name]:value}));setSaved(null);}
  function changeContact<K extends keyof Contact>(name:K,value:Contact[K]){setContact(p=>({...p,[name]:value}));}
  function setAddon(id:ProductId,count:number){setAnswers(p=>({...p,addonQuantities:{...p.addonQuantities,[id]:count}}));setSaved(null);}
  const extraCount=Object.values(answers.addonQuantities).reduce((s,n)=>s+(n||0),0);
  const readyForSaving=Boolean(canSave&&contact.billingName.trim()&&contact.organization.trim()&&contact.teamNames.trim()&&contact.email.includes('@')&&contact.representative.trim());
  async function saveDraft(){
    if(!chosen){setSaveError('Select an eligible package.');return;}
    setSaveError('');setSaving(true);
    try{
      const response=await fetch('/api/drafts',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+repKey},body:JSON.stringify({answers,packageId:chosen.package.id,contact})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Could not save the invoice draft.');
      setSaved(result as Saved);setSaveOpen(false);setRepKey('');
    }catch(error){setSaveError(error instanceof Error?error.message:'Unexpected error saving draft.');}
    finally{setSaving(false);}
  }
  const yearEstimate=chosen?chosen.firstYearTotal:null;
  const activePackageName=chosen?.package.title||'Custom quote';
  return <main className="app-root">
    <div className="topbar"><div className="layout topbar-inner"><a className="brand" href="#top" aria-label="ProTracer Sales home"><span className="brand-symbol"><Target size={25} strokeWidth={2.8}/></span><span className="brand-text">PRO<span>TRACER</span><small>SALES STUDIO</small></span></a>
      <nav aria-label="Navigation" className="top-nav"><a href="#how-it-works">How it works</a><a href="#packages" onClick={()=>setStep(3)}>Packages</a></nav>
      <div className="mode-switch" aria-label="Experience mode"><button type="button" className={mode==='customer'?'current':''} onClick={()=>setMode('customer')}>For customers</button><button type="button" className={mode==='staff'?'current':''} onClick={()=>setMode('staff')}><LockKeyhole size={14}/>Sales team</button></div>
    </div></div>

    <section className="hero" id="top"><div className="layout hero-inner"><div className="hero-left"><div className="hero-eyebrow"><span className="dot"/> SMARTER SPORTS VIDEO. SIMPLER CHOICES.</div><h1>Build your ideal<br/><em>view of the game.</em></h1><p>Answer a few quick questions. We&apos;ll match your teams with the right 360-degree capture package and show exactly what&apos;s included.</p>
      <div className="hero-chips"><span><CheckCircle2 size={15}/> Transparent pricing</span><span><CheckCircle2 size={15}/> No-pressure recommendations</span><span><CheckCircle2 size={15}/> Built around your program</span></div></div>
      <div className="hero-visual" aria-hidden="true"><div className="orb orb-a"/><div className="orb orb-b"/><div className="hero-target"><span className="target-ring ring1"/><span className="target-ring ring2"/><span className="target-ring ring3"/><span className="target-center"><Camera size={30}/></span></div><div className="floating-note note-a"><Camera size={18}/><span><b>360 degree</b><small>Full-field vision</small></span></div><div className="floating-note note-b"><Sparkles size={19}/><span><b>Your best fit</b><small>Calculated in real time</small></span></div></div></div></section>

    <div className="layout app-layout" id="how-it-works"><div className="main-column">
      <div className="stepper" aria-label="Quote steps">{STEPS.map((s,i)=><button key={i} type="button" onClick={()=>setStep(i)} className={'stepper-item '+(step===i?'active ':'')+(step>i?'complete':'')} aria-current={step===i?'step':undefined}><span className="step-dot">{step>i?<Check size={16}/>:String(i+1).padStart(2,'0')}</span><span>{s.short}</span></button>)}</div>
      <section className="wizard-panel">
        <div className="section-intro"><div className="eyebrow">{STEPS[step].eyebrow}</div><h2>{STEPS[step].title}</h2><p>{step===0?'We will tailor the recommendation to your program size. Every named sport or team gets its own capture kit.':step===1?'A few details help us avoid paying for features you do not need and flag anything that requires a custom scope.':step===2?'Include optional equipment, choose how you want to pay, and enter the destination for the tax estimate.':'Compare the best match against every available package. You stay in control of the final selection.'}</p></div>

        {step===0&&<div className="step-content">
          <div className="question-block"><div className="question-label"><span className="question-number">01</span><div><h3>What kind of program is this?</h3><p>We support individual teams and entire athletic departments.</p></div></div>
            <RadioSet<QuoteAnswers['buyerType']> name="program-type" columns={2} items={[{value:'school',label:'School / college',detail:'Varsity, JV, collegiate'},{value:'club',label:'Club / academy',detail:'Competitive and training programs'},{value:'organization',label:'Athletic department',detail:'Multiple sports and team administrators'},{value:'other',label:'Another program',detail:'Community and private organizations'}]} value={answers.buyerType} onChange={v=>{update('buyerType',v);if(v==='organization')update('departmentAdmin',true);}}/>
          </div>
          <div className="question-block"><div className="question-label"><span className="question-number">02</span><div><h3>How many named teams need coverage?</h3><p>Men&apos;s and women&apos;s teams, varsity and JV count separately.</p></div></div>
            <RadioSet<number> name="team-count" columns={5} items={[1,2,3,4,5].map(n=>({value:n,label:String(n)}))} value={answers.teams<=5?answers.teams:0} onChange={v=>update('teams',v)}/>
            <div className="inline-numeric"><span>More than five?</span><label><span className="sr-only">Number of teams</span><input type="number" inputMode="numeric" min="6" max="50" value={answers.teams>5?answers.teams:''} placeholder="6-50" onChange={e=>update('teams',Math.max(6,Math.min(50,Number(e.target.value)||6)))}/></label><span className="helper-text">Additional department teams 6-10 may be added; 11+ need custom review.</span></div>
          </div>
          <div className="question-block"><div className="question-label"><span className="question-number">03</span><div><h3>Do you need one shared athletic department dashboard?</h3><p>Central administration, pooled usage and coordinated support.</p></div></div>
            <RadioSet<'yes'|'no'> name="department-admin" columns={2} value={answers.departmentAdmin?'yes':'no'} onChange={v=>update('departmentAdmin',v==='yes')} items={[{value:'no',label:'No, separate teams are fine'},{value:'yes',label:'Yes, one department view'}]}/>
          </div>
          <div className="mini-form"><div className="mini-form-heading"><Building2 size={18}/><span>{mode==='staff'?'Customer details (needed for invoice saving)':'Your details (optional while exploring)'}</span></div>
            <div className="form-grid">
              <Field label="School or organization"><input value={contact.organization} onChange={e=>changeContact('organization',e.target.value)} placeholder="e.g., Northview Athletics" maxLength={150}/></Field>
              <Field label="Team / sport(s)" hint={answers.teams>1?'Separate the named teams with semicolons.':''}><input value={contact.teamNames} onChange={e=>changeContact('teamNames',e.target.value)} placeholder={answers.teams>1?"Men's soccer; Women's soccer; ...":'e.g., Varsity soccer'} maxLength={500}/></Field>
              <Field label="Contact / billing name"><input value={contact.billingName} onChange={e=>changeContact('billingName',e.target.value)} placeholder="e.g., Athletics Director" maxLength={150}/></Field>
              <Field label="Email address"><input type="email" value={contact.email} onChange={e=>changeContact('email',e.target.value)} placeholder="name@example.com" maxLength={250}/></Field>
              {mode==='staff'&&<><Field label="Sales representative"><input value={contact.representative} onChange={e=>changeContact('representative',e.target.value)} placeholder="Your name" maxLength={150}/></Field><Field label="Existing customer number" hint="Leave blank for a first-time customer; the server reuses existing IDs for a matching billing identity."><input value={contact.existingCustomerNumber} onChange={e=>changeContact('existingCustomerNumber',e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10 digits, if known" inputMode="numeric"/></Field></>}
            </div>
          </div>
        </div>}

        {step===1&&<div className="step-content">
          <div className="question-block"><div className="question-label"><span className="question-number">01</span><div><h3>How many camera angles per team?</h3><p>All kits include a configured processing laptop.</p></div></div>
            <RadioSet<number> name="camera-count" columns={3} value={answers.camerasPerTeam} onChange={v=>update('camerasPerTeam',v)} items={[{value:1,label:'1 camera',detail:'Core 360 coverage'},{value:2,label:'2 cameras',detail:'Multiple perspectives'},{value:3,label:'3 cameras',detail:'Added camera capacity'}]}/>
          </div>
          <div className="question-block"><div className="question-label"><span className="question-number">02</span><div><h3>Which accessories do you need for each team?</h3><p>We only add what your selected package does not already include.</p></div></div>
            <div className="dual-questions"><div><span className="micro-label">Sport-specific mount</span><RadioSet<'yes'|'no'> name="mounts" columns={2} value={answers.wantMount?'yes':'no'} onChange={v=>update('wantMount',v==='yes')} items={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]}/></div><div><span className="micro-label">Protective case</span><RadioSet<'yes'|'no'> name="cases" columns={2} value={answers.wantCase?'yes':'no'} onChange={v=>update('wantCase',v==='yes')} items={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]}/></div></div>
          </div>
          <div className="question-block"><div className="question-label"><span className="question-number">03</span><div><h3>What level of support would you like?</h3><p>Premium plans already include priority assistance and premium protection.</p></div></div>
            <div className="dual-questions"><div><span className="micro-label">Priority technical support</span><RadioSet<'yes'|'no'> name="priority-support" columns={2} value={answers.priority?'yes':'no'} onChange={v=>update('priority',v==='yes')} items={[{value:'no',label:'Standard'},{value:'yes',label:'Priority'}]}/></div><div><span className="micro-label">Premium equipment protection</span><RadioSet<'yes'|'no'> name="premium-protection" columns={2} value={answers.protection?'yes':'no'} onChange={v=>update('protection',v==='yes')} items={[{value:'no',label:'Not needed'},{value:'yes',label:'Yes'}]}/></div></div>
          </div>
          <div className="question-block"><div className="question-label"><span className="question-number">04</span><div><h3>Cloud video needs</h3><p>Retained storage is your total library capacity; delivery is monthly streams plus downloads.</p></div></div>
            <div className="form-grid">
              <Field label="Total retained storage"><select value={answers.storageGb} onChange={e=>update('storageGb',Number(e.target.value))}>{[500,1000,2000,5000,10000,20000,50000].map(v=><option value={v} key={v}>{v>=1000?(v/1000)+' TB':v+' GB'} retained</option>)}</select></Field>
              <Field label="Monthly viewing + download"><select value={answers.deliveryGb} onChange={e=>update('deliveryGb',Number(e.target.value))}>{[100,250,500,1000,2500,5000,10000].map(v=><option value={v} key={v}>{v.toLocaleString()} GB / month</option>)}</select></Field>
              <Field label="Keep videos available for"><select value={answers.retentionMonths} onChange={e=>update('retentionMonths',Number(e.target.value))}><option value={12}>12 months</option><option value={24}>24 months</option><option value={36}>36 months (custom quote)</option></select></Field>
              <Field label="Annual training required"><select value={answers.trainingHours} onChange={e=>update('trainingHours',Number(e.target.value))}>{[0,1,2,3,4,5,8,10,15,20].map(v=><option key={v} value={v}>{v===0?'No additional training':v+' hours, all teams'}</option>)}</select></Field>
            </div>
          </div>
          <div className="question-block last"><div className="question-label"><span className="question-number">05</span><div><h3>Can your program use metered cloud overages?</h3><p>Usage beyond included allowances is estimated at $0.25 per GB per month for storage and $0.25 per delivered GB.</p></div></div>
            <RadioSet<'yes'|'no'> name="overages" columns={2} value={answers.acceptOverages?'yes':'no'} onChange={v=>update('acceptOverages',v==='yes')} items={[{value:'yes',label:'Yes, show an estimate'},{value:'no',label:'No, fixed included limits only'}]}/>
          </div>
        </div>}

        {step===2&&<div className="step-content">
          <div className="question-block"><div className="question-label"><span className="question-number">01</span><div><h3>Would you like any additional equipment or services?</h3><p>Everything here is optional, and built-in package features will not be double-charged.</p></div></div>
            <div className="extras-head"><span><Camera size={17}/> Additional hardware</span><span>Quantity</span></div>
            <div className="extras-grid">{ADDONS.filter(a=>a.category==='hardware'&&(showAllExtras||['laptop','camera','mount','bundle','case','ipad'].includes(a.id))).map(a=><div key={a.id} className="addon-card"><div className="addon-copy"><strong>{a.name}</strong><span>{a.detail}</span><b>{price(a.price)}</b></div><QtyControl value={answers.addonQuantities[a.id]||0} onChange={v=>setAddon(a.id,v)}/></div>)}</div>
            <button className="plain-more" type="button" onClick={()=>setShowAllExtras(p=>!p)}>{showAllExtras?'Show fewer hardware options':'Show all hardware options'} <ChevronDown size={16} className={showAllExtras?'flip':''}/></button>
            <div className="extras-head services"><span><Headphones size={17}/> Services & annual options</span><span>Quantity</span></div>
            <div className="extras-grid">{ADDONS.filter(a=>a.category!=='hardware').map(a=><div key={a.id} className="addon-card"><div className="addon-copy"><strong>{a.name}</strong><span>{a.detail}</span><b>{price(a.price)} {a.category==='annual'&&'/yr'}</b></div><QtyControl value={answers.addonQuantities[a.id]||0} onChange={v=>setAddon(a.id,v)}/></div>)}</div>
          </div>
          <div className="question-block"><div className="question-label"><span className="question-number">02</span><div><h3>How would you prefer to pay?</h3><p>Hardware is a one-time purchase. Subscription can be prepaid annually or paid monthly.</p></div></div>
            <RadioSet<QuoteAnswers['billing']> name="billing-plan" columns={2} value={answers.billing} onChange={v=>update('billing',v)} items={[{value:'annual',label:'Annual prepay',detail:'Best total annual value'},{value:'monthly',label:'Monthly service',detail:'Higher annualized service rate'}]}/>
          </div>
          <div className="question-block"><div className="question-label"><span className="question-number">03</span><div><h3>Where will the equipment be delivered?</h3><p>Hardware sales tax depends on the delivery jurisdiction. Rates must include any applicable local taxes.</p></div></div>
            <div className="form-grid"><Field label="Shipping state"><select value={answers.shippingState} onChange={e=>{update('shippingState',e.target.value);update('taxVerified',false);}}><option value="">Select a state</option>{STATES.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select></Field>
              <Field label="Shipping ZIP code"><input inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" maxLength={5} value={answers.shippingZip} onChange={e=>{update('shippingZip',e.target.value.replace(/\D/g,'').slice(0,5));update('taxVerified',false);}} placeholder="5-digit ZIP code"/></Field></div>
            {mode==='staff'?<div className="tax-panel"><div className="tax-panel-head"><ShieldCheck size={19}/><div><strong>Representative tax verification</strong><span>Never treat missing rates as 0% tax. Confirm jurisdiction, registration and local rates.</span></div></div>
              <div className="form-grid"><Field label="Combined state + local rate (%)" hint="Example: enter 7.5 for 7.5%. A zero rate requires explicit verification."><input inputMode="decimal" type="number" min="0" max="20" step="0.001" value={answers.combinedTaxRate??''} onChange={e=>{update('combinedTaxRate',e.target.value===''?null:Number(e.target.value));update('taxVerified',false);}} placeholder="Required before saving"/></Field>
                <Field label="Rate source / reference" hint="e.g., jurisdiction lookup, date verified and internal approval"><input value={answers.taxSource} maxLength={300} onChange={e=>{update('taxSource',e.target.value);update('taxVerified',false);}} placeholder="Enter verified source and date"/></Field>
                <Field label="Additional freight / travel ($)"><input type="number" inputMode="decimal" min="0" max="500000" step="0.01" value={answers.freightTravel} onChange={e=>update('freightTravel',Math.max(0,Number(e.target.value)||0))}/></Field>
                <div className="tax-verification"><label className="check-row"><input type="checkbox" checked={answers.taxVerified} onChange={e=>update('taxVerified',e.target.checked)}/><span>I verified the destination rate, tax collection obligation and taxable hardware allocation for this draft.</span></label></div>
              </div>
              <div className="tax-message"><Info size={15}/> Only tangible hardware lines are included in this app&apos;s tax base. State rules on bundled services, freight, exemptions and nexus still require accounting review.</div>
            </div>:<div className="tax-panel"><div className="tax-panel-head"><MapPin size={19}/><div><strong>Tax gets added after location verification.</strong><span>We separate equipment sales tax from non-hardware services. No estimated rate will be invented.</span></div></div></div>}
          </div>
        </div>}

        {step===3&&<div className="step-content results-section" id="packages">
          <div className="quote-identity"><div><span>PREPARED FOR</span><strong>{contact.organization||"Your sports program"}</strong><small>{contact.teamNames||`${answers.teams} named team${answers.teams===1?"":"s"}`}{contact.billingName?` / ${contact.billingName}`:""}</small></div><div className="quote-identity-right"><span>{saved?"SAVED DRAFT INVOICE":"INTERACTIVE QUOTE PREVIEW"}</span><strong>{saved?saved.invoiceNumber:"NOT ISSUED"}</strong><small>{answers.billing==="annual"?"Annual prepay":"Monthly service"} / catalog {CATALOG_DATE}</small></div></div>
          {recommended?<div className="result-hero"><div className="result-icon"><Sparkles size={23}/></div><div><div className="result-eyebrow">YOUR RECOMMENDED MATCH</div><h3>{recommended.package.title}</h3><p>Lowest estimated first-year cost among packages meeting your requirements, including automatically required accessories.</p></div><div className="result-score"><strong>{price(recommended.firstYearBeforeTax)}</strong><span>year one, before tax</span></div></div>:<div className="result-hero custom"><div className="result-icon"><CircleHelp size={23}/></div><div><div className="result-eyebrow">SPEAK WITH OUR TEAM</div><h3>Your needs deserve a custom package.</h3><p>One or more requirements exceed published package entitlements. A ProTracer representative can scope the right option.</p></div></div>}
          <div className="results-heading"><div><h3>Compare every option</h3><p>Totals are adjusted to your team count and requested setup. Tap a card to choose an eligible alternative.</p></div><span className="package-count">4 packages</span></div>
          <div className="package-grid">{recommendations.comparisons.map(q=><PackageCard key={q.package.id} item={q} recommended={recommended?.package.id===q.package.id} selected={chosen?.package.id===q.package.id} onSelect={x=>setSelection(x)}/>)}</div>
          {chosen&&<><div className="detailed-heading"><div><span className="eyebrow">YOUR SELECTED PACKAGE</span><h3>{chosen.package.title} quote breakdown</h3></div><button className="details-toggle" type="button" onClick={()=>setDetailsOpen(p=>!p)}>{detailsOpen?'Hide details':'See itemized details'} <ChevronDown size={17} className={detailsOpen?'flip':''}/></button></div>
            {detailsOpen&&<div className="breakdown-card"><div className="breakdown-header"><span>Item</span><span>Amount</span></div>{chosen.lines.filter(l=>l.amount>0).map((l,i)=><div key={`${l.name}-${i}`} className="breakdown-row"><span><b>{l.name}</b><small>{l.quantity} x {price(l.unitPrice)} &middot; {l.period==='once'?'One-time':l.period==='year'?'Annual':'Monthly'}{l.taxable?' / taxable equipment':' / service'}</small></span><strong>{price(l.amount)}</strong></div>)}
              {chosen.estimatedUsageAnnual>0&&<div className="breakdown-row faded"><span><b>Estimated annual cloud overages</b><small>Measured usage only, not due at signing</small></span><strong>{price(chosen.estimatedUsageAnnual)}</strong></div>}
              <div className="breakdown-row faded"><span><b>Additional freight / travel</b><small>Non-hardware estimate, subject to local tax review</small></span><strong>{price(answers.freightTravel)}</strong></div>
              <div className="breakdown-row tax-highlight"><span><b>Hardware-only sales tax</b><small>{chosen.taxReady?`${answers.shippingState} ${answers.shippingZip} / ${answers.combinedTaxRate}% verified`:'Pending verified destination and combined state/local rate'} &middot; Taxable goods {price(chosen.taxableBase)}</small></span><strong>{chosen.taxAmount===null?'Pending':price(chosen.taxAmount)}</strong></div>
              <div className="breakdown-totals"><div><span>Due at signing {chosen.taxReady?'incl. tax':'before tax'}</span><strong>{price(chosen.dueNow??chosen.dueBeforeTax)}{!chosen.taxReady&&<sup> + tax</sup>}</strong></div><div><span>Estimated first year {chosen.taxReady?'incl. tax':'before tax'}</span><strong>{price(chosen.firstYearTotal??chosen.firstYearBeforeTax)}{!chosen.taxReady&&<sup> + tax</sup>}</strong></div></div>
              <p className="disclaimer">Draft estimate only. Subscription fees and metered usage are separately identified; shipping, taxability, registration, and bundled setup treatment must be verified before a final customer invoice.</p>
            </div>}
            <div className="result-actions"><button className="ghost-action" type="button" onClick={()=>window.print()}><Printer size={18}/> Print / save PDF</button>{mode==='staff'?<button className="primary-action" type="button" disabled={!chosen.eligible} onClick={()=>{setSaveOpen(true);setSaveError('');}}><FileText size={18}/> Save draft invoice <ArrowRight size={18}/></button>:<a className="primary-action" href="https://www.protracerofficial.com/" target="_blank" rel="noopener noreferrer">Speak with ProTracer <ArrowRight size={18}/></a>}</div>
            {saved&&<div className="saved-confirmation" role="status"><CheckCircle2 size={22}/><div><b>Draft invoice saved: {saved.invoiceNumber}</b><span>Customer #{saved.customerNumber}. No payment was collected. Your draft is recorded in the server database.</span></div></div>}
            <div className="retention-note"><Info size={17}/><span>Have 11+ teams, specialized retention requirements, or a custom mounting situation? Choose a tailored quote rather than treating an ineligible package price as final.</span></div>
          </>}
        </div>}
        <div className="wizard-footer"><button type="button" className="back-button" onClick={()=>step===0?(setAnswers(DEFAULT_ANSWERS),setContact(EMPTY_CONTACT),setSelection(null)):setStep(step-1)}>{step===0?<RotateCcw size={16}/>:<ArrowLeft size={17}/>} {step===0?'Start over':'Previous step'}</button>{step<3&&<button type="button" className="next-button" onClick={()=>{setStep(s=>Math.min(3,s+1));window.scrollTo({top:260,behavior:'smooth'});}}> {step===2?'See my matches':'Continue'} <ArrowRight size={18}/></button>}{step===3&&<button type="button" className="next-button" onClick={()=>setStep(0)}>Refine answers <SlidersHorizontal size={17}/></button>}</div>
      </section>
    </div>
    <aside className="sidebar"><div className="quote-preview"><div className="sidebar-top"><span className="sidebar-caption"><Layers3 size={16}/> YOUR LIVE QUOTE</span><div className="live-dot"><span/> Live</div></div><div className="selected-plan"><span>BEST FIT RIGHT NOW</span><h3>{recommended?.package.title||'Custom quote needed'}</h3><p>{recommended?.package.subtitle||'A representative can help define your scope.'}</p></div>
      <div className="quote-divider"/><div className="preview-label">ESTIMATED YEAR ONE</div><div className="big-price">{chosen?price(chosen.firstYearBeforeTax):'Custom'}</div><p className="price-note">Before verified equipment sales tax</p>
      <div className="preview-breakdown"><div><span><Camera size={16}/> Hardware & equipment</span><strong>{chosen?price(chosen.hardwareSubtotal):'-'}</strong></div><div><span><Headphones size={16}/> Annual service</span><strong>{chosen?price(chosen.annualService):'-'}</strong></div><div><span><ShieldCheck size={16}/> Hardware sales tax</span><strong>{chosen?.taxAmount!==null&&chosen?price(chosen.taxAmount):'Pending'}</strong></div><div><span><Clock3 size={16}/> Monthly option</span><strong>{chosen?price(chosen.monthlyBaseService):'-'}</strong></div></div>
      {extraCount>0&&<div className="extras-counter"><CheckCircle2 size={16}/>{extraCount} optional add-on{extraCount===1?'':'s'} selected</div>}
      <div className="quote-divider"/><div className="due-panel"><span>DUE AT SIGNING</span><strong>{chosen?price(chosen.dueNow??chosen.dueBeforeTax):'-'}</strong><small>{chosen?.taxReady?'Includes verified equipment tax':'Before tax. Delivery rate verification pending.'}</small></div>
      <button className="sidebar-next" type="button" onClick={()=>step<3?setStep(3):window.print()}>{step<3?'Preview all packages':'Print this quote'} <ArrowRight size={18}/></button><p className="sidebar-footnote">No obligation to purchase. Pricing snapshot {CATALOG_DATE}. Includes estimated requested configuration; custom requests may require review.</p></div>
      <div className="sidebar-info"><div className="info-icon"><BadgeCheck size={20}/></div><strong>Clarity at every step</strong><p>We show exactly what you receive, what repeats annually, and what&apos;s taxed. No surprise add-ons.</p></div>
    </aside></div>

    <footer className="site-footer"><div className="layout footer-inside"><div className="brand small"><span className="brand-symbol"><Target size={19}/></span><span className="brand-text">PRO<span>TRACER</span><small>SALES STUDIO</small></span></div><div>Purpose-built for confident sports-tech decisions. &copy; {new Date().getFullYear()} ProTracer.</div><a href="https://www.protracerofficial.com/" target="_blank" rel="noopener noreferrer">ProTracer official site <ArrowRight size={14}/></a></div></footer>

    {saveOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSaveOpen(false);}}><div className="save-modal" role="dialog" aria-modal="true" aria-labelledby="saveTitle"><div className="modal-heading"><div><span className="eyebrow">PROTRACER SALES DESK</span><h2 id="saveTitle">Save this draft invoice</h2></div><button type="button" aria-label="Close" onClick={()=>setSaveOpen(false)}><X size={20}/></button></div><p>The system allocates a unique 10-digit customer number and stores a separate draft for every invoice. Nothing is sent or charged.</p>
      <div className="modal-summary"><span>{chosen?.package.title}</span><strong>{chosen?price(chosen.dueNow??chosen.dueBeforeTax):'-'}</strong></div>
      {!(contact.billingName&&contact.organization&&contact.teamNames&&contact.email&&contact.representative)&&<div className="modal-warning"><Info size={17}/> Complete billing contact, organization, separately named teams, email and rep name in Step 1.</div>}
      {!chosen?.taxReady&&<div className="modal-warning"><Info size={17}/> Return to Step 3 and verify state, ZIP, rate and source. Zero tax is not assumed.</div>}
      <Field label="Representative access key" hint="Your administrator sets this in the deployment environment. It is not stored in your browser."><input type="password" autoComplete="off" value={repKey} onChange={e=>setRepKey(e.target.value)} placeholder="Enter staff access key"/></Field>
      {saveError&&<div className="modal-error" role="alert">{saveError}</div>}
      <div className="modal-actions"><button type="button" className="back-button" onClick={()=>setSaveOpen(false)}>Cancel</button><button type="button" className="primary-action" disabled={!readyForSaving||!repKey||saving} onClick={saveDraft}>{saving?'Saving...':'Save draft securely'} <LockKeyhole size={17}/></button></div></div></div>}
  </main>;
}
