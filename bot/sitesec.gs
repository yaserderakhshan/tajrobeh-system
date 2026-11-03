/* v170.9 (کد PR #73، ممیزی سایت ۱۱ مهر، یافتهٔ ۵؛ با بازپخش‌نشدنی و کش‌نشدن رمز خالی): امنیت ورودی سایت در doPost
 *
 * ۱) امضای فرم و کلیک سایت. وردپرس (اسنیپت 501143) به نشانی وب‌اپ ?ts=<ثانیه>&sig=<hex> اضافه می‌کند:
 *    sig = HMAC-SHA256(ts + "." + بدنهٔ خام، SITE_LEAD_SECRET). رمز فقط در Script Properties و wp-config.php.
 *    مرحلهٔ ۱ (پیش‌فرض): فقط سنجش و شمارش روزانه در Property «SSIG:<روز>»؛ هیچ لیدی رد نمی‌شود.
 *    مرحلهٔ ۲: Property «SITE_SIG_ENFORCE» = 1 (با تأیید یاسر، بعد از یک هفته که همه «ok» بودند)؛ بی‌امضا یا امضای غلط ثبت نمی‌شود.
 * ۲) جلوگیری از تزریق فرمول در شیت: هر مقدار متنی فرم و کلیک سایت و پیام واتساپ که با = + - @ یا تب یا CR شروع شود
 *    یک ' جلویش می‌گیرد. مقدار فقط‌رقمی (شمارهٔ تلفن با + یا - یا فاصله یا پرانتز) دست نمی‌خورد.
 */
var SS_PROP = 'SITE_LEAD_SECRET';
var SS_ENFORCE = 'SITE_SIG_ENFORCE';

function ssSecret_() { return ssSecrets_()[0] || ''; }
/* v170.16.1: رمز فعلی، رمز تازهٔ منتظر سایت (_NEXT) و رمز قبلی در مهلت ۶ ساعت (_PREV)؛ کش ۱۰ دقیقه */
function ssSecrets_() {
  if (TG_DRY) return ssRotList_(SS_PROP, TG_MEM['ss:secret'] || '');
  var c = CacheService.getScriptCache();
  var s = c.get('sssec2');
  if (s) { try { return JSON.parse(s); } catch (eC) {} }
  var l = ssRotList_(SS_PROP);
  if (l.length) c.put('sssec2', JSON.stringify(l), 600);
  return l;
}

function ssHex_(bytes) {
  return bytes.map(function (b) { var h = (b & 0xff).toString(16); return h.length < 2 ? '0' + h : h; }).join('');
}

/* 'ok' | 'bad' | 'stale' | 'none' (بی امضا) | 'nokey' (رمز در بات نیست) */
function ssVerify_(e, raw) {
  var p = (e && e.parameter) || {};
  var secs = ssSecrets_();
  if (!p.sig) return secs.length ? 'none' : 'nokey';
  if (!secs.length) return 'nokey';
  var ts = Number(p.ts || 0);
  var now = TG_DRY && TG_MEM['ss:now'] ? TG_MEM['ss:now'] : Math.floor(Date.now() / 1000);
  if (!ts || Math.abs(now - ts) > 300) return 'stale';
  var given = String(p.sig).toLowerCase(), hit = -1;
  for (var j = 0; j < secs.length && hit < 0; j++) {
    var calc = ssHex_(Utilities.computeHmacSha256Signature(String(ts) + '.' + raw, secs[j]));
    if (given.length !== calc.length) continue;
    var d = 0;
    for (var i = 0; i < calc.length; i++) d |= calc.charCodeAt(i) ^ given.charCodeAt(i);
    if (d === 0) hit = j;
  }
  if (hit < 0) return 'bad';
  /* v170.16.1: سایت با رمز تازه امضا کرد، پس رمز تازه رمز فعلی می‌شود (قبلی ۶ ساعت پذیرفته می‌ماند) */
  if (secs[hit] === ssRotGet_(SS_PROP + '_NEXT')) ssRotPromote_(SS_PROP);
  /* v170.9: هر امضا فقط یک بار (بازپخش در پنجرهٔ ۵ دقیقه رد می‌شود) */
  var nk = 'ssn:' + given.slice(0, 40);
  if (TG_DRY) { TG_MEM['ss:nonce'] = TG_MEM['ss:nonce'] || {}; if (TG_MEM['ss:nonce'][nk]) return 'replay'; TG_MEM['ss:nonce'][nk] = 1; return 'ok'; }
  try { var cc = CacheService.getScriptCache(); if (cc.get(nk)) return 'replay'; cc.put(nk, '1', 600); } catch (eN) {}
  return 'ok';
}

