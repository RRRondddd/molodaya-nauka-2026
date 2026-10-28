import { sections, faq } from './conference.js';

// Each concept contributes once; repeating a word cannot inflate its weight.
// Prefix matching is applied to whole tokens, not arbitrary substrings.
const concepts = [
  [0, 'маркетинг и продвижение', ['маркетинг', 'marketing', 'продвиж', 'реклам', 'advertising', 'smm', 'таргет', 'продаж', 'потребител']],
  [0, 'брендинг', ['бренд', 'brand', 'брэндинг', 'ребренд']],
  [0, 'PR и репутация', ['pr', 'пиар', 'репутац', 'имидж']],
  [1, 'медиакоммуникации и цифровые медиа', ['медиа', 'media', 'журналист', 'блог', 'соцсет', 'подкаст', 'контент']],
  [1, 'искусственный интеллект', ['ии', 'ai', 'нейросет', 'нейрон', 'chatgpt', 'машинн', 'генератив']],
  [2, 'креативные индустрии', ['креатив', 'creative', 'дизайн', 'design', 'творчеств', 'культур', 'искусств', 'музык', 'анимац', 'мод', 'кино']],
  [2, 'студенческие проекты для бизнеса', ['стартап', 'startup', 'предприниматель']],
];
export function normalize(text) {
  return String(text ?? '').toLowerCase().replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function recommendSection(text) {
  const s = normalize(text);
  const words = s.split(' ');
  const matches = [[], [], []];
  for (const [index, label, stems] of concepts) {
    if (stems.some(stem => words.some(word => stem.length <= 3 ? word === stem : (word.startsWith(stem) && !(stem === 'искусств' && word.startsWith('искусственн')))))) matches[index].push(label);
  }
  // Phrase variants that cannot be identified by a single token.
  if (/искусственн\S* интеллект|artificial intelligence|machine learning/.test(s) && !matches[1].includes('искусственный интеллект')) matches[1].push('искусственный интеллект');
  if (/социальн\S* сет/.test(s) && !matches[1].includes('медиакоммуникации и цифровые медиа')) matches[1].push('медиакоммуникации и цифровые медиа');
  if (/студенческ\S* проект.*бизнес|проект.*для бизнес/.test(s) && !matches[2].includes('студенческие проекты для бизнеса')) matches[2].push('студенческие проекты для бизнеса');
  const ranked = matches.map((reasons, index) => ({index, reasons, score: reasons.length})).filter(x => x.score).sort((a,b) => b.score-a.score);
  if (!ranked.length) return {type:'unknown', candidates:[]};
  // Conservative choice: close scores require a clarification, not a random winner.
  if (ranked.length > 1 && ranked[0].score - ranked[1].score <= 1) return {type:'clarify', candidates:ranked.map(x=>x.index)};
  return {type:'recommendation', sectionIndex:ranked[0].index, reasons:ranked[0].reasons};
}
const clarification = 'Что в центре исследования: маркетинг, брендинг и PR; цифровые медиа и ИИ; или креативные индустрии и проекты для бизнеса? Напишите основной предмет исследования отдельным сообщением.';
export function answer(question) {
  const s = normalize(question);
  // Exact words avoid confusing "целевая аудитория" with a room request.
  if (/(где|какая|какой|номер|адрес|корпус|кабинет|контакт|телефон|почт)/.test(s) && /(аудитори|адрес|корпус|кабинет|контакт|телефон|почт)/.test(s)) return 'Аудитории, точные адреса и контакты пока не подтверждены. Уточните информацию у преподавателя.';
  if (/регистр|запис|заявк|как (принять участие|участвовать|попасть)|стать участник/.test(s)) return faq[1][1];
  if (/требован|оформлен|формат участия|стоимост|оплат|сертификат/.test(s)) return faq[3][1];
  if (/расписан|программ|какие.*секци|список.*секци|руководител.*секци/.test(s)) return sections.map(x=>`${x.date}, 10:00–14:00 — «${x.title}». Руководители: ${x.people}.`).join('\n\n')+'\n\nВремя новосибирское. Расписание предварительное.';
  const result = recommendSection(s);
  if (result.type === 'clarify') return 'Тема затрагивает несколько направлений:\n'+result.candidates.map(i=>`• «${sections[i].title}»`).join('\n')+'\n\n'+clarification;
  if (result.type === 'recommendation') {
    const section=sections[result.sectionIndex];
    return `Предварительно рекомендую секцию «${section.title}».\n\nПочему: в теме распознано направление «${result.reasons.join('», «')}», которое соответствует названию этой секции.\n\n${section.date}, 10:00–14:00. Руководители: ${section.people}. Время новосибирское. Расписание предварительное.\n\nЭто рекомендация по ключевым словам. Окончательный выбор согласуйте с научным руководителем.`;
  }
  if (/когда|дат|срок|где.*конференц/.test(s)) return faq[0][1];
  if (/врем|час/.test(s)) return faq[2][1];
  if (/тем|исслед|секци|направлен|подобра|выбра|выбор|помоги/.test(s)) return 'Пока не могу уверенно подобрать секцию. '+clarification;
  return 'В подтверждённой информации пока нет ответа на этот вопрос. Уточните его у преподавателя. Для подбора секции опишите тему исследования. Также могу рассказать о датах, программе и регистрации.';
}
