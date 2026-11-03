/**
 * bridge.gs · v170.99 · ۲ آبان ۱۴۰۵ · پیوند بات فعلی با پل (INBOX E29، E31)
 *
 * ۱) رونوشت آپدیت چت‌های آزمایشی (E29): بعد از پاسخ عادی بات، اگر chat در فهرست BRIDGE_TEST_CHATS (تب پنهان تنظیمات؛
 *    خالی = فقط مالک) بود، بدنهٔ خام همان آپدیت به BRIDGE_TG_URL پل می‌رود، با سربرگ X-Telegram-Bot-Api-Secret-Token
 *    و راز BRIDGE_TG_SECRET (Script Property، از صندوق راز secrets.gs). شکست هرگز پاسخ بات را نمی‌گیرد: try/catch و یک خط لاگ.
 *    v170.103 (E36): نشانی پیش‌فرض BR_TG_URL_DEF و راز ساخته‌شده از توکن بات (brSecret_)، پس بی دست انسان روشن است؛
 *    BRIDGE_TEST_MUTE پاسخ بات قدیمی را برای چت‌های آزمایشی خاموش می‌کند.
 * ۲) گیرندهٔ پشتیبان رمزشدهٔ پل (E31): POST به همان /exec با بدنهٔ JSON
 *    {kind: 'bridge_backup', date: '<ISO>', sha256: '<hex>', name: '<اختیاری>', data: '<base64>', sig: '<hex>'}
 *    sig = HMAC-SHA256 با راز TG_BRIDGE_HANDOFF_SECRET روی «date + sha256». Apps Script سربرگ درخواست را نمی‌بیند، پس امضا در بدنه است.
 *    اختلاف ساعت بیش از ۱۰ دقیقه، هش نادرست یا امضای نادرست: رد و هیچ نوشتنی. پرونده بی تغییر در پوشهٔ «پشتیبان پل» درایو؛
 *    ۳۰ تای آخر می‌ماند و قدیمی‌ترها به سطل زباله می‌روند (نه حذف دائمی). بات پرونده را باز یا رمزگشایی نمی‌کند. لاگ: فقط تاریخ و اندازه.
 */
var BR_MIRROR_HDR = 'X-Telegram-Bot-Api-Secret-Token';
var BR_BK_FOLDER = 'پشتیبان پل';
var BR_BK_KEEP = 30;
var BR_BK_SKEW_MS = 10 * 60000;

/* chat آپدیت تلگرام (پیام، ویرایش، دکمه، عضویت) */
function brChatOf_(u) {
  u = u || {};
  var m = u.message || u.edited_message || (u.callback_query && u.callback_query.message) || u.my_chat_member || u.chat_member || u.chat_join_request;
  if (m && m.chat) return String(m.chat.id);
  if (u.callback_query && u.callback_query.from) return String(u.callback_query.from.id);
  return '';
}
/* v170.103 (E36): نشانی پیش‌فرض گیرندهٔ پل؛ «off» در BRIDGE_TG_URL خاموش می‌کند، مقدار دیگر جایش می‌نشیند */
var BR_TG_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/communication/webhooks/telegram-webhook';
var BR_SEC_LABEL = 'tajrobeh-bridge-telegram-mirror-v1';
function brTgUrl_() {
  var v = String(cfg_('BRIDGE_TG_URL', '') || '').trim();
  if (/^(off|0|خاموش)$/i.test(v)) return '';
  return v || BR_TG_URL_DEF;
}
/* راز سربرگ بی دست انسان (E36 بند ۳): اگر صندوق رازی نداده، HMAC-SHA256 با کلید توکن همین بات روی BR_SEC_LABEL (۶۴ رقم هگز).
   پل توکن همین بات را دارد (پاسخ آزمایشی را با آن می‌فرستد)، پس همین مقدار را خودش می‌سازد؛ با عوض شدن توکن هر دو سو با هم عوض می‌شوند */
