import { ADDONS, CATALOG_DATE, DEPT_EXTRA, PACKAGES, USAGE, type AddOn, type PackageDef, type PackageId, type ProductId } from './catalog';
import { STATE_CODES } from './states';
import { getPromotionAvailability, type PromotionId } from './promotions';
import { getStateRate, stateHardwareTax } from './tax';

export type Billing = 'annual' | 'monthly';
export type BuyerType = 'school' | 'club' | 'organization' | 'other';
export type HardwareNeeds = {
  cameras: number; mounts: number; sdCards: number; laptops: number;
  tripods: number; cases: number; ipads: number; backup: number;
};
export const DEFAULT_HARDWARE_NEEDS: HardwareNeeds = {
  cameras:1, mounts:1, sdCards:1, laptops:1, tripods:1, cases:0, ipads:1, backup:0,
};
export type QuoteAnswers = {
  buyerType: BuyerType;
  hardwareNeeds?: HardwareNeeds;
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
  serviceYears: 1 | 2;
  useOwnIpad: boolean;
  addonQuantities: Partial<Record<ProductId, number>>;
  shippingState: string;
  shippingZip: string;
  freightTravel: number;
};

export const DEFAULT_ANSWERS: QuoteAnswers = {
  buyerType: 'school', teams: 1, camerasPerTeam: 1,
  wantMount:false, wantCase:false, priority:false, protection:false,
  trainingHours:0, storageGb:1000, deliveryGb:250, retentionMonths:12,
  departmentAdmin:false, acceptOverages:true, billing:'annual', serviceYears:1, useOwnIpad:false,
  addonQuantities:{}, shippingState:'', shippingZip:'', freightTravel:0,
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
  includedIpads:number;
  includedRetentionMonths:number;
  notes:string[];
  appliedPromotion: PromotionId;
  serviceYears: number;
};

const moneyRound=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
const cleanQty=(v:unknown)=>Number.isFinite(Number(v)) ? Math.min(100,Math.max(0,Math.floor(Number(v)))) : 0;

export function validateAnswers(a: QuoteAnswers): string[] {
  const errors:string[]=[];
  if(!Number.isInteger(a.teams)||a.teams<1||a.teams>50)errors.push('Choose between 1 and 50 named teams.');
  if(a.serviceYears!==1&&a.serviceYears!==2)errors.push('Choose a one- or two-year service commitment.');
  if(!Number.isInteger(a.camerasPerTeam)||a.camerasPerTeam<1||a.camerasPerTeam>3)errors.push('Choose 1 to 3 cameras per team.');
  if(!Number.isInteger(a.trainingHours)||a.trainingHours<0||a.trainingHours>200)errors.push('Training hours must be between 0 and 200.');
  if(!Number.isFinite(a.storageGb)||a.storageGb<0||a.storageGb>100000)errors.push('Storage estimate is outside the supported range.');
  if(!Number.isFinite(a.deliveryGb)||a.deliveryGb<0||a.deliveryGb>100000)errors.push('Monthly delivery is outside the supported range.');
  if(![12,24,36].includes(a.retentionMonths))errors.push('Choose an available retention preference.');
  if(!Number.isFinite(a.freightTravel)||a.freightTravel<0||a.freightTravel>500000)errors.push('Additional freight/travel amount is invalid.');
  if(a.hardwareNeeds){
    for(const [name,value] of Object.entries(a.hardwareNeeds)) {
      if(!Number.isInteger(value)||value<0||value>100)errors.push('Choose a valid number for '+name+'.');
    }
    if(a.hardwareNeeds.cameras<1)errors.push('Select at least one camera.');
  }
  for(const p of ADDONS){const v=a.addonQuantities[p.id]??0;if(!Number.isInteger(v)||v<0||v>100)errors.push('Invalid quantity for '+p.name);}
  return errors;
}

