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
test('V2 interface has Signup/Login without API-key fields or PAPER balance',async()=>{
  const r=await auth.fetch(request('/signup'),{});
  assert.equal(r.status,200);
  const body=await r.text();
  assert.match(body,/PUZZLE TRADER V2/);
  assert.match(body,/KUCOIN_FUTURES/);
  assert.match(body,/BINANCE_FUTURES/);
  assert.match(body,/Cod de invitație/);
  assert.ok(!body.includes('id="apiKey"'));
  assert.ok(!body.includes('id="apiSecret"'));
  assert.ok(!body.includes('id="apiPassphrase"'));
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
