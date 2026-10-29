import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendSection, answer } from '../src/assistant.js';

for (const [topic,index] of [
  ['Влияние рекламы на целевую аудиторию',0],
  ['Исследую продвижение бренда',0],
  ['Пиар и репутация компании',0],
  ['Хочу изучать PR',0],
  ['Нейросети в журналистике',1],
  ['ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ',1],
  ['Роль социальных сетей',1],
  ['AI и machine learning',1],
  ['Дизайн в культурных индустриях',2],
  ['Студенческий проект для бизнеса',2],
  ['Предпринимательство и стартапы',2],
]) test(`Подбор: ${topic}`,()=>{
  const r=recommendSection(topic);
  assert.equal(r.type,'recommendation');assert.equal(r.sectionIndex,index);
  assert.match(answer(topic),/Почему:/);
});
test('Междисциплинарная тема требует уточнения',()=>{
  assert.equal(recommendSection('Использование ИИ в рекламе').type,'clarify');
  assert.match(answer('Нейросети для брендинга'),/Что в центре исследования/);
  assert.equal(recommendSection('Дизайн рекламной кампании').type,'clarify');
});
test('Уточнённая тема позволяет выбрать направление',()=>{
  assert.equal(recommendSection('Основное направление — брендинг').sectionIndex,0);
});
test('Повторение ключевых слов не перевешивает другую тему',()=>{
  assert.equal(recommendSection('ИИ ИИ ИИ реклама').type,'clarify');
});
test('Неизвестные и пустые темы не получают случайную секцию',()=>{
  for(const q of ['', 'Квантовая физика', 'Экология озёр']) assert.equal(recommendSection(q).type,'unknown');
  assert.match(answer('Моя тема — экология'),/Пока не могу уверенно/);
  assert.match(answer('Сколько спутников у Юпитера?'),/нет ответа/);
});
test('Короткие ключи не совпадают внутри посторонних слов',()=>{
  assert.equal(recommendSection('Химии и географии').type,'unknown');
});
test('Справочные вопросы сохраняют подтверждённые ответы',()=>{
  assert.match(answer('Как подать заявку?'),/26 октября — 27 ноября/);
  assert.match(answer('Где моя аудитория?'),/не подтверждены/);
  assert.match(answer('Какие есть секции?'),/Теренина/);
  assert.match(answer('Как оформить работу? Требования?'),/не подтверждены/);
  assert.match(answer('Когда конференция?'),/7–11 декабря 2026/);
});

for (const topic of [
  'Продвижение бренда в цифровых медиа',
  'Дизайн и журналистика',
  'PR для студенческого стартапа',
  'Реклама с помощью нейросетей и дизайн',
]) test(`Уточнение вместо случайного выбора: ${topic}`,()=>{
  const result = recommendSection(topic);
  assert.equal(result.type, 'clarify');
  assert.ok(result.candidates.length >= 2);
  assert.match(answer(topic), /Что в центре исследования/);
  assert.doesNotMatch(answer(topic), /Предварительно рекомендую/);
});
for (const question of [
  'Сколько стоит билет на поезд?',
  'Как приготовить борщ?',
  'Расскажи про квантовую физику',
  'Что такое фотосинтез?',
]) test(`Неизвестный вопрос: ${question}`,()=>{
  assert.equal(recommendSection(question).type, 'unknown');
  assert.match(answer(question), /нет ответа/);
  assert.doesNotMatch(answer(question), /Предварительно рекомендую/);
});
