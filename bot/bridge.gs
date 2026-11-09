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
 *
 * از v170.109 این فایل «آداپتور پل» است: هر چیزی که با پل حرف می‌زند همین‌جاست.
 *   نشانی‌ها: BR_HANDOFF_URL (ورود)، BR_LEAD_URL_DEF (لید)، BR_TG_URL_DEF (رونوشت آپدیت)؛ گیرندهٔ پشتیبان (E31) در doPost.
 *   ۳) توکن handoff ورود و دعوت (brToken_، brUrl_؛ E24، E38) برای login.gs و panel.gs.
 *   ۴) لید تازهٔ بات (brLeadPush_، صف ۴۲۹، شمار روزانه؛ E39، E40) برای tgAppendLead_.
 *   رابط کاربری (فرمان، دکمه، دعوت) در login.gs و panel.gs می‌ماند.
 */
var BR_MIRROR_HDR = 'X-Telegram-Bot-Api-Secret-Token';
var BR_BK_FOLDER = 'پشتیبان پل';
var BR_BK_KEEP = 30;
var BR_BK_SKEW_MS = 10 * 60000;
var BR_HANDOFF_URL = 'https://bridge.tajrobeh.life/auth/telegram/handoff#t=';
var BR_TTL_S = 180;
/* v170.110 (E46، تصمیم لین A): راز handoff از توکن بات ساخته می‌شود، نه تصادفی؛ هیچ آدمی راز جابه‌جا نمی‌کند.
   راز = base64url بی پرکننده از HMAC-SHA256(کلید = توکن بات به UTF-8، متن = BR_HANDOFF_LABEL). پل همین را می‌سازد (K222).
   همین راز امضای نشانهٔ ورود، سربرگ X-Tajrobeh-Signature لید و امضای پشتیبان (E31) است. */
var BR_HANDOFF_LABEL = 'tajrobeh-handoff-v1';
var BR_LEAD_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/reception/public-leads';

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
/** یک POST رونوشت؛ خروجی کد HTTP (در آزمون از TG_MEM) */
function brMirrorPost_(url, raw, sec) {
  var h = {}; h[BR_MIRROR_HDR] = sec;
  if (TG_DRY) { (TG_MEM['br:mirror'] = TG_MEM['br:mirror'] || []).push({ url: url, raw: raw, h: h }); return Number(TG_MEM['br:mirrorCode'] || 200); }
  return UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: raw, headers: h, muteHttpExceptions: true, followRedirects: false }).getResponseCode();
}
var BR_MIRROR_Q_MAX_LEN = 3000;
/** از doPost بعد از tgHandle؛ خروجی: true اگر رونوشت رفت. v170.109: شکست موقت (۴۲۹، ۵xx، شبکه) در صف مشترک پل می‌ماند */
function brMirror_(raw, u) {
  var chat = '', url = '', sec = '';
  try {
    chat = brChatOf_(u);
    if (!chat || brTestChats_().indexOf(chat) < 0) return false;
    url = brTgUrl_(); sec = brSecret_();
    if (!url || !sec) return false;
    var c = brMirrorPost_(url, raw, sec);
    if (c < 300) return true;
    try { Logger.log('brMirror_: پل HTTP ' + c); } catch (eL) {}
    if (c === 429 || c >= 500) brOutQueue_({ t: 'tg', b: raw });
    return false;
  } catch (e) { try { Logger.log('brMirror_: ' + String(e.message || e).slice(0, 120)); } catch (e2) {} if (url && sec) brOutQueue_({ t: 'tg', b: raw }); return false; }
}

