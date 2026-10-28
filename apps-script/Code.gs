const SHEET_NAME = 'Orders';
const SPAM_SHEET_NAME = 'SpamLog';
const HEADERS = ['created_at', 'name', 'phone', 'model', 'city', 'note', 'source', 'ua'];
const MAX_LEN = {name: 80, phone: 20, model: 80, city: 60, note: 500, source: 200, ua: 200};

// Rate limit: max 3 don / 10 phut / IP
const RATE_LIMIT_MAX = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// Tu khoa spam
const SPAM_KEYWORDS = ['viagra', 'casino', 'loan', 'crypto', 'seo service', 'backlink', 'xxx', 'porn', 'http://spam', 'bitcoin'];

function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, HEADERS.length);

  // Tao SpamLog sheet neu chua co
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let spam = ss.getSheetByName(SPAM_SHEET_NAME);
  if (!spam) {
    spam = ss.insertSheet(SPAM_SHEET_NAME);
    spam.getRange(1, 1, 1, 4).setValues([['time', 'ip', 'reason', 'payload']]);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // tranh 2 request ghi cung luc

    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    const ip = getCallerIp_(e);

    // === 1. RATE LIMIT ===
    if (isRateLimited_(ip)) {
      logSpam_(ip, 'rate_limit', payload);
      return json_({ ok: false, error: 'Too many requests. Try again later.' });
    }

    // === 2. FIELD VALIDATION ===
    const name  = sanitize_(payload.name,  MAX_LEN.name);
    const phone = sanitize_(payload.phone, MAX_LEN.phone);
    const model = sanitize_(payload.model, MAX_LEN.model);
    const city  = sanitize_(payload.city,  MAX_LEN.city);
    const note  = sanitize_(payload.note,  MAX_LEN.note);
    const source= sanitize_(payload.source,MAX_LEN.source);
    const ua    = sanitize_(payload.ua,    MAX_LEN.ua);

    // Required fields
    if (!name || name.length < 2) return reject_(ip, 'invalid_name', payload);
    if (!phone || !isValidPhone_(phone)) return reject_(ip, 'invalid_phone', payload);
    if (!city || city.length < 2) return reject_(ip, 'invalid_city', payload);

    // === 3. SPAM KEYWORD CHECK ===
    const allText = [name, model, city, note].join(' ').toLowerCase();
    for (const kw of SPAM_KEYWORDS) {
      if (allText.includes(kw)) {
        logSpam_(ip, 'spam_keyword: ' + kw, payload);
        return json_({ ok: false, error: 'Invalid content.' });
      }
    }

    // === 4. DUPLICATE CHECK (cung phone trong 10 phut) ===
    if (isDuplicate_(phone)) {
      logSpam_(ip, 'duplicate_phone', payload);
      return json_({ ok: false, error: 'Duplicate submission.' });
    }

    // === 5. GHI vao Orders ===
    const row = HEADERS.map((key) => {
      if (key === 'created_at') return new Date().toISOString();
      if (key === 'name') return name;
      if (key === 'phone') return phone;
      if (key === 'model') return model;
      if (key === 'city') return city;
      if (key === 'note') return note;
      if (key === 'source') return source;
      if (key === 'ua') return ua;
      return '';
    });
    getSheet_().appendRow(row);
    markSubmission_(phone);

    return json_({ ok: true });
  } catch (error) {
    console.error('doPost error:', error);
    return json_({ ok: false, error: 'Internal error' });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: 'Nex EV order intake (secured)' });
}

// ===== HELPERS =====

function getCallerIp_(e) {
  try {
    return (e && e.headers && (e.headers['X-Forwarded-For'] || e.headers['CF-Connecting-IP'])) || 'unknown';
  } catch (err) { return 'unknown'; }
}

function sanitize_(v, maxLen) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/<[^>]*>/g, '')   // bo HTML tags
    .replace(/[\u0000-\u001F]/g, '') // bo control chars
    .trim()
    .slice(0, maxLen);
}

function isValidPhone_(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 12) return false;
  // Vietnam mobile: bat dau 03x, 05x, 07x, 08x, 09x
  if (/^0(3|5|7|8|9)/.test(digits)) return true;
  if (/^\+84(3|5|7|8|9)/.test(phone)) return true;
  // quoc te khac: cho pass neu so hop le
  return digits.length >= 10 && digits.length <= 12;
}

function isRateLimited_(ip) {
  if (ip === 'unknown') return false; // khong block neu khong biet IP
  const cache = CacheService.getScriptCache();
  const key = 'rl_' + ip;
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), Math.ceil(RATE_WINDOW_MS / 1000));
  return count > RATE_LIMIT_MAX;
}

function markSubmission_(phone) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put('sub_' + phone, '1', 600); // 10 phut
  } catch (e) {}
}

function isDuplicate_(phone) {
  try {
    const cache = CacheService.getScriptCache();
    return cache.get('sub_' + phone) === '1';
  } catch (e) { return false; }
}

function logSpam_(ip, reason, payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let spam = ss.getSheetByName(SPAM_SHEET_NAME);
    if (!spam) {
      spam = ss.insertSheet(SPAM_SHEET_NAME);
      spam.getRange(1, 1, 1, 4).setValues([['time', 'ip', 'reason', 'payload']]);
    }
    spam.appendRow([new Date().toISOString(), ip, reason, JSON.stringify(payload).slice(0, 500)]);
  } catch (e) {}
}

function reject_(ip, reason, payload) {
  logSpam_(ip, reason, payload);
  return json_({ ok: false, error: 'Invalid input.' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
