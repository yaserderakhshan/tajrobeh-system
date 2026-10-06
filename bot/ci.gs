/**
 * مسیر دیپلوی خودکار (GitHub Actions، v166.7)
 *
 * گردش کار .github/workflows/bot-deploy.yml کد را با clasp می‌فرستد، روی همان
 * دیپلوی فعلی نسخهٔ تازه می‌سازد و بعد از همین‌جا تست‌ها را اجرا می‌کند.
 *
 * کلید: هر اجرای گردش کار یک کلید تصادفی یک‌بارمصرف می‌سازد و فقط هش SHA-256 آن را
 * همراه زمان انقضا در فایل ساخته‌شدهٔ ci_key.gs (CI_KEY_HASH، CI_KEY_EXP، CI_BUILD)
 * به پروژه می‌فرستد. ci_key.gs در گیت نیست. بدون آن فایل، یا بعد از انقضا،
 * هیچ درخواستی پذیرفته نمی‌شود. هیچ رمز ثابتی لازم نیست.
 *
 * درخواست‌ها (POST به /exec، بدنهٔ JSON):
 *   { ci: 'ping',   k }  ← نسخهٔ سروشده (CI_BUILD) را برمی‌گرداند
 *   { ci: 'start',  k }  ← دور تازهٔ tgRun را با تریگر شروع می‌کند
 *   { ci: 'status', k }  ← پیشرفت و نتیجهٔ دور فعلی از تب «تست‌ها»
 *   { ci: 'kick',   k }  ← اگر زنجیرهٔ تریگر مرد، از همان مجموعه ادامه می‌دهد
 *   { ci: 'resume', k }  ← (v166.8) تست‌ها سبز شد: کارهای زمان‌دار از توقف بیرون می‌آیند
 *   { ci: 'errs', k, since } ← (v166.8) خلاصهٔ تب «خطاها» از زمان since (میلی‌ثانیه)، بی‌اطلاعات شخصی
 *   { ci: 'props', k, props } ← (v169.4) فقط WP_BOT_USER و WP_BOT_APP_PASSWORD به Script Properties؛ مقدار برنمی‌گردد
 *                               (v170.4 رمزهای مشترک با سایت؛ v170.16.1 رمز تازه منتظر سایت می‌ماند و کلید دوم درگاه BOT_API_KEY)
 *   { ci: 'pagesync', k, sha } ← (v169.4) برگهٔ 503886 از فایل app_page.gs پروژه (wppage.gs)
 *   { ci: 'pagesha', k }       ← (v170.5) هش و طول متن صفحه در پروژه؛ تست استیجینگ آن را با هش گیت می‌سنجد
 *   { ci: 'once', k, fn } ← (v166.20) اجرای یک‌بارهٔ یک تابع نگهداری از فهرست CI_ONCE_ALLOW، فقط با اجرای دستی
 *                           گردش کار و تأیید یاسر. نتیجه در Script Properties (CI_ONCE:<تابع>) می‌ماند و بار دوم اجرا نمی‌شود.
 *
 * توقف کارهای زمان‌دار (v166.8): تریگرها همیشه آخرین کد push‌شده را اجرا می‌کنند، نه نسخهٔ دیپلوی‌شده را.
 * پس گردش کار در ci_key.gs مقدار CI_PAUSE_UNTIL را هم می‌گذارد. تا آن زمان، یا تا وقتی تست‌ها سبز شوند و
 * 'resume' بیاید، هر کار زمان‌داری که با تریگر صدا زده شده اجرا نمی‌شود: کارهای پرتکرار (هر ۱ تا ۱۵ دقیقه)
 * این نوبت را رد می‌کنند و کارهای روزانه، هفتگی و ساعتی با یک تریگر یک‌باره عقب می‌افتند و بعد از 'resume'
 * (یا حداکثر سر CI_PAUSE_UNTIL) اجرا می‌شوند. اگر تست قرمز شود، گردش کار کد قبلی را (بی ci_key.gs) push می‌کند
 * و توقف خودبه‌خود برداشته می‌شود. صدا زدن مستقیم (از تست یا کد دیگر) هیچ‌وقت متوقف نمی‌شود.
 */