/* ───── پشتیبان (E31) ───── */
function brHex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function brBkJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
/** بررسی و ذخیره؛ خروجی {ok, error?, size?} */
function brBackupIn_(body) {
  var sec = brHandoffSecret_();
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
try { TG_SUITES.push(['پیوند با پل: رونوشت، صف مشترک و پشتیبان v170.109', 'brTests']); } catch (eSu) {}

/** v170.114 (E55): امضای قرارداد پل: «v1=» و هگز کوچک HMAC-SHA256 با راز handoff */
function brSign_(text, sec) { return 'v1=' + brHex_(Utilities.computeHmacSha256Signature(text, sec)); }
/* ───── ۳) توکن handoff ورود ───── */
function brHandoffSecret_() {
  if (TG_DRY && TG_MEM['pnlp:TG_BRIDGE_HANDOFF_SECRET'] !== undefined) return String(TG_MEM['pnlp:TG_BRIDGE_HANDOFF_SECRET'] || '');   /* فقط آزمون‌های قدیمی */
  var tok = TG_DRY ? String(TG_MEM['br:token'] || '') : String(PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN') || '');
  return tok ? brB64_(Utilities.computeHmacSha256Signature(BR_HANDOFF_LABEL, tok)) : '';
}
function brB64_(x) { return Utilities.base64EncodeWebSafe(x).replace(/=+$/, ''); }
/* شانزده بایت تصادفی (دو UUID تصادفی، بی خط) */
function brJti_() {
  if (TG_DRY && TG_MEM['br:jti']) return TG_MEM['br:jti'];
  var hex = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 32), b = [];
  for (var i = 0; i < 32; i += 2) { var v = parseInt(hex.substr(i, 2), 16); b.push(v > 127 ? v - 256 : v); }
  return brB64_(b);
}
/** توکن handoff؛ '' اگر رمز نیست. */
function brToken_(tid, ph) {
  var sec = brHandoffSecret_();
  if (!sec || !tid) return '';
  try { brLinkCount_(); } catch (eLc) {}
  var iat = Math.floor(pnlNow_() / 1000), p = { tid: Number(tid), iat: iat, exp: iat + BR_TTL_S, jti: brJti_() };
  if (ph) p.ph = ph;
  var payload = brB64_(JSON.stringify(p));
  return payload + '.' + brB64_(Utilities.computeHmacSha256Signature(payload, sec));
}
function brUrl_(tid) { var t = brToken_(tid); return t ? BR_HANDOFF_URL + t : ''; }

/* ───── ۴) لید تازهٔ بات به پل ───── */
function brLeadUrl_() {
  var v = String(cfg_('BRIDGE_LEAD_URL', '') || '').trim();
  if (/^(off|0|خاموش)$/i.test(v)) return '';
  return v || BR_LEAD_URL_DEF;
}
/** E40: شکل دقیق public-leads پل (camelCase). fullName اجباری؛ دست‌کم یکی از mobile یا telegramUsername؛ message حداکثر ۵۰۰؛ homepage همیشه خالی (فیلد دام) */
function brLeadBody_(o, code, chat) {
  var um = String(o.note || '').match(/@([A-Za-z0-9_]{4,32})/);
  var msg = (code ? '[' + code + '] ' : '') + String(o.firstText || '');
  return { fullName: String(o.name || '').trim() || 'بدون نام', mobile: String(o.phone || '').trim(), telegramUsername: um ? um[1] : '',
    message: msg.slice(0, 500), source: 'Bot', homepage: '' };
}
/** یک POST امضاشده؛ خروجی کد HTTP (در آزمون از TG_MEM) */
function brLeadPost_(url, body, sec) {
  var ts = String(Math.floor(lgNow_() / 1000));
  var h = { 'Tajrobeh-Timestamp': ts, 'Tajrobeh-Signature': brSign_('reception-public-lead.v1:' + ts + ':' + body, sec) };   /* v170.114: قرارداد لین D (E55) */
  if (TG_DRY) { (TG_MEM['br:leads'] = TG_MEM['br:leads'] || []).push({ url: url, body: body, h: h }); var q = TG_MEM['br:leadCodes']; return Number(q && q.length ? q.shift() : (TG_MEM['br:leadCode'] || 200)); }
  var r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: body, headers: h, muteHttpExceptions: true, followRedirects: false });
  BR_LAST_TXT = String(r.getContentText() || '').slice(0, 160);
  return r.getResponseCode();
}
var BR_LAST_TXT = '';
/** وضعیت یک‌جا در یک کلید (BRL): شمار امروز و صف ۴۲۹. جای کلیدهای روزانهٔ BRL:<روز> v170.107 */
function brLeadState_(v) {
  if (v !== undefined) { lgProp_('BRL', JSON.stringify(v)); return v; }
  var day = Utilities.formatDate(new Date(lgNow_()), TG_TZ, 'yyyy-MM-dd'), c = {};
  try { c = JSON.parse(lgProp_('BRL') || '{}') || {}; } catch (e) {}
  if (c.day !== day) c = { day: day, ok: 0, fail: 0, ln: 0, q: c.q || [] };
  c.q = c.q || []; return c;
}
var BR_LEAD_Q_MAX = 8;
/** صف مشترک پل (لید ۴۲۹ و رونوشت آپدیت ناموفق): رشته = بدنهٔ لید؛ {t:'tg', b} = آپدیت خام. پر شود، قدیمی‌ترین شکست شمرده می‌شود */
function brOutQueue_(it) {
  try {
    if (it && it.t === 'tg' && String(it.b || '').length > BR_MIRROR_Q_MAX_LEN) return false;
    var st = brLeadState_(); st.q.push(it);
    if (st.q.length > BR_LEAD_Q_MAX) { st.q.shift(); st.fail++; }
    brLeadState_(st); return true;
  } catch (e) { return false; }
}
/** خروجی: 'ok' | 'skip' | 'fail' | 'later' (۴۲۹: در صف، تیک بعدی دوباره). هرگز خطا بالا نمی‌دهد. */
function brLeadPush_(o, row) {
  try {
    var mm = String(o && o.note || '').match(/chat_id: (\d+)/);
    var web = !mm && String(o && o.channel || '') === 'فرم سایت';   /* v170.113 (E42، E53): لید فرم سایت هم به پل */
    if (!mm && !web) return 'skip';   /* واتس‌اپ و بقیه: هنوز نه */
    var url = brLeadUrl_(), sec = brHandoffSecret_();
    if (!url || !sec) return 'skip';
    var code = ''; try { code = row && typeof row === 'number' && typeof tgLeadCode_ === 'function' ? tgLeadCode_(row) : ''; } catch (eC) {}
    var b = brLeadBody_(o, code, mm ? mm[1] : '');
    if (web) { b.source = 'Website'; b.telegramUsername = ''; if (!b.mobile) return 'skip'; }   /* فرم سایت: موبایل اجباری */
    if (!b.mobile && !b.telegramUsername) return 'skip';   /* پل بی موبایل و یوزرنیم ۴۰۰ می‌دهد */
    var body = JSON.stringify(b), okc = brLeadPost_(url, body, sec), st = brLeadState_();
    var res = okc >= 200 && okc < 300 ? 'ok' : okc === 429 ? 'later' : 'fail';
    if (res !== 'ok') { try { Logger.log('brLeadPush_: پل HTTP ' + okc); } catch (eL) {} }
    if (res === 'later') brOutQueue_(body); else { st[res]++; brLeadState_(st); }
    return res;
  } catch (e) { try { Logger.log('brLeadPush_: ' + String(e.message || e).slice(0, 120)); } catch (e2) {} try { var s2 = brLeadState_(); s2.fail++; brLeadState_(s2); } catch (e3) {} return 'fail'; }
}
/** از tgTick5 (هر ۳۰ دقیقه): صف مشترک پل را به ترتیب دوباره می‌فرستد؛ با ۴۲۹ یا ۵xx تازه می‌ایستد. خروجی: شمار لیدهای رسیده */
function brLeadRetryTick_() {
  var st = brLeadState_(); if (!st.q.length) return 0;
  var n = 0;
  while (st.q.length) {
    var it = st.q[0], tg = it && typeof it === 'object' && it.t === 'tg', sch = it && typeof it === 'object' && it.t === 'sch', c;
    var url = tg ? brTgUrl_() : sch ? brSchUrl_() : brLeadUrl_(), sec = tg ? brSecret_() : sch ? brSchSecret_() : brHandoffSecret_();
    if (!url || !sec) { st.q.shift(); continue; }   /* خاموش شد: دور ریخته می‌شود */
    try { c = tg ? brMirrorPost_(url, it.b, sec) : sch ? brSchPost_(url, it.b, sec) : brLeadPost_(url, it, sec); } catch (e) { c = 0; }
    if (sch && (c === 429 || c === 0 || c >= 500)) break;
    if (sch) { st.q.shift(); st.sch = st.sch || { ok: 0, fail: 0 }; if (c >= 200 && c < 300) st.sch.ok++; else st.sch.fail++; continue; }
    if (c === 429 || c === 0 || (tg && c >= 500)) break;
    st.q.shift();
    if (tg) continue;
    if (c >= 200 && c < 300) { st.ok++; n++; } else st.fail++;
  }
  brLeadState_(st);
  return n;
}
/* ───── ۵) خوراک فقط‌خواندنی مچ‌میکینگ درمانگران برای پل (E53 بند ۳) ─────
   GET <exec>?api=br_ther&ts=<ثانیهٔ یونیکس>&sig=v1=<هگز HMAC-SHA256("bot-match-feed.v1:<ts>:api=br_ther", راز handoff)>؛ اختلاف زمان حداکثر ۵ دقیقه.
   فقط فیلدهای درمانگر (همان که مچ بات به کار می‌برد، به‌اضافهٔ کد، شهر، قیمت پایه و چت تلگرام)؛ هیچ دادهٔ مراجع. */
function brTherFeed_(p) {
  var sec = brHandoffSecret_(), ts = Number(p.ts || 0), now = Math.floor((TG_DRY && TG_MEM['br:now'] ? Number(TG_MEM['br:now']) : Date.now()) / 1000);
  var hit = function (ok) { try { var h = {}; try { h = JSON.parse(lgProp_('BRF') || '{}') || {}; } catch (eH) {} h[ok ? 'ok' : 'auth'] = (h[ok ? 'ok' : 'auth'] || 0) + 1; h[ok ? 'at' : 'authAt'] = new Date(now * 1000).toISOString(); lgProp_('BRF', JSON.stringify(h)); } catch (eS) {} };   /* v170.117 (E62.۴) */
  if (!sec || !ts || Math.abs(now - ts) > 300) { hit(false); return { ok: false, error: 'auth' }; }
  /* v170.114 (E56): متن امضا «bot-match-feed.v1:<ts>:api=br_ther»؛ sig با یا بی پیشوند v1= (Apps Script سرآیند GET را نمی‌بیند، پس امضا در پرسمان است) */
  var want = brSign_('bot-match-feed.v1:' + String(p.ts) + ':api=br_ther', sec).slice(3);
  if (!tgSafeEq_(String(p.sig || '').toLowerCase().replace(/^v1=/, ''), want)) { hit(false); return { ok: false, error: 'auth' }; }
  hit(true);
  /* v170.119 (E64): پاسخ از کش (تیک ۳۰ دقیقه‌ای می‌سازد)؛ ساختن زنده با ۱۵۷ درمانگر و هزار قاعده بیش از مهلت ۳۰ ثانیهٔ پل طول می‌کشید */
  var c = brFeedCacheGet_();
  if (c) return c;
  return brFeedBuild_(now, true);
}

