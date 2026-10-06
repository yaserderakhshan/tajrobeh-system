/**
 * sitepub.gs · v170.23.3 · ۱۴ مهر ۱۴۰۵ · کار بات ← سایت هیچ‌وقت بی‌صدا نیمه‌تمام نمی‌ماند (تصمیم یاسر)
 *
 * ۱) نتیجه در هاب: هر انتشار پروفایل (tgPrPublish_) یک سطر در تب «نتیجهٔ انتشار سایت»: موفق، نیمه یا شکست، با برگه‌ها و دلیل.
 *    پیام تلگرام ناظر کافی نیست؛ پیش از این «انتشار کامل نشد · anchor not found» فقط در گفت‌وگو می‌ماند.
 * ۲) صف تلاش دوباره: «نیمه» و «شکست» خودکار با فاصلهٔ فزاینده (۱، ۴، ۱۲ ساعت) دوباره امتحان می‌شوند (ساعتی از tgWatchdog).
 *    پاسخ بازبینی‌نشده دوباره فرستاده نمی‌شود («منتظر بازبینی»). سه شکست پشت هم ← یک کار در «کارها» برای مسئول فنی.
 * ۳) آشتی شبانه (ساعت ۳ تهران): ستون «روی سایت» تب «پروفایل سایت» با سایت سنجیده می‌شود: صفحهٔ /team/، نوار صفحهٔ اصلی
 *    (a.p3) و اسلایدر مدرسه. تأییدشده‌ای که روی سایت نیست ← صف تلاش دوباره؛ «روی سایت» یا «برگه‌ها»ی نادرست ← درست می‌شود.
 *    خلاصه با نام‌ها فقط در پیام خصوصی به مالک؛ هیچ نامی در کد.
 * حالت خشک: TG_MEM['spl:rows'] سطرهای تب، TG_MEM['spl:pages'] {نشانی: کد HTTP}.
 */
var SPL_TAB = 'نتیجهٔ انتشار سایت';
var SPL_HEAD = ['زمان', 'شناسه', 'نام', 'کار', 'نتیجه', 'برگه‌ها', 'دلیل', 'تلاش', 'تلاش بعدی', 'صف'];
var SPL_Q = { wait: 'در صف', review: 'منتظر بازبینی', fixed: 'درست شد', task: 'سپرده به کارها' };
var SPL_BACKOFF_H = [1, 4, 12];
var SPL_MAX = 3;
var SPL_RECON_HOUR = 3;

function splDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function splSheet_() {
  var ss = tgSS_(), sh = ss.getSheetByName(SPL_TAB);
  if (!sh) {
    sh = ss.insertSheet(SPL_TAB); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, SPL_HEAD.length).setValues([SPL_HEAD]).setFontWeight('bold').setBackground('#f5f5f8');
    sh.setFrozenRows(1);
  }
  return sh;
}
/* سطرها: {row, at, id, name, kind, res, pages, why, tries, next, q} */
function splRows_() {
  if (splDry_()) return (TG_MEM['spl:rows'] = TG_MEM['spl:rows'] || []);
  var sh = splSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, SPL_HEAD.length).getValues().map(function (v, i) {
    return { row: i + 2, at: v[0], id: String(v[1]), name: String(v[2]), kind: String(v[3]), res: String(v[4]), pages: String(v[5]), why: String(v[6]),
             tries: Number(v[7]) || 0, next: v[8] instanceof Date ? v[8].getTime() : (Number(new Date(v[8])) || 0), q: String(v[9]) };
  });
}
function splWrite_(e) {
  var arr = [e.at || new Date(), e.id, e.name, e.kind, e.res, e.pages || '', String(e.why || '').slice(0, 400), e.tries || 0, e.next ? new Date(e.next) : '', e.q || ''];
  if (splDry_()) { var L = splRows_(); if (e.row) L[e.row - 2] = Object.assign({}, e); else { e.row = L.length + 2; L.push(Object.assign({}, e)); } return; }
  var sh = splSheet_();
  if (e.row) sh.getRange(e.row, 1, 1, SPL_HEAD.length).setValues([arr]);
  else { sh.appendRow(arr); e.row = sh.getLastRow(); }
}
function splNow_() { return splDry_() && TG_MEM['spl:now'] ? Number(TG_MEM['spl:now']) : Date.now(); }
/* سطر فعال صف همین شناسه (در صف یا منتظر بازبینی) */
function splActive_(id) {
  var L = splRows_().filter(function (e) { return e.id === id && (e.q === SPL_Q.wait || e.q === SPL_Q.review); });
  return L[L.length - 1] || null;
}

