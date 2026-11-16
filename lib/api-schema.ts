import { z } from 'zod';
import { ADDONS } from './catalog';
import { STATE_CODES } from './states';

const productIds=ADDONS.map(a=>a.id);
export const answersSchema=z.object({
  buyerType:z.enum(['school','club','organization','other']),
  teams:z.number().int().min(1).max(50),
  camerasPerTeam:z.number().int().min(1).max(3),
  wantMount:z.boolean(),wantCase:z.boolean(),priority:z.boolean(),protection:z.boolean(),
  trainingHours:z.number().int().min(0).max(200),
  storageGb:z.number().min(0).max(100000),deliveryGb:z.number().min(0).max(100000),
  retentionMonths:z.union([z.literal(12),z.literal(24),z.literal(36)]),
  departmentAdmin:z.boolean(),acceptOverages:z.boolean(),
  billing:z.enum(['annual','monthly']),
  addonQuantities:z.record(z.number().int().min(0).max(100)).refine(q=>Object.keys(q).every(k=>productIds.includes(k as never)),'Unknown add-on'),
  shippingState:z.string().refine(v=>STATE_CODES.includes(v),'Invalid state'),
  shippingZip:z.string().regex(/^\d{5}$/),
  combinedTaxRate:z.number().min(0).max(20),
  taxVerified:z.literal(true),
  taxSource:z.string().trim().min(5).max(300),
  freightTravel:z.number().min(0).max(500000),
}).strict();
export const draftSchema=z.object({
  answers:answersSchema,
  packageId:z.enum(['basic','plus','premium','department']),
  contact:z.object({
    billingName:z.string().trim().min(2).max(150),
    organization:z.string().trim().min(2).max(150),
    teamNames:z.string().trim().min(2).max(500),
    email:z.string().trim().email().max(250),
    representative:z.string().trim().min(2).max(150),
    existingCustomerNumber:z.string().regex(/^\d{10}$/).optional().or(z.literal('')),
  }).strict(),
}).strict();