function ssCount_(r) {
  var day = Utilities.formatDate(new Date(), TG_TZ || 'Asia/Tehran', 'yyyy-MM-dd');
  if (TG_DRY) { var m = TG_MEM['ss:count'] = TG_MEM['ss:count'] || {}; m[r] = (m[r] || 0) + 1; return; }
  try {
    var props = PropertiesService.getScriptProperties();
    var k = 'SSIG:' + day;
    var o = JSON.parse(props.getProperty(k) || '{}');
    o[r] = (o[r] || 0) + 1;
    props.setProperty(k, JSON.stringify(o));
  } catch (x) {}
}

/* true = ادامه بده. در مرحلهٔ ۱ همیشه true. */
function ssGate_(e, raw) {
  var r = ssVerify_(e, raw);
  ssCount_(r);
  var enforce = TG_DRY ? !!TG_MEM['ss:enforce'] : PropertiesService.getScriptProperties().getProperty(SS_ENFORCE) === '1';
  if (enforce && r !== 'ok') { logError_('امضای ورودی سایت رد شد: ' + r, null); return false; }
  return true;
}

function ssCleanVal_(v) {
  if (typeof v !== 'string') return v;
  if (/^[+\-]?[\d\s()\-]+$/.test(v)) return v;
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}
function ssClean_(o) {
  if (Array.isArray(o)) return o.map(ssClean_);
  if (o && typeof o === 'object') { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = ssClean_(o[k]); return r; }
  return ssCleanVal_(o);
}

/* ---------- v170.12: پیام امنیتی وردپرس (kind «wp_sec») ----------
 * هشدار ورود مدیر به پیشخوان و کد ورود دومرحله‌ای (اسنیپت‌های sec-admin-alert و sec-2fa، از sec-bot-send).
 * تصمیم یاسر (۱۲ مهر): وردپرس شناسهٔ تلگرام و کلید ندارد؛ با همان نشانی و همان امضای لید (SITE_LEAD_SECRET) می‌فرستد
 * و بات خودش به مالک (TG_OWNER_CHAT از تنظیمات خصوصی) می‌رساند.
 * برخلاف فرم و کلیک، اینجا امضا همیشه لازم است (مستقل از SITE_SIG_ENFORCE): بی امضای درست هیچ پیامی نمی‌رود.
 * سقف ۳۰ پیام در ساعت. کد ورود در «ارسال‌های بات» ثبت نمی‌شود (فقط نسخهٔ پوشانده). */
