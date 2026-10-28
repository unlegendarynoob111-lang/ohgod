const SHEET_NAME = 'Orders';
const SPAM_SHEET_NAME = 'SpamLog';
const HEADERS = ['created_at', 'name', 'phone', 'model', 'city', 'note', 'source', 'ua'];
const MAX_LEN = {name: 80, phone: 20, model: 80, city: 60, note: 500, source: 200, ua: 200};
const RATE_LIMIT_MAX = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const SPAM_KEYWORDS = ['viagra', 'casino', 'loan', 'crypto', 'seo service', 'backlink', 'xxx', 'porn', 'http://spam', 'bitcoin'];

/* ==== NOTIFICATION CONFIG ==== */
// Zalo Official Account API (nen dung)
const ZALO_OA_TOKEN   = PropertiesService.getScriptProperties().getProperty('ZALO_OA_TOKEN')   || '';
const ZALO_OA_USER_ID = PropertiesService.getScriptProperties().getProperty('ZALO_OA_USER_ID') || '';
const ZALO_PHONE      = PropertiesService.getScriptProperties().getProperty('ZALO_PHONE')      || '';

// Telegram fallback (de nhat — chi can bot token + chat id)
const TG_BOT_TOKEN = PropertiesService.getScriptProperties().getProperty('TG_BOT_TOKEN') || '';
const TG_CHAT_ID   = PropertiesService.getScriptProperties().getProperty('TG_CHAT_ID')   || '';

function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, HEADERS.length);
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
    lock.waitLock(10000);
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    const ip = getCallerIp_(e);

    if (isRateLimited_(ip)) {
      logSpam_(ip, 'rate_limit', payload);
      return json_({ ok: false, error: 'Too many requests. Try again later.' });
    }

    const name  = sanitize_(payload.name,  MAX_LEN.name);
    const phone = sanitize_(payload.phone, MAX_LEN.phone);
    const model = sanitize_(payload.model, MAX_LEN.model);
    const city  = sanitize_(payload.city,  MAX_LEN.city);
    const note  = sanitize_(payload.note,  MAX_LEN.note);
    const source= sanitize_(payload.source,MAX_LEN.source);
    const ua    = sanitize_(payload.ua,    MAX_LEN.ua);

    if (!name || name.length < 2) return reject_(ip, 'invalid_name', payload);
    if (!phone || !isValidPhone_(phone)) return reject_(ip, 'invalid_phone', payload);
    if (!city || city.length < 2) return reject_(ip, 'invalid_city', payload);

    const allText = [name, model, city, note].join(' ').toLowerCase();
    for (const kw of SPAM_KEYWORDS) {
      if (allText.includes(kw)) {
        logSpam_(ip, 'spam_keyword: ' + kw, payload);
        return json_({ ok: false, error: 'Invalid content.' });
      }
    }

    if (isDuplicate_(phone)) {
      logSpam_(ip, 'duplicate_phone', payload);
      return json_({ ok: false, error: 'Duplicate submission.' });
    }

    const createdAt = new Date().toISOString();
    const row = [createdAt, name, phone, model, city, note, source, ua];
    getSheet_().appendRow(row);
    markSubmission_(phone);

    /* ==== THONG BAO DON MOI (async, khong block response) ==== */
    try {
      notifyNewOrder_({createdAt, name, phone, model, city, note});
    } catch (notifyErr) {
      console.error('notify error:', notifyErr);
    }

    return json_({ ok: true });
  } catch (error) {
    console.error('doPost error:', error);
    return json_({ ok: false, error: 'Internal error' });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: 'Nex EV order intake (secured + notify)' });
}

/* ==== NOTIFICATION: Zalo OA + Telegram fallback ==== */
function notifyNewOrder_(o) {
  const msg =
    '🔔 ĐƠN HÀNG MỚI - NexEV\n' +
    '─────────────────\n' +
    '👤 Tên: ' + o.name + '\n' +
    '📱 SĐT: ' + o.phone + '\n' +
    '🚗 Xe: ' + (o.model || '-') + '\n' +
    '📍 Tỉnh/TP: ' + (o.city || '-') + '\n' +
    '📝 Ghi chú: ' + (o.note || '-') + '\n' +
    '🕐 ' + new Date(o.createdAt).toLocaleString('vi-VN');

  var sent = false;
  if (ZALO_OA_TOKEN && ZALO_OA_USER_ID) {
    sent = sendZalo_(msg);
  }
  if (!sent && TG_BOT_TOKEN && TG_CHAT_ID) {
    sendTelegram_(msg);
  }
}

function sendZalo_(msg) {
  try {
    // Zalo OA API: gui tin den follower (can user_id cua nguoi nhan)
    if (ZALO_OA_USER_ID) {
      const res = UrlFetchApp.fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
        method: 'post',
        contentType: 'application/json',
        headers: { access_token: ZALO_OA_TOKEN },
        payload: JSON.stringify({
          recipient: { user_id: ZALO_OA_USER_ID },
          message: { text: msg }
        }),
        muteHttpExceptions: true
      });
      return res.getResponseCode() === 200;
    }
    // Zalo ZNS (Template) — gui SMS-like cho so dien thoai
    if (ZALO_PHONE) {
      const res = UrlFetchApp.fetch('https://openapi.zalo.me/v3.0/oa/message/to-phone', {
        method: 'post',
        contentType: 'application/json',
        headers: { access_token: ZALO_OA_TOKEN },
        payload: JSON.stringify({
          recipient: { phone: ZALO_PHONE },
          message: { text: msg }
        }),
        muteHttpExceptions: true
      });
      return res.getResponseCode() === 200;
    }
  } catch (e) {
    console.error('Zalo send error:', e);
  }
  return false;
}

function sendTelegram_(msg) {
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: TG_CHAT_ID, text: msg, parse_mode: 'HTML' }),
      muteHttpExceptions: true
    });
  } catch (e) {
    console.error('Telegram send error:', e);
  }
}

/* ==== HELPERS (khong doi) ==== */
function getCallerIp_(e) {
  try {
    return (e && e.headers && (e.headers['X-Forwarded-For'] || e.headers['CF-Connecting-IP'])) || 'unknown';
  } catch (err) { return 'unknown'; }
}

function sanitize_(v, maxLen) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function isValidPhone_(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 12) return false;
  if (/^0(3|5|7|8|9)/.test(digits)) return true;
  if (/^\+84(3|5|7|8|9)/.test(phone)) return true;
  return digits.length >= 10 && digits.length <= 12;
}

function isRateLimited_(ip) {
  if (ip === 'unknown') return false;
  const cache = CacheService.getScriptCache();
  const key = 'rl_' + ip;
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), Math.ceil(RATE_WINDOW_MS / 1000));
  return count > RATE_LIMIT_MAX;
}

function markSubmission_(phone) {
  try {
    CacheService.getScriptCache().put('sub_' + phone, '1', 600);
  } catch (e) {}
}

function isDuplicate_(phone) {
  try {
    return CacheService.getScriptCache().get('sub_' + phone) === '1';
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
