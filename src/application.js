import { supervisors } from './application-config.js';
export const STORAGE_KEY = 'young-science-applications-v1';
export const statuses = ['Новая','На рассмотрении','Согласована','Отклонена'];
export function validateApplication(data) {
  const errors = {};
  if (typeof data.name !== 'string' || data.name.trim().length < 5 || data.name.length > 150) errors.name = 'Укажите ФИО: от 5 до 150 символов.';
  if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 254) errors.email = 'Укажите корректный email.';
  if (!supervisors.some(x => x.id === data.supervisorId)) errors.supervisorId = 'Выберите руководителя из списка.';
  if (!['section-1','section-2','section-3'].includes(data.sectionId)) errors.sectionId = 'Выберите секцию.';
  if (typeof data.topic !== 'string' || data.topic.trim().length < 10 || data.topic.length > 1000) errors.topic = 'Тема должна содержать от 10 до 1000 символов.';
  return errors;
}
export function readApplications(storage = localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if(raw === null) return [];
    const data = JSON.parse(raw);
    if(data.version !== 1 || !Array.isArray(data.applications) || data.applications.some(x=>!x || Object.keys(validateApplication(x)).length || typeof x.id !== 'string' || !x.id || !Number.isFinite(Date.parse(x.createdAt)) || !statuses.includes(x.status))) throw Error();
    return data.applications;
  } catch { throw new Error('Не удалось прочитать локальные заявки. Хранилище недоступно или данные повреждены. Существующие записи не изменены.'); }
}
function writeApplications(rows,storage) {
  try { storage.setItem(STORAGE_KEY,JSON.stringify({version:1,applications:rows})); }
  catch { throw new Error('Не удалось сохранить изменения в этом браузере. Проверьте доступность и свободное место локального хранилища.'); }
}
export function saveApplication(data,storage = localStorage) {
  if(Object.keys(validateApplication(data)).length) throw new Error('Проверьте обязательные поля.');
  const clean = {name:data.name.trim(), email:data.email.trim().toLowerCase(), supervisorId:data.supervisorId, sectionId:data.sectionId, topic:data.topic.trim()};
  const rows = readApplications(storage);
  if(rows.some(x=>x.email.toLowerCase()===clean.email && x.supervisorId===clean.supervisorId && x.sectionId===clean.sectionId && x.topic.toLowerCase()===clean.topic.toLowerCase())) throw new Error('Такая заявка уже сохранена в этом браузере. Посмотрите раздел «Заявки преподавателей».');
  if(rows.length>=1000) throw new Error('Лимит учебного хранилища достигнут. Удалите ненужные тестовые заявки.');
  const record = {...clean,id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'Новая'};
  writeApplications([...rows,record],storage);
  return record;
}
export function updateApplicationStatus(id,status,storage=localStorage) {
  if(!statuses.includes(status))throw new Error('Неизвестный статус.');
  const rows=readApplications(storage);
  if(!rows.some(x=>x.id===id))throw new Error('Заявка не найдена. Обновите список.');
  const next=rows.map(x=>x.id===id?{...x,status}:x);writeApplications(next,storage);return next;
}
export function clearApplications(storage=localStorage){
  try{storage.removeItem(STORAGE_KEY);}catch{throw new Error('Не удалось удалить локальные заявки.');}
}
export function notifyApplicationsChanged(){window.dispatchEvent(new Event('applications-changed'));}