/** ساختن خوراک مچ (درمانگر و وقت‌ها)؛ با keep در کش هم می‌نشیند و زمان ساخت در BRF ثبت می‌شود */
function brFeedBuild_(now, keep) {
  var t0 = Date.now();
  var rows = {}; try { (TG_DRY ? (TG_MEM['pnl:thers'] || []) : tgTherapistRows_()).forEach(function (t) { rows[tgNorm_(t.name)] = t; }); } catch (eR) {}
  var pub = tgThPubList_();
  var list = pub.map(function (t) {
    var r = rows[tgNorm_(t.n)] || {};
    return { name: t.d || t.n, code: String(r.code || ''), telegramId: typeof pnlChatOf_ === 'function' ? pnlChatOf_(r) : String(r.chat || ''), active: !!t.a,
      gender: t.g, approach: t.sp, mode: t.md, city: t.ct || String(r.city || ''), years: t.yr, languages: t.lg, ages: t.ag, focus: t.fc, groups: t.gr, pools: t.pl,
      couples: !!t.cp, abroad: !!(t.ab || r.abroad), inPerson: !!t.ip, style: t.st, tier: t.tr, rate: r.rate == null ? '' : r.rate, timezone: String(r.tz || ''),
      /* v170.120 (E66): rate = ستون «نرخ جلسه (تومان)» هاب، برای یک جلسهٔ درمان فردی به طول sessionMinutes؛ قیمت جدای خارج در بات نیست */
      rateToman: brNum_(r.rate), sessionMinutes: brNum_(r.slen),
      v1UserId: brNum_(r.v1) || undefined,   /* v170.122 (E68): ستون v1_user_id هاب؛ اگر نیست، فیلد نمی‌آید */
      about: t.ab2, page: t.pg };
  });
  /* v170.115 (E60): وقت‌های درمانگر از همان داده‌ای که tgFreeSlots_ می‌خواند؛ فقط دادهٔ درمانگر، به وقت تهران */
  var sl = brTherSlots_();
  list.forEach(function (o, i) { var k = tgNorm_(pub[i].n); o.weekly = sl.weekly[k] || []; o.introSlots = sl.intro[k] || []; });
  var out = { ok: true, version: 2, at: new Date(now * 1000).toISOString(), timezone: 'Asia/Tehran', therapists: list };
  try { var h = {}; try { h = JSON.parse(lgProp_('BRF') || '{}') || {}; } catch (eH) {} h.buildMs = Date.now() - t0; h.builtAt = out.at; lgProp_('BRF', JSON.stringify(h)); } catch (eB) {}
  if (keep) brFeedCachePut_(out);
  return out;
}
function brNum_(v) { var d = Number(tgLatinDigits_(String(v == null ? '' : v)).replace(/[^\d.]/g, '')); return d > 0 ? d : null; }
var BR_FEED_CHUNK = 90000;
function brFeedCachePut_(o) {
  try {
    var s = JSON.stringify(o), n = Math.ceil(s.length / BR_FEED_CHUNK), kv = { 'brf:n': String(n) };
    for (var i = 0; i < n; i++) kv['brf:' + i] = s.slice(i * BR_FEED_CHUNK, (i + 1) * BR_FEED_CHUNK);
    if (TG_DRY) { TG_MEM['brf:cache'] = kv; return true; }
    CacheService.getScriptCache().putAll(kv, 21600); return true;
  } catch (e) { return false; }
}
function brFeedCacheGet_() {
  try {
    var c = TG_DRY ? (TG_MEM['brf:cache'] || {}) : null, n;
    if (!TG_DRY) { var sc = CacheService.getScriptCache(); n = Number(sc.get('brf:n') || 0); if (!n) return null; var keys = []; for (var i = 0; i < n; i++) keys.push('brf:' + i); c = sc.getAll(keys); c['brf:n'] = String(n); }
    n = Number(c['brf:n'] || 0); if (!n) return null;
    var s = ''; for (var j = 0; j < n; j++) { if (typeof c['brf:' + j] !== 'string') return null; s += c['brf:' + j]; }
    return JSON.parse(s);
  } catch (e) { return null; }
}
/** از tgTick5 (هر ۳۰ دقیقه): خوراک تازه در کش، و فرستادن همان به پل (راه برعکس، E64، E65: POST legacy/bot-slots/intake، امضای legacy-bot-slots.v1) وقتی عوض شده یا روزی یک بار. پل بعد از ورود منبع حقیقت است */
function brFeedTick_() {
  var now = Math.floor((TG_DRY && TG_MEM['br:now'] ? Number(TG_MEM['br:now']) : Date.now()) / 1000);
  var o = brFeedBuild_(now, true), url = brSlotsUrl_(), sec = brHandoffSecret_();
  if (!url || !sec) return 'cache';
  var body = JSON.stringify(o), h = {}; try { h = JSON.parse(lgProp_('BRF') || '{}') || {}; } catch (e) {}
  var sum = brHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(o.therapists), Utilities.Charset.UTF_8)).slice(0, 16);
  if (h.pushSum === sum && now - Number(h.pushAt || 0) < 86400) return 'same';   /* E65: هر بار که عوض شد، وگرنه روزی یک بار */
  var ts = String(now), hd = { 'Tajrobeh-Timestamp': ts, 'Tajrobeh-Signature': brSign_('legacy-bot-slots.v1:' + ts + ':' + body, sec) }, code = 0;   /* E65: قرارداد لین D */
  try {
    if (TG_DRY) { (TG_MEM['br:slots'] = TG_MEM['br:slots'] || []).push({ url: url, body: body, h: hd }); code = Number(TG_MEM['br:slotsCode'] || 200); }
    else code = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: body, headers: hd, muteHttpExceptions: true, followRedirects: false }).getResponseCode();
  } catch (eP) { code = 0; }
  h.pushCode = code; if (code >= 200 && code < 300) { h.pushSum = sum; h.pushAt = now; }
  lgProp_('BRF', JSON.stringify(h));
  return 'push ' + code;
}
var BR_SLOTS_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/legacy/bot-slots/intake';   /* E65 */
function brSlotsUrl_() { var u = String(cfg_('BRIDGE_SLOTS_URL', '') || '').trim(); if (/^(off|0|خاموش)$/i.test(u)) return ''; if (!u) return BR_SLOTS_URL_DEF; return /^https:\/\/bridge\.tajrobeh\.life\//.test(u) ? u : ''; }
/** یک‌بارهٔ خودکار v170.119 (E64، فقط‌خواندنی): زمان ساخت خوراک، و درخواست‌های پل تا الان */
function brV170119Stat() {
  var h0 = {}; try { h0 = JSON.parse(lgProp_('BRF') || '{}') || {}; } catch (e) {}
  var now = Math.floor((TG_DRY && TG_MEM['br:now'] ? Number(TG_MEM['br:now']) : Date.now()) / 1000);
  var o = brFeedBuild_(now, true), h = {}; try { h = JSON.parse(lgProp_('BRF') || '{}') || {}; } catch (e2) {}
  return 'ساخت خوراک: ' + h.buildMs + ' میلی‌ثانیه · درمانگر ' + ((o && o.therapists) || []).length + ' · در کش: ' + (brFeedCacheGet_() ? 'بله' : 'نه') +
    ' · درخواست پل تا پیش از این: درست ' + (h0.ok ? h0.ok - 1 : 0) + ' (آخرین ' + (h0.at || '-') + ')، امضای رد ' + (h0.auth || 0) + ' (آخرین ' + (h0.authAt || '-') + ')';
}

/** E60: قاعدهٔ هفتگی (weekday 0 یکشنبه تا 6 شنبه، from/to، kind therapy|intro) و ردیف‌های آزاد معارفه، کلید با نام نرمال */
function brTherSlots_() {
  var weekly = {}, intro = {};
  function addM(hhmm, min) { var p = hhmm.split(':'), t = Number(p[0]) * 60 + Number(p[1]) + min; return ('0' + Math.floor(t / 60) % 24).slice(-2) + ':' + ('0' + t % 60).slice(-2); }
  [[TG_KIND_MEET, 'intro'], [TG_KIND_SESS, 'therapy']].forEach(function (kk) {
    var rules = []; try { rules = tgWeeklyRules_('', kk[0]); } catch (eW) {}
    rules.forEach(function (r) {
      var k = tgNorm_(r.name), len = 0; try { len = tgScLen_(r.name, kk[0]); } catch (eL) { len = TG_SLOT_MIN; }
      (weekly[k] = weekly[k] || []).push({ weekday: Number(r.iso) % 7, from: r.hhmm, to: addM(r.hhmm, len || TG_SLOT_MIN), kind: kk[1] });
    });
  });
  var free = []; try { free = tgFreeSlots_(''); } catch (eF) {}
  free.forEach(function (x) { if (x.weekly) return; var k = tgNorm_(x.therapist); (intro[k] = intro[k] || []).push({ date: x.dateIso, from: x.hhmm, to: addM(x.hhmm, TG_SLOT_MIN) }); });
  return { weekly: weekly, intro: intro };
}

/* ───── v170.117 (E62.۳، Q29): ورودی مدرسهٔ پل برای فرم ۱۹ لکان ─────
   501143 هر ثبت فرم را به بات می‌فرستد؛ بات همان بدنه را (بی کلیدهای داخلی فلوئنت) به پل می‌دهد، با سربرگ
   Tajrobeh-Intake-Secret = base64url(HMAC-SHA256(کلید = راز مشترک بات، «tajrobeh-school-intake-v1»)). راز از بات بیرون نمی‌رود.
   تنظیم: BRIDGE_SCH_URL (off خاموش)، BRIDGE_SCH_FORMS (پیش‌فرض 19). شکست یا ۴۲۹ در صف مشترک BRL (t:'sch') می‌ماند. */
var BR_SCH_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/school/course-registrations/intake';
function brSchUrl_() { var u = String(cfg_('BRIDGE_SCH_URL', '') || '').trim(); if (u === 'off') return ''; return /^https:\/\/bridge\.tajrobeh\.life\//.test(u) ? u : BR_SCH_URL_DEF; }
function brSchSecret_() { var s = brHandoffSecret_(); return s ? brB64_(Utilities.computeHmacSha256Signature('tajrobeh-school-intake-v1', s)) : ''; }
function brSchForms_() { return String(cfg_('BRIDGE_SCH_FORMS', '') || '19').split(/[\s,،]+/).filter(Boolean); }
function brSchPost_(url, body, sec) {
  if (TG_DRY) { (TG_MEM['br:sch'] = TG_MEM['br:sch'] || []).push({ url: url, body: body, h: { 'Tajrobeh-Intake-Secret': sec } }); return Number(TG_MEM['br:schCode'] || 200); }
  var r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: body, muteHttpExceptions: true, followRedirects: false, headers: { 'Tajrobeh-Intake-Secret': sec } });
  return r.getResponseCode();
}
/** خروجی: 'ok' | 'skip' | 'later' | 'fail' */
function brSchIntake_(raw) {
  try {
    var fid = String(raw && raw.form_id || '');
    if (!fid || brSchForms_().indexOf(fid) < 0) return 'skip';
    var url = brSchUrl_(), sec = brSchSecret_();
    if (!url || !sec) return 'skip';
    var b = {};
    Object.keys(raw).forEach(function (k) { if (/^_fluentform|^__fluent|^_wp_http_referer$/.test(k)) return; b[k] = raw[k]; });
    if (!b.course) b.course = 'lacan';
    b.source = 'Website';
    var body = JSON.stringify(b), c = 0;
    try { c = brSchPost_(url, body, sec); } catch (eP) { c = 0; }
    var st = brLeadState_(); st.sch = st.sch || { ok: 0, fail: 0 };
    if (c >= 200 && c < 300) { st.sch.ok++; brLeadState_(st); return 'ok'; }
    try { Logger.log('brSchIntake_: پل HTTP ' + c); } catch (eL) {}
    if (c === 429 || c === 0 || c >= 500) { brLeadState_(st); brOutQueue_({ t: 'sch', b: body }); return 'later'; }
    st.sch.fail++; brLeadState_(st); return 'fail';
  } catch (e) { return 'fail'; }
}