function ciRoute_(body) {
  var out;
  try {
    if (!ciKeyOk_(body && body.k)) {
      out = { ok: false, error: 'key' };
    } else {
      var op = String(body.ci);
      if (op === 'ping') out = { ok: true, build: ciGlobal_('CI_BUILD') || '', version: ciGlobal_('TG_CODE_VERSION') || '' };
      else if (op === 'start') out = ciStart_(body.only, body.parts);
      else if (op === 'status') out = ciStatus_();
      else if (op === 'kick') out = ciKick_();
      else if (op === 'resume') out = ciResume_();
      else if (op === 'errs') out = ciErrs_(Number(body.since || 0));
      else if (op === 'stats') out = ciStats_();
      else if (op === 'once') out = ciOnce_(String(body.fn || ''));
      else if (op === 'onceAuto') out = ciOnceAuto_();
      else if (op === 'smoke') out = ciSmoke_();
      else if (op === 'health') out = ciHealth_();
      else if (op === 'auth') out = ciAuth_();   /* v169.2.2: مجوز تازهٔ تأییدنشده پیش از انتشار */
      else if (op === 'props') out = wpPageProps_(body.props || {});   /* v169.4: سکرت‌های وردپرس به Script Properties؛ مقدار برنمی‌گردد */
      else if (op === 'pagesync') out = wpPageSync_(String(body.sha || ''));
      else if (op === 'cfgcheck') { var P0 = PropertiesService.getScriptProperties(); try { cfgSync_(); } catch (eCs) {} /* v170.14: اول تب ← Property (کلید تازه مثل TG_NAMES که کد زندهٔ قبلی نمی‌شناخت) */ out = { ok: true, missing: cfgMissing_(), hook: !!P0.getProperty('TG_HOOK_SECRET'), token: !!P0.getProperty('TELEGRAM_TOKEN') }; }   /* v170.9: فقط بله یا نه، هرگز مقدار */   /* v170.9: تنظیمات خصوصی کامل است؟ (فقط نام کلیدها) */
      else if (op === 'pagesha') { var ps = wpPageRepo_(); out = { ok: !!ps, sha: ps ? wpPageSha_(wpPageNorm_(ps)) : '', len: ps.length }; }   /* v170.5 */   /* v169.4: انتشار برگهٔ 503886 بعد از دیپلوی سبز */
      else out = { ok: false, error: 'op' };
    }
  } catch (e) {
    out = { ok: false, error: String(e) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* v169.2.2: آیا کد این نسخه مجوزی می‌خواهد که مالک هنوز تأیید نکرده؟ REQUIRED یعنی بله (bot-tests.mjs متوقف می‌کند) */
function ciAuth_() {
  try { return { ok: true, status: String(ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL).getAuthorizationStatus()) }; }
  catch (e) { return { ok: true, status: 'UNKNOWN', error: String(e).slice(0, 120) }; }
}

/* ---------- آزمون دود روی دیپلوی اصلی (v166.29.1) ---------- */
/* بعد از انتشار، همان کد زنده دو مسیر ساخت لید را در حالت خشک می‌رود: بات (/start و فرستادن شماره) و فرم سایت.
   هیچ سطر، پیام یا رویدادی واقعی ساخته نمی‌شود (TG_DRY و نگهبان TG_IN_TEST). خروجی فقط بله/نه است، بی شماره و نام. */
function ciSmoke_() {
  var keep = { dry: TG_DRY, mem: TG_MEM, out: TG_OUTBOX, inT: TG_IN_TEST, leaks: TG_TEST_LEAKS };
  var res = { ok: true, bot: false, site: false, leak: [] };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; TG_IN_TEST = true; TG_TEST_LEAKS = [];
  try {
    var chat = 777009, from = { id: chat, first_name: 'آزمون' };
    tgHandle({ update_id: 0, message: { message_id: 1, chat: { id: chat, type: 'private' }, from: from, text: '/start' } });
    var replied = TG_OUTBOX.some(function (x) { return x.kind === 'api' || x.kind === 'send' || x.text; });
    tgHandle({ update_id: 0, message: { message_id: 2, chat: { id: chat, type: 'private' }, from: from, contact: { phone_number: '09120006919' } } });
    res.bot = replied && TG_OUTBOX.some(function (x) { return x.kind === 'lead'; });
    TG_OUTBOX = [];
    handleWebForm_({ name: 'آزمون دود', mobile: '09120006918', source: 'سایت › پذیرش › آزمون دود', form_title: 'آزمون دود', message: 'آزمون' });
    res.site = TG_OUTBOX.some(function (x) { return x.kind === 'lead'; });
  } catch (e) { res.error = String(e).slice(0, 200); }
  finally {
    res.leak = TG_TEST_LEAKS.slice(0, 5);
    TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.out; TG_IN_TEST = keep.inT; TG_TEST_LEAKS = keep.leaks;
  }
  res.ok = res.bot && res.site && !res.leak.length && !res.error;
  return res;
}

/* سلامت بی‌دادهٔ شخصی: صف و آخرین خطای وبهوک (پوشانده)، پینگ رله، تریگرها، آخرین فرستادن فهرست همکاران و کمپین به سایت */
function ciHealth_() {
  var P = PropertiesService.getScriptProperties(), now = Date.now(), ago = function (t) { t = Number(t || 0); return t ? Math.round((now - t) / 60000) : null; };
  var out = { ok: true };
  try {
    var r = (JSON.parse(tgApi_('getWebhookInfo', {}).getContentText()) || {}).result || {};
    out.hook = { set: !!r.url, viaRelay: /workers\.dev/.test(String(r.url || '')), pending: r.pending_update_count || 0,
      lastErrMin: r.last_error_date ? Math.round((now / 1000 - r.last_error_date) / 60) : null,
      lastErr: r.last_error_message ? tgSecretMask_(String(r.last_error_message)).slice(0, 120) : '' };
  } catch (e) { out.hook = { error: String(e).slice(0, 120) }; }
  var ping = Number(P.getProperty('TG_RELAY_PING2') || 0), pong = Number(P.getProperty('TG_RELAY_PONG') || 0);
  var rcode = P.getProperty('TG_RELAY_CODE');
  out.relay = { state: rcode && rcode !== '200' ? 'http ' + rcode : tgRelayState_(ping, pong, now), pingMin: ago(ping), pongMin: ago(pong) };
  try {
    var tc = {};
    ScriptApp.getProjectTriggers().forEach(function (t) { var f = t.getHandlerFunction(); tc[f] = (tc[f] || 0) + 1; });
    out.triggers = tc;
    out.trigCount = Object.keys(tc).reduce(function (s, k) { return s + tc[k]; }, 0);   /* v169.1: سقف Apps Script ۲۰ */
  } catch (e2) { out.triggers = { error: String(e2).slice(0, 80) }; }
  out.push = { thersMin: ago(P.getProperty('TH_PUSH_AT')), thers404Min: ago(P.getProperty('TH_PUSH_404')), campMin: ago(P.getProperty('CP_PUSH_AT')) };
  /* کش فهرست همکاران روی خود سایت: منبع (cache/stale/backup) و سن به ثانیه؛ فقط همین دو، نه فهرست */
  try {
    var sr = UrlFetchApp.fetch('https://tajrobeh.life/wp-json/tj/v1/thers', { muteHttpExceptions: true });
    var sj = sr.getResponseCode() === 200 ? JSON.parse(sr.getContentText()) : null;
    out.site = sj ? { ok: !!sj.ok, src: String(sj.src || ''), age: Number(sj.age || 0), n: (sj.list || []).length } : { http: sr.getResponseCode() };
  } catch (e3) { out.site = { error: String(e3).slice(0, 80) }; }
  try { if (typeof dqHealth_ === 'function') out.dq = dqHealth_(); } catch (e5) { out.dq = { error: String(e5).slice(0, 80) }; }   /* v170: زمان اجرای صف ارسال (جدا از سهمیهٔ RS:) */
  try { out.page = wpPageHealth_(); } catch (e4) { out.page = { error: String(e4).slice(0, 80) }; }   /* v169.4: آخرین همگام‌سازی برگهٔ مینی‌اپ */
  out.evFlushMin = (function () { var m = Number(P.getProperty('TG_EV_LAST') || 0); return m ? Math.round(now / 60000 - m) : null; })();
  return out;
}

/* ---------- اجرای یک‌باره (v166.20) ---------- */
/* فقط این توابع؛ هر کدام با تأیید یاسر به این فهرست می‌آید. خروجی‌شان نباید اطلاعات شخصی داشته باشد (فقط شمارش). */
var CI_ONCE_ALLOW = ['tgApResumePrivatize', 'tgErrScrub', 'tgChatCellAudit', 'tgErrMarkFixed', 'tgSchNameFix', 'tgNdPurge', 'pbSetup', 'tgV168Hygiene', 'tgV168NextFill', 'tgV168QueueSetup', 'tgV168RefSetup', 'tgV168ModeSplit', 'tgV168VocabMigrate', 'tgV1689Setup', 'tgV16810Ticks', 'tgV169Setup', 'tgV1691Triggers', 'tgV1692Setup', 'tgV170Seed', 'tgV1701SendDry', 'tgV1702Plan', 'tgV1708Cfg', 'tgV1709CfgTab', 'tgV17013Setup', 'tgV17013Capped', 'tgV17013LmPlan', 'tgV17021CmFixPreview', 'tgV170222CmFix', 'tgV170231CmFix', 'tgV170232DirRetry', 'tgV170234CmFix2'];
/* v166.22: این‌ها بعد از هر انتشار سبز خودکار یک بار اجرا می‌شوند (اگر قبلاً اجرا نشده‌اند)؛ هر کدام باید در CI_ONCE_ALLOW هم باشد */
var CI_ONCE_AUTO = ['tgErrScrub', 'tgChatCellAudit', 'tgErrMarkFixed', 'tgSchNameFix', 'tgNdPurge', 'pbSetup', 'tgV168Hygiene', 'tgV168NextFill', 'tgV168QueueSetup', 'tgV168RefSetup', 'tgV168ModeSplit', 'tgV168VocabMigrate', 'tgV1689Setup', 'tgV16810Ticks', 'tgV169Setup', 'tgV1691Triggers', 'tgV1692Setup', 'tgV170Seed', 'tgV1701SendDry', 'tgV1702Plan', 'tgV1708Cfg', 'tgV1709CfgTab', 'tgV17013Setup', 'tgV17013Capped', 'tgV17013LmPlan', 'tgV17021CmFixPreview', 'tgV170222CmFix', 'tgV170231CmFix', 'tgV170232DirRetry', 'tgV170234CmFix2'];
function ciOnceAuto_() {
  var out = [];
  for (var i = 0; i < CI_ONCE_AUTO.length; i++) {
    try { var r = ciOnce_(CI_ONCE_AUTO[i]); out.push({ fn: CI_ONCE_AUTO[i], ok: r.ok, already: !!r.already, out: r.result ? r.result.out : (r.error || '') }); }
    catch (e) { out.push({ fn: CI_ONCE_AUTO[i], ok: false, out: String(e).slice(0, 120) }); }
  }
  return { ok: true, runs: out };
}
function ciOnce_(fn, run) {
  if (CI_ONCE_ALLOW.indexOf(fn) < 0) return { ok: false, error: 'not allowed' };
  var p = PropertiesService.getScriptProperties(), key = 'CI_ONCE:' + fn;
  var done = p.getProperty(key);
  if (done) return { ok: true, fn: fn, already: true, result: JSON.parse(done) };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, error: 'lock' };
  try {
    done = p.getProperty(key);
    if (done) return { ok: true, fn: fn, already: true, result: JSON.parse(done) };
    var f = run || ciGlobal_(fn);
    if (typeof f !== 'function') return { ok: false, error: 'no function' };
    /* خروجی فقط شمارش است؛ عددها می‌مانند ولی ایمیل، لینک و یوزرنیم مثل ciMask_ پوشانده می‌شوند */
    var out = String(f()).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>').replace(/https?:\/\/\S+/g, '<url>').replace(/@[A-Za-z0-9_]{3,}/g, '@<user>').slice(0, 200);
    var r = { at: new Date().toISOString(), out: out };
    p.setProperty(key, JSON.stringify(r));
    return { ok: true, fn: fn, already: false, result: r };
  } finally { lock.releaseLock(); }
}

function ciGlobal_(name) {
  var g = (typeof globalThis !== 'undefined') ? globalThis : this;
  return g[name];
}

function ciSha256Hex_(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  var h = '';
  for (var i = 0; i < b.length; i++) h += ('0' + (b[i] & 0xff).toString(16)).slice(-2);
  return h;
}

/* hash و exp برای تست؛ در اجرای واقعی از ci_key.gs خوانده می‌شوند */
function ciKeyOk_(k, hash, exp, now) {
  if (hash === undefined) hash = ciGlobal_('CI_KEY_HASH');
  if (exp === undefined) exp = ciGlobal_('CI_KEY_EXP');
  if (now === undefined) now = Date.now();
  k = String(k || '');
  if (k.length < 32) return false;
  if (typeof hash !== 'string' || hash.length !== 64) return false;
  if (typeof exp !== 'number' || !(now < exp)) return false;
  return ciSha256Hex_(k) === hash.toLowerCase();
}

/* ---------- توقف کارهای زمان‌دار در زمان دیپلوی (v166.8) ---------- */
/* فقط وقتی تریگر صدا زده (e.triggerUid) و CI_PAUSE_UNTIL هنوز نگذشته و 'resume' همین build نیامده. */
function ciPaused_(e, fn, mode) {
  if (typeof TG_DRY !== 'undefined' && TG_DRY) return false;
  if (!e || !e.triggerUid) return false;
  var until = ciGlobal_('CI_PAUSE_UNTIL');
  if (typeof until !== 'number' || !(Date.now() < until)) return false;
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('CI_RESUMED') === String(ciGlobal_('CI_BUILD') || '')) return false;
  if (mode === 'defer') { try { ciDefer_(fn, until, p); } catch (x) { try { console.error('ciDefer_ ' + fn + ': ' + x); } catch (y) {} } }
  return true;
}

