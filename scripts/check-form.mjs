import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try{
 for(const width of [320,375,768,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];let posts=0;
  page.on('request',r=>{if(r.method()==='POST')posts++;});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL||'http://localhost:4190/molodaya-nauka-2026/');
  const button=page.getByRole('button',{name:'Отправить заявку'});
  await button.click();assert.equal(await page.locator('.application-form [aria-invalid=true]').count(),5);
  assert.ok(await page.getByLabel('ФИО студента').evaluate(e=>e===document.activeElement));
  const fill=async()=>{
   await page.getByLabel('ФИО студента').fill('Тестовый Студент Пример');await page.keyboard.press('Tab');assert.ok(await page.getByLabel('Email',{exact:true}).evaluate(e=>e===document.activeElement));
   await page.getByLabel('Email',{exact:true}).fill('invalid');await button.click();assert.equal(await page.getByLabel('Email',{exact:true}).getAttribute('aria-invalid'),'true');
   await page.getByLabel('Email',{exact:true}).fill('student@example.test');await page.getByLabel('Научный руководитель',{exact:true}).selectOption('terenina');await page.getByLabel('Секция конференции',{exact:true}).selectOption('section-1');await page.getByLabel('Тема вашего исследования').fill('Тестовое исследование цифровых медиа');
  };
  await fill();await button.focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Заявка сохранена!'}).waitFor();
  await page.getByRole('button',{name:'Вернуться на главную'}).press('Enter');await page.locator('dialog').waitFor({state:'hidden'});assert.equal(await page.getByLabel('ФИО студента').inputValue(),'');
  const filter=page.getByLabel('Показать заявки преподавателя');await page.locator('.applications-table').getByText('Тестовый Студент Пример',{exact:true}).waitFor();
  await filter.selectOption('kharlamova');assert.equal(await page.locator('.applications-table tbody tr').count(),0);await filter.selectOption('terenina');
  await page.getByLabel('Статус заявки Тестовый Студент Пример').selectOption('Согласована');
  await page.reload();assert.equal(await page.getByLabel('Статус заявки Тестовый Студент Пример').inputValue(),'Согласована');
  if([375,1440].includes(width)) await page.locator('#applications').screenshot({path:`docs/screenshots/local-applications-${width}.png`});
  await fill();await button.click();await page.getByText(/Такая заявка уже сохранена/).waitFor();assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('.applications-table tbody tr').count(),1);
  await page.getByLabel('Тема вашего исследования').fill('Другое тестовое исследование');await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('quota');};});await button.click();await page.getByText(/Не удалось сохранить изменения/).waitFor();assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal(posts,0);assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const outside=await page.locator('.applications-table, .applications-table select, .application-fields, header, main>section, footer').evaluateAll(els=>els.filter(el=>{const b=el.getBoundingClientRect();return b.width&&(b.left<-.5||b.right>innerWidth+.5);}).map(el=>el.className));assert.deepEqual(outside,[]);
  console.log(`PASS ${width}px: validation, keyboard, save, teacher filter, status, reload, duplicate, storage error, no POST/JS errors/overflow`);await page.close();
 }
}finally{await browser.close();}
