import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';
const source=fs.readFileSync(new URL('../server/Code.gs',import.meta.url),'utf8');
function setup(){
  const tables={a:[Array(11).fill('header')],b:[Array(11).fill('header')],rate:[['emailHash','timestamp']]};
  const props={COLLECTION_APPROVED:'true',SUPERVISOR_ROUTES:JSON.stringify({a:{spreadsheetId:'a'},b:{spreadsheetId:'b'}}),CONSENT_VERSION:'test-v1',GATEWAY_SECRET:'test-secret',HASH_PEPPER:'test-pepper',RATE_LEDGER_ID:'rate'};
  let locked=false,fail=false;
  const context=vm.createContext({Date,JSON,Object,Number,ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>text})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true;},hasLock:()=>locked,releaseLock:()=>{locked=false;}})},CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{}})},Utilities:{getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(v,k)=>[...crypto.createHmac('sha256',k).update(v).digest()]},SpreadsheetApp:{flush:()=>{},openById:id=>{if(fail)throw Error('write failed');return {getSheetByName:name=>({getDataRange:()=>({getValues:()=>tables[id]}),getLastRow:()=>tables[id].length,appendRow:r=>tables[id].push(r),getRange:(row,col,n,width)=>({setNumberFormat(){return this;},setValues(values){tables[id][row-1]=values[0];return this;},getValues:()=>[tables[id][row-1].slice(col-1,col-1+width)]})})};}}});
  vm.runInContext(source,context);
  const send=d=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(d)}}));
  return {tables,props,send,setFail:()=>{fail=true;}};
}
const make=()=>({name:'Тестовый Студент Пример',email:'test@example.test',topic:'Тестовое исследование',supervisorId:'a',sectionId:'section-1',consent:true,consentVersion:'test-v1',requestId:crypto.randomUUID(),gatewaySecret:'test-secret'});
test('Сервер изолирует маршруты и возвращает подтверждённую запись',()=>{
  const s=setup(),a=make();assert.equal(s.send(a).status,'saved');assert.equal(s.tables.a.length,2);assert.equal(s.tables.b.length,1);assert.equal(s.tables.a[1][13],'Новая');assert.match(s.tables.a[1][12],/Современный маркетинг/);
  assert.equal(s.send({...make(),supervisorId:'b'}).ok,true);assert.equal(s.tables.b.length,2);
});
test('Сервер блокирует чужие ID, отсутствие согласия, секрет и отключённый сбор',()=>{
  const s=setup();for(const patch of [{supervisorId:'foreign'},{supervisorId:'__proto__'},{consent:false},{email:'invalid'},{sectionId:'bad'},{gatewaySecret:''}])assert.equal(s.send({...make(),...patch}).ok,false);
  s.props.COLLECTION_APPROVED='false';assert.equal(s.send(make()).code,'DISABLED');assert.equal(s.tables.a.length,1);
});
test('Повтор, конфликт и fingerprint-дубликат',()=>{
  const s=setup(),d=make(),first=s.send(d);assert.deepEqual(s.send(d),first);
  assert.equal(s.send({...d,topic:'Изменённая тема исследования'}).code,'IDEMPOTENCY_CONFLICT');
  assert.equal(s.send({...d,requestId:crypto.randomUUID()}).code,'DUPLICATE');assert.equal(s.tables.a.length,2);
});
test('Постоянный лимит и ошибка хранилища',()=>{
  const s=setup();for(let i=0;i<5;i++)assert.equal(s.send({...make(),topic:'Тестовая тема номер '+i}).ok,true);
  assert.equal(s.send({...make(),topic:'Другая тестовая тема'}).code,'RATE_LIMIT');
  const bad=setup();bad.setFail();assert.equal(bad.send(make()).ok,false);
});
test('Пользовательский текст не становится формулой',()=>{
  const s=setup();s.send({...make(),topic:'=IMPORTXML("test")'});assert.ok(s.tables.a[1][9].startsWith("'="));
});