/* کار عقب‌افتاده: نامش در CI_DEFERRED می‌نشیند و فقط یک تریگر یک‌بارهٔ ciRunDeferred سر CI_PAUSE_UNTIL ساخته می‌شود
   (سقف Apps Script ۲۰ تریگر برای هر پروژه است و بات نزدیک آن است). 'resume' همان را زودتر اجرا می‌کند. */
function ciDefer_(fn, until, p) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var list = ciDeferList_(p);
    if (list.indexOf(fn) < 0) { list.push(fn); p.setProperty('CI_DEFERRED', JSON.stringify(list)); }
    /* v166.8.1: اگر دیپلوی قبلی برگشت خورده باشد، CI_DEFER_TRIG به تریگری اشاره می‌کند که دیگر نیست؛ آن را نپذیر */
    var uid = p.getProperty('CI_DEFER_TRIG'), live = false;
    if (uid) { var ts = ScriptApp.getProjectTriggers(); for (var j = 0; j < ts.length; j++) if (ts[j].getUniqueId() === uid) live = true; }
    if (!live) {
      var t = ScriptApp.newTrigger('ciRunDeferred').timeBased().at(new Date(until + 60 * 1000)).create();
      p.setProperty('CI_DEFER_TRIG', t.getUniqueId());
    }
  } finally { lock.releaseLock(); }
}
function ciDeferList_(p) {
  try { var l = JSON.parse(p.getProperty('CI_DEFERRED') || '[]'); return Array.isArray(l) ? l : []; } catch (x) { return []; }
}
function ciDeferTrigsOff_() {
  var ts = ScriptApp.getProjectTriggers();
  for (var j = 0; j < ts.length; j++) if (ts[j].getHandlerFunction() === 'ciRunDeferred') ScriptApp.deleteTrigger(ts[j]);
}

