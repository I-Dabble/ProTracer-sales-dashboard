import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { isAuthorized } from '@/lib/auth';
import { draftSchema } from '@/lib/api-schema';
import { getRecommendations, type QuoteAnswers } from '@/lib/quote';
import { CATALOG_DATE } from '@/lib/catalog';

export const runtime='nodejs';
const jsonError=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
function key(s:string){return s.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');}
function cents(v:number){return Math.round(v*100);}

export async function POST(req:NextRequest){
  if(!isAuthorized(req))return jsonError('Staff authorization required. Check the representative access key.',401);
  if(!process.env.DATABASE_URL)return jsonError('Draft persistence is not configured; connect a PostgreSQL database first.',503);
  let raw:unknown;
  try {raw=await req.json();}catch {return jsonError('Invalid JSON request.',400);}
  const parsed=draftSchema.safeParse(raw);
  if(!parsed.success)return jsonError('Please correct the quote information: '+parsed.error.issues.map(i=>i.path.join('.')+' '+i.message).slice(0,4).join('; '),400);
  const {answers,packageId,contact}=parsed.data;
  const result=getRecommendations(answers as QuoteAnswers);
  const chosen=result.comparisons.find(x=>x.package.id===packageId);
  if(!chosen||!chosen.eligible||chosen.dueNow===null||!chosen.taxReady)return jsonError('This quote needs custom review or a verified destination tax rate before a draft can be saved.',422);
  if(answers.teams>1&&contact.teamNames.split(';').filter(x=>x.trim()).length!==answers.teams)return jsonError('List every separately named sport/team separated by semicolons, matching the team count.',422);
  if(answers.teams===1&&!contact.teamNames.trim())return jsonError('The team or sport name is required.',422);

  const personKey=key(contact.billingName)+'|'+key(contact.organization);
  const pool=getPool();
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    let customerNumber:string;
    const requested=contact.existingCustomerNumber||'';
    if(requested){
      const prior=await client.query('SELECT customer_number::text AS id,identity_key FROM customers WHERE customer_number=$1',[requested]);
      if(prior.rowCount!==1||prior.rows[0].identity_key!==personKey)throw new Error('Provided customer number does not match this billing customer.');
      customerNumber=prior.rows[0].id;
      await client.query('UPDATE customers SET contact_email=$1,updated_at=NOW() WHERE customer_number=$2',[contact.email,customerNumber]);
    }else{
      // Upsert is atomic across concurrent representatives. Same identity = same permanent number.
      const entry=await client.query(`INSERT INTO customers(identity_key,billing_name,organization,contact_email)
        VALUES($1,$2,$3,$4) ON CONFLICT(identity_key) DO UPDATE
        SET contact_email=EXCLUDED.contact_email,updated_at=NOW()
        RETURNING customer_number::text AS id`,[personKey,contact.billingName,contact.organization,contact.email]);
      customerNumber=entry.rows[0].id;
    }
    const seq=(await client.query("SELECT nextval('invoice_number_seq')::text AS seq")).rows[0].seq as string;
    const invoiceNumber=`PT-INV-${new Date().getUTCFullYear()}-${seq.padStart(6,'0')}`;
    const id=randomUUID();
    await client.query(`INSERT INTO draft_invoices
      (id,invoice_number,customer_number,billing_name,organization,team_names,contact_email,
       rep_name,package_id,billing_cadence,hardware_cents,nonhardware_cents,tax_cents,
       due_now_cents,twelve_month_cents,tax_state,tax_zip,tax_rate_percent,tax_source,
       tax_verified_by,answers_snapshot,quote_snapshot,catalog_version)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22::jsonb,$23)`,[
      id,invoiceNumber,customerNumber,contact.billingName,contact.organization,contact.teamNames,contact.email,
      contact.representative,chosen.package.id,answers.billing,cents(chosen.hardwareSubtotal),
      cents(chosen.dueBeforeTax-chosen.hardwareSubtotal),cents(chosen.taxAmount||0),
      cents(chosen.dueNow),cents(chosen.firstYearTotal||0),answers.shippingState,answers.shippingZip,
      answers.combinedTaxRate,answers.taxSource,contact.representative,JSON.stringify(answers),JSON.stringify(chosen),CATALOG_DATE,
    ]);
    await client.query('COMMIT');
    return NextResponse.json({id,invoiceNumber,customerNumber,status:'DRAFT',dueNow:chosen.dueNow,catalogDate:CATALOG_DATE},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    if(error instanceof Error&&error.message.includes('Provided customer number'))return jsonError(error.message,409);
    console.error('Draft creation failed',error instanceof Error?error.message:'unknown');
    return jsonError('Could not save the draft. Verify database setup and try again; no payment was processed.',500);
  }finally{client.release();}
}