/** یک‌بارهٔ خودکار v170.117 (E62.۴، فقط‌خواندنی): خوراک مچ از درون با امضای درست، فقط شمارها؛ و درخواست‌های پل تا الان */
function brV170117Stat() {
  var ts = Math.floor((TG_DRY && TG_MEM['br:now'] ? Number(TG_MEM['br:now']) : Date.now()) / 1000), sec = brHandoffSecret_();
  var f = brTherFeed_({ ts: String(ts), sig: brSign_('bot-match-feed.v1:' + ts + ':api=br_ther', sec) }), T = (f && f.therapists) || [];
  var h = {}; try { h = JSON.parse(lgProp_('BRF') || '{}') || {}; } catch (e) {}
  return 'خوراک: ok=' + !!(f && f.ok) + ' نسخه ' + (f && f.version) + ' · درمانگر ' + T.length + ' · با هفتگی ' + T.filter(function (t) { return (t.weekly || []).length; }).length +
    ' (قاعده ' + T.reduce(function (a, t) { return a + (t.weekly || []).length; }, 0) + ') · با معارفهٔ آزاد ' + T.filter(function (t) { return (t.introSlots || []).length; }).length +
    ' · درخواست پل: درست ' + (h.ok ? h.ok - 1 : 0) + ' (آخرین ' + (h.at || '-') + ')، امضای رد ' + (h.auth || 0) + ' (آخرین ' + (h.authAt || '-') + ')';
}

/** E46 بند ۵: شمار پیوند ورود ساخته‌شدهٔ امروز (در همان کلید BRL) */
function brLinkCount_() { var st = brLeadState_(); st.ln = (st.ln || 0) + 1; brLeadState_(st); }
function brLeadNightLine_() {
  var c = brLeadState_();
  var inv = 0; try { inv = Object.keys(JSON.parse(lgProp_('LG_INV') || '{}')).length; } catch (e2) {}
  return '🌉 پل امروز: ' + tgFa_(c.ok || 0) + ' لید بات رسید' + (c.fail ? '، ' + tgFa_(c.fail) + ' شکست' : '') + (c.q.length ? '، ' + tgFa_(c.q.length) + ' در صف ۴۲۹' : '') + ' · پیوند «ورود به تجربه» امروز: ' + tgFa_(c.ln || 0) + ' · دعوت تا امروز: ' + tgFa_(inv) + ' درمانگر' + (c.sch ? ' · ثبت مدرسه به پل: ' + tgFa_(c.sch.ok || 0) + (c.sch.fail ? '، ' + tgFa_(c.sch.fail) + ' شکست' : '') : '');
}
function brTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, own: TG_OWNER_CHAT, cfg: TG_CFG_ };
  TG_DRY = true; TG_OWNER_CHAT = '9001'; TG_MEM = { 'lg:now': String(Date.now()), 'pnlp:BRIDGE_TG_SECRET': 'test-only-bridge-secret-0123456789', 'pnlp:TG_BRIDGE_HANDOFF_SECRET': 'test-only-handoff-secret' };
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
    /* v170.109: صف مشترک بادوام پل برای رونوشت ناموفق */
    TG_MEM['br:mirror'] = []; TG_MEM['br:mirrorCode'] = 503;
    var raw1 = JSON.stringify(u1);
    ok('رونوشت با ۵xx در صف مشترک می‌ماند (روی کد قبلی مردود)', brMirror_(raw1, u1) === false && brLeadState_().q.length === 1 && brLeadState_().q[0].t === 'tg' && brLeadState_().q[0].b === raw1);
    TG_MEM['br:mirrorCode'] = 400;
    ok('۴۰۰ صف نمی‌شود (شکل بد، تکرار بی‌فایده)', brMirror_(raw1, u1) === false && brLeadState_().q.length === 1);
    ok('آپدیت بزرگ صف نمی‌شود', brOutQueue_({ t: 'tg', b: new Array(4000).join('x') }) === false);
    TG_MEM['br:mirrorCode'] = 503;
    ok('تیک: پل هنوز ۵xx، صف می‌ماند', brLeadRetryTick_() === 0 && brLeadState_().q.length === 1);
    TG_MEM['br:mirrorCode'] = 200; var nM = TG_MEM['br:mirror'].length;
    ok('تیک: پل برگشت، همان بدنهٔ خام با سربرگ راز می‌رود و صف خالی', brLeadRetryTick_() === 0 && brLeadState_().q.length === 0 && TG_MEM['br:mirror'].length === nM + 1 &&
      TG_MEM['br:mirror'][nM].raw === raw1 && !!TG_MEM['br:mirror'][nM].h[BR_MIRROR_HDR]);
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