function ciResume_() {
  var p = PropertiesService.getScriptProperties();
  p.setProperty('CI_RESUMED', String(ciGlobal_('CI_BUILD') || ''));
  var list = ciDeferList_(p), note = '';
  if (list.length) {
    try {
      ciDeferTrigsOff_();
      var t = ScriptApp.newTrigger('ciRunDeferred').timeBased().after(5000).create();
      p.setProperty('CI_DEFER_TRIG', t.getUniqueId());
    } catch (x) { note = String(x); }   /* نشد: همان تریگر سر CI_PAUSE_UNTIL هنوز هست (اگر ساخته شده بود) */
  }
  return { ok: true, resumed: true, deferred: list, note: note };
}

/* تریگر: کارهای عقب‌افتاده را یکی‌یکی اجرا می‌کند (صدا زدن مستقیم، پس دیگر متوقف نمی‌شوند). اگر وقت کم آمد، بقیه یک دقیقه بعد. */
function ciRunDeferred() {
  var p = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  var list;
  try {
    list = ciDeferList_(p);
    p.deleteProperty('CI_DEFERRED'); p.deleteProperty('CI_DEFER_TRIG');
    ciDeferTrigsOff_();
  } finally { lock.releaseLock(); }
  var t0 = Date.now(), g = (typeof globalThis !== 'undefined') ? globalThis : this;
  for (var i = 0; i < list.length; i++) {
    if (Date.now() - t0 > 4 * 60 * 1000) {
      p.setProperty('CI_DEFERRED', JSON.stringify(list.slice(i)));
      try { var t = ScriptApp.newTrigger('ciRunDeferred').timeBased().after(60 * 1000).create(); p.setProperty('CI_DEFER_TRIG', t.getUniqueId()); } catch (x) { tgErr_('ciRunDeferred', x); }
      return;
    }
    try { if (typeof g[list[i]] === 'function') g[list[i]](); } catch (e) { tgErr_('ciRunDeferred ' + list[i], e); }
  }
}

/* ---------- سنجش زمان اجرای کارهای زمان‌دار (v166.18، فقط اندازه‌گیری) ----------
   سقف روزانهٔ تریگرها در حساب شخصی ۹۰ دقیقه است. هر تریگر در پایان، تعداد و مجموع میلی‌ثانیه‌اش را در
   RS:<روز تهران> (Script Properties) جمع می‌کند؛ ۱۰ روز آخر نگه داشته می‌شود. در حالت خشک (تست) چیزی نوشته نمی‌شود.
   گزارش: ci 'stats' (در هر دیپلوی در Summary اجرا چاپ می‌شود). */
