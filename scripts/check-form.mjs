import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try{
 for(const width of [320,375,768,1440]){
  const page=await browser.newPage({viewport:{width,height:800}});let posts=0;const errors=[];
  page.on('request',r=>{if(r.method()==='POST')posts++;});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL || 'http://localhost:4175/molodaya-nauka-2026/');
  const button=page.getByRole('button',{name:'Проверить форму без отправки'});
  await button.click();assert.equal(await page.locator('.application-form [aria-invalid=true]').count(),6);
  assert.equal(await page.getByLabel('ФИО студента').evaluate(e=>e===document.activeElement),true);
  await page.getByLabel('ФИО студента').fill('Тестовый Студент Пример');await page.keyboard.press('Tab');
  assert.equal(await page.getByLabel('Email',{exact:true}).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.type('invalid');await button.click();assert.equal(await page.getByLabel('Email',{exact:true}).getAttribute('aria-invalid'),'true');
  await page.getByLabel('Email',{exact:true}).fill('demo@example.test');
  await page.getByLabel('Научный руководитель',{exact:true}).selectOption('demo-01');
  await page.getByLabel('Секция конференции',{exact:true}).selectOption('section-2');
  await page.getByLabel('Предполагаемая тема исследования').fill('Демонстрационное исследование цифровых медиа');
  await button.click();assert.equal(await page.locator('[name=consent]').getAttribute('aria-invalid'),'true');
  await page.locator('[name=consent]').check();await button.focus();await page.keyboard.press('Enter');
  await page.getByText(/Поля заполнены корректно/).waitFor();assert.equal(posts,0);assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const locator of ['.application-card','.application-form','[name=name]','[name=email]','[name=supervisorId]','[name=sectionId]','[name=topic]']){
    const b=await page.locator(locator).boundingBox();assert.ok(b.x>=0 && b.x+b.width<=width,`${locator} overflow ${width}`);
  }
  assert.deepEqual(errors,[]);console.log(`PASS form ${width}px: required fields, email, consent, keyboard, no network, no false success, bounds`);
  await page.screenshot({path:`/tmp/application-${width}.png`,fullPage:true});await page.close();
 }
}finally{await browser.close();}
