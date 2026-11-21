import test from 'node:test';
import assert from 'node:assert/strict';
import auth from '../src/auth-worker.mjs';

// Integration guards without exchange credentials or D1 writes.
const url = 'https://v2-auth.test';
const request = (path, method='GET', payload=null, headers={}) =>
  new Request(url+path, {method,headers:payload===null?headers:{
    'Origin':url,'X-Puzzle-V2':'1','Content-Type':'application/json',...headers
  },...(payload===null?{}:{body:JSON.stringify(payload)})});

test('V2 Auth health is READ_ONLY and forbids orders', async()=>{
  const r=await auth.fetch(request('/health'),{});
  assert.equal(r.status,200);
  const d=await r.json();
  assert.equal(d.mode,'READ_ONLY');
  assert.equal(d.orderExecution,'DISABLED');
  assert.equal(d.signupConfigured,false);
  assert.equal((await auth.fetch(request('/api/orders','POST',{}),{DB:{}})).status,404);
});
test('V2 separates Signup from authenticated API connection and PAPER balance',async()=>{
  const r=await auth.fetch(request('/signup'),{});
  assert.equal(r.status,200);
  const body=await r.text();
  assert.match(body,/PUZZLE TRADER V2/);
  assert.match(body,/KUCOIN_FUTURES/);
  assert.match(body,/BINANCE_FUTURES/);
  assert.match(body,/Cod de invitație/);
  const signupHtml=body.split('<section id="signupSection" hidden>')[1]?.split('</section>')[0];
  assert.ok(signupHtml);
  assert.ok(!signupHtml.includes('id="apiKey"'));
  assert.ok(!signupHtml.includes('id="apiSecret"'));
  assert.ok(!signupHtml.includes('id="apiPassphrase"'));
  assert.ok(body.includes('id="apiKey"'));
  assert.ok(body.includes('id="apiSecret"'));
  assert.ok(body.includes('id="apiPassphrase"'));
  assert.ok(!body.includes('paperBalanceMicro'));
});
test('Signup fails closed when no invite secret has been configured',async()=>{
  const r=await auth.fetch(request('/api/signup','POST',{username:'test123',exchange:'KUCOIN_FUTURES',invite:'placeholder'}),{DB:{}});
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'SIGNUP_NOT_CONFIGURED');
});
test('Login fails closed before rate-limit secret provisioning',async()=>{
  const r=await auth.fetch(request('/api/login','POST',{username:'test123',password:'somepassword'}),{DB:{}});
  assert.equal(r.status,503);
});
test('POST requires same-origin and custom anti-CSRF header',async()=>{
  const r=await auth.fetch(request('/api/signup','POST',{username:'tester'} ,{'Origin':'https://untrusted.invalid'}),{DB:{}});
  assert.equal(r.status,403);
});
test('Unauthenticated profile cannot access user data',async()=>{
  const r=await auth.fetch(request('/api/me'),{DB:{}});
  assert.equal(r.status,401);
});

test('Signup accepts 8-char invitation and rejects 7-char invitation',async()=>{
  const {createHash}=await import('node:crypto');
  const invitation='A7mP2xQ9'; // Unit-test fixture only, not an active invitation.
  const digest=createHash('sha256').update(invitation).digest('hex');
  const inserted=[];
  let count=0;
  const db={prepare(sql){
    return {bind(...params){
      return {
        async first(){
          if(sql.includes('SELECT attempts FROM auth_rate_limits'))return {attempts:++count};
          if(sql.includes('SELECT user_id FROM users'))return null;
          throw new Error('Unexpected SELECT: '+sql.slice(0,50));
        },
        async run(){
          if(sql.startsWith('INSERT INTO users('))inserted.push(params);
          else if(!sql.startsWith('INSERT INTO auth_rate_limits('))throw new Error('Unexpected INSERT: '+sql.slice(0,50));
          return {success:true};
        }
      };
    }};
  }};
  const env={DB:db,AUTH_RATE_PEPPER:'unit-only-pepper',AUTH_SIGNUP_INVITE_HASH:digest};
  const bad=await auth.fetch(request('/api/signup','POST',{username:'guest1',exchange:'KUCOIN_FUTURES',invite:invitation.slice(0,7)}),env);
  assert.equal(bad.status,403);
  assert.equal(inserted.length,0);
  const good=await auth.fetch(request('/api/signup','POST',{username:'guest1',exchange:'KUCOIN_FUTURES',invite:invitation}),env);
  assert.equal(good.status,201);
  const data=await good.json();
  assert.equal(data.username,'guest1');
  assert.equal(data.exchange,'KUCOIN_FUTURES');
  assert.ok(data.generatedPassword.length>=24);
  assert.equal(inserted.length,1);
  assert.ok(inserted[0][2].startsWith('pbkdf2-sha256$'));
  assert.equal(inserted[0][3],'KUCOIN_FUTURES');
});

test('Exchange credential routes are not accessible without authenticated session',async()=>{
 const d={};
 let r=await auth.fetch(request('/api/exchange/status'),{DB:d});
 assert.equal(r.status,401);
 r=await auth.fetch(request('/api/exchange/connect','POST',{apiKey:'DUMMY_KEY_123456',apiSecret:'DUMMY_SECRET_123456'}),{DB:d});
 assert.equal(r.status,401);
 r=await auth.fetch(request('/api/exchange/verify','POST',{}),{DB:d});
 assert.equal(r.status,401);
 r=await auth.fetch(request('/api/exchange/verify','POST',{},{'Origin':'https://attacker.invalid'}),{DB:d});
 assert.equal(r.status,403);
});
