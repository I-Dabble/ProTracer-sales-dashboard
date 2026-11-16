import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export function isAuthorized(request:NextRequest):boolean {
  const expected=process.env.SALES_REP_SECRET;
  if(!expected || expected.length<32)return false;
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return false;
  const supplied=authorization.slice('Bearer '.length);
  const lhs=Buffer.from(supplied,'utf8');
  const rhs=Buffer.from(expected,'utf8');
  return lhs.length===rhs.length&&timingSafeEqual(lhs,rhs);
}