/** از tgPrPublish_: نتیجهٔ هر انتشار. opts.src: 'retry' (از صف) یا 'recon' یا 'redo'؛ بی src یعنی انتشار ناظر. */
function splNote_(r, opts, res, pages, why) {
  try {
    opts = opts || {};
    var v = r.v, id = String(v.id || ''), now = splNow_();
    var kind = opts.src === 'retry' ? 'تلاش دوباره' : opts.src === 'recon' ? 'آشتی شبانه' : opts.src === 'redo' ? 'بازنشر جامانده' : 'انتشار پروفایل';
    var act = splActive_(id);
    if (res === 'موفق') {
      splWrite_({ id: id, name: v.name, kind: kind, res: res, pages: pages, why: why, tries: act ? act.tries : 0, q: '' });
      if (act) { act.q = SPL_Q.fixed; act.next = 0; splWrite_(act); }
      return;
    }
    /* نیمه یا شکست: صندوق خطا (v170.23.4؛ بی نام)، سطر نتیجه + صف (یکی برای هر شناسه) */
    if (typeof erbAdd_ === 'function') erbAdd_('کار نیمه', kind, res + ': ' + String(why || ''));
    var tries = act ? act.tries + (opts.src === 'retry' ? 1 : 0) : 0;
    splWrite_({ id: id, name: v.name, kind: kind, res: res, pages: pages, why: why, tries: tries, q: '' });
    if (act) {
      act.tries = tries; act.why = why; act.pages = pages; act.res = res;
      if (tries >= SPL_MAX) { act.q = SPL_Q.task; act.next = 0; splTask_(act); }
      else act.next = now + SPL_BACKOFF_H[Math.min(tries, SPL_BACKOFF_H.length - 1)] * 3600000;
      splWrite_(act);
    } else {
      splWrite_({ id: id, name: v.name, kind: 'صف تلاش دوباره', res: res, pages: pages, why: why, tries: 0, next: now + SPL_BACKOFF_H[0] * 3600000, q: SPL_Q.wait });
    }
  } catch (e) { try { tgErr_('splNote_', e); } catch (x) {} }
}
/* سه شکست ← کار برای مسئول فنی (TG_NAMES.tech، وگرنه مالک) */
function splTask_(e) {
  var owner = tgNm_('tech'), t = { title: 'انتشار پروفایل روی سایت سه بار شکست خورد: ' + e.name, cat: 'فنی', owner: owner, ownerChat: owner ? '' : String(TG_OWNER_CHAT),
    by: 'بات', due: new Date(splNow_() + 86400000), src: 'بات', ref: 'SPL:' + e.id, note: String(e.why || '').slice(0, 300) };
  if (splDry_()) { (TG_MEM['spl:tasks'] = TG_MEM['spl:tasks'] || []).push(t); return; }
  try { if (typeof opsAdd_ === 'function' && opsAdd_(t)) return; } catch (eO) { tgErr_('splTask_ opsAdd_', eO); }
  try { tgNotify_(String(TG_OWNER_CHAT), TG_NK.task, '🛠 <b>کار فنی</b>: ' + tgEsc_(t.title) + '\n' + tgEsc_(t.note), { ref: t.ref }); } catch (eN) {}
}

/** ساعتی از tgWatchdog: صف تلاش دوباره، و ساعت ۳ تهران آشتی شبانه (روزی یک بار) */
function splHourly_() {
  var n = splRetryTick_();
  var h = Number(Utilities.formatDate(new Date(splNow_()), TG_TZ, 'H')), day = Utilities.formatDate(new Date(splNow_()), TG_TZ, 'yyyy-MM-dd');
  var P = splDry_() ? null : PropertiesService.getScriptProperties();
  var last = splDry_() ? TG_MEM['spl:reconday'] : P.getProperty('SPL_RECON_DAY');
  if (h === SPL_RECON_HOUR && last !== day) {
    if (splDry_()) TG_MEM['spl:reconday'] = day; else P.setProperty('SPL_RECON_DAY', day);
    try { splRecon_(true); } catch (e) { tgErr_('splRecon_', e); }
  }
  return n;
}
function splRetryTick_() {
  var now = splNow_(), owner = String(TG_OWNER_CHAT), n = 0;
  var due = splRows_().filter(function (e) { return e.q === SPL_Q.wait && e.next && e.next <= now; }).slice(0, 5);
  due.forEach(function (e) {
    var r = tgPrAll_().filter(function (x) { return String(x.v.id) === e.id; })[0];
    if (!r) { e.q = SPL_Q.fixed; e.why = 'پروفایل دیگر در هاب نیست'; splWrite_(e); return; }
    if (tgPrNeeds_(r.v)) { e.q = SPL_Q.review; splWrite_(e); return; }   /* پاسخ بازبینی‌نشده بی‌اجازه نمی‌رود؛ انتشار ناظر سطر را می‌بندد */
    tgPrPublish_(owner, r, { quiet: 1, keepPage: 1, src: 'retry' });
    n++;
  });
  return n;
}