function brSecret_() {
  var s = typeof secProp_ === 'function' ? secProp_('BRIDGE_TG_SECRET') : '';
  if (s) return s;
  var tok = TG_DRY ? String(TG_MEM['br:token'] || '') : String(PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN') || '');
  return tok ? brHex_(Utilities.computeHmacSha256Signature(BR_SEC_LABEL, tok)) : '';
}
/* E36 بند ۴: «بله» در BRIDGE_TEST_MUTE یعنی بات قدیمی به چت‌های آزمایشی جواب نمی‌دهد و فقط رونوشت به پل می‌رود (پیش‌فرض خاموش) */
function brMuted_(u) {
  if (!/^(1|بله|yes|on)$/i.test(String(cfg_('BRIDGE_TEST_MUTE', '') || '').trim()) || !brTgUrl_()) return false;
  var chat = brChatOf_(u);
  return !!chat && brTestChats_().indexOf(chat) > -1;
}
function brTestChats_() {
  var v = String(cfg_('BRIDGE_TEST_CHATS', '') || '').trim();
  return (v ? v.split(/[,،;\s]+/) : [String(TG_OWNER_CHAT)]).filter(String);
}
/** از doPost بعد از tgHandle؛ خروجی: true اگر رونوشت رفت */
function brMirror_(raw, u) {
  try {
    var chat = brChatOf_(u);
    if (!chat || brTestChats_().indexOf(chat) < 0) return false;
    var url = brTgUrl_(), sec = brSecret_();
    if (!url || !sec) return false;
    var h = {}; h[BR_MIRROR_HDR] = sec;
    if (TG_DRY) { (TG_MEM['br:mirror'] = TG_MEM['br:mirror'] || []).push({ url: url, raw: raw, h: h }); return true; }
    var r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: raw, headers: h, muteHttpExceptions: true, followRedirects: false });
    if (r.getResponseCode() >= 300) Logger.log('brMirror_: پل HTTP ' + r.getResponseCode());
    return r.getResponseCode() < 300;
  } catch (e) { try { Logger.log('brMirror_: ' + String(e.message || e).slice(0, 120)); } catch (e2) {} return false; }
}

