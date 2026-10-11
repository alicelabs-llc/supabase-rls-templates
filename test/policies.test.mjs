import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',V='00000000-0000-0000-0000-000000000003';
const O1='10000000-0000-0000-0000-000000000001',O2='10000000-0000-0000-0000-000000000002';
async function fixture(pattern){
 const native=Boolean(process.env.DATABASE_URL);
 if(native && process.env.ALLOW_TEST_SCHEMA_RESET!=='1')throw Error('Use a disposable database and set ALLOW_TEST_SCHEMA_RESET=1; tests recreate public/auth schemas.');
 const db=native?new pg.Client({connectionString:process.env.DATABASE_URL}):new PGlite();
 if(native)await db.connect();
 const q=(sql,args)=>db.query(sql,args),exec=sql=>native?q(sql):db.exec(sql);
 await exec(`
 DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
 DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE;
 CREATE SCHEMA public; CREATE SCHEMA auth;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES ('${A}'),('${B}'),('${V}');
 CREATE TABLE public.organizations(id uuid PRIMARY KEY); INSERT INTO public.organizations VALUES ('${O1}'),('${O2}');
 CREATE TABLE public.your_table(id int PRIMARY KEY,user_id uuid REFERENCES auth.users(id),org_id uuid REFERENCES public.organizations(id),body text);
 GRANT SELECT,INSERT,UPDATE,DELETE ON public.your_table TO authenticated,anon;
 INSERT INTO public.your_table VALUES (1,'${A}','${O1}','alpha'),(2,'${B}','${O2}','beta');
 `);
 await exec(await readFile(new URL(`../policies/${pattern}.sql`,import.meta.url),'utf8'));
 const as=async(uid,role='authenticated',claims={})=>{await exec('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[uid??'',JSON.stringify(claims)]);await exec(`SET ROLE ${role}`);};
 return {q,exec,as,close:()=>native?db.end():db.close()};
}
const denied=async(query)=>assert.rejects(query,error=>error.code==='42501');
const ids=async db=>(await db.q('SELECT id FROM public.your_table ORDER BY id')).rows.map(r=>r.id);
const changed=async(db,sql)=>{const result=await db.q(sql);return result.rows.length;};

test('owner isolation: all CRUD, foreign owner rejection, null and anonymous',async()=>{
 const db=await fixture('user-owns-row');try{
  await db.as(A);assert.deepEqual(await ids(db),[1]);
  await db.q(`INSERT INTO public.your_table VALUES(3,'${A}','${O1}','own')`);
  await denied(db.q(`INSERT INTO public.your_table VALUES(4,'${B}','${O2}','foreign')`));
  await denied(db.q(`UPDATE public.your_table SET user_id='${B}' WHERE id=1`));
  assert.equal(await changed(db,"UPDATE public.your_table SET body='edited' WHERE id=1 RETURNING id"),1);
  assert.equal(await changed(db,"UPDATE public.your_table SET body='stolen' WHERE id=2 RETURNING id"),0);
  assert.equal(await changed(db,'DELETE FROM public.your_table WHERE id=2 RETURNING id'),0);
  assert.equal(await changed(db,'DELETE FROM public.your_table WHERE id=3 RETURNING id'),1);
  await db.as(B);assert.deepEqual(await ids(db),[2]);
  for(const role of ['authenticated','anon']){await db.as(null,role);assert.deepEqual(await ids(db),[]);await denied(db.q("INSERT INTO public.your_table(id,body) VALUES(10,'no owner')"));}
 }finally{await db.close();}
});

test('tenant isolation: viewer read-only, protected memberships and cross-tenant writes',async()=>{
 const db=await fixture('multi-tenant');try{
  await db.exec(`INSERT INTO public.org_members(org_id,user_id,role) VALUES('${O1}','${A}','member'),('${O2}','${B}','admin'),('${O1}','${V}','viewer');`);
  await db.as(A);assert.deepEqual(await ids(db),[1]);assert.equal((await db.q('SELECT * FROM public.org_members')).rows.length,1);
  await db.q(`INSERT INTO public.your_table VALUES(3,'${A}','${O1}','own')`);
  await denied(db.q(`INSERT INTO public.your_table VALUES(4,'${A}','${O2}','foreign')`));
  await denied(db.q(`UPDATE public.your_table SET org_id='${O2}' WHERE id=1`));
  assert.equal(await changed(db,"UPDATE public.your_table SET body='edited' WHERE id=1 RETURNING id"),1);
  assert.equal(await changed(db,"UPDATE public.your_table SET body='stolen' WHERE id=2 RETURNING id"),0);
  assert.equal(await changed(db,'DELETE FROM public.your_table WHERE id=1 RETURNING id'),0);
  await denied(db.q("UPDATE public.org_members SET role='owner'"));
  await denied(db.q(`INSERT INTO public.org_members(org_id,user_id,role) VALUES('${O2}','${A}','owner')`));
  await db.as(V);assert.deepEqual(await ids(db),[1,3]);
  await denied(db.q(`INSERT INTO public.your_table VALUES(5,'${V}','${O1}','viewer')`));
  assert.equal(await changed(db,"UPDATE public.your_table SET body='viewer' RETURNING id"),0);
  assert.equal(await changed(db,'DELETE FROM public.your_table RETURNING id'),0);
  await db.as(B);assert.deepEqual(await ids(db),[2]);assert.equal(await changed(db,'DELETE FROM public.your_table WHERE id=2 RETURNING id'),1);
  await db.exec('RESET ROLE');await db.q('DELETE FROM public.org_members WHERE user_id=$1',[A]);
  await db.as(A);assert.deepEqual(await ids(db),[]);
  await db.as(null,'anon');assert.deepEqual(await ids(db),[]);await denied(db.q('SELECT * FROM public.org_members'));
  await db.as(null);assert.deepEqual(await ids(db),[]);
 }finally{await db.close();}
});

test('global RBAC: viewer/editor/admin, untrusted metadata and missing claims',async()=>{
 const db=await fixture('role-based');try{
  for(const role of ['viewer','editor','admin']){
   await db.as(A,'authenticated',{app_metadata:{app_role:role}});assert.deepEqual(await ids(db),[1,2]);
   const insert=db.q(`INSERT INTO public.your_table VALUES(3,'${A}','${O1}','new')`);
   if(role==='viewer'){await denied(insert);assert.equal(await changed(db,"UPDATE public.your_table SET body='viewer' RETURNING id"),0);}
   else {await insert;assert.equal(await changed(db,"UPDATE public.your_table SET body='updated' WHERE id=3 RETURNING id"),1);}
   assert.equal(await changed(db,'DELETE FROM public.your_table WHERE id=1 RETURNING id'),role==='admin'?1:0);
   await db.exec('RESET ROLE');await db.q('DELETE FROM public.your_table WHERE id=3');
  }
  for(const claims of [{},{app_metadata:{app_role:'unknown'}},{user_metadata:{app_role:'admin'}}]){await db.as(A,'authenticated',claims);assert.deepEqual(await ids(db),[]);await denied(db.q("INSERT INTO public.your_table(id) VALUES(3)"));}
  for(const role of ['authenticated','anon']){await db.as(null,role,{app_metadata:{app_role:'admin'}});assert.deepEqual(await ids(db),[]);await denied(db.q("INSERT INTO public.your_table(id) VALUES(3)"));}
 }finally{await db.close();}
});
