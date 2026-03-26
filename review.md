# PR Review: Security & Error Handling

**Scope:** 3 changed files — `.claude/settings.json`, `.claude/settings.local.json`, `dashboard.html`
**Reviewed:** 2026-03-27 | Aspects: Security, Error Handling

---

## Critical Issues (2)

### 1. XSS via LLM Response Injected Through innerHTML
**File:** `dashboard.html:1825, 1848-1852`
**Category:** Security

The raw text from `res.text()` (line 1911) flows through `formatChatText()` into `innerHTML` (line 1825) with zero HTML sanitization. The `formatChatText` function only does cosmetic regex transforms:

```javascript
function formatChatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
```

If the API returns (or is manipulated to return) `<img src=x onerror="alert(1)">`, it executes in the user's browser. The previous code parsed JSON and extracted a specific field (`data.choices[0].message.content`), providing structural validation. The new `res.text()` trusts the entire HTTP body.

**Attack vectors:** Prompt injection via user input causing LLM to emit HTML/JS, compromised API endpoint, MITM on the API.

**Fix:** HTML-escape before applying formatting:
```javascript
function formatChatText(text) {
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
```

### 2. No Validation of `res.text()` Response Content
**File:** `dashboard.html:1911`
**Category:** Error Handling

The `res.ok` check (line 1910) only catches HTTP-level errors. Many API failures return 200 OK with an error body. The code will accept and display:
- HTML error pages (e.g., Cloudflare 503 pages)
- Empty strings
- JSON error objects like `{"error": "rate limited"}`
- Truncated/partial responses

**Fix:** Validate the response text before returning it from `callLLM()`.

---

## Important Issues (5)

### 3. Empty Catch Block in `triggerAutoAdvice` — Explicit Silent Failure
**File:** `dashboard.html:1991-1993`
**Category:** Error Handling

```javascript
} catch {
  // Silently fail — user can ask manually
}
```

Bare catch with no error parameter, no logging, no UI recovery. Swallows every error type: network failures, TypeErrors, CORS issues, API changes. The badge notification (line 1968) is shown *before* the try block, so on failure the user sees a notification dot but finds an empty chat.

**Fix:** Log the error and reset the badge:
```javascript
} catch (err) {
  console.warn('[AutoAdvice] Failed:', err.message);
  chatBadge.style.display = 'none';
  autoAdviceShown = false;
}
```

### 4. Null Dereference Risk in Background Pre-generation (`ctx2`)
**File:** `dashboard.html:1977-1978`
**Category:** Error Handling

Inside `triggerAutoAdvice`, `getWeatherContext()` is called again as `ctx2` on line 1977 without a null check. Between the first call (line 1960, which is null-checked) and the second, weather data could be invalidated. If `ctx2` is null, `buildSystemPrompt(ctx2)` throws a TypeError — swallowed by Finding 3's empty catch.

**Fix:** Reuse the already-validated `ctx` variable instead of calling `getWeatherContext()` again.

### 5. XSS in Weather Card Rendering via City Names
**File:** `dashboard.html:1462-1468, 1486-1494`
**Category:** Security

City names from the geocoding API are interpolated directly into HTML template strings assigned to `innerHTML` (line 1507). The `escapedName` only escapes single quotes for `onclick`, not HTML entities. If the geocoding API returns adversarial data, arbitrary JS execution is possible.

**Fix:** HTML-escape `city.name`, `city.country`, and error messages before interpolation.

### 6. Plaintext HTTP for IP Geolocation (Data Exposure + MITM)
**File:** `dashboard.html:1267`
**Category:** Security

```javascript
const res = await fetch("http://ip-api.com/json/?fields=...");
```

Uses plain HTTP — user geolocation data is visible to network observers. A MITM can modify the response to inject adversarial city names that chain with Finding 5 for XSS.

**Note:** ip-api.com free tier only supports HTTP. Consider documenting this risk or switching to an HTTPS-capable alternative.

### 7. Overly Broad Bash Permission Patterns
**File:** `.claude/settings.local.json:11-14`
**Category:** Security

```json
"Bash(curl:*)",
"Bash(powershell:*)",
"Bash(python:*)",
"Bash(rm:*)"
```

These wildcards grant unrestricted access. `Bash(powershell:*)` allows any system admin command. `Bash(rm:*)` allows recursive deletion of anything. If a prompt injection influences Claude Code, these enable full system compromise without permission prompts.

**Fix:** Scope narrowly, e.g., `Bash(curl:https://text.pollinations.ai/*)`, or remove wildcards entirely.

---

## Medium Issues (2)

### 8. No Fetch Timeout — Chat Can Hang Indefinitely
**File:** `dashboard.html:1900`
**Category:** Error Handling

The `fetch` in `callLLM` has no `AbortController` or timeout. If the API hangs, the typing indicator plays forever, `chatBusy` stays true, and the input is permanently locked. The user must reload the entire page.

**Fix:** Add an `AbortController` with a 15-second timeout.

### 9. `sendUserMessage` Lacks Outer Try-Catch
**File:** `dashboard.html:1914-1924`
**Category:** Error Handling

`sendUserMessage` is called from event listeners that don't handle promise rejections. If `generateResponse` throws before its internal try-catch, `chatBusy` is never reset and the UI freezes permanently.

**Fix:** Wrap the body of `sendUserMessage` in a try-catch that resets UI state on failure.

---

## Suggestions (2)

### 10. XSS in Error Message Rendering
**File:** `dashboard.html:1947`
**Category:** Security

Error messages are passed through the `innerHTML` path via `addChatMsg('bot', ...)`. Currently low risk since `err.message` is mostly safe, but the pattern is structurally dangerous for future changes.

### 11. No Input Length Limit on Chat Messages
**File:** `dashboard.html:1914-1923`
**Category:** Security

User input has no `maxlength` or truncation. Combined with Finding 1, a user can be socially engineered to paste adversarial prompts that cause the LLM to return HTML/JS payloads.

---

## Summary

| Severity | Count | Findings |
|----------|-------|----------|
| Critical | 2 | #1 (XSS via innerHTML), #2 (no response validation) |
| Important | 5 | #3 (silent catch), #4 (null ctx2), #5 (city name XSS), #6 (HTTP geolocation), #7 (broad permissions) |
| Medium | 2 | #8 (no timeout), #9 (missing try-catch) |
| Suggestion | 2 | #10 (error msg XSS pattern), #11 (no input limit) |

## Recommended Action

1. Fix Critical #1 and #2 first — they are directly introduced by this diff
2. Address Important #3 and #4 — easy fixes, high debugging value
3. Consider #5-#7 as broader hardening (pre-existing issues surfaced by review)
4. Re-run review after fixes