var WPSEC_CAP_HOUR = 30;
function wpSecEsc_(v, n) { return String(v == null ? '' : v).slice(0, n || 80).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); }
function wpSecCap_() {
  var k = 'wpsec:' + Utilities.formatDate(new Date(), TG_TZ || 'Asia/Tehran', 'yyyyMMddHH');
  if (TG_DRY) { TG_MEM[k] = (TG_MEM[k] || 0) + 1; return TG_MEM[k] <= WPSEC_CAP_HOUR; }
  try { var c = CacheService.getScriptCache(), n = Number(c.get(k) || 0) + 1; c.put(k, String(n), 3700); return n <= WPSEC_CAP_HOUR; } catch (e) { return true; }
}
/* ارسال مستقیم با متن پوشانده در گزارش ارسال (برای کد ورود) */
function wpSecSend_(chat, text, logText) {
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'msg', chat: String(chat), text: String(text), log: String(logText) }); return true; }
  var res = tgApi_('sendMessage', { chat_id: chat, text: text, parse_mode: 'HTML', disable_web_page_preview: true });
  var ok = !!(res && res.getResponseCode() === 200);
  try { tgOutLog_(chat, logText, ok); } catch (e) {}
  return ok;
}
/* برمی‌گرداند: 'رفت' | 'رد' (امضا) | 'سقف' | 'بی مالک' | 'نامعتبر' | 'خطا' */
function wpSecIn_(e, raw, body) {
  var r = ssVerify_(e, raw);
  ssCount_(r);
  if (r !== 'ok') { logError_('پیام امنیتی سایت رد شد: ' + r, null); return 'رد'; }
  var chat = TG_DRY && TG_MEM['wpsec:owner'] !== undefined ? TG_MEM['wpsec:owner'] : TG_OWNER_CHAT;
  if (!chat) { logError_('پیام امنیتی سایت: chat مالک در تنظیمات خصوصی نیست', null); return 'بی مالک'; }
  if (!wpSecCap_()) { logError_('پیام امنیتی سایت: سقف ساعتی پر شد', null); return 'سقف'; }
  var ev = String(body.event || ''), user = wpSecEsc_(body.user, 60);
  if (ev === 'login') {
    var t = '🔐 ورود مدیر به پیشخوان tajrobeh.life\nکاربر: ' + user + '\nزمان: ' + wpSecEsc_(body.when, 30) + ' (تهران)\nIP: ' + wpSecEsc_(body.ip, 60);
    return tgNotify_(chat, TG_NK.urgent, t, { ref: 'WP-LOGIN', force: true }) === 'رفت' ? 'رفت' : 'خطا';
  }
  if (ev === '2fa') {
    var code = String(body.code || '');
    if (!/^\d{6}$/.test(code)) { logError_('پیام امنیتی سایت: کد ورود نامعتبر', null); return 'نامعتبر'; }
    var msg = '🔑 کد ورود به پیشخوان tajrobeh.life برای ' + user + ': <code>' + code + '</code>\nتا ۱۰ دقیقه معتبر است. اگر وارد نمی‌شدید، این پیام را نادیده نگیرید و رمز را عوض کنید.';
    return wpSecSend_(chat, msg, '🔑 کد ورود پیشخوان برای ' + user + ' (کد پوشانده)') ? 'رفت' : 'خطا';
  }
  logError_('پیام امنیتی سایت: نوع ناشناخته', null);
  return 'نامعتبر';
}

/* ---------- v170.16.1: عوض کردن رمزهای مشترک با سایت، بی وقفه ----------
 * رمز تازه از گردش کار («ci: props») روی رمز فعلی نمی‌نشیند؛ در <نام>_NEXT منتظر می‌ماند.
 * امضای لید: بات هر دو را می‌پذیرد. اولین امضای درست با رمز تازه یعنی سایت منتشر شده: رمز تازه فعلی می‌شود.
 * رمز کمپین (CP_WP_SECRET): بات اول با رمز تازه می‌فرستد و اگر سایت ۴۰۱ یا ۴۰۳ داد با رمز فعلی؛ اولین ۲۰۰ با رمز تازه آن را فعلی می‌کند.
 * رمز قبلی بعد از جابه‌جایی فقط ۶ ساعت پذیرفته است (برای درخواست‌های در راه) و بعد پاک می‌شود. مقدار هیچ رمزی جایی چاپ نمی‌شود. */