/* ───── پشتیبان (E31) ───── */
function brHex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function brBkJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
/** بررسی و ذخیره؛ خروجی {ok, error?, size?} */
function brBackupIn_(body) {
  var sec = typeof secProp_ === 'function' ? secProp_('TG_BRIDGE_HANDOFF_SECRET') : '';
  if (!sec) return { ok: false, error: 'no_secret' };
  var date = String(body.date || ''), sha = String(body.sha256 || '').toLowerCase(), sig = String(body.sig || '').toLowerCase();
  var t = new Date(date).getTime(), now = TG_DRY && TG_MEM['br:now'] ? Number(TG_MEM['br:now']) : Date.now();
  if (!t || Math.abs(now - t) > BR_BK_SKEW_MS) return { ok: false, error: 'date' };
  var want = brHex_(Utilities.computeHmacSha256Signature(date + sha, sec));
  if (!tgSafeEq_(sig, want)) return { ok: false, error: 'sig' };
  var bytes; try { bytes = Utilities.base64Decode(String(body.data || '')); } catch (eB) { return { ok: false, error: 'data' }; }
  if (!bytes.length || brHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)) !== sha) return { ok: false, error: 'sha' };
  var name = 'bridge-backup-' + date.replace(/[^0-9TZ]/g, '').slice(0, 15) + '-' + sha.slice(0, 8) + (String(body.name || '').match(/\.[a-z0-9]{1,8}$/i) || ['.bin'])[0];
  if (TG_DRY) { (TG_MEM['br:files'] = TG_MEM['br:files'] || []).push({ name: name, size: bytes.length }); brBkTrim_(); }
  else {
    var f = brBkFolder_(), blob = Utilities.newBlob(bytes, 'application/octet-stream', name);
    f.createFile(blob);
    brBkTrim_(f);
  }
  Logger.log('پشتیبان پل: ' + date + ' · ' + bytes.length + ' بایت');
  return { ok: true, size: bytes.length };
}
function brBkFolder_() {
  var P = PropertiesService.getScriptProperties(), id = P.getProperty('BR_BK_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var it = DriveApp.getFoldersByName(BR_BK_FOLDER), f = it.hasNext() ? it.next() : DriveApp.createFolder(BR_BK_FOLDER);
  P.setProperty('BR_BK_FOLDER', f.getId());
  return f;
}
/* فقط ۳۰ تای آخر؛ قدیمی‌ترها به سطل زباله */
function brBkTrim_(f) {
  if (TG_DRY) { var a = TG_MEM['br:files']; while (a.length > BR_BK_KEEP) { (TG_MEM['br:trash'] = TG_MEM['br:trash'] || []).push(a.shift().name); } return; }
  var it = f.getFiles(), files = [];
  while (it.hasNext()) files.push(it.next());
  files.sort(function (x, y) { return y.getDateCreated().getTime() - x.getDateCreated().getTime(); });
  files.slice(BR_BK_KEEP).forEach(function (x) { x.setTrashed(true); });
}

/* ───── رلهٔ پایدار (E19): صف رله در واچ‌داگ؛ یک هشدار برای هر رویداد و یک خط «برگشت» ───── */
/* state: {at, rec0, sent} یا null · h: {pending, oldest_age_s, recovered_24h, failed_24h} · خروجی {state, msg} */
function rlIncident_(state, h, now) {
  h = h || {};
  var pend = Number(h.pending || 0), age = Number(h.oldest_age_s || 0);
  if (!state && pend > 0 && age > 300) {
    return { state: { at: now, rec0: Number(h.recovered_24h || 0), fail0: Number(h.failed_24h || 0) },
      msg: '⚠️ <b>رله: ' + tgFa_(pend) + ' پیام تلگرام در صف</b>\nقدیمی‌ترین ' + tgFa_(Math.round(age / 60)) + ' دقیقه است. بات پاسخ نمی‌دهد؛ رله پیام‌ها را نگه می‌دارد و تا ۲۴ ساعت دوباره می‌فرستد. گم نمی‌شوند.' };
  }
  if (state && pend === 0) {
    var rec = Math.max(0, Number(h.recovered_24h || 0) - Number(state.rec0 || 0)), fail = Math.max(0, Number(h.failed_24h || 0) - Number(state.fail0 || 0));
    return { state: null, msg: '✅ رله برگشت: ' + tgFa_(rec) + ' پیام نگه‌داشته‌شده به بات رسید' + (fail ? '؛ ' + tgFa_(fail) + ' پیام بعد از ۲۴ ساعت نرسید' : '') + '.' };
  }
  return { state: state, msg: '' };
}
function tgRelayHealth_(hookUrl) {
  if (TG_DRY || !hookUrl) return null;
  var base = (String(hookUrl).match(/^https?:\/\/[^/?#]+/) || [''])[0]; if (!base) return null;
  var r = UrlFetchApp.fetch(base + '/health', { method: 'get', muteHttpExceptions: true, headers: { 'x-telegram-bot-api-secret-token': tgHookSecret_() } });
  if (r.getResponseCode() !== 200) return null;   /* رلهٔ قدیمی /health ندارد */
  var h = null; try { h = JSON.parse(r.getContentText()); } catch (e) { return null; }
  var P = PropertiesService.getScriptProperties(), st = null; try { st = JSON.parse(P.getProperty('TG_RELAY_INC') || 'null'); } catch (e2) {}
  var o = rlIncident_(st, h, Date.now());
  if (o.state) P.setProperty('TG_RELAY_INC', JSON.stringify(o.state)); else P.deleteProperty('TG_RELAY_INC');
  if (o.msg) tgSend_(TG_OWNER_CHAT, o.msg);
  P.setProperty('TG_RELAY_Q', JSON.stringify({ p: Number(h.pending || 0), o: Number(h.oldest_age_s || 0), at: Date.now() }));
  return h;
}

/* ─────────────────────────── آزمون ─────────────────────────── */
try { TG_SUITES.push(['پیوند با پل: رونوشت و پشتیبان v170.99', 'brTests']); } catch (eSu) {}

function brTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, own: TG_OWNER_CHAT, cfg: TG_CFG_ };
  TG_DRY = true; TG_OWNER_CHAT = '9001'; TG_MEM = { 'pnlp:BRIDGE_TG_SECRET': 'test-only-bridge-secret-0123456789', 'pnlp:TG_BRIDGE_HANDOFF_SECRET': 'test-only-handoff-secret' };
  try {
    TG_CFG_ = { BRIDGE_TG_URL: 'https://bridge.example.test/tg' };
    var u1 = { update_id: 1, message: { chat: { id: 9001 }, text: 'سلام' } }, u2 = { update_id: 2, message: { chat: { id: 7777 }, text: 'x' } };
    ok('رونوشت فقط برای چت آزمایشی (پیش‌فرض مالک)، بدنهٔ خام و سربرگ راز (روی کد قبلی مردود)', brMirror_(JSON.stringify(u1), u1) === true && brMirror_(JSON.stringify(u2), u2) === false &&
      TG_MEM['br:mirror'].length === 1 && TG_MEM['br:mirror'][0].raw === JSON.stringify(u1) && TG_MEM['br:mirror'][0].h[BR_MIRROR_HDR] === 'test-only-bridge-secret-0123456789');
    TG_CFG_ = { BRIDGE_TG_URL: 'https://bridge.example.test/tg', BRIDGE_TEST_CHATS: '7777, 8888' };
    ok('فهرست چت‌های آزمایشی از تنظیمات؛ دکمه هم', brMirror_('{}', { update_id: 3, callback_query: { from: { id: 8888 }, message: { chat: { id: 8888 } } } }) === true && brMirror_('{}', u1) === false);
    TG_CFG_ = {};
    ok('بی نشانی، رونوشتی نیست و خطایی نمی‌دهد', brMirror_('{}', u2) === false);
    /* E36 */
    TG_MEM['br:mirror'] = [];
    ok('نشانی پیش‌فرض پل بی تنظیم (روی کد قبلی مردود)', brMirror_('{}', u1) === true && TG_MEM['br:mirror'][0].url === BR_TG_URL_DEF && /telegram-webhook$/.test(BR_TG_URL_DEF));
    TG_CFG_ = { BRIDGE_TG_URL: 'off' };
    ok('«off» رونوشت را خاموش می‌کند', brMirror_('{}', u1) === false && brTgUrl_() === '');
    TG_CFG_ = {}; delete TG_MEM['pnlp:BRIDGE_TG_SECRET']; TG_MEM['br:token'] = 'test-only-bot-token';
    var want = brHex_(Utilities.computeHmacSha256Signature('tajrobeh-bridge-telegram-mirror-v1', 'test-only-bot-token'));
    TG_MEM['br:mirror'] = [];
    ok('بی صندوق، راز سربرگ از توکن بات ساخته می‌شود و هر بار همان است (روی کد قبلی مردود)', brMirror_('{}', u1) === true && TG_MEM['br:mirror'][0].h[BR_MIRROR_HDR] === want && want.length === 64 && brSecret_() === want);
    TG_MEM['br:token'] = '';
    ok('بی توکن و بی صندوق، رونوشتی نیست', brMirror_('{}', u1) === false);
    TG_MEM['br:token'] = 'test-only-bot-token';
    ok('بی کلید خاموشی، بات قدیمی به چت آزمایشی هم جواب می‌دهد', brMuted_(u1) === false);
    TG_CFG_ = { BRIDGE_TEST_MUTE: 'بله' };
    ok('با «بله»، فقط چت آزمایشی بی پاسخ بات قدیمی است', brMuted_(u1) === true && brMuted_(u2) === false);
    TG_CFG_ = { BRIDGE_TEST_MUTE: 'بله', BRIDGE_TG_URL: 'off' };
    ok('رونوشت خاموش باشد، خاموشی پاسخ هم اثر ندارد', brMuted_(u1) === false);
    TG_CFG_ = {};
    ok('doPost پاسخ بات را فقط با brMuted_ کنار می‌گذارد', /brMuted_\(body\)[\s\S]{0,80}tgHandle\(body\)/.test(String(doPost)));
    ok('doPost بعد از پاسخ بات رونوشت می‌فرستد و مسیر پشتیبان دارد', /tgHandle\(body\);[\s\S]{0,200}brMirror_\(raw, body\)/.test(String(doPost)) && /bridge_backup/.test(String(doPost)));

    /* پشتیبان */
    var bytes = Utilities.newBlob('پروندهٔ رمزشدهٔ آزمون').getBytes(), b64 = Utilities.base64Encode(bytes);
    var sha = brHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)), now = Date.UTC(2026, 9, 24, 3, 0, 0), date = new Date(now).toISOString();
    TG_MEM['br:now'] = String(now);
    var sig = brHex_(Utilities.computeHmacSha256Signature(date + sha, 'test-only-handoff-secret'));
    var r = brBackupIn_({ kind: 'bridge_backup', date: date, sha256: sha, data: b64, sig: sig, name: 'x.enc' });
    ok('پشتیبان درست ذخیره می‌شود؛ نام تاریخ‌دار (روی کد قبلی مردود)', r.ok && r.size === bytes.length && TG_MEM['br:files'].length === 1 && /^bridge-backup-.*\.enc$/.test(TG_MEM['br:files'][0].name), JSON.stringify(r));
    ok('امضای نادرست رد، هیچ نوشتنی', !brBackupIn_({ date: date, sha256: sha, data: b64, sig: sig.replace(/^./, sig[0] === 'a' ? 'b' : 'a') }).ok && TG_MEM['br:files'].length === 1);
    TG_MEM['br:now'] = String(now + 11 * 60000);
    ok('اختلاف ساعت بیش از ۱۰ دقیقه رد', brBackupIn_({ date: date, sha256: sha, data: b64, sig: sig }).error === 'date');
    TG_MEM['br:now'] = String(now);
    ok('هش نادرست رد', brBackupIn_({ date: date, sha256: sha, data: Utilities.base64Encode(Utilities.newBlob('دیگر').getBytes()), sig: sig }).error === 'sha');
    for (var i = 0; i < 31; i++) TG_MEM['br:files'].push({ name: 'f' + i, size: 1 });
    brBkTrim_();
    ok('فقط ۳۰ تای آخر؛ قدیمی‌ترها به سطل زباله', TG_MEM['br:files'].length === 30 && TG_MEM['br:trash'].length === 2 && TG_MEM['br:trash'][0] === TG_MEM['br:trash'][0]);
    var i1 = rlIncident_(null, { pending: 3, oldest_age_s: 200, recovered_24h: 5 }, 1);
    var i2 = rlIncident_(null, { pending: 4, oldest_age_s: 400, recovered_24h: 5 }, 2);
    var i3 = rlIncident_(i2.state, { pending: 9, oldest_age_s: 900, recovered_24h: 5 }, 3);
    var i4 = rlIncident_(i3.state, { pending: 0, oldest_age_s: 0, recovered_24h: 14, failed_24h: 0 }, 4);
    ok('E19: هشدار رله فقط بعد از ۵ دقیقه، یک بار برای هر رویداد، و یک خط برگشت با شمار رسیده‌ها (روی کد قبلی مردود)', !i1.msg && /۴ پیام/.test(i2.msg) && !i3.msg && i3.state && /۹ پیام نگه‌داشته‌شده به بات رسید/.test(i4.msg) && i4.state === null, [i2.msg, i4.msg].join(' | '));
    ok('E19: واچ‌داگ صف رله را می‌خواند و کش تکراری ۶ ساعت است', String(tgWatchdog).indexOf('tgRelayHealth_') > -1 && /c\.put\('u' \+ id, '1', 21600\)/.test(String(tgHandle)));
    TG_MEM['pnlp:TG_BRIDGE_HANDOFF_SECRET'] = '';
    ok('بی راز، هیچ پشتیبانی پذیرفته نمی‌شود', brBackupIn_({ date: date, sha256: sha, data: b64, sig: sig }).error === 'no_secret');
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OWNER_CHAT = keep.own; TG_CFG_ = keep.cfg;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ پیوند با پل درست است'));
  return tgTestTally_(log, fail);
}
