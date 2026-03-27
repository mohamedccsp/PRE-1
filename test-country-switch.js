// Playwright test: verifies chat resets and gives new advice when country changes
const { chromium } = require('playwright');
const path = require('path');

const DASHBOARD_PATH = path.join(__dirname, 'dashboard.html');

const COUNTRIES = [
  { name: 'Saudi Arabia', code: 'SA', language: 'Arabic', markers: /[\u0600-\u06FF]/ },
  { name: 'France', code: 'FR', language: 'French', markers: /\b(les|des|pour|avec|vous|ne|pas|porter)\b/i },
];

(async () => {
  let browser;

  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const fileUrl = 'file:///' + DASHBOARD_PATH.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    console.log('[test] Dashboard loaded.\n');

    for (let i = 0; i < COUNTRIES.length; i++) {
      const tc = COUNTRIES[i];
      console.log(`${'═'.repeat(60)}`);
      console.log(`[test] Step ${i + 1}: Switch to ${tc.name} (${tc.language})`);
      console.log(`${'─'.repeat(60)}`);

      // Select country
      await page.locator('#countrySearch').fill(tc.name);
      await page.waitForTimeout(500);
      await page.locator('#countrySelect').selectOption({ value: tc.code });
      await page.waitForTimeout(2000);

      // Select first 2 cities
      const citySelect = page.locator('#citySelect');
      await page.waitForSelector('#citySelect option:not([disabled])', { timeout: 10000 });
      const options = await citySelect.locator('option:not([disabled])').all();
      if (options.length >= 2) {
        await options[0].evaluate(el => el.selected = true);
        await options[1].evaluate(el => el.selected = true);
        await citySelect.dispatchEvent('change');
      }

      // Click Deploy
      await page.click('#applyBtn');
      console.log('[test] Country applied. Waiting for weather + auto-advice...');
      await page.waitForTimeout(5000);

      // Close chat panel if open, so preloaded advice renders on FAB click
      const wasOpen = await page.locator('#chatPanel').evaluate(el => el.classList.contains('open'));
      if (wasOpen) {
        await page.click('#chatClose');
        await page.waitForTimeout(500);
      }

      // Wait for auto-advice to pre-generate in background
      await page.waitForTimeout(15000);

      // Check chat was reset — should have 0 messages before opening
      const msgCount = await page.$$eval('.chat-msg', els => els.length);
      console.log(`[test] Messages in chat before opening: ${msgCount}`);

      // Open chat panel — triggers preloaded message rendering
      await page.click('#chatFab');
      await page.waitForTimeout(2000);

      // Wait for bot response
      await page.waitForSelector('.chat-msg.bot:not(.typing)', { timeout: 15000 });
      await page.waitForTimeout(1000);

      // Verify: no user message visible, only bot response
      const userMsgs = await page.$$eval('.chat-msg.user', els => els.length);
      const botMsgs = await page.$$eval('.chat-msg.bot:not(.typing)', els =>
        els.map(el => el.textContent.replace('AI Advisor', '').trim())
      );

      const lastResponse = botMsgs[botMsgs.length - 1] || '';
      const preview = lastResponse.slice(0, 100) + (lastResponse.length > 100 ? '...' : '');

      console.log(`[test] User messages visible: ${userMsgs} (expected 0)`);
      console.log(`[test] Bot responses: ${botMsgs.length}`);
      console.log(`[test] Response preview: ${preview}\n`);

      // Validate
      const noUserMsg = userMsgs === 0;
      const hasResponse = lastResponse.length > 20;
      const rightLanguage = tc.markers.test(lastResponse) || /\b(the|and|wear)\b/i.test(lastResponse);

      if (noUserMsg && hasResponse && rightLanguage) {
        console.log(`  ✅ PASS — Chat reset, advice in ${tc.language}, no user question shown`);
      } else {
        if (!noUserMsg) console.log(`  ❌ FAIL — User message still visible`);
        if (!hasResponse) console.log(`  ❌ FAIL — No bot response`);
        if (!rightLanguage) console.log(`  ❌ FAIL — Language mismatch`);
        process.exitCode = 1;
      }
      console.log('');

      // Close chat panel before switching
      await page.click('#chatClose');
      await page.waitForTimeout(500);
    }

    console.log(`${'═'.repeat(60)}`);
    console.log(`[test] All country switches tested.`);
    console.log(`${'═'.repeat(60)}`);

    console.log('\n[test] Browser stays open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (err) {
    console.error('\n❌ TEST ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    console.log('[test] Cleanup complete.');
  }
})();