/* ───── آشتی شبانه ───── */
function splNorm_(s) {
  return String(s || '').replace(/^\s*دکتر\s+/, '').replace(/\(.*?\)/g, '').replace(/[يئ]/g, 'ی').replace(/ك/g, 'ک').replace(/[آأ]/g, 'ا').replace(/ؤ/g, 'و').replace(/[ةۀ]/g, 'ه')
    .replace(/[​-‏﻿\s]+/g, '').replace(/وو/g, 'و').toLowerCase();
}
function splPageLive_(url) {
  if (!url) return false;
  if (splDry_()) return ((TG_MEM['spl:pages'] || {})[url] || 404) === 200;
  try { return UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, method: 'get' }).getResponseCode() === 200; } catch (e) { return false; }
}
/** fix=true: تأییدشدهٔ غایب به صف، ستون‌های نادرست درست. برمی‌گرداند {checked, missing:[{name, what}], fixed:[{name, what}]} */
function splRecon_(fix) {
  var rows = tgPrAll_().filter(function (r) {
    var v = r.v; return /[TES]/.test(String(v.roles || '')) && String(v.review || '').trim() && String(v.consent || '').indexOf('فقط برای تیم') < 0 && !/نمی‌رود/.test(String(v.status || ''));
  });
  var out = { checked: rows.length, missing: [], fixed: [], err: '' };
  if (!rows.length) return out;
  var names = []; rows.forEach(function (r) { names.push(r.v.name); if (r.v.site_name) names.push(r.v.site_name); });
  var hits = [];
  try { hits = tgDir_('find', { names: names }).hits || []; } catch (e) { out.err = String(e.message || e); return out; }   /* سایت جواب نداد: فردا دوباره */
  rows.forEach(function (r) {
    var v = r.v, keys = [splNorm_(v.name), splNorm_(v.site_name)].filter(String);
    var mine = hits.filter(function (h) { return keys.indexOf(splNorm_(h.f && h.f.name)) > -1; });
    var home = mine.some(function (h) { return Number(h.page) === TG_PR_HOME && (h.kind === 'p3' || h.kind === 'thc'); });
    var titles = []; mine.forEach(function (h) { if (titles.indexOf(h.title) < 0) titles.push(h.title); });
    var pageOk = String(v.consent || '').indexOf('بله') === 0, page = String(v.page || '').trim();
    var pageLive = page ? splPageLive_(page) : false;
    var miss = [];
    if (/T/.test(String(v.roles || '')) && !home) miss.push('نوار صفحهٔ اصلی');
    if (pageOk && !pageLive) miss.push('صفحهٔ /team/');
    var onSite = mine.length > 0 || pageLive;
    /* ستون‌های هاب که دروغ می‌گویند */
    var put = {}, fixedWhat = [];
    var onsiteNow = titles.join('، ');
    if (String(v.onsite || '') !== onsiteNow) { put.onsite = onsiteNow; fixedWhat.push('برگه‌ها'); }
    if (String(v.status || '') === 'روی سایت' && !onSite) { put.status = 'منتشر نشد'; fixedWhat.push('وضعیت «روی سایت»'); }
    if (String(v.status || '') === 'منتشر نشد' && onSite && !miss.length) { put.status = 'روی سایت'; fixedWhat.push('وضعیت «منتشر نشد»'); }
    if (fix && Object.keys(put).length) { try { tgPqPut_(v.id, put); } catch (eP) { tgErr_('splRecon_ put', eP); } }
    if (fixedWhat.length) out.fixed.push({ name: v.name, what: fixedWhat.join('، ') });
    if (miss.length) {
      out.missing.push({ name: v.name, what: miss.join('، ') });
      /* تأییدشده‌ای که روی سایت نیست ← صف تلاش دوباره (اگر هنوز در صف نیست) */
      if (fix && typeof erbAdd_ === 'function') erbAdd_('کار نیمه', 'آشتی شبانه', 'تأییدشده روی سایت نیست: ' + miss.join('، '));   /* v170.23.4، بی نام */
      if (fix && !splActive_(String(v.id))) splWrite_({ id: String(v.id), name: v.name, kind: 'آشتی شبانه', res: 'شکست', pages: titles.join('، '), why: 'روی سایت نیست: ' + miss.join('، '), tries: 0, next: splNow_(), q: SPL_Q.wait });
    }
  });
  if (fix) {
    try {
      if (out.missing.length || out.fixed.length) tgNotify_(String(TG_OWNER_CHAT), TG_NK.report, '🔁 <b>آشتی شبانهٔ هاب و سایت</b> · ' + tgFa_(out.checked) + ' پروفایل' +
        (out.missing.length ? '\n\n<b>تأییدشده ولی روی سایت نیست (به صف تلاش دوباره رفت):</b>\n' + out.missing.map(function (x) { return '• ' + tgEsc_(x.name) + ': ' + tgEsc_(x.what); }).join('\n') : '') +
        (out.fixed.length ? '\n\n<b>ستون هاب درست شد:</b>\n' + out.fixed.map(function (x) { return '• ' + tgEsc_(x.name) + ': ' + tgEsc_(x.what); }).join('\n') : ''), { ref: 'SPL-RECON' });
    } catch (eN) {}
  }
  return out;
}
/* یک‌بارهٔ خودکار v170.23.3: آشتی همین حالا و یک دور صف (بعد از اصلاح 504064، همه یک‌جا). خروجی فقط شمار. */
function tgV170233SitePub() {
  var o = splRecon_(true);
  if (o.err) return 'آشتی: سایت جواب نداد (' + o.err.slice(0, 80) + ')';
  var t = splRetryTick_();
  return 'آشتی: ' + o.checked + ' پروفایل · غایب: ' + o.missing.length + ' · ستون درست‌شده: ' + o.fixed.length + ' · تلاش دوباره همین حالا: ' + t;
}

