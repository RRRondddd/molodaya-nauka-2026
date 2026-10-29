import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApplication, submitApplication } from '../src/application.js';
const data={name:'Тестовый Студент Пример',email:'student@example.test',supervisorId:'terenina',sectionId:'section-1',topic:'Демонстрационное исследование',consent:true};
const config={demo:false,approved:true,endpoint:'/gateway',consentVersion:'test-v1'};
test('Все обязательные поля проверяются',()=>{
  assert.deepEqual(Object.keys(validateApplication({})),['name','email','supervisorId','sectionId','topic','consent']);
  assert.deepEqual(validateApplication(data),{});
  for(const patch of [{email:'invalid'},{supervisorId:'foreign'},{sectionId:'section-4'},{consent:'true'},{topic:'short'},{name:'a'.repeat(151)}]) assert.ok(Object.keys(validateApplication({...data,...patch})).length);
});
test('Деморежим и неполная конфигурация блокируют сеть',async()=>{
  for(const patch of [{demo:true},{approved:false},{endpoint:''},{consentVersion:''}]){
    let called=false;
    await assert.rejects(submitApplication(data,{...config,...patch},'test',()=>{called=true;}));assert.equal(called,false);
  }
});
test('Только подтверждённая запись с совпадающим ID считается успехом',async()=>{
  for(const body of [{ok:true},{ok:true,status:'saved',requestId:'other',receiptId:'receipt'},{ok:false},{ok:true,status:'saved',requestId:'req'}]) await assert.rejects(submitApplication(data,config,'req',async()=>({ok:true,json:async()=>body})));
  await assert.rejects(submitApplication(data,config,'req',async()=>{throw Error('network');}));
  await assert.rejects(submitApplication(data,config,'req',async()=>({ok:false,json:async()=>({ok:true,status:'saved',requestId:'req',receiptId:'receipt'})})));
  const result=await submitApplication(data,config,'req',async()=>({ok:true,json:async()=>({ok:true,status:'saved',requestId:'req',receiptId:'receipt'})}));assert.equal(result.receiptId,'receipt');
});
