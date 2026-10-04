/**
 * wppage.gs · v169.4 · ۱۱ مهر ۱۴۰۵ · انتشار خودکار صفحهٔ مینی‌اپ (برگهٔ وردپرس 503886) بعد از هر دیپلوی سبز
 *
 * چرا: Cowork هر روز صفحهٔ /app/ را دستی با site/pages/503886-app.html همگام می‌کرد. حالا خود بات این کار را می‌کند.
 * - گردش کار site/pages/503886-app.html را به شکل متن دقیق (رشتهٔ WP_PAGE_SRC) در فایل app_page.gs پروژه می‌گذارد (v170.5؛ در گیت فقط یک نسخه هست).
 * - بعد از انتشار و پایش سبز، گردش کار { ci: 'pagesync', sha } می‌فرستد و wpPageSync_ اجرا می‌شود:
 *   محتوای خام زنده را می‌خواند؛ اگر با فایل یکی است کاری نمی‌کند؛ وگرنه سه نگهبان (حداقل ۵۰۰۰۰ نویسه، id="tjapp"،
 *   شمار && بیشتر از نسخهٔ زنده نباشد) و بعد PUT، دوباره خواندن و مقایسه. اگر یکی نبود، محتوای قبلی برمی‌گردد.
 * - نتیجه در Script Property `WP_PAGE_LAST` و یک خط در گزارش سلامت.
 * - فقط برگهٔ 503886. شناسه ثابت است و هیچ تابعی شناسهٔ دیگری نمی‌گیرد.
 * - نام کاربری و رمز برنامه (کاربر Editor) فقط در Script Properties: WP_BOT_USER و WP_BOT_APP_PASSWORD
 *   (گردش کار از سکرت‌های گیت‌هاب می‌گذارد؛ هرگز در کد، لاگ یا خروجی نمی‌آید).
 */

var WP_PAGE_ID = 503886;
var WP_PAGE_FILE = 'app_page';
var WP_PAGE_MIN = 50000;
var WP_PAGE_BASE = 'https://tajrobeh.life/wp-json/wp/v2/pages/';

function wpPageDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function wpPageUrl_() { return WP_PAGE_BASE + WP_PAGE_ID; }
function wpPageAmp_(s) { return (String(s || '').match(/&&/g) || []).length; }
function wpPageNorm_(s) { return String(s || '').replace(/\r\n?/g, '\n').replace(/\s+$/, ''); }
function wpPageSha_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

/* محتوای فایل صفحه در پروژه (خشک: TG_MEM) */
function wpPageRepo_() {
  if (wpPageDry_()) return TG_MEM['wpp:repo'] || '';
  /* v170.5: متن دقیق صفحه در app_page.gs (رشتهٔ WP_PAGE_SRC)؛ خواندن فایل HTML با HtmlService محتوا را عوض می‌کرد */
  return typeof WP_PAGE_SRC === 'string' ? WP_PAGE_SRC : '';
}

/* تنها راه تماس با وردپرس در این فایل؛ نشانی همیشه wpPageUrl_() است */
function wpPageCall_(method, raw) {
  var url = wpPageUrl_() + (method === 'get' ? '?context=edit&_fields=id,content' : '');
  if (wpPageDry_()) return TG_MEM['wpp:fetch'](method, url, raw);
  var P = PropertiesService.getScriptProperties();
  var u = P.getProperty('WP_BOT_USER') || '', pw = P.getProperty('WP_BOT_APP_PASSWORD') || '';
  if (!u || !pw) return { code: 0, error: 'creds' };
  var opt = { method: method, muteHttpExceptions: true, followRedirects: false,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(u + ':' + pw, Utilities.Charset.UTF_8) } };
  if (method === 'put') { opt.contentType = 'application/json'; opt.payload = JSON.stringify({ content: raw }); }
  var r = UrlFetchApp.fetch(url, opt), code = r.getResponseCode(), j = null;
  try { j = JSON.parse(r.getContentText()); } catch (e) {}
  return { code: code, json: j };
}
function wpPageRead_() {
  var r = wpPageCall_('get');
  if (r.code !== 200 || !r.json || Number(r.json.id) !== WP_PAGE_ID || !r.json.content || typeof r.json.content.raw !== 'string') return { ok: false, code: r.code || r.error };
  return { ok: true, raw: r.json.content.raw };
}
function wpPageWrite_(raw) { var r = wpPageCall_('put', raw); return { ok: r.code === 200, code: r.code || r.error }; }

/* نگهبان‌ها پیش از هر نوشتن */
function wpPageGuard_(neu, live) {
  if (neu.length < WP_PAGE_MIN) return 'صفحه کوتاه‌تر از ' + WP_PAGE_MIN + ' نویسه است (' + neu.length + ')';
  if (neu.indexOf('id="tjapp"') < 0) return 'id="tjapp" در صفحه نیست';
  if (wpPageAmp_(neu) > wpPageAmp_(live)) return 'شمار && بیشتر از نسخهٔ زنده است (' + wpPageAmp_(neu) + ' در برابر ' + wpPageAmp_(live) + ')';
  return '';
}