function tgRunStat_(fn, t0) {
  if (typeof TG_DRY !== 'undefined' && TG_DRY) return;
  try {
    var ms = Date.now() - t0, p = PropertiesService.getScriptProperties();
    var day = Utilities.formatDate(new Date(), 'Asia/Tehran', 'yyyy-MM-dd'), k = 'RS:' + day, o = {};
    try { o = JSON.parse(p.getProperty(k) || '{}'); } catch (e) { o = {}; }
    var x = o[fn] || [0, 0, 0]; x[0]++; x[1] += ms; if (ms > x[2]) x[2] = ms; o[fn] = x;
    p.setProperty(k, JSON.stringify(o));
    if (!o._c) { o._c = 1; p.setProperty(k, JSON.stringify(o)); ciRunStatTrim_(p, day); }
  } catch (e) {}
}
function ciRunStatTrim_(p, day) {
  var keys = p.getKeys().filter(function (k) { return k.indexOf('RS:') === 0; }).sort();
  while (keys.length > 10) p.deleteProperty(keys.shift());
}
function ciStats_() {
  var p = PropertiesService.getScriptProperties(), out = {};
  p.getKeys().filter(function (k) { return k.indexOf('RS:') === 0; }).sort().forEach(function (k) {
    try { var o = JSON.parse(p.getProperty(k) || '{}'); delete o._c; out[k.slice(3)] = o; } catch (e) {}
  });
  return { ok: true, days: out };
}

/* ---------- خلاصهٔ تب «خطاها» برای پایش بعد از دیپلوی (v166.8) ---------- */
/* فقط زمان، نام تابع، تعداد و متن کوتاه‌شده؛ عدد، ایمیل، یوزرنیم و لینک پوشانده می‌شوند و ستون «مرجع» هرگز برنمی‌گردد. */
function ciMask_(s) {
  return String(s || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/@[A-Za-z0-9_]{3,}/g, '@<user>')
    .replace(/[0-9۰-۹٠-٩]{3,}/g, '#')
    .slice(0, 140);
}

function ciErrs_(since) {
  var sh = tgErrSheet_();
  if (!sh || sh.getLastRow() < 2) return { ok: true, rows: [] };
  var last = sh.getLastRow(), from = Math.max(2, last - 1500);
  var v = sh.getRange(from, 1, last - from + 1, 6).getValues(), rows = [];
  for (var i = 0; i < v.length; i++) {
    var t = v[i][1] instanceof Date ? v[i][1].getTime() : 0;
    if (!t || t < since) continue;
    rows.push({ t: t, where: ciMask_(v[i][2]).slice(0, 60), msg: ciMask_(v[i][4]), n: Number(v[i][5] || 1) });
  }
  /* v166.12: خطاهای مسیر فرم سایت و وبهوک (Code.gs → logError_) در تب «Errors» هاب تجربه. ستون سوم (دادهٔ خام فرم) هرگز خوانده نمی‌شود. */
  try {
    var eh = tgSS_().getSheetByName('Errors');
    if (eh && eh.getLastRow() >= 1) {
      var el = eh.getLastRow(), ef = Math.max(1, el - 500), ev = eh.getRange(ef, 1, el - ef + 1, 2).getValues();
      for (var j = 0; j < ev.length; j++) {
        var te = ev[j][0] instanceof Date ? ev[j][0].getTime() : 0;
        if (!te || te < since) continue;
        var msg = String(ev[j][1] || '');
        if (msg === 'فرم تستی نادیده گرفته شد') continue;   /* خطا نیست */
        rows.push({ t: te, where: 'Code.gs', msg: ciMask_(msg), n: 1 });
      }
    }
  } catch (e) {}
  return { ok: true, rows: rows };
}

function ciTriggersOff_() {
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === 'tgRun' && ts[i].getEventType() === ScriptApp.EventType.CLOCK) {
      ScriptApp.deleteTrigger(ts[i]);
    }
  }
}

function ciStart_(only, parts) {
  ciTriggersOff_();
  tgRunReset();
  var P = PropertiesService.getScriptProperties(), all = TG_SUITES.length;
  /* v170.22.1: نقشهٔ تکه‌های «اصلی» بر اساس زمان واقعی (bot-parts.mjs)؛ نادرست یا خالی = سه تکهٔ پیش‌فرض */
  var pl = ciPartsClean_(parts);
  if (pl) P.setProperty('TG_TEST_PARTS', JSON.stringify(pl)); else P.deleteProperty('TG_TEST_PARTS');
  P.deleteProperty('TG_TEST_STIMES');
  /* v170.16.2: دور محدود (فقط مجموعه‌های مربوط به تغییر)؛ بی only یعنی دور کامل */
  if (only && only.length) P.setProperty(CI_ONLY_PROP, JSON.stringify({ at: Date.now(), fns: only.map(String).slice(0, 300) }));
  else P.deleteProperty(CI_ONLY_PROP);
  ciScope_.done = false; ciScope_();
  ScriptApp.newTrigger('tgRun').timeBased().after(1000).create();
  P.setProperty('CI_TEST_START', String(Date.now()));
  return { ok: true, suites: TG_SUITES.length, all: all };
}

/* v170.16.2 (سهمیهٔ روزانهٔ Apps Script، تصمیم یاسر): آزمون کامل روی Apps Script فقط شب. در انتشار روز bot-tests.mjs
   فهرست مجموعه‌های مربوط را می‌فرستد و این دور فقط همان‌ها را دارد. فهرست تا ۴ ساعت معتبر است. TG_SUITES در هر اجرا
   (tgRun، status، kick) همین‌جا کوتاه می‌شود تا شمارش و پایان دور با همان فهرست باشد. */
