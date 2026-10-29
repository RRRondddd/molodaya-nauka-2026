import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('docs/screenshots',{recursive:true});
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  headless: true,
});
try {
  for (const width of [320, 375, 768, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 740 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.TEST_URL || 'http://localhost:4175/molodaya-nauka-2026/');
    await page.getByRole('heading', { level: 1 }).waitFor();
    const checkBounds = async () => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow at ${width}`);
      const outside = await page.locator('button, input, a, h1, h2, h3, p, .message, .chat').evaluateAll(elements => elements.filter(el => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1);
      }).map(el => el.textContent.slice(0, 80)));
      assert.deepEqual(outside, [], `Element overflow at ${width}`);
    };
    await checkBounds();
    assert.equal(await page.title(),'Young Science 2026 · НГУЭУ');
    assert.equal(await page.locator('#applications').count(),0);
    assert.equal(await page.locator('header').evaluate(e=>getComputedStyle(e).position),'sticky');
    assert.match(await page.getByRole('heading',{level:1}).evaluate(e=>getComputedStyle(e).fontFamily),/Manrope/);
    const surfaces = await page.locator('header, main > section, footer').evaluateAll(elements=>elements.map(el=>({tag:el.id||el.tagName,left:el.getBoundingClientRect().left,width:el.getBoundingClientRect().width})));
    for(const surface of surfaces){assert.ok(Math.abs(surface.left)<1 && Math.abs(surface.width-width)<1,`Background must span viewport: ${surface.tag} at ${width}`);}
    await page.locator('summary').first().click();assert.equal(await page.locator('details').first().getAttribute('open')!==null,true);
    await page.locator('summary').first().click();
    if(width<=768){
    const menu = page.getByRole('button', { name: 'Меню' });
    await menu.click();
    assert.equal(await page.locator('header nav').isVisible(), true);
    await checkBounds();
    await page.locator('header nav a[href="#program"]').click();
    assert.equal(await page.locator('header nav').isVisible(), false);
    await page.getByRole('button', { name: 'Меню', exact: false }).click();
    await page.locator('header nav a').first().focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('header nav').isVisible(), false);
    }else{assert.equal(await page.locator('header nav').isVisible(),true);}
    if(width<=768)await page.getByRole('button',{name:'Меню',exact:true}).click();
    await page.locator('header nav a[href="#program"]').click();
    await page.waitForFunction(()=>{const y=document.querySelector('#program').getBoundingClientRect().top;const bottom=document.querySelector('header').getBoundingClientRect().bottom;return y>=bottom-1 && y<bottom+50;});
    assert.ok(await page.locator('header').evaluate(e=>Math.abs(e.getBoundingClientRect().top)<1));
    for (let i=0; i<3; i++) { await page.getByRole('tab').nth(i).click(); await checkBounds(); }
    await page.getByRole('tab').first().click();
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`docs/screenshots/after-${width}.png`,fullPage:true});
    await page.getByRole('button', { name: 'Открыть помощника' }).click();
    const ask = async text => {
      await page.getByLabel('Ваш вопрос').fill(text);
      await page.getByRole('button', { name: 'Отправить вопрос' }).click();
      await checkBounds();
    };
    await ask('Исследую продвижение бренда');
    await page.getByRole('log').getByText(/Предварительно рекомендую/).waitFor();
    await ask('ИИ в рекламе');
    await page.getByRole('log').getByText(/Что в центре исследования/).waitFor();
    await ask('Что такое фотосинтез?');
    await page.getByRole('log').getByText(/нет ответа/).waitFor();
    await ask('Н'.repeat(500));
    for (const height of [568, 440]) {
      await page.setViewportSize({width, height});
      await checkBounds();
      const box = await page.locator('.chat').boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= height, 'Chat vertical bounds');
      assert.equal(await page.getByLabel('Ваш вопрос').isVisible(), true);
    }
    assert.equal(await page.getByRole('link', {name: 'Сообщество кафедры'}).getAttribute('href'), 'https://vk.ru/mriso_nsuem');
    await page.keyboard.press('Escape');
    await page.locator('.chat').waitFor({state:'detached'});
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: menu, tabs, chat, bounds, footer, no JS errors`);
    await page.close();
  }
} finally { await browser.close(); }
