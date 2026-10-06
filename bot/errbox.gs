/**
 * errbox.gs · v170.23.5 · ۱۴ مهر ۱۴۰۵ · صندوق یکتای خطا: «خطا ← برنامه ← اصلاح ← شاهد» (تصمیم یاسر)
 *
 * مرحلهٔ ۱ (دیدن): همهٔ مسیرهای خطا به یک تب «خطاها» در هاب تجربه می‌ریزند (جای «Errors»):
 *   tgErr_ (همهٔ خطاهای بات) · logError_ (فرم سایت؛ فرم تستی دیگر خطا نیست) · نتیجهٔ نیمه یا شکست کار بات ← سایت
 *   (انتشار پروفایل، ابی، کمپین) · گزارش خطای اسنیپت‌ها از پل سایت (op «errs» اسنیپت 504064) · شکست گردش کارها
 *   (اکشن درگاه «error_report») · بررسی سلامت · آشتی شبانهٔ هاب و سایت.
 * - اثر انگشت = محل + نوع، بی عدد و نام و شماره: رقم‌ها «#»، متن داخل گیومه حذف، و بخش فارسی پیام (که ممکن است نام داشته
 *   باشد) فقط به‌صورت هش کوتاه. نمونهٔ پوشانده‌شدهٔ پیام فقط در ستون «نمونه» همین تب خصوصی می‌ماند.
 * - شدت خودکار (بار اول): ۱ = خرابی دادهٔ لید یا مالی، یا مراجعی که گیر کرده (پیام فوری به یاسر) · ۲ = کار نیمه یا قابلیتی
 *   که از کار افتاده · ۳ = بقیه. یاسر با دکمه می‌تواند به ۳ پایینش بیاورد؛ تکرار آن را عوض نمی‌کند.
 * - گزارش: هر روز ساعت ۹ تهران فقط اگر چیزی عوض شده (تازه‌ها، اصلاح‌شده‌ها، بازگشته‌ها، منتظر تصمیم با دکمه)؛ جمعه‌ها
 *   جمع‌بندی هفته. شدت ۱ همان لحظه.
 * مرحلهٔ ۲ (v170.23.6): برنامه و شاهد. گردش کار erb-issues.yml هر ساعت با اکشن درگاه «error_list» اثر انگشت‌های شدت ۱ و ۲ را
 *   می‌خواند و برای هر کدام یک issue با برچسب auto-bug می‌سازد یا همان را به‌روز می‌کند (بی نام و شماره؛ فقط اثر انگشت و شمار)،
 *   و با «error_set» پیوند issue و وضعیت را برمی‌گرداند: issue ساخته شد ← «در برنامه»، PR باز ← «PR»، PR ادغام شد ← «اصلاح‌شده».
 *   شاهد (روزانه در erbHourly_): «اصلاح‌شده»ای که ۷ روز تکرار نشد ← «تأییدشده» (گردش کار issue را می‌بندد)؛ تکرار ← «بازگشته»
 *   (issue دوباره باز). وضعیت فقط در همین تب است؛ گردش کار فقط آینهٔ آن روی گیت‌هاب.
 * مرحلهٔ ۳ (v170.23.7): اصلاح‌گر شبانه فقط PR می‌زند (erb-fixer.yml، برچسب auto-fix) و فهرستش را با اکشن «fix_note» به بات می‌دهد.
 *   پیام ساعت ۹ یاسر آن‌ها را با دکمهٔ «ادغام همه» و «ادغام #N» می‌آورد. دکمه با توکن کم‌دسترس GH_DISPATCH_TOKEN (Script Property،
 *   فقط اجرای Actions) گردش کار erb-merge.yml را صدا می‌زند؛ همان گردش کار فقط PR سبز auto-fix را ادغام می‌کند و همان مسیر
 *   انتشار (پایش ۵ دقیقه و برگشت خودکار بات، یا سنجش هش سایت) را راه می‌اندازد. ادغام بی دکمهٔ یاسر نیست.
 * حالت خشک: TG_MEM['erb:rows'] سطرها، TG_MEM['erb:now'] زمان.
 */
var ERB_TAB = 'خطاها';
var ERB_HEAD = ['شناسه', 'اثر انگشت', 'منبع', 'شدت', 'اولین بار', 'آخرین بار', 'شمار', 'وضعیت', 'issue', 'وضعیت از', 'نمونه'];
var ERB_SRC = { bot: 'بات', site: 'سایت', ci: 'CI', health: 'سلامت', half: 'کار نیمه' };
var ERB_ST = { fresh: 'تازه', plan: 'در برنامه', pr: 'PR', fixed: 'اصلاح‌شده', ok: 'تأییدشده', back: 'بازگشته' };
var ERB_DIGEST_H = 9;
/* شدت ۱: لید، پرداخت، تنخواه، کامنت‌های لید، مهاجرت داده، درخواست گیرکرده، مسیر فرم سایت (لید گم می‌شود) */
var ERB_SEV1_RX = /^(tgLead|tgPay|tgTnk|tnk|cm[A-Z]|tgMig|stk|Code\.gs|فرم سایت)/;
var ERB_SEV1_KIND = /لید|پرداخت|تنخواه|مراجع گیر/;
/* شدت ۲: کار بات ← سایت و قابلیت‌هایی که از کار می‌افتند */
var ERB_SEV2_RX = /^(tgDir_|tgPr|spl|ebi|tgCpPush_|tgThPush_|pb|wpP|tgApiGateway_|tgWatchdog)/;
var ERB_SEV2_KIND = /نیمه|شکست|fail|unavailable|not found/i;
/* خطای گذرای سرویس گوگل (هم‌خانوادهٔ TRANSIENT در bot-monitor.mjs): عیب کد نیست ← شدت ۳ */
var ERB_TRANSIENT = /Too many simultaneous invocations|Service \w+ failed while accessing|Service invoked too many times|Address unavailable|Service unavailable|server error occurred|Exception: (Timeout|Internal error)/i;

function erbDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function erbNow_() { return erbDry_() && TG_MEM['erb:now'] ? Number(TG_MEM['erb:now']) : Date.now(); }
function erbSheet_() {
  var ss = tgSS_(), sh = ss.getSheetByName(ERB_TAB);
  if (!sh) {
    sh = ss.insertSheet(ERB_TAB); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, ERB_HEAD.length).setValues([ERB_HEAD]).setFontWeight('bold').setBackground('#faeced');
    sh.setFrozenRows(1); sh.setColumnWidth(2, 360); sh.setColumnWidth(11, 420);
  }
  return sh;
}
/* {row, id, fp, src, sev, first, last, n, st, issue, stAt, sample} */
function erbRows_() {
  if (erbDry_()) return (TG_MEM['erb:rows'] = TG_MEM['erb:rows'] || []);
  var sh = erbSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  var t = function (x) { return x instanceof Date ? x.getTime() : (Number(new Date(x)) || 0); };
  return sh.getRange(2, 1, n - 1, ERB_HEAD.length).getValues().map(function (v, i) {
    return { row: i + 2, id: String(v[0]), fp: String(v[1]), src: String(v[2]), sev: Number(v[3]) || 3, first: t(v[4]), last: t(v[5]), n: Number(v[6]) || 1,
             st: String(v[7] || ERB_ST.fresh), issue: String(v[8] || ''), stAt: t(v[9]), sample: String(v[10] || '') };
  });
}
function erbWrite_(e) {
  if (erbDry_()) { var L = erbRows_(); if (e.row) L[e.row - 2] = e; else { e.row = L.length + 2; L.push(e); } return; }
  var d = function (x) { return x ? new Date(x) : ''; };
  var arr = [e.id, e.fp, e.src, e.sev, d(e.first), d(e.last), e.n, e.st, e.issue || '', d(e.stAt), String(e.sample || '').slice(0, 400)];
  var sh = erbSheet_();
  if (e.row) sh.getRange(e.row, 1, 1, ERB_HEAD.length).setValues([arr]);
  else { sh.appendRow(arr); e.row = sh.getLastRow(); }
}

