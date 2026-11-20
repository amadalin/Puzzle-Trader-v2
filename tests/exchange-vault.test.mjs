import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {storeExchangeCredential,readCredentialsForVerification,getCredentialStatus} from '../src/exchange-vault.mjs';

function mockD1(){
 const records=new Map(),writes=[];
 return {
  writes,records,
  prepare(sql){return {bind(...args){return {
   async run(){
    if(!sql.startsWith('INSERT INTO exchange_credentials('))throw Error('Unexpected write: '+sql);
    const [userId,exchangeId,cipher,nonce]=args;
    const prior=records.get(userId);
    records.set(userId,{exchange_id:exchangeId,encrypted_payload:Array.from(cipher),nonce:Array.from(nonce),key_version:1,last_verified_at:null});
    writes.push({userId,exchangeId,nonce:Array.from(nonce),cipher:Array.from(cipher),prior});
    return {success:true};
   },
   async first(){
    if(!sql.includes('FROM exchange_credentials WHERE user_id=?'))throw Error('Unexpected read: '+sql);
    return records.get(args[0])||null;
   }
  }}};
  }
 };
}
const env=()=>({V2_CREDENTIAL_ENCRYPTION_KEY:randomBytes(32).toString('base64')});
const fixtures=[
 {exchange:'KUCOIN_FUTURES',credentials:{apiKey:'TEST_KUCOIN_ONLY_KEY',apiSecret:'TEST_KUCOIN_SECRET',apiPassphrase:'TEST_KUCOIN_PASS'}},
 {exchange:'BINANCE_FUTURES',credentials:{apiKey:'TEST_BINANCE_ONLY_KEY',apiSecret:'TEST_BINANCE_SECRET'}}
];

test('AES-GCM encrypts credential payload and round-trips only for its owner/exchange',async()=>{
 const db=mockD1(),key=env();
 for(const [i,c] of fixtures.entries()){
  const user={user_id:'00000000-0000-4000-8000-00000000000'+i,exchange_id:c.exchange};
  const res=await storeExchangeCredential(db,key,user,c.credentials);
  assert.equal(res.ok,true);
  assert.equal(res.code,'SAVED_UNVERIFIED');
  assert.equal(res.verified,false);
  assert.ok(!JSON.stringify(res).includes(c.credentials.apiSecret));
  const write=db.writes.at(-1);
  assert.equal(write.nonce.length,12);
  const dbRaw=JSON.stringify(write.cipher);
  assert.ok(!dbRaw.includes(c.credentials.apiSecret));
  assert.deepEqual(await readCredentialsForVerification(db,key,user),c.credentials);
  assert.deepEqual((await getCredentialStatus(db,user)).apiCredentialsSaved,true);
  assert.equal((await getCredentialStatus(db,user)).verified,false);
 }
});
test('Overwrite rotates nonce and clears verified status',async()=>{
 const db=mockD1(),key=env(),user={user_id:'00000000-0000-4000-8000-111111111111',exchange_id:'KUCOIN_FUTURES'};
 const body=fixtures[0].credentials;
 await storeExchangeCredential(db,key,user,body);
 const one=db.writes.at(-1);
 db.records.get(user.user_id).last_verified_at=1795150000;
 await storeExchangeCredential(db,key,user,{...body,apiSecret:'TEST_REPLACED_SECRET'});
 const two=db.writes.at(-1);
 assert.notDeepEqual(two.nonce,one.nonce);
 assert.notDeepEqual(two.cipher,one.cipher);
 assert.equal((await getCredentialStatus(db,user)).verified,false);
 assert.equal((await readCredentialsForVerification(db,key,user)).apiSecret,'TEST_REPLACED_SECRET');
});
test('Rejects credentials that violate exchange-specific fields or are unauthenticated',async()=>{
 const db=mockD1(),key=env();
 let r=await storeExchangeCredential(db,key,{user_id:'u1',exchange_id:'KUCOIN_FUTURES'},fixtures[1].credentials);
 assert.equal(r.code,'INVALID_EXCHANGE_CREDENTIALS');
 r=await storeExchangeCredential(db,key,{user_id:'u2',exchange_id:'BINANCE_FUTURES'},{...fixtures[1].credentials,apiPassphrase:'SHOULD_NOT_BE_HERE'});
 assert.equal(r.code,'INVALID_EXCHANGE_CREDENTIALS');
 r=await storeExchangeCredential(db,key,null,fixtures[0].credentials);
 assert.equal(r.code,'AUTH_REQUIRED');
 assert.equal(db.writes.length,0);
});
test('Missing encryption key fails closed without database writes',async()=>{
 const db=mockD1();
 const r=await storeExchangeCredential(db,{}, {user_id:'u1',exchange_id:'KUCOIN_FUTURES'},fixtures[0].credentials);
 assert.equal(r.status,503);
 assert.equal(r.code,'CREDENTIAL_VAULT_NOT_CONFIGURED');
 assert.equal(db.writes.length,0);
});
test('AES-GCM associated data rejects ciphertext replayed to a different account',async()=>{
 const db=mockD1(),key=env();
 const user={user_id:'00000000-0000-4000-8000-aaaaaaaaaaaa',exchange_id:'BINANCE_FUTURES'};
 await storeExchangeCredential(db,key,user,fixtures[1].credentials);
 const copied=db.records.get(user.user_id);
 db.records.set('different-account',{...copied});
 await assert.rejects(()=>readCredentialsForVerification(db,key,{user_id:'different-account',exchange_id:'BINANCE_FUTURES'}));
});
