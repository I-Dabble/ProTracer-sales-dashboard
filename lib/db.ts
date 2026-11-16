import { Pool } from 'pg';

declare global { var __protracerPool:Pool|undefined; }

export function getPool():Pool {
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured. Draft saving has not been enabled.');
  if(!globalThis.__protracerPool){
    globalThis.__protracerPool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:30000,connectionTimeoutMillis:10000});
  }
  return globalThis.__protracerPool;
}