var SS_ROT_KEEP_MS = 6 * 3600000;
function ssRotGet_(k) {
  if (TG_DRY) return TG_MEM['ssp:' + k] || '';
  return PropertiesService.getScriptProperties().getProperty(k) || '';
}
function ssRotSet_(k, v) {
  if (TG_DRY) { if (v) TG_MEM['ssp:' + k] = String(v); else delete TG_MEM['ssp:' + k]; return; }
  var P = PropertiesService.getScriptProperties();
  if (v) P.setProperty(k, String(v)); else P.deleteProperty(k);
}
function ssRotNow_() { return TG_DRY && TG_MEM['ss:nowms'] ? TG_MEM['ss:nowms'] : Date.now(); }
function ssRotFlush_() { if (!TG_DRY) { try { CacheService.getScriptCache().removeAll(['sssec', 'sssec2']); } catch (e) {} } }
/* رمز تازه از گردش کار: 'set' (اولین رمز) | 'same' | 'next' (منتظر سایت) */
function ssRotIn_(k, v) {
  v = String(v || '').trim();
  var cur = ssRotGet_(k);
  if (!cur) { ssRotSet_(k, v); ssRotFlush_(); return 'set'; }
  if (cur === v) { if (ssRotGet_(k + '_NEXT')) { ssRotSet_(k + '_NEXT', ''); ssRotSet_(k + '_NEXT_AT', ''); ssRotFlush_(); } return 'same'; }
  if (ssRotGet_(k + '_NEXT') !== v) { ssRotSet_(k + '_NEXT', v); ssRotSet_(k + '_NEXT_AT', String(ssRotNow_())); ssRotFlush_(); }
  return 'next';
}
function ssRotPromote_(k) {
  /* بی قفل: دو جابه‌جایی هم‌زمان همان نتیجه را می‌نویسند (فراخواننده شاید خودش قفل دارد) */
  var nx = ssRotGet_(k + '_NEXT');
  if (!nx) return false;
  var cur = ssRotGet_(k);
  if (cur && cur !== nx) { ssRotSet_(k + '_PREV', cur); ssRotSet_(k + '_PREV_AT', String(ssRotNow_())); }
  ssRotSet_(k, nx);
  ssRotSet_(k + '_NEXT', ''); ssRotSet_(k + '_NEXT_AT', '');
  ssRotSet_(k + '_ROT_AT', String(ssRotNow_()));
  ssRotFlush_();
  return true;
}
/* [فعلی، تازه، قبلیِ هنوز در مهلت]؛ قبلیِ کهنه همین‌جا پاک می‌شود */
function ssRotList_(k, curOverride) {
  var cur = curOverride || ssRotGet_(k), nx = ssRotGet_(k + '_NEXT'), pv = ssRotGet_(k + '_PREV');
  if (pv && ssRotNow_() - Number(ssRotGet_(k + '_PREV_AT') || 0) > SS_ROT_KEEP_MS) { ssRotSet_(k + '_PREV', ''); ssRotSet_(k + '_PREV_AT', ''); pv = ''; }
  var out = [];
  [cur, nx, pv].forEach(function (x) { if (x && out.indexOf(x) < 0) out.push(x); });
  return out;
}
/* فرستادن به سایت با رمز کمپین؛ null یعنی رمزی نیست. پاسخ ۴۰۱/۴۰۳ رمز تازه خطا ثبت نمی‌کند، فقط با رمز فعلی دوباره می‌رود */
var SS_CAMP_PROP = 'CP_WP_SECRET';
function ssCampHas_() { return !!(ssRotGet_(SS_CAMP_PROP) || ssRotGet_(SS_CAMP_PROP + '_NEXT')); }
function ssCampFetch_(url, body) {
  var cur = ssRotGet_(SS_CAMP_PROP), nx = ssRotGet_(SS_CAMP_PROP + '_NEXT');
  if (!cur && !nx) return null;
  function go(sec) {
    var o = { method: 'post', contentType: 'application/json', headers: { 'x-tj-secret': sec }, payload: JSON.stringify(body), muteHttpExceptions: true };
    return TG_DRY ? TG_MEM['ss:fetch'](url, o) : UrlFetchApp.fetch(url, o);
  }
  if (nx && nx !== cur) {
    var r = go(nx), c = r.getResponseCode();
    if (c === 200) { ssRotPromote_(SS_CAMP_PROP); return r; }
    if ((c !== 401 && c !== 403) || !cur) return r;
  }
  return go(cur);
}

