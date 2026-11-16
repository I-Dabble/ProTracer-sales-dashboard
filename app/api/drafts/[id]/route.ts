import { NextRequest,NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const runtime='nodejs';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!isAuthorized(req))return NextResponse.json({error:'Staff authorization required.'},{status:401});
  if(!process.env.DATABASE_URL)return NextResponse.json({error:'Database not configured.'},{status:503});
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Invalid invoice ID.'},{status:400});
  const r=await getPool().query('SELECT * FROM draft_invoices WHERE id=$1',[id]);
  if(r.rowCount!==1)return NextResponse.json({error:'Not found.'},{status:404});
  return NextResponse.json(r.rows[0],{headers:{'Cache-Control':'private,no-store'}});
}
