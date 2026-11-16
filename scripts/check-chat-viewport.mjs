import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TEST_URL||'http://localhost:4192/molodaya-nauka-2026/';
const output=process.env.SCREENSHOT_DIR||'/workspace/chat-viewport-review';
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
try{
for(const width of [320,375,390,430,768,1440]){
 const page=await browser.newPage({viewport:{width,height:844},isMobile:width<=430,hasTouch:width<=430});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.evaluate(()=>document.fonts.ready);
 assert.deepEqual(await page.locator('.tab-date').allTextContents(),['8 декабря','9 декабря','10 декабря']);
 for(const tab of await page.getByRole('tab').all()){
  await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true');
  assert.ok(await tab.evaluate(e=>e.scrollWidth<=e.clientWidth));
 }
 if([390,1440].includes(width))await page.locator('#program').screenshot({path:`${output}/program-${width}.png`});
 await page.evaluate(()=>scrollTo(0,300));
 const y=await page.evaluate(()=>scrollY);
 await page.locator('.chat-trigger').click();
 const panel=page.locator('#chat-panel'), input=page.getByLabel('Ваш вопрос');
 await panel.waitFor();
 if(width<=768){
  assert.equal(await panel.getAttribute('aria-modal'),'true');
  assert.equal(await page.evaluate(()=>document.body.style.position),'fixed');
  assert.notEqual(await input.evaluate(e=>document.activeElement===e),true);
 }
 const check=async(top,height)=>{
  const box=await panel.boundingBox(), field=await input.boundingBox();
  assert.ok(box.x>=0&&box.x+box.width<=width+.5,`panel width ${width}`);
  assert.ok(box.y>=top-.5&&box.y+box.height<=top+height+.5,`panel height ${width}`);
  assert.ok(field.y>=box.y&&field.y+field.height<=box.y+box.height,`input visible ${width}`);
  assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth));
 };
 await check(0,844);
 if(width===390)await page.screenshot({path:`${output}/chat-390.png`});
 await input.fill('Какие есть секции?');await page.getByRole('button',{name:'Отправить вопрос'}).click();
 assert.ok((await page.locator('.message').count())>=3);
 for(const button of await page.locator('.quick-questions button').all())assert.ok(await button.evaluate(e=>e.scrollWidth<=e.clientWidth));
 if(width<=768){
  // Reproduce iOS: layout viewport stays tall while keyboard shrinks/pans visual viewport.
  await page.evaluate(()=>{
   Object.defineProperty(visualViewport,'height',{configurable:true,value:340});
   Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:70});
   visualViewport.dispatchEvent(new Event('resize'));visualViewport.dispatchEvent(new Event('scroll'));
  });
  await check(70,340);
  await input.fill('Маркетинг');await page.getByRole('button',{name:'Отправить вопрос'}).click();
  await check(70,340);
  assert.ok(await page.locator('.chat-log').evaluate(e=>e.scrollHeight>e.clientHeight));
  if(width===390)await page.screenshot({path:`${output}/chat-390-keyboard-viewport.png`});
  await page.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;visualViewport.dispatchEvent(new Event('resize'))});
 }
 await page.getByRole('button',{name:'Закрыть чат',exact:true}).click();
 await panel.waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>scrollY),y,`scroll restored ${width}`);
 assert.notEqual(await page.evaluate(()=>document.body.style.position),'fixed');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log(`PASS ${width}px: dates, tabs, chat, send, bounds, ${width<=768?'keyboard viewport, scroll restore':'desktop unchanged'}`);
 await page.close();
}
}finally{await browser.close()}
