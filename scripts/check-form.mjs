import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try{
 for(const width of [320,375,768,1440]){
  const page=await browser.newPage({viewport:{width,height:800}});let posts=0;const errors=[];
  page.on('request',r=>{if(r.method()==='POST')posts++;});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL || 'http://localhost:4175/molodaya-nauka-2026/');
  await page.getByText('Приём заявок онлайн скоро откроется',{exact:true}).first().waitFor();
  assert.equal(await page.getByRole('button',{name:'Отправить заявку'}).isDisabled(),true);
  assert.equal(await page.getByLabel('ФИО студента').isDisabled(),true);
  assert.equal(posts,0);assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const locator of ['.application-card','.application-form','[name=name]','[name=email]','[name=supervisorId]','[name=sectionId]','[name=topic]']){
    const b=await page.locator(locator).boundingBox();assert.ok(b.x>=0 && b.x+b.width<=width,`${locator} overflow ${width}`);
  }
  assert.deepEqual(errors,[]);console.log(`PASS form ${width}px: closed registration, no network, no false success, bounds`);
  await page.screenshot({path:`/tmp/application-${width}.png`,fullPage:true});await page.close();
 }

 const page=await browser.newPage();
 let calls=0;
 await page.route('**/mock-applications',async route=>{
   calls++;const data=route.request().postDataJSON();
   await route.fulfill({status:calls===1?503:200,contentType:'application/json',body:JSON.stringify(calls===1?{ok:false}:{ok:true,status:'saved',requestId:data.requestId,receiptId:'test-receipt'})});
 });
 await page.goto(process.env.FORM_FIXTURE_URL || 'http://localhost:4181/molodaya-nauka-2026/scripts/fixtures/application.html');
 const button=page.getByRole('button',{name:'Отправить заявку'});
 await button.click();assert.equal(await page.locator('.application-form [aria-invalid=true]').count(),6);
 assert.equal(await page.getByLabel('ФИО студента').evaluate(e=>e===document.activeElement),true);
 await page.getByLabel('ФИО студента').fill('Тестовый Студент Пример');await page.keyboard.press('Tab');
 assert.equal(await page.getByLabel('Email',{exact:true}).evaluate(e=>e===document.activeElement),true);
 await page.getByLabel('Email',{exact:true}).fill('invalid');await button.click();assert.equal(await page.getByLabel('Email',{exact:true}).getAttribute('aria-invalid'),'true');
 await page.getByLabel('Email',{exact:true}).fill('test@example.test');await page.getByLabel('Научный руководитель',{exact:true}).selectOption('terenina');
 await page.getByLabel('Секция конференции',{exact:true}).selectOption('section-2');await page.getByLabel('Тема вашего исследования').fill('Тестовая тема исследования');
 await button.click();assert.equal(await page.locator('[name=consent]').getAttribute('aria-invalid'),'true');
 await page.locator('[name=consent]').check();await button.focus();await page.keyboard.press('Enter');
 await page.getByText(/Запись не подтверждена/).waitFor();assert.equal(await page.locator('dialog[open]').count(),0);
 await button.click();await page.getByRole('dialog').waitFor();await page.getByRole('heading',{name:'Заявка успешно отправлена!'}).waitFor();
 await page.getByRole('button',{name:'Вернуться на главную'}).press('Enter');await page.locator('dialog').waitFor({state:'hidden'});
 console.log('PASS enabled form on local fixture: validation, keyboard, error without success, confirmed receipt modal');await page.close();
}finally{await browser.close();}
