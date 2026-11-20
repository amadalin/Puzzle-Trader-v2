// Puzzle Trader V2 private credential vault (Cloudflare Workers WebCrypto + D1).
// Stage 4.1: securely SAVE credentials, do not claim they are exchange-verified.
// No network requests, order calls or trading permissions in this module.
const encoder=new TextEncoder();
const KEY_VERSION=1;
const allowedExchanges=new Set(['KUCOIN_FUTURES','BINANCE_FUTURES']);

function keyField(value,min,max){
  return typeof value==='string'&&value.length>=min&&value.length<=max&&
    !/[\x00-\x1f\x7f]/.test(value);
}
function validatedInput(exchange,payload){
  if(!allowedExchanges.has(exchange)||!payload||typeof payload!=='object')return null;
  if(!keyField(payload.apiKey,8,256)||!keyField(payload.apiSecret,8,512))return null;
  const passphrase=payload.apiPassphrase;
  if(exchange==='KUCOIN_FUTURES'&&!keyField(passphrase,4,256))return null;
  if(exchange==='BINANCE_FUTURES'&&passphrase!=null&&passphrase!=='')return null;
  return {apiKey:payload.apiKey,apiSecret:payload.apiSecret,
    ...(exchange==='KUCOIN_FUTURES'?{apiPassphrase:passphrase}:{})};
}
async function vaultKey(env){
  const supplied=env.V2_CREDENTIAL_ENCRYPTION_KEY;
  if(typeof supplied!=='string')return null;
  let bytes;
  try{bytes=Uint8Array.from(atob(supplied),c=>c.charCodeAt(0));}catch{return null;}
  if(bytes.byteLength!==32)return null;
  return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
const associatedData=(uid,exchange)=>encoder.encode('PUZZLE_TRADER_V2|KEY_V1|'+uid+'|'+exchange);

// Encrypt before any D1 write. AES-GCM IV is random for each save/replacement.
export async function storeExchangeCredential(db,env,user,body){
  if(!user||!allowedExchanges.has(user.exchange_id))return {ok:false,status:401,code:'AUTH_REQUIRED'};
  const data=validatedInput(user.exchange_id,body);
  if(!data)return {ok:false,status:400,code:'INVALID_EXCHANGE_CREDENTIALS'};
  const key=await vaultKey(env);
  if(!key)return {ok:false,status:503,code:'CREDENTIAL_VAULT_NOT_CONFIGURED'};
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const material=encoder.encode(JSON.stringify(data));
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({
    name:'AES-GCM',iv,additionalData:associatedData(user.user_id,user.exchange_id),tagLength:128
  },key,material));
  await db.prepare(
    'INSERT INTO exchange_credentials(user_id,exchange_id,encrypted_payload,nonce,key_version,last_verified_at) '+
    'VALUES(?,?,?,?,1,NULL) ON CONFLICT(user_id) DO UPDATE SET '+
    'encrypted_payload=excluded.encrypted_payload, nonce=excluded.nonce, key_version=excluded.key_version, '+
    'last_verified_at=NULL, updated_at=unixepoch()'
  ).bind(user.user_id,user.exchange_id,ciphertext,iv).run();
  return {ok:true,status:200,code:'SAVED_UNVERIFIED',
    exchange:user.exchange_id,verified:false,apiCredentialsSaved:true};
}

// Internal-only future verification helper; never return decrypted secrets to an HTTP client.
export async function readCredentialsForVerification(db,env,user){
  const row=await db.prepare('SELECT exchange_id,encrypted_payload,nonce,key_version FROM exchange_credentials WHERE user_id=?').bind(user.user_id).first();
  if(!row)return null;
  if(row.exchange_id!==user.exchange_id||row.key_version!==KEY_VERSION)throw new Error('VAULT_EXCHANGE_OR_VERSION_MISMATCH');
  const key=await vaultKey(env);
  if(!key)throw new Error('CREDENTIAL_VAULT_NOT_CONFIGURED');
  const iv=new Uint8Array(row.nonce);
  const sealed=new Uint8Array(row.encrypted_payload);
  if(iv.byteLength!==12||sealed.byteLength<=16)throw new Error('VAULT_CIPHERTEXT_INVALID');
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,
    additionalData:associatedData(user.user_id,user.exchange_id),tagLength:128},
    key,sealed);
  return JSON.parse(new TextDecoder().decode(plain));
}
export async function getCredentialStatus(db,user){
  const row=await db.prepare('SELECT exchange_id,last_verified_at FROM exchange_credentials WHERE user_id=?').bind(user.user_id).first();
  const saved=!!row&&row.exchange_id===user.exchange_id;
  return {ok:true,exchange:user.exchange_id,
    apiCredentialsSaved:saved,verified:saved&&row.last_verified_at!=null,
    lastVerifiedAt:saved?row.last_verified_at:null,mode:'READ_ONLY'};
}
