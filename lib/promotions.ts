/** Customer-facing incentives approved for quote consideration, from Jeff's Sales Offer Card (17 Nov 2026).
 * Only one may be selected per quote; economics/authority remain subject to a written offer.
 * Deliberately exclude internal costs and margin data from this public repository.
 */
import type { PackageId } from './catalog';

export type PromotionId =
  | 'none' | 'storage250' | 'delivery50' | 'training1' | 'mount1' | 'backup6' | 'rateLock24';
export type BillingFrequency = 'annual' | 'monthly';

export type Promotion = {
  id: PromotionId;
  title: string;
  description: string;
  qualification: string;
  eligiblePackages: readonly PackageId[];
  minimumServiceYears: 1 | 2;
  annualPrepayRequired: boolean;
  requiresTeamReview?: boolean;
};

const ALL: readonly PackageId[] = ['basic','byod','plus','premium','department'];
const CLOUD: readonly PackageId[] = ['byod','plus','premium','department'];
const EQUIPMENT: readonly PackageId[] = ['byod','plus','premium'];

export const PROMOTIONS: readonly Promotion[] = [
  {
    id:'storage250', title:'Extra 250 GB retained storage', description:'250 GB of additional cloud library capacity for your first 12 months.',
    qualification:'First year of service prepaid in full. Capacity is limited to the first 12 months; standard retention still applies.',
    eligiblePackages:CLOUD, minimumServiceYears:1, annualPrepayRequired:true,
  },
  {
    id:'delivery50', title:'Extra 50 GB/month video delivery', description:'50 GB of additional combined streaming and download capacity each month for 12 months.',
    qualification:'First year of service prepaid in full. Extra allowance ends after month 12.',
    eligiblePackages:CLOUD, minimumServiceYears:1, annualPrepayRequired:true,
  },
  {
    id:'training1', title:'One complimentary extra training hour', description:'One additional remote ProTracer product-use training session, beyond hours included in your package.',
    qualification:'First year of service prepaid in full. Applies only to BYOD or Team Plus.',
    eligiblePackages:['byod','plus'], minimumServiceYears:1, annualPrepayRequired:true,
  },
  {
    id:'mount1', title:'One extra sport-specific mount', description:'Add one spare sport-specific camera mount at no extra charge.',
    qualification:'24-month service commitment with the first service year paid in full. The standard mount is already included.',
    eligiblePackages:EQUIPMENT, minimumServiceYears:2, annualPrepayRequired:true,
  },
  {
    id:'backup6', title:'6 TB local backup drive', description:'One complimentary local backup drive, separate from your cloud allowance.',
    qualification:'24-month service commitment with the first service year paid in full.',
    eligiblePackages:EQUIPMENT, minimumServiceYears:2, annualPrepayRequired:true,
  },
  {
    id:'rateLock24', title:'Request a 24-month subscription rate lock', description:'Ask our team to hold your subscription rate through year two.',
    qualification:'24-month service commitment with annual-prepaid service; a rate lock requires explicit ProTracer approval.',
    eligiblePackages:ALL, minimumServiceYears:2, annualPrepayRequired:true, requiresTeamReview:true,
  },
];

export function promotionById(id:PromotionId):Promotion|undefined {
  return PROMOTIONS.find(p=>p.id===id);
}

export function getPromotionAvailability(id:PromotionId, packageId:PackageId, billing:BillingFrequency, serviceYears:number):{available:boolean;reason:string} {
  if(id==='none')return {available:true,reason:'No promotion selected.'};
  const p=promotionById(id);
  if(!p)return {available:false,reason:'Promotion not recognized.'};
  if(!p.eligiblePackages.includes(packageId))return {available:false,reason:'Not offered with this package.'};
  if(p.minimumServiceYears>serviceYears)return {available:false,reason:'Requires a 24-month service commitment.'};
  if(p.annualPrepayRequired&&billing!=='annual')return {available:false,reason:'Requires annual-prepaid service.'};
  return {available:true,reason:p.requiresTeamReview?'Requires ProTracer team review before the rate is confirmed.':'Available with the selected package and payment terms; subject to an approved quote.'};
}