/* ───── آزمون ───── */
function splTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { watch: ['700'], 'spl:now': Date.UTC(2026, 9, 6, 9, 0) };
  try {
    TG_MEM['pqrows'] = {
      'ther:نمونه الف': { id: 'ther:نمونه الف', name: 'نمونه الف', roles: 'T', chat: '901', photo: 'tg:photo:F1', city: 'تهران', approach: 'روابط ابژه', consent: 'بله', review: 'x', rstamp: '9', stamp: '5', page: 'https://tajrobeh.life/team/sample-a/', status: 'روی سایت', onsite: 'خانه' },
      'ther:نمونه ب': { id: 'ther:نمونه ب', name: 'نمونه ب', roles: 'T', chat: '902', photo: 'tg:photo:F2', approach: 'لکانی', consent: 'بله', review: 'x', rstamp: '9', stamp: '5', page: '', status: 'روی سایت', onsite: 'خانه' } };
    var rA = tgPrAll_()[0];
    /* ۱) نتیجه در هاب: نیمه */
    TG_MEM['dirres'] = { find: { ok: true, hits: [] }, person: { ok: true, url: 'https://tajrobeh.life/team/sample-a/' },
      publish: { ok: true, pages: [{ page: 294, title: 'مدرسه', url: 'u', saved: true, changes: [{ kind: 'thc', done: ['new'] }] }], errors: [{ page: TG_PR_HOME, error: 'marker missing: tj:dir:home' }] } };
    tgPrPublish_(700, rA);
    var L = splRows_();
    ok('نتیجه در هاب: «نیمه» با برگه‌ها و دلیل', L.some(function (e) { return e.res === 'نیمه' && /مدرسه/.test(e.pages) && /صفحهٔ اصلی: نشانگر/.test(e.why); }), JSON.stringify(L));
    var q = splActive_('ther:نمونه الف');
    ok('نیمه ← صف تلاش دوباره با فاصلهٔ ۱ ساعت', q && q.q === SPL_Q.wait && q.next === TG_MEM['spl:now'] + 3600000);
    /* ۲) صف: پیش از موعد کاری نیست؛ بعد از موعد دوباره، با فاصلهٔ فزاینده */
    ok('پیش از موعد: تلاشی نیست', splRetryTick_() === 0);
    TG_MEM['spl:now'] += 3600000 + 1;
    var n0 = TG_OUTBOX.filter(function (x) { return x.kind === 'dir' && x.op === 'publish'; }).length;
    ok('بعد از موعد: دوباره امتحان (بی پیام به عضو)', splRetryTick_() === 1 && TG_OUTBOX.filter(function (x) { return x.kind === 'dir' && x.op === 'publish'; }).length === n0 + 1 &&
      !TG_OUTBOX.some(function (x) { return x.kind === 'msg' && x.chat === '901'; }));
    q = splActive_('ther:نمونه الف');
    ok('تلاش ۱ شکست ← فاصلهٔ ۴ ساعت', q && q.tries === 1 && q.next === TG_MEM['spl:now'] + 4 * 3600000, JSON.stringify(q));
    TG_MEM['spl:now'] = q.next + 1; splRetryTick_(); q = splActive_('ther:نمونه الف');
    TG_MEM['spl:now'] = q.next + 1; splRetryTick_();
    ok('سه شکست ← کار در «کارها» برای مسئول فنی و صف بسته', !splActive_('ther:نمونه الف') && (TG_MEM['spl:tasks'] || []).length === 1 && splRows_().some(function (e) { return e.q === SPL_Q.task; }));
    /* موفق صف را می‌بندد */
    TG_MEM['spl:rows'] = [];
    tgPrPublish_(700, rA);
    TG_MEM['dirres'].publish = { ok: true, pages: [{ page: TG_PR_HOME, title: 'خانه', url: 'u', saved: true, changes: [{ kind: 'p3', done: ['new'] }] }], errors: [] };
    TG_MEM['spl:now'] += 3600000 + 1; splRetryTick_();
    ok('موفق در تلاش دوباره ← «درست شد»', !splActive_('ther:نمونه الف') && splRows_().some(function (e) { return e.q === SPL_Q.fixed; }) && splRows_().some(function (e) { return e.res === 'موفق' && e.kind === 'تلاش دوباره'; }));
    /* پاسخ بازبینی‌نشده دوباره فرستاده نمی‌شود */
    TG_MEM['spl:rows'] = []; TG_MEM['dirres'].publish = { ok: true, pages: [], errors: [{ page: TG_PR_HOME, error: 'no team page' }] };
    tgPrPublish_(700, rA); TG_MEM['pqrows']['ther:نمونه الف'].stamp = String(Date.now() + 1e9); TG_MEM['pqrows']['ther:نمونه الف'].method = 'm';
    TG_MEM['spl:now'] += 3600000 + 1;
    ok('پاسخ بازبینی‌نشده ← «منتظر بازبینی»، بی انتشار', splRetryTick_() === 0 && splActive_('ther:نمونه الف').q === SPL_Q.review);
    TG_MEM['pqrows']['ther:نمونه الف'].stamp = '5';
    /* ۳) آشتی شبانه */
    TG_MEM['spl:rows'] = [];
    TG_MEM['dirres'].find = { ok: true, hits: [{ kind: 'p3', page: TG_PR_HOME, title: 'خانه', f: { name: 'نمونه الف' } }] };
    TG_MEM['spl:pages'] = { 'https://tajrobeh.life/team/sample-a/': 200 };
    TG_OUTBOX = [];
    var rc = splRecon_(true);
    ok('آشتی: تأییدشدهٔ غایب پیدا و به صف رفت', rc.missing.length === 1 && rc.missing[0].name === 'نمونه ب' && /نوار صفحهٔ اصلی/.test(rc.missing[0].what) && !!splActive_('ther:نمونه ب'), JSON.stringify(rc));
    ok('آشتی: «روی سایت» دروغ ← «منتشر نشد»', TG_MEM['pqrows']['ther:نمونه ب'].status === 'منتشر نشد' && TG_MEM['pqrows']['ther:نمونه الف'].status === 'روی سایت');
    ok('آشتی: گزارش خصوصی به مالک', TG_MEM['notify'] && TG_MEM['notify'].some(function (x) { return /آشتی شبانه/.test(x.text); }));
    ok('آشتی ساعت ۳ تهران، روزی یک بار', (function () { TG_MEM['spl:reconday'] = ''; TG_MEM['spl:now'] = Date.UTC(2026, 9, 6, 23, 40); var a = TG_MEM['spl:reconday']; splHourly_(); var b = TG_MEM['spl:reconday']; splHourly_(); return !a && b === '2026-10-07'; })());
    ok('سایت جواب نداد ← آشتی چیزی را عوض نمی‌کند', (function () { TG_MEM['dirres'].find = null; var f0 = tgDir_; tgDir_ = function () { throw new Error('سایت 500'); }; try { return !!splRecon_(true).err; } finally { tgDir_ = f0; } })());
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'splTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['نتیجهٔ انتشار سایت و تلاش دوباره (v170.23.3)', 'splTests']); } catch (eSpl) {}