/* ─────────────── v170.123 (E70): خوراک امضاشدهٔ هاب برای برش ───────────────
   راه برعکس، مثل BotSlots: بات هر بخش را به نشانی خودش در پل می‌فرستد.
   POST <پایه>/<section>/intake؛ امضا «legacy-bot-cutover.v1:<section>:<ts>:<بدنهٔ خام>» با راز handoff.
   فقط فهرست سفید ستون‌ها (نام سرستون هاب ← نام انگلیسی). ستون کارت، شبا و نام صاحب حساب هرگز (CO_DENY).
   هر بخش روزی یک بار (BRIDGE_CUTOVER_EVERY_H)؛ شکست ۶ ساعت بعد؛ ۴۰۴ یعنی رابط پل هنوز نیست و تیک می‌ایستد.
   پایه: تنظیم BRIDGE_CUTOVER_URL (off = خاموش). هیچ پیامی به کسی نمی‌رود. */
var CO_URL_DEF = 'https://bridge.tajrobeh.life/api/v2/legacy/bot-cutover/';
var CO_DENY = /کارت|شبا|IBAN|صاحب\s*حساب|حساب\s*بانکی/i;
var CO_CHUNK_CHARS = 600000;   /* سقف ۲ مگابایت پل؛ هر نویسه در UTF-8 حداکثر ۳ بایت */
var CO_CHUNK_ROWS = 3000;
var CO_BUDGET_MS = 120000;
var CO_SAME = { at: 'زمان', leadKey: 'کد لید', who: 'کی', channel: 'کانال', what: 'چه شد', from: 'از', to: 'به', note: 'یادداشت' };
/* f: فیلد ← نام سرستون، یا فهرست نام‌ها، و عدد = جای ستون (۰-پایه) اگر سرستون پیدا نشد. th: فیلد نام درمانگر برای افزودن کد و chat */
var CO_SECTIONS = [
  { s: 'people', tabs: [{ b: 'hub', t: 'افراد' }], key: function (o) { return o.id || o.chatId; },
    f: { id: 'شناسه', name: 'نام', telegramUsername: 'یوزرنیم تلگرام', chatId: 'chat_id', roles: 'نقش‌ها', circleOrCourse: 'حلقه یا دوره', status: 'وضعیت', phone: 'شمارهٔ تماس', email: 'ایمیل', approach: 'رویکرد', acceptsSupervision: 'سوپرویژن می‌پذیرد؟' }, list: ['roles'] },
  { s: 'leads', tabs: [{ b: 'hub', t: 'لیدها' }], key: function (o) { return o.code; },
    f: { code: 'کد لید', createdDate: ['تاریخ', 0], createdTime: ['زمان', 1], source: ['منبع', 2], name: ['نام', 3], channel: ['کانال', 4], contact: ['شماره / شناسه', 5], insideIran: ['داخل یا خارج', 6], firstText: ['متن اولیه', 7],
         status: ['وضعیت', 8], owner: ['مسئول', 9], lastContact: ['آخرین تماس', 10], result: ['نتیجه', 11], note: ['یادداشت', 12], requestType: 'نوع درخواست', topic: 'موضوع اصلی',
         th1: 'درمانگر پیشنهادی ۱', th2: 'درمانگر پیشنهادی ۲', th3: 'درمانگر پیشنهادی ۳', referralDate: 'تاریخ ارجاع', introArranged: 'معارفه هماهنگ شد؟', leadType: 'نوع لید' },
    fix: function (o) { var l = [o.th1, o.th2, o.th3].filter(Boolean); delete o.th1; delete o.th2; delete o.th3; if (l.length) o.suggestedTherapists = l; delete o.code; } },
  { s: 'lead-events', tabs: [{ b: 'hub', t: 'رویدادهای لید' }], key: function (o) { return o.leadKey ? [o.leadKey, o.row || '', o.at || ''].join('|') : ''; },
    f: Object.assign({ row: 'سطر' }, CO_SAME), fix: function (o) { delete o.row; } },
  { s: 'lead-sources', tabs: [{ b: 'hub', t: 'کدهای start', kind: 'start' }, { b: 'hub', t: 'نقشهٔ کلمه‌ها', kind: 'word' }],
    key: function (o) { return o.kind === 'start' ? (o.code ? 'start:' + o.code : '') : (o.word ? 'word:' + (o.page || '') + ':' + o.word : ''); },
    f: { code: 'کد', label: ['برچسب', 'برچسب فارسی'], page: 'پیج', word: 'کلمه', destination: 'مقصد', requestType: 'نوع درخواست', sessionMode: 'حالت جلسه', venueKey: 'شناسهٔ مکان', topic: 'موضوع', utm: 'کد UTM' } },
  { s: 'lead-clicks', tabs: [{ b: 'hub', t: 'کلیک‌های تماس' }], key: function (o) { return o.date ? [o.date, o.time || '', o.code || ''].join('|') : ''; },
    f: { date: ['تاریخ', 0], time: ['ساعت', 'زمان', 1], channel: ['کانال', 2], source: ['منبع', 3], page: ['صفحه', 4], owner: ['مسئول', 5], code: ['کد', 6] } },
  { s: 'tasks', tabs: [{ b: 'hub', t: 'کارها' }], key: function (o) { return o.code; },
    f: { code: 'کد', title: 'عنوان', description: 'شرح', team: 'تیم', owner: 'مسئول', ownerChatId: 'chat_id', priority: 'اولویت', due: 'مهلت', status: 'وضعیت', ownerNote: 'یادداشت مسئول',
         createdBy: 'ایجاد توسط', createdAt: 'تاریخ ایجاد', updatedAt: 'آخرین تغییر', link: 'پیوند', recurrence: 'تکرار' }, fix: function (o) { delete o.code; } },
  { s: 'therapist-leave', tabs: [{ b: 'hub', t: 'مرخصی درمانگران' }], key: function (o) { return o.therapist && o.from ? o.therapist + '|' + o.from : ''; }, th: 'therapist',
    f: { therapist: 'درمانگر', from: 'از', to: 'تا', registeredAt: 'ثبت', note: 'یادداشت' } },
  { s: 'therapist-applications', tabs: [{ b: 'hub', t: 'جذب تراپیست', origin: 'reception' }, { b: 'school', t: 'اپلای تراپیست', origin: 'school' }], key: function (o) { return o.code; },
    f: { code: 'کد اپلای', name: ['نام', 'نام کامل'], date: 'تاریخ', stage: 'مرحله', nextAction: 'اقدام بعدی', nextActionDate: 'تاریخ اقدام بعدی', owner: 'مسئول پذیرش', phone: 'شمارهٔ تماس', email: 'ایمیل',
         telegram: ['تلگرام', 'یوزرنیم تلگرام'], chatId: 'chat_id', city: 'شهر', approach: 'رویکرد', yearsOfPractice: 'سال‌های کار', interviewSupervisor: ['سوپروایزر مصاحبه', 'سوپروایزر مصاحبهٔ دوم'],
         interviewAt: ['زمان مصاحبه', 'زمان مصاحبهٔ دوم'], finalResult: 'نتیجهٔ نهایی', note: 'یادداشت' }, fix: function (o) { delete o.code; } },
  { s: 'venues', tabs: [{ b: 'hub', t: 'مکان‌های حضوری' }], key: function (o) { return o.id; },
    f: { id: 'شناسه', city: 'شهر', name: 'نام مکان', kind: 'نوع', owner: 'مسئول', area: 'محله', status: 'وضعیت', order: 'ترتیب', note: 'یادداشت' }, fix: function (o) { delete o.id; } },
  { s: 'venue-rooms', tabs: [{ b: 'hub', t: 'اتاق‌های حضوری' }], key: function (o) { return o.venueKey && o.room ? o.venueKey + '|' + o.room : ''; },
    f: { venueKey: 'مکان (شناسه)', room: 'اتاق', purpose: 'برای', openDays: 'روزهای باز', from: 'از ساعت', to: 'تا ساعت', status: 'وضعیت', note: 'یادداشت' } },
  { s: 'venue-hours', tabs: [{ b: 'hub', t: 'ساعت‌های حضوری' }], th: 'therapist',
    key: function (o) { return o.venueKey && o.therapist && o.weekday ? [o.venueKey, o.therapist, o.weekday, o.from || ''].join('|') : ''; },
    f: { venueKey: 'مکان (شناسه)', therapist: 'درمانگر', weekday: 'روز', from: 'از ساعت', to: 'تا ساعت', room: 'اتاق', acceptsNewClients: 'مراجع تازه می‌پذیرد؟', therapistConfirmed: 'تأیید درمانگر', recurrence: 'تکرار', fromDate: 'از تاریخ' } },
  /* ⛔ بی نام مراجع: ستون پنجم (۴) این تب نام مراجع است و در فهرست نیست */
  { s: 'venue-occupancy', tabs: [{ b: 'hub', t: 'اشغال هفتگی گاندی' }], th: 'therapist',
    key: function (o) { return o.weekday && o.room && o.hour ? [o.weekday, o.room, o.hour].join('|') : ''; },
    f: { weekday: ['روز', 0], room: ['اتاق', 1], hour: ['ساعت', 2], therapist: ['درمانگر', 3], state: ['وضعیت', 5], fromDate: 'از تاریخ' } },
  { s: 'venue-requests', tabs: [{ b: 'hub', t: 'درخواست‌های حضوری' }], key: function (o) { return o.id; }, th: 'therapist',
    f: { id: 'شناسه', at: 'زمان', therapist: 'درمانگر', therapistChatId: 'chat', venueKey: 'مکان', kind: 'نوع', weekday: 'روز', from: 'از ساعت', to: 'تا ساعت', room: 'اتاق', date: 'تاریخ', text: 'متن',
         status: 'وضعیت', receptionAnswer: 'پاسخ پذیرش', answeredAt: 'زمان پاسخ' }, fix: function (o) { delete o.id; } },
  { s: 'school-courses', tabs: [{ b: 'school', t: 'دوره‌ها' }], key: function (o) { return o.code; },
    f: { code: ['کد دوره', 0], name: ['نام دوره', 'نام', 1], sitePage: ['صفحهٔ سایت', 'صفحه در سایت', 'صفحه', 2], status: ['وضعیت', 3], description: ['توضیح', 'شرح'], owner: 'مسئول', botKey: ['کلید بات', 7] }, fix: function (o) { delete o.code; } },
  { s: 'school-circles', tabs: [{ b: 'school', t: 'حلقه‌ها' }], key: function (o) { return o.code; },
    f: { code: ['کد حلقه', 0], courseCode: ['کد دوره', 'دوره', 1], name: ['نام حلقه', 'نام', 2], status: ['وضعیت', 3], studentCount: ['تعداد دانشجو', 'تعداد'], teacher: 'استاد', note: 'یادداشت' }, fix: function (o) { delete o.code; } },
  { s: 'school-faculty', tabs: [{ b: 'school', t: 'استادان و سوپروایزرها' }], key: function (o) { return o.chatId || o.name; },
    f: { name: 'نام', telegramUsername: 'یوزرنیم تلگرام', chatId: 'chat_id', role: 'نقش', field: 'دوره / حوزه', approach: 'رویکرد', acceptsSupervision: 'سوپرویژن می‌پذیرد؟', status: 'وضعیت', phone: 'شمارهٔ تماس',
         department: 'دپارتمان', displayTitle: 'عنوان نمایشی در سایت', latinName: 'نام لاتین', slug: 'اسلاگ صفحه' } },
  { s: 'school-leads', tabs: [{ b: 'school', t: 'لیدهای مدرسه' }], key: function (o) { return o.id; },
    f: { id: 'شناسهٔ درخواست', requestedAt: 'تاریخ درخواست', name: 'نام کامل', telegramUsername: 'یوزرنیم تلگرام', chatId: 'chat_id', requestedRole: 'نقش درخواستی', course: 'دوره', circle: 'حلقه', phone: 'شمارهٔ تماس',
         email: 'ایمیل', fieldAndUniversity: 'رشته و دانشگاه', applicantNote: 'توضیح متقاضی', status: 'وضعیت', reviewer: 'بررسی‌کننده', decidedAt: 'تاریخ تصمیم', schoolNote: 'یادداشت مدرسه',
         leadCode: 'کد لید مدرسه', funnelStage: 'مرحلهٔ قیف', owner: 'مسئول پیگیری' }, fix: function (o) { delete o.id; } },
  { s: 'school-lead-events', tabs: [{ b: 'school', t: 'رویدادهای مدرسه' }], key: function (o) { return o.leadKey ? [o.leadKey, o.row || '', o.at || ''].join('|') : ''; },
    f: Object.assign({ row: 'سطر' }, CO_SAME), fix: function (o) { delete o.row; } },
  { s: 'scholarships', tabs: [{ b: 'school', t: 'بورسیه' }], key: function (o) { return o.id; },
    f: { id: 'شناسه', at: 'زمان', name: 'نام', phone: 'شماره', email: 'ایمیل', chatId: 'chat_id', status: 'وضعیت', fieldAndLevel: 'رشته و مقطع', university: 'دانشگاه', areas: 'زمینه‌های همکاری',
         languageLevel: 'سطح زبان', source: 'منبع', note: 'یادداشت', amount: ['مبلغ', 'مبلغ بورسیه'] }, fix: function (o) { delete o.id; } },
  { s: 'alumni', tabs: [{ b: 'school', t: 'دانش‌آموختگان' }], key: function (o) { return o.id; },
    f: { id: 'شناسه', name: 'نام', latinName: 'نام لاتین', slug: 'اسلاگ صفحه', telegramUsername: 'یوزرنیم تلگرام', chatId: 'chat_id', course: 'دوره', circle: 'حلقه', circleCode: 'کد حلقه',
         graduationYear: 'سال پایان', hours: 'ساعت گذرانده', status: 'وضعیت', clinicTherapist: 'تراپیست کلینیک؟', mentor: 'منتور؟', city: 'شهر', approach: 'رویکرد', email: 'ایمیل', publishAllowed: 'اجازهٔ انتشار' },
    fix: function (o) { delete o.id; } }
];
function coSec_(s) { for (var i = 0; i < CO_SECTIONS.length; i++) if (CO_SECTIONS[i].s === s) return CO_SECTIONS[i]; return null; }
function coBase_() { var u = String(cfg_('BRIDGE_CUTOVER_URL', '') || '').trim(); if (/^(off|0|خاموش)$/i.test(u)) return ''; if (!u) return CO_URL_DEF; if (!/^https:\/\/bridge\.tajrobeh\.life\//.test(u)) return ''; return /\/$/.test(u) ? u : u + '/'; }
/** همهٔ خانه‌های تب به‌صورت نمایش هاب (تاریخ همان‌طور که در هاب است)؛ در آزمون از TG_MEM['co:<b>:<t>'] */
function coGrid_(b, t) {
  if (TG_DRY) return TG_MEM['co:' + b + ':' + t] || null;
  var ss = b === 'school' ? tgSchSS_() : tgSS_(), sh = ss.getSheetByName(t);
  if (!sh || sh.getLastRow() < 1) return null;
  return sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
}
/** ستون هر فیلد: نام سرستون در یکی از سه ردیف اول (ردیفی که بیشترین سرستون آشنا را دارد)، وگرنه جای ثابت. ستون ممنوع هرگز */
function coCols_(sec, grid) {
  var best = -1, hr = 0, cols = {};
  for (var r = 0; r < Math.min(3, grid.length); r++) {
    var hd = grid[r].map(function (x) { return String(x || '').trim(); }), n = 0, c = {};
    Object.keys(sec.f).forEach(function (k) {
      var alts = [].concat(sec.f[k]), j = -1;
      for (var a = 0; a < alts.length && j < 0; a++) if (typeof alts[a] === 'string') j = hd.indexOf(alts[a]);
      if (j >= 0) { n++; c[k] = j; }
    });
    if (n > best) { best = n; hr = r; cols = c; }
  }
  var head = grid[hr] || [];
  Object.keys(sec.f).forEach(function (k) {
    if (cols[k] === undefined) { var alts = [].concat(sec.f[k]); for (var a = 0; a < alts.length; a++) if (typeof alts[a] === 'number') { cols[k] = alts[a]; break; } }
    if (cols[k] !== undefined && CO_DENY.test(String(head[cols[k]] || ''))) delete cols[k];
  });
  return { hr: hr, cols: cols, found: best };
}
/** شناسه‌های درمانگر از تب درمانگران (کد، v1، chat) برای جورکردن در پل */
function coTherIds_() {
  var m = {};
  try { (TG_DRY ? (TG_MEM['pnl:thers'] || []) : tgTherapistRows_()).forEach(function (t) { m[tgNorm_(t.name)] = { code: String(t.code || ''), v1: brNum_(t.v1), chat: typeof pnlChatOf_ === 'function' ? pnlChatOf_(t) : String(t.chat || '') }; }); } catch (e) {}
  return m;
}
/** ردیف‌های یک بخش؛ ردیف تمام‌خالی نمی‌آید، ردیف بی کلید با key خالی می‌آید تا پل بشمارد و رد کند */
function coRows_(sec, ther) {
  var out = [], st = [];
  sec.tabs.forEach(function (tb) {
    var g = coGrid_(tb.b, tb.t);
    if (!g) { st.push({ tab: tb.t, found: false }); return; }
    var cc = coCols_(sec, g), n = 0;
    for (var i = cc.hr + 1; i < g.length; i++) {
      var o = {}, any = false;
      Object.keys(cc.cols).forEach(function (k) { var v = String(g[i][cc.cols[k]] == null ? '' : g[i][cc.cols[k]]).trim(); if (v) { o[k] = v; any = true; } });
      if (!any) continue;
      if (tb.kind) o.kind = tb.kind;
      if (tb.origin) o.origin = tb.origin;
      (sec.list || []).forEach(function (k) { if (o[k]) o[k] = o[k].split(/\s*[،,]\s*/).filter(Boolean); });
      var key = String(sec.key(o) || '').trim();
      if (sec.fix) sec.fix(o);
      if (sec.th && o[sec.th] && ther) {
        var id = ther[tgNorm_(o[sec.th])];
        if (id) { if (id.code) o.therapistCode = id.code; if (id.v1) o.therapistV1UserId = id.v1; if (id.chat && !o.therapistChatId) o.therapistChatId = id.chat; }
      }
      var row = { key: key }; Object.keys(o).forEach(function (k) { row[k] = o[k]; });
      out.push(row); n++;
    }
    st.push({ tab: tb.t, found: true, rows: n, cols: Object.keys(cc.cols).length, of: Object.keys(sec.f).length,
      missing: Object.keys(sec.f).filter(function (k) { return cc.cols[k] === undefined; }) });
  });
  return { rows: out, stat: st };
}
/** تکه‌ها: هر تکه زیر سقف نویسه و ردیف؛ complete فقط روی تکهٔ آخر */
function coChunks_(s, rows) {
  var parts = [], cur = [], size = 0;
  rows.forEach(function (r) { var n = JSON.stringify(r).length + 1; if (cur.length && (size + n > CO_CHUNK_CHARS || cur.length >= CO_CHUNK_ROWS)) { parts.push(cur); cur = []; size = 0; } cur.push(r); size += n; });
  if (cur.length || !parts.length) parts.push(cur);
  return parts.map(function (p, i) { return JSON.stringify({ section: s, version: 1, chunk: i + 1, chunks: parts.length, complete: i === parts.length - 1, rows: p }); });
}
function coPost_(url, s, body, sec, now) {
  var ts = String(now), hd = { 'Tajrobeh-Timestamp': ts, 'Tajrobeh-Signature': brSign_('legacy-bot-cutover.v1:' + s + ':' + ts + ':' + body, sec) };
  if (TG_DRY) { (TG_MEM['co:sent'] = TG_MEM['co:sent'] || []).push({ url: url, body: body, h: hd }); var c = TG_MEM['co:code']; return Number(typeof c === 'function' ? c(s) : (c || 200)); }
  try { return UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: body, headers: hd, muteHttpExceptions: true, followRedirects: false }).getResponseCode(); } catch (e) { return 0; }
}
/** از tgTick5: بخش‌های سررسیده را به ترتیب E70 بند ۴ می‌فرستد. وضع در BRC: {بخش: {at, code, try, n}} */
function coTick_() {
  var base = coBase_(), sec = brHandoffSecret_();
  if (!base || !sec) return 'off';
  var now = Math.floor((TG_DRY && TG_MEM['br:now'] ? Number(TG_MEM['br:now']) : Date.now()) / 1000), t0 = Date.now();
  var st = {}; try { st = JSON.parse(lgProp_('BRC') || '{}') || {}; } catch (e) {}
  var every = (Number(tgLatinDigits_(String(cfg_('BRIDGE_CUTOVER_EVERY_H', '') || ''))) || 24) * 3600;
  if (st._down && now < st._down) return 'wait';
  var ther = null, done = [];
  for (var i = 0; i < CO_SECTIONS.length; i++) {
    if (!TG_DRY && Date.now() - t0 > CO_BUDGET_MS) break;
    var S = CO_SECTIONS[i], x = st[S.s] || {};
    if (x.at && now - x.at < every) continue;
    if (x.try && now - x.try < 6 * 3600) continue;
    if (!ther) ther = coTherIds_();
    var R = coRows_(S, ther), code = 0;
    if (!R.stat.some(function (t) { return t.found; })) { x.code = 'notab'; x.try = now; st[S.s] = x; done.push(S.s + ' notab'); continue; }   /* تب نیست: تکهٔ کامل خالی نفرست، پل همه را پاک‌شده می‌شمارد */
    var bodies = coChunks_(S.s, R.rows);
    for (var j = 0; j < bodies.length; j++) { code = coPost_(base + S.s + '/intake', S.s, bodies[j], sec, now); if (code < 200 || code >= 300) break; }
    x.n = R.rows.length; x.code = code;
    if (code >= 200 && code < 300) { x.at = now; delete x.try; } else x.try = now;
    st[S.s] = x; done.push(S.s + ' ' + code);
    if (code === 404 || code === 429 || code === 401) { if (code === 404) st._down = now + 6 * 3600; break; }   /* رابط هنوز نیست، نرخ یا امضا: بقیه بماند */
  }
  if (done.length && !(st._down && now < st._down)) delete st._down;
  lgProp_('BRC', JSON.stringify(st));
  return done.join(' · ') || 'same';
}
/** یک‌بارهٔ خودکار v170.123 (E70، فقط‌خواندنی): هر بخش چند ردیف و کدام فیلد سرستونش پیدا نشد. بی دادهٔ شخصی، فقط شمار و نام فیلد */
function coV170123Stat() {
  var ther = coTherIds_(), out = [];
  CO_SECTIONS.forEach(function (S) {
    var R; try { R = coRows_(S, ther); } catch (e) { out.push(S.s + ': خطا'); return; }
    var nk = R.rows.filter(function (r) { return !r.key; }).length;
    out.push(S.s + ': ' + R.rows.length + ' ردیف' + (nk ? ' (' + nk + ' بی کلید)' : '') + ' · ' + R.stat.map(function (t) { return t.found ? t.cols + '/' + t.of + ' ستون' + (t.missing.length ? ' بی: ' + t.missing.join(',') : '') : 'تب نیست'; }).join(' | '));
  });
  return out.join('\n');
}

