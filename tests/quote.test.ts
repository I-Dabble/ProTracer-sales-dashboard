import assert from 'node:assert/strict';
import test from 'node:test';
import { PACKAGES } from '../lib/catalog';
import { getPromotionAvailability, PROMOTIONS } from '../lib/promotions';
import { DEFAULT_ANSWERS, evaluatePackage, estimateIndividualComponents, getRecommendations, type QuoteAnswers } from '../lib/quote';
import { getStateRate, stateHardwareTax, STATE_SALES_TAX_RATES } from '../lib/tax';

const a=(overrides:Partial<QuoteAnswers>={}):QuoteAnswers=>({...DEFAULT_ANSWERS,...overrides});
const pkg=(id:string)=>PACKAGES.find(p=>p.id===id)!;

test('November 17 iPad-inclusive complete and conditional BYOD package prices',()=>{
  const expected={basic:[4292.80,2102.20,6395],byod:[2892.80,2102.20,4995],plus:[6392.80,2102.20,8495],premium:[6751.60,3743.40,10495],department:[22300,22995,45295]};
  for(const [id,[hardware,annual,year]] of Object.entries(expected)){
    const q=evaluatePackage(a({teams:id==='department'?5:1,storageGb:id==='department'?10000:id==='premium'?2000:1000,deliveryGb:id==='department'?1000:id==='premium'?500:250}),pkg(id));
    assert.equal(q.hardwareSubtotal,hardware,id+' hardware');
    assert.equal(q.annualService,annual,id+' service');
    assert.equal(q.firstYearBeforeTax,year,id+' year one');
  }
});
test('one sport-specific mount and one recording card per included camera',()=>{
  for(const p of PACKAGES)assert.equal(p.mountPerTeam,p.camerasPerTeam,p.id);
});
test('default team recommends Basic; two cameras recommend Plus with additional Pelican value',()=>{
  assert.equal(getRecommendations(a()).recommended?.package.id,'basic');
  const h={cameras:2,mounts:2,sdCards:2,laptops:1,tripods:1,cases:0,ipads:0,backup:0};
  const r=getRecommendations(a({hardwareNeeds:h}));
  assert.equal(r.recommended?.package.id,'plus');
  assert.equal(evaluatePackage(a({hardwareNeeds:h}),pkg('basic')).hardwareSubtotal,4292.8+1642);
  assert.equal(evaluatePackage(a({hardwareNeeds:h}),pkg('plus')).hardwareSubtotal,6392.8);
});
test('24-month retention chooses Premium over Basic/Plus',()=>{
  const r=getRecommendations(a({retentionMonths:24}));
  assert.equal(r.recommended?.package.id,'premium');
  assert.equal(r.comparisons.find(q=>q.package.id==='basic')?.eligible,false);
});
test('department with 5 full kits and iPads costs $45,295 and 6th adds a full team',()=>{
  for(const teams of [5,6]){
    const q=getRecommendations(a({teams,departmentAdmin:true,storageGb:10000,deliveryGb:1000,hardwareNeeds:{cameras:teams,mounts:teams,sdCards:teams,laptops:teams,tripods:teams,cases:0,ipads:0,backup:0}})).recommended;
    assert.equal(q?.package.id,'department');
    assert.equal(q?.firstYearBeforeTax,45295+(teams-5)*8990);
    assert.ok(!q?.lines.some(l=>l.name.startsWith('Required')));
  }
});
test('11+ teams and 36-month retention require custom review',()=>{
  assert.equal(getRecommendations(a({teams:11})).customNeeded,true);
  assert.equal(getRecommendations(a({retentionMonths:36})).customNeeded,true);
});
test('each exact requested hardware quantity is fulfilled without double billing',()=>{
  const h={cameras:2,mounts:3,sdCards:5,laptops:2,tripods:2,cases:2,ipads:2,backup:1};
  const q=evaluatePackage(a({hardwareNeeds:h}),pkg('plus'));
  assert.equal(q.lines.find(l=>l.name==='Required sport mounts')?.amount,395);
  assert.equal(q.lines.find(l=>l.name==='Additional microSD recording cards')?.amount,207);
  assert.equal(q.lines.find(l=>l.name==='Additional configured laptops')?.amount,2995);
  assert.equal(q.lines.find(l=>l.name==='Additional tripods')?.amount,99);
  assert.equal(q.lines.find(l=>l.name==='Required Pelican cases')?.amount,495);
  assert.equal(q.lines.find(l=>l.name==='Additional configured refurbished iPads')?.amount,549);
  assert.equal(q.lines.find(l=>l.name==='6 TB backup drives')?.amount,299);
});
test('optional spare camera + mount receives the published bundle savings',()=>{
  const q=evaluatePackage(a({addonQuantities:{camera:2,mount:1}}),pkg('basic'));
  assert.equal(q.lines.find(l=>l.name==='Optional camera + mount bundle')?.amount,1642);
  assert.equal(q.lines.find(l=>l.name==='Additional camera + card')?.amount,1295);
});
test('annual and monthly first year billing retain exact prices',()=>{
  const annual=evaluatePackage(a({billing:'annual'}),pkg('basic'));
  const monthly=evaluatePackage(a({billing:'monthly'}),pkg('basic'));
  assert.equal(annual.firstYearBeforeTax,6395);
  assert.ok(Math.abs(monthly.dueBeforeTax-(4292.8+207.6))<.001);
  assert.equal(monthly.firstYearBeforeTax,4292.8+12*207.6);
});
test('50 state rates plus DC are available with proper fractional precision',()=>{
  assert.equal(Object.keys(STATE_SALES_TAX_RATES).length,51);
  assert.equal(getStateRate('FL'),6);
  assert.equal(getStateRate('MN'),6.875);
  assert.equal(getStateRate('NJ'),6.625);
  assert.equal(getStateRate('AK'),0);
  assert.equal(getStateRate('OR'),0);
  assert.equal(getStateRate('XX'),null);
});
test('state-only tax is computed from hardware, not subscriptions or training',()=>{
  const q=evaluatePackage(a({shippingState:'FL',hardwareNeeds:{cameras:1,mounts:1,sdCards:1,laptops:1,tripods:1,cases:0,ipads:0,backup:0},addonQuantities:{laptop:1,training:2}}),pkg('basic'));
  assert.equal(q.taxableBase,4292.8+2995);
  assert.equal(q.taxAmount,437.27);
  assert.equal(q.oneTimeServices,298);
  assert.equal(q.firstYearTotal,q.firstYearBeforeTax+q.taxAmount!);
});
test('state selection without ZIP still computes tax; unknown state never displays misleading $0',()=>{
  const fl=evaluatePackage(a({shippingState:'FL',shippingZip:''}),pkg('basic'));
  assert.equal(fl.taxAmount,257.57);
  assert.equal(fl.taxReady,true);
  const unknown=evaluatePackage(a({shippingState:''}),pkg('basic'));
  assert.equal(unknown.taxAmount,null);
  assert.equal(unknown.firstYearTotal,null);
  const zero=evaluatePackage(a({shippingState:'OR'}),pkg('basic'));
  assert.equal(zero.taxAmount,0);
  assert.equal(zero.taxReady,true);
});
test('state tax rounds correctly, including fractional rates',()=>{
  assert.equal(stateHardwareTax(1000,'NJ'),66.25);
  assert.equal(stateHardwareTax(1000,'MN'),68.75);
  assert.equal(stateHardwareTax(1000,'OR'),0);
  assert.equal(stateHardwareTax(1000,'not a state'),null);
});
test('benchmark clearly prices individual tangible goods plus Basic service reference',()=>{
  const q=estimateIndividualComponents(a({hardwareNeeds:{cameras:1,mounts:1,sdCards:1,laptops:1,tripods:1,cases:0,ipads:0,backup:0}}));
  assert.equal(q.hardware,1642+2995+99);
  assert.equal(q.annualService,2102.20);
  assert.equal(q.firstYear,1642+2995+99+2102.20);
});
test('included support and protection are never charged again as extras',()=>{
  const q=evaluatePackage(a({priority:true,protection:true,addonQuantities:{support:1,protection:1}}),pkg('premium'));
  assert.equal(q.annualService,3743.40);
  assert.ok(q.notes.some(x=>x.includes('excluded')));
});

