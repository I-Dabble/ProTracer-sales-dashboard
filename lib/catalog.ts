/** Approved ProTracer quote inputs. Source: Financial Model FY2027-2031 (2026-11-16).
 * https://docs.google.com/spreadsheets/d/1uZ5NzyRCeiEFvYMgHyHUoPUxyccnkAPo34DlKnGdXBU/edit
 * Hardware field comes from approved "one-time equipment & setup" package amount.
 * IMPORTANT: bundled setup allocation has not been separately stated in that model;
 * finance/tax advisors must approve how the package is represented on final invoices.
 */
export type PackageId = 'basic' | 'plus' | 'premium' | 'department';
export type ProductId =
  | 'laptop' | 'ipad' | 'camera' | 'mount' | 'bundle' | 'case' | 'backup'
  | 'tripod' | 'mouse' | 'sdcard' | 'training' | 'installation'
  | 'technician' | 'travel' | 'support' | 'warranty' | 'protection' | 'multicam';
export type ProductCategory = 'hardware' | 'service' | 'annual';

export type PackageDef = {
  id: PackageId;
  title: string;
  subtitle: string;
  badge: string;
  hardware: number;
  annualService: number;
  monthlyService: number;
  camerasPerTeam: number;
  includedTeams: number;
  storageGb: number;
  deliveryGb: number;
  retentionMonths: number;
  mountPerTeam: number;
  casePerTeam: number;
  priority: boolean;
  protection: boolean;
  trainingHoursPerTeam: number;
  departmentAdmin: boolean;
  highlights: string[];
};

export const PACKAGES: readonly PackageDef[] = [
  {
    id: 'basic', title: 'Basic Team', subtitle: 'One-camera essentials', badge: 'Essentials',
    hardware: 4592.80, annualService: 2102.20, monthlyService: 207.60,
    camerasPerTeam: 1, includedTeams: 1, storageGb: 1000, deliveryGb: 250,
    retentionMonths: 12, mountPerTeam: 0, casePerTeam: 0, priority: false,
    protection: false, trainingHoursPerTeam: 0, departmentAdmin: false,
    highlights: ['One 360 camera + processing kit', '1 TB retained cloud storage', '250 GB monthly delivery', 'Standard support'],
  },
  {
    id: 'plus', title: 'Team Plus', subtitle: 'Add a second angle', badge: 'Popular with teams',
    hardware: 6392.80, annualService: 2102.20, monthlyService: 207.60,
    camerasPerTeam: 2, includedTeams: 1, storageGb: 1000, deliveryGb: 250,
    retentionMonths: 12, mountPerTeam: 0, casePerTeam: 1, priority: false,
    protection: false, trainingHoursPerTeam: 0, departmentAdmin: false,
    highlights: ['Two cameras + cards', 'Protective transport case', '1 TB retained cloud storage', 'Standard support'],
  },
  {
    id: 'premium', title: 'Premium Team', subtitle: 'Built for demanding programs', badge: 'Full experience',
    hardware: 6751.60, annualService: 3743.40, monthlyService: 366.20,
    camerasPerTeam: 2, includedTeams: 1, storageGb: 2000, deliveryGb: 500,
    retentionMonths: 24, mountPerTeam: 1, casePerTeam: 1, priority: true,
    protection: true, trainingHoursPerTeam: 1, departmentAdmin: false,
    highlights: ['Two cameras, mount and case', '2 TB retained cloud storage', 'Priority support + protection', '24-month retention + annual training'],
  },
  {
    id: 'department', title: 'Athletic Department', subtitle: 'One connected sports program', badge: 'Five-team foundation',
    hardware: 19995, annualService: 22995, monthlyService: 2299.50,
    camerasPerTeam: 1, includedTeams: 5, storageGb: 10000, deliveryGb: 1000,
    retentionMonths: 24, mountPerTeam: 0, casePerTeam: 0, priority: true,
    protection: true, trainingHoursPerTeam: 0, departmentAdmin: true,
    highlights: ['Five complete team capture kits', '10 TB pooled retained storage', 'Shared department administration', 'Priority department support'],
  },
];

export type AddOn = {
  id: ProductId;
  name: string;
  price: number;
  category: ProductCategory;
  detail: string;
};

export const ADDONS: readonly AddOn[] = [
  { id:'laptop', name:'Additional processing laptop', price:2995, category:'hardware', detail:'Configured laptop; does not add team license' },
  { id:'ipad', name:'Refurbished iPad', price:549, category:'hardware', detail:'Configured; confirm device compatibility' },
  { id:'camera', name:'Additional camera + card', price:1295, category:'hardware', detail:'Includes recording media and setup' },
  { id:'mount', name:'Sport-specific mount', price:395, category:'hardware', detail:'Includes remote setup' },
  { id:'bundle', name:'Camera + mount bundle', price:1642, category:'hardware', detail:'Best value when adding both together' },
  { id:'case', name:'Protective transport case', price:495, category:'hardware', detail:'Pelican-style case' },
  { id:'backup', name:'6 TB local backup drive', price:299, category:'hardware', detail:'Offline copy; not additional cloud capacity' },
  { id:'tripod', name:'Additional tripod', price:99, category:'hardware', detail:'Portable camera support' },
  { id:'mouse', name:'Wireless mouse', price:79, category:'hardware', detail:'Additional input device' },
  { id:'sdcard', name:'microSD recording card', price:69, category:'hardware', detail:'Additional recording media' },
  { id:'training', name:'Remote training hour', price:149, category:'service', detail:'One-time session beyond included training' },
  { id:'installation', name:'Onsite installation', price:995, category:'service', detail:'One-time service; travel billed separately' },
  { id:'technician', name:'Field technician day', price:1250, category:'service', detail:'Staffing day excluding travel' },
  { id:'travel', name:'Travel day', price:750, category:'service', detail:'Travel expenses may be extra' },
  { id:'support', name:'Premium support / year', price:499, category:'annual', detail:'Skip if already included or auto-added' },
  { id:'warranty', name:'Extended warranty / year', price:299, category:'annual', detail:'Separate, scope-controlled warranty' },
  { id:'protection', name:'Premium protection / year', price:499, category:'annual', detail:'Skip if already included or auto-added' },
  { id:'multicam', name:'Multi-camera software license / year', price:999, category:'annual', detail:'Only if separately scoped; never added automatically' },
];

export const CATALOG_DATE = '2026-11-16';
export const DEPT_EXTRA = { hardware:4495, annual:4495, monthly:449.50, storageGb:2000, deliveryGb:200 } as const;
export const USAGE = { storageGbMonth:0.25, deliveredGb:0.25 } as const;
