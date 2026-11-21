import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {buildVerificationRequest,verifyCredentialsReadOnly} from '../src/exchange-readonly-verifier.mjs';
const now=1795260000000;
const kc={apiKey:'TEST_KUCOIN_KEY_001',apiSecret:'TEST_KUCOIN_SECRET_001',apiPassphrase:'TEST_PASS_ABC',apiKeyVersion:'3'};
const bin={apiKey:'TEST_BINANCE_KEY_001',apiSecret:'TEST_BINANCE_SECRET_001'};
const h64=(key,v)=>createHmac('sha256',key).update(v).digest('base64');
const hh=(key,v)=>createHmac('sha256',key).update(v).digest('hex');
const answer=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
const once=async (exchange,credentials,response)=> {
 const calls=[];
 const result=await verifyCredentialsReadOnly(exchange,credentials,{nowMs:now,
  fetchFn:async (url,options)=>{calls.push({url,options});return response;}});
 assert.equal(calls.length,1);
 assert.equal(calls[0].options.method,'GET');
 assert.equal(calls[0].options.redirect,'error');
 assert.equal(calls[0].options.cache,'no-store');
 return {result,calls};
};

test('KuCoin GET positions signs exact path and v3 passphrase, no order routes',async()=>{
 const signed=await buildVerificationRequest('KUCOIN_FUTURES',kc,now);
 assert.equal(signed.method,'GET');
 assert.equal(signed.url,'https://api-futures.kucoin.com/api/v1/positions?currency=USDT');
 assert.equal(signed.headers['KC-API-KEY-VERSION'],'3');
 assert.equal(signed.headers['KC-API-SIGN'],h64(kc.apiSecret,now+'GET/api/v1/positions?currency=USDT'));
 assert.equal(signed.headers['KC-API-PASSPHRASE'],h64(kc.apiSecret,kc.apiPassphrase));
 assert.ok(!signed.url.includes('/orders'));
 assert.ok(!JSON.stringify(signed).includes(kc.apiSecret));
});
test('KuCoin older v2 API key can be signed explicitly',async()=>{
 const signed=await buildVerificationRequest('KUCOIN_FUTURES',{...kc,apiKeyVersion:'2'},now);
 assert.equal(signed.headers['KC-API-KEY-VERSION'],'2');
});
test('Binance signs GET v3 Futures balance query with lowercase HMAC hex',async()=>{
 const signed=await buildVerificationRequest('BINANCE_FUTURES',bin,now);
 const q='timestamp='+now+'&recvWindow=5000';
 assert.equal(signed.url,'https://fapi.binance.com/fapi/v3/balance?'+q+'&signature='+hh(bin.apiSecret,q));
 assert.equal(signed.headers['X-MBX-APIKEY'],bin.apiKey);
 assert.equal(signed.method,'GET');
});
test('KuCoin success only reports verification, never private positions',async()=>{
 const {result}=await once('KUCOIN_FUTURES',kc,answer({code:'200000',data:[{symbol:'XBTUSDTM',currentQty:12345,marginBalance:999999}]}));
 assert.equal(result.ok,true);
 assert.equal(result.code,'VERIFIED_READ_ONLY');
 assert.equal(result.verifiedAt,Math.floor(now/1000));
 assert.ok(!JSON.stringify(result).includes('XBTUSDTM'));
 assert.ok(!JSON.stringify(result).includes('999999'));
});
test('Binance success only reports verification, never balance',async()=>{
 const {result}=await once('BINANCE_FUTURES',bin,answer([{asset:'USDT',balance:'998888.01'}]));
 assert.equal(result.ok,true);
 assert.ok(!JSON.stringify(result).includes('998888.01'));
});
test('HTTP 200 with invalid content is not considered verified',async()=>{
 for(const exchange of ['KUCOIN_FUTURES','BINANCE_FUTURES']){
  const credentials=exchange==='KUCOIN_FUTURES'?kc:bin;
  const {result}=await once(exchange,credentials,answer({code:'200000',data:{balance:'not-an-array'}}));
  assert.equal(result.ok,false);
  assert.equal(result.verified,false);
 }
});
test('KuCoin errors distinguish wrong permission, signature, and quota',async()=>{
 const a=await once('KUCOIN_FUTURES',kc,answer({code:'400007',msg:'permission'},400));
 assert.equal(a.result.code,'EXCHANGE_PERMISSION_DENIED');
 const b=await once('KUCOIN_FUTURES',kc,answer({code:'400004'},401));
 assert.equal(b.result.code,'EXCHANGE_CREDENTIALS_OR_SIGNATURE_INVALID');
 const c=await once('KUCOIN_FUTURES',kc,answer({code:'429000'},429));
 assert.equal(c.result.code,'EXCHANGE_RATE_LIMITED');
});
test('Binance errors distinguish IP/permission, clock skew, signature, and 429',async()=>{
 for(const [error,status,expect] of [
  [-2015,401,'EXCHANGE_KEY_IP_OR_PERMISSION_RESTRICTED'],
  [-1021,400,'EXCHANGE_CLOCK_SKEW'],
  [-1022,400,'EXCHANGE_CREDENTIALS_OR_SIGNATURE_INVALID'],
  [-1003,429,'EXCHANGE_RATE_LIMITED']
 ]){
  const {result}=await once('BINANCE_FUTURES',bin,answer({code:error,msg:'private error body'},status));
  assert.equal(result.code,expect);
  assert.ok(!JSON.stringify(result).includes('private error body'));
 }
});
test('Network failure and unexpected signing config both fail closed',async()=>{
 const x=await verifyCredentialsReadOnly('BINANCE_FUTURES',bin,{nowMs:now,fetchFn:async()=>{throw Error('sensitive DNS failure')}});
 assert.equal(x.ok,false);
 assert.equal(x.code,'EXCHANGE_NETWORK_OR_IP_UNAVAILABLE');
 assert.ok(!JSON.stringify(x).includes('sensitive DNS'));
 let called=0;
 const y=await verifyCredentialsReadOnly('KUCOIN_FUTURES',{...kc,apiKeyVersion:'1'},{
  nowMs:now,fetchFn:async()=>{called++;return answer({code:'200000',data:[]});}
 });
 assert.equal(y.ok,false);
 assert.equal(called,0);
});
test('Large API response is not accepted or returned',async()=>{
 const big=new Response(JSON.stringify({data:'S'.repeat(265000)}),{status:200});
 const {result}=await once('KUCOIN_FUTURES',kc,big);
 assert.equal(result.code,'EXCHANGE_RESPONSE_TOO_LARGE');
});