/* sha: هش SHA-256 فایل در گیت (از گردش کار)؛ اگر فایل پروژه با آن یکی نبود، نوشته نمی‌شود */
function wpPageSync_(sha) {
  var res = (function () {
    var neu = wpPageRepo_();
    if (!neu) return { ok: false, msg: 'فایل صفحه در پروژه نیست' };
    if (sha && wpPageSha_(wpPageNorm_(neu)) !== String(sha)) return { ok: false, msg: 'فایل صفحه در پروژه با گیت یکی نیست' };
    var live = wpPageRead_();
    if (!live.ok) return { ok: false, msg: 'خواندن صفحهٔ زنده نشد (' + live.code + ')' };
    if (wpPageNorm_(live.raw) === wpPageNorm_(neu)) return { ok: true, changed: false, msg: 'صفحه تغییری نداشت' };
    var why = wpPageGuard_(neu, live.raw);
    if (why) return { ok: false, msg: 'نوشته نشد: ' + why };
    var w = wpPageWrite_(neu), back = w.ok ? wpPageRead_() : { ok: false };
    if (w.ok && back.ok && wpPageNorm_(back.raw) === wpPageNorm_(neu)) return { ok: true, changed: true, msg: 'صفحه به‌روز شد' };
    /* برگرداندن محتوای قبلی و سنجیدن آن */
    var rw = wpPageWrite_(live.raw), rb = rw.ok ? wpPageRead_() : { ok: false };
    var restored = rw.ok && rb.ok && wpPageNorm_(rb.raw) === wpPageNorm_(live.raw);
    return { ok: false, restored: restored, msg: (w.ok ? 'محتوای خوانده‌شده با فایل یکی نبود' : 'نوشتن نشد (' + w.code + ')') +
      (restored ? '؛ محتوای قبلی برگشت' : '؛ برگرداندن محتوای قبلی هم نشد، دستی بررسی شود') };
  })();
  res.at = Date.now();
  res.ver = typeof TG_CODE_VERSION !== 'undefined' ? TG_CODE_VERSION : '';
  if (!wpPageDry_()) PropertiesService.getScriptProperties().setProperty('WP_PAGE_LAST', JSON.stringify({ at: res.at, ok: res.ok, changed: !!res.changed, msg: res.msg, ver: res.ver }));
  else TG_MEM['wpp:last'] = res;
  return res;
}
/* یک خط برای گزارش سلامت */
function wpPageHealth_() {
  var s = wpPageDry_() ? JSON.stringify(TG_MEM['wpp:last'] || '') : PropertiesService.getScriptProperties().getProperty('WP_PAGE_LAST');
  var o = null; try { o = JSON.parse(s || 'null'); } catch (e) {}
  if (!o) return { state: 'هنوز اجرا نشده' };
  return { ok: !!o.ok, changed: !!o.changed, msg: String(o.msg || ''), ver: String(o.ver || ''), min: Math.round((Date.now() - Number(o.at || 0)) / 60000) };
}

/* سکرت‌های وردپرس از گردش کار به Script Properties؛ فقط همین دو نام (و از v170.4 رمزهای CI_SECRET_PROPS)، مقدار هرگز برنمی‌گردد */
var WP_PAGE_PROPS = ['WP_BOT_USER', 'WP_BOT_APP_PASSWORD'];
function wpPageProps_(props) {
  var set = [];
  WP_PAGE_PROPS.forEach(function (k) {
    var v = props && props[k];
    if (typeof v !== 'string' || !v.trim()) return;
    if (!wpPageDry_()) PropertiesService.getScriptProperties().setProperty(k, v.trim()); else TG_MEM['wpp:prop:' + k] = v.trim();
    set.push(k);
  });
  /* v170.4: رمزهای مشترک با سایت (عوض کردن رمز کمپین، امضای لید). فقط همین نام‌ها، فقط وقتی دست‌کم ۳۲ نویسه است؛ مقدار برنمی‌گردد */
  var sec = [];
  CI_SECRET_PROPS.forEach(function (k) {
    var v = props && props[k];
    if (typeof v !== 'string' || v.trim().length < 32) return;
    if (!wpPageDry_()) PropertiesService.getScriptProperties().setProperty(k, v.trim()); else TG_MEM['wpp:prop:' + k] = v.trim();
    sec.push(k);
  });
  if (sec.length && !wpPageDry_()) { try { CacheService.getScriptCache().remove('sssec'); } catch (e) {} }
  var flag = wpPageFlag_(props);
  return { ok: set.length === WP_PAGE_PROPS.length, set: set, sec: sec, flag: flag };
}
var CI_SECRET_PROPS = ['CP_WP_SECRET', 'SITE_LEAD_SECRET'];
/* v170.9: کلید اجبار امضای لید سایت از متغیر GitHub «SITE_SIG_ENFORCE» (فقط ۰ یا ۱) */
function wpPageFlag_(props) {
  var v = props && props.SITE_SIG_ENFORCE;
  if (v !== '0' && v !== '1') return '';
  if (!wpPageDry_()) PropertiesService.getScriptProperties().setProperty('SITE_SIG_ENFORCE', v); else TG_MEM['wpp:prop:SITE_SIG_ENFORCE'] = v;
  return 'SITE_SIG_ENFORCE=' + v;
}