var CI_ONLY_PROP = 'TG_TEST_ONLY';
function ciScopePick_(suites, o, now) {
  if (!o || !o.fns || !o.fns.length || now - Number(o.at || 0) > 4 * 3600000) return null;
  var keep = suites.filter(function (s) { return o.fns.indexOf(s[1]) > -1; });
  return keep.length ? keep : null;
}
function ciScope_() {
  if (ciScope_.done) return;
  ciScope_.done = true;
  var o = null;
  try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(CI_ONLY_PROP) || 'null'); } catch (e) {}
  var keep = ciMainParts_(ciScopePick_(TG_SUITES, o, Date.now()) || TG_SUITES.slice(), tgRunPartsPlan_().n);
  TG_SUITES.length = 0;
  keep.forEach(function (s) { TG_SUITES.push(s); });
}
/* v170.22.1: تکه‌های «اصلی» (هر tgRunTestsN) جای خودشان n تکه می‌شوند */
function ciMainParts_(suites, n) {
  var at = -1, out = [];
  suites.forEach(function (s) { if (/^tgRunTests\d+$/.test(s[1])) { if (at < 0) at = out.length; } else out.push(s); });
  if (at < 0) return out;
  var parts = [];
  for (var k = 1; k <= n; k++) parts.push(['اصلی ' + tgFa_(k) + ' از ' + tgFa_(n), 'tgRunTests' + k]);
  return out.slice(0, at).concat(parts, out.slice(at));
}
function ciPartsClean_(p) {
  if (!p || typeof p !== 'object') return null;
  var n = Math.floor(Number(p.n));
  if (!(n >= 1 && n <= TG_RUN_MAX)) return null;
  var a = {};
  Object.keys(p.a || {}).slice(0, 400).forEach(function (k) { var v = Math.floor(Number(p.a[k])); if (/^[0-9a-z]{1,8}$/.test(k) && v >= 0 && v < n) a[k] = v; });
  return { n: n, a: a };
}

/* ادامهٔ زنجیرهٔ مرده. اگر مجموعهٔ در حال اجرا (TG_TEST_BEAT) بیش از سقف اجرای Apps Script بی‌خبر مانده، یعنی اجرا
   وسط آن کشته شده: بار اول همان مجموعه در اجرای تازه دوباره امتحان می‌شود (شاید دیر در بودجه شروع شده بود)،
   بار دوم مردود ثبت می‌شود و دور از مجموعهٔ بعدی ادامه پیدا می‌کند. */
function ciKick_(now) {
  if (now === undefined) now = Date.now();
  ciScope_();
  var p = PropertiesService.getScriptProperties();
  var runId = p.getProperty('TG_TEST_RUN') || '';
  if (!runId) return { ok: false, error: 'no run' };
  var at = Number(p.getProperty('TG_TEST_AT') || 0);
  var beat = null;
  try { beat = JSON.parse(p.getProperty('TG_TEST_BEAT') || 'null'); } catch (e) { beat = null; }
  if (p.getProperty('TG_TEST_AT') === null && !beat) return { ok: true, action: 'none', finished: true };   /* دور تمام شده؛ دوباره شروع نکن */
  var act = ciKickPlan_(beat, runId, at, p.getProperty('CI_TEST_KILLED') || '', now);
  if (act.kind === 'skip') {
    var sub = ''; try { var sb = JSON.parse(p.getProperty('TG_TEST_SUB') || 'null'); if (sb && sb.t >= beat.t) sub = ' آخرین تست شروع‌شده: ' + sb.n + ' (' + Math.round((now - sb.t) / 1000) + 'ث پیش).'; } catch (e) {}
    tgTestSheet_().appendRow([new Date(), "'" + runId, beat.name, 0, 1, Math.round((now - beat.t) / 1000),
      'اجرای Apps Script وسط این مجموعه دو بار قطع شد (سقف ۶ دقیقه). مجموعه تمام نشد.' + sub]);
    at++;
    p.setProperty('TG_TEST_AT', String(at));
  }
  if (act.kind === 'retry') p.setProperty('CI_TEST_KILLED', act.mark);
  ciTriggersOff_();
  if (at >= TG_SUITES.length) {
    p.deleteProperty('TG_TEST_AT'); p.deleteProperty('TG_TEST_CHAIN'); p.deleteProperty('TG_TEST_BEAT');
    return { ok: true, action: act.kind, suite: beat ? beat.name : '', finished: true };
  }
  if (at === 0) p.setProperty('TG_TEST_AT', '0');
  p.setProperty('TG_TEST_CHAIN', '0');
  ScriptApp.newTrigger('tgRun').timeBased().after(1000).create();
  return { ok: true, action: act.kind, suite: beat ? beat.name : '' };
}

/* تصمیم خالص (برای تست): 'skip' ، 'retry' یا 'continue' */
function ciKickPlan_(beat, runId, at, killed, now) {
  var dead = !!beat && beat.run === runId && Number(beat.at) === Number(at) && now - Number(beat.t) > 6.5 * 60 * 1000;
  if (!dead) return { kind: 'continue' };
  var mark = runId + '|' + at;
  if (killed === mark) return { kind: 'skip', mark: mark };
  return { kind: 'retry', mark: mark };
}

/* rows: سطرهای تب «تست‌ها» از ستون دوم (دور، مجموعه، قبول، مردود، ثانیه، جزئیات) */
function ciSummarize_(rows, runId, total, running) {
  var by = {}, order = [], pass = 0, fail = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[0]) !== String(runId)) continue;
    var nm = String(r[1]), f = Number(r[3] || 0), ps = Number(r[2] || 0);
    if (!by[nm]) order.push(nm);
    by[nm] = { name: nm, pass: ps, fail: f, secs: Number(r[4] || 0), text: f ? String(r[5] || '').slice(0, 600) : '' };   /* تکرار یک مجموعه: آخرین سطر */
  }
  var suites = order.map(function (n) { return by[n]; });
  suites.forEach(function (x) { pass += x.pass; fail += x.fail; });
  return {
    ok: true, run: runId, total: total, count: suites.length,
    done: !running && suites.length >= total,
    pass: pass, fail: fail, suites: suites
  };
}

