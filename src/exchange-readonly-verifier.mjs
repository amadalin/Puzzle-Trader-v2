// Puzzle Trader V2 — Stage 4.2: signed, strictly READ-ONLY exchange verification.
// Never forward private account contents, API secrets, signed URLs or signatures.
// Fixed GET endpoints only. No order, leverage, transfer or withdrawal operations.
const encoder=new TextEncoder();
const MAX_REPLY_BYTES=262144;
const PATHS=Object.freeze({
  KUCOIN_FUTURES:'/api/v1/positions?currency=USDT',
  BINANCE_FUTURES:'/fapi/v3/balance'
});
const HOSTS=Object.freeze({
  KUCOIN_FUTURES:'https://api-futures.kucoin.com',
  BINANCE_FUTURES:'https://fapi.binance.com'
});

const fail=(code,status=422)=>({ok:false,code,status,verified:false,mode:'READ_ONLY'});
function base64(u8){return btoa(String.fromCharCode(...u8));}
function hex(u8){return [...u8].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function sign(secret,message,format){
  if(typeof secret!=='string'||!secret)return null;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(message)));
  return format==='hex'?hex(bytes):base64(bytes);
}
function verifyTime(nowMs){
  return Number.isSafeInteger(nowMs)&&nowMs>1700000000000&&nowMs<2100000000000;
}
// Exported for pure deterministic tests. Contains private headers; never send to client.
export async function buildVerificationRequest(exchange,credentials,nowMs=Date.now()){
  if(!verifyTime(nowMs))throw Error('INVALID_SIGNING_TIME');
  if(!credentials||typeof credentials.apiKey!=='string'||typeof credentials.apiSecret!=='string')throw Error('INVALID_CREDENTIALS');
  const timestamp=String(nowMs);
  if(exchange==='KUCOIN_FUTURES'){
    const version=String(credentials.apiKeyVersion??'3');
    if(!['2','3'].includes(version)||typeof credentials.apiPassphrase!=='string')throw Error('INVALID_KUCOIN_KEY_VERSION');
    const path=PATHS.KUCOIN_FUTURES;
    const signature=await sign(credentials.apiSecret,timestamp+'GET'+path,'base64');
    const passphrase=await sign(credentials.apiSecret,credentials.apiPassphrase,'base64');
    return {
      exchange,method:'GET',url:HOSTS.KUCOIN_FUTURES+path,
      headers:{Accept:'application/json','Content-Type':'application/json',
        'KC-API-KEY':credentials.apiKey,'KC-API-SIGN':signature,
        'KC-API-TIMESTAMP':timestamp,'KC-API-PASSPHRASE':passphrase,
        'KC-API-KEY-VERSION':version}
    };
  }
  if(exchange==='BINANCE_FUTURES'){
    const query='timestamp='+timestamp+'&recvWindow=5000';
    const signature=await sign(credentials.apiSecret,query,'hex');
    return {
      exchange,method:'GET',url:HOSTS.BINANCE_FUTURES+PATHS.BINANCE_FUTURES+'?'+query+'&signature='+signature,
      headers:{Accept:'application/json','X-MBX-APIKEY':credentials.apiKey}
    };
  }
  throw Error('UNSUPPORTED_EXCHANGE');
}
function safeFailure(exchange,httpStatus,body){
  const code=exchange==='KUCOIN_FUTURES'?String(body?.code??''):Number(body?.code);
  if(httpStatus===429||code==='429000'||code===-1003||code===-1015)
    return fail('EXCHANGE_RATE_LIMITED',429);
  if(httpStatus===418)return fail('EXCHANGE_IP_TEMPORARILY_BANNED',429);
  if(httpStatus>=500)return fail('EXCHANGE_UNAVAILABLE',503);
  if(exchange==='KUCOIN_FUTURES'){
    if(code==='400007'||code==='400008')return fail('EXCHANGE_PERMISSION_DENIED',403);
    if(code==='400001'||code==='400002'||code==='400003'||code==='400004'||code==='400005'||code==='400006'||code==='400100')
      return fail('EXCHANGE_CREDENTIALS_OR_SIGNATURE_INVALID',401);
    if(code==='400009'||code==='400010'||code==='400011'||code==='400012'||code==='400013')return fail('EXCHANGE_TIME_OR_ACCESS_RESTRICTED',403);
  }else if(exchange==='BINANCE_FUTURES'){
    if(code===-1021)return fail('EXCHANGE_CLOCK_SKEW',422);
    if(code===-1022||code===-2014)return fail('EXCHANGE_CREDENTIALS_OR_SIGNATURE_INVALID',401);
    if(code===-2015)return fail('EXCHANGE_KEY_IP_OR_PERMISSION_RESTRICTED',403);
    if(code===-2013)return fail('EXCHANGE_ACCOUNT_UNAVAILABLE',403);
  }
  if(httpStatus===401)return fail('EXCHANGE_AUTH_FAILED',401);
  if(httpStatus===403)return fail('EXCHANGE_ACCESS_RESTRICTED',403);
  if(httpStatus!==200)return fail('EXCHANGE_REQUEST_REJECTED',422);
  return fail('EXCHANGE_RESPONSE_NOT_VERIFIED',502);
}

// Safe dependency injection for offline tests; production uses global fetch and Date.now.
export async function verifyCredentialsReadOnly(exchange,credentials,{fetchFn=fetch,nowMs=Date.now()}={}){
  let signed;
  try{signed=await buildVerificationRequest(exchange,credentials,nowMs);}
  catch{return fail('INVALID_VERIFICATION_CONFIGURATION',422);}
  // Hard fail if any non-GET operation, host or route is accidentally introduced.
  const url=new URL(signed.url);
  if(signed.method!=='GET'||url.origin!==HOSTS[exchange]||
    url.pathname!==PATHS[exchange].split('?')[0])return fail('UNSAFE_VERIFICATION_ROUTE',500);
  let response;
  try{
    response=await fetchFn(signed.url,{
      method:'GET',headers:signed.headers,redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(10000)
    });
  }catch{return fail('EXCHANGE_NETWORK_OR_IP_UNAVAILABLE',503);}
  let data;
  try{
    const contentLength=Number(response.headers?.get?.('content-length')||0);
    if(contentLength>MAX_REPLY_BYTES)return fail('EXCHANGE_RESPONSE_TOO_LARGE',502);
    const text=await response.text();
    if(text.length>MAX_REPLY_BYTES)return fail('EXCHANGE_RESPONSE_TOO_LARGE',502);
    data=JSON.parse(text);
  }catch{return fail('EXCHANGE_INVALID_RESPONSE',502);}
  const valid=exchange==='KUCOIN_FUTURES'
    ?response.status===200&&data?.code==='200000'&&Array.isArray(data?.data)
    :response.status===200&&Array.isArray(data);
  if(!valid)return safeFailure(exchange,response.status,data);
  return {ok:true,verified:true,code:'VERIFIED_READ_ONLY',status:200,mode:'READ_ONLY',
    exchange,verifiedAt:Math.floor(nowMs/1000)};
}