/* ---------- آزمون ---------- */
function ssTests() {
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {};
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  try {
    var raw = JSON.stringify({ name: 'نمونه', mobile: '+98 912 000 0000', note: '=HYPERLINK("x")' });
    TG_MEM['ss:secret'] = 'k'.repeat(40);
    TG_MEM['ss:now'] = 1790000000;
    var sig = ssHex_(Utilities.computeHmacSha256Signature('1790000000.' + raw, 'k'.repeat(40)));
    ok('امضای درست ok', ssVerify_({ parameter: { ts: '1790000000', sig: sig } }, raw) === 'ok');
    ok('امضای غلط bad', ssVerify_({ parameter: { ts: '1790000000', sig: sig.replace(/^./, sig[0] === 'a' ? 'b' : 'a') } }, raw) === 'bad');
    ok('بدنهٔ دست‌خورده bad', ssVerify_({ parameter: { ts: '1790000000', sig: sig } }, raw + ' ') === 'bad');
    ok('زمان کهنه stale', ssVerify_({ parameter: { ts: '1789990000', sig: sig } }, raw) === 'stale');
    ok('بی امضا none', ssVerify_({ parameter: {} }, raw) === 'none');
    TG_MEM['ss:secret'] = '';
    ok('بی رمز در بات nokey', ssVerify_({ parameter: { ts: '1790000000', sig: sig } }, raw) === 'nokey');
    ok('مرحلهٔ ۱: بی امضا هم رد نمی‌شود و شمرده می‌شود', ssGate_({ parameter: {} }, raw) === true && TG_MEM['ss:count'].nokey === 1);
    TG_MEM['ss:secret'] = 'k'.repeat(40); TG_MEM['ss:enforce'] = true;
    ok('مرحلهٔ ۲: بی امضا رد می‌شود', ssGate_({ parameter: {} }, raw) === false);
    TG_MEM['ss:nonce'] = {};
    ok('مرحلهٔ ۲: امضای درست می‌گذرد', ssGate_({ parameter: { ts: '1790000000', sig: sig } }, raw) === true);
    ok('بازپخش همان امضا رد می‌شود (v170.9)', ssVerify_({ parameter: { ts: '1790000000', sig: sig } }, raw) === 'replay' && ssGate_({ parameter: { ts: '1790000000', sig: sig } }, raw) === false);
    var c = ssClean_({ a: '=SUM(A1)', b: '+cmd', c: '-2+3', d: '@x', e: '\tz', f: '+98 912 000 0000', g: '09120000000', h: 'سلام', i: { j: '=x' }, k: ['@y'], l: 5 });  // pii:ok ساختگی
    ok('فرمول‌ها خنثی می‌شوند', c.a === "'=SUM(A1)" && c.b === "'+cmd" && c.c === "'-2+3" && c.d === "'@x" && c.e === "'\tz" && c.i.j === "'=x" && c.k[0] === "'@y");
    ok('شماره و متن عادی دست نمی‌خورند', c.f === '+98 912 000 0000' && c.g === '09120000000' && c.h === 'سلام' && c.l === 5);  // pii:ok ساختگی
    /* v170.12: پیام امنیتی وردپرس */
    TG_MEM['ss:enforce'] = false; TG_MEM['ss:nonce'] = {}; TG_MEM['wpsec:owner'] = '700001';
    function wsSig(b) { return { parameter: { ts: '1790000000', sig: ssHex_(Utilities.computeHmacSha256Signature('1790000000.' + b, 'k'.repeat(40))) } }; }
    var lb = JSON.stringify({ kind: 'wp_sec', event: 'login', user: 'admin<x>', when: '1405-07-12 10:00', ip: '203.0.113.5' });
    TG_OUTBOX = []; TG_MEM['notify'] = [];
    ok('هشدار ورود امضاشده به مالک می‌رود (و HTML پاک می‌شود)', wpSecIn_(wsSig(lb), lb, JSON.parse(lb)) === 'رفت' && TG_MEM['notify'].some(function (n) { return n.chat === '700001' && n.text.indexOf('admin&lt;x&gt;') > -1; }));
    TG_OUTBOX = []; TG_MEM['notify'] = [];
    ok('بی امضا هیچ پیامی نمی‌رود، حتی وقتی سنجش امضا اجباری نیست', wpSecIn_({ parameter: {} }, lb, JSON.parse(lb)) === 'رد' && !TG_OUTBOX.length && !TG_MEM['notify'].length);
    var fb = JSON.stringify({ kind: 'wp_sec', event: '2fa', user: 'admin', code: '123456' });
    TG_OUTBOX = [];
    var fr = wpSecIn_(wsSig(fb), fb, JSON.parse(fb));
    ok('کد ورود به مالک می‌رود و در گزارش ارسال پوشانده است', fr === 'رفت' && TG_OUTBOX.length === 1 && TG_OUTBOX[0].text.indexOf('123456') > -1 && TG_OUTBOX[0].log.indexOf('123456') < 0);
    var bb = JSON.stringify({ kind: 'wp_sec', event: '2fa', user: 'admin', code: '12ab' });
    TG_OUTBOX = [];
    ok('کد نامعتبر فرستاده نمی‌شود', wpSecIn_(wsSig(bb), bb, JSON.parse(bb)) === 'نامعتبر' && !TG_OUTBOX.length);
    TG_MEM['wpsec:owner'] = '';
    var nb = JSON.stringify({ kind: 'wp_sec', event: 'login', user: 'admin', n: 2 });
    ok('بی chat مالک چیزی نمی‌رود', wpSecIn_(wsSig(nb), nb, JSON.parse(nb)) === 'بی مالک');
    /* v170.16.1: عوض کردن رمز بی وقفه */
    TG_MEM['ss:enforce'] = true; TG_MEM['ss:nonce'] = {}; TG_MEM['ss:nowms'] = 1790000000000;
    var OLD = 'o'.repeat(40), NEW = 'n'.repeat(40);
    TG_MEM['ss:secret'] = ''; TG_MEM['ssp:' + SS_PROP] = OLD;
    function sg(b, key) { return { parameter: { ts: '1790000000', sig: ssHex_(Utilities.computeHmacSha256Signature('1790000000.' + b, key)) } }; }
    ok('رمز اول مستقیم می‌نشیند', ssRotIn_('X_SEC', NEW) === 'set' && TG_MEM['ssp:X_SEC'] === NEW);
    ok('رمز تازه روی رمز فعلی نمی‌نشیند و منتظر سایت می‌ماند', ssRotIn_(SS_PROP, NEW) === 'next' && TG_MEM['ssp:' + SS_PROP] === OLD && TG_MEM['ssp:' + SS_PROP + '_NEXT'] === NEW);
    ok('در فاصلهٔ دو انتشار لید با رمز قبلی سایت پذیرفته است', ssGate_(sg(raw, OLD), raw) === true && TG_MEM['ssp:' + SS_PROP] === OLD);
    TG_MEM['ss:nonce'] = {};
    ok('اولین لید با رمز تازه پذیرفته می‌شود و رمز تازه فعلی می‌شود', ssGate_(sg(raw, NEW), raw) === true && TG_MEM['ssp:' + SS_PROP] === NEW && !TG_MEM['ssp:' + SS_PROP + '_NEXT'] && TG_MEM['ssp:' + SS_PROP + '_PREV'] === OLD);
    TG_MEM['ss:nonce'] = {};
    ok('رمز قبلی تا ۶ ساعت پذیرفته است', ssGate_(sg(raw, OLD), raw) === true);
    TG_MEM['ss:nonce'] = {}; TG_MEM['ss:nowms'] = 1790000000000 + SS_ROT_KEEP_MS + 1000;
    ok('بعد از ۶ ساعت رمز قبلی رد و پاک می‌شود', ssGate_(sg(raw, OLD), raw) === false && !TG_MEM['ssp:' + SS_PROP + '_PREV']);
    ok('همان رمز دوباره از گردش کار: بی‌تغییر', ssRotIn_(SS_PROP, NEW) === 'same' && !TG_MEM['ssp:' + SS_PROP + '_NEXT']);
    TG_MEM['ss:nowms'] = 1790000000000;
    TG_MEM['ssp:' + SS_CAMP_PROP] = OLD; ssRotIn_(SS_CAMP_PROP, NEW);
    var site = OLD, sent = [];
    TG_MEM['ss:fetch'] = function (u, o) { var s0 = o.headers['x-tj-secret']; sent.push(s0 === NEW ? 'n' : 'o'); var c0 = s0 === site ? 200 : 401; return { getResponseCode: function () { return c0; }, getContentText: function () { return ''; } }; };
    var r1 = ssCampFetch_('https://example.invalid/camp-push', { a: 1 });
    ok('کمپین پیش از انتشار سایت: رمز تازه رد، رمز فعلی ۲۰۰، بی جابه‌جایی', r1.getResponseCode() === 200 && sent.join('') === 'no' && TG_MEM['ssp:' + SS_CAMP_PROP] === OLD);
    site = NEW; sent = [];
    var r2 = ssCampFetch_('https://example.invalid/camp-push', { a: 1 });
    ok('کمپین بعد از انتشار سایت: رمز تازه ۲۰۰ و فعلی می‌شود', r2.getResponseCode() === 200 && sent.join('') === 'n' && TG_MEM['ssp:' + SS_CAMP_PROP] === NEW && !TG_MEM['ssp:' + SS_CAMP_PROP + '_NEXT']);
    sent = [];
    ssCampFetch_('https://example.invalid/camp-push', { a: 1 });
    ok('بعد از جابه‌جایی فقط یک درخواست با رمز تازه', sent.join('') === 'n');
    delete TG_MEM['ssp:' + SS_CAMP_PROP];
    ok('بی رمز کمپین null', ssCampFetch_('https://example.invalid/camp-push', {}) === null && !ssCampHas_());
  } catch (e) { fail++; log.push('✗ استثنا: ' + e); }
  finally { TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; }
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ امنیت ورودی سایت درست است'));
  return { pass: log.length - fail, fail: fail, log: log };
}