/* ---------------- تست خشک ---------------- */
function wpPageTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM;
  TG_DRY = true; TG_MEM = {};
  try {
    var pad = new Array(WP_PAGE_MIN + 10).join('x');
    var LIVE = '<!-- wp:html --><div id="tjapp"></div><script>a && b</script>' + pad;
    var NEW = '<!-- wp:html --><div id="tjapp"></div><script>if (a) b</script>' + pad;
    var site = { raw: LIVE }, urls = [], puts = 0, mangle = false;
    TG_MEM['wpp:fetch'] = function (m, url, raw) {
      urls.push(url);
      if (m === 'put') { puts++; site.raw = mangle && raw === NEW ? raw.replace('<script>', '') : raw; return { code: 200, json: { id: WP_PAGE_ID } }; }
      return { code: 200, json: { id: WP_PAGE_ID, content: { raw: site.raw } } };
    };
    TG_MEM['wpp:repo'] = NEW;
    var r1 = wpPageSync_(wpPageSha_(wpPageNorm_(NEW)));
    ok('صفحهٔ تغییرکرده نوشته و دوباره خوانده شد', r1.ok && r1.changed && site.raw === NEW && puts === 1);
    var r2 = wpPageSync_('');
    ok('صفحهٔ بی‌تغییر نوشته نمی‌شود', r2.ok && !r2.changed && puts === 1);
    ok('فقط برگهٔ 503886 لمس شد', urls.every(function (u) { return u.indexOf(WP_PAGE_BASE + '503886') === 0 && u.replace(WP_PAGE_BASE, '').indexOf('503886') === 0; }));
    site.raw = LIVE; puts = 0;
    TG_MEM['wpp:repo'] = '<div id="tjapp"></div>';
    ok('صفحهٔ کوتاه‌تر از ۵۰۰۰۰ نویسه نوشته نمی‌شود', !wpPageSync_('').ok && puts === 0);
    TG_MEM['wpp:repo'] = '<div id="app"></div>' + pad;
    ok('صفحهٔ بی id="tjapp" نوشته نمی‌شود', !wpPageSync_('').ok && puts === 0);
    TG_MEM['wpp:repo'] = '<div id="tjapp"></div><script>a && b && c</script>' + pad;
    ok('صفحه با && بیشتر از نسخهٔ زنده نوشته نمی‌شود', !wpPageSync_('').ok && puts === 0);
    TG_MEM['wpp:repo'] = NEW;
    ok('فایل پروژه با هش گیت یکی نیست ← نوشته نمی‌شود', !wpPageSync_('00ff').ok && puts === 0);
    var pr = wpPageProps_({ CP_WP_SECRET: 'c'.repeat(64), SITE_LEAD_SECRET: 'short', OTHER: 'z'.repeat(64) });
    ok('v170.4: رمز کمپین ثبت شد، رمز کوتاه و نام ناشناخته نه', pr.sec.length === 1 && pr.sec[0] === 'CP_WP_SECRET' && TG_MEM['wpp:prop:CP_WP_SECRET'] === 'c'.repeat(64) && !TG_MEM['wpp:prop:OTHER'] && !TG_MEM['wpp:prop:SITE_LEAD_SECRET']);
    ok('v170.4: مقدار رمز در پاسخ نیست', JSON.stringify(pr).indexOf('ccc') < 0);
    mangle = true;
    var r3 = wpPageSync_('');
    ok('محتوای خوانده‌شده یکی نبود ← محتوای قبلی برگشت', !r3.ok && r3.restored && site.raw === LIVE && puts === 2);
    var h = wpPageHealth_();
    ok('یک خط در گزارش سلامت', h.ok === false && /برگشت/.test(h.msg));
    mangle = false;
    TG_MEM['wpp:fetch'] = function (m, url) { urls.push(url); return { code: 401, json: { code: 'rest_forbidden' } }; };
    ok('خطای ورود ← هیچ نوشتنی و پیام روشن', /401/.test(wpPageSync_('').msg));
    var pr = wpPageProps_({ WP_BOT_USER: 'u', WP_BOT_APP_PASSWORD: 'p', OTHER: 'x' });
    ok('فقط دو کلید مجاز در Script Properties و مقدار برنمی‌گردد', pr.ok && pr.set.join(',') === 'WP_BOT_USER,WP_BOT_APP_PASSWORD' && !TG_MEM['wpp:prop:OTHER'] && JSON.stringify(pr).indexOf('"p"') < 0);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ همگام‌سازی صفحهٔ مینی‌اپ درست است'));
  return tgTestTally_(log, fail);
}
