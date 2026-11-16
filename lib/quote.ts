import { ADDONS, CATALOG_DATE, DEPT_EXTRA, PACKAGES, USAGE, type AddOn, type PackageDef, type PackageId, type ProductId } from './catalog';
import { STATE_CODES } from './states';

export type Billing = 'annual' | 'monthly';
export type BuyerType = 'school' | 'club' | 'organization' | 'other';
export type QuoteAnswers = {
  buyerType: BuyerType;
  teams: number;
  camerasPerTeam: number;
  wantMount: boolean;
  wantCase: boolean;
  priority: boolean;
  protection: boolean;
  trainingHours: number;
  storageGb: number;
  deliveryGb: number;
  retentionMonths: number;
  departmentAdmin: boolean;
  acceptOverages: boolean;
  billing: Billing;
  addonQuantities: Partial<Record<ProductId, number>>;
  shippingState: string;
  shippingZip: string;
  combinedTaxRate: number | null;
  taxVerified: boolean;
  taxSource: string;
  freightTravel: number;
};

export const DEFAULT_ANSWERS: QuoteAnswers = {
  buyerType: 'school', teams: 1, camerasPerTeam: 1,
  wantMount:false, wantCase:false, priority:false, protection:false,
  trainingHours:0, storageGb:1000, deliveryGb:250, retentionMonths:12,
  departmentAdmin:false, acceptOverages:true, billing:'annual',
  addonQuantities:{}, shippingState:'', shippingZip:'', combinedTaxRate:null,
  taxVerified:false, taxSource:'', freightTravel:0,
};

export type Line = {
  name:string;
  quantity:number;
  unitPrice:number;
  amount:number;
  category:'hardware'|'one_time_service'|'annual'|'monthly'|'usage'|'shipping';
  taxable:boolean;
  period:'once'|'year'|'month'|'estimate';
};
export type QuoteEvaluation = {
  package:PackageDef;
  eligible:boolean;
  reasons:string[];
  lines:Line[];
  hardwareSubtotal:number;
  oneTimeServices:number;
  annualService:number;
  monthlyBaseService:number;
  annualExtras:number;
  estimatedUsageAnnual:number;
  taxableBase:number;
  taxAmount:number|null;
  taxReady:boolean;
  taxReason:string;
  dueBeforeTax:number;
  dueNow:number|null;
  firstYearBeforeTax:number;
  firstYearTotal:number|null;
  includedStorageGb:number;
  includedDeliveryGb:number;
  includedCameras:number;
  includedRetentionMonths:number;
  notes:string[];
};

const moneyRound=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
const cleanQty=(v:unknown)=>Number.isFinite(Number(v)) ? Math.min(100,Math.max(0,Math.floor(Number(v)))) : 0;

export function validateAnswers(a: QuoteAnswers): string[] {
  const errors:string[]=[];
  if(!Number.isInteger(a.teams)||a.teams<1||a.teams>50)errors.push('Choose between 1 and 50 named teams.');
  if(!Number.isInteger(a.camerasPerTeam)||a.camerasPerTeam<1||a.camerasPerTeam>3)errors.push('Choose 1 to 3 cameras per team.');
  if(!Number.isInteger(a.trainingHours)||a.trainingHours<0||a.trainingHours>200)errors.push('Training hours must be between 0 and 200.');
  if(!Number.isFinite(a.storageGb)||a.storageGb<0||a.storageGb>100000)errors.push('Storage estimate is outside the supported range.');
  if(!Number.isFinite(a.deliveryGb)||a.deliveryGb<0||a.deliveryGb>100000)errors.push('Monthly delivery is outside the supported range.');
  if(![12,24,36].includes(a.retentionMonths))errors.push('Choose an available retention preference.');
  if(a.combinedTaxRate!==null && (!Number.isFinite(a.combinedTaxRate)||a.combinedTaxRate<0||a.combinedTaxRate>20)) errors.push('Combined sales tax rate must be between 0% and 20%.');
  if(!Number.isFinite(a.freightTravel)||a.freightTravel<0||a.freightTravel>500000)errors.push('Additional freight/travel amount is invalid.');
  for(const p of ADDONS){const v=a.addonQuantities[p.id]??0;if(!Number.isInteger(v)||v<0||v>100)errors.push('Invalid quantity for '+p.name);}
  return errors;
}

