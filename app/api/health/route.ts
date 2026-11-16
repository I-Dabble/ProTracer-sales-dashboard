import { NextResponse } from 'next/server';
export async function GET(){return NextResponse.json({status:'ok',service:'protracer-sales',invoiceSavingConfigured:Boolean(process.env.DATABASE_URL&&process.env.SALES_REP_SECRET&&process.env.SALES_REP_SECRET.length>=32)}, {headers:{'Cache-Control':'no-store'}});}