/* ───── اثر انگشت ───── */
function erbClean_(s) {
  return tgSecretMask_(String(s == null ? '' : s))
    .replace(/https?:\/\/\S+/g, '<نشانی>').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<ایمیل>').replace(/@\w{3,}/g, '<کاربر>')
    .replace(/«[^»]*»|"[^"]*"|'[^']*'|“[^”]*”/g, '…')
    .replace(/[0-9۰-۹٠-٩]+/g, '#').replace(/\s+/g, ' ').trim();
}
function erbWhere_(w) { return erbClean_(w).replace(/[^\w.$#\- \u0600-\u06FF\u200C]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'نامعلوم'; }
/* نوع: اسکلت لاتین پیام (نوع خطای Apps Script، پیام سرویس‌ها)، و اگر بخش فارسی هم دارد هش کوتاهش */
function erbKind_(msg) {
  var s = erbClean_(msg);
  var lat = (s.match(/[A-Za-z_][A-Za-z0-9_.()\-]*:?/g) || []).filter(function (w) { return w.length > 1; }).slice(0, 10).join(' ');
  var fa = s.replace(/[A-Za-z0-9_.()\-:#…<>\/]+/g, ' ').replace(/[^؀-ۿ ]/g, '').replace(/\s+/g, ' ').trim();
  return (lat + (fa ? (lat ? ' · ' : '') + 'متن ' + tgHash_(fa).slice(0, 6) : '')).trim() || 'بی‌متن';
}
function erbFp_(where, msg) { var w = erbWhere_(where), k = erbKind_(msg); return { where: w, kind: k, fp: w + ' · ' + k }; }
function erbId_(src, fp) { return 'X-' + tgHash_(src + '|' + fp).slice(0, 7); }
function erbSev_(src, where, kind, hint) {
  var h = Number(hint); if (h >= 1 && h <= 3) return h;
  if (ERB_TRANSIENT.test(kind)) return 3;
  if (ERB_SEV1_RX.test(where) || ERB_SEV1_KIND.test(kind)) return 1;
  if (src === ERB_SRC.half || src === ERB_SRC.health || src === ERB_SRC.ci || ERB_SEV2_RX.test(where) || ERB_SEV2_KIND.test(kind)) return 2;
  return 3;
}
/* منبع از روی محل، برای خطاهایی که از tgErr_ می‌آیند */
function erbSrcOf_(where) {
  if (/^(tgDir_|tgPr|spl|ebiWp_|tgCpPush_|tgThPush_)/.test(where)) return ERB_SRC.half;
  if (/^(Code\.gs|فرم سایت)/.test(where)) return ERB_SRC.site;
  return ERB_SRC.bot;
}

/** ورودی یکتا. opts: {sev, sample}. برمی‌گرداند شناسهٔ ردیف (X-…). هرگز خطا پرتاب نمی‌کند. */
function erbAdd_(src, where, msg, opts) {
  try {
    opts = opts || {};
    var f = erbFp_(where, msg), id = erbId_(src, f.fp), now = erbNow_();
    var sev = erbSev_(src, f.where, f.kind, opts.sev);
    var sample = erbClean_(opts.sample !== undefined ? opts.sample : msg).slice(0, 400);
    var e = erbFind_(id);
    if (e) {
      e.last = now; e.n = (e.n || 1) + (Number(opts.n) || 1); e.sample = sample;
      if (e.st === ERB_ST.fixed || e.st === ERB_ST.ok) { e.st = ERB_ST.back; e.stAt = now; }
      erbWrite_(e);
    } else {
      e = { id: id, fp: f.fp, src: src, sev: sev, first: now, last: now, n: Number(opts.n) || 1, st: ERB_ST.fresh, issue: '', stAt: now, sample: sample };
      erbWrite_(e);
      erbCacheSet_(id, e.row);
    }
    if (e.sev === 1 && (e.n === 1 || e.st === ERB_ST.back)) erbUrgent_(e);
    return id;
  } catch (x) { try { console.error('erbAdd_: ' + x); } catch (x2) {} return ''; }
}
function erbCacheSet_(id, row) { if (!erbDry_()) try { CacheService.getScriptCache().put('erb:' + id, String(row), 21600); } catch (e) {} }
function erbFind_(id) {
  if (!erbDry_()) {
    try {
      var hit = CacheService.getScriptCache().get('erb:' + id);
      if (hit) {
        var sh = erbSheet_(), r = Number(hit);
        if (r >= 2 && r <= sh.getLastRow() && String(sh.getRange(r, 1).getValue()) === id) { var one = erbRows_().filter(function (x) { return x.row === r; })[0]; if (one) return one; }
      }
    } catch (e) {}
  }
  var L = erbRows_().filter(function (x) { return x.id === id; });
  if (L[0]) erbCacheSet_(id, L[0].row);
  return L[0] || null;
}
/* شدت ۱: همان لحظه به یاسر (بار اول، یا وقتی برگشته) */
function erbUrgent_(e) {
  var t = '🚨 <b>خطای شدت ۱</b> · ' + tgEsc_(e.src) + (e.st === ERB_ST.back ? ' · <b>بازگشته</b>' : '') + '\n' + tgEsc_(e.fp) +
          '\n\nنمونه: ' + tgEsc_(String(e.sample).slice(0, 200)) + '\nشناسه در تب «خطاها»ی هاب: ' + e.id;
  if (erbDry_()) { (TG_MEM['erb:urgent'] = TG_MEM['erb:urgent'] || []).push(e.id); return; }
  try { tgNotify_(String(TG_OWNER_CHAT), TG_NK.urgent, t, { ref: 'ERB:' + e.id }); } catch (x) {}
}

/* ───── ورودی‌ها ───── */
/* از tgErr_ (بعد از پوشاندن رمزها) */
function erbFromErr_(where, msg) { return erbAdd_(erbSrcOf_(erbWhere_(where)), where, msg); }
/* اکشن درگاه «error_report»: گردش کارها (CI) و بررسی سلامت. فقط منبع‌های مجاز؛ متن پوشانده و کوتاه می‌شود. */
function erbGateway_(p, dry) {
  var src = String(p.src || '').trim();
  if ([ERB_SRC.ci, ERB_SRC.health, ERB_SRC.site].indexOf(src) < 0) return { ok: false, error: 'bad_src' };
  var where = String(p.where || '').slice(0, 120), msg = String(p.msg || '').slice(0, 600);
  if (!where) return { ok: false, error: 'no_where' };
  if (dry) { var f = erbFp_(where, msg); return { ok: true, data: { id: erbId_(src, f.fp), fp: f.fp } }; }
  return { ok: true, data: { id: erbAdd_(src, where, msg, { sev: p.sev }) } };
}
/* ───── مرحلهٔ ۲: درگاه برای گردش کار issue‌ها ───── */
var ERB_WITNESS_D = 7;
/* فهرست برای گیت‌هاب: فقط شدت ۱ و ۲، فقط فیلدهای بی نام (نمونه نمی‌رود) */
function erbList_() {
  return { ok: true, data: { rows: erbRows_().filter(function (e) { return e.sev <= 2 || e.issue; }).map(function (e) {
    return { id: e.id, fp: e.fp, src: e.src, sev: e.sev, first: e.first, last: e.last, n: e.n, st: e.st, issue: e.issue, stAt: e.stAt };
  }) } };
}
/* items: [{id, issue?, st?}]. وضعیت‌هایی که گیت‌هاب می‌تواند بگذارد: در برنامه، PR، اصلاح‌شده. «بازگشته» و «تأییدشده» فقط از خود بات. */
var ERB_GH_ST = ['در برنامه', 'PR', 'اصلاح‌شده'];
function erbSet_(p, dry) {
  var items = Array.isArray(p.items) ? p.items.slice(0, 50) : [], done = 0, skip = [];
  items.forEach(function (it) {
    var e = erbFind_(String(it.id || ''));
    if (!e) { skip.push(it.id + ': نیست'); return; }
    var issue = String(it.issue || '').trim(), st = String(it.st || '').trim(), ch = false;
    if (issue && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(issue)) { skip.push(it.id + ': پیوند نادرست'); return; }
    if (st && ERB_GH_ST.indexOf(st) < 0) { skip.push(it.id + ': وضعیت مجاز نیست'); return; }
    if (issue && issue !== e.issue) { e.issue = issue; ch = true; }
    /* «بازگشته» با PR تازه دوباره جلو می‌رود؛ «تأییدشده» دیگر دست نمی‌خورد؛ «اصلاح‌شده» با PR قدیمی عقب نمی‌رود */
    var order = { 'تازه': 0, 'بازگشته': 0, 'در برنامه': 1, 'PR': 2, 'اصلاح‌شده': 3, 'تأییدشده': 4 };
    if (st && st !== e.st && e.st !== ERB_ST.ok && (order[st] > order[e.st] || e.st === ERB_ST.back)) {
      if (!(e.st === ERB_ST.back && st === ERB_ST.plan && e.issue)) { e.st = st; e.stAt = Number(it.at) || erbNow_(); ch = true; }
    }
    if (ch) { if (!dry) erbWrite_(e); done++; }
  });
  return { ok: true, data: { updated: done, skipped: skip } };
}
/* شاهد: «اصلاح‌شده» بی تکرار ۷ روزه ← «تأییدشده». تکرار را erbAdd_ همان لحظه «بازگشته» می‌کند. */
function erbWitness_() {
  var now = erbNow_(), n = 0;
  erbRows_().forEach(function (e) {
    if (e.st === ERB_ST.fixed && e.stAt && now - e.stAt >= ERB_WITNESS_D * 86400000 && e.last <= e.stAt) { e.st = ERB_ST.ok; e.stAt = now; erbWrite_(e); n++; }
  });
  return n;
}
try { if (typeof PB_ACTIONS === 'object') { PB_ACTIONS.error_report = function (p, dry) { return erbGateway_(p, dry); }; if (PB_WRITE.indexOf('error_report') < 0) PB_WRITE.push('error_report');
  PB_ACTIONS.error_list = function () { return erbList_(); };
  PB_ACTIONS.fix_note = function (p, dry) { return erbFixNote_(p, dry); }; if (PB_WRITE.indexOf('fix_note') < 0) PB_WRITE.push('fix_note');
  PB_ACTIONS.error_set = function (p, dry) { return erbSet_(p, dry); }; if (PB_WRITE.indexOf('error_set') < 0) PB_WRITE.push('error_set');
  PB_RATE_BUCKET.error_list = PB_RATE_BUCKET.error_set = PB_RATE_BUCKET.fix_note = ['erbgh', 'erb_gh_hourly_max', 20]; PB_RATE_BUCKET.error_report = ['erb', 'erb_hourly_max', 60]; } } catch (eGw) {}
/* گزارش خطای اسنیپت‌ها از پل سایت: op «errs» اسنیپت 504064 فهرست را می‌دهد و پاک می‌کند. اسنیپت قدیمی‌تر ← بی‌صدا هیچ. */
function erbSitePull_() {
  var j;
  try { j = tgDir_('errs', {}); } catch (e) { return -1; }
  if (!j || !j.ok || !Array.isArray(j.errs)) return 0;
  j.errs.slice(0, 50).forEach(function (x) { erbAdd_(ERB_SRC.site, 'snippet ' + String(x.where || ''), String(x.msg || ''), { n: Number(x.n) || 1, sev: x.sev }); });
  return j.errs.length;
}

/* ───── ساعتی از tgWatchdog: پل سایت و گزارش ساعت ۹ ───── */
function erbHourly_() {
  try { erbSitePull_(); } catch (e) {}
  try { erbWitness_(); } catch (e) {}
  return erbDigest_();
}
function erbProp_(k, v) {
  if (erbDry_()) { if (v !== undefined) TG_MEM['erb:p:' + k] = v; return TG_MEM['erb:p:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
/* منتظر تصمیم: شدت ۱ یا ۲، «تازه» یا «بازگشته»، بی issue */
function erbAwaiting_(L) { return L.filter(function (e) { return e.sev <= 2 && (e.st === ERB_ST.fresh || e.st === ERB_ST.back) && !e.issue; }); }
function erbLine_(e) { return '• ' + ['', '🔴', '🟠', '⚪️'][e.sev] + ' ' + tgEsc_(e.fp.slice(0, 90)) + ' · ' + tgEsc_(e.src) + ' × ' + tgFa_(e.n); }
/** گزارش روزانه. برمی‌گرداند متن فرستاده‌شده یا '' */
function erbDigest_(force) {
  var now = erbNow_(), d = new Date(now), h = Number(Utilities.formatDate(d, TG_TZ, 'H')), day = Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd');
  if (!force && (h < ERB_DIGEST_H || erbProp_('ERB_DIG_DAY') === day)) return '';
  erbProp_('ERB_DIG_DAY', day);
  var since = Number(erbProp_('ERB_DIG_AT') || 0) || now - 86400000;
  erbProp_('ERB_DIG_AT', now);
  var L = erbRows_();
  var fresh = L.filter(function (e) { return e.first > since; });
  var fixed = L.filter(function (e) { return e.stAt > since && (e.st === ERB_ST.fixed || e.st === ERB_ST.ok); });
  var back = L.filter(function (e) { return e.stAt > since && e.st === ERB_ST.back; });
  var wait = erbAwaiting_(L);
  var friday = Utilities.formatDate(d, TG_TZ, 'u') === '5';
  var fx = erbFixPrs_(), fixPrs = fx.at > since ? fx.prs : [];
  var T = [], kb = [];
  if (fixPrs.length) {   /* v170.23.7: PRهای اصلاح‌گر شبانه، ادغام فقط با دکمه */
    T.push('🔧 <b>اصلاح‌های شبانه</b> (' + tgFa_(fixPrs.length) + ' PR، بررسی‌ها پیش از ادغام دوباره سنجیده می‌شوند):');
    fixPrs.forEach(function (x) { T.push('• #' + tgFa_(x.n) + ' ' + ['', '🔴', '🟠', '⚪️'][x.sev] + ' ' + tgEsc_(x.title)); });
    kb.push([{ text: '✅ ادغام همه', callback_data: 'erb:m:all' }]);
    var row = []; fixPrs.forEach(function (x) { row.push({ text: 'ادغام #' + tgFa_(x.n), callback_data: 'erb:m:' + x.n }); if (row.length === 3) { kb.push(row); row = []; } });
    if (row.length) kb.push(row);
    T.push('');
  }
  if (fresh.length || fixed.length || back.length) {
    T.push('🧯 <b>صندوق خطاها</b> · از گزارش قبل');
    if (fresh.length) { T.push('', '<b>تازه</b> (' + tgFa_(fresh.length) + '):'); fresh.sort(function (a, b) { return a.sev - b.sev || b.n - a.n; }).slice(0, 8).forEach(function (e) { T.push(erbLine_(e)); }); }
    if (back.length) { T.push('', '<b>بازگشته</b> (' + tgFa_(back.length) + '):'); back.slice(0, 5).forEach(function (e) { T.push(erbLine_(e)); }); }
    if (fixed.length) { T.push('', '<b>اصلاح‌شده</b> (' + tgFa_(fixed.length) + '):'); fixed.slice(0, 5).forEach(function (e) { T.push(erbLine_(e)); }); }
    if (wait.length) {
      T.push('', '<b>منتظر تصمیم</b> (' + tgFa_(wait.length) + '):');
      wait.sort(function (a, b) { return a.sev - b.sev || b.n - a.n; }).slice(0, 5).forEach(function (e, i) {
        T.push(tgFa_(i + 1) + '. ' + erbLine_(e).slice(2));
        kb.push([{ text: tgFa_(i + 1) + ' 📌 در برنامه', callback_data: 'erb:p:' + e.id }, { text: tgFa_(i + 1) + ' ⬇️ شدت ۳', callback_data: 'erb:l:' + e.id }]);
      });
    }
  }
  if (friday) {
    var wk = L.filter(function (e) { return e.last >= now - 7 * 86400000; });
    var open = L.filter(function (e) { return e.st !== ERB_ST.ok; });
    var S = ['📅 <b>جمع‌بندی هفته</b>: ' + tgFa_(wk.length) + ' اثر انگشت فعال · ' + tgFa_(L.filter(function (e) { return e.first >= now - 7 * 86400000; }).length) + ' تازه · ' +
             tgFa_(L.filter(function (e) { return e.stAt >= now - 7 * 86400000 && (e.st === ERB_ST.fixed || e.st === ERB_ST.ok); }).length) + ' اصلاح · باز: ' +
             [1, 2, 3].map(function (s) { return 'شدت ' + tgFa_(s) + ': ' + tgFa_(open.filter(function (e) { return e.sev === s; }).length); }).join('، ')];
    T = T.length ? T.concat([''], S) : S;
  }
  if (!T.length) return '';
  T.push('', 'فهرست کامل در تب «خطاها»ی هاب.');
  var text = T.join('\n');
  if (erbDry_()) { (TG_MEM['erb:digest'] = TG_MEM['erb:digest'] || []).push({ text: text, kb: kb }); return text; }
  TG_OUT_KIND = 'سیستم'; TG_OUT_REF = 'خطاها';
  tgSend_(TG_OWNER_CHAT, text, kb.length ? { inline_keyboard: kb } : null);
  return text;
}
/* دکمه‌های «منتظر تصمیم»: فقط مالک */
function erbCb_(chat, data) {
  if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, 'این بخش فقط برای مالک است.');
  var a = String(data).split(':'), act = a[1], e = act === 'm' ? { fp: '' } : erbFind_(a.slice(2).join(':'));
  if (!e) return tgSend_(chat, 'این خطا در صندوق پیدا نشد.');
  if (act === 'p') { e.st = ERB_ST.plan; e.stAt = erbNow_(); erbWrite_(e); return tgSend_(chat, '📌 در برنامه: ' + tgEsc_(e.fp.slice(0, 90))); }
  if (act === 'm') {   /* v170.23.7: ادغام PRهای اصلاح‌گر شبانه */
    var all = erbFixPrs_().prs.map(function (x) { return x.n; }), arg = a.slice(2).join(':');
    return tgSend_(chat, erbMergeAsk_(arg === 'all' ? all : [Number(arg)].filter(function (n) { return all.indexOf(n) > -1; })));
  }
  if (act === 'l') { e.sev = 3; erbWrite_(e); return tgSend_(chat, '⬇️ شدت ۳ شد: ' + tgEsc_(e.fp.slice(0, 90))); }
  return null;
}

/* ───── مرحلهٔ ۳: PRهای اصلاح‌گر شبانه و دکمهٔ ادغام ───── */
cfg_('GH_REPO', '');   /* مالک/نام مخزن برای فراخوانی Actions (در کد نیست) */
/* fix_note از erb-fixer.yml: {prs: [{n, title, issue, sev}]} */
function erbFixNote_(p, dry) {
  var prs = (Array.isArray(p.prs) ? p.prs : []).slice(0, 10).map(function (x) {
    return { n: Number(x.n) || 0, title: String(x.title || '').replace(/[<>]/g, '').slice(0, 120), issue: Number(x.issue) || 0, sev: Number(x.sev) || 3 };
  }).filter(function (x) { return x.n > 0; });
  if (!dry) erbProp_('ERB_FIX_PRS', JSON.stringify({ at: erbNow_(), prs: prs }));
  return { ok: true, data: { stored: prs.length } };
}
function erbFixPrs_() { try { var o = JSON.parse(erbProp_('ERB_FIX_PRS') || '{}'); return { at: Number(o.at) || 0, prs: Array.isArray(o.prs) ? o.prs : [] }; } catch (e) { return { at: 0, prs: [] }; } }
/* دکمهٔ ادغام: فقط مالک؛ گردش کار erb-merge.yml با فهرست PRها. خود گردش کار سبز بودن و برچسب‌ها را دوباره می‌سنجد. */
function erbMergeAsk_(nums) {
  var list = nums.filter(function (n) { return n > 0; }).slice(0, 10);
  if (!list.length) return 'PRی برای ادغام نیست.';
  if (erbDry_()) { (TG_MEM['erb:merge'] = TG_MEM['erb:merge'] || []).push(list.join(',')); return 'dry'; }
  var tok = PropertiesService.getScriptProperties().getProperty('GH_DISPATCH_TOKEN'), repo = String(cfg_('GH_REPO', '') || '');
  if (!tok || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return 'ادغام از بات هنوز راه نیفتاده: GH_DISPATCH_TOKEN یا GH_REPO نیست.';
  var r = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows/erb-merge.yml/dispatches', { method: 'post', muteHttpExceptions: true, contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' }, payload: JSON.stringify({ ref: 'main', inputs: { prs: list.join(',') } }) });
  var code = r.getResponseCode();
  if (code !== 204) { tgErr_('erbMergeAsk_', 'dispatch ' + code); return 'درخواست ادغام نرفت (HTTP ' + code + ').'; }
  return 'درخواست ادغام ' + list.map(function (n) { return '#' + tgFa_(n); }).join('، ') + ' رفت. هر کدام فقط اگر بررسی‌هایش سبز باشد ادغام و از همان مسیر انتشار و پایش منتشر می‌شود؛ نتیجه را خبر می‌دهم.';
}
/* ───── خواندن برای ci (پایش بعد از انتشار) و گزارش‌ها ───── */
/* هر ردیف: {t: آخرین بار, first, where, msg: نوع, n}. پایش فقط اثر انگشت‌هایی را تازه می‌داند که first آن‌ها بعد از انتشار است. */
function erbCiRows_(since) {
  return erbRows_().filter(function (e) { return e.last >= since; }).map(function (e) {
    var p = e.fp.indexOf(' · ');
    return { t: e.last, first: e.first, where: p > 0 ? e.fp.slice(0, p) : e.fp, msg: p > 0 ? e.fp.slice(p + 3) : '', n: e.n, src: e.src };
  });
}
/* یک‌بارهٔ خودکار v170.23.5: ردیف‌های هفت روز اخیر «خطاها»ی هاب پیام و «Errors» هاب تجربه به صندوق می‌آیند تا پایش انتشار
   خطای قدیمی را تازه نداند. دو تب قدیمی دست نمی‌خورند و دیگر نوشته نمی‌شوند. خروجی فقط شمار. */
function tgV170235ErrBox() {
  var since = Date.now() - 7 * 86400000, n = 0, m = 0;
  try {
    var sh = tgErrSheet_(), last = sh ? sh.getLastRow() : 0;
    if (last >= 2) {
      var from = Math.max(2, last - 1500);
      sh.getRange(from, 1, last - from + 1, 6).getValues().forEach(function (v) {
        var t = v[1] instanceof Date ? v[1].getTime() : 0; if (!t || t < since) return;
        erbImport_(erbSrcOf_(erbWhere_(v[2])), v[2], v[4], t, Number(v[5]) || 1); n++;
      });
    }
  } catch (e) {}
  try {
    var eh = tgSS_().getSheetByName('Errors');
    if (eh && eh.getLastRow() >= 2) {
      var el = eh.getLastRow(), ef = Math.max(2, el - 500);
      eh.getRange(ef, 1, el - ef + 1, 2).getValues().forEach(function (v) {
        var t = v[0] instanceof Date ? v[0].getTime() : 0, msg = String(v[1] || '');
        if (!t || t < since || msg === 'فرم تستی نادیده گرفته شد') return;
        erbImport_(ERB_SRC.site, 'Code.gs', msg, t, 1); m++;
      });
    }
  } catch (e) {}
  return 'به صندوق آمد: ' + n + ' سطر از «خطاها» و ' + m + ' سطر از «Errors» · اثر انگشت: ' + erbRows_().length;
}
/* ورود سطر قدیمی با زمان خودش، بی پیام فوری */
function erbImport_(src, where, msg, t, n) {
  var f = erbFp_(where, msg), id = erbId_(src, f.fp), e = erbFind_(id);
  if (e) { e.first = Math.min(e.first, t); e.last = Math.max(e.last, t); e.n += n; erbWrite_(e); return; }
  e = { id: id, fp: f.fp, src: src, sev: erbSev_(src, f.where, f.kind), first: t, last: t, n: n, st: ERB_ST.fresh, issue: '', stAt: t, sample: erbClean_(msg).slice(0, 400) };
  erbWrite_(e); erbCacheSet_(id, e.row);
}

/* ───── آزمون ───── */
function erbTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'erb:now': Date.UTC(2026, 9, 6, 6, 0) };   /* ۰۹:۳۰ تهران، سه‌شنبه */
  try {
    /* اثر انگشت بی عدد و نام و شماره */
    var a = erbFp_('tgLeadSet_ row 412', 'TypeError: Cannot read properties of undefined (reading \'x\') برای «نام ساختگی» شماره ' + '0912' + '0000000');   // pii:ok ساختگی
    var b = erbFp_('tgLeadSet_ row 97', 'TypeError: Cannot read properties of undefined (reading \'y\') برای «نام دیگر» شماره ' + '0935' + '0000000');   // pii:ok ساختگی
    ok('اثر انگشت: عدد و متن گیومه حذف، دو نمونه یکی‌اند', a.fp === b.fp && !/412|0912|09/.test(a.fp) && a.fp.indexOf('ساختگی') < 0, a.fp + ' | ' + b.fp);
    ok('اثر انگشت: بخش فارسی فقط هش', /متن [a-z0-9]{1,6}$/.test(erbKind_('ارسال به نام ساختگی نشد')) && erbKind_('ارسال به نام ساختگی نشد').indexOf('ساختگی') < 0);
    ok('اثر انگشت: ایمیل و نشانی و رمز پوشانده', !/@|https|AIza/.test(erbFp_('x', 'fail for a@b.co at https://x.y/z key AIza' + 'Sy'.repeat(16)).fp));
    /* شدت خودکار */
    ok('شدت ۱: لید، پرداخت، فرم سایت', erbSev_('بات', 'tgLeadSet_', 'x') === 1 && erbSev_('بات', 'tgPayVerify_', 'x') === 1 && erbSev_('سایت', 'Code.gs', 'x') === 1);
    ok('شدت ۲: کار نیمه و قابلیت', erbSev_('کار نیمه', 'انتشار پروفایل', 'x') === 2 && erbSev_('بات', 'ebiWp_ x', 'x') === 2 && erbSev_('سلامت', 'groq', 'x') === 2);
    ok('شدت ۳: بقیه', erbSev_('بات', 'tgFillJalali_', 'x') === 3);
    /* tgErr_ ← صندوق؛ تکرار شمار را بالا می‌برد */
    tgErr_('tgFillJalali_', new Error('Service Spreadsheets failed while accessing document 1234'));
    tgErr_('tgFillJalali_', new Error('Service Spreadsheets failed while accessing document 5678'));
    var L = erbRows_();
    ok('tgErr_ ← صندوق، تکرار ← همان ردیف با شمار ۲ (گذرای گوگل: شدت ۳)', L.length === 1 && L[0].n === 2 && L[0].src === 'بات' && L[0].sev === 3, JSON.stringify(L));
    /* شدت ۱ ← پیام فوری یک بار */
    tgErr_('tgLeadSet_', 'ستون وضعیت نوشته نشد');
    tgErr_('tgLeadSet_', 'ستون وضعیت نوشته نشد');
    ok('شدت ۱ ← پیام فوری فقط بار اول', (TG_MEM['erb:urgent'] || []).length === 1);
    /* کار نیمه از tgErr_ */
    tgErr_('ebiWp_ ebi/setcfg', 'http');
    ok('ebiWp_ ← منبع «کار نیمه»، شدت ۲', erbRows_().some(function (e) { return e.src === 'کار نیمه' && e.sev === 2; }));
    /* فرم سایت ← صندوق؛ فرم تستی خطا نیست */
    logError_('Exception: Invalid argument', null);
    ok('logError_ ← صندوق (سایت، شدت ۱)', erbRows_().some(function (e) { return e.src === 'سایت' && e.sev === 1 && /^Code\.gs/.test(e.fp); }));
    /* درگاه */
    var g = erbGateway_({ src: 'CI', where: 'site-mirror', msg: 'Process completed with exit code 1' });
    var g2 = erbGateway_({ src: 'هرچه', where: 'x', msg: 'y' });
    ok('درگاه error_report: CI پذیرفته، منبع ناشناخته رد', g.ok && /^X-/.test(g.data.id) && !g2.ok && erbRows_().some(function (e) { return e.src === 'CI' && e.sev === 2; }));
    ok('درگاه: اکشن ثبت شده', typeof PB_ACTIONS.error_report === 'function');
    /* پل سایت */
    TG_MEM['dirres'] = { errs: { ok: true, errs: [{ where: '506033 tj_ebi_mini', msg: 'needle not found', n: 3 }] } };
    ok('پل سایت: خطای اسنیپت ← صندوق با شمار', erbSitePull_() === 1 && erbRows_().some(function (e) { return e.src === 'سایت' && e.n === 3 && /^snippet/.test(e.fp); }));
    /* گزارش ۹ صبح */
    var txt = erbDigest_();
    var dg = (TG_MEM['erb:digest'] || [])[0];
    ok('گزارش ۹: تازه‌ها و منتظر تصمیم با دکمه', !!txt && /تازه/.test(txt) && /منتظر تصمیم/.test(txt) && dg && dg.kb.length >= 1 && /^erb:p:X-/.test(dg.kb[0][0].callback_data));
    ok('گزارش ۹: روزی یک بار', erbDigest_() === '');
    TG_MEM['erb:now'] += 86400000;
    ok('روز بعد بی تغییر ← بی پیام', erbDigest_() === '' && TG_MEM['erb:digest'].length === 1);
    /* دکمه‌ها */
    var e1 = erbRows_().filter(function (e) { return e.sev === 2; })[0];
    erbCb_(TG_OWNER_CHAT, 'erb:p:' + e1.id);
    erbCb_(TG_OWNER_CHAT, 'erb:l:' + erbRows_().filter(function (e) { return e.sev === 1; })[0].id);
    ok('دکمه: «در برنامه» و «شدت ۳»', erbFind_(e1.id).st === 'در برنامه' && erbRows_().filter(function (e) { return e.sev === 1; }).length === 1);
    ok('دکمه: غیرمالک راه ندارد', (function () { var r0 = erbRows_().map(function (e) { return e.st; }).join(); erbCb_('999', 'erb:p:' + erbRows_()[0].id); return r0 === erbRows_().map(function (e) { return e.st; }).join(); })());
    /* بازگشته */
    TG_MEM['erb:now'] += 60000;
    var e2 = erbRows_()[0]; e2.st = 'اصلاح‌شده'; erbWrite_(e2);
    tgErr_('tgFillJalali_', new Error('Service Spreadsheets failed while accessing document 9'));
    ok('اصلاح‌شده‌ای که تکرار شد ← «بازگشته»', erbFind_(e2.id).st === 'بازگشته');
    /* جمعه: جمع‌بندی هفته */
    TG_MEM['erb:now'] = Date.UTC(2026, 9, 9, 6, 0);
    var fr = erbDigest_();
    ok('جمعه: جمع‌بندی هفته', /جمع‌بندی هفته/.test(fr) && /بازگشته/.test(fr));
    /* ci */
    var cr = erbCiRows_(0);
    ok('ci: هر ردیف first و t دارد', cr.length === erbRows_().length && cr.every(function (r) { return r.first && r.t && r.where; }));
    /* مرحلهٔ ۲: درگاه گیت‌هاب و شاهد */
    TG_MEM['erb:rows'] = []; TG_MEM['erb:now'] = Date.UTC(2026, 9, 10, 6, 0);
    var x1 = erbAdd_('کار نیمه', 'انتشار پروفایل', 'نیمه: no team page');
    var x3 = erbAdd_('بات', 'tgFillJalali_', 'TypeError: x is undefined');
    var lst = erbList_().data.rows;
    ok('error_list: فقط شدت ۱ و ۲، بی نمونه', lst.length === 1 && lst[0].id === x1 && lst[0].sample === undefined);
    var U = 'https://github.com/o/r/issues/7';
    erbSet_({ items: [{ id: x1, issue: U, st: 'در برنامه' }] });
    ok('error_set: پیوند issue و «در برنامه»', erbFind_(x1).issue === U && erbFind_(x1).st === 'در برنامه');
    ok('error_set: پیوند نادرست و وضعیت غیرمجاز رد', erbSet_({ items: [{ id: x1, issue: 'https://evil.example/x' }, { id: x1, st: 'تأییدشده' }] }).data.skipped.length === 2);
    erbSet_({ items: [{ id: x1, st: 'PR' }] }); erbSet_({ items: [{ id: x1, st: 'در برنامه' }] });
    ok('error_set: وضعیت عقب نمی‌رود', erbFind_(x1).st === 'PR');
    erbSet_({ items: [{ id: x1, st: 'اصلاح‌شده', at: TG_MEM['erb:now'] }] });
    TG_MEM['erb:now'] += 6 * 86400000; erbWitness_();
    ok('شاهد: پیش از ۷ روز «اصلاح‌شده» می‌ماند', erbFind_(x1).st === 'اصلاح‌شده');
    TG_MEM['erb:now'] += 86400000 + 1; erbWitness_();
    ok('شاهد: ۷ روز بی تکرار ← «تأییدشده»', erbFind_(x1).st === 'تأییدشده');
    erbSet_({ items: [{ id: x1, st: 'در برنامه' }] });
    ok('تأییدشده با گیت‌هاب عقب نمی‌رود', erbFind_(x1).st === 'تأییدشده');
    erbAdd_('کار نیمه', 'انتشار پروفایل', 'نیمه: no team page');
    ok('تکرارِ تأییدشده ← «بازگشته» (issue همان)', erbFind_(x1).st === 'بازگشته' && erbFind_(x1).issue === U);
    erbSet_({ items: [{ id: x1, st: 'PR' }] });
    ok('بازگشته با PR تازه جلو می‌رود', erbFind_(x1).st === 'PR');
    ok('درگاه: اکشن‌های گیت‌هاب ثبت شده', typeof PB_ACTIONS.error_list === 'function' && typeof PB_ACTIONS.error_set === 'function' && PB_WRITE.indexOf('error_set') > -1);
    void x3;
    /* مرحلهٔ ۳: PRهای شبانه در پیام ۹ و دکمهٔ ادغام */
    TG_MEM['erb:now'] += 86400000; TG_MEM['erb:digest'] = [];
    erbFixNote_({ prs: [{ n: 51, title: 'اصلاح <b>x</b>', issue: 7, sev: 1 }, { n: 52, title: 'y', issue: 8, sev: 2 }, { n: 0, title: 'بد' }] });
    var dg2 = erbDigest_(true), kb2 = (TG_MEM['erb:digest'].slice(-1)[0] || {}).kb || [];
    ok('پیام ۹: PRهای شبانه با «ادغام همه» و «ادغام #N»', /اصلاح‌های شبانه/.test(dg2) && dg2.indexOf('<b>x</b>') < 0 && kb2[0][0].callback_data === 'erb:m:all' && kb2[1].length === 2 && kb2[1][1].callback_data === 'erb:m:52', JSON.stringify(kb2));
    TG_MEM['erb:merge'] = [];
    erbCb_(TG_OWNER_CHAT, 'erb:m:all'); erbCb_(TG_OWNER_CHAT, 'erb:m:52'); erbCb_(TG_OWNER_CHAT, 'erb:m:99'); erbCb_('999', 'erb:m:all');
    ok('ادغام: همه، تک، نه PR ناشناخته، نه غیرمالک', JSON.stringify(TG_MEM['erb:merge']) === JSON.stringify(['51,52', '52']), JSON.stringify(TG_MEM['erb:merge']));
    ok('درگاه: fix_note ثبت شده', typeof PB_ACTIONS.fix_note === 'function' && PB_WRITE.indexOf('fix_note') > -1);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'erbTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['صندوق یکتای خطا (v170.23.5)', 'erbTests']); } catch (eErb) {}