test('all complete packages include processing laptop and configured iPad without double billing',()=>{
  for(const p of PACKAGES){
    const teams=p.id==='department'?5:1;
    const h={cameras:p.camerasPerTeam*teams,mounts:p.mountPerTeam*teams,sdCards:p.camerasPerTeam*teams,laptops:p.id==='byod'?0:teams,tripods:teams,cases:p.casePerTeam*teams,ipads:teams,backup:0};
    const q=evaluatePackage(a({teams,hardwareNeeds:h}),p);
    assert.equal(q.includedIpads,teams,p.id+' included iPads');
    assert.equal(q.lines.some(l=>l.name==='Additional configured refurbished iPads'),false,p.id+' should not double-charge');
    assert.equal(q.lines.some(l=>l.name==='Additional configured laptops'),false,p.id+' included processing device');
  }
});
test('customer-owned iPads provide $500 credit per team with school-supplied iPad',()=>{
  const complete=evaluatePackage(a(),pkg('basic'));
  const own=evaluatePackage(a({useOwnIpad:true,hardwareNeeds:{cameras:1,mounts:1,sdCards:1,laptops:1,tripods:1,cases:0,ipads:0,backup:0}}),pkg('basic'));
  assert.equal(complete.firstYearBeforeTax,6395);
  assert.equal(own.firstYearBeforeTax,5895);
  assert.equal(own.hardwareSubtotal,3792.8);
  assert.equal(own.includedIpads,0);
  assert.equal(own.lines.find(l=>l.name==='Bring your own compatible iPad credit')?.amount,-500);
});
test('BYOD processing computer plus BYOD iPad combines two hardware credits, not two promotions',()=>{
  const own=evaluatePackage(a({useOwnIpad:true,hardwareNeeds:{cameras:1,mounts:1,sdCards:1,laptops:0,tripods:1,cases:0,ipads:0,backup:0}}),pkg('byod'));
  assert.equal(own.firstYearBeforeTax,4495);
  assert.equal(own.hardwareSubtotal,2392.8);
  assert.equal(own.includedIpads,0);
  assert.equal(own.lines.find(l=>l.name==='Additional configured laptops'),undefined);
  const promo=evaluatePackage(a({useOwnIpad:true,hardwareNeeds:{cameras:1,mounts:1,sdCards:1,laptops:0,tripods:1,cases:0,ipads:0,backup:0}}),pkg('byod'),'storage250');
  assert.equal(promo.firstYearBeforeTax,4495);
  assert.equal(promo.includedStorageGb,1250);
  assert.equal(promo.appliedPromotion,'storage250');
});
test('Athletic Department provides five iPads or $2,500 credit for five BYOD iPads',()=>{
  const original=evaluatePackage(a({teams:5}),pkg('department'));
  const own=evaluatePackage(a({teams:5,useOwnIpad:true}),pkg('department'));
  assert.equal(original.includedIpads,5);
  assert.equal(own.includedIpads,0);
  assert.equal(original.firstYearBeforeTax,45295);
  assert.equal(own.firstYearBeforeTax,42795);
  assert.equal(own.taxableBase,19800);
});
test('only one promotion is represented at once and package eligibility disables Basic-only mismatches',()=>{
  assert.equal(PROMOTIONS.length,6);
  assert.deepEqual(getPromotionAvailability('storage250','basic','annual',1).available,false);
  assert.deepEqual(getPromotionAvailability('storage250','byod','annual',1).available,true);
  assert.deepEqual(getPromotionAvailability('storage250','plus','monthly',1).available,false);
  assert.deepEqual(getPromotionAvailability('backup6','plus','annual',1).available,false);
  assert.deepEqual(getPromotionAvailability('backup6','plus','annual',2).available,true);
  assert.deepEqual(getPromotionAvailability('backup6','department','annual',2).available,false);
  assert.deepEqual(getPromotionAvailability('training1','premium','annual',1).available,false);
  assert.deepEqual(getPromotionAvailability('rateLock24','premium','annual',2).available,true);
  const basic=evaluatePackage(a(),pkg('basic'),'mount1');
  assert.equal(basic.appliedPromotion,'none');
  const plus=evaluatePackage(a({serviceYears:2}),pkg('plus'),'mount1');
  assert.equal(plus.appliedPromotion,'mount1');
  assert.equal(plus.lines.filter(l=>l.name.startsWith('Promotion:')).length,1);
});
test('50 GB per month promo reduces only projected delivery overages and stops after year one',()=>{
  const chosen=a({deliveryGb:320,storageGb:1000});
  const normal=evaluatePackage(chosen,pkg('plus'));
  const promo=evaluatePackage(chosen,pkg('plus'),'delivery50');
  assert.equal(normal.estimatedUsageAnnual,210);
  assert.equal(promo.estimatedUsageAnnual,60);
  assert.equal(promo.includedDeliveryGb,300);
  assert.equal(promo.firstYearBeforeTax,normal.firstYearBeforeTax-150);
});
test('monthly service does not qualify for an annual-prepay promotion',()=>{
  const aMonthly=a({billing:'monthly',serviceYears:2});
  const quote=evaluatePackage(aMonthly,pkg('plus'),'backup6');
  assert.equal(quote.appliedPromotion,'none');
  assert.ok(quote.notes.some(n=>n.includes('Promotion not applied')));
});