function ciStatus_() {
  ciScope_();
  var p = PropertiesService.getScriptProperties();
  var runId = p.getProperty('TG_TEST_RUN') || '';
  var start = Number(p.getProperty('CI_TEST_START') || 0);
  if (!runId) return { ok: true, run: '', waiting: true, since: start, total: TG_SUITES.length, count: 0 };
  var running = !!p.getProperty('TG_TEST_AT');
  var sh = tgTestSheet_();
  var last = sh.getLastRow();
  var rows = last >= 2 ? sh.getRange(Math.max(2, last - 400), 2, last - Math.max(2, last - 400) + 1, 6).getValues() : [];
  var tz = tgTestSheetTz_(sh);
  rows = rows.map(function (r) { return [tgTestRunKey_(r[0], tz)].concat(r.slice(1)); });
  var s = ciSummarize_(rows, runId, TG_SUITES.length, running);
  s.at = Number(p.getProperty('TG_TEST_AT') || 0);
  s.chain = Number(p.getProperty('TG_TEST_CHAIN') || 0);
  try { var bt = JSON.parse(p.getProperty('TG_TEST_BEAT') || 'null'); if (bt && bt.run === runId) s.current = { name: bt.name, secs: Math.round((Date.now() - bt.t) / 1000) }; } catch (e) {}
  try { var sb = JSON.parse(p.getProperty('TG_TEST_SUB') || 'null'); if (sb && s.current && sb.t >= Date.now() - s.current.secs * 1000 - 1000) s.current.sub = sb.n + ' (' + Math.round((Date.now() - sb.t) / 1000) + 'ث)'; } catch (e) {}   /* v166.22 */
  try { s.stimes = JSON.parse(p.getProperty('TG_TEST_STIMES') || '{}'); } catch (e) {}   /* v170.22.1 */
  try { s.parts = tgRunPartsPlan_().n; } catch (e) {}
  return s;
}

