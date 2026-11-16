import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_ANSWERS,evaluatePackage,getRecommendations } from '../lib/quote';
import { PACKAGES } from '../lib/catalog';
function withAnswers(values:Partial<typeof DEFAULT_ANSWERS>={}){return {...DEFAULT_ANSWERS,...values};}
const get=(id:string)=>PACKAGES.find(x=>x.id===id)!;

test('all four approved baseline price splits and one-year totals match financial model',()=>{
  const known={basic:[4592.80,2102.20,6695],plus:[6392.80,2102.20,8495],premium:[6751.60,3743.40,10495],department:[19995,22995,42990]};
  for(const [id,values] of Object.entries(known)){
    const a=withAnswers({teams:id==='department'?5:1,storageGb:id==='department'?10000:id==='premium'?2000:1000,deliveryGb:id==='department'?1000:id==='premium'?500:250});
    const q=evaluatePackage(a,get(id));
    assert.equal(q.hardwareSubtotal,values[0],id+' hardware');
    assert.equal(q.annualService,values[1],id+' recurring');
    assert.equal(q.firstYearBeforeTax,values[2],id+' first year');
  }
});
test('default recommendation is Basic Team',()=>assert.equal(getRecommendations(withAnswers()).recommended?.package.id,'basic'));
test('five centralized teams: department eligible and quoted at $42990',()=>{
  const r=getRecommendations(withAnswers({teams:5,departmentAdmin:true,storageGb:10000,deliveryGb:1000}));
  assert.equal(r.recommended?.package.id,'department');
  assert.equal(r.recommended?.firstYearBeforeTax,42990);
});
test('six centralized teams: added full kit + annual license at $51980',()=>{
  const r=getRecommendations(withAnswers({teams:6,departmentAdmin:true,storageGb:10000,deliveryGb:1000}));
  assert.equal(r.recommended?.firstYearBeforeTax,51980);
});
test('eleven teams are custom quote only',()=>assert.equal(getRecommendations(withAnswers({teams:11,departmentAdmin:true})).customNeeded,true));
test('camera and mount bundle is selected when both are needed',()=>{
  const q=evaluatePackage(withAnswers({camerasPerTeam:2,wantMount:true}),get('basic'));
  const combo=q.lines.find(x=>x.name.includes('bundles'));
  assert.equal(combo?.amount,1642);
  assert.equal(q.hardwareSubtotal,4592.8+1642);
});
test('tax applies ONLY to hardware, not training or annual subscription',()=>{
  const q=evaluatePackage(withAnswers({shippingState:'FL',shippingZip:'33602',combinedTaxRate:7.5,taxVerified:true,taxSource:'Verified full destination rate 2026-11-16',addonQuantities:{training:2,laptop:1}}),get('basic'));
  assert.equal(q.taxableBase,4592.80+2995);
  assert.equal(q.taxAmount,569.09);
  assert.equal(q.oneTimeServices,298);
  assert.equal(q.dueNow,4592.8+2995+298+2102.2+569.09);
});
test('tax unknown is not silently zero',()=>{
  const q=evaluatePackage(withAnswers({shippingState:'FL',shippingZip:'33602'}),get('basic'));
  assert.equal(q.taxAmount,null);assert.equal(q.dueNow,null);assert.equal(q.taxReady,false);
});
test('monthly service charges first month at signing and all 12 periods in first-year total',()=>{
  const q=evaluatePackage(withAnswers({billing:'monthly'}),get('basic'));
  assert.ok(Math.abs(q.dueBeforeTax-(4592.8+207.6))<0.001);
  assert.equal(q.firstYearBeforeTax,4592.8+12*207.6);
});
test('extra annual options paid once with first month on monthly service',()=>{
  const q=evaluatePackage(withAnswers({billing:'monthly',addonQuantities:{warranty:1}}),get('basic'));
  assert.ok(Math.abs(q.dueBeforeTax-(4592.8+207.6+299))<0.001);
});
test('no duplicate support or protection on already included premium',()=>{
  const q=evaluatePackage(withAnswers({addonQuantities:{support:1,protection:1},priority:true,protection:true}),get('premium'));
  assert.equal(q.annualService,3743.4);
  assert.equal(q.notes.some(n=>n.includes('excluded')),true);
});
test('24-month retention makes Basic and Plus ineligible',()=>{
  const r=getRecommendations(withAnswers({retentionMonths:24}));
  assert.equal(r.comparisons.find(x=>x.package.id==='basic')?.eligible,false);
  assert.equal(r.comparisons.find(x=>x.package.id==='plus')?.eligible,false);
});


test('five independent teams can be priced separately without department administration',()=>{
  const r=getRecommendations(withAnswers({teams:5,storageGb:5000,deliveryGb:1250,departmentAdmin:false}));
  const basic=r.comparisons.find(x=>x.package.id==='basic')!;
  assert.equal(basic.firstYearBeforeTax,5*6695);
  assert.equal(basic.includedStorageGb,5000);
  assert.equal(basic.includedDeliveryGb,1250);
});
test('department camera+mount bundles include five distinct teams',()=>{
  const q=evaluatePackage(withAnswers({teams:5,departmentAdmin:true,camerasPerTeam:2,wantMount:true,storageGb:10000,deliveryGb:1000}),get('department'));
  assert.equal(q.lines.find(x=>x.name.includes('bundles'))?.quantity,5);
  assert.equal(q.hardwareSubtotal,19995+5*1642);
});
test('explicitly verified 0 percent tax is valid, unknown zero is not',()=>{
  const verified=evaluatePackage(withAnswers({shippingState:'OR',shippingZip:'97035',combinedTaxRate:0,taxVerified:true,taxSource:'Verified 2026-11-16 jurisdiction review'}),get('basic'));
  assert.equal(verified.taxAmount,0); assert.equal(verified.taxReady,true);
  const notVerified=evaluatePackage(withAnswers({shippingState:'OR',shippingZip:'97035',combinedTaxRate:0,taxVerified:false,taxSource:'Verified 2026-11-16 jurisdiction review'}),get('basic'));
  assert.equal(notVerified.taxAmount,null);
});
test('refusing overages makes an insufficient cloud allowance ineligible',()=>{
  const q=evaluatePackage(withAnswers({acceptOverages:false,storageGb:50000,deliveryGb:10000}),get('basic'));
  assert.equal(q.eligible,false);
});
test('annual package with services, hardware and tax reconciles signing total',()=>{
  const q=evaluatePackage(withAnswers({addonQuantities:{camera:1,training:1,support:1},shippingState:'FL',shippingZip:'33602',combinedTaxRate:6,taxVerified:true,taxSource:'Verified full rate including local district'}),get('basic'));
  assert.equal(q.taxableBase,4592.8+1295);
  assert.ok(Math.abs((q.hardwareSubtotal+q.oneTimeServices+q.annualService+(q.taxAmount||0))-Number(q.dueNow))<0.001);
});
