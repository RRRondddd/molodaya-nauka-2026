import test from 'node:test';
import assert from 'node:assert/strict';
import {createGateway} from '../server/gateway.mjs';
test('Gateway filters secrets, confirms receipts, handles rate limits and errors',async()=>{
 let captured,fail=false;const origin='https://example.test';
 const server=createGateway({origin,enabled:true,secret:'server-only',scriptUrl:'https://script.google.com/macros/s/test/exec',fetcher:async(url,options)=>{captured=JSON.parse(options.body);if(fail)throw Error('network');return {ok:true,json:async()=>({ok:true,status:'saved',requestId:captured.requestId,receiptId:'receipt'})};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 const url=`http://127.0.0.1:${server.address().port}/applications`;
 const body={name:'Тестовый Студент',email:'test@example.test',supervisorId:'terenina',sectionId:'section-1',topic:'Тестовая тема',consent:true,consentVersion:'v1',requestId:'test',gatewaySecret:'attacker',spreadsheetId:'attacker'};
 const send=(o=origin)=>fetch(url,{method:'POST',headers:{Origin:o,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await send('https://foreign.test')).status,403);
 assert.equal((await send()).status,200);assert.equal(captured.gatewaySecret,'server-only');assert.equal(captured.spreadsheetId,undefined);
 fail=true;assert.equal((await send()).status,503);
 for(let i=0;i<3;i++)await send();assert.equal((await send()).status,429);
 }finally{await new Promise(r=>server.close(r));}
});