try { TG_SUITES.push(['خوراک برش هاب برای پل (E70) v170.123', 'coTests']); } catch (eSu2) {}
function coTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, cfg: TG_CFG_ };
  TG_DRY = true; TG_MEM = { 'lg:now': String(Date.now()), 'br:now': '1800000000000', 'pnlp:TG_BRIDGE_HANDOFF_SECRET': 'test-only-handoff-secret' };
  try {
    TG_CFG_ = {};
    TG_MEM['pnl:thers'] = [{ name: 'درمانگر نمونه', code: 'T-1', chat: '5001', v1: '77' }];
    TG_MEM['co:hub:افراد'] = [['نام', 'یوزرنیم تلگرام', 'chat_id', 'نقش‌ها', 'شمارهٔ کارت', 'شناسه'], ['همکار نمونه', 'sample_user', '4001', 'پذیرش، مالی', '6037000000000000', 'P-1'], ['', '', '', '', '', ''], ['بی شناسه', '', '', '', '', '']];
    TG_MEM['co:hub:اشغال هفتگی گاندی'] = [['اشغال هفتگی', '', '', '', '', ''], ['روز', 'اتاق', 'ساعت', 'درمانگر', 'مراجع', 'وضعیت'], ['شنبه', '۱', '۱۰', 'درمانگر نمونه', 'مراجع نمونه', 'پر']];
    TG_MEM['co:hub:لیدها'] = [['تاریخ', 'زمان', 'منبع', 'نام', 'کانال', 'شماره / شناسه', 'داخل یا خارج', 'متن اولیه', 'وضعیت', 'مسئول', 'آخرین تماس', 'نتیجه', 'یادداشت', 'درمانگر پیشنهادی ۱', 'درمانگر پیشنهادی ۲', 'کد لید'],
      ['1405/08/19', '10:00', 'سایت', 'مراجع نمونه', 'تلگرام', '@sample', 'خارج', 'سلام', 'تازه', 'پذیرش', '', '', '', 'درمانگر نمونه', 'درمانگر دوم', 'L-1']];
    TG_MEM['co:hub:مرخصی درمانگران'] = [['درمانگر', 'از', 'تا', 'ثبت', 'یادداشت', 'شبا'], ['درمانگر نمونه', '1405/09/01', '1405/09/05', 'x', '', 'IR000000000000000000000000']];
    var P = coRows_(coSec_('people'), coTherIds_()).rows;
    ok('ردیف خالی نمی‌آید؛ بی کلید با key خالی می‌آید تا پل بشمارد', P.length === 2 && P[0].key === 'P-1' && P[1].key === '' && P[1].name === 'بی شناسه');
    ok('نقش‌ها فهرست است و ستون کارت هرگز نمی‌رود', P[0].roles.join('|') === 'پذیرش|مالی' && JSON.stringify(P).indexOf('6037') < 0);
    var O = coRows_(coSec_('venue-occupancy'), coTherIds_()).rows;
    ok('اشغال: سرستون از ردیف دوم، بی نام مراجع، با کد و chat و v1 درمانگر', O.length === 1 && O[0].key === 'شنبه|۱|۱۰' && O[0].state === 'پر' && JSON.stringify(O).indexOf('مراجع نمونه') < 0 &&
      O[0].therapistCode === 'T-1' && O[0].therapistChatId === '5001' && O[0].therapistV1UserId === 77);
    var D = coRows_(coSec_('leads'), coTherIds_()).rows;
    ok('لید: کلید کد لید، سه درمانگر پیشنهادی در یک فهرست', D.length === 1 && D[0].key === 'L-1' && D[0].suggestedTherapists.join('|') === 'درمانگر نمونه|درمانگر دوم' && D[0].createdTime === '10:00' && D[0].code === undefined && D[0].th1 === undefined);
    var L = coRows_(coSec_('therapist-leave'), coTherIds_()).rows;
    ok('مرخصی: کلید درمانگر و از؛ شبا نمی‌رود', L.length === 1 && L[0].key === 'درمانگر نمونه|1405/09/01' && JSON.stringify(L).indexOf('IR000') < 0);
    ok('هیچ فیلد هیچ بخشی به ستون ممنوع اشاره نمی‌کند', CO_SECTIONS.every(function (S) { return Object.keys(S.f).every(function (k) { return [].concat(S.f[k]).every(function (h) { return typeof h !== 'string' || !CO_DENY.test(h); }); }); }));
    var big = []; for (var i = 0; i < 7000; i++) big.push({ key: 'k' + i, note: 'x' });
    var C = coChunks_('lead-events', big).map(function (b) { return JSON.parse(b); });
    ok('تکه‌ها: ۳ تکه، complete فقط روی آخری، همهٔ ردیف‌ها', C.length === 3 && C[0].chunks === 3 && !C[0].complete && !C[1].complete && C[2].complete && C[0].rows.length + C[1].rows.length + C[2].rows.length === 7000);
    ok('بخش خالی هم یک تکهٔ کامل می‌فرستد (پل پاک‌شده‌ها را بشمارد)', coChunks_('venues', []).length === 1 && JSON.parse(coChunks_('venues', [])[0]).complete === true);
    TG_MEM['co:code'] = 200;
    var r1 = coTick_(), sent = TG_MEM['co:sent'] || [], s0 = sent[0] || {}, ts = s0.h ? s0.h['Tajrobeh-Timestamp'] : '';
    ok('تیک: بخش‌های دارای تب به ترتیب، نشانی هر بخش جدا، امضای legacy-bot-cutover.v1؛ تب ناپیدا فرستاده نمی‌شود', sent.length === 4 && /venues notab/.test(r1) && /\/bot-cutover\/people\/intake$/.test(s0.url) &&
      s0.h['Tajrobeh-Signature'] === brSign_('legacy-bot-cutover.v1:people:' + ts + ':' + s0.body, brHandoffSecret_()) && /^v1=[0-9a-f]{64}$/.test(s0.h['Tajrobeh-Signature']), r1);
    ok('تیک دوم در همان روز چیزی نمی‌فرستد', coTick_() === 'same' && TG_MEM['co:sent'].length === 4);
    lgProp_('BRC', '{}'); TG_MEM['co:sent'] = []; TG_MEM['co:code'] = 404;
    var r3 = coTick_();
    ok('۴۰۴ (رابط پل هنوز نیست): همان بخش اول و ایست ۶ ساعته', TG_MEM['co:sent'].length === 1 && /people 404/.test(r3) && coTick_() === 'wait', r3);
    lgProp_('BRC', '{}'); TG_MEM['co:sent'] = []; TG_MEM['co:code'] = function (s) { return s === 'leads' ? 500 : 200; };
    coTick_();
    var st = JSON.parse(lgProp_('BRC'));
    ok('۵۰۰ در یک بخش بقیه را نمی‌بندد؛ همان بخش ۶ ساعت بعد دوباره', st.leads.try && !st.leads.at && st.people.at && st['therapist-leave'].at && TG_MEM['co:sent'].length === 4);
    TG_CFG_ = { BRIDGE_CUTOVER_URL: 'off' };
    ok('خاموش با off؛ نشانی بیرون از پل پذیرفته نمی‌شود', coTick_() === 'off' && (TG_CFG_ = { BRIDGE_CUTOVER_URL: 'https://evil.example/' }, coTick_() === 'off'));
    TG_CFG_ = {};
    ok('یک‌بارهٔ آمار فقط شمار و نام فیلد؛ در فهرست CI', /people: 2 ردیف \(1 بی کلید\)/.test(coV170123Stat()) && coV170123Stat().indexOf('همکار نمونه') < 0 && CI_ONCE_AUTO.indexOf('coV170123Stat') >= 0);
    ok('در tgTick5 صدا زده می‌شود', String(tgTick5).indexOf('coTick_') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep.dry; TG_MEM = keep.mem; TG_CFG_ = keep.cfg;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ خوراک برش درست است'));
  return tgTestTally_(log, fail);
}
