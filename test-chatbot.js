// Playwright test: starts proxy, opens dashboard, sends a chat message, verifies response
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const PROXY_PATH = path.join(__dirname, 'proxy.js');
const DASHBOARD_PATH = path.join(__dirname, 'dashboard.html');
const TIMEOUT = 30000;

(async () => {
  let proxy;
  let browser;

  try {
    // 1. Start proxy server
    console.log('[test] Starting proxy server...');
    proxy = spawn('node', [PROXY_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Proxy failed to start')), 5000);
      proxy.stdout.on('data', data => {
        const msg = data.toString();
        process.stdout.write('[proxy] ' + msg);
        if (msg.includes('Running on')) { clearTimeout(timer); resolve(); }
      });
      proxy.stderr.on('data', data => process.stderr.write('[proxy-err] ' + data.toString()));
      proxy.on('error', err => { clearTimeout(timer); reject(err); });
    });
    console.log('[test] Proxy server started.\n');

    // 2. Launch browser
    console.log('[test] Launching Chromium...');
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // 3. Open dashboard
    const fileUrl = 'file:///' + DASHBOARD_PATH.replace(/\\/g, '/');
    console.log('[test] Opening dashboard:', fileUrl);
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    console.log('[test] Dashboard loaded.\n');

    // 4. Wait for page to settle
    await page.waitForTimeout(3000);

    // 5. Open chat panel
    console.log('[test] Opening chat panel...');
    await page.click('#chatFab');
    await page.waitForSelector('#chatPanel.open', { timeout: 3000 });
    console.log('[test] Chat panel is open.\n');

    // 6. Type a message and send
    const testMessage = 'What should I wear today?';
    console.log(`[test] Sending message: "${testMessage}"`);
    await page.fill('#chatInput', testMessage);
    await page.click('#chatSend');
    console.log('[test] Message sent. Waiting for AI response...\n');

    // 7. Wait for bot response (not the typing indicator)
    await page.waitForSelector('.chat-msg.bot:not(.typing)', { timeout: TIMEOUT });
    const botMessages = await page.$$eval('.chat-msg.bot:not(.typing)', els =>
      els.map(el => el.textContent.trim())
    );

    const lastResponse = botMessages[botMessages.length - 1];
    console.log('[test] AI Response received:');
    console.log('─'.repeat(50));
    console.log(lastResponse);
    console.log('─'.repeat(50));

    // 8. Validate
    if (lastResponse && lastResponse.length > 10) {
      console.log('\n✅ TEST PASSED — Chatbot connected to OpenAI via proxy successfully.');
    } else {
      console.log('\n❌ TEST FAILED — Response too short or empty.');
      process.exitCode = 1;
    }

    // Keep browser open for 5 seconds so user can see
    console.log('\n[test] Browser stays open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (proxy) proxy.kill();
    console.log('[test] Cleanup complete.');
  }
})();
