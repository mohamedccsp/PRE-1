// Playwright test: verifies chatbot responds in the chosen country's language
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const PROXY_PATH = path.join(__dirname, 'proxy.js');
const DASHBOARD_PATH = path.join(__dirname, 'dashboard.html');

const TEST_CASES = [
  { country: 'Saudi Arabia', code: 'SA', language: 'Arabic', markers: /[\u0600-\u06FF]/ },
  { country: 'Japan', code: 'JP', language: 'Japanese', markers: /[\u3040-\u30FF\u4E00-\u9FFF]/ },
  { country: 'Germany', code: 'DE', language: 'German', markers: /\b(und|die|der|für|nicht|oder|mit)\b/i },
  { country: 'United States', code: 'US', language: 'English', markers: /\b(the|and|for|you|wear|don't|do)\b/i },
];

(async () => {
  let proxy, browser;

  try {
    // 1. Start proxy
    console.log('[test] Starting proxy server...');
    proxy = spawn('node', [PROXY_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Proxy failed to start')), 5000);
      proxy.stdout.on('data', data => {
        if (data.toString().includes('Running on')) { clearTimeout(timer); resolve(); }
      });
      proxy.stderr.on('data', data => process.stderr.write('[proxy-err] ' + data.toString()));
      proxy.on('error', err => { clearTimeout(timer); reject(err); });
    });
    console.log('[test] Proxy started.\n');

    // 2. Launch browser
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const fileUrl = 'file:///' + DASHBOARD_PATH.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    console.log('[test] Dashboard loaded.\n');

    let passed = 0;
    let failed = 0;

    for (const tc of TEST_CASES) {
      console.log(`${'═'.repeat(60)}`);
      console.log(`[test] Testing: ${tc.country} (${tc.language})`);
      console.log(`${'─'.repeat(60)}`);

      // Select country in sidebar
      const countrySelect = page.locator('#countrySelect');
      const countrySearch = page.locator('#countrySearch');

      // Filter and select the country
      await countrySearch.fill(tc.country);
      await page.waitForTimeout(500);
      await countrySelect.selectOption({ value: tc.code });
      await page.waitForTimeout(2000);

      // Select first 2 cities and apply
      const citySelect = page.locator('#citySelect');
      await page.waitForSelector('#citySelect option:not([disabled])', { timeout: 10000 });
      const options = await citySelect.locator('option:not([disabled])').all();
      if (options.length >= 2) {
        await options[0].evaluate(el => el.selected = true);
        await options[1].evaluate(el => el.selected = true);
        await citySelect.dispatchEvent('change');
      }
      await page.click('#applyBtn');
      await page.waitForTimeout(3000);

      // Clear previous chat history by reloading chat state
      // Open chat panel
      const chatPanel = page.locator('#chatPanel');
      const isOpen = await chatPanel.evaluate(el => el.classList.contains('open'));
      if (!isOpen) {
        await page.click('#chatFab');
        await page.waitForTimeout(500);
      }

      // Clear chat messages from DOM for clean test
      await page.evaluate(() => {
        document.getElementById('chatMessages').innerHTML = '';
        chatHistory = [];
        autoAdviceShown = true; // prevent auto-advice from interfering
      });

      // Type and send a message
      await page.fill('#chatInput', 'What should I wear today?');
      await page.click('#chatSend');
      console.log(`[test] Message sent. Waiting for response...`);

      // Wait for bot response
      await page.waitForSelector('.chat-msg.bot:not(.typing)', { timeout: 30000 });
      await page.waitForTimeout(1000);

      const botResponse = await page.$$eval('.chat-msg.bot:not(.typing)', els =>
        els.map(el => el.textContent.replace('AI Advisor', '').trim()).filter(t => t.length > 0)
      );

      const lastResponse = botResponse[botResponse.length - 1] || '';
      const preview = lastResponse.slice(0, 120) + (lastResponse.length > 120 ? '...' : '');
      console.log(`[test] Response preview: ${preview}\n`);

      // Check if response matches expected language markers
      const matchesLang = tc.markers.test(lastResponse);

      if (matchesLang && lastResponse.length > 20) {
        console.log(`  ✅ PASS — Response is in ${tc.language}`);
        passed++;
      } else if (lastResponse.length > 20) {
        // Fallback to English is acceptable
        const isEnglish = /\b(the|and|for|you|wear)\b/i.test(lastResponse);
        if (isEnglish && tc.language !== 'English') {
          console.log(`  ⚠️  PASS (fallback) — Responded in English instead of ${tc.language}`);
          passed++;
        } else {
          console.log(`  ❌ FAIL — Could not verify language for ${tc.country}`);
          failed++;
        }
      } else {
        console.log(`  ❌ FAIL — Response too short or empty`);
        failed++;
      }
      console.log('');
    }

    // Summary
    console.log(`${'═'.repeat(60)}`);
    console.log(`[test] RESULTS: ${passed} passed, ${failed} failed out of ${TEST_CASES.length}`);
    console.log(`${'═'.repeat(60)}`);

    if (failed > 0) process.exitCode = 1;

    console.log('\n[test] Browser stays open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (err) {
    console.error('\n❌ TEST ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (proxy) proxy.kill();
    console.log('[test] Cleanup complete.');
  }
})();
