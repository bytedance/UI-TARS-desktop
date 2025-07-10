const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  console.log('启动浏览器测试 Stealth 插件...');
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  
  const page = await browser.newPage();
  
  // 测试一些常见的检测点
  console.log('\n测试结果：');
  
  // 1. navigator.webdriver
  const webdriver = await page.evaluate(() => navigator.webdriver);
  console.log(`navigator.webdriver: ${webdriver} (应该为 undefined 或 false)`);
  
  // 2. Chrome 对象
  const hasChrome = await page.evaluate(() => !!window.chrome);
  console.log(`window.chrome 存在: ${hasChrome} (应该为 true)`);
  
  // 3. 权限 API
  const permissions = await page.evaluate(() => {
    return navigator.permissions !== undefined;
  });
  console.log(`navigator.permissions 存在: ${permissions} (应该为 true)`);
  
  // 4. 插件数量
  const pluginsLength = await page.evaluate(() => navigator.plugins.length);
  console.log(`navigator.plugins.length: ${pluginsLength} (应该大于 0)`);
  
  // 5. 语言检测
  const languages = await page.evaluate(() => navigator.languages);
  console.log(`navigator.languages: ${JSON.stringify(languages)}`);
  
  // 访问一个检测网站
  console.log('\n访问检测网站...');
  await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle2' });
  
  console.log('请检查页面上的检测结果，按任意键关闭浏览器...');
  
  // 等待用户输入
  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
  
  await browser.close();
})();