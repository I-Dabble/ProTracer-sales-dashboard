/**
 * State-level sales and gross-receipts tax planning rates (percent), 2026-07-01.
 * Source: Tax Foundation, State and Local Sales Tax Rates, Midyear 2026:
 * https://taxfoundation.org/data/all/state/2026-sales-tax-rates-midyear/
 *
 * Only state-level rates are included; optional local/county/city/district rates,
 * special taxes, seller nexus, exclusions, exemptions, and service taxability
 * must be verified for a real transaction. ZIP codes are NOT exact tax jurisdictions.
 */
export const STATE_RATE_SOURCE = 'Tax Foundation, July 1, 2026';
export const STATE_RATE_SOURCE_URL = 'https://taxfoundation.org/data/all/state/2026-sales-tax-rates-midyear/';
export const STATE_SALES_TAX_RATES: Readonly<Record<string, number>> = Object.freeze({
  AL:4, AK:0, AZ:5.6, AR:6.5, CA:7.25, CO:2.9, CT:6.35, DE:0, DC:6,
  FL:6, GA:4, HI:4, ID:6, IL:6.25, IN:7, IA:6, KS:6.5, KY:6,
  LA:5, ME:5.5, MD:6, MA:6.25, MI:6, MN:6.875, MS:7, MO:4.225,
  MT:0, NE:5.5, NV:6.85, NH:0, NJ:6.625, NM:4.875, NY:4,
  NC:4.75, ND:5, OH:5.75, OK:4.5, OR:0, PA:6, RI:7, SC:6,
  SD:4.2, TN:7, TX:6.25, UT:6.1, VT:6, VA:5.3, WA:6.5,
  WV:6, WI:5, WY:4,
});
export function getStateRate(state: string): number|null {
  const key = (state || '').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(STATE_SALES_TAX_RATES,key)
    ? STATE_SALES_TAX_RATES[key] : null;
}
export function stateHardwareTax(hardware: number, state: string): number|null {
  const rate=getStateRate(state);
  return rate===null?null:Math.round((Math.max(0,hardware)*rate/100+Number.EPSILON)*100)/100;
}
