import { supervisors } from './application-config.js';
export function validateApplication(data) {
  const errors = {};
  if (typeof data.name !== 'string' || data.name.trim().length < 5 || data.name.length > 150) errors.name = 'Укажите ФИО: от 5 до 150 символов.';
  if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 254) errors.email = 'Укажите корректный email.';
  if (!supervisors.some(x => x.id === data.supervisorId)) errors.supervisorId = 'Выберите руководителя из списка.';
  if (!['section-1','section-2','section-3'].includes(data.sectionId)) errors.sectionId = 'Выберите секцию.';
  if (typeof data.topic !== 'string' || data.topic.trim().length < 10 || data.topic.length > 1000) errors.topic = 'Тема должна содержать от 10 до 1000 символов.';
  if (data.consent !== true) errors.consent = 'Подтвердите согласие для проверки формы.';
  return errors;
}
export async function submitApplication(data, config, requestId, fetcher = fetch) {
  if (config.demo || !config.approved || !config.endpoint || !config.consentVersion) throw new Error('Отправка отключена: демонстрационный режим.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetcher(config.endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...data, requestId, consentVersion:config.consentVersion}), signal:controller.signal, credentials:'omit' });
    const receipt = await response.json();
    if (!response.ok || receipt.ok !== true || receipt.status !== 'saved' || receipt.requestId !== requestId || typeof receipt.receiptId !== 'string' || !receipt.receiptId) throw new Error('Запись не подтверждена. Проверьте статус у организаторов перед повторной заявкой.');
    return receipt;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Ответ не получен вовремя. Заявка могла сохраниться. Повторите отправку с этой страницы: номер запроса останется прежним.');
    throw error;
  } finally { clearTimeout(timeout); }
}