function line(name:string,qty:number,unitPrice:number,category:Line['category'],period:Line['period'],taxable=false):Line {
  return {name,quantity:qty,unitPrice,amount:moneyRound(qty*unitPrice),category,taxable,period};
}

export function evaluatePackage(a:QuoteAnswers,p:PackageDef,promotionId:PromotionId='none'):QuoteEvaluation {
  const reasons:string[]=[];
  const notes:string[]=[];
  const lines:Line[]=[];
  const promotionCheck=getPromotionAvailability(promotionId,p.id,a.billing,a.serviceYears);
  const appliedPromotion:PromotionId=promotionCheck.available?promotionId:'none';
  if(promotionId!=='none'&&!promotionCheck.available)notes.push('Promotion not applied: '+promotionCheck.reason);
  const teams=Math.max(1,Math.min(50,Math.floor(a.teams||1)));
  const dept=p.id==='department';
  const extraTeams=dept?Math.max(0,teams-5):0;
  if(teams>10)reasons.push('11 or more named teams require a custom organization quote.');
  if(a.departmentAdmin&&!dept)reasons.push('Department-wide centralized administration is only included in the Athletic Department package.');
  if(a.retentionMonths>p.retentionMonths)reasons.push('Requested retention exceeds the published package policy.');
  if(a.camerasPerTeam>3)reasons.push('Camera needs require technical scoping.');
  const includedStorageGb=(dept?p.storageGb+extraTeams*DEPT_EXTRA.storageGb:p.storageGb*teams)+(appliedPromotion==='storage250'?250:0);
  const includedDeliveryGb=(dept?p.deliveryGb+extraTeams*DEPT_EXTRA.deliveryGb:p.deliveryGb*teams)+(appliedPromotion==='delivery50'?50:0);
  const excessStorage=Math.max(0,a.storageGb-includedStorageGb);
  const excessDelivery=Math.max(0,a.deliveryGb-includedDeliveryGb);
  if(!a.acceptOverages&&(excessStorage>0||excessDelivery>0))reasons.push('Cloud requirements exceed included allowances and metered overages were declined.');
  if(a.retentionMonths>24)reasons.push('Retention above 24 months requires a custom quote.');

  // Per the approved price sheet, each non-department package represents one team kit and license.
  const activeLicenseCount=dept?1:teams;
  const baseHardware=p.hardware*activeLicenseCount+extraTeams*DEPT_EXTRA.hardware;
  const baseAnnual=p.annualService*activeLicenseCount+extraTeams*DEPT_EXTRA.annual;
  const baseMonthly=p.monthlyService*activeLicenseCount+extraTeams*DEPT_EXTRA.monthly;
  // Customer-supplied compatible iPads yield a $500 credit per named team kit.
  // Internal scenario assumes $75 onboarding verification per customer-owned iPad.
  const ipadByodCount=a.useOwnIpad?(dept?5+extraTeams:teams):0;
  lines.push(line(dept?'Athletic Department: five complete team kits':p.title+' equipment & setup',activeLicenseCount,p.hardware,'hardware','once',true));
  if(extraTeams) lines.push(line('Additional named team + complete kit',extraTeams,DEPT_EXTRA.hardware,'hardware','once',true));
  if(ipadByodCount)lines.push(line('Bring your own compatible iPad credit',ipadByodCount,-500,'hardware','once',true));
  lines.push(line(p.title+' annual subscription',activeLicenseCount,p.annualService,'annual','year'));
  if(extraTeams)lines.push(line('Additional named team annual subscription',extraTeams,DEPT_EXTRA.annual,'annual','year'));

  // The complete kits include one sport mount and one recording card PER camera.
  // Exact requested quantities take precedence over the legacy per-team questionnaire.
  const includedCameras=dept ? 5+extraTeams : p.camerasPerTeam*teams;
  const includedMounts=dept ? 5+extraTeams : p.mountPerTeam*teams;
  const includedCards=includedCameras;
  const includedLaptops=dept ? 5+extraTeams : p.laptopPerTeam*teams;
  const includedIpads=(dept ? 5+extraTeams : p.ipadPerTeam*teams)-ipadByodCount;
  const includedTripods=dept ? 5+extraTeams : teams;
  const includedCases=dept ? 0 : p.casePerTeam*teams;
  const h=a.hardwareNeeds;
  const wantedCameras=h ? h.cameras : a.camerasPerTeam*teams;
  const wantedMounts=h ? h.mounts : a.wantMount ? wantedCameras : 0;
  const wantedCases=h ? h.cases : a.wantCase ? teams : 0;
  const neededCameras=Math.max(0,wantedCameras-includedCameras);
  const complimentaryMounts=appliedPromotion==='mount1'?1:0;
  const freeMountUsedForNeeds=Math.min(complimentaryMounts,Math.max(0,wantedMounts-includedMounts));
  const freeMountForOptional=Math.max(0,complimentaryMounts-freeMountUsedForNeeds);
  const neededMounts=Math.max(0,wantedMounts-includedMounts-complimentaryMounts);
  const neededCases=Math.max(0,wantedCases-includedCases);
  // The combined camera+mount bundle costs $1642 vs $1690 separately.
  const bundles=Math.min(neededCameras,neededMounts);
  const cams=neededCameras-bundles;
  const mounts=neededMounts-bundles;
  if(bundles)lines.push(line('Required extra camera + mount bundles',bundles,1642,'hardware','once',true));
  if(cams)lines.push(line('Required extra cameras + cards',cams,1295,'hardware','once',true));
  if(mounts)lines.push(line('Required sport mounts',mounts,395,'hardware','once',true));
  if(neededCases)lines.push(line('Required Pelican cases',neededCases,495,'hardware','once',true));
  if(h){
    const cards=Math.max(0,h.sdCards-includedCards-neededCameras); // Extra cameras include one card each.
    const laptops=Math.max(0,h.laptops-includedLaptops);
    const tripods=Math.max(0,h.tripods-includedTripods);
    if(cards) lines.push(line('Additional microSD recording cards',cards,69,'hardware','once',true));
    if(laptops)lines.push(line('Additional configured laptops',laptops,2995,'hardware','once',true));
    if(tripods)lines.push(line('Additional tripods',tripods,99,'hardware','once',true));
    const extraIpads=Math.max(0,h.ipads-includedIpads);
    if(extraIpads)lines.push(line('Additional configured refurbished iPads',extraIpads,549,'hardware','once',true));
    const backups=Math.max(0,h.backup-(appliedPromotion==='backup6'?1:0));
    if(backups)lines.push(line('6 TB backup drives',backups,299,'hardware','once',true));
  }

  if(a.priority&&!p.priority)lines.push(line('Required priority support / year',teams,499,'annual','year'));
  if(a.protection&&!p.protection)lines.push(line('Required premium protection / year',teams,499,'annual','year'));
  const normalIncludedTraining=p.trainingHoursPerTeam*teams;
  const complimentaryTraining=appliedPromotion==='training1'?1:0;
  const includedTraining=normalIncludedTraining+complimentaryTraining;
  const freeTrainingUsedForNeeds=Math.min(complimentaryTraining,Math.max(0,a.trainingHours-normalIncludedTraining));
  const freeTrainingForOptional=Math.max(0,complimentaryTraining-freeTrainingUsedForNeeds);
  const extraTraining=Math.max(0,a.trainingHours-includedTraining);
  if(extraTraining)lines.push(line('Additional requested training hours',extraTraining,149,'one_time_service','once'));

  // Discount explicitly selected spare camera + mount pairs to the published $1,642 bundle.
  const optionalMounts=Math.max(0,cleanQty(a.addonQuantities.mount||0)-freeMountForOptional);
  const optionalBundles=Math.min(cleanQty(a.addonQuantities.camera||0),optionalMounts);
  if(optionalBundles)lines.push(line('Optional camera + mount bundle',optionalBundles,1642,'hardware','once',true));
  for(const addon of ADDONS){
    const initialQty=cleanQty(a.addonQuantities[addon.id]);
    const adjustedQty=addon.id==='mount'?Math.max(0,initialQty-freeMountForOptional)
      :addon.id==='backup'?Math.max(0,initialQty-Math.max(0,(appliedPromotion==='backup6'?1:0)-(h?.backup||0)))
      :addon.id==='training'?Math.max(0,initialQty-freeTrainingForOptional)
      :initialQty;
    const qty=(addon.id==='camera'||addon.id==='mount')?Math.max(0,adjustedQty-optionalBundles):adjustedQty;
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
  if(appliedPromotion!=='none'){
    const promoNames:Record<Exclude<PromotionId,'none'>,string>={
      storage250:'250 GB extra retained cloud storage (first 12 months)',
      delivery50:'50 GB/month extra video delivery (first 12 months)',
      training1:'one additional remote training hour',
      mount1:'one extra sport-specific mount',
      backup6:'one 6 TB local backup drive',
      rateLock24:'requested 24-month subscription rate lock (pending team review)',
    };
    lines.push(line('Promotion: '+promoNames[appliedPromotion],1,0,
      appliedPromotion==='mount1'||appliedPromotion==='backup6'?'hardware':'one_time_service','once'));
    notes.push('One selected promotion per quote. Benefits and qualification are subject to the written sales agreement.');
    if(appliedPromotion==='rateLock24')notes.push('Rate-lock request is NOT approved by this estimate. ProTracer must confirm the final year-two subscription rate.');
    if(appliedPromotion==='storage250'||appliedPromotion==='delivery50')notes.push('Promotional cloud capacity is limited to the first 12 months and does not extend video retention.');
  }
  if(p.id==='byod')notes.push('Processing-computer BYOD requires ProTracer engineering certification. A school-owned iPad cannot replace a required processing computer.');
  if(a.useOwnIpad)notes.push('iPad BYOD credit requires ProTracer verification of each customer-provided compatible iPad. No ProTracer iPad is included for those licensed teams; an iPad remains required for the supported workflow.');
  const estimatedUsageAnnual=moneyRound(12*(excessStorage*USAGE.storageGbMonth+excessDelivery*USAGE.deliveredGb));
  if(estimatedUsageAnnual>0)notes.push('Estimated cloud overage is illustrative, not due at signing and subject to actual metered use.');
  const hardwareSubtotal=moneyRound(lines.filter(l=>l.category==='hardware').reduce((s,l)=>s+l.amount,0));
  const oneTimeServices=moneyRound(lines.filter(l=>l.category==='one_time_service').reduce((s,l)=>s+l.amount,0));
  const annualService=moneyRound(lines.filter(l=>l.category==='annual').reduce((s,l)=>s+l.amount,0));
  const annualExtras=moneyRound(annualService-baseAnnual);
  const monthlyBaseService=moneyRound(baseMonthly);
  const taxableBase=moneyRound(lines.filter(l=>l.taxable).reduce((s,l)=>s+l.amount,0));
  const taxRate=getStateRate(a.shippingState);
  const taxReady=taxRate!==null;
  const taxAmount=stateHardwareTax(taxableBase,a.shippingState);
  const taxReason=taxReady
    ? `Estimated state-level rate ${taxRate}% (local sales tax NOT included). Final tax varies by precise address and exemptions.`
    : 'Choose a shipping state or enter a ZIP to estimate state-level hardware tax.';
  const dueBeforeTax=moneyRound(hardwareSubtotal+oneTimeServices+(a.billing==='annual'?annualService:baseMonthly+annualExtras)+a.freightTravel);
  const dueNow=taxAmount===null?null:moneyRound(dueBeforeTax+taxAmount);
  const firstYearBeforeTax=moneyRound(hardwareSubtotal+oneTimeServices+(a.billing==='annual'?annualService:12*baseMonthly+annualExtras)+estimatedUsageAnnual+a.freightTravel);
  const firstYearTotal=taxAmount===null?null:moneyRound(firstYearBeforeTax+taxAmount);
  if(dept)notes.push('Includes five full kits and named team licenses. Each added sixth through tenth team adds a full kit and license.');
  if(!dept&&teams>1)notes.push('Independent team subscriptions have separate cloud allowances; storage is not pooled between teams.');
  notes.push('For this illustration, the one-time package equipment/setup charge is treated as tangible equipment; any separable labor must be reviewed before a final quote.');
  notes.push('Tax shown is STATE-ONLY, based on July 2026 published rates, and excludes local taxes, exemptions, special jurisdictions, seller nexus and freight taxability. This is not a final tax quote.');
  return {package:p,eligible:reasons.length===0,reasons,lines,hardwareSubtotal,oneTimeServices,annualService,monthlyBaseService,annualExtras,estimatedUsageAnnual,taxableBase,taxAmount,taxReady,taxReason,dueBeforeTax,dueNow,firstYearBeforeTax,firstYearTotal,includedStorageGb,includedDeliveryGb,includedCameras,includedIpads,includedRetentionMonths:p.retentionMonths,notes,appliedPromotion,serviceYears:a.serviceYears};
}


/** Reference-only comparison against individually listed items plus Basic subscriptions.
 * NOT a separately approved bundle or standalone software-only product.  It does not
 * promise equivalent retention, cloud allowance, or department administration.
 */
export type ComponentEstimate = {
  lines:Line[]; hardware:number; oneTimeServices:number;
  annualService:number; monthlyService:number; annualExtras:number;
  annualUsageEstimate:number; firstYear:number; dueBeforeTax:number;
  taxableBase:number; notes:string[];
};
export function estimateIndividualComponents(a:QuoteAnswers):ComponentEstimate {
  const teams=Math.max(1,Math.floor(a.teams));
  const h=a.hardwareNeeds || {
    cameras:teams*a.camerasPerTeam, mounts:a.wantMount?teams*a.camerasPerTeam:0,
    sdCards:teams*a.camerasPerTeam, laptops:teams, tripods:teams,
    cases:a.wantCase?teams:0, ipads:teams, backup:0,
  };
  const lines:Line[]=[];
  const bundle=Math.min(h.cameras,h.mounts);
  const eachCamera=h.cameras-bundle;
  const extraMount=h.mounts-bundle;
  if(bundle) lines.push(line('Camera + mount + recording card bundles',bundle,1642,'hardware','once',true));
  if(eachCamera) lines.push(line('Camera + recording card',eachCamera,1295,'hardware','once',true));
  if(extraMount) lines.push(line('Sport-specific mounts',extraMount,395,'hardware','once',true));
  const needs:[number,string,number][]=[
    [h.laptops,'Configured processing laptops',2995],
    [Math.max(0,h.sdCards-h.cameras),'Extra microSD recording cards',69],
    [h.tripods,'Tripods',99],[h.cases,'Pelican protective cases',495],
    [h.ipads,'Configured refurbished iPads',549],[h.backup,'6 TB local backup drives',299],
  ];
  for(const [qty,name,unitPrice] of needs) if(qty)lines.push(line(name,qty,unitPrice,'hardware','once',true));
  lines.push(line('Basic Team annual software service / license',teams,PACKAGES[0].annualService,'annual','year'));
  if(a.priority) lines.push(line('Priority support per team',teams,499,'annual','year'));
  if(a.protection) lines.push(line('Premium protection per team',teams,499,'annual','year'));
  if(a.trainingHours)lines.push(line('Remote training hours',a.trainingHours,149,'one_time_service','once'));
  const optionalBundles=Math.min(cleanQty(a.addonQuantities.camera||0),cleanQty(a.addonQuantities.mount||0));
  if(optionalBundles)lines.push(line('Optional extra camera + mount bundles',optionalBundles,1642,'hardware','once',true));
  for(const addon of ADDONS){
    const initialQty=cleanQty(a.addonQuantities[addon.id]);
    const qty=(addon.id==='camera'||addon.id==='mount')?Math.max(0,initialQty-optionalBundles):initialQty;
    if(!qty || (addon.id==='support' && a.priority) || (addon.id==='protection' && a.protection))continue;
    const category=addon.category==='hardware'?'hardware':addon.category==='annual'?'annual':'one_time_service';
    lines.push(line(addon.name,qty,addon.price,category,category==='annual'?'year':'once',category==='hardware'));
  }
  const sum=(cat:Line['category'])=>moneyRound(lines.filter(x=>x.category===cat).reduce((v,x)=>v+x.amount,0));
  const hardware=sum('hardware'),oneTimeServices=sum('one_time_service'),annualService=sum('annual');
  const annualExtras=moneyRound(annualService-PACKAGES[0].annualService*teams);
  const monthlyService=moneyRound(PACKAGES[0].monthlyService*teams);
  const overStorage=Math.max(0,a.storageGb-teams*PACKAGES[0].storageGb);
  const overDelivery=Math.max(0,a.deliveryGb-teams*PACKAGES[0].deliveryGb);
  const annualUsageEstimate=moneyRound(12*(overStorage*USAGE.storageGbMonth+overDelivery*USAGE.deliveredGb));
  const billedService=a.billing==='annual'?annualService:12*monthlyService+annualExtras;
  const dueService=a.billing==='annual'?annualService:monthlyService+annualExtras;
  const notes=['Reference pricing only: components are not an approved independent system offering. Basic software service is used solely for a like-for-like pricing benchmark.'];
  if(a.retentionMonths>12)notes.push('The Basic reference subscription does not include requested 24-month video retention.');
  if(a.departmentAdmin)notes.push('The Basic reference subscription does not include central department administration.');
  if(annualUsageEstimate)notes.push('Expected storage or delivery overages are illustrative and not billed until actually measured.');
  return {lines,hardware,oneTimeServices,annualService,monthlyService,annualExtras,annualUsageEstimate,
    taxableBase:hardware,firstYear:moneyRound(hardware+oneTimeServices+billedService+annualUsageEstimate+a.freightTravel),
    dueBeforeTax:moneyRound(hardware+oneTimeServices+dueService+a.freightTravel),notes};
}
export function getRecommendations(a:QuoteAnswers){
  const comparisons=PACKAGES.map(p=>evaluatePackage(a,p));
  const eligible=comparisons.filter(x=>x.eligible);
  // BYOD is engineering-gated; offer it on explicit selection, not as an automatic recommendation.
  const sorted=eligible.filter(x=>x.package.id!=='byod').sort((x,y)=>x.firstYearBeforeTax-y.firstYearBeforeTax);
  let recommended=sorted[0]||null;
  // Team Plus includes a Pelican case and the second complete camera/mount system.
  // For two-camera-per-team requirements, recommend the complete Plus kit when
  // its premium is no more than $200 per team over a lower-priced add-on build.
  const neededCameras=a.hardwareNeeds?.cameras??a.camerasPerTeam*a.teams;
  const plus=eligible.find(x=>x.package.id==='plus');
  if(plus && recommended?.package.id==='basic' && neededCameras>=a.teams*2 &&
     neededCameras<=a.teams*2 && plus.firstYearBeforeTax-recommended.firstYearBeforeTax <=200*a.teams){
    recommended=plus;
  }
  return {comparisons,recommended,customNeeded:!recommended,pricingDate:CATALOG_DATE};
}

export const price=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Math.abs(v-Math.round(v))<0.000001?0:2,maximumFractionDigits:2}).format(v);