function line(name:string,qty:number,unitPrice:number,category:Line['category'],period:Line['period'],taxable=false):Line {
  return {name,quantity:qty,unitPrice,amount:moneyRound(qty*unitPrice),category,taxable,period};
}

export function evaluatePackage(a:QuoteAnswers,p:PackageDef):QuoteEvaluation {
  const reasons:string[]=[];
  const notes:string[]=[];
  const lines:Line[]=[];
  const teams=Math.max(1,Math.min(50,Math.floor(a.teams||1)));
  const dept=p.id==='department';
  const extraTeams=dept?Math.max(0,teams-5):0;
  if(teams>10)reasons.push('11 or more named teams require a custom organization quote.');
  if(a.departmentAdmin&&!dept)reasons.push('Department-wide centralized administration is only included in the Athletic Department package.');
  if(a.retentionMonths>p.retentionMonths)reasons.push('Requested retention exceeds the published package policy.');
  if(a.camerasPerTeam>3)reasons.push('Camera needs require technical scoping.');
  const includedStorageGb=dept?p.storageGb+extraTeams*DEPT_EXTRA.storageGb:p.storageGb*teams;
  const includedDeliveryGb=dept?p.deliveryGb+extraTeams*DEPT_EXTRA.deliveryGb:p.deliveryGb*teams;
  const excessStorage=Math.max(0,a.storageGb-includedStorageGb);
  const excessDelivery=Math.max(0,a.deliveryGb-includedDeliveryGb);
  if(!a.acceptOverages&&(excessStorage>0||excessDelivery>0))reasons.push('Cloud requirements exceed included allowances and metered overages were declined.');
  if(a.retentionMonths>24)reasons.push('Retention above 24 months requires a custom quote.');

  // Per the approved price sheet, each non-department package represents one team kit and license.
  const activeLicenseCount=dept?1:teams;
  const baseHardware=p.hardware*activeLicenseCount+extraTeams*DEPT_EXTRA.hardware;
  const baseAnnual=p.annualService*activeLicenseCount+extraTeams*DEPT_EXTRA.annual;
  const baseMonthly=p.monthlyService*activeLicenseCount+extraTeams*DEPT_EXTRA.monthly;
  lines.push(line(dept?'Athletic Department: five complete team kits':p.title+' equipment & setup',activeLicenseCount,p.hardware,'hardware','once',true));
  if(extraTeams) lines.push(line('Additional named team + complete kit',extraTeams,DEPT_EXTRA.hardware,'hardware','once',true));
  lines.push(line(p.title+' annual subscription',activeLicenseCount,p.annualService,'annual','year'));
  if(extraTeams)lines.push(line('Additional named team annual subscription',extraTeams,DEPT_EXTRA.annual,'annual','year'));

  const neededCameras=Math.max(0,(a.camerasPerTeam-p.camerasPerTeam)*teams);
  const neededMounts=a.wantMount?Math.max(0,(1-p.mountPerTeam)*teams):0;
  const neededCases=a.wantCase?Math.max(0,(1-p.casePerTeam)*teams):0;
  // The combined camera+mount bundle costs $1642 vs $1690 separately.
  const bundles=Math.min(neededCameras,neededMounts);
  const cams=neededCameras-bundles;
  const mounts=neededMounts-bundles;
  if(bundles)lines.push(line('Required extra camera + mount bundles',bundles,1642,'hardware','once',true));
  if(cams)lines.push(line('Required extra cameras + cards',cams,1295,'hardware','once',true));
  if(mounts)lines.push(line('Required sport mounts',mounts,395,'hardware','once',true));
  if(neededCases)lines.push(line('Required protective cases',neededCases,495,'hardware','once',true));

  if(a.priority&&!p.priority)lines.push(line('Required priority support / year',teams,499,'annual','year'));
  if(a.protection&&!p.protection)lines.push(line('Required premium protection / year',teams,499,'annual','year'));
  const includedTraining=p.trainingHoursPerTeam*teams;
  const extraTraining=Math.max(0,a.trainingHours-includedTraining);
  if(extraTraining)lines.push(line('Additional requested training hours',extraTraining,149,'one_time_service','once'));

  for(const addon of ADDONS){
    const qty=cleanQty(a.addonQuantities[addon.id]);
    if(!qty)continue;
    if(addon.id==='support'&&(a.priority||p.priority)){
      notes.push('Duplicate premium support add-on was excluded; support is already included or required.');
      continue;
    }
    if(addon.id==='protection'&&(a.protection||p.protection)){
      notes.push('Duplicate premium protection add-on was excluded; protection is already included or required.');
      continue;
    }
    const cat=addon.category==='hardware'?'hardware':addon.category==='annual'?'annual':'one_time_service';
    lines.push(line(addon.name,qty,addon.price,cat,cat==='annual'?'year':'once',cat==='hardware'));
  }
  const estimatedUsageAnnual=moneyRound(12*(excessStorage*USAGE.storageGbMonth+excessDelivery*USAGE.deliveredGb));
  if(estimatedUsageAnnual>0)notes.push('Estimated cloud overage is illustrative, not due at signing and subject to actual metered use.');
  const hardwareSubtotal=moneyRound(lines.filter(l=>l.category==='hardware').reduce((s,l)=>s+l.amount,0));
  const oneTimeServices=moneyRound(lines.filter(l=>l.category==='one_time_service').reduce((s,l)=>s+l.amount,0));
  const annualService=moneyRound(lines.filter(l=>l.category==='annual').reduce((s,l)=>s+l.amount,0));
  const annualExtras=moneyRound(annualService-baseAnnual);
  const monthlyBaseService=moneyRound(baseMonthly);
  const taxableBase=moneyRound(lines.filter(l=>l.taxable).reduce((s,l)=>s+l.amount,0));
  const zipOkay=/^\d{5}$/.test(a.shippingZip.trim());
  const stateOkay=STATE_CODES.includes(a.shippingState);
  const hasTaxRate=a.combinedTaxRate!==null&&Number.isFinite(a.combinedTaxRate)&&a.combinedTaxRate>=0&&a.combinedTaxRate<=20;
  const taxReady=Boolean(zipOkay&&stateOkay&&hasTaxRate&&a.taxVerified&&a.taxSource.trim().length>=5);
  const taxAmount=taxReady?moneyRound(taxableBase*(Number(a.combinedTaxRate)/100)):null;
  const taxReason=!stateOkay||!zipOkay?'Enter shipping state and 5-digit ZIP.':!hasTaxRate?'Enter a verified combined destination rate.':!a.taxVerified||a.taxSource.trim().length<5?'Sales representative must verify the combined state/local tax rate and source.':'Hardware-only sales tax estimate based on the approved verified rate.';
  const dueBeforeTax=moneyRound(hardwareSubtotal+oneTimeServices+(a.billing==='annual'?annualService:baseMonthly+annualExtras)+a.freightTravel);
  const dueNow=taxAmount===null?null:moneyRound(dueBeforeTax+taxAmount);
  const firstYearBeforeTax=moneyRound(hardwareSubtotal+oneTimeServices+(a.billing==='annual'?annualService:12*baseMonthly+annualExtras)+estimatedUsageAnnual+a.freightTravel);
  const firstYearTotal=taxAmount===null?null:moneyRound(firstYearBeforeTax+taxAmount);
  if(dept)notes.push('Includes five full kits and named team licenses. Each added sixth through tenth team adds a full kit and license.');
  if(!dept&&teams>1)notes.push('Independent team subscriptions have separate cloud allowances; storage is not pooled between teams.');
  notes.push('Bundled package equipment/setup is classified as hardware for this draft; confirm any separately stated setup allocation before issuing a tax invoice.');
  notes.push('Tax applicability, shipping treatment, exemptions, and collection obligations are jurisdiction-specific; accounting review required.');
  return {package:p,eligible:reasons.length===0,reasons,lines,hardwareSubtotal,oneTimeServices,annualService,monthlyBaseService,annualExtras,estimatedUsageAnnual,taxableBase,taxAmount,taxReady,taxReason,dueBeforeTax,dueNow,firstYearBeforeTax,firstYearTotal,includedStorageGb,includedDeliveryGb,includedCameras:p.camerasPerTeam,includedRetentionMonths:p.retentionMonths,notes};
}

export function getRecommendations(a:QuoteAnswers){
  const comparisons=PACKAGES.map(p=>evaluatePackage(a,p));
  const eligible=comparisons.filter(x=>x.eligible);
  const recommended=eligible.slice().sort((x,y)=>(x.firstYearTotal??x.firstYearBeforeTax)-(y.firstYearTotal??y.firstYearBeforeTax))[0]||null;
  return {comparisons,recommended,customNeeded:!recommended,pricingDate:CATALOG_DATE};
}

export const price=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Math.abs(v-Math.round(v))<0.000001?0:2,maximumFractionDigits:2}).format(v);
