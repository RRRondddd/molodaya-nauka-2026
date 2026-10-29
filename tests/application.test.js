import test from 'node:test';
import assert from 'node:assert/strict';
import {validateApplication,saveApplication,readApplications,updateApplicationStatus,clearApplications,STORAGE_KEY} from '../src/application.js';
const data={name:'Тестовый Студент Пример',email:'student@example.test',supervisorId:'terenina',sectionId:'section-1',topic:'Учебное исследование цифровых медиа'};
function memory(){let value=null;return {getItem:()=>value,setItem:(key,v)=>{value=v;},removeItem:()=>{value=null;}};}
test('Пять обязательных полей, email, ограничения и разрешённые списки',()=>{
 assert.equal(Object.keys(validateApplication({})).length,5);assert.deepEqual(validateApplication(data),{});
 for(const patch of [{email:'invalid'},{supervisorId:'foreign'},{sectionId:'bad'},{topic:'short'},{name:'a'.repeat(151)},{topic:'a'.repeat(1001)},{email:'a'.repeat(250)+'@test.example'}])assert.ok(Object.keys(validateApplication({...data,...patch})).length);
});
test('Сохранение, номер, время, распределение и повторное чтение',()=>{
 const storage=memory(),saved=saveApplication(data,storage);assert.ok(saved.id);assert.ok(Number.isFinite(Date.parse(saved.createdAt)));assert.equal(saved.status,'Новая');
 const rows=readApplications(storage);assert.equal(rows.length,1);assert.equal(rows.filter(x=>x.supervisorId==='terenina').length,1);assert.equal(rows.filter(x=>x.supervisorId==='kharlamova').length,0);
 assert.equal(rows[0].id,saved.id);
});
test('Повторная отправка не дублирует заявку, в том числе с разным регистром',()=>{
 const s=memory();saveApplication(data,s);assert.throws(()=>saveApplication({...data,email:'STUDENT@example.test',topic:data.topic.toUpperCase()},s),/уже сохранена/);assert.equal(readApplications(s).length,1);
});
test('Изменение статуса сохраняется и проверяется',()=>{
 const s=memory(),saved=saveApplication(data,s);updateApplicationStatus(saved.id,'Согласована',s);assert.equal(readApplications(s)[0].status,'Согласована');
 assert.throws(()=>updateApplicationStatus(saved.id,'bad',s));assert.throws(()=>updateApplicationStatus('foreign','Новая',s));clearApplications(s);assert.deepEqual(readApplications(s),[]);
});
test('Ошибка записи не даёт подтверждения и не изменяет существующие данные',()=>{
 const s=memory();saveApplication(data,s);const before=s.getItem(STORAGE_KEY);s.setItem=()=>{throw Error('quota');};assert.throws(()=>saveApplication({...data,topic:'Другое тестовое исследование'},s),/Не удалось сохранить/);assert.equal(s.getItem(STORAGE_KEY),before);
});
test('Повреждённое хранилище не перезаписывается',()=>{
 const s=memory();s.setItem(STORAGE_KEY,'invalid json');assert.throws(()=>saveApplication(data,s),/повреждены/);assert.equal(s.getItem(STORAGE_KEY),'invalid json');
});