function ciTests() {
  var out = [], pass = 0, fail = 0;
  function ok(n, c) { if (c) { pass++; } else { fail++; } out.push((c ? '✅ ' : '❌ ') + n); }
  var k = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9';
  var h = ciSha256Hex_(k), now = 1000000;
  ok('هش SHA-256 شصت‌وچهار رقم هگز است', /^[0-9a-f]{64}$/.test(h));
  ok('هش رشتهٔ خالی درست است', ciSha256Hex_('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  ok('کلید درست پذیرفته می‌شود', ciKeyOk_(k, h, now + 1, now) === true);
  ok('کلید غلط رد می‌شود', ciKeyOk_(k.replace('a1', 'ff'), h, now + 1, now) === false);
  ok('کلید منقضی رد می‌شود', ciKeyOk_(k, h, now, now) === false);
  /* v170.16.2: دور محدود */
  var SU = [['الف', 'aTests'], ['ب', 'bTests'], ['پ', 'cTests']];
  var pk = ciScopePick_(SU, { at: now, fns: ['cTests', 'aTests', 'zTests'] }, now + 1000);
  ok('دور محدود فقط مجموعه‌های فرستاده‌شده را به همان ترتیب TG_SUITES دارد', pk && pk.length === 2 && pk[0][1] === 'aTests' && pk[1][1] === 'cTests');
  /* v170.22.1: تکه‌های «اصلی» بر اساس زمان */
  var mp = ciMainParts_([['الف', 'aTests'], ['اصلی ۱ از ۳', 'tgRunTests1'], ['اصلی ۲ از ۳', 'tgRunTests2'], ['ب', 'bTests']], 5);
  ok('v170.22.1: سه تکهٔ «اصلی» جای خودشان پنج تکه می‌شوند', mp.length === 7 && mp[1][1] === 'tgRunTests1' && mp[5][1] === 'tgRunTests5' && mp[6][1] === 'bTests' && mp[5][0] === 'اصلی ۵ از ۵');
  ok('v170.22.1: بی «اصلی» چیزی اضافه نمی‌شود', ciMainParts_([['الف', 'aTests']], 4).length === 1);
  var pc = ciPartsClean_({ n: 4, a: { abc: 3, xyz: 9, 'bad key!': 1 } });
  ok('v170.22.1: نقشهٔ تکه‌ها پاک‌سازی می‌شود (تکهٔ بیرون از n و کلید نادرست دور ریخته)', pc && pc.n === 4 && pc.a.abc === 3 && !('xyz' in pc.a) && Object.keys(pc.a).length === 1 && ciPartsClean_({ n: 40 }) === null && ciPartsClean_(null) === null);
  ok('v170.22.1: هش عنوان سناریو با bot-parts.mjs یکی است', tgTestHash_('شمارهٔ +۹۸') === '1lyrw5p' && tgTestHash_('') === '45h');
  ok('فهرست کهنه (بیش از ۴ ساعت)، خالی یا بی‌مجموعهٔ آشنا یعنی دور کامل', ciScopePick_(SU, { at: now, fns: ['aTests'] }, now + 5 * 3600000) === null && ciScopePick_(SU, null, now) === null && ciScopePick_(SU, { at: now, fns: ['zTests'] }, now) === null);
  ok('بدون ci_key.gs هیچ کلیدی پذیرفته نمی‌شود', ciKeyOk_(k, null, null, now) === false);
  ok('کلید کوتاه رد می‌شود', ciKeyOk_('abc', ciSha256Hex_('abc'), now + 1, now) === false);
  ok('کلید خالی رد می‌شود', ciKeyOk_('', h, now + 1, now) === false);
  var rows = [
    ['09-30 10:00', 'الف', 5, 0, 1.2, ''],
    ['09-30 10:00', 'ب', 3, 2, 0.4, 'مردود یک'],
    ['09-29 08:00', 'ب', 9, 9, 1, 'دور قبل']
  ];
  var s = ciSummarize_(rows, '09-30 10:00', 2, false);
  ok('خلاصه فقط سطرهای همین دور را می‌شمارد', s.count === 2 && s.pass === 8 && s.fail === 2);
  ok('دور کامل «تمام» است', s.done === true);
  ok('جزئیات مردود می‌آید', s.suites[1].text === 'مردود یک' && s.suites[0].text === '');
  ok('دور در حال اجرا «تمام» نیست', ciSummarize_(rows, '09-30 10:00', 2, true).done === false);
  ok('دور ناقص «تمام» نیست', ciSummarize_(rows, '09-30 10:00', 3, false).done === false);
  var d = ciSummarize_([['R', 'الف', 1, 1, 1, 'x'], ['R', 'الف', 4, 0, 1, ''], ['R', 'ب', 2, 0, 1, '']], 'R', 2, false);
  ok('مجموعهٔ تکراری یک بار شمرده می‌شود (آخرین سطر)', d.count === 2 && d.pass === 6 && d.fail === 0);
  ok('شناسهٔ دورِ تاریخ‌شده به متن برمی‌گردد', tgTestRunKey_(new Date(2026, 8, 30, 16, 17), Session.getScriptTimeZone()) === '09-30 16:17');
  ok('شناسهٔ متنی با \' خوانده می‌شود', tgTestRunKey_("'09-30 16:17") === '09-30 16:17' && tgTestRunKey_('09-30 16:17') === '09-30 16:17');
  var B = { run: 'R', at: 3, name: 'x', t: 0 }, M = 7 * 60 * 1000;
  ok('زنجیرهٔ زنده دست نمی‌خورد', ciKickPlan_({ run: 'R', at: 3, name: 'x', t: M - 1000 }, 'R', 3, '', M).kind === 'continue');
  ok('مجموعهٔ قطع‌شده بار اول دوباره امتحان می‌شود', ciKickPlan_(B, 'R', 3, '', M).kind === 'retry');
  ok('بار دوم مردود ثبت و رد می‌شود', ciKickPlan_(B, 'R', 3, 'R|3', M).kind === 'skip');
  ok('ضربان دور دیگر نادیده گرفته می‌شود', ciKickPlan_(B, 'S', 3, '', M).kind === 'continue');
  ok('وقتی شمارنده جلو رفته، ادامهٔ ساده', ciKickPlan_(B, 'R', 4, '', M).kind === 'continue');
  ok('بدون ضربان، ادامهٔ ساده', ciKickPlan_(null, 'R', 0, '', M).kind === 'continue');
  ok('بدون ci_key.gs کار زمان‌دار متوقف نمی‌شود', ciPaused_({ triggerUid: 'x' }, 'tgPayTick', 'skip') === false || typeof ciGlobal_('CI_PAUSE_UNTIL') === 'number');
  ok('صدا زدن مستقیم (بی رویداد تریگر) هیچ‌وقت متوقف نمی‌شود', ciPaused_(undefined, 'tgPayTick', 'skip') === false && ciPaused_({}, 'tgDaily', 'defer') === false);
  var mk = ciMask_('tgX: خطا برای 09121234567 و ali@example.com و @someone_1 https://t.me/x/12 سطر ۱۲۳۴');
  ok('متن خطا بی شماره، ایمیل، یوزرنیم و لینک برمی‌گردد', mk.indexOf('0912') < 0 && mk.indexOf('ali@') < 0 && mk.indexOf('someone') < 0 && mk.indexOf('t.me') < 0 && mk.indexOf('۱۲۳۴') < 0);
  ok('متن خطا کوتاه می‌شود', ciMask_(new Array(400).join('x')).length === 140);
  var src = '';
  try { src = String(doPost); } catch (e) {}
  ok('doPost درخواست ci را به ciRoute_ می‌دهد', src.indexOf('ciRoute_(body)') > -1);
  ok('مسیر ci قبل از فرم وردپرس است', src.indexOf('ciRoute_(body)') > -1 && src.indexOf('ciRoute_(body)') < src.indexOf('handleWebForm_(body)'));
  /* v166.29.1: سلامت مسیر لید */
  var sm = ciSmoke_();
  ok('آزمون دود: مسیر بات لید می‌سازد (خشک)', sm.bot === true);
  ok('آزمون دود: مسیر فرم سایت لید می‌سازد (خشک)', sm.site === true);
  ok('آزمون دود: هیچ نوشتن واقعی', sm.leak.length === 0 && !sm.error);
  ok('پینگ رله: رسیده', tgRelayState_(1000, 2000, 3000) === 'ok');
  ok('پینگ رله: ۹ دقیقه هنوز زود است', tgRelayState_(1000, 0, 1000 + 9 * 60000) === 'ok');
  ok('پینگ رله: ۱۱ دقیقه بی پاسخ گم شده', tgRelayState_(1000, 500, 1000 + 11 * 60000) === 'lost');
  ok('پینگ رله: بی پینگ قبلی', tgRelayState_(0, 0, 5) === 'none');
  ok('فهرست همکاران: تغییر فوراً فرستاده می‌شود', tgThPushDue_('b', 'a', 1000, 900) === true);
  ok('فهرست همکاران: بی‌تغییر تا ۶۰ دقیقه نه', tgThPushDue_('a', 'a', 59 * 60000, 0) === false && tgThPushDue_('a', 'a', 60 * 60000, 0) === true);
  var wasDry = TG_DRY; TG_DRY = false; TG_TEST_LEAKS = [];
  ok('نگهبان نشت: در تست و بیرون از خشک، لید واقعی نوشته نمی‌شود', tgAppendLead_({ name: 'x', phone: '0' }, true) === false && TG_TEST_LEAKS.length === 1);
  ok('نگهبان نشت: پیام واقعی تلگرام نمی‌رود', tgApi_('sendMessage', { chat_id: 1, text: 'x' }) === null && TG_TEST_LEAKS.length === 2);
  TG_DRY = wasDry; TG_TEST_LEAKS = [];
  ok('خطای گذرای گوگل شناخته می‌شود', tgTestTransient_('❌ اجرای تست بدون خطا · Exception: Service Spreadsheets failed while accessing document with id x.') && tgTestTransient_('Exception: Service invoked too many times for one day: urlfetch.'));
  ok('مردودی واقعی گذرا نیست', !tgTestTransient_('❌ مصاحبه گذاشتیم: آخرین تماس، نتیجه و مرحله') && !tgTestTransient_(''));
  return { pass: pass, fail: fail, text: out.join('\n') };
}
