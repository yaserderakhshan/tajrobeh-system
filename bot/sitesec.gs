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

function ssSecret_() {
  if (TG_DRY) return TG_MEM['ss:secret'] || '';
  var c = CacheService.getScriptCache();
  var s = c.get('sssec');
  if (!s) { s = PropertiesService.getScriptProperties().getProperty(SS_PROP) || ''; if (s) c.put('sssec', s, 21600); }
  return s;
}

function ssHex_(bytes) {
  return bytes.map(function (b) { var h = (b & 0xff).toString(16); return h.length < 2 ? '0' + h : h; }).join('');
}

/* 'ok' | 'bad' | 'stale' | 'none' (بی امضا) | 'nokey' (رمز در بات نیست) */
function ssVerify_(e, raw) {
  var p = (e && e.parameter) || {};
  var sec = ssSecret_();
  if (!p.sig) return sec ? 'none' : 'nokey';
  if (!sec) return 'nokey';
  var ts = Number(p.ts || 0);
  var now = TG_DRY && TG_MEM['ss:now'] ? TG_MEM['ss:now'] : Math.floor(Date.now() / 1000);
  if (!ts || Math.abs(now - ts) > 300) return 'stale';
  var calc = ssHex_(Utilities.computeHmacSha256Signature(String(ts) + '.' + raw, sec));
  var given = String(p.sig).toLowerCase();
  if (given.length !== calc.length) return 'bad';
  var d = 0;
  for (var i = 0; i < calc.length; i++) d |= calc.charCodeAt(i) ^ given.charCodeAt(i);
  if (d !== 0) return 'bad';
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
  } catch (e) { fail++; log.push('✗ استثنا: ' + e); }
  finally { TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; }
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ امنیت ورودی سایت درست است'));
  return { pass: log.length - fail, fail: fail, log: log };
}
