/* ============================================================================
   v168: چرخهٔ پیگیری لید. فاز ۰: بهداشت داده (اجرای یک‌بارهٔ خودکار بعد از انتشار سبز)
   ----------------------------------------------------------------------------
   tgV168Hygiene:
   ۱. پشتیبان تاریخ‌دار از تب «درمانگران» پیش از هر تغییر.
   ۲. ستون‌های فرمولی K و M: هر سطری که نام دارد و فرمول ستونش را ندارد، فرمول رایج همان ستون را می‌گیرد
      (K ردیف ۲۰ که «بله» بود و M ردیف‌های ۱۷۱ و ۱۷۲ که فیل‌داون نشده بودند).
   ۳. ستون‌های I، J و L محافظت می‌شوند تا پیست دستی خرابشان نکند (فقط مالک فایل و خود بات می‌نویسند).
   ۴. نام‌های ستون‌های درمانگر پیشنهادی که در «درمانگران» نیستند و سطرهای ناهمخوان «معارفه هماهنگ شد؟» و
      «درمانگر معارفه» به‌صورت کارت برای مسئول پذیرش می‌رود. بات چیزی را حدس نمی‌زند و دست نمی‌زند.
   خروجی (که در لاگ دیپلوی می‌آید) فقط شمارش است، بدون هیچ نامی.
   ============================================================================ */

var V168_THER_HEAD_ROW = 3;
var V168_FORMULA_COLS = [11, 13];        /* K ردهٔ محاسبه، M ردهٔ ارجاع */
var V168_PROTECT_COLS = [9, 10, 12];     /* I پیشنهاد، J معارفه، L */
var V168_PROTECT_NOTE = 'v168: فقط بات و مالک فایل (بازسازی خودکار)';
var V168_SUG = ['درمانگر پیشنهادی ۱', 'درمانگر پیشنهادی ۲', 'درمانگر پیشنهادی ۳'];

/* فرمول رایج یک ستون (R1C1) و سطرهایی که نام دارند و آن را ندارند. rows: [{name, f}] به ترتیب سطر */
function v168FormulaGaps_(rows) {
  var cnt = {}, best = '', bn = 0;
  rows.forEach(function (r) { if (r.f) { cnt[r.f] = (cnt[r.f] || 0) + 1; if (cnt[r.f] > bn) { bn = cnt[r.f]; best = r.f; } } });
  if (!best) return { f: '', fix: [] };
  var fix = [];
  rows.forEach(function (r, i) { if (String(r.name || '').trim() && r.f !== best && !r.f) fix.push(i); });
  return { f: best, fix: fix };
}

function v168Norm_(s) { return String(s || '').replace(/\s+/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim(); }

/* leads: [{code, sug: [..], t, v}], names: نام درمانگران. خروجی فقط برای کارت داخلی */
function v168LeadChecks_(leads, names) {
  var known = {};
  names.forEach(function (n) { known[v168Norm_(n)] = 1; });
  var unk = {}, order = [], tv = [];
  leads.forEach(function (l) {
    (l.sug || []).forEach(function (s) {
      var n = v168Norm_(s);
      if (!n || known[n]) return;
      if (!unk[n]) { unk[n] = { name: n, codes: [] }; order.push(n); }
      unk[n].codes.push(l.code);
    });
    var t = v168Norm_(l.t), v = v168Norm_(l.v);
    if (v && t !== 'بله') tv.push({ code: l.code, why: 'درمانگر معارفه ثبت است ولی «معارفه هماهنگ شد؟» ' + (t ? '«' + t + '»' : 'خالی') + ' است' });
    else if (!v && t === 'بله') tv.push({ code: l.code, why: '«معارفه هماهنگ شد؟» بله است ولی درمانگر معارفه خالی است' });
  });
  return { unknown: order.map(function (n) { return unk[n]; }), tv: tv };
}

function v168CheckText_(r) {
  var t = ['🧹 <b>بررسی یک‌بارهٔ داده‌های لید</b>'];
  if (r.unknown.length) {
    t.push('\nاین نام‌ها در ستون‌های درمانگر پیشنهادی هست ولی در تب «درمانگران» نیست. لطفاً روشن کنید هرکدام کیست:');
    r.unknown.forEach(function (u) { t.push('• ' + tgEsc_(u.name) + ' (' + tgFa_(String(u.codes.length)) + ' بار): ' + u.codes.map(tgEsc_).join('، ')); });
  }
  if (r.tv.length) {
    t.push('\nاین لیدها در «معارفه هماهنگ شد؟» و «درمانگر معارفه» با هم نمی‌خوانند:');
    r.tv.forEach(function (x) { t.push('• ' + tgEsc_(x.code) + ': ' + x.why); });
  }
  t.push('\nلطفاً همین سطرها را در تب لیدها درست کنید. بات چیزی را حدس نمی‌زند و دست نمی‌زند.');
  return t.join('\n');
}

/* گیرندهٔ کارت: مسئول پذیرش؛ اگر نبود، یاسر */
function v168DeskLead_() {
  var desk = [];
  try { desk = TG_DRY ? (TG_MEM['desk'] || []) : tgDeskRows_(); } catch (e) {}
  var out = [];
  desk.filter(function (r) { return r.chat && String(r.role || '').indexOf('مسئول پذیرش') > -1; }).forEach(function (r) {
    var c = String(r.chat).split(/[,،;\s]+/)[0];
    if (c && out.indexOf(c) < 0) out.push(c);
  });
  return out.length ? out : [String(TG_OWNER_CHAT)];
}

function tgV168Hygiene() {
  var ss = tgSS_(), sh = ss.getSheetByName(TG_THER), res = [];
  if (!sh) return 'تب درمانگران پیدا نشد';
  var day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  /* ۱. پشتیبان */
  var bname = 'پشتیبان درمانگران ' + day;
  if (!ss.getSheetByName(bname)) { var b = sh.copyTo(ss).setName(bname); try { b.hideSheet(); } catch (e) {} }
  res.push('پشتیبان: ساخته شد');
  /* ۲. فرمول‌های K و M */
  var first = V168_THER_HEAD_ROW + 1, n = sh.getLastRow() - V168_THER_HEAD_ROW;
  if (n > 0) {
    var names = sh.getRange(first, TG_C_NAME, n, 1).getValues();
    V168_FORMULA_COLS.forEach(function (col) {
      var fr = sh.getRange(first, col, n, 1).getFormulasR1C1();
      var g = v168FormulaGaps_(names.map(function (x, i) { return { name: x[0], f: fr[i][0] }; }));
      g.fix.forEach(function (i) { sh.getRange(first + i, col).setFormulaR1C1(g.f); });
      res.push('ستون ' + String.fromCharCode(64 + col) + ': ' + g.fix.length + ' فرمول برگشت');
    });
  }
  /* ۳. محافظت I، J، L */
  var have = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).map(function (p) { return p.getDescription(); });
  var made = 0;
  V168_PROTECT_COLS.forEach(function (col) {
    var note = V168_PROTECT_NOTE + ' · ' + String.fromCharCode(64 + col);
    if (have.indexOf(note) > -1) return;
    var p = sh.getRange(first, col, Math.max(1, sh.getMaxRows() - first + 1), 1).protect().setDescription(note);
    try { p.removeEditors(p.getEditors()); if (p.canDomainEdit()) p.setDomainEdit(false); } catch (e) {}
    made++;
  });
  res.push('محافظت: ' + made + ' ستون تازه');
  /* ۴. کارت مسئول پذیرش */
  try {
    var thn = n > 0 ? sh.getRange(first, TG_C_NAME, n, 1).getValues().map(function (x) { return x[0]; }).filter(String) : [];
    var ls = ss.getSheetByName(TG_LEADS);
    var head = ls.getRange(1, 1, 1, ls.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    var ix = function (h) { return head.indexOf(h); };
    var cCode = ix('کد لید'), cT = ix('معارفه هماهنگ شد؟'), cV = ix('درمانگر معارفه'), cS = V168_SUG.map(ix);
    var lv = ls.getLastRow() > 1 ? ls.getRange(2, 1, ls.getLastRow() - 1, head.length).getValues() : [];
    var leads = lv.map(function (r, i) {
      return { code: (cCode > -1 && String(r[cCode]).trim()) || ('سطر ' + (i + 2)),
               sug: cS.filter(function (c) { return c > -1; }).map(function (c) { return r[c]; }),
               t: cT > -1 ? r[cT] : '', v: cV > -1 ? r[cV] : '' };
    });
    var chk = v168LeadChecks_(leads, thn);
    if (chk.unknown.length || chk.tv.length) v168DeskLead_().forEach(function (c) { tgSend_(c, v168CheckText_(chk)); });
    res.push('نام ناشناخته: ' + chk.unknown.length + ' · ناهمخوانی معارفه: ' + chk.tv.length + ' (کارت برای مسئول پذیرش)');
  } catch (e2) { tgErr_('tgV168Hygiene', e2); res.push('بررسی لیدها: خطا'); }
  try { CacheService.getScriptCache().remove('trows'); } catch (e3) {}
  return res.join(' · ');
}

/* ============================================================================
   فاز ۲: تکلیف لید. هیچ لید بازی بی «اقدام بعدی» و «تاریخ اقدام بعدی» نیست.
   - پیش‌فرض‌ها در تب «پیش‌فرض اقدام بعدی» هاب تجربه است (نه عدد پخش‌شده در کد).
   - نگهبان در tgLeadSet_ (v168NextFix_): لید باز بی اقدام یا بی تاریخ پیش‌فرض می‌گیرد و رویدادش «خودکار» ثبت می‌شود؛
     پیش‌آمدهای اصلی (تماس، بی‌پاسخ، ارجاع، رزرو، برگزاری) اقدام بعدی را جلو می‌برند مگر کسی صریح نوشته باشد؛
     لید بسته اقدام بعدی ندارد.
   - لید تازه از بات همان لحظه «تماس اول، امروز» می‌گیرد؛ لیدهای فرم سایت را جاروی ساعتی tgWatchdog پر می‌کند.
   - «⏰ بعداً» روی کارت: موعد را جابه‌جا می‌کند و دلیل می‌پرسد. سه بار پشت سر هم ← خبر به مسئول پذیرش.
   ============================================================================ */

var V168_T_VOCAB = 'واژگان';
var V168_T_DEF = 'پیش‌فرض اقدام بعدی';
var V168_DEF_HEAD = ['پیش‌آمد', 'اقدام بعدی', 'چند روز بعد', 'توضیح'];
var V168_DEF_SEED = [
  ['لید تازه', 'تماس اول', 0, 'همان روز ثبت'],
  ['تماس گرفتم', 'تماس پیگیری', 2, 'اگر پذیرش از دکمه‌های موعد چیزی انتخاب نکرد'],
  ['بی‌پاسخ', 'تماس پیگیری', 2, ''],
  ['ارجاع', 'منتظر پاسخ درمانگر', 1, ''],
  ['رزرو معارفه', 'یادآوری معارفه', -1, 'منفی یعنی چند روز پیش از تاریخ معارفه'],
  ['برگزاری معارفه', 'پیگیری بعد از معارفه', 3, 'همان TG_START_DAYS'],
  ['باز بی‌اقدام', 'تماس پیگیری', 2, 'هر لید باز دیگری که اقدام یا تاریخ ندارد']
];
/* فهرست‌های بسته. هر ستون تب «واژگان» یک فهرست است؛ فازهای بعد ستون اضافه می‌کنند. */
var V168_VOCAB = {
  'اقدام بعدی': ['تماس اول', 'تماس پیگیری', 'پیام پیگیری', 'منتظر پاسخ مراجع', 'ارجاع به درمانگر', 'منتظر پاسخ درمانگر',
                 'هماهنگی وقت معارفه', 'یادآوری معارفه', 'پیگیری بعد از معارفه', 'پیگیری پرداخت و شروع', 'بستن'],
  'دلیل عقب‌انداختن': ['مراجع جواب نداد', 'مراجع خواست بعداً', 'منتظر درمانگر', 'وقت نشد', 'دلیل دیگر']
};
var V168_PP_MAX = 3;          /* چند «بعداً»ی پشت سر هم تا خبر به مسئول پذیرش */
var V168_NEW_FIELDS = ['مهلت', 'شمار جابه‌جایی'];

function v168VocabRows_() {
  var keys = Object.keys(V168_VOCAB), n = 0, out = [];
  keys.forEach(function (k) { n = Math.max(n, V168_VOCAB[k].length); });
  for (var i = 0; i < n; i++) out.push(keys.map(function (k) { return V168_VOCAB[k][i] || ''; }));
  return out;
}
/* یک فهرست بسته از تب «واژگان» (کش ۱۰ دقیقه)؛ اگر ستون نبود، همان پیش‌فرض کد */
function v168Vocab_(name) {
  var m = pbCache_('v168voc', function () {
    var o = {};
    try {
      pbRows_('e', V168_T_VOCAB, Object.keys(V168_VOCAB), v168VocabRows_()).forEach(function (r) {
        Object.keys(r).forEach(function (k) { if (k === '_row') return; var v = String(r[k] == null ? '' : r[k]).trim(); if (v) (o[k] = o[k] || []).push(v); });
      });
      /* فهرستی که در کد هست و ستونش در شیت خالی است (فاز تازه): یک بار در شیت نوشته می‌شود */
      if (!TG_DRY) {
        var miss = Object.keys(V168_VOCAB).filter(function (k) { return !o[k]; });
        if (miss.length) {
          var sh = tgSS_().getSheetByName(V168_T_VOCAB), hd = PB_HEAD_X[V168_T_VOCAB] || [];
          miss.forEach(function (k) {
            var c = hd.indexOf(k) + 1;
            if (c > 0) sh.getRange(2, c, V168_VOCAB[k].length, 1).setValues(V168_VOCAB[k].map(function (x) { return [x]; }));
            o[k] = V168_VOCAB[k].slice();
          });
        }
      }
    } catch (e) {}
    return o;
  });
  return (m[name] && m[name].length) ? m[name] : (V168_VOCAB[name] || []).slice();
}
function v168Defaults_() {
  return pbCache_('v168def', function () {
    var o = {};
    V168_DEF_SEED.forEach(function (r) { o[r[0]] = { next: r[1], days: r[2] }; });
    try {
      pbRows_('e', V168_T_DEF, V168_DEF_HEAD, V168_DEF_SEED).forEach(function (r) {
        var k = String(r['پیش‌آمد'] || '').trim(), nx = String(r['اقدام بعدی'] || '').trim();
        var d = Number(tgLatinDigits_(String(r['چند روز بعد'] == null ? '' : r['چند روز بعد'])));
        if (k && nx) o[k] = { next: nx, days: isFinite(d) ? d : 0 };
      });
    } catch (e) {}
    return o;
  });
}
function v168Day_(today, n) {
  var d = new Date(today + 'T12:00:00+03:30');
  return Utilities.formatDate(new Date(d.getTime() + n * 86400000), TG_TZ, 'yyyy-MM-dd');
}

/* cur: {status, next, nextDate, meetDate, touched}؛ changes: همان ورودی tgLeadSet_.
   خروجی: { add: تغییرهای خودکار، ev: نام پیش‌آمد } (add خالی یعنی کاری لازم نیست) */
function v168NextPlan_(cur, changes, today) {
  cur = cur || {};
  var has = function (k) { return Object.prototype.hasOwnProperty.call(changes, k); };
  var val = function (k, c) { return has(k) ? String(changes[k] == null ? '' : changes[k]).trim() : String(c == null ? '' : c).trim(); };
  var st = val('وضعیت', cur.status), next = val('اقدام بعدی', cur.next), date = val('تاریخ اقدام بعدی', cur.nextDate);
  var add = {};
  if (tgStClosed_(st)) {
    if (next) add['اقدام بعدی'] = '';
    if (date) add['تاریخ اقدام بعدی'] = '';
    return { add: add, ev: 'بستن' };
  }
  var ev = '';
  var stNew = has('وضعیت') ? tgStOf_(changes['وضعیت']) : '';
  if (has('معارفه هماهنگ شد؟') && String(changes['معارفه هماهنگ شد؟']).trim() === 'بله') ev = 'رزرو معارفه';
  else if (stNew === TG_ST.BOOKED) ev = 'رزرو معارفه';
  else if (stNew === TG_ST.HELD) ev = 'برگزاری معارفه';
  else if (has('تاریخ ارجاع') || stNew === TG_ST.REF) ev = 'ارجاع';
  else if (has('شمار بی‌پاسخ')) ev = 'بی‌پاسخ';
  else if (has('آخرین تماس')) ev = 'تماس گرفتم';
  var D = v168Defaults_();
  if (ev && !has('اقدام بعدی')) {
    var p = D[ev] || D['باز بی‌اقدام'];
    add['اقدام بعدی'] = p.next;
    if (!has('تاریخ اقدام بعدی')) add['تاریخ اقدام بعدی'] = v168When_(p.days, ev, cur, changes, today);
  } else {
    var k = ev || (cur.touched || has('آخرین تماس') ? 'باز بی‌اقدام' : 'لید تازه');
    var q = D[k] || D['باز بی‌اقدام'];
    if (!next) add['اقدام بعدی'] = q.next;
    if (!date) add['تاریخ اقدام بعدی'] = v168When_(q.days, k, cur, changes, today);
    ev = k;
  }
  Object.keys(add).forEach(function (x) { if (String(add[x]) === (x === 'اقدام بعدی' ? next : date)) delete add[x]; });
  return { add: add, ev: ev };
}
function v168When_(days, ev, cur, changes, today) {
  if (days < 0) {
    var md = tgLeadIso_(Object.prototype.hasOwnProperty.call(changes, 'تاریخ معارفه') ? changes['تاریخ معارفه'] : cur.meetDate);
    if (md) { var d = v168Day_(md, days); return d < today ? today : d; }
    return today;
  }
  return v168Day_(today, days);
}

/* نگهبان tgLeadSet_: کنار تغییرهای ورودی، تغییرهای خودکار را برمی‌گرداند و نام‌شان را در auto */
function v168NextFix_(cur, changes) {
  try {
    var today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
    var out = {}, auto = {};
    Object.keys(changes).forEach(function (k) { out[k] = changes[k]; });
    if (typeof v168NormChanges_ === 'function') v168NormChanges_(out);   /* فاز ۷: واژگان بسته */
    /* فاز ۴: T و V با هم */
    var tv = v168TvPlan_(cur, out);
    if (tv.drop) { delete out[tv.drop]; tgErr_('tgLeadSet_', '«معارفه هماهنگ شد؟» بی درمانگر معارفه نوشته نشد'); }
    Object.keys(tv).forEach(function (k) { if (k !== 'drop') { out[k] = tv[k]; auto[k] = 'خودکار: T و V با هم'; } });
    var plan = v168NextPlan_(cur, out, today);
    Object.keys(plan.add).forEach(function (k) { out[k] = plan.add[k]; auto[k] = 'خودکار: ' + plan.ev; });
    return { changes: out, auto: auto };
  } catch (e) { tgErr_('v168NextFix_', e); return { changes: changes, auto: {} }; }
}
/* وضعیت فعلی لید از سطر خوانده‌شده (برای نگهبان، بدون خواندن دوباره) */
function v168CurFromRow_(v, hm) {
  var g = function (h) { var i = hm[h]; return (i === undefined || i < 0 || i >= v.length) ? '' : v[i]; };
  return { status: String(g('وضعیت') || '').trim(), next: String(g('اقدام بعدی') || '').trim(), nextDate: tgLeadIso_(g('تاریخ اقدام بعدی')),
           meetDate: tgLeadIso_(g('تاریخ معارفه')), touched: !!String(g('آخرین تماس') || '').trim(),
           t: String(g('معارفه هماهنگ شد؟') || '').trim(), v: String(g('درمانگر معارفه') || '').trim() };
}
function v168CurDry_(row) {
  var l = TG_DRY_LEAD && TG_DRY_LEAD.row === row ? TG_DRY_LEAD : null;
  if (!l) return null;
  return { status: l.status || '', next: l.next || '', nextDate: l.nextDate || '', meetDate: l.meetDate || '', touched: !!l.touched,
           t: l.booked ? 'بله' : (l.bookedRaw || ''), v: l.meetTher || '' };
}

/* لید تازه از بات: «تماس اول»، امروز (از جدول پیش‌فرض)، مگر خودش اقدام داشته باشد */
function v168NewLeadNext_(o) {
  try { if (typeof v168NewLeadVocab_ === 'function') v168NewLeadVocab_(o); } catch (eV) { tgErr_('v168NewLeadVocab_', eV); }   /* فاز ۷ */
  try {
    if (tgStClosed_(o.status || '')) return o;
    o.extra = o.extra || {};
    var p = v168Defaults_()['لید تازه'] || { next: 'تماس اول', days: 0 };
    var today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
    if (!o.extra['اقدام بعدی']) o.extra['اقدام بعدی'] = p.next;
    if (!o.extra['تاریخ اقدام بعدی']) o.extra['تاریخ اقدام بعدی'] = v168Day_(today, p.days);
  } catch (e) { tgErr_('v168NewLeadNext_', e); }
  return o;
}

/* ---------- «⏰ بعداً» ---------- */
function v168PpGet_() { try { return JSON.parse((TG_DRY ? TG_MEM['V168_PP'] : PropertiesService.getScriptProperties().getProperty('V168_PP')) || '{}'); } catch (e) { return {}; } }
function v168PpPut_(m) {
  var s = JSON.stringify(m);
  if (TG_DRY) { TG_MEM['V168_PP'] = s; return; }
  try { PropertiesService.getScriptProperties().setProperty('V168_PP', s); } catch (e) {}
}
/* هر کار واقعی روی لید (جز خود «بعداً») شمار پشت‌سرهم را صفر می‌کند */
function v168PpReset_(code) {
  if (!code) return;
  var m = v168PpGet_();
  if (m[code]) { delete m[code]; v168PpPut_(m); }
}
function v168Later_(cq, chat, me, row, code, act, arg, l0) {
  if (act === 'lt') {
    return tgSend_(chat, '⏰ موعد ' + tgEsc_(code) + ' کی باشد؟', { inline_keyboard: [
      [{ text: 'فردا', callback_data: 'ld:lt2:' + code + ':1' }, { text: '۳ روز دیگر', callback_data: 'ld:lt2:' + code + ':3' },
       { text: 'یک هفته', callback_data: 'ld:lt2:' + code + ':7' }],
      [{ text: '↩️ کارت', callback_data: 'ld:back:' + code }]
    ] });
  }
  var a = String(arg || '').split(':'), d = Number(a[0]) || 1;
  var rs = v168Vocab_('دلیل عقب‌انداختن');
  if (act === 'lt2') {
    var kb = [];
    for (var i = 0; i < rs.length; i += 2) kb.push(rs.slice(i, i + 2).map(function (r, j) { return { text: r, callback_data: 'ld:lt3:' + code + ':' + d + ':' + (i + j) }; }));
    kb.push([{ text: '↩️ کارت', callback_data: 'ld:back:' + code }]);
    return tgSend_(chat, 'چرا عقب می‌افتد؟', { inline_keyboard: kb });
  }
  if (act === 'lt3') {
    var why = rs[Number(a[1])] || 'دلیل دیگر';
    var today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
    tgLeadSet_(row, { 'تاریخ اقدام بعدی': v168Day_(today, d) }, me, 'تلگرام', 'بعداً: ' + why);
    var m = v168PpGet_();
    m[code] = (m[code] || 0) + 1;
    v168PpPut_(m);
    if (m[code] % V168_PP_MAX === 0) {
      var txt = '⏰ لید <code>' + tgEsc_(code) + '</code> ' + tgFa_(String(m[code])) + ' بار پشت سر هم عقب افتاده است. آخرین دلیل: ' + tgEsc_(why) + '.';
      v168DeskLead_().forEach(function (c) { if (String(c) !== String(chat)) { tgSend_(c, txt); try { tgLeadCardSend_(c, row); } catch (e) {} } });
    }
    tgLeadCardEdit_(cq, tgLeadRead_(row));
    return null;
  }
  return null;
}

/* ---------- جارو: لید باز بی تکلیف (لیدهای فرم سایت و هر جای دیگر) ---------- */
/* rows: سطرهای تب لیدها، hm: نقشهٔ سرستون. خروجی: شمارهٔ سطرهای باز بی اقدام یا بی تاریخ */
function v168Missing_(rows, hm, first) {
  var out = [];
  rows.forEach(function (v, i) {
    var c = v168CurFromRow_(v, hm);
    var any = v.some(function (x) { return String(x).trim(); });
    if (!any || tgStClosed_(c.status)) return;
    if (!c.next || !c.nextDate) out.push((first || 2) + i);
  });
  return out;
}
function v168NextStats_() {
  var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow();
  if (last < 2) return { open: 0, noNext: 0, noDate: 0 };
  var hm = tgLeadHeadMap_(sh), v = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues(), o = { open: 0, noNext: 0, noDate: 0 };
  v.forEach(function (r) {
    if (!r.some(function (x) { return String(x).trim(); })) return;
    var c = v168CurFromRow_(r, hm);
    if (tgStClosed_(c.status)) return;
    o.open++; if (!c.next) o.noNext++; if (!c.nextDate) o.noDate++;
  });
  return o;
}
/* هر ساعت از tgWatchdog؛ حداکثر ۴۰ سطر در هر دور تا زمان اجرا بالا نرود */
function v168NextSweep_(maxRows) {
  if (TG_DRY) return 0;
  var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow();
  if (last < 2) return 0;
  var hm = tgLeadHeadMap_(sh), v = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var miss = v168Missing_(v, hm, 2).slice(0, maxRows || 40);
  miss.forEach(function (r) { tgLeadSet_(r, {}, 'بات', 'بات', 'جارو: لید باز بی اقدام بعدی'); });
  return miss.length;
}

/* ---------- اجرای یک‌باره: پشتیبان، ستون‌های تازه، تب‌ها، فهرست کشویی، پر کردن لیدهای باز ---------- */
function tgV168NextFill() {
  var ss = tgSS_(), sh = ss.getSheetByName(TG_LEADS), res = [];
  var day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  var bname = 'پشتیبان لیدها ' + day;
  if (!ss.getSheetByName(bname)) { var b = sh.copyTo(ss).setName(bname); try { b.hideSheet(); } catch (e) {} }
  V168_NEW_FIELDS.forEach(function (f) { tgLeadCol_(f); });
  pbRows_('e', V168_T_DEF, V168_DEF_HEAD, V168_DEF_SEED);
  pbRows_('e', V168_T_VOCAB, Object.keys(V168_VOCAB), v168VocabRows_());
  try {
    var vs = ss.getSheetByName(V168_T_VOCAB), vh = vs.getRange(1, 1, 1, vs.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    var vc = vh.indexOf('اقدام بعدی') + 1, nc = tgLeadCol_('اقدام بعدی');
    if (vc > 0 && nc > 0) {
      var rule = SpreadsheetApp.newDataValidation().requireValueInRange(vs.getRange(2, vc, Math.max(1, vs.getMaxRows() - 1), 1), true).setAllowInvalid(true).build();
      sh.getRange(2, nc, Math.max(1, sh.getMaxRows() - 1), 1).setDataValidation(rule);
      res.push('فهرست کشویی اقدام بعدی: گذاشته شد');
    }
  } catch (e2) { tgErr_('tgV168NextFill کشویی', e2); }
  var before = v168NextStats_();
  res.push('پیش از پر کردن: باز ' + before.open + ' · بی اقدام ' + before.noNext + ' · بی تاریخ ' + before.noDate);
  var n = 0, t0 = Date.now();
  while (Date.now() - t0 < 240000) { var k = v168NextSweep_(60); n += k; if (!k) break; }
  var after = v168NextStats_();
  res.push('پر شد: ' + n + ' لید · بعد: باز ' + after.open + ' · بی اقدام ' + after.noNext + ' · بی تاریخ ' + after.noDate);
  return res.join(' · ');
}

/* ============================================================================
   فاز ۳: «کار امروز» واحد. tgTodayList_ تنها منبع کارتابل، دایجست صبح و عصر و «📥 کارهای روی زمین» است
   و شمار «لید باز» همه‌جا tgOpenLeads_ است. تب «🧭 CRM لیدها» بسته شد.
   کار امروز یعنی لید بازی که «تاریخ اقدام بعدی»اش امروز یا گذشته است (اگر تاریخ نداشت: تماس اول نگرفته یا بی‌حرکت).
   ============================================================================ */
var V168_T_QUEUE = 'کارتابل پیگیری';
var V168_Q_HEAD = ['کد لید', 'نام', 'منبع', 'مسئول', 'تاریخ اقدام بعدی', 'اقدام بعدی', 'چرا امروز', 'وضعیت', 'شماره', 'تاریخ شمسی', 'نوع لید',
  /* v170.23.22 */ 'پنجرهٔ تماس (تهران)', 'تماس بعدی کِی', 'چند بار تماس', 'کانال در دسترس'];   /* v170.2: نوع لید با فیلتر */
/* v170.23.22: رنگ فقط معنی‌دار: قرمز = الان داخل پنجره و دیرشده، نارنجی = امروز، خاکستری = بیرون از پنجره */
var V168_Q_COLOR = { late: '#eec3c7', today: '#fde9c9', out: '#f5f5f8' };

function v168DayDiff_(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000); }
function tgTodayList_(owner, date, list) {
  var d = date || Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  var all = list || tgOpenLeads_();
  var due = all.filter(function (l) {
    if (owner && l.owner !== owner) return false;
    return l.nextDate ? l.nextDate <= d : l.stage !== 'live';
  }).map(function (l) {
    var why;
    if (!l.nextDate) why = l.touched ? 'بی موعد و بی‌حرکت' : 'تماس اول، بی موعد';
    else if (l.nextDate < d) why = 'عقب‌افتاده ' + tgFa_(String(v168DayDiff_(l.nextDate, d))) + ' روز';
    else why = l.touched ? 'موعد امروز' : 'تماس اول امروز';
    var o = {}; for (var k in l) o[k] = l[k]; o.why = why;
    return o;
  });
  due.sort(function (a, b) {
    var x = a.nextDate || '0000', y = b.nextDate || '0000';
    return x < y ? -1 : (x > y ? 1 : (b.age || 0) - (a.age || 0));
  });
  return due;
}
/* سطرهای تب کارتابل از همان فهرست؛ خلاصه از همان شمارش دایجست */
function v168QueueRows_(open, date) {
  var b = tgLeadBuckets_(open), now = typeof lsNow_ === 'function' ? lsNow_() : Date.now(), today = Utilities.formatDate(new Date(now), TG_TZ, 'yyyy-MM-dd');
  /* v170.23.22: پنجرهٔ تماس، ترتیب «الان داخل پنجره و موعدگذشته» اول، و رنگ معنی‌دار */
  var t = b.today.map(function (l) {
    var tz = abLeadTz_(l), best = abLeadBest_(l), w = abWinTehran_(tz, best, now), inNow = abInWinNow_(tz, best, now);
    var late = inNow && (!l.touched || (l.nextDate && l.nextDate < today));
    return { l: l, w: w, inNow: inNow, late: late, color: late ? 'late' : (inNow ? 'today' : 'out') };
  }).sort(function (a, b2) { return (b2.late - a.late) || (b2.inNow - a.inNow) || (a.w.from - b2.w.from) || ((a.l.nextDate || '') < (b2.l.nextDate || '') ? -1 : 1); });
  return {
    open: open.length, today: t.length, first: b.first.length, stale: b.stale.length, colors: t.map(function (x) { return x.color; }),
    rows: t.map(function (x) {
      var l = x.l, tz = abLeadTz_(l), best = abLeadBest_(l);
      var when = (l.nextDate && l.nextDate > today ? tgLeadJ_(l.nextDate) + ' ' : '') + abHm_(x.w.from);
      var tries = (l.noans || 0) + (l.touched && !/پاسخ نداد/.test(l.result || '') ? 1 : 0);
      var chan = l.pref || (/بات|تلگرام/.test(l.src + ' ' + l.channel) ? 'تلگرام (بات)' : (/WhatsApp|واتس/.test(l.src + ' ' + l.channel) ? 'واتس‌اپ' : (l.phone ? 'تلفن' : 'نامعلوم')));
      return [l.code || ('سطر ' + l.row), l.name || '', l.src || '', l.owner || 'بی‌مسئول', l.nextDate || '', l.next || '', l.why, l.status || 'جدید', l.phone || '',
              l.nextDate ? tgLeadJ_(l.nextDate) : '', l.type || 'مراجع', abWinLabel_(tz, best, now), when, String(tries), chan];
    })
  };
}
function v168QueueWrite_(open) {
  if (TG_DRY) return null;
  var ss = tgSS_(), sh = ss.getSheetByName(V168_T_QUEUE);
  if (!sh) { sh = ss.insertSheet(V168_T_QUEUE, 0); sh.setRightToLeft(true); }
  var q = v168QueueRows_(open || tgOpenLeads_());
  try { var f0 = sh.getFilter(); if (f0) f0.remove(); } catch (eF) {}
  sh.clear();
  var now = new Date();
  sh.getRange(1, 1, 4, 1).setValues([['📋 کارتابل پیگیری'],
    ['لید باز: ' + tgFa_(String(q.open)) + ' · کار امروز: ' + tgFa_(String(q.today)) + ' (تماس اول ' + tgFa_(String(q.first)) + ' · پیگیری ' + tgFa_(String(q.stale)) + ')'],
    ['به‌روز: ' + tgJDateFull_(now, TG_TZ) + ' ' + Utilities.formatDate(now, TG_TZ, 'HH:mm')],
    ['همان فهرست دایجست بات و «📥 کارهای روی زمین». هر ساعت از تب لیدها بازنویسی می‌شود؛ کار را روی کارت لید در بات یا در تب لیدها انجام دهید.']]);
  sh.getRange(1, 1).setFontSize(15).setFontWeight('bold');
  sh.getRange(6, 1, 1, V168_Q_HEAD.length).setValues([V168_Q_HEAD]).setFontWeight('bold').setBackground('#222222').setFontColor('#fefefe');
  if (q.rows.length) {
    sh.getRange(7, 1, q.rows.length, V168_Q_HEAD.length).setNumberFormat('@').setValues(q.rows);
    sh.getRange(7, 1, q.rows.length, V168_Q_HEAD.length).setBackgrounds((q.colors || []).map(function (c) { return V168_Q_HEAD.map(function () { return V168_Q_COLOR[c] || '#fefefe'; }); }));
  }
  try { sh.getRange(5, 1).setValue('🔴 قرمز: الان داخل پنجرهٔ تماس و دیرشده · 🟠 نارنجی: الان داخل پنجره، امروز · ⚪️ خاکستری: بیرون از پنجره').setFontColor('#676768'); } catch (eL) {}
  try { sh.getRange(6, 1, Math.max(2, q.rows.length + 1), V168_Q_HEAD.length).createFilter(); } catch (eF2) {}   /* v170.2: فیلتر نوع لید */
  sh.setFrozenRows(6);
  return q;
}
/* یک‌باره: پشتیبان کارتابل فرمولی، بستن تب CRM، گزارش هاب آمار با ستون «باز»، اولین ساخت کارتابل */
function tgV168QueueSetup() {
  var ss = tgSS_(), res = [], day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  var q0 = ss.getSheetByName(V168_T_QUEUE);
  if (q0 && !ss.getSheetByName('پشتیبان کارتابل ' + day)) { var b = q0.copyTo(ss).setName('پشتیبان کارتابل ' + day); try { b.hideSheet(); } catch (e) {} res.push('پشتیبان کارتابل: ساخته شد'); }
  var crm = ss.getSheetByName(TG_CRM_TAB);
  if (crm) {
    if (!ss.getSheetByName('پشتیبان CRM ' + day)) { var c = crm.copyTo(ss).setName('پشتیبان CRM ' + day); try { c.hideSheet(); } catch (e) {} }
    crm.clear();
    crm.getRange(1, 1).setValue('این تب بسته شد. کار امروز در «کارتابل پیگیری» و دایجست بات است.');
    try { crm.hideSheet(); } catch (e2) {}
    res.push('CRM: بسته شد');
  }
  try { tgRptSetup(); res.push('گزارش پذیرش: با ستون «باز»'); } catch (e3) { tgErr_('tgV168QueueSetup گزارش', e3); }
  var n = tgCrmBuild();
  var o = tgOpenLeads_(), b2 = tgLeadBuckets_(o);
  res.push('لید باز ' + o.length + ' · کار امروز ' + b2.today.length + ' · سطر داده ' + n);
  return res.join(' · ');
}

/* ============================================================================
   فاز ۴: چرخهٔ کامل معارفه
   - ماشین حالت روی سطر اسلات (ستون «حالت معارفه»): رزرو شد ← برگزار شد | مراجع نیامد | درمانگر نیامد | لغو شد | جابه‌جا شد.
     هر حالت پایانی جز «برگزار شد» دلیل دارد (ستون «دلیل»، از فهرست‌های تب «واژگان»).
   - پیگیری خودکار در tgMeetTick (هر ۳۰ دقیقه): ۳۰ دقیقه بعد از پایان از درمانگر، ۴ ساعت بعد از پذیرش،
     پایان روز کاری از مسئول پذیرش (و لید «پیگیری بعد از معارفه» برای فردا)، بعد هر ۲۴ ساعت.
   - «مراجع نیامد» ← کارت سه‌دکمه‌ای به پذیرش: زمان تازه با همین درمانگر، درمانگر دیگر، بستن با دلیل.
   - ld:rs و ld:sw معارفهٔ تازه را به قبلی پیوند می‌دهند (ستون «از معارفهٔ») و «شمار جابه‌جایی» لید را یکی بالا می‌برند.
   - T («معارفه هماهنگ شد؟») و V («درمانگر معارفه») همیشه با هم: نگهبان tgLeadSet_.
   ============================================================================ */
var V168_H_STATE = 'حالت معارفه', V168_H_WHY = 'دلیل', V168_H_FROM = 'از معارفهٔ', V168_H_ASK = 'مرحلهٔ پرسش', V168_H_BY = 'لغو توسط', V168_H_WHY2 = 'دلیل ادامه ندادن';
var V168_MS = { BOOK: 'رزرو شد', HELD: 'برگزار شد', NOC: 'مراجع نیامد', NOT: 'درمانگر نیامد', CXL: 'لغو شد', MOVE: 'جابه‌جا شد' };
var V168_ASK_AFTER = 30;            /* دقیقه بعد از پایان اسلات */
var V168_ASK_DESK_H = 4;            /* ساعت تا رفتن به پذیرش */
var V168_DAY_END_H = 19;            /* پایان روز کاری پذیرش، تهران */
V168_VOCAB['دلیل عدم حضور مراجع'] = ['فراموش کرد', 'پشیمان شد', 'مشکل فنی', 'مشکل پیش آمد', 'بی‌پاسخ'];
V168_VOCAB['دلیل لغو یا جابه‌جایی'] = ['تداخل زمانی مراجع', 'تداخل زمانی درمانگر', 'مرخصی درمانگر', 'درخواست تغییر درمانگر', 'مشکل فنی'];
V168_VOCAB['دلیل ادامه ندادن'] = ['قیمت', 'زمان مناسب نبود', 'با درمانگر جور نشد', 'رویکرد مناسب نبود', 'جای دیگر رفت', 'بی‌پاسخ', 'دلیل دیگر'];
var V168_CXL_BY = { m: 'مراجع', t: 'درمانگر', p: 'پذیرش' };

function v168SlotKey_(r) { return (r.ther || r.therapist || '') + ' · ' + (r.iso || r.dateIso || '') + ' ' + (r.hhmm || ''); }

/* برنامهٔ پرسش برای یک اسلات رزروشدهٔ گذشته. r از tgMtRead_، زمان‌ها میلی‌ثانیه. */
function v168MeetPlan_(r, endMs, nowMs, connected) {
  if (!r || r.state !== 'رزرو شده' || r.held) return null;
  if (nowMs < endMs + V168_ASK_AFTER * 60000) return null;
  var nx = r.next ? new Date(String(r.next).replace(' ', 'T') + ':00+03:30').getTime() : 0;
  if (nx && nowMs < nx) return null;
  var ask = r.ask || '';
  if (!ask) return connected ? { to: 'ther', ask: 'درمانگر', next: nowMs + V168_ASK_DESK_H * 3600000 }
                             : { to: 'desk', ask: 'پذیرش', next: v168DayEnd_(nowMs) };
  if (ask === 'درمانگر') return { to: 'desk', ask: 'پذیرش', next: v168DayEnd_(nowMs) };
  return { to: 'boss', ask: 'مسئول پذیرش', next: nowMs + 24 * 3600000, lead: ask === 'پذیرش' };
}
function v168DayEnd_(nowMs) {
  var h = Number(Utilities.formatDate(new Date(nowMs), TG_TZ, 'H'));
  if (h >= V168_DAY_END_H - 1) return nowMs + 3 * 3600000;
  var d = Utilities.formatDate(new Date(nowMs), TG_TZ, 'yyyy-MM-dd');
  return new Date(d + 'T' + (V168_DAY_END_H < 10 ? '0' : '') + V168_DAY_END_H + ':00:00+03:30').getTime();
}
function v168MeetKb_(row, desk) {
  var kb = [[{ text: '✅ بله، برگزار شد', callback_data: 'mt:y:' + row }], [{ text: '🙋 مراجع نیامد', callback_data: 'mt:n:' + row }]];
  if (desk) kb.push([{ text: '🧑‍⚕️ درمانگر نیامد', callback_data: 'mt:t:' + row }]);
  kb.push([{ text: '↩️ لغو شده بود', callback_data: 'mt:c:' + row }]);
  return { inline_keyboard: kb };
}
function v168MeetAskText_(r, who) {
  var nm = String(r.lead).split('·')[0].trim() || 'مراجع';
  return '🗓 <b>جلسهٔ معارفه</b>' + (who ? ' · ' + who : '') + '\n\n' + tgEsc_(nm) + ' با ' + tgEsc_(r.ther) +
         '\nروز ' + tgEsc_(tgLeadJ_(r.iso)) + ' ساعت ' + tgFa_(r.hhmm) + '\n\nبرگزار شد؟';
}
/* از tgMeetTick: یک قدم پیگیری برای یک اسلات. true یعنی پیامی رفت */
function v168MeetStep_(r, row, end, now) {
  var th = tgTherChatByName_(r.ther);
  var plan = v168MeetPlan_(r, end.getTime(), now.getTime(), !!th);
  if (!plan) return false;
  if (plan.to === 'ther') tgSend_(th, v168MeetAskText_(r, ''), v168MeetKb_(row, false));
  else if (plan.to === 'desk') {
    var t1 = v168MeetAskText_(r, th ? 'درمانگر جواب نداد' : 'درمانگر به بات وصل نیست'), sent = false;
    try { (TG_DRY ? (TG_MEM['desk'] || []) : tgDeskRows_()).forEach(function (p) { if (!sent && p.chat) { tgSend_(String(p.chat).split(/[,،;\s]+/)[0], t1, v168MeetKb_(row, true)); sent = true; } }); } catch (e) {}
    if (!sent) v168DeskLead_().forEach(function (c) { tgSend_(c, t1, v168MeetKb_(row, true)); });
  }
  else v168DeskLead_().forEach(function (c) { tgSend_(c, v168MeetAskText_(r, 'بی‌نتیجه مانده'), v168MeetKb_(row, true)); });
  tgSlotSet_(row, V168_H_ASK, plan.ask);
  tgSlotSet_(row, TG_H_NEXT, Utilities.formatDate(new Date(plan.next), TG_TZ, 'yyyy-MM-dd HH:mm'));
  if (plan.lead) {
    var lrow = tgMtLeadOf_(r.lead);
    if (lrow >= 2) tgLeadSet_(lrow, { 'اقدام بعدی': 'پیگیری بعد از معارفه', 'تاریخ اقدام بعدی': tgLeadDayAdd_(1) }, 'بات', 'بات', 'معارفه بی‌نتیجه ماند');
  }
  return true;
}

/* کسی که دکمهٔ معارفه را زد: درمانگر، پذیرش، یا همان درمانگر اسلات */
function v168MeetActor_(chat, cq, r) {
  try { if (typeof tgTherByChat_ === 'function' && tgTherByChat_(chat)) return { name: tgTherByChat_(chat).name, role: 'ther' }; } catch (e) {}
  try { var d = TG_DRY ? (TG_MEM['desk'] || []).filter(function (x) { return String(x.chat) === String(chat); })[0] : tgWhoDesk_(chat, cq.from && cq.from.username); if (d) return { name: d.name || 'پذیرش', role: 'desk' }; } catch (e2) {}
  return { name: r.ther, role: 'ther' };
}
function v168ReasonKb_(prefix, list) {
  var kb = [];
  for (var i = 0; i < list.length; i += 2) kb.push(list.slice(i, i + 2).map(function (t, j) { return { text: t, callback_data: prefix + ':' + (i + j) }; }));
  return { inline_keyboard: kb };
}
/* کارت سه‌دکمه‌ای «مراجع نیامد» برای پذیرش */
function v168NoShowCard_(r, code) {
  var nm = String(r.lead).split('·')[0].trim() || 'مراجع';
  var t = '🙋 <b>مراجع در معارفه حاضر نشد</b>\n' + tgEsc_(nm) + (code ? ' · <code>' + tgEsc_(code) + '</code>' : '') + '\n' + tgEsc_(r.ther) + ' · ' + tgEsc_(tgLeadJ_(r.iso)) + ' ' + tgFa_(r.hhmm) + '\n\nقدم بعد؟';
  if (!code) return tgDeskSay_(t);
  var kb = { inline_keyboard: [[{ text: '🔁 زمان تازه با همین درمانگر', callback_data: 'ld:rs:' + code }], [{ text: '👥 درمانگر دیگر', callback_data: 'ld:sw:' + code }], [{ text: '✅ بستن با دلیل', callback_data: 'ld:close:' + code }]] };
  var sent = false;
  (TG_DRY ? (TG_MEM['desk'] || []) : tgDeskRows_()).forEach(function (p) { if (!sent && p.chat) { tgSend_(p.chat, t, kb); sent = true; } });
  return sent;
}

/* پیش از کد قدیمی tgOnMeet_: کارهای تازهٔ v168. برمی‌گرداند true اگر رسیدگی کرد. */
function v168OnMeet_(cq, chat, act, row, a, r, lrow, code) {
  var who = v168MeetActor_(chat, cq, r), today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  function ev(what, to, note) { try { tgLeadEv_({ code: code, row: lrow, actor: who.name, channel: 'تلگرام', what: what, to: to, note: (note ? note + ' · ' : '') + v168SlotKey_(r) }); } catch (e) {} }
  if (act === 'nr' || act === 'tr' || act === 'sr') {
    var list = v168Vocab_(act === 'nr' ? 'دلیل عدم حضور مراجع' : (act === 'tr' ? 'دلیل لغو یا جابه‌جایی' : 'دلیل ادامه ندادن'));
    var why = list[Number(a[0])] || 'دلیل دیگر';
    tgSlotSet_(row, act === 'sr' ? V168_H_WHY2 : V168_H_WHY, why);
    ev(act === 'sr' ? 'دلیل ادامه ندادن' : 'دلیل معارفه', why);
    tgSend_(chat, 'ممنون. دلیل ثبت شد.');
    return true;
  }
  if (act === 'cb') {
    var by = V168_CXL_BY[a[0]] || 'نامعلوم';
    tgSlotSet_(row, V168_H_BY, by);
    return tgSend_(chat, 'دلیل لغو؟', v168ReasonKb_('mt:cr:' + row + ':' + a[0], v168Vocab_('دلیل لغو یا جابه‌جایی'))), true;
  }
  if (act === 'cr') {
    var why2 = v168Vocab_('دلیل لغو یا جابه‌جایی')[Number(a[1])] || 'دلیل دیگر';
    tgSlotSet_(row, V168_H_WHY, why2);
    ev('دلیل معارفه', why2, 'لغو توسط ' + (V168_CXL_BY[a[0]] || 'نامعلوم'));
    tgSend_(chat, 'ممنون. ثبت شد.');
    return true;
  }
  if (act === 't') {
    tgSlotSet_(row, TG_H_HELD, V168_MS.NOT); tgSlotSet_(row, TG_H_HANS, today); tgSlotSet_(row, TG_H_HWHO, who.name);
    tgSlotSet_(row, TG_H_NEXT, ''); tgSlotSet_(row, V168_H_STATE, V168_MS.NOT);
    ev('برگزاری معارفه', V168_MS.NOT);
    if (lrow >= 2) tgLeadSet_(lrow, { 'نتیجه': 'درمانگر در معارفه حاضر نشد', 'اقدام بعدی': 'هماهنگی وقت معارفه', 'تاریخ اقدام بعدی': today }, who.name, 'تلگرام', 'درمانگر نیامد');
    tgSend_(chat, 'ثبت شد. دلیل؟', v168ReasonKb_('mt:tr:' + row, v168Vocab_('دلیل لغو یا جابه‌جایی')));
    return true;
  }
  return false;
}
/* بعد از جواب قدیمی y/n/c/s0: حالت، دلیل و کارت */
function v168AfterMeet_(chat, act, row, r, lrow, code) {
  if (act === 'y') tgSlotSet_(row, V168_H_STATE, V168_MS.HELD);
  if (act === 'n') {
    tgSlotSet_(row, V168_H_STATE, V168_MS.NOC);
    tgSend_(chat, 'دلیل نیامدن مراجع را می‌دانید؟', v168ReasonKb_('mt:nr:' + row, v168Vocab_('دلیل عدم حضور مراجع')));
    v168NoShowCard_(r, code);
  }
  if (act === 'c') {
    tgSlotSet_(row, V168_H_STATE, V168_MS.CXL);
    tgSend_(chat, 'لغو از طرف چه کسی بود؟', { inline_keyboard: [[{ text: 'مراجع', callback_data: 'mt:cb:' + row + ':m' }, { text: 'درمانگر', callback_data: 'mt:cb:' + row + ':t' }, { text: 'پذیرش', callback_data: 'mt:cb:' + row + ':p' }]] });
  }
  if (act === 's0') tgSend_(chat, 'چرا ادامه نداد؟', v168ReasonKb_('mt:sr:' + row, v168Vocab_('دلیل ادامه ندادن')));
}
/* هر رزرو تازه (از هر مسیری): ستون‌های حالت سطر اسلات از نو */
function v168SlotFresh_(slotRow) {
  if (!slotRow) return;
  var o = {};
  [[V168_H_STATE, V168_MS.BOOK], [V168_H_WHY, ''], [V168_H_FROM, ''], [V168_H_ASK, ''], [V168_H_BY, ''], [V168_H_WHY2, ''],
   [TG_H_HELD, ''], [TG_H_START, ''], [TG_H_NEXT, '']].forEach(function (x) { o[x[0]] = x[1]; });
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'slotfresh', row: slotRow, o: o }); return; }
  /* یک خواندن سرستون، یک خواندن و یک نوشتن روی بازهٔ پیوسته (رزرو کند نشود) */
  try {
    var sh = tgSS_().getSheetByName(TG_SLOTS), lc = sh.getLastColumn();
    var hd = sh.getRange(3, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
    var miss = Object.keys(o).filter(function (k) { return hd.indexOf(k) < 0; });
    if (miss.length) { sh.getRange(3, lc + 1, 1, miss.length).setValues([miss]).setFontWeight('bold'); hd = hd.concat(miss); }
    var cols = Object.keys(o).map(function (k) { return hd.indexOf(k) + 1; });
    var lo = Math.min.apply(null, cols), hi = Math.max.apply(null, cols);
    var rg = sh.getRange(slotRow, lo, 1, hi - lo + 1), cur = rg.getValues()[0];
    Object.keys(o).forEach(function (k) { cur[hd.indexOf(k) + 1 - lo] = o[k]; });
    rg.setValues([cur]);
  } catch (e) { tgErr_('v168SlotFresh_', e); }
}

/* ---------- جابه‌جایی و تغییر درمانگر ---------- */
function v168Move_(cq, chat, me, row, code, act, arg, l0) {
  if (act === 'rs' || act === 'sw') {
    var bk = tgLeadSlots_(code).slice().sort(function (a, b) { return (a.dateIso + a.hhmm) < (b.dateIso + b.hhmm) ? 1 : -1; });
    var prev = bk[0];
    if (!prev) return tgSend_(chat, 'این لید معارفهٔ رزروشده‌ای ندارد که جابه‌جا شود. از «📅 رزرو وقت معارفه» استفاده کنید.');
    tgSetVal_('ldfrom', chat, JSON.stringify({ code: code, prev: prev.row, ther: prev.therapist, d: prev.dateIso, h: prev.hhmm, k: act }));
    if (act === 'rs') return tgLeadBookSlots_(chat, code, prev.therapist, l0);
    return tgOnLead_(cq, 'bk:' + code);
  }
  if (act === 'mr') {
    var why = v168Vocab_('دلیل لغو یا جابه‌جایی')[Number(arg)] || 'دلیل دیگر';
    tgLeadEv_({ code: code, row: row, actor: me, channel: 'تلگرام', what: 'دلیل جابه‌جایی', to: why });
    var mv = tgGetVal_('ldmv', chat);
    if (mv) { try { var o = JSON.parse(mv); if (o.code === code && o.prevMoved) tgSlotSet_(o.prev, V168_H_WHY, why); } catch (e) {} tgDel_('ldmv', chat); }
    return tgSend_(chat, 'ممنون. دلیل جابه‌جایی ثبت شد.');
  }
  return null;
}
/* از tgLeadBook_ بعد از رزرو موفق: اگر این رزرو جابه‌جایی بود، پیوند و شمار و دلیل */
function v168AfterBook_(chat, me, row, code, slotRow, s) {
  var raw = tgGetVal_('ldfrom', chat);
  if (!raw) return false;
  var o; try { o = JSON.parse(raw); } catch (e) { tgDel_('ldfrom', chat); return false; }
  tgDel_('ldfrom', chat);
  if (o.code !== code || !o.prev) return false;
  var prev = tgMtRead_(o.prev) || { row: o.prev, ther: o.ther, iso: o.d, hhmm: o.h, state: '' };
  var pkey = v168SlotKey_({ ther: o.ther, iso: o.d, hhmm: o.h });
  var prevMoved = false;
  var endPrev = tgMtEnd_({ ther: o.ther, iso: o.d, hhmm: o.h });
  if (!prev.held && endPrev && endPrev.getTime() > Date.now()) {
    /* معارفهٔ قبلی هنوز نیامده: آزاد و «جابه‌جا شد» */
    if (!TG_DRY) {
      try {
        var sh = tgSS_().getSheetByName(TG_SLOTS);
        sh.getRange(o.prev, 6).setValue('آزاد'); tgSlotsBust_();
        var cur = String(sh.getRange(o.prev, 10).getValue() || '');
        sh.getRange(o.prev, 10).setValue(cur + ' · جابه‌جا شد توسط ' + me + ' ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm'));
        tgNotifyTherapistCancel_({ t: o.ther, d: o.d, h: o.h });
      } catch (e2) { tgErr_('v168AfterBook_', e2); }
    } else TG_OUTBOX.push({ kind: 'slotfree', row: o.prev });
    tgSlotSet_(o.prev, V168_H_STATE, V168_MS.MOVE);
    prevMoved = true;
  }
  tgSlotSet_(slotRow, V168_H_FROM, pkey);
  var n = v168LeadNum_(row, 'شمار جابه‌جایی') + 1;
  tgLeadSet_(row, { 'شمار جابه‌جایی': n }, me, 'تلگرام', (o.k === 'sw' ? 'تغییر درمانگر' : 'جابه‌جایی زمان') + ' · از ' + pkey);
  tgLeadEv_({ code: code, row: row, actor: me, channel: 'تلگرام', what: o.k === 'sw' ? 'تغییر درمانگر معارفه' : 'جابه‌جایی معارفه', from: pkey, to: v168SlotKey_(s) });
  tgSetVal_('ldmv', chat, JSON.stringify({ code: code, prev: o.prev, prevMoved: prevMoved }));
  tgSend_(chat, 'دلیل جابه‌جایی؟', v168ReasonKb_('ld:mr:' + code, v168Vocab_('دلیل لغو یا جابه‌جایی')));
  return true;
}
function v168LeadNum_(row, head) {
  if (TG_DRY) return Number((TG_DRY_LEAD && TG_DRY_LEAD.moves) || 0);
  try { var c = tgLeadCol_(head); return Number(tgLatinDigits_(String(tgSS_().getSheetByName(TG_LEADS).getRange(row, c).getValue() || '0'))) || 0; } catch (e) { return 0; }
}

/* ---------- T و V با هم ---------- */
/* cur.t: مقدار فعلی «معارفه هماهنگ شد؟»، cur.v: «درمانگر معارفه». خروجی: تغییرهای لازم یا {drop: نام ستون} */
function v168TvPlan_(cur, changes) {
  var has = function (k) { return Object.prototype.hasOwnProperty.call(changes, k); };
  var T = has('معارفه هماهنگ شد؟') ? String(changes['معارفه هماهنگ شد؟'] || '').trim() : String(cur.t || '').trim();
  var V = has('درمانگر معارفه') ? String(changes['درمانگر معارفه'] || '').trim() : String(cur.v || '').trim();
  if (!has('معارفه هماهنگ شد؟') && !has('درمانگر معارفه')) return {};
  if (V && T !== 'بله') return has('درمانگر معارفه') ? { 'معارفه هماهنگ شد؟': 'بله' } : { 'درمانگر معارفه': '' };
  if (!V && T === 'بله') return has('معارفه هماهنگ شد؟') && !has('درمانگر معارفه') ? { drop: 'معارفه هماهنگ شد؟' } : { 'معارفه هماهنگ شد؟': 'خیر' };
  return {};
}

/* ============================================================================
   فاز ۵ (تنها منتشر می‌شود): پیشنهاد خودکار درمانگر و بازنگری مبنای ارجاع
   - وقتی لید چهار چیز را دارد (نوع درخواست، موضوع اصلی، داخل/خارج، حالت جلسه) و هنوز پیشنهادی ندارد،
     بات سه درمانگر در P/Q/R می‌نویسد: فیلتر استخر + وقت آزاد هفتهٔ پیش رو + ظرفیت، بعد رده (۱ و ۲ اول)،
     و سهمیهٔ اکتشاف: از هر سه، explore_slot تا به درمانگران «داده کم» می‌رسد (چرخشی، کم‌پیشنهادترها اول).
   - «✏️ تغییر پیشنهاد» روی کارت با دلیل از فهرست بسته.
   - بستن لیدی که هیچ‌وقت پیشنهاد نگرفته دلیل جدا می‌خواهد؛ «خدمتی که نداریم» می‌پرسد کدام خدمت.
   - ستون‌های I و J «درمانگران» ماهانه از «رویدادهای لید» بازساخته می‌شوند (tgTherStatsRebuild).
   - دو سنجهٔ تازه: زمان پاسخ به کارت ارجاع و نرخ نیامدن درمانگر. ستون «ردهٔ دستی» با تاریخ و دلیل برای مسئول پذیرش.
   ============================================================================ */
var V168_T_CFG = 'تنظیمات لید';
var V168_CFG_HEAD = ['کلید', 'مقدار', 'توضیح'];
var V168_CFG_SEED = [
  ['explore_slot', 1, 'از هر سه پیشنهاد خودکار، چند تا به درمانگران «داده کم» برسد (TG_EXPLORE_SLOT)'],
  ['low_data_threshold', 3, 'کمتر از این تعداد پیشنهاد (ستون I) یعنی «داده کم»'],
  ['suggest_days', 7, 'وقت آزاد درمانگر در چند روز آینده'],
  ['referral_slow_hours', 48, 'پاسخ کندتر از این به کارت ارجاع در گزارش ماهانه می‌آید'],
  ['city_prompt', '', 'متن پرسیدن نام شهر از مراجع در «شهر دیگر» (تیم می‌نویسد؛ خالی یعنی مسیر قبلی)']
];
var V168_THER_NEW = ['زمان پاسخ ارجاع (ساعت)', 'نرخ نیامدن درمانگر', 'ردهٔ دستی', 'تاریخ ردهٔ دستی', 'دلیل ردهٔ دستی'];
V168_VOCAB['دلیل تغییر پیشنهاد'] = ['مراجع درمانگر خاصی خواست', 'وقت‌ها جور نبود', 'تخصص مناسب‌تر', 'جنسیت درمانگر', 'قیمت', 'دلیل دیگر'];
V168_VOCAB['دلیل بستن بی پیشنهاد'] = ['فقط سؤال داشت', 'قیمت', 'خدمتی که نداریم', 'خارج از حوزهٔ ما', 'مراجع نبود (همکار یا دانشجو)', 'بی‌پاسخ از ابتدا', 'تکراری'];

function v168CfgMap_() {
  return pbCache_('v168cfg', function () {
    var o = {};
    V168_CFG_SEED.forEach(function (r) { o[r[0]] = r[1]; });
    try { pbRows_('e', V168_T_CFG, V168_CFG_HEAD, V168_CFG_SEED).forEach(function (r) { var key = String(r['کلید'] || '').trim(); if (key && String(r['مقدار']).trim() !== '') o[key] = r['مقدار']; }); } catch (e) {}
    return o;
  });
}
function v168CfgText_(k) { var m = v168CfgMap_(); return String(m[k] == null ? '' : m[k]).trim(); }
function v168Cfg_(k, d) {
  var m = v168CfgMap_();
  var n = Number(tgLatinDigits_(String(m[k] == null ? '' : m[k])));
  return isFinite(n) && String(m[k] == null ? '' : m[k]).trim() !== '' ? n : d;
}
function v168PoolKey_(kind, topic) {
  var k = String(kind || ''), t = String(topic || '');
  if (/زوج/.test(k) || /رابطه|زوج/.test(t)) return 'rel';
  if (/کودک|نوجوان/.test(k + t)) return 'kid';
  if (/روان‌?پزشک/.test(k + t)) return 'psy';
  if (/خانواده|والد/.test(k + t)) return 'fam';
  return 'ind';
}
function v168Ready_(l) {
  return !!(String(l.kind || '').trim() && String(l.topic || '').trim() && String(l.region || '').trim() && String(l.mode || '').trim());
}
/* ctx.ther: [{name, active, tier (۱..۴ یا ۰ برای داده کم), sug}]، ctx.pool: tgPoolMap_، ctx.free: {نام: true} */
function v168Candidates_(l, ctx, skip) {
  var key = v168PoolKey_(l.kind, l.topic), abroad = /خارج/.test(String(l.region || '')), inp = /حضوری/.test(String(l.mode || ''));
  var sk = {};
  (skip || []).forEach(function (n) { if (n) sk[tgNorm_(n)] = 1; });
  return ctx.ther.filter(function (t) {
    if (!t.active || sk[tgNorm_(t.name)]) return false;
    var rec = ctx.pool[tgNorm_(t.name)];
    if (!rec || !rec[key]) return false;
    if (abroad && !rec.abroad) return false;
    if (inp && !rec.inperson) return false;
    return !!ctx.free[tgNorm_(t.name)];
  });
}
function v168Pick_(cands, n, explore) {
  var byS = function (a, b) { return (a.sug - b.sug) || (a.name < b.name ? -1 : 1); };
  var known = cands.filter(function (c) { return c.tier > 0; }).sort(function (a, b) { return (a.tier - b.tier) || byS(a, b); });
  var low = cands.filter(function (c) { return !(c.tier > 0); }).sort(byS);
  var out = [], ex = Math.min(explore, low.length);
  known.slice(0, n - ex).forEach(function (c) { out.push(c); });
  low.slice(0, n - out.length).forEach(function (c) { out.push(c); });
  known.forEach(function (c) { if (out.length < n && out.indexOf(c) < 0) out.push(c); });
  return out.slice(0, n);
}
function v168TierOf_(mCell, iCount, override, lowTh) {
  var o = tgLatinDigits_(String(override || '')).match(/[1-4]/);
  if (o) return Number(o[0]);
  if (Number(iCount || 0) < lowTh) return 0;
  var t = tgLatinDigits_(String(mCell || '')).match(/[1-4]/);
  return t ? Number(t[0]) : 0;
}
function v168SuggestCtx_() {
  if (TG_DRY) return TG_MEM['v168ctx'] || { ther: [], pool: {}, free: {} };
  var sh = tgSS_().getSheetByName(TG_THER), n = sh.getLastRow() - 3, ther = [];
  var lowTh = v168Cfg_('low_data_threshold', 3);
  if (n > 0) {
    var lc = sh.getLastColumn(), hd = sh.getRange(3, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
    var cO = hd.indexOf('ردهٔ دستی'), v = sh.getRange(4, 1, n, lc).getValues();
    v.forEach(function (r) {
      var name = String(r[0] || '').trim();
      if (!name) return;
      ther.push({ name: name, active: String(r[TG_C_STATUS - 1] || '').trim() === 'فعال', sug: Number(r[8]) || 0,
                  tier: v168TierOf_(r[TG_C_TIER - 1], r[8], cO > -1 ? r[cO] : '', lowTh) });
    });
  }
  var free = {}, lim = Date.now() + v168Cfg_('suggest_days', 7) * 86400000;
  ['داخل ایران', 'خارج از ایران'].forEach(function (sc) {
    try { tgFreeSlots_(sc).forEach(function (s) { var t = tgSlotUtc_(s).getTime(); if (t > Date.now() && t < lim) free[tgNorm_(s.therapist)] = true; }); } catch (e) {}
  });
  return { ther: ther, pool: tgPoolMap_(), free: free };
}
/* v170.23.21: زمینهٔ ترتیب لید خارج، یک بار برای هر دور */
function v168AbCtx_(ctx) {
  if (ctx.ab) return ctx.ab;
  if (TG_DRY) return (ctx.ab = TG_MEM['v168abctx'] || { info: {}, stats: {}, slots: [] });
  var slots = []; try { slots = tgFreeSlots_('خارج از ایران'); } catch (e) {}
  return (ctx.ab = { info: tgTherapistInfo_(), stats: abStats_(abLeadRows_(), Date.now(), AB_DAYS), slots: slots });
}
/* یک لید: سه پیشنهاد و رویداد «پیشنهاد خودکار». برمی‌گرداند نام‌ها یا [] */
function v168SuggestLead_(row, l, ctx) {
  if (!v168Ready_(l) || l.ref1 || l.ref2 || l.ref3) return [];
  var cands = v168Candidates_(l, ctx);
  /* v170.23.21 (تصمیم یاسر): لید خارج: مقیم همان کشور، بعد وقت در «زمان مناسب» مراجع، بعد نرخ تبدیل خارج */
  var pick = /خارج/.test(String(l.region || '')) ? abRank_(cands, l, v168AbCtx_(ctx)).slice(0, 3) : v168Pick_(cands, 3, v168Cfg_('explore_slot', 1));
  if (!pick.length) return [];
  var ch = {};
  pick.forEach(function (c, j) { ch[V168_SUG[j]] = c.name; c.sug++; });
  var code = tgLeadSet_(row, ch, 'بات', 'بات', 'پیشنهاد خودکار');
  var ex = pick.filter(function (c) { return !(c.tier > 0); }).map(function (c) { return c.name; });
  tgLeadEv_({ code: code, row: row, actor: 'بات', channel: 'بات', what: 'پیشنهاد خودکار', to: pick.map(function (c) { return c.name; }).join('، '),
              note: ex.length ? 'اکتشاف: ' + ex.join('، ') : '' });
  return pick.map(function (c) { return c.name; });
}
function v168SuggestSweep_(max) {
  if (TG_DRY) return 0;
  var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow();
  if (last < 2) return 0;
  var hm = tgLeadHeadMap_(sh), v = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues(), ctx = null, n = 0;
  var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : String(r[i] || '').trim(); };
  for (var i = 0; i < v.length && n < (max || 15); i++) {
    var r = v[i], st = g(r, 'وضعیت');
    if (!String(r[3] || r[5] || '').trim() || tgStClosed_(st) || st === TG_ST.BOOKED || st === TG_ST.HELD) continue;
    var l = { kind: g(r, 'نوع درخواست'), topic: g(r, 'موضوع اصلی'), region: g(r, 'داخل یا خارج'), mode: g(r, 'حالت') || g(r, 'حالت جلسه'),
              ref1: g(r, V168_SUG[0]), ref2: g(r, V168_SUG[1]), ref3: g(r, V168_SUG[2]),
              country: g(r, 'کشور محل زندگی'), tz: g(r, 'منطقهٔ زمانی') || abTzFromNote_(g(r, 'یادداشت')), best: g(r, 'زمان مناسب') || abBestFromNote_(g(r, 'یادداشت')) };
    if (!v168Ready_(l) || l.ref1 || l.ref2 || l.ref3) continue;
    if (!ctx) ctx = v168SuggestCtx_();
    if (v168SuggestLead_(i + 2, l, ctx).length) n++;
  }
  return n;
}

/* ---------- ✏️ تغییر پیشنهاد و بستن بی پیشنهاد ---------- */
function v168LeadFull_(row, l0) {
  if (TG_DRY) return TG_DRY_LEAD;
  try {
    var sh = tgSS_().getSheetByName(TG_LEADS), hm = tgLeadHeadMap_(sh), r = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    var g = function (h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : String(r[i] || '').trim(); };
    return { kind: g('نوع درخواست'), topic: g('موضوع اصلی'), region: g('داخل یا خارج'), mode: g('حالت') || g('حالت جلسه'),
             ref1: g(V168_SUG[0]), ref2: g(V168_SUG[1]), ref3: g(V168_SUG[2]),
             country: g('کشور محل زندگی'), tz: g('منطقهٔ زمانی') || abTzFromNote_(g('یادداشت')), best: g('زمان مناسب') || abBestFromNote_(g('یادداشت')) };
  } catch (e) { return l0 || {}; }
}
function v168Suggest_(cq, chat, me, row, code, act, arg, l0) {
  var a = String(arg || '').split(':');
  var rs = v168Vocab_('دلیل تغییر پیشنهاد');
  if (act === 'sg') return tgSend_(chat, '✏️ چرا پیشنهاد عوض می‌شود؟', v168ReasonKb_('ld:sg2:' + code, rs));
  var lf = v168LeadFull_(row, l0);
  if (act === 'sg2') {
    var cur = [lf.ref1, lf.ref2, lf.ref3];
    var list = v168Candidates_(lf, v168SuggestCtx_(), cur);
    if (!list.length) list = (v168SuggestCtx_().ther || []).filter(function (t) { return t.active && cur.indexOf(t.name) < 0; });
    list = list.slice(0, 8);
    tgSetVal_('ldsgc', chat, JSON.stringify(list.map(function (t) { return t.name; })));
    if (!list.length) return tgSend_(chat, 'درمانگر دیگری با وقت آزاد پیدا نشد. اسم را از «🤝 ارجاع به درمانگر» بنویسید.');
    return tgSend_(chat, 'به جای کدام؟ اول درمانگر تازه را انتخاب کنید:', { inline_keyboard: list.map(function (t, j) { return [{ text: t.name, callback_data: 'ld:sg3:' + code + ':' + a[0] + ':' + j }]; }) });
  }
  if (act === 'sg3') {
    var cur3 = [lf.ref1, lf.ref2, lf.ref3];
    return tgSend_(chat, 'جای کدام پیشنهاد بنشیند؟', { inline_keyboard: [cur3.map(function (n, j) { return { text: tgFa_(String(j + 1)) + '. ' + (n || 'خالی'), callback_data: 'ld:sg4:' + code + ':' + a[0] + ':' + a[1] + ':' + j }; })] });
  }
  if (act === 'sg4') {
    var names = []; try { names = JSON.parse(tgGetVal_('ldsgc', chat) || '[]'); } catch (e) {}
    var nm = names[Number(a[1])], pos = Number(a[2]) || 0, why = rs[Number(a[0])] || 'دلیل دیگر';
    if (!nm) return tgSend_(chat, 'این فهرست کهنه شده. دوباره «✏️ تغییر پیشنهاد» را بزنید.');
    var ch = {}; ch[V168_SUG[pos]] = nm;
    tgLeadSet_(row, ch, me, 'تلگرام', 'تغییر پیشنهاد: ' + why);
    tgLeadEv_({ code: code, row: row, actor: me, channel: 'تلگرام', what: 'تغییر پیشنهاد', from: [lf.ref1, lf.ref2, lf.ref3][pos] || '', to: nm, note: why });
    tgDel_('ldsgc', chat);
    return tgLeadCardEdit_(cq, tgLeadRead_(row));
  }
  return null;
}
/* بستن: اگر هیچ‌وقت پیشنهادی نداشت، زیرفهرست جدا */
function v168CloseMenu_(chat, code, l0) {
  if (l0 && (l0.ref1 || l0.ref2 || l0.ref3 || l0.meetTher)) return false;
  var list = v168Vocab_('دلیل بستن بی پیشنهاد');
  var kb = list.map(function (t, j) { return [{ text: t, callback_data: 'ld:cn:' + code + ':' + j }]; });
  kb.push([{ text: '↩️ بی‌خیال', callback_data: 'ld:back:' + code }]);
  tgSend_(chat, 'این لید هیچ‌وقت درمانگر پیشنهادی نداشته. دلیل بستن؟', { inline_keyboard: kb });
  return true;
}
function v168CloseNoSug_(cq, chat, me, row, code, arg) {
  var label = v168Vocab_('دلیل بستن بی پیشنهاد')[Number(arg)];
  if (!label) return tgSend_(chat, 'این دلیل پیدا نشد.');
  if (label === 'خدمتی که نداریم') { tgSetVal_('ldsv', chat, code); return tgSend_(chat, 'کدام خدمت را می‌خواست؟ در چند کلمه بنویسید.'); }
  var today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  tgLeadSet_(row, { 'وضعیت': TG_ST.CLOSED, 'دلیل بستن': label, 'آخرین تماس': today }, me, 'تلگرام', 'بستن بی پیشنهاد');
  tgLeadCardEdit_(cq, tgLeadRead_(row));
  return tgSend_(chat, '✅ لید ' + tgEsc_(code) + ' بسته شد: ' + tgEsc_(label));
}
function v168ServiceText_(chat, code, text, me) {
  var row = tgLeadByCode_(code);
  if (row < 2) { tgSend_(chat, 'این لید پیدا نشد.'); return true; }
  var svc = String(text || '').trim().slice(0, 80);
  tgLeadSet_(row, { 'وضعیت': TG_ST.CLOSED, 'دلیل بستن': 'خدمتی که نداریم: ' + svc, 'آخرین تماس': Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd') }, me, 'تلگرام', 'بستن بی پیشنهاد');
  tgLeadEv_({ code: code, row: row, actor: me, channel: 'تلگرام', what: 'خدمتی که نداریم', to: svc });
  tgSend_(chat, '✅ بسته شد. «' + tgEsc_(svc) + '» در گزارش ماهانهٔ خدمات لازم می‌آید.');
  return true;
}

/* ---------- بازسازی ماهانهٔ I و J و دو سنجهٔ تازه ---------- */
/* ev: سطرهای «رویدادهای لید» [زمان، کد، سطر، کی، کانال، چه شد، از، به، یادداشت]؛ slots: [{ther, mstate}] */
function v168TherStats_(ev, slots) {
  var st = {}, refAt = {};
  var S = function (n) { var k = tgNorm_(n); return st[k] = st[k] || { sug: 0, intro: 0, resp: [], noshow: 0, done: 0 }; };
  ev.forEach(function (e) {
    var what = String(e[5] || '').trim(), to = String(e[7] || '').trim(), who = String(e[3] || '').trim(), code = String(e[1] || '').trim();
    var t = e[0] instanceof Date ? e[0].getTime() : Date.parse(e[0]);
    if (V168_SUG.indexOf(what) > -1 && to) S(to).sug++;
    if (what === 'درمانگر معارفه' && to) S(to).intro++;
    if (what === 'تاریخ ارجاع') { var m = String(e[8] || '').match(/ارجاع به (.+)$/); if (m) refAt[code + '|' + tgNorm_(m[1].trim())] = t; }
    if (what === 'پاسخ ارجاع' && who) { var k = code + '|' + tgNorm_(who); if (refAt[k] && t >= refAt[k]) { S(who).resp.push((t - refAt[k]) / 3600000); delete refAt[k]; } }
  });
  (slots || []).forEach(function (s) {
    if (!s.ther || !s.mstate || s.mstate === V168_MS.BOOK) return;
    var x = S(s.ther); x.done++; if (s.mstate === V168_MS.NOT) x.noshow++;
  });
  Object.keys(st).forEach(function (k) {
    var r = st[k].resp.slice().sort(function (a, b) { return a - b; });
    st[k].respMed = r.length ? Math.round(r[Math.floor((r.length - 1) / 2)] * 10) / 10 : '';
    st[k].noshowRate = st[k].done ? Math.round(st[k].noshow / st[k].done * 100) / 100 : '';
  });
  return st;
}
function tgTherStatsRebuild() {
  var ss = tgSS_(), sh = ss.getSheetByName(TG_THER), es = tgLeadEvSheet_();
  var ev = es && es.getLastRow() > 1 ? es.getRange(2, 1, es.getLastRow() - 1, 9).getValues() : [];
  var slots = [];
  try {
    var ssl = ss.getSheetByName(TG_SLOTS), map = tgMtHeadMap_();
    if (ssl && ssl.getLastRow() >= 4 && map[V168_H_STATE] !== undefined) {
      ssl.getRange(4, 1, ssl.getLastRow() - 3, ssl.getLastColumn()).getValues().forEach(function (r) { slots.push({ ther: String(r[0] || '').trim(), mstate: String(r[map[V168_H_STATE]] || '').trim() }); });
    }
  } catch (e) {}
  var st = v168TherStats_(ev, slots), n = sh.getLastRow() - 3;
  if (n < 1) return 'درمانگری نیست';
  var lc = sh.getLastColumn(), hd = sh.getRange(3, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  var miss = V168_THER_NEW.filter(function (h) { return hd.indexOf(h) < 0; });
  if (miss.length) { sh.getRange(3, lc + 1, 1, miss.length).setValues([miss]).setFontWeight('bold'); hd = hd.concat(miss); }
  var names = sh.getRange(4, 1, n, 1).getValues();
  var IJ = names.map(function (x) { var s0 = st[tgNorm_(String(x[0] || '').trim())] || { sug: 0, intro: 0 }; return String(x[0] || '').trim() ? [s0.sug, s0.intro] : ['', '']; });
  sh.getRange(4, 9, n, 2).setValues(IJ);
  var cR = hd.indexOf(V168_THER_NEW[0]) + 1, cN = hd.indexOf(V168_THER_NEW[1]) + 1;
  sh.getRange(4, cR, n, 1).setValues(names.map(function (x) { var s1 = st[tgNorm_(String(x[0] || '').trim())]; return [s1 ? s1.respMed : '']; }));
  sh.getRange(4, cN, n, 1).setValues(names.map(function (x) { var s2 = st[tgNorm_(String(x[0] || '').trim())]; return [s2 ? s2.noshowRate : '']; }));
  try { CacheService.getScriptCache().remove('trows'); } catch (e2) {}
  return 'I و J بازسازی شد: ' + IJ.filter(function (r) { return r[0] !== ''; }).length + ' درمانگر';
}
/* اول هر ماه شمسی یک بار (از tgWatchdog) */
function v168MonthlyStats_() {
  var jj = tgJalali_(new Date(), TG_TZ), jm = jj.y + '/' + jj.m, P = PropertiesService.getScriptProperties();
  if (P.getProperty('V168_STATS_M') === jm) return '';
  P.setProperty('V168_STATS_M', jm);
  return tgTherStatsRebuild();
}
/* یک‌باره: تب تنظیمات، ستون‌های تازه، آستانهٔ «داده کم» در فرمول M از ۶ به ۳، اولین بازسازی */
function tgV168RefSetup() {
  var res = [], ss0 = tgSS_(), day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  if (!ss0.getSheetByName('پشتیبان درمانگران ' + day)) { var bk = ss0.getSheetByName(TG_THER).copyTo(ss0).setName('پشتیبان درمانگران ' + day); try { bk.hideSheet(); } catch (e0) {} }
  pbRows_('e', V168_T_CFG, V168_CFG_HEAD, V168_CFG_SEED);
  var sh = tgSS_().getSheetByName(TG_THER), n = sh.getLastRow() - 3, th = v168Cfg_('low_data_threshold', 3), ch = 0;
  if (n > 0) {
    var rg = sh.getRange(4, TG_C_TIER, n, 1), f = rg.getFormulasR1C1();
    var out = f.map(function (r) {
      var x = r[0];
      if (!x) return [x];
      var y = x.replace(/(R(?:\[0\])?C\[-4\]\s*<\s*)6(?!\d)/g, '$1' + th).replace(/(R(?:\[0\])?C\[-4\]\s*>=\s*)6(?!\d)/g, '$1' + th);
      if (y !== x) ch++;
      return [y];
    });
    if (ch) out.forEach(function (r, i) { if (r[0]) sh.getRange(4 + i, TG_C_TIER).setFormulaR1C1(r[0]); });
  }
  res.push(ch ? 'آستانهٔ داده کم در ' + ch + ' فرمول به ' + th + ' رسید' : 'آستانهٔ ۶ در فرمول M پیدا نشد؛ دستی بررسی شود');
  res.push(tgTherStatsRebuild());
  return res.join(' · ');
}

/* ============================================================================
   فاز ۶: حضوری واقعاً در بات
   - «حالت جلسه» سه فیلد ساختاریافته می‌شود: «حالت» (آنلاین | حضوری | فرقی ندارد)، «شناسهٔ مکان»، «شهر درخواستی».
     مهاجرت یک‌باره با الگوی ثابت (tgV168ModeSplit). ستون قدیمی دست نمی‌خورد.
   - بات فقط عرضهٔ تأییدشده را نشان می‌دهد: مکان فعال × ساعتی که «بررسی»اش تأیید شده.
   - مکانی که ساعت تأییدشده ندارد (مثل کرج امروز) بن‌بست نیست: تقاضا ثبت می‌شود و پذیرش خبر می‌گیرد.
   - «شهر دیگر» نام شهر را می‌پرسد و تقاضای بی‌مکان با شهر ثبت می‌شود (برای گزارش ماهانه).
   - ساعت‌های در انتظار تأیید و درخواست‌های حضوری مسئول و مهلت می‌گیرند: ۲۴ ساعت یادآوری، ۴۸ ساعت ناظر.
   ============================================================================ */
var V168_MODE_FIELDS = ['حالت', 'شناسهٔ مکان', 'شهر درخواستی'];
var V168_MODES = ['آنلاین', 'حضوری', 'فرقی ندارد'];
var V168_INP_OK = ['تأیید شد', 'اصلاح شد'];
/* متن پرسیدن نام شهر را تیم می‌نویسد (قاعدهٔ ۱۱): کلید city_prompt در تب تنظیمات v168. تا خالی است، مسیر قبلی «شهر دیگر» می‌ماند. */

function v168ModeParse_(text, places) {
  var t = String(text || '').trim();
  if (!t) return {};
  if (/فرقی/.test(t)) return { 'حالت': 'فرقی ندارد' };
  if (!/حضوری/.test(t)) return /آنلاین/.test(t) ? { 'حالت': 'آنلاین' } : {};
  var parts = t.split(/\s+·\s+/).map(function (x) { return x.trim(); });
  var out = { 'حالت': 'حضوری' };
  if (/شهر دیگر/.test(parts[0])) {
    var c0 = (parts[1] && !/شهر دیگر/.test(parts[1])) ? parts[1] : '';
    if (c0) out['شهر درخواستی'] = c0;
    return out;
  }
  var city = parts[1] || String(parts[0]).replace(/^حضوری\s*/, '').trim(), area = parts[2] || '';
  var hit = (places || []).filter(function (p) { return p.city === city && (!area || p.area === area); });
  if (hit.length === 1) out['شناسهٔ مکان'] = hit[0].id;
  else if (city) out['شهر درخواستی'] = city;
  return out;
}
/* از tgOnPhone_: سه فیلد از جواب‌های خود مراجع در بات */
function v168ModeExtras_(chat, extra) {
  try {
    var k = tgGetVal_('qm', chat);
    if (!k) return extra;
    extra['حالت'] = k === 'on' ? 'آنلاین' : 'حضوری';
    var pid = tgGetVal_('qpid', chat), city = tgGetVal_('qcity', chat);
    if (pid && k !== 'on') extra['شناسهٔ مکان'] = pid;
    if (city && city !== '?' && k !== 'on') extra['شهر درخواستی'] = city;
  } catch (e) { tgErr_('v168ModeExtras_', e); }
  return extra;
}
/* ساعت حضوری که به مراجع نشان داده می‌شود: فقط تأییدشده */
function v168HourOk_(h) { return V168_INP_OK.indexOf(String(h.chk || '').trim()) > -1; }
/* «شهر دیگر»: نام شهر */
function v168CityText_(chat, text) {
  var t = String(text || '').trim();
  if (!t || t.indexOf('/') === 0 || tgIsBtnLike_(t)) { tgDel_('qcity', chat); return false; }
  var city = t.slice(0, 40);
  tgSetVal_('qcity', chat, city);
  tgInpDemand_('مراجع', '-', '', '', String(chat), 'شهر: ' + city);
  tgDeskSay_('🏙 مراجعی جلسهٔ حضوری در «' + tgEsc_(city) + '» می‌خواهد و آنجا مکان نداریم. در «تقاضا و انتظار حضوری» ثبت شد.');
  tgSend_(chat, T_INP_OTHER);
  tgQuizFinish_(chat, 'city');
  return true;
}
/* مکان بی ساعت تأییدشده: تقاضا و خبر به پذیرش */
function v168NoSupply_(chat, p) {
  tgInpDemand_('مراجع', p.id, '', '', String(chat), 'ساعت تأییدشده نداریم');
  tgDeskSay_('🏢 مراجعی حضوری در ' + tgEsc_(tgInpLabel_(p)) + ' خواست ولی ساعت تأییدشده‌ای نیست. تقاضا ثبت شد؛ لطفاً هماهنگ کنید.');
}

/* ---------- مهلت صف‌های حضوری ---------- */
/* items: [{key, label, since(ms)}]؛ state: {key: {t, st}}؛ خروجی: {state, remind: [], escalate: []} */
function v168SlaPlan_(items, state, nowMs) {
  var st = {}, remind = [], esc = [];
  items.forEach(function (it) {
    var s0 = state[it.key] || { t: it.since || nowMs, st: '' };
    var age = nowMs - s0.t;
    if (age >= 48 * 3600000 && s0.st !== '۴۸') { esc.push(it); s0.st = '۴۸'; }
    else if (age >= 24 * 3600000 && !s0.st) { remind.push(it); s0.st = '۲۴'; }
    st[it.key] = s0;
  });
  return { state: st, remind: remind, escalate: esc };
}
function v168InpPending_() {
  var out = [];
  try {
    tgInpTab_(TG_INP_REQ, TG_INP_QHEAD).rows().forEach(function (r) {
      if (r[13] !== 'منتظر پذیرش') return;
      out.push({ key: 'q:' + r[0], label: 'درخواست حضوری ' + r[0] + ' (' + r[2] + ' · ' + tgInpPlaceName_(r[4]) + ')' });
    });
  } catch (e) {}
  try {
    tgInpData_().hours.forEach(function (h) {
      if (String(h.chk || '').trim() !== 'در انتظار تأیید') return;
      out.push({ key: 'h:' + tgInpRowKey_(h), label: 'ساعت حضوری ' + h.who + ' · ' + tgInpRowText_(h) });
    });
  } catch (e2) {}
  return out;
}
function v168InpSla_() {
  var P = TG_DRY ? null : PropertiesService.getScriptProperties(), raw = TG_DRY ? (TG_MEM['V168_INPSLA'] || '{}') : (P.getProperty('V168_INPSLA') || '{}');
  var state = {}; try { state = JSON.parse(raw); } catch (e) {}
  var plan = v168SlaPlan_(v168InpPending_(), state, TG_DRY && TG_MEM['nowms'] ? TG_MEM['nowms'] : Date.now());
  var owner = v168DeskLead_();
  if (plan.remind.length) owner.forEach(function (c) { tgSend_(c, '⏳ <b>صف حضوری، بیش از ۲۴ ساعت بی‌پاسخ</b>\nمسئول: پذیرش. مهلت: ۲۴ ساعت دیگر، بعد به ناظر می‌رود.\n\n' + plan.remind.map(function (x) { return '• ' + tgEsc_(x.label); }).join('\n')); });
  if (plan.escalate.length) tgSend_(TG_OWNER_CHAT, '⚠️ <b>صف حضوری، بیش از ۴۸ ساعت بی‌پاسخ</b>\n\n' + plan.escalate.map(function (x) { return '• ' + tgEsc_(x.label); }).join('\n'));
  var s = JSON.stringify(plan.state);
  if (TG_DRY) TG_MEM['V168_INPSLA'] = s; else P.setProperty('V168_INPSLA', s);
  return plan.remind.length + plan.escalate.length;
}

/* یک‌باره: ستون‌های تازه، پارس «حالت جلسه»، فهرست کشویی */
function tgV168ModeSplit() {
  var ss = tgSS_(), sh = ss.getSheetByName(TG_LEADS), day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  if (!ss.getSheetByName('پشتیبان لیدها ' + day)) { var b = sh.copyTo(ss).setName('پشتیبان لیدها ' + day); try { b.hideSheet(); } catch (e) {} }
  V168_MODE_FIELDS.forEach(function (f) { tgLeadCol_(f); });
  try { CacheService.getScriptCache().remove('scols'); } catch (e0) {}
  TG_SCALE_COLS_ = null;
  var places = []; try { places = tgInpData_().places; } catch (e1) {}
  var hm = (TG_LEAD_HM_ = null, tgLeadHeadMap_(sh)), last = sh.getLastRow(), n = 0, nPlace = 0, nCity = 0, t0 = Date.now();
  var v = last > 1 ? sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues() : [];
  var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : String(r[i] || '').trim(); };
  for (var i = 0; i < v.length && Date.now() - t0 < 270000; i++) {
    var src = g(v[i], 'حالت جلسه');
    if (!src || g(v[i], 'حالت')) continue;
    var ch = v168ModeParse_(src, places);
    if (!ch['حالت']) continue;
    tgLeadSet_(i + 2, ch, 'بات', 'بات', 'مهاجرت حالت جلسه');
    n++; if (ch['شناسهٔ مکان']) nPlace++; if (ch['شهر درخواستی']) nCity++;
  }
  try {
    var mc = tgLeadCol_('حالت');
    sh.getRange(2, mc, Math.max(1, sh.getMaxRows() - 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(V168_MODES, true).setAllowInvalid(false).build());
    var ps = ss.getSheetByName(TG_INP_PLACES), pc = tgLeadCol_('شناسهٔ مکان');
    if (ps) sh.getRange(2, pc, Math.max(1, sh.getMaxRows() - 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ps.getRange(2, 1, Math.max(1, ps.getMaxRows() - 1), 1), true).setAllowInvalid(false).build());
  } catch (e2) { tgErr_('tgV168ModeSplit کشویی', e2); }
  return 'حالت جلسه: ' + n + ' سطر پارس شد · با شناسهٔ مکان ' + nPlace + ' · با شهر درخواستی ' + nCity;
}

/* ============================================================================
   فاز ۷: واژگان بسته برای «نوع درخواست» و «موضوع اصلی»
   - فهرست‌ها در تب «واژگان» است (v168Kinds_ و v168Topics_ همان TG_REQ_KINDS و TG_TOPICS واژگانی‌اند).
   - هر مقداری که به این دو ستون نوشته می‌شود (tgLeadSet_ و لید تازه) به نزدیک‌ترین مقدار فهرست برمی‌گردد.
   - فرم پذیرش بات همیشه هر دو را پر می‌کند (نامشخص و سایر اگر مراجع جواب نداد).
   - مهاجرت یک‌بارهٔ مقدارهای قدیمی (tgV168VocabMigrate) و فهرست کشویی.
   دکمه‌های سؤال موضوع بات (TG_TOPICS با کلید و استخر) همان می‌ماند؛ خروجی‌شان از همین واژگان است.
   ============================================================================ */
V168_VOCAB['نوع درخواست'] = ['تراپی فردی', 'زوج‌درمانی', 'خانواده و والدگری', 'کودک و نوجوان', 'روان‌پزشکی', 'سوپرویژن', 'سازمانی', 'گروه‌درمانی', 'نامشخص'];
V168_VOCAB['موضوع اصلی'] = ['افسردگی', 'اضطراب و استرس', 'رابطه و زوج', 'خانواده و والدگری', 'خودشناسی و مسیر زندگی', 'وسواس و نشخوار', 'سوگ', 'تروما', 'اعتیاد رفتاری', 'خواب', 'سایر'];
var V168_KIND_RULES = [[/زوج/, 'زوج‌درمانی'], [/گروه/, 'گروه‌درمانی'], [/کودک|نوجوان/, 'کودک و نوجوان'], [/خانواده|والد/, 'خانواده و والدگری'],
  [/روانپزشک/, 'روان‌پزشکی'], [/سوپرویژن|سوپروایز/, 'سوپرویژن'], [/سازمان/, 'سازمانی'], [/فردی|تراپی|درمان|مشاوره/, 'تراپی فردی'], [/نامشخص|نمیدانم/, 'نامشخص']];
var V168_TOPIC_RULES = [[/افسرد|بیحوصلگی|بیانگیزگی/, 'افسردگی'], [/اضطراب|استرس|پانیک|ترس/, 'اضطراب و استرس'], [/رابطه|زوج|عشق|ازدواج/, 'رابطه و زوج'],
  [/خانواده|والد|کودک|فرزند|نوجوان/, 'خانواده و والدگری'], [/خودشناسی|مسیرزندگی|هویت/, 'خودشناسی و مسیر زندگی'], [/وسواس|نشخوار/, 'وسواس و نشخوار'],
  [/سوگ|فقدان|داغ/, 'سوگ'], [/تروما|آسیب/, 'تروما'], [/اعتیاد/, 'اعتیاد رفتاری'], [/خواب/, 'خواب'], [/سایر|دیگر|روانپزشک/, 'سایر']];
function v168Kinds_() { return v168Vocab_('نوع درخواست'); }
function v168Topics_() { return v168Vocab_('موضوع اصلی'); }
function v168Squash_(x) { return String(x || '').replace(/[\s‌‌\-ـ]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }
/* مقدار فهرست یا '' اگر نشد */
function v168NormIn_(list, rules, v) {
  var t = String(v || '').trim();
  if (!t) return '';
  var q = v168Squash_(t);
  for (var i = 0; i < list.length; i++) if (v168Squash_(list[i]) === q) return list[i];
  for (var j = 0; j < rules.length; j++) if (rules[j][0].test(q)) return list.indexOf(rules[j][1]) > -1 ? rules[j][1] : '';
  return '';
}
function v168NormKind_(v) { return v168NormIn_(v168Kinds_(), V168_KIND_RULES, v); }
function v168NormTopic_(v) { return v168NormIn_(v168Topics_(), V168_TOPIC_RULES, v); }
/* روی تغییرهای tgLeadSet_ و لید تازه: فقط وقتی مقدار شناخته شد عوض می‌شود */
function v168NormChanges_(ch) {
  if (Object.prototype.hasOwnProperty.call(ch, 'نوع درخواست') && String(ch['نوع درخواست'] || '').trim()) { var k = v168NormKind_(ch['نوع درخواست']); if (k) ch['نوع درخواست'] = k; }
  if (Object.prototype.hasOwnProperty.call(ch, 'موضوع اصلی') && String(ch['موضوع اصلی'] || '').trim()) { var t = v168NormTopic_(ch['موضوع اصلی']); if (t) ch['موضوع اصلی'] = t; }
  return ch;
}
/* لید تازه: بات همیشه هر دو را پر می‌کند */
function v168NewLeadVocab_(o) {
  var k = v168NormKind_(o.kind), t = v168NormTopic_(o.topic);
  var bot = /Telegram|تلگرام|بات|اینستاگرام/.test(String(o.source || '')) || /chat_id: \d+/.test(String(o.note || ''));
  o.kind = k || (o.kind ? o.kind : (bot ? 'نامشخص' : ''));
  o.topic = t || (o.topic ? o.topic : (bot ? 'سایر' : ''));
  return o;
}
function v168VocabStats_(rows, hm) {
  var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : String(r[i] || '').trim(); };
  var K = v168Kinds_(), T = v168Topics_(), o = { n: 0, kind: 0, topic: 0 };
  rows.forEach(function (r) {
    if (!String(r[3] || r[5] || '').trim()) return;
    o.n++; if (K.indexOf(g(r, 'نوع درخواست')) > -1) o.kind++; if (T.indexOf(g(r, 'موضوع اصلی')) > -1) o.topic++;
  });
  return o;
}
function tgV168VocabMigrate() {
  var ss = tgSS_(), sh = ss.getSheetByName(TG_LEADS), day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  if (!ss.getSheetByName('پشتیبان لیدها ' + day)) { var b = sh.copyTo(ss).setName('پشتیبان لیدها ' + day); try { b.hideSheet(); } catch (e) {} }
  v168Vocab_('نوع درخواست');
  var hm = tgLeadHeadMap_(sh), last = sh.getLastRow(), v = last > 1 ? sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues() : [];
  var before = v168VocabStats_(v, hm), n = 0, t0 = Date.now();
  var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : String(r[i] || '').trim(); };
  for (var i = 0; i < v.length && Date.now() - t0 < 270000; i++) {
    var k0 = g(v[i], 'نوع درخواست'), t0v = g(v[i], 'موضوع اصلی'), ch = {};
    var k1 = v168NormKind_(k0), t1 = v168NormTopic_(t0v);
    if (k0 && k1 && k1 !== k0) ch['نوع درخواست'] = k1;
    if (t0v && t1 && t1 !== t0v) ch['موضوع اصلی'] = t1;
    if (Object.keys(ch).length) { tgLeadSet_(i + 2, ch, 'بات', 'بات', 'مهاجرت واژگان'); n++; }
  }
  var v2 = sh.getRange(2, 1, Math.max(1, last - 1), sh.getLastColumn()).getValues(), after = v168VocabStats_(v2, hm);
  try {
    var vs = ss.getSheetByName(V168_T_VOCAB), vh = vs.getRange(1, 1, 1, vs.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    [['نوع درخواست', 14], ['موضوع اصلی', 15]].forEach(function (x) {
      var vc = vh.indexOf(x[0]) + 1;
      if (vc > 0) sh.getRange(2, x[1], Math.max(1, sh.getMaxRows() - 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(vs.getRange(2, vc, Math.max(1, vs.getMaxRows() - 1), 1), true).setAllowInvalid(true).build());
    });
  } catch (e2) { tgErr_('tgV168VocabMigrate کشویی', e2); }
  var pc = function (a, b) { return b ? Math.round(a / b * 100) : 0; };
  return 'واژگان: ' + n + ' سطر یکدست شد · نوع درخواست از فهرست ' + pc(before.kind, before.n) + '٪ ← ' + pc(after.kind, after.n) + '٪ · موضوع ' + pc(before.topic, before.n) + '٪ ← ' + pc(after.topic, after.n) + '٪ (از ' + after.n + ' لید)';
}

/* ============================================================================
   فاز ۸: بستن ماه خودکار (tgMonthClose) اول هر ماه شمسی، با هشت بخش سند لید
   ۱ قیف هشت‌مرحله‌ای با نرخ هر گام و مقایسه با ماه قبل (اسم مرحله‌ها از اسکیل tajrobeh-leadflow)
   ۲ دلیل ریزش در هر مرحله · ۳ نوع درخواست و موضوع · ۴ خدماتی که نداشتیم (دلیل بستن و تقاضای حضوری بی‌مکان، به تفکیک شهر)
   ۵ آمار معارفه با دلیل‌ها · ۶ تصمیم‌های لازم دربارهٔ درمانگران · ۷ مصرف اسلات · ۸ منابع لید و سهم خارج از ایران،
     با ریز اینستاگرام به تفکیک پیج و کلمه: ورود به بات، لید، معارفه، شروع درمان، ثبت‌نام دوره.
   هیچ نام مراجعی در گزارش نمی‌آید.
   ============================================================================ */
var V168_STAGES = ['رسیدن', 'اقدام', 'لید', 'تماس اول', 'ارجاع', 'معارفه', 'شروع درمان', 'ماندگاری'];

function v168JRange_(jy, jm) {
  var ny = jm === 12 ? jy + 1 : jy, nm = jm === 12 ? 1 : jm + 1;
  var f = function (d) { return Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd'); };
  return { from: f(tgJ2G_(jy, jm, 1)), to: f(tgJ2G_(ny, nm, 1)), label: TG_JMONTHS[jm - 1] + ' ' + tgFa_(jy), key: jy + '/' + jm };
}
function v168PrevJ_(jy, jm) { return jm === 1 ? [jy - 1, 12] : [jy, jm - 1]; }
/* «۹ مهر ۱۴۰۵ ۱۰:۰۰» یا Date یا yyyy-MM-dd ← yyyy-MM-dd */
function v168Iso_(x) {
  if (x instanceof Date) return isNaN(x.getTime()) ? '' : Utilities.formatDate(x, TG_TZ, 'yyyy-MM-dd');
  var s = tgLatinDigits_(String(x || '')).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (m) { var mi = TG_JMONTHS.indexOf(m[2]); if (mi > -1) return Utilities.formatDate(tgJ2G_(Number(m[3]), mi + 1, Number(m[1])), TG_TZ, 'yyyy-MM-dd'); }
  var d = new Date(s);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd');
}
function v168Count_(arr, fn) { var o = {}; arr.forEach(function (x) { var k = fn(x); if (k) o[k] = (o[k] || 0) + 1; }); return o; }
function v168Sorted_(o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return [k, o[k]]; }); }
function v168Pct_(a, b) { return b ? tgFa_(String(Math.round(a / b * 100))) + '٪' : ''; }

/* ورودی پاک (بی نام مراجع) ← سطرهای هشت بخش */
function v168MonthData_(inp, R, P) {
  var inR = function (d, r) { return d && d >= r.from && d < r.to; };
  function funnel(r) {
    var L = inp.leads.filter(function (l) { return inR(l.d, r) && l.sec !== 'مدرسه'; });
    return { act: inp.clicks.filter(function (c) { return inR(c.d, r); }).length, lead: L.length,
             first: L.filter(function (l) { return l.touched; }).length, ref: L.filter(function (l) { return l.ref; }).length,
             intro: L.filter(function (l) { return l.booked; }).length, start: L.filter(function (l) { return l.started; }).length, L: L };
  }
  var f = funnel(R), fp = funnel(P), out = [];
  var H = function (t) { out.push(['']); out.push([t]); };
  /* ۱ */
  H('۱. قیف ' + R.label);
  out.push(['مرحله', 'این ماه', 'نرخ از مرحلهٔ قبل', 'ماه قبل', 'نرخ ماه قبل']);
  var rows = [['رسیدن', '', '', '', ''], ['اقدام', f.act, '', fp.act, ''], ['لید', f.lead, v168Pct_(f.lead, f.act), fp.lead, v168Pct_(fp.lead, fp.act)],
    ['تماس اول', f.first, v168Pct_(f.first, f.lead), fp.first, v168Pct_(fp.first, fp.lead)], ['ارجاع', f.ref, v168Pct_(f.ref, f.first), fp.ref, v168Pct_(fp.ref, fp.first)],
    ['معارفه', f.intro, v168Pct_(f.intro, f.ref), fp.intro, v168Pct_(fp.intro, fp.ref)], ['شروع درمان', f.start, v168Pct_(f.start, f.intro), fp.start, v168Pct_(fp.start, fp.intro)],
    ['ماندگاری', 'هنوز اندازه گرفته نمی‌شود', '', '', '']];
  rows[0][1] = 'از سرچ کنسول و آنالیتیکس';
  rows.forEach(function (x) { out.push(x); });
  /* ۲ */
  H('۲. دلیل ریزش');
  out.push(['مرحله', 'دلیل', 'تعداد']);
  var closed = f.L.filter(function (l) { return l.closed && !l.started; });
  var stageOf = function (l) { return l.booked ? 'معارفه' : (l.ref ? 'ارجاع' : (l.touched ? 'تماس اول' : 'لید')); };
  v168Sorted_(v168Count_(closed, function (l) { return stageOf(l) + '|' + (l.reason ? l.reason.replace(/:.*$/, '') : 'بی دلیل'); })).forEach(function (x) { var a = x[0].split('|'); out.push([a[0], a[1], x[1]]); });
  var S = inp.slots.filter(function (x) { return inR(x.d, R); });
  v168Sorted_(v168Count_(S.filter(function (x) { return x.why && x.mstate !== V168_MS.HELD; }), function (x) { return x.mstate + '|' + x.why; })).forEach(function (x) { var a = x[0].split('|'); out.push(['معارفه · ' + a[0], a[1], x[1]]); });
  v168Sorted_(v168Count_(S.filter(function (x) { return x.why2; }), function (x) { return x.why2; })).forEach(function (x) { out.push(['شروع درمان · ادامه نداد', x[0], x[1]]); });
  /* ۳ */
  H('۳. نوع درخواست و موضوع اصلی');
  out.push(['نوع درخواست', 'تعداد', 'موضوع اصلی', 'تعداد']);
  var K = v168Sorted_(v168Count_(f.L, function (l) { return l.kind || 'خالی'; })), T = v168Sorted_(v168Count_(f.L, function (l) { return l.topic || 'خالی'; }));
  for (var j = 0; j < Math.max(K.length, T.length); j++) out.push([(K[j] || [''])[0], (K[j] || ['', ''])[1], (T[j] || [''])[0], (T[j] || ['', ''])[1]]);
  /* ۴ */
  H('۴. خدماتی که نداشتیم');
  out.push(['از کجا', 'چه', 'تعداد']);
  v168Sorted_(v168Count_(f.L.filter(function (l) { return /^خدمتی که نداریم/.test(l.reason || ''); }), function (l) { return (l.reason.split(':')[1] || 'نامشخص').trim(); })).forEach(function (x) { out.push(['دلیل بستن', x[0], x[1]]); });
  v168Sorted_(v168Count_(inp.demand.filter(function (x) { return inR(x.d, R); }), function (x) {
    var m = String(x.note || '').match(/^شهر:\s*(.+)$/); return m ? 'شهر: ' + m[1].trim() : (x.place && x.place !== '-' ? 'مکان بی ساعت: ' + x.place : '');
  })).forEach(function (x) { out.push(['تقاضای حضوری', x[0], x[1]]); });
  /* ۵ */
  H('۵. معارفه');
  out.push(['حالت', 'تعداد', 'دلیل‌ها']);
  [V168_MS.BOOK, V168_MS.HELD, V168_MS.NOC, V168_MS.NOT, V168_MS.CXL, V168_MS.MOVE].forEach(function (st) {
    var xs = S.filter(function (x) { return x.mstate === st; });
    var w = v168Sorted_(v168Count_(xs, function (x) { return x.why; })).map(function (y) { return y[0] + ' ' + y[1]; }).join('، ');
    out.push([st === V168_MS.BOOK ? 'رزرو شد، هنوز بی‌نتیجه' : st, xs.length, w]);
  });
  out.push(['همهٔ رزروهای این ماه', S.filter(function (x) { return x.mstate; }).length, '']);
  /* ۶ */
  H('۶. تصمیم‌های لازم دربارهٔ درمانگران');
  out.push(['درمانگر', 'چرا', 'عدد']);
  (inp.ther || []).forEach(function (t) {
    if (t.sug >= 5 && !t.intro) out.push([t.name, 'پیشنهاد زیاد، معارفهٔ صفر', t.sug]);
    if (t.respMed !== '' && t.respMed > inp.slowH) out.push([t.name, 'کند در پاسخ به کارت ارجاع (ساعت)', t.respMed]);
    if (t.noshowRate !== '' && t.done >= 3 && t.noshowRate >= 0.2) out.push([t.name, 'نیامدن در معارفه', tgFa_(String(Math.round(t.noshowRate * 100))) + '٪']);
    if (t.tierNow !== undefined && t.tierPrev !== undefined && t.tierNow !== t.tierPrev) out.push([t.name, 'جابه‌جایی رده', (t.tierPrev ? tgFa_(String(t.tierPrev)) : 'داده کم') + ' ← ' + (t.tierNow ? tgFa_(String(t.tierNow)) : 'داده کم')]);
  });
  /* ۷ */
  H('۷. مصرف اسلات معارفه');
  var sup = inp.slotAll.filter(function (x) { return inR(x.d, R); });
  var used = sup.filter(function (x) { return x.state === 'رزرو شده'; }).length;
  out.push(['عرضه (اسلات این ماه)', sup.length]);
  out.push(['رزروشده', used]);
  out.push(['نسبت عرضه به رزرو', used ? tgFa_(String(Math.round(sup.length / used * 10) / 10)) + ' به ۱' : 'رزروی نبود']);
  /* ۸ */
  H('۸. منابع لید و سهم خارج از ایران');
  out.push(['منبع', 'لید', 'سهم']);
  v168Sorted_(v168Count_(f.L, function (l) { return /^اینستاگرام/.test(l.src) ? 'اینستاگرام' : tgLeadSrc_(l.src, l.channel); })).forEach(function (x) { out.push([x[0], x[1], v168Pct_(x[1], f.lead)]); });
  var ab = f.L.filter(function (l) { return /خارج/.test(l.region || ''); }).length;
  out.push(['خارج از ایران', ab, v168Pct_(ab, f.lead)]);
  out.push(['']);
  out.push(['اینستاگرام · پیج · کلمه', 'ورود به بات', 'لید', 'معارفه', 'شروع درمان', 'ثبت‌نام دوره']);
  var ig = {};
  var IG = function (k) { return ig[k] = ig[k] || [0, 0, 0, 0, 0]; };
  inp.clicks.filter(function (c) { return inR(c.d, R) && /^ig_/.test(c.code || ''); }).forEach(function (c) { var x = igParse_(c.code); if (x) IG(x.page + ' · ' + x.kw)[0]++; });
  f.L.filter(function (l) { return /^اینستاگرام · /.test(l.src); }).forEach(function (l) { var k = l.src.replace(/^اینستاگرام · /, ''); var a = IG(k); a[1]++; if (l.booked) a[2]++; if (l.started) a[3]++; });
  inp.school.filter(function (x) { return inR(x.d, R) && /^اینستاگرام · /.test(x.src) && x.done; }).forEach(function (x) { IG(x.src.replace(/^اینستاگرام · /, ''))[4]++; });
  Object.keys(ig).sort().forEach(function (k) { out.push([k].concat(ig[k])); });
  return out;
}

/* خواندن شیت‌ها به ورودی پاک */
function v168MonthInput_() {
  var ss = tgSS_(), inp = { leads: [], clicks: [], slots: [], slotAll: [], demand: [], school: [], ther: [], slowH: v168Cfg_('referral_slow_hours', 48) };
  var sh = ss.getSheetByName(TG_LEADS), hm = tgLeadHeadMap_(sh), last = sh.getLastRow();
  var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : String(r[i] || '').trim(); };
  if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues().forEach(function (r) {
    if (!String(r[3] || r[5] || '').trim()) return;
    var st = String(r[8] || '').trim(), stOf = tgStOf_(st) || st;
    inp.leads.push({ d: v168Iso_(r[0]), src: String(r[2] || '').trim(), channel: String(r[4] || '').trim(), region: String(r[6] || '').trim(), status: stOf,
      touched: !!tgContactDate_(r[10], new Date()), ref: !!(g(r, V168_SUG[0]) || g(r, 'تاریخ ارجاع')), booked: g(r, 'معارفه هماهنگ شد؟') === 'بله' || stOf === TG_ST.BOOKED || stOf === TG_ST.HELD,
      started: stOf === TG_ST.START, closed: tgStClosed_(st), reason: g(r, 'دلیل بستن'), kind: g(r, 'نوع درخواست'), topic: g(r, 'موضوع اصلی'),
      sec: tgSection_(String(r[2] || ''), '') });
  });
  try { var cs = ss.getSheetByName('کلیک‌های تماس'); if (cs && cs.getLastRow() > 1) cs.getRange(2, 1, cs.getLastRow() - 1, 7).getValues().forEach(function (r) { inp.clicks.push({ d: v168Iso_(r[0]), code: String(r[6] || '').trim() }); }); } catch (e1) {}
  try {
    var ssl = ss.getSheetByName(TG_SLOTS), map = tgMtHeadMap_();
    if (ssl && ssl.getLastRow() >= 4) ssl.getRange(4, 1, ssl.getLastRow() - 3, ssl.getLastColumn()).getValues().forEach(function (r) {
      var G = function (h) { return map[h] === undefined ? '' : String(r[map[h]] || '').trim(); };
      var x = { d: v168Iso_(r[1]), ther: String(r[0] || '').trim(), state: String(r[5] || '').trim(), mstate: G(V168_H_STATE), why: G(V168_H_WHY), why2: G(V168_H_WHY2) };
      inp.slotAll.push(x); if (x.mstate) inp.slots.push(x);
    });
  } catch (e2) {}
  try { tgInpTab_(TG_INP_DEM, TG_INP_DHEAD).rows().forEach(function (r) { inp.demand.push({ d: v168Iso_(r[0]), place: r[2], note: r[6] }); }); } catch (e3) {}
  try { tgCpRead_(TG_SCH_T_REQ).forEach(function (o) { inp.school.push({ d: v168Iso_(o['تاریخ درخواست']), src: String(o['منبع'] || '').trim(), done: String(o['وضعیت'] || '').trim() === TG_SCH_ST_DONE }); }); } catch (e4) {}
  try {
    var es = tgLeadEvSheet_(), ev = es && es.getLastRow() > 1 ? es.getRange(2, 1, es.getLastRow() - 1, 9).getValues() : [];
    var st = v168TherStats_(ev, inp.slots), ctx = v168SuggestCtx_(), prev = {};
    try { prev = JSON.parse(PropertiesService.getScriptProperties().getProperty('V168_TIERS') || '{}'); } catch (e5) {}
    var now = {};
    ctx.ther.forEach(function (t) {
      var s0 = st[tgNorm_(t.name)] || { sug: 0, intro: 0, respMed: '', noshowRate: '', done: 0 };
      now[t.name] = t.tier;
      inp.ther.push({ name: t.name, sug: t.sug, intro: s0.intro, respMed: s0.respMed, noshowRate: s0.noshowRate, done: s0.done,
                      tierNow: t.tier, tierPrev: prev[t.name] === undefined ? undefined : prev[t.name] });
    });
    PropertiesService.getScriptProperties().setProperty('V168_TIERS', JSON.stringify(now));
  } catch (e6) { tgErr_('v168MonthInput_ درمانگران', e6); }
  return inp;
}
/* jKey مثل «1405/6»؛ خالی یعنی ماه قبل */
function tgMonthClose(jKey) {
  var j = tgJalali_(new Date(), TG_TZ), y, m;
  if (jKey && /^\d{4}\/\d{1,2}$/.test(String(jKey))) { y = Number(String(jKey).split('/')[0]); m = Number(String(jKey).split('/')[1]); }
  else { var pj = v168PrevJ_(j.y, j.m); y = pj[0]; m = pj[1]; }
  var pp = v168PrevJ_(y, m), R = v168JRange_(y, m), P = v168JRange_(pp[0], pp[1]);
  var rows = v168MonthData_(v168MonthInput_(), R, P);
  var name = 'بستن ماه ' + tgFa_(y) + '/' + tgFa_(m), ss = tgSS_(), sh = ss.getSheetByName(name);
  if (sh) sh.clear(); else { sh = ss.insertSheet(name); try { sh.setRightToLeft(true); } catch (e) {} }
  var w = 6, data = [['📅 بستن ماه ' + R.label, '', '', '', '', ''], ['ساخته‌شده خودکار: ' + tgJDateFull_(new Date(), TG_TZ), '', '', '', '', '']]
    .concat(rows.map(function (r) { var a = r.slice(0, w); while (a.length < w) a.push(''); return a; }));
  sh.getRange(1, 1, data.length, w).setValues(data);
  sh.getRange(1, 1).setFontSize(15).setFontWeight('bold');
  data.forEach(function (r, i) { if (/^[۱-۸]\. /.test(String(r[0]))) sh.getRange(i + 1, 1, 1, w).setFontWeight('bold').setBackground('#faeced'); });
  try { tgSend_(TG_OWNER_CHAT, '📅 گزارش بستن ماه ' + R.label + ' در تب «' + name + '» هاب تجربه ساخته شد.'); } catch (e2) {}
  return name + ': ' + rows.length + ' سطر';
}
/* اول هر ماه شمسی، یک بار (از tgWatchdog) */
function v168MonthTick_() {
  var j = tgJalali_(new Date(), TG_TZ);
  if (j.d !== 1) return '';
  var P = PropertiesService.getScriptProperties(), key = j.y + '/' + j.m;
  if (P.getProperty('V168_MC') === key) return '';
  P.setProperty('V168_MC', key);
  try { tgTherStatsRebuild(); } catch (e) { tgErr_('v168MonthTick_ آمار', e); }
  return tgMonthClose('');
}

function tgV168Tests() {
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX, leadK = TG_DRY_LEAD;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  try {
    var F = '=IF(R[0]C[-2]="","",R[0]C[-2]/R[0]C[-1])';
    var g = v168FormulaGaps_([{ name: 'الف', f: F }, { name: 'ب', f: '' }, { name: 'پ', f: F }, { name: '', f: '' }, { name: 'ت', f: F }]);
    ok('فاز ۰: سطر نام‌دار بی‌فرمول پیدا می‌شود (مثل K ردیف ۲۰)', g.f === F && g.fix.length === 1 && g.fix[0] === 1);
    var g2 = v168FormulaGaps_([{ name: 'الف', f: F }, { name: 'ب', f: F }, { name: 'پ', f: '' }, { name: 'ت', f: '' }]);
    ok('فاز ۰: دو سطر آخر فیل‌داون‌نشده (مثل M ۱۷۱ و ۱۷۲)', g2.fix.join(',') === '2,3');
    ok('فاز ۰: ستون بی‌فرمول دست نمی‌خورد', v168FormulaGaps_([{ name: 'الف', f: '' }]).fix.length === 0);
    var leads = [
      { code: 'L-1', sug: ['درمانگر الف', 'نام ناشناخته'], t: 'بله', v: 'درمانگر الف' },
      { code: 'L-2', sug: ['نام ناشناخته'], t: '', v: 'درمانگر ب' },
      { code: 'L-3', sug: [], t: 'خیر', v: 'درمانگر ب' },
      { code: 'L-4', sug: [], t: 'بله', v: '' },
      { code: 'L-5', sug: ['درمانگر  ب'], t: 'خیر', v: '' }
    ];
    var c = v168LeadChecks_(leads, ['درمانگر الف', 'درمانگر ب']);
    ok('فاز ۰: نام ناشناخته با شمار و کد لید', c.unknown.length === 1 && c.unknown[0].codes.join(',') === 'L-1,L-2');
    ok('فاز ۰: ناهمخوانی T و V در هر دو جهت', c.tv.map(function (x) { return x.code; }).join(',') === 'L-2,L-3,L-4');
    var txt = v168CheckText_(c);
    ok('فاز ۰: کارت بی خط تیره و بی حدس', txt.indexOf('—') < 0 && txt.indexOf('–') < 0 && /حدس نمی‌زند/.test(txt));
    TG_MEM['desk'] = [{ chat: '7001', role: 'مسئول پذیرش' }, { chat: '7002', role: 'پذیرش' }];
    ok('فاز ۰: کارت فقط برای مسئول پذیرش', v168DeskLead_().join(',') === '7001');
    ok('فاز ۰: اجرای یک‌باره در فهرست خودکار', CI_ONCE_AUTO.indexOf('tgV168Hygiene') > -1 && CI_ONCE_ALLOW.indexOf('tgV168Hygiene') > -1);

    /* ---- فاز ۲: تکلیف لید ---- */
    var T = '2026-10-01';
    var p1 = v168NextPlan_({}, {}, T);
    ok('فاز ۲: لید تازه ← تماس اول، امروز', p1.add['اقدام بعدی'] === 'تماس اول' && p1.add['تاریخ اقدام بعدی'] === T);
    var p2 = v168NextPlan_({ status: 'جدید', next: 'تماس اول', nextDate: T }, { 'آخرین تماس': T, 'نتیجه': 'صحبت شد' }, T);
    ok('فاز ۲: بعد از تماس ← تماس پیگیری، دو روز بعد', p2.add['اقدام بعدی'] === 'تماس پیگیری' && p2.add['تاریخ اقدام بعدی'] === '2026-10-03');
    var p3 = v168NextPlan_({ status: 'جدید' }, { 'آخرین تماس': T, 'اقدام بعدی': 'تماس دوباره' }, T);
    ok('فاز ۲: اقدام صریح برنده است و فقط تاریخ خالی پر می‌شود', !p3.add['اقدام بعدی'] && p3.add['تاریخ اقدام بعدی'] === '2026-10-03');
    var p4 = v168NextPlan_({ status: 'در پیگیری', next: 'تماس پیگیری', nextDate: T }, { 'وضعیت': 'بسته', 'دلیل بستن': 'منصرف شد' }, T);
    ok('فاز ۲: لید بسته اقدام بعدی ندارد', p4.add['اقدام بعدی'] === '' && p4.add['تاریخ اقدام بعدی'] === '');
    var p5 = v168NextPlan_({ status: 'ارجاع شد', next: 'منتظر پاسخ درمانگر', nextDate: T }, { 'معارفه هماهنگ شد؟': 'بله', 'تاریخ معارفه': '2026-10-06', 'درمانگر معارفه': 'درمانگر الف' }, T);
    ok('فاز ۲: رزرو معارفه ← یادآوری، روز قبل جلسه', p5.add['اقدام بعدی'] === 'یادآوری معارفه' && p5.add['تاریخ اقدام بعدی'] === '2026-10-05');
    var p6 = v168NextPlan_({ status: 'معارفه رزرو شد', next: 'یادآوری معارفه', nextDate: T }, { 'وضعیت': 'معارفه برگزار شد' }, T);
    ok('فاز ۲: برگزاری ← پیگیری بعد از معارفه، سه روز بعد', p6.add['اقدام بعدی'] === 'پیگیری بعد از معارفه' && p6.add['تاریخ اقدام بعدی'] === '2026-10-04');
    ok('فاز ۲: لید باز کامل دست نمی‌خورد', Object.keys(v168NextPlan_({ status: 'در پیگیری', next: 'پیام پیگیری', nextDate: T }, { 'یادداشت': 'x' }, T).add).length === 0);
    TG_DRY_LEAD = { row: 7, code: 'L-1042', name: 'آزمایشی', status: 'در پیگیری', owner: 'پذیرش نمونه', next: 'تماس پیگیری', nextDate: '2026-10-02', touched: true, closed: false, booked: false };
    TG_OUTBOX = [];
    tgLeadSet_(7, { 'تاریخ اقدام بعدی': '', 'اقدام بعدی': '' }, 'پذیرش نمونه', 'تلگرام', 'اقدام بعدی');
    var ls = TG_OUTBOX.filter(function (o) { return o.kind === 'leadset'; })[0] || {};
    ok('فاز ۲: نگهبان tgLeadSet_ اجازهٔ خالی کردن نمی‌دهد (روی کد قبلی مردود)', !!TG_DRY_LEAD.next && !!TG_DRY_LEAD.nextDate && /خودکار/.test((ls.auto || {})['اقدام بعدی'] || ''));
    ok('فاز ۲: دکمهٔ «بدون موعد» نیست و «⏰ بعداً» روی کارت هست', JSON.stringify(tgLeadKb_(TG_DRY_LEAD)).indexOf('ld:lt:L-1042') > -1 && String(tgOnLead_).indexOf('بدون موعد') < 0 && String(tgLeadText_).indexOf('بدون موعد') < 0);
    ok('فاز ۲: ستون‌های تازه انتهای فهرست مجاز', TG_LEAD_FIELDS.indexOf('مهلت') === TG_LEAD_FIELDS.indexOf('شماره / شناسه') + 1 && TG_LEAD_FIELDS.indexOf('شمار جابه‌جایی') === TG_LEAD_FIELDS.indexOf('مهلت') + 1);
    var nl = v168NewLeadNext_({ status: 'جدید', extra: {} });
    ok('فاز ۲: لید تازهٔ بات همان لحظه تکلیف دارد', nl.extra['اقدام بعدی'] === 'تماس اول' && /^\d{4}-\d{2}-\d{2}$/.test(nl.extra['تاریخ اقدام بعدی']));
    /* بعداً سه بار پشت سر هم */
    TG_MEM['desk'] = [{ chat: '7001', role: 'مسئول پذیرش' }];
    var cq = { message: { chat: { id: 7002 }, message_id: 1 }, from: { first_name: 'پذیرش' } };
    TG_OUTBOX = [];
    v168Later_(cq, 7002, 'پذیرش نمونه', 7, 'L-1042', 'lt', '', TG_DRY_LEAD);
    v168Later_(cq, 7002, 'پذیرش نمونه', 7, 'L-1042', 'lt2', '3', TG_DRY_LEAD);
    ok('فاز ۲: «بعداً» دلیل می‌پرسد', TG_OUTBOX.some(function (o) { return /چرا عقب/.test(o.text) && JSON.stringify(o.markup).indexOf('ld:lt3:L-1042:3:0') > -1; }));
    v168Later_(cq, 7002, 'پذیرش نمونه', 7, 'L-1042', 'lt3', '3:1', TG_DRY_LEAD);
    v168Later_(cq, 7002, 'پذیرش نمونه', 7, 'L-1042', 'lt3', '1:0', TG_DRY_LEAD);
    ok('فاز ۲: دو بار بعداً هنوز خبری به مسئول نیست', !TG_OUTBOX.some(function (o) { return o.chat === '7001'; }));
    v168Later_(cq, 7002, 'پذیرش نمونه', 7, 'L-1042', 'lt3', '7:2', TG_DRY_LEAD);
    ok('فاز ۲: بار سوم ← خبر به مسئول پذیرش', TG_OUTBOX.some(function (o) { return o.chat === '7001' && /۳ بار پشت سر هم/.test(o.text); }));
    tgLeadSet_(7, { 'آخرین تماس': T }, 'پذیرش نمونه', 'تلگرام', 'نتیجهٔ تماس');
    ok('فاز ۲: کار واقعی شمار بعداً را صفر می‌کند', !v168PpGet_()['L-1042']);
    /* پذیرش: هیچ لید بازی بی تکلیف نمی‌ماند */
    var hm = { 'وضعیت': 0, 'اقدام بعدی': 1, 'تاریخ اقدام بعدی': 2, 'آخرین تماس': 3, 'تاریخ معارفه': 4 };
    var rows = [['جدید', '', '', '', ''], ['در پیگیری', 'تماس پیگیری', '', '2026-09-20', ''], ['بسته', '', '', '', ''], ['معارفه رزرو شد', '', '', '2026-09-28', '2026-10-08'], ['', '', '', '', ''], ['شروع درمان', '', '', '', '']];
    var miss = v168Missing_(rows, hm, 2);
    ok('فاز ۲: جارو فقط لیدهای باز بی تکلیف را می‌گیرد', miss.join(',') === '2,3,5');
    var fixed = rows.map(function (r) {
      var c = v168CurFromRow_(r, hm), pl = v168NextPlan_(c, {}, T), a = r.slice();
      if (pl.add['اقدام بعدی'] !== undefined) a[1] = pl.add['اقدام بعدی'];
      if (pl.add['تاریخ اقدام بعدی'] !== undefined) a[2] = pl.add['تاریخ اقدام بعدی'];
      return a;
    });
    ok('پذیرش فاز ۲: بعد از جارو صفر لید باز بی اقدام یا بی تاریخ', v168Missing_(fixed, hm, 2).length === 0);
    ok('فاز ۲: اجرای یک‌بارهٔ پر کردن در فهرست خودکار', CI_ONCE_AUTO.indexOf('tgV168NextFill') > -1 && CI_ONCE_ALLOW.indexOf('tgV168NextFill') > -1);
    /* ---- فاز ۳: یک منبع ---- */
    var hm3 = { 'تاریخ اقدام بعدی': 22, 'اقدام بعدی': 23, 'کد لید': 24 };
    function L(code, st, touched, nd, owner) {
      var r = []; for (var z = 0; z < 25; z++) r.push('');
      r[0] = '2026-09-25'; r[1] = '10:00'; r[2] = 'Telegram bot'; r[3] = 'نمونه ' + code; r[5] = '0912000000' + code.slice(-1);
      r[8] = st; r[9] = owner || 'پذیرش نمونه'; r[10] = touched ? '2026-09-28' : ''; r[22] = nd; r[23] = nd ? 'تماس پیگیری' : ''; r[24] = code;
      return r;
    }
    var today3 = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
    var past = v168Day_(today3, -2), fut = v168Day_(today3, 3);
    TG_MEM['openrows'] = { hm: hm3, v: [L('L-1', 'جدید', false, today3), L('L-2', 'در پیگیری', true, past), L('L-3', 'در پیگیری', true, fut),
      L('L-4', 'جدید', false, fut), L('L-5', 'بسته', true, ''), L('L-6', 'شروع درمان', true, ''), L('L-7', 'ارجاع شد', true, today3, 'پذیرش دوم')] };
    var open3 = tgOpenLeads_(), b3 = tgLeadBuckets_(open3), q3 = v168QueueRows_(open3);
    ok('فاز ۳: لید باز از tgOpenLeads_ (بسته و شروع درمان بیرون)', open3.length === 5);
    ok('فاز ۳: کار امروز = موعد امروز یا گذشته؛ پیش‌انداخته نه (روی کد قبلی مردود)', b3.today.map(function (l) { return l.code; }).join(',') === 'L-2,L-1,L-7');
    ok('فاز ۳: کارتابل و دایجست و کارهای روی زمین یک عدد', q3.open === open3.length && q3.today === b3.today.length && tgLeadCounts_(b3).indexOf('لید باز: ' + tgFa_(open3.length)) > -1 && q3.rows.length === b3.first.length + b3.stale.length);
    ok('فاز ۳: ستون «چرا امروز»', q3.rows[0][6].indexOf('عقب‌افتاده') === 0 && q3.rows[1][6] === 'تماس اول امروز');
    ok('فاز ۳: فیلتر مسئول', tgTodayList_('پذیرش دوم', today3, open3).length === 1);
    ok('فاز ۳: تب CRM دیگر ساخته نمی‌شود و از هاب پذیرش بیرون است', String(tgCrmBuild).indexOf('tgCrmBoard_(') < 0 && TG_HUB_KEEP.indexOf(TG_CRM_TAB) < 0);
    ok('فاز ۳: گزارش هاب آمار «باز» را از همان منبع می‌شمارد', TG_RPT_HEAD[TG_RPT_HEAD.length - 1] === 'باز' && String(tgRptSetup).indexOf('where S = 1') > -1);
    ok('فاز ۳: اجرای یک‌باره در فهرست خودکار', CI_ONCE_AUTO.indexOf('tgV168QueueSetup') > -1);
    delete TG_MEM['openrows'];

    /* ---- فاز ۴: چرخهٔ معارفه ---- */
    var slotLog = {}, keepSet = tgSlotSet_;
    tgSlotSet_ = function (row, head, val) { (slotLog[row] = slotLog[row] || {})[head] = val; };
    try {
      var endMs = Date.parse('2026-10-01T10:00:00+03:30'), H = 3600000;
      var r0 = { state: 'رزرو شده', held: '', next: '', ask: '' };
      ok('فاز ۴: پیش از ۳۰ دقیقه بعد از پایان نمی‌پرسد', v168MeetPlan_(r0, endMs, endMs + 20 * 60000, true) === null);
      var a1 = v168MeetPlan_(r0, endMs, endMs + 31 * 60000, true);
      ok('فاز ۴: ۳۰ دقیقه بعد ← درمانگر، مهلت ۴ ساعت', a1.to === 'ther' && a1.next === endMs + 31 * 60000 + 4 * H);
      var fmt = function (ms) { return Utilities.formatDate(new Date(ms), TG_TZ, 'yyyy-MM-dd HH:mm'); };
      var a2 = v168MeetPlan_({ state: 'رزرو شده', held: '', ask: 'درمانگر', next: fmt(a1.next) }, endMs, a1.next + 60000, true);
      ok('فاز ۴: درمانگر جواب نداد ← پذیرش', a2.to === 'desk' && a2.ask === 'پذیرش');
      var a3 = v168MeetPlan_({ state: 'رزرو شده', held: '', ask: 'پذیرش', next: fmt(a2.next) }, endMs, a2.next + 60000, true);
      ok('فاز ۴: پذیرش جواب نداد ← مسئول پذیرش و اقدام لید برای فردا', a3.to === 'boss' && a3.lead === true);
      ok('پذیرش فاز ۴: تا ۲۴ ساعت بعد از اسلات کسی مسئول نتیجه است', a3.next - endMs <= 48 * H && (a2.next - endMs) <= 24 * H);
      ok('فاز ۴: درمانگر وصل‌نشده ← مستقیم پذیرش', v168MeetPlan_(r0, endMs, endMs + 31 * 60000, false).to === 'desk');
      ok('فاز ۴: جواب داده‌شده دیگر پرسیده نمی‌شود', v168MeetPlan_({ state: 'رزرو شده', held: 'بله' }, endMs, endMs + 99 * H, true) === null);

      TG_DRY_LEAD = { row: 7, code: 'L-1042', name: 'آزمایشی', status: 'معارفه رزرو شد', owner: 'پذیرش نمونه', next: 'یادآوری معارفه', nextDate: '2026-10-01', touched: true, closed: false, booked: true, meetTher: 'درمانگر الف' };
      TG_MEM['desk'] = [{ chat: '7001', role: 'مسئول پذیرش', name: 'پذیرش نمونه' }];
      TG_MEM['mtrow'] = { row: 40, ther: 'درمانگر الف', iso: '2026-10-01', hhmm: '10:00', state: 'رزرو شده', lead: 'نمونه · L-1042 · tg:5555', held: '', next: '', start: '', ask: '', mstate: 'رزرو شد' };
      var cqd = { message: { chat: { id: 7001 }, message_id: 1 }, from: { first_name: 'پذیرش' } };
      TG_OUTBOX = []; tgOnMeet_(cqd, 'n:40');
      ok('فاز ۴: «مراجع نیامد» حالت پایانی و پرسش دلیل', slotLog[40][V168_H_STATE] === 'مراجع نیامد' && TG_OUTBOX.some(function (o) { return JSON.stringify(o.markup || '').indexOf('mt:nr:40:0') > -1; }));
      var card = TG_OUTBOX.filter(function (o) { return /حاضر نشد/.test(o.text || ''); })[0];
      ok('فاز ۴: کارت سه‌دکمه‌ای برای پذیرش (روی کد قبلی مردود)', !!card && ['ld:rs:L-1042', 'ld:sw:L-1042', 'ld:close:L-1042'].every(function (x) { return JSON.stringify(card.markup).indexOf(x) > -1; }));
      tgOnMeet_(cqd, 'nr:40:1');
      ok('فاز ۴: دلیل عدم حضور از فهرست بسته', slotLog[40][V168_H_WHY] === 'پشیمان شد');
      slotLog = {}; TG_OUTBOX = []; tgOnMeet_(cqd, 'c:40');
      ok('فاز ۴: لغو ← حالت و پرسش «توسط کی»', slotLog[40][V168_H_STATE] === 'لغو شد' && TG_OUTBOX.some(function (o) { return JSON.stringify(o.markup || '').indexOf('mt:cb:40:m') > -1; }));
      tgOnMeet_(cqd, 'cb:40:t'); tgOnMeet_(cqd, 'cr:40:t:2');
      ok('فاز ۴: لغو با «توسط کی» و دلیل', slotLog[40][V168_H_BY] === 'درمانگر' && slotLog[40][V168_H_WHY] === 'مرخصی درمانگر');
      slotLog = {}; TG_OUTBOX = []; tgOnMeet_(cqd, 't:40');
      ok('فاز ۴: «درمانگر نیامد» حالت و دلیل', slotLog[40][V168_H_STATE] === 'درمانگر نیامد' && TG_OUTBOX.some(function (o) { return JSON.stringify(o.markup || '').indexOf('mt:tr:40:') > -1; }));
      TG_OUTBOX = []; tgOnMeet_(cqd, 's0:40');
      ok('فاز ۴: «ادامه نداد» دلیل می‌پرسد', TG_OUTBOX.some(function (o) { return JSON.stringify(o.markup || '').indexOf('mt:sr:40:0') > -1; }));

      /* جابه‌جایی */
      var fut4 = v168Day_(Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd'), 5);
      TG_MEM['ldbooked'] = [{ row: 40, therapist: 'درمانگر الف', dateIso: fut4, hhmm: '10:00' }];
      TG_MEM['ldslots'] = [{ therapist: 'درمانگر الف', dateIso: fut4, hhmm: '12:00', scope: 'داخل ایران' }];
      TG_MEM['mtrow'] = { row: 40, ther: 'درمانگر الف', iso: fut4, hhmm: '10:00', state: 'رزرو شده', lead: 'نمونه · L-1042', held: '', next: '', start: '', ask: '', mstate: 'رزرو شد' };
      TG_DRY_LEAD.moves = 0; slotLog = {}; TG_OUTBOX = [];
      v168Move_(cqd, 7001, 'پذیرش نمونه', 7, 'L-1042', 'rs', '', TG_DRY_LEAD);
      ok('فاز ۴: ld:rs وقت‌های همان درمانگر را نشان می‌دهد', !!tgGetVal_('ldfrom', 7001) && TG_OUTBOX.some(function (o) { return /وقت‌های آزاد/.test(o.text || ''); }));
      var mvd = v168AfterBook_(7001, 'پذیرش نمونه', 7, 'L-1042', 55, { therapist: 'درمانگر الف', dateIso: fut4, hhmm: '12:00' });
      var sets4 = TG_OUTBOX.filter(function (o) { return o.kind === 'leadset'; });
      ok('فاز ۴: معارفهٔ تازه به قبلی پیوند دارد و قبلی «جابه‌جا شد»', mvd === true && slotLog[55][V168_H_FROM] === 'درمانگر الف · ' + fut4 + ' 10:00' && slotLog[40][V168_H_STATE] === 'جابه‌جا شد');
      ok('فاز ۴: «شمار جابه‌جایی» لید یکی بالا می‌رود', sets4.some(function (o) { return o.changes['شمار جابه‌جایی'] === 1; }));
      v168Move_(cqd, 7001, 'پذیرش نمونه', 7, 'L-1042', 'mr', '0', TG_DRY_LEAD);
      ok('فاز ۴: دلیل جابه‌جایی روی معارفهٔ قبلی', slotLog[40][V168_H_WHY] === 'تداخل زمانی مراجع');
      TG_MEM['deskwho'] = { chat: '7001', name: 'پذیرش نمونه', role: 'مسئول پذیرش' };
      TG_OUTBOX = []; v168Move_(cqd, 7001, 'پذیرش نمونه', 7, 'L-1042', 'sw', '', TG_DRY_LEAD);
      ok('فاز ۴: ld:sw فهرست درمانگرها را می‌آورد', JSON.parse(tgGetVal_('ldfrom', 7001)).k === 'sw' && TG_OUTBOX.some(function (o) { return /با کدام درمانگر|هیچ وقت آزادی/.test(o.text || ''); }));
    } finally { tgSlotSet_ = keepSet; }

    /* T و V */
    ok('فاز ۴: V بی T ← T بله', v168TvPlan_({ t: '', v: '' }, { 'درمانگر معارفه': 'درمانگر الف' })['معارفه هماهنگ شد؟'] === 'بله');
    ok('فاز ۴: T بله بی V نوشته نمی‌شود', v168TvPlan_({ t: '', v: '' }, { 'معارفه هماهنگ شد؟': 'بله' }).drop === 'معارفه هماهنگ شد؟');
    ok('فاز ۴: T خیر ← V خالی', v168TvPlan_({ t: 'بله', v: 'درمانگر الف' }, { 'معارفه هماهنگ شد؟': 'خیر' })['درمانگر معارفه'] === '');
    TG_DRY_LEAD = { row: 7, code: 'L-1042', status: 'ارجاع شد', next: 'x', nextDate: '2026-10-09', touched: true, booked: false, meetTher: '' };
    TG_OUTBOX = []; tgLeadSet_(7, { 'درمانگر معارفه': 'درمانگر ب' }, 'پذیرش نمونه', 'تلگرام', 'آزمون');
    ok('فاز ۴: نگهبان tgLeadSet_ T و V را با هم می‌نویسد', TG_OUTBOX.filter(function (o) { return o.kind === 'leadset'; })[0].changes['معارفه هماهنگ شد؟'] === 'بله');
    /* ---- فاز ۵: پیشنهاد خودکار ---- */
    var ctx5 = { pool: {}, free: {}, ther: [] };
    [['درمانگر رده یک', 1, 9], ['درمانگر رده دو', 2, 7], ['درمانگر رده سه', 3, 12], ['درمانگر کم‌داده الف', 0, 1], ['درمانگر کم‌داده ب', 0, 0], ['درمانگر بی‌وقت', 1, 20], ['درمانگر غیرفعال', 1, 5]].forEach(function (x) {
      ctx5.ther.push({ name: x[0], tier: x[1], sug: x[2], active: x[0] !== 'درمانگر غیرفعال' });
      ctx5.pool[tgNorm_(x[0])] = { ind: 1, rel: x[0] === 'درمانگر رده سه' ? 1 : 0, abroad: x[0] !== 'درمانگر رده دو', inperson: x[0] === 'درمانگر رده یک' };
      if (x[0] !== 'درمانگر بی‌وقت') ctx5.free[tgNorm_(x[0])] = true;
    });
    var l5 = { kind: 'تراپی فردی', topic: 'اضطراب و استرس', region: 'ایران', mode: 'آنلاین' };
    var pk = v168Pick_(v168Candidates_(l5, ctx5), 3, 1).map(function (c) { return c.name; });
    ok('فاز ۵: رده ۱ و ۲ اول، یکی به «داده کم» (کم‌پیشنهادتر)', pk.join('،') === 'درمانگر رده یک،درمانگر رده دو،درمانگر کم‌داده ب');
    ok('فاز ۵: بی‌وقت و غیرفعال پیشنهاد نمی‌شوند', pk.indexOf('درمانگر بی‌وقت') < 0 && pk.indexOf('درمانگر غیرفعال') < 0);
    ok('فاز ۵: خارج از ایران فقط کسانی که می‌پذیرند', v168Candidates_({ kind: 'تراپی فردی', topic: 'افسردگی', region: 'خارج از ایران', mode: 'آنلاین' }, ctx5).every(function (c) { return c.name !== 'درمانگر رده دو'; }));
    ok('فاز ۵: حضوری فقط درمانگر حضوری', v168Candidates_({ kind: 'تراپی فردی', topic: 'افسردگی', region: 'ایران', mode: 'حضوری · karaj2' }, ctx5).map(function (c) { return c.name; }).join() === 'درمانگر رده یک');
    ok('فاز ۵: زوج‌درمانی از استخر رابطه', v168Candidates_({ kind: 'زوج‌درمانی', topic: 'رابطه و زوج', region: 'ایران', mode: 'آنلاین' }, ctx5).map(function (c) { return c.name; }).join() === 'درمانگر رده سه');
    ok('فاز ۵: آستانهٔ «داده کم» ۳ و ردهٔ دستی برنده', v168TierOf_('ردهٔ ۲', 2, '', 3) === 0 && v168TierOf_('ردهٔ ۲', 3, '', 3) === 2 && v168TierOf_('ردهٔ ۴', 9, '۱', 3) === 1);
    TG_MEM['v168ctx'] = ctx5;
    TG_DRY_LEAD = { row: 7, code: 'L-1042', status: 'جدید', next: 'تماس اول', nextDate: '2026-10-01', touched: false, booked: false, ref1: '', ref2: '', ref3: '' };
    TG_OUTBOX = [];
    var got5 = v168SuggestLead_(7, l5, ctx5);
    var set5 = TG_OUTBOX.filter(function (o) { return o.kind === 'leadset'; })[0] || { changes: {} };
    ok('فاز ۵: سه پیشنهاد در P/Q/R با رویداد «پیشنهاد خودکار» (روی کد قبلی مردود)', got5.length === 3 && set5.changes['درمانگر پیشنهادی ۳'] === 'درمانگر کم‌داده ب' && TG_OUTBOX.some(function (o) { return o.kind === 'leadev' && o.o.what === 'پیشنهاد خودکار' && /اکتشاف/.test(o.o.note); }));
    ok('فاز ۵: لید ناقص پیشنهاد نمی‌گیرد', v168SuggestLead_(7, { kind: 'تراپی فردی', topic: '', region: 'ایران', mode: 'آنلاین' }, ctx5).length === 0);
    ok('پذیرش فاز ۵: هر لید کامل با استخر و وقت آزاد پیشنهاد می‌گیرد', [l5, { kind: 'تراپی فردی', topic: 'افسردگی', region: 'خارج از ایران', mode: 'آنلاین' }].every(function (x) { return v168Pick_(v168Candidates_(x, ctx5), 3, 1).length > 0; }));
    /* تغییر پیشنهاد */
    TG_DRY_LEAD.ref1 = 'درمانگر رده یک'; TG_DRY_LEAD.ref2 = 'درمانگر رده دو'; TG_DRY_LEAD.ref3 = 'درمانگر کم‌داده ب';
    TG_DRY_LEAD.kind = l5.kind; TG_DRY_LEAD.topic = l5.topic; TG_DRY_LEAD.region = l5.region; TG_DRY_LEAD.mode = l5.mode;
    ok('فاز ۵: «✏️ تغییر پیشنهاد» روی کارت لیدِ پیشنهاددار', JSON.stringify(tgLeadKb_(TG_DRY_LEAD)).indexOf('ld:sg:L-1042') > -1);
    TG_OUTBOX = []; v168Suggest_(cqd, 7001, 'پذیرش نمونه', 7, 'L-1042', 'sg', '', TG_DRY_LEAD);
    v168Suggest_(cqd, 7001, 'پذیرش نمونه', 7, 'L-1042', 'sg2', '0', TG_DRY_LEAD);
    ok('فاز ۵: دلیل، بعد درمانگرهای دیگر', TG_OUTBOX.some(function (o) { return /چرا پیشنهاد/.test(o.text || ''); }) && TG_OUTBOX.some(function (o) { return JSON.stringify(o.markup || '').indexOf('ld:sg3:L-1042:0:0') > -1 && JSON.stringify(o.markup).indexOf('درمانگر رده یک') < 0; }));
    TG_OUTBOX = []; v168Suggest_(cqd, 7001, 'پذیرش نمونه', 7, 'L-1042', 'sg4', '0:0:1', TG_DRY_LEAD);
    ok('فاز ۵: تغییر با دلیل در رویداد', TG_OUTBOX.some(function (o) { return o.kind === 'leadev' && o.o.what === 'تغییر پیشنهاد' && o.o.note === 'مراجع درمانگر خاصی خواست' && o.o.from === 'درمانگر رده دو'; }));
    /* بستن بی پیشنهاد */
    TG_OUTBOX = [];
    ok('فاز ۵: لید بی پیشنهاد زیرفهرست بستن می‌گیرد', v168CloseMenu_(7001, 'L-1042', { ref1: '' }) === true && JSON.stringify(TG_OUTBOX[0].markup).indexOf('خدمتی که نداریم') > -1 && v168CloseMenu_(7001, 'L-1042', { ref1: 'درمانگر الف' }) === false);
    TG_OUTBOX = []; v168CloseNoSug_(cqd, 7001, 'پذیرش نمونه', 7, 'L-1042', '2');
    ok('فاز ۵: «خدمتی که نداریم» می‌پرسد کدام', tgGetVal_('ldsv', 7001) === 'L-1042');
    TG_OUTBOX = []; v168ServiceText_(7001, 'L-1042', 'درمان اعتیاد', 'پذیرش نمونه');
    ok('فاز ۵: دلیل بستن با نام خدمت', TG_OUTBOX.some(function (o) { return o.kind === 'leadset' && o.changes['دلیل بستن'] === 'خدمتی که نداریم: درمان اعتیاد'; }));
    /* سنجه‌ها */
    var t0 = Date.parse('2026-09-01T10:00:00Z');
    var st5 = v168TherStats_([
      [new Date(t0), 'L-1', 2, 'بات', 'بات', 'درمانگر پیشنهادی ۱', '', 'درمانگر الف', 'پیشنهاد خودکار'],
      [new Date(t0), 'L-2', 3, 'بات', 'بات', 'درمانگر پیشنهادی ۲', '', 'درمانگر الف', ''],
      [new Date(t0), 'L-1', 2, 'پذیرش', 'تلگرام', 'تاریخ ارجاع', '', '2026-09-01', 'ارجاع به درمانگر الف'],
      [new Date(t0 + 5 * 3600000), 'L-1', 2, 'درمانگر الف', 'تلگرام', 'پاسخ ارجاع', '', 'می‌توانم', ''],
      [new Date(t0), 'L-1', 2, 'پذیرش', 'تلگرام', 'درمانگر معارفه', '', 'درمانگر الف', '']
    ], [{ ther: 'درمانگر الف', mstate: 'برگزار شد' }, { ther: 'درمانگر الف', mstate: 'درمانگر نیامد' }, { ther: 'درمانگر الف', mstate: 'رزرو شد' }]);
    var sa = st5[tgNorm_('درمانگر الف')];
    ok('فاز ۵: I و J از رویدادها، زمان پاسخ ارجاع و نرخ نیامدن', sa.sug === 2 && sa.intro === 1 && sa.respMed === 5 && sa.noshowRate === 0.5);
    ok('فاز ۵: اجرای یک‌باره در فهرست خودکار', CI_ONCE_AUTO.indexOf('tgV168RefSetup') > -1);
    /* ---- فاز ۶: حضوری ---- */
    var pl6 = [{ id: 'gandhi', city: 'تهران', area: 'ونک، خیابان گاندی', status: 'فعال' }, { id: 'karaj2', city: 'کرج', area: 'فضای میانه', status: 'فعال' }];
    var m1 = v168ModeParse_('حضوری تهران · تهران · ونک، خیابان گاندی · درمانگر الف · جمعه · ۹ تا ۲۰', pl6);
    ok('فاز ۶: متن چسبیدهٔ حضوری به شناسهٔ مکان (روی کد قبلی مردود)', m1['حالت'] === 'حضوری' && m1['شناسهٔ مکان'] === 'gandhi');
    ok('فاز ۶: آنلاین و شهر دیگر و فرقی ندارد', v168ModeParse_('آنلاین', pl6)['حالت'] === 'آنلاین' && v168ModeParse_('حضوری شهر دیگر · شهر دیگر', pl6)['حالت'] === 'حضوری' && !v168ModeParse_('حضوری شهر دیگر · شهر دیگر', pl6)['شناسهٔ مکان'] && v168ModeParse_('فرقی ندارد', pl6)['حالت'] === 'فرقی ندارد');
    ok('فاز ۶: شهر بی مکان به «شهر درخواستی»', v168ModeParse_('حضوری شهر دیگر · مشهد', pl6)['شهر درخواستی'] === 'مشهد');
    TG_MEM['inp'] = { places: pl6, rooms: [], hours: [
      { p: 'gandhi', who: 'درمانگر الف', day: 'شنبه', from: '10', to: '14', room: '1', open: 'بله', chk: 'تأیید شد' },
      { p: 'gandhi', who: 'درمانگر ب', day: 'یکشنبه', from: '10', to: '14', room: '2', open: 'بله', chk: 'در انتظار تأیید' },
      { p: 'karaj2', who: 'درمانگر ج', day: 'شنبه', from: '10', to: '14', room: '1', open: 'بله', chk: 'در انتظار تأیید' }] };
    ok('فاز ۶: فقط ساعت تأییدشده به مراجع نشان داده می‌شود', tgInpHours_('gandhi').map(function (h) { return h.who; }).join() === 'درمانگر الف' && tgInpHours_('karaj2').length === 0);
    TG_MEM['tab:' + TG_INP_DEM] = []; TG_OUTBOX = [];
    var fin6 = '', keepFin = tgQuizFinish_; tgQuizFinish_ = function (c, k) { fin6 = k; };
    try {
      tgInpPick_(9201, 'karaj2');
      ok('فاز ۶: کرج بی ساعت تأییدشده بن‌بست نیست: تقاضا، خبر پذیرش، ادامهٔ مسیر', fin6 === 'city' && TG_MEM['tab:' + TG_INP_DEM].some(function (r) { return r[2] === 'karaj2'; }) && TG_OUTBOX.some(function (o) { return o.chat === '7001' && /ساعت تأییدشده‌ای نیست/.test(o.text); }) && tgGetVal_('qpid', 9201) === 'karaj2');
      fin6 = ''; TG_OUTBOX = [];
      var keepCt = v168CfgText_;
      v168CfgText_ = function (k) { return k === 'city_prompt' ? '' : keepCt(k); };
      tgInpPick_(9203, '-');
      ok('فاز ۶: تا متن تیم نیامده «شهر دیگر» مسیر قبلی را می‌رود', tgGetVal_('qcity', 9203) !== '?' && fin6 === 'city');
      fin6 = ''; TG_OUTBOX = [];
      v168CfgText_ = function (k) { return k === 'city_prompt' ? '[متن آزمایشی]' : keepCt(k); };
      try { tgInpPick_(9202, '-'); } finally { v168CfgText_ = keepCt; }
      ok('فاز ۶: «شهر دیگر» نام شهر را می‌پرسد', tgGetVal_('qcity', 9202) === '?' && fin6 === '' && TG_OUTBOX.some(function (o) { return o.text === '[متن آزمایشی]'; }));
      v168CityText_(9202, 'رشت');
      ok('فاز ۶: تقاضای شهر بی‌مکان با نام شهر ثبت می‌شود', fin6 === 'city' && TG_MEM['tab:' + TG_INP_DEM].some(function (r) { return r[6] === 'شهر: رشت'; }));
      tgSetVal_('qm', 9202, 'city');
      var ex6 = v168ModeExtras_(9202, {});
      ok('فاز ۶: لید سه فیلد را از جواب‌ها می‌گیرد', ex6['حالت'] === 'حضوری' && ex6['شهر درخواستی'] === 'رشت');
    } finally { tgQuizFinish_ = keepFin; }
    var ig6 = { source: 'Telegram bot', note: 'chat_id: 9101', extra: {} };
    TG_MEM['igu:9101'] = 'ig_tl_karaj|' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd'); delete TG_MEM['igc9101'];
    igLeadPrefill_(ig6);
    ok('فاز ۶: کلمهٔ «کرج» اینستاگرام شناسهٔ مکان را پیش‌پر می‌کند', ig6.extra['حالت'] === 'حضوری' && ig6.extra['شناسهٔ مکان'] === 'karaj2');
    var H = 3600000, now6 = Date.parse('2026-10-05T10:00:00Z');
    var sp = v168SlaPlan_([{ key: 'a', since: now6 - 25 * H, label: 'الف' }, { key: 'b', since: now6 - 49 * H, label: 'ب' }, { key: 'c', since: now6 - 2 * H, label: 'ج' }], {}, now6);
    ok('فاز ۶: صف حضوری ۲۴ ساعت یادآوری، ۴۸ ساعت ناظر', sp.remind.map(function (x) { return x.key; }).join() === 'a' && sp.escalate.map(function (x) { return x.key; }).join() === 'b');
    var sp2 = v168SlaPlan_([{ key: 'a', label: 'الف' }], sp.state, now6 + 24 * H);
    ok('پذیرش فاز ۶: هیچ صف حضوری بیش از ۴۸ ساعت بی‌پاسخ نمی‌ماند (بی اسپم)', sp2.escalate.length === 1 && v168SlaPlan_([{ key: 'a', label: 'الف' }], sp2.state, now6 + 30 * H).escalate.length === 0);
    ok('فاز ۶: سه ستون تازه انتهای فهرست مجاز', V168_MODE_FIELDS.every(function (f) { return TG_LEAD_FIELDS.indexOf(f) > -1; }) && CI_ONCE_AUTO.indexOf('tgV168ModeSplit') > -1);
    /* ---- فاز ۷: واژگان بسته ---- */
    ok('فاز ۷: نوع درخواست ناهمگون یکدست می‌شود (روی کد قبلی مردود)', v168NormKind_('فردی') === 'تراپی فردی' && v168NormKind_('زوج') === 'زوج‌درمانی' && v168NormKind_('روانپزشکی') === 'روان‌پزشکی' && v168NormKind_('گروه درمانی') === 'گروه‌درمانی');
    ok('فاز ۷: موضوع ناهمگون یکدست می‌شود', v168NormTopic_('اضطراب') === 'اضطراب و استرس' && v168NormTopic_('رابطه/زوج') === 'رابطه و زوج' && v168NormTopic_('خودشناسی') === 'خودشناسی و مسیر زندگی' && v168NormTopic_('خانواده') === 'خانواده و والدگری');
    ok('فاز ۷: همهٔ خروجی‌های دکمه‌های سؤال موضوع در فهرست بسته‌اند', TG_TOPICS.every(function (t) { return v168Kinds_().indexOf(v168NormKind_(t.kind)) > -1 && v168Topics_().indexOf(v168NormTopic_(t.topic)) > -1; }));
    ok('فاز ۷: مقدار ناشناخته حدس زده نمی‌شود', v168NormTopic_('چیزی بی‌ربط') === '' && v168NormKind_('xyz') === '');
    var nl7 = v168NewLeadVocab_({ source: 'Telegram bot', kind: '', topic: '', note: 'chat_id: 1' });
    ok('فاز ۷: فرم پذیرش بات همیشه هر دو را پر می‌کند', nl7.kind === 'نامشخص' && nl7.topic === 'سایر');
    TG_DRY_LEAD = { row: 7, code: 'L-1042', status: 'در پیگیری', next: 'x', nextDate: '2026-10-09', touched: true };
    TG_OUTBOX = []; tgLeadSet_(7, { 'نوع درخواست': 'فردی', 'موضوع اصلی': 'اضطراب' }, 'پذیرش نمونه', 'تلگرام', 'آزمون');
    var s7 = TG_OUTBOX.filter(function (o) { return o.kind === 'leadset'; })[0].changes;
    ok('فاز ۷: tgLeadSet_ فقط از فهرست بسته می‌نویسد', s7['نوع درخواست'] === 'تراپی فردی' && s7['موضوع اصلی'] === 'اضطراب و استرس');
    var hm7 = { 'نوع درخواست': 13, 'موضوع اصلی': 14 }, R = function (k, t) { var r = []; for (var z = 0; z < 16; z++) r.push(''); r[3] = 'نمونه'; r[13] = k; r[14] = t; return r; };
    var rows7 = [R('فردی', 'اضطراب'), R('زوج‌درمانی', 'رابطه و زوج'), R('', ''), R('تراپی فردی', 'خودشناسی')];
    var st7 = v168VocabStats_(rows7.map(function (r) { var a = r.slice(); var k = v168NormKind_(a[13]), t = v168NormTopic_(a[14]); if (k) a[13] = k; if (t) a[14] = t; return a; }), hm7);
    ok('پذیرش فاز ۷: بعد از مهاجرت لیدهای پرشده همه از فهرست بسته', st7.kind === 3 && st7.topic === 3 && CI_ONCE_AUTO.indexOf('tgV168VocabMigrate') > -1);
    /* ---- فاز ۸: بستن ماه ---- */
    var R8 = { from: '2026-08-23', to: '2026-09-23', label: 'شهریور ۱۴۰۵' }, P8 = { from: '2026-07-23', to: '2026-08-23', label: 'مرداد ۱۴۰۵' };
    var LD = function (d, o) { var x = { d: d, src: 'Telegram bot', channel: 'تلگرام', region: '', status: 'جدید', touched: false, ref: false, booked: false, started: false, closed: false, reason: '', kind: 'تراپی فردی', topic: 'افسردگی', sec: 'پذیرش' }; for (var k in o) x[k] = o[k]; return x; };
    var inp8 = {
      leads: [LD('2026-09-01', { touched: true, ref: true, booked: true, started: true, closed: true, src: 'اینستاگرام · tl · karaj' }),
              LD('2026-09-02', { touched: true, closed: true, reason: 'خدمتی که نداریم: درمان اعتیاد' }),
              LD('2026-09-03', { region: 'خارج از ایران', touched: true, ref: true }),
              LD('2026-09-04', {}), LD('2026-08-01', { touched: true }), LD('2026-09-05', { sec: 'مدرسه' })],
      clicks: [{ d: '2026-09-01', code: 'ig_tl_karaj' }, { d: '2026-09-01', code: 'ig_tl_karaj' }, { d: '2026-09-02', code: 'gt-anx' }, { d: '2026-08-02', code: 'x' }],
      slots: [{ d: '2026-09-06', ther: 'درمانگر الف', mstate: 'برگزار شد', why: '', why2: '' }, { d: '2026-09-07', ther: 'درمانگر الف', mstate: 'مراجع نیامد', why: 'فراموش کرد', why2: '' }],
      slotAll: [{ d: '2026-09-06', state: 'رزرو شده' }, { d: '2026-09-07', state: 'رزرو شده' }, { d: '2026-09-08', state: 'آزاد' }, { d: '2026-09-09', state: 'آزاد' }],
      demand: [{ d: '2026-09-03', place: '-', note: 'شهر: رشت' }, { d: '2026-09-04', place: 'karaj2', note: 'ساعت تأییدشده نداریم' }],
      school: [{ d: '2026-09-02', src: 'اینستاگرام · ts · eft', done: true }],
      ther: [{ name: 'درمانگر الف', sug: 7, intro: 0, respMed: 60, noshowRate: 0.5, done: 4, tierNow: 2, tierPrev: 1 }], slowH: 48 };
    var out8 = v168MonthData_(inp8, R8, P8), txt8 = JSON.stringify(out8);
    var heads8 = out8.filter(function (r) { return /^[۱-۸]\. /.test(String(r[0])); }).length;
    ok('فاز ۸: هشت بخش (روی کد قبلی مردود)', heads8 === 8);
    var lr = out8.filter(function (r) { return r[0] === 'لید'; })[0], ar = out8.filter(function (r) { return r[0] === 'اقدام'; })[0];
    ok('فاز ۸: قیف ماه با مقایسهٔ ماه قبل (لید مدرسه بیرون)', lr[1] === 4 && ar[1] === 3 && lr[3] === 1 && lr[2] === '۱۳۳٪');
    ok('فاز ۸: خدماتی که نداشتیم با شهر', txt8.indexOf('درمان اعتیاد') > -1 && txt8.indexOf('شهر: رشت') > -1 && txt8.indexOf('مکان بی ساعت: karaj2') > -1);
    ok('فاز ۸: دلیل ریزش و معارفه', txt8.indexOf('فراموش کرد') > -1 && txt8.indexOf('خدمتی که نداریم') > -1);
    ok('فاز ۸: تصمیم دربارهٔ درمانگران', txt8.indexOf('پیشنهاد زیاد، معارفهٔ صفر') > -1 && txt8.indexOf('کند در پاسخ') > -1 && txt8.indexOf('نیامدن در معارفه') > -1 && txt8.indexOf('جابه‌جایی رده') > -1);
    ok('فاز ۸: مصرف اسلات', txt8.indexOf('"نسبت عرضه به رزرو","۲ به ۱"') > -1);
    var igr = out8.filter(function (r) { return r[0] === 'tl · karaj'; })[0], igs = out8.filter(function (r) { return r[0] === 'ts · eft'; })[0];
    ok('فاز ۸: ریز اینستاگرام به تفکیک پیج و کلمه', igr && igr[1] === 2 && igr[2] === 1 && igr[3] === 1 && igr[4] === 1 && igs && igs[5] === 1);
    ok('فاز ۸: سهم خارج از ایران', out8.some(function (r) { return r[0] === 'خارج از ایران' && r[1] === 1 && r[2] === '۲۵٪'; }));
    ok('فاز ۸: تاریخ شمسی نوشته‌شده خوانده می‌شود', v168Iso_('۹ مهر ۱۴۰۵ ۱۰:۰۰') === '2026-10-01' && v168JRange_(1405, 7).from === '2026-09-23');
    ok('فاز ۸: نام مراجع در ورودی گزارش نیست', String(v168MonthInput_).indexOf("name: String(r[3]") < 0);
    ok('فاز ۴: رزرو تازه حالت اسلات را از نو می‌گذارد', (function () { TG_OUTBOX = []; v168SlotFresh_(9); var x = TG_OUTBOX[0]; return x && x.o[V168_H_STATE] === 'رزرو شد' && x.o[TG_H_HELD] === ''; })());
    ok('فاز ۲: فهرست‌ها از تب واژگان', v168Vocab_('اقدام بعدی').indexOf('یادآوری معارفه') > -1 && v168Vocab_('دلیل عقب‌انداختن').length >= 3);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; TG_DRY_LEAD = leadK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ چرخهٔ لید v168 درست است'));
  return tgTestTally_(log, fail);
}

/* ============================================================================
   v168.9 (۱۰ مهر ۱۴۰۵، تصمیم یاسر)
   - کد start با پیشوند dsp_، ref_ و prt_ مثل mg- خودکار شناخته می‌شود و یک بار در «سئو · لینک‌های UTM» هاب آمار
     ثبت می‌شود؛ برچسب منبع از انتهای کد. نام پیشوندها از «تنظیمات انتشار» (start_prefix_labels).
   - فرم پذیرش بات پیش از شماره دو پرسش دارد: «کشور محل زندگی» و «از کجا با ما آشنا شدید؟».
     هر دو در تب «لیدها» ستون تازه در انتهای جدول می‌گیرند. گزینه‌های آشنایی از تب «واژگان»، متن پرسش‌ها از «قالب پیام‌ها».
   ============================================================================ */
var V1689_PFX = ['dsp', 'ref', 'prt'];
var V1689_PFX_DEF = 'dsp:dsp, ref:معرفی, prt:همکار';
var V1689_COL_CTRY = 'کشور محل زندگی';
var V1689_COL_HEARD = 'از کجا با ما آشنا شدید؟';
V168_VOCAB[V1689_COL_HEARD] = ['اینستاگرام', 'تلگرام', 'جست‌وجو در گوگل', 'مجلهٔ تجربه', 'معرفی دوست یا آشنا', 'معرفی درمانگر یا پزشک', 'جای دیگر'];
var V1689_TPL = {
  q_country: '🌍 کشور محل زندگی\nاگر ایران نیست، نام کشور را بنویسید.',
  q_heard: 'از کجا با ما آشنا شدید؟'
};
var V1689_IRAN = 'ایران';

/* ---------- ۳) کدهای start: dsp_ ref_ prt_ ---------- */
function v1689StartParse_(code) {
  var m = String(code || '').match(/^(dsp|ref|prt)_(.+)$/);
  return m ? { pfx: m[1], tail: m[2].replace(/[_-]+/g, ' ').trim() } : null;
}
function v1689PfxName_(pfx) {
  var raw = '';
  try { raw = typeof pbCfg_ === 'function' ? String(pbCfg_('start_prefix_labels') || '') : ''; } catch (e) {}
  var m = {};
  (raw.trim() ? raw : V1689_PFX_DEF).split(/[,،]/).forEach(function (x) { var p = x.split(':'); if (p.length > 1) m[p[0].trim()] = p.slice(1).join(':').trim(); });
  return m[pfx] || pfx;
}
function v1689StartLabel_(code) {
  var x = v1689StartParse_(code);
  return x ? v1689PfxName_(x.pfx) + ' › ' + x.tail : '';
}
/* یک بار برای هر کد: سطر «سئو · لینک‌های UTM» با همان چیدمان لینک‌ساز (کد U، تاریخ، سازنده، توضیح، رسانه، مسیر، لینک، یادداشت) */
function v1689StartUtm_(code) {
  var x = v1689StartParse_(code);
  if (!x) return '';
  var done = [];
  try { done = JSON.parse(PropertiesService.getScriptProperties().getProperty('V1689_UTM') || '[]'); } catch (e) { done = []; }
  if (TG_DRY) done = TG_MEM['v1689:utm'] || [];
  if (done.indexOf(code) > -1) return '';
  var link = 't.me/tajrobehlife_bot?start=' + code;
  var row = ['', tgJDateFull_(new Date(), TG_TZ), 'بات · کد start', v1689StartLabel_(code), 'bot', '/start', link, 'منبع: ' + x.tail];
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'utm', row: row }); TG_MEM['v1689:utm'] = done.concat([code]); return 'U-?'; }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return '';
  try {
    var sh = tgUtmSheet_(); if (!sh) return '';
    var last = sh.getLastRow(), max = 100;
    if (last > 2) {
      var vals = sh.getRange(3, 1, last - 2, 7).getValues();
      for (var i = 0; i < vals.length; i++) {
        if (String(vals[i][6] || '').indexOf(link) > -1 && String(vals[i][6]).slice(-link.length) === link) { done.push(code); PropertiesService.getScriptProperties().setProperty('V1689_UTM', JSON.stringify(done.slice(-300))); return String(vals[i][0]); }
        var mm = String(vals[i][0] || '').match(/^U-(\d+)$/);
        if (mm && Number(mm[1]) > max) max = Number(mm[1]);
      }
    }
    row[0] = 'U-' + (max + 1);
    sh.appendRow(row);
    done.push(code);
    PropertiesService.getScriptProperties().setProperty('V1689_UTM', JSON.stringify(done.slice(-300)));
    return row[0];
  } catch (e) { tgErr_('v1689StartUtm_', e); return ''; }
  finally { lock.releaseLock(); }
}

/* ---------- ۴) دو پرسش پیش از شماره ---------- */
function v1689Tpl_(k) {
  var t = '';
  try { t = typeof pbTpl_ === 'function' ? pbTpl_(k) : ''; } catch (e) {}
  return t || V1689_TPL[k];
}
/* از tgQuizFinish_: اگر پرسشی مانده بپرس و true برگردان؛ وگرنه false تا شماره خواسته شود */
function v1689Ask_(chat) {
  if (!tgGetVal_('lctry', chat) || tgGetVal_('lctry', chat) === '?') {
    tgSetVal_('lctry', chat, '?');
    tgSend_(chat, v1689Tpl_('q_country'), { inline_keyboard: [[{ text: V1689_IRAN, callback_data: 'lc:ir' }]] });
    return true;
  }
  if (!tgGetVal_('lhrd', chat) || tgGetVal_('lhrd', chat) === '?') {
    tgSetVal_('lhrd', chat, '?');
    var opts = v168Vocab_(V1689_COL_HEARD);
    tgSend_(chat, v1689Tpl_('q_heard'), { inline_keyboard: opts.map(function (o, i) { return [{ text: o, callback_data: 'lh:' + i }]; }) });
    return true;
  }
  return false;
}
function v1689Next_(chat) { if (!v1689Ask_(chat)) tgAskPhone_(chat); }
/* متن آزاد برای کشور (وقتی منتظر پاسخ است). دستور و دکمه رد می‌شود و پرسش پاک می‌شود تا مسیر دیگر گیر نکند */
function v1689CtryText_(chat, text) {
  var t = String(text || '').trim();
  /* پیام بحران، شماره، دستور، دکمه یا جملهٔ بلند نام کشور نیست: پرسش پاک و پیام به مسیر عادی (بحران پیش از همه) می‌رود */
  if (!t || t.indexOf('/') === 0 || tgIsBtnLike_(t) || tgLooksLikePhone_(t) || tgIsCrisis_(t) || t.length > 40 || t.split(/\s+/).length > 4) { tgDel_('lctry', chat); return false; }
  tgSetVal_('lctry', chat, t);
  v1689Next_(chat);
  return true;
}
function v1689Cb_(chat, data) {
  if (data === 'lc:ir') { tgSetVal_('lctry', chat, V1689_IRAN); v1689Next_(chat); return true; }
  if (data.indexOf('lh:') === 0) {
    var opts = v168Vocab_(V1689_COL_HEARD), o = opts[Number(data.slice(3))];
    if (!o || tgGetVal_('lhrd', chat) !== '?') return true;
    tgSetVal_('lhrd', chat, o);
    tgSend_(chat, '✅ ' + tgEsc_(o));
    v1689Next_(chat);
    return true;
  }
  return false;
}
/* از tgOnPhone_: دو ستون تازهٔ لید */
function v1689Extras_(chat, extra) {
  try {
    var c = tgGetVal_('lctry', chat), h = tgGetVal_('lhrd', chat);
    if (c && c !== '?') extra[V1689_COL_CTRY] = c;
    if (h && h !== '?') extra[V1689_COL_HEARD] = h;
  } catch (e) { tgErr_('v1689Extras_', e); }
  return extra;
}
/* فرم سایت: دو فیلد با نام لاتین یا فارسی */
function v1689WebFields_(flat) {
  return {
    ctry: String(pickKey_(flat, ['country', 'country_of_residence', 'کشور', 'کشور محل زندگی']) || '').trim().slice(0, 60),
    heard: String(pickKey_(flat, ['heard_from', 'how_heard', 'referral_source', 'آشنایی', 'از کجا با ما آشنا شدید']) || '').trim().slice(0, 80)
  };
}
function v1689WebWrite_(sh, row, f) {
  if (!f || (!f.ctry && !f.heard) || !row || row < 2) return;
  if (f.ctry) { var c1 = tgLeadCol_(V1689_COL_CTRY), r1 = sh.getRange(row, c1); if (!String(r1.getValue()).trim()) r1.setValue(f.ctry); }
  if (f.heard) { var c2 = tgLeadCol_(V1689_COL_HEARD), r2 = sh.getRange(row, c2); if (!String(r2.getValue()).trim()) r2.setValue(f.heard); }
}
/* یک‌بارهٔ خودکار بعد از انتشار سبز: دو ستون در انتهای «لیدها» و ستون گزینه‌های آشنایی در «واژگان». خروجی فقط شمارش */
function tgV1689Setup() {
  var out = [];
  var c1 = tgLeadCol_(V1689_COL_CTRY), c2 = tgLeadCol_(V1689_COL_HEARD);
  out.push('ستون‌های لید: ' + c1 + ' و ' + c2);
  try { CacheService.getScriptCache().remove('scols'); } catch (e0) {}
  out.push('گزینه‌های آشنایی: ' + v168Vocab_(V1689_COL_HEARD).length);
  return out.join(' · ');
}

function tgV1689Tests() {
  var log = [], fail = 0;
  function ok(name, cond) { if (cond) log.push('✓ ' + name); else { fail++; log.push('✗ ' + name); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  try {
    /* ۳) کدهای start */
    ok('کد ref_ خودکار برچسب می‌گیرد (روی کد قبلی مردود)', tgStartLabel_('ref_dr_test') === 'معرفی › dr test');
    ok('کد dsp_ و prt_ هم شناخته می‌شوند', tgStartLabel_('dsp_berlin').indexOf('berlin') > -1 && tgStartLabel_('prt_clinic_x').indexOf('همکار') === 0);
    TG_OUTBOX = [];
    v1689StartUtm_('ref_dr_test'); v1689StartUtm_('ref_dr_test');
    var utm = TG_OUTBOX.filter(function (o) { return o.kind === 'utm'; });
    ok('ثبت در «سئو · لینک‌های UTM» فقط یک بار، با برچسب منبع از انتهای کد', utm.length === 1 && utm[0].row[6] === 't.me/tajrobehlife_bot?start=ref_dr_test' && utm[0].row[7] === 'منبع: dr test');
    ok('کد بی پیشوند ثبت UTM نمی‌شود', v1689StartUtm_('pt_de') === '' && v1689StartUtm_('mg-5-t') === '');

    /* ۴) دو پرسش پیش از شماره */
    TG_OUTBOX = [];
    tgQuizFinish_(9301, 'on');
    ok('بعد از حالت جلسه اول کشور پرسیده می‌شود، نه شماره (روی کد قبلی مردود)', TG_OUTBOX.length && TG_OUTBOX[TG_OUTBOX.length - 1].text === v1689Tpl_('q_country') && !TG_OUTBOX.some(function (o) { return o.text === T_ASK_PHONE; }));
    TG_OUTBOX = [];
    v1689CtryText_(9301, 'آلمان');
    ok('کشور ثبت و پرسش آشنایی با گزینه‌های «واژگان» می‌آید', tgGetVal_('lctry', 9301) === 'آلمان' && TG_OUTBOX.some(function (o) { return o.text === v1689Tpl_('q_heard') && JSON.stringify(o.markup || {}).indexOf('lh:0') > -1; }));
    TG_OUTBOX = [];
    v1689Cb_(9301, 'lh:4');
    ok('بعد از آشنایی، شماره خواسته می‌شود', tgGetVal_('lhrd', 9301) === V168_VOCAB[V1689_COL_HEARD][4] && TG_OUTBOX.some(function (o) { return o.text === T_ASK_PHONE; }));
    var ex = v1689Extras_(9301, {});
    ok('لید دو ستون تازه را می‌گیرد', ex[V1689_COL_CTRY] === 'آلمان' && ex[V1689_COL_HEARD] === V168_VOCAB[V1689_COL_HEARD][4]);
    TG_OUTBOX = [];
    tgQuizFinish_(9302, 'on'); v1689Cb_(9302, 'lc:ir');
    ok('دکمهٔ «ایران»', tgGetVal_('lctry', 9302) === V1689_IRAN);
    TG_OUTBOX = [];
    tgQuizFinish_(9301, 'on');
    ok('کسی که هر دو را جواب داده دوباره پرسیده نمی‌شود', TG_OUTBOX.some(function (o) { return o.text === T_ASK_PHONE; }) && !TG_OUTBOX.some(function (o) { return o.text === v1689Tpl_('q_country'); }));
    tgSetVal_('lctry', 9303, '?');
    ok('دستور یا شماره جای کشور گرفته نمی‌شود و پرسش پاک می‌شود', v1689CtryText_(9303, '/start') === false && !tgGetVal_('lctry', 9303));
    tgSetVal_('lctry', 9304, '?');
    ok('پیام بحران یا جملهٔ بلند نام کشور ثبت نمی‌شود', v1689CtryText_(9304, 'میخوام خودکشی کنم') === false && !tgGetVal_('lctry', 9304));
    var wf = v1689WebFields_({ country: 'کانادا', heard_from: 'اینستاگرام' });
    ok('فرم سایت: دو فیلد خوانده می‌شود', wf.ctry === 'کانادا' && wf.heard === 'اینستاگرام');
    TG_OUTBOX = [];
    handleWebForm_({ name: 'مراجع ساختگی', phone: '09120000731', country: 'کانادا', heard_from: 'اینستاگرام', source: 'سایت › معارفه › فرم' });
    var wl = TG_OUTBOX.filter(function (o) { return o.kind === 'lead'; })[0];
    ok('فرم سایت dry_run: لید دو فیلد را دارد (روی کد قبلی مردود)', wl && wl.o.country === 'کانادا' && wl.o.heard === 'اینستاگرام');
    /* v170.7: فرم آزمایشی از هیچ مسیری (پذیرش، مدرسه، پرونده‌ی تکراری) سطر، کارت یا پیام نمی‌سازد */
    var tl = [
      { names: { first_name: 'تست TEST ممیزی' }, name: 'تست TEST ممیزی', mobile: '09121112233', source: 'سایت › پذیرش › فرم شروع تراپی' },  // pii:ok ساختگی
      { name: 'علی تست', mobile: '09121112234', source: 'سایت › مدرسه › پیش‌ثبت‌نام دوره', form_title: 'پیش‌ثبت‌نام دوره' },  // pii:ok ساختگی
      { name: 'Sara test', phone: '09121112235', source: 'سایت › مدرسه › ثبت‌نام دورهٔ EFT' },  // pii:ok ساختگی
      { name: 'نام ساختگی', mobile: '+98 912 345 6789', source: 'سایت › پذیرش › فرم تماس با ما' },
      { name: 'نام ساختگی', mobile: '۰۹۱۲۳۴۵۶۷۸۹', source: 'سایت › سازمانی › درخواست خدمات سازمانی' },  // pii:ok ساختگی
      { name: 'نام ساختگی', mobile: '09121112236', email: 'test+audit@example.invalid', source: 'سایت › پذیرش › فرم شروع تراپی' },  // pii:ok ساختگی
      { name: 'نام ساختگی', mobile: '09121112237', note: 'TEST-37133195688 ثبت آزمایشی', source: 'سایت › رودمپ › ثبت سریع رودمپ' }  // pii:ok ساختگی
    ];
    var tlBad = tl.filter(function (f) { TG_OUTBOX = []; handleWebForm_(f); return TG_OUTBOX.length > 0; }).length;
    ok('فرم آزمایشی (نام، شمارهٔ ساختگی با هر قالب، ایمیل، برچسب TEST) در هیچ مسیری چیزی نمی‌سازد', tlBad === 0);
    ok('نام‌ها و شماره‌های واقعی‌نما تست حساب نمی‌شوند', !isTestLead_('آزمون دود', '09120006918', '', {}) && !isTestLead_('Tester Contestant', '09123456780', 'a@b.com', { note: 'متن عادی' }) && !isTestLead_('نام ساختگی', '989123456788', '', {}));  // pii:ok ساختگی
    ok('کال‌بک‌های تازه در مینی‌اپ مجازند', TG_API_CB_CLIENT.indexOf('lc:') > -1 && TG_API_CB_CLIENT.indexOf('lh:') > -1);

    /* ۱ و ۲) بی چک ۳۰ دقیقه‌ای؛ ثبت از سه راه */
    var LIST = '/wp-json/wp/v2/posts?per_page=10&orderby=date&_fields=id,title,slug,categories,link,date';
    TG_MEM['wp:' + LIST] = [{ id: 700, title: { rendered: 'مطلب قدیمی' }, slug: 'old', categories: [10], link: 'https://tajrobeh.life/old/', date: '2026-09-01T10:00:00' }];
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 3, 8, 30).getTime();
    TG_MEM['mageditors'] = [{ name: 'سردبیر', chat: '7001', roles: [TG_MAG_EDITOR] }];
    var listCalls = 0, keepWp = pbWp_;
    pbWp_ = function (p) { if (p === LIST) listCalls++; return keepWp(p); };
    try {
      pbTickRun_(pbNow_());
      TG_MEM['pb:now'] = pbTehran_(2026, 10, 3, 8, 40).getTime(); pbTickRun_(pbNow_());
      ok('تیک ۵ دقیقه‌ای پیش از ساعت ۹ سایت را برای مطلب تازه نمی‌خواند (روی کد قبلی مردود)', listCalls === 0 && pbIdList_('PB_SEEN') === null);
    } finally { pbWp_ = keepWp; }
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 3, 9, 5).getTime();
    TG_OUTBOX = [];
    ok('چک روزانهٔ بار اول فقط فهرست را پایه می‌کند', pbDailyNew_(pbNow_()) === 0 && !TG_OUTBOX.length && pbIdList_('PB_SEEN').indexOf('700') > -1);
    TG_MEM['wp:' + LIST].unshift({ id: 701, title: { rendered: 'مطلب تازهٔ آزمایشی' }, slug: 'new', categories: [5], link: 'https://tajrobeh.life/new/', date: '2026-10-03T08:00:00' });
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 4, 9, 5).getTime();
    TG_OUTBOX = [];
    ok('چک روزانهٔ ساعت ۹: فقط یک پیام کوتاه به سردبیر، بی ثبت', pbDailyNew_(pbNow_()) === 1 && TG_OUTBOX.filter(function (o) { return /مطلب تازه در سایت/.test(o.text || ''); }).length >= 1 && !(TG_MEM['pb:' + PB_T_PKG] || []).some(function (r) { return r['شناسه'] === '701'; }));
    TG_OUTBOX = [];
    ok('همان روز دوباره خبر نمی‌دهد', pbDailyNew_(pbNow_()) === 0 && !TG_OUTBOX.length);
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 5, 9, 5).getTime();
    ok('مطلب خبرداده‌شده فردا دوباره خبر داده نمی‌شود', pbDailyNew_(pbNow_()) === 0);
    var reg = 0; pbFreshPosts_().forEach(function (o) { pbRegisterPost_(o, pbNow_()); reg++; });
    ok('دکمهٔ سردبیر مطلب تازه را ثبت می‌کند («منتظر بسته»)', reg === 1 && (TG_MEM['pb:' + PB_T_PKG] || []).some(function (r) { return r['شناسه'] === '701' && r['وضعیت'] === PB_PKG_ST.wait; }) && pbFreshPosts_().length === 0);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ v168.9 درست است'));
  return tgTestTally_(log, fail);
}

/* ============================================================================
   v168.10 (۱۰ مهر ۱۴۰۵، سهمیه؛ هر چهار قدم با تأیید یاسر، در یک انتشار)
   حساب جیمیل شخصی سقف روزانهٔ ۹۰ دقیقه زمان اجرای تریگرها دارد؛ ۹ مهر ۶۹٫۴ دقیقه و ۱۰ مهر تا ظهر ۵۹٫۸ دقیقه بود.
   ۱) سه تیک ۵ دقیقه‌ای (tgDutyTick، tgCpTick، soTick) یک تریگر شدند: tgTick5. هر اجرای جدا هزینهٔ راه‌اندازی دارد.
   ۲) tgCpTick هر ۱۰ دقیقه (یک در میان در tgTick5).
   ۳) جاروهای v168 در tgWatchdog هر سه ساعت (v16810SweepDue_).
   ۴) اگر زمان اجرای امروز تا ظهر تهران از ۴۵ دقیقه گذشت، یک پیام کوتاه به یاسر (روزی یک بار).
   خود سه تابع دست نخوردند: هر کدام قفل، توقف هنگام دیپلوی (ciPaused_ با همان e) و سنجش زمان (tgRunStat_) خودش را دارد.
   ============================================================================ */
var V16810_TICKS = ['tgDutyTick', 'tgCpTick', 'soTick'];
var V16810_CP_MIN = 10;
var V16810_SWEEP_H = 3;
var V16810_ALERT_MIN = 45;
var V16810_ALERT_HOUR = 12;

function v16810Prop_(k, v) {
  if (TG_DRY) { if (v === undefined) return TG_MEM['v16810:' + k] || null; TG_MEM['v16810:' + k] = String(v); return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty(k);
  P.setProperty(k, String(v)); return v;
}
function v16810Now_() { return TG_DRY && TG_MEM['v16810:now'] ? Number(TG_MEM['v16810:now']) : Date.now(); }
/* موعد کاری که هر N دقیقه یک بار می‌رود؛ ۳۰ ثانیه نرمش برای لغزش تریگر */
function v16810Due_(k, min) {
  var now = v16810Now_(), at = Number(v16810Prop_(k) || 0);
  return now - at >= min * 60000 - 30000;
}
function v16810SweepDue_() {
  if (!v16810Due_('V16810_SW_AT', V16810_SWEEP_H * 60)) return false;
  v16810Prop_('V16810_SW_AT', v16810Now_());
  return true;
}

/* تریگر واحد ۵ دقیقه‌ای. خطای یکی جلوی بقیه را نمی‌گیرد.
   v170.23.12.5 (سهمیهٔ اجرا، bg* ته v168.gs): نوبت‌دار و پیام ۱۰ دقیقه‌ای لید و صف ارسال واجب‌اند؛ کمپین هر ۳۰ دقیقه و فقط با
   کمپین فعال (بی آن هر ۲ ساعت فقط سنجش وضعیت)؛ صف سوشال هر ۱۰ دقیقه؛ بقیه سبک و زیر سقف ۷۵ دقیقه. */
function tgTick5(e) {
  e = e || {};
  var calls = TG_DRY ? (TG_MEM['v16810:calls'] = TG_MEM['v16810:calls'] || []) : null;
  var run = function (name, fn) { if (calls) { calls.push(name); return 'dry'; } return fn(e); };
  try { run('tgDutyTick', tgDutyTick); } catch (x1) { tgErr_('tgTick5 tgDutyTick', x1); }
  var cpOn = bgCpActive_();
  if (cpOn && v16810Due_('V16810_CP_AT', BG_CP_ACTIVE_MIN) && bgOk_('light', 'tgCpTick')) {
    var r;
    try { r = run('tgCpTick', tgCpTick); if (!calls && r !== 'busy') bgCpSet_(tgCpCamps_()); } catch (x2) { tgErr_('tgTick5 tgCpTick', x2); }
    if (r !== 'busy') v16810Prop_('V16810_CP_AT', v16810Now_());
  } else if (!cpOn && v16810Due_('V16810_CP_AT', BG_CP_CHECK_MIN) && bgOk_('light', 'tgCpCheck')) {
    v16810Prop_('V16810_CP_AT', v16810Now_());
    try { run('tgCpCheck', bgCpCheck_); } catch (x9) { tgErr_('tgTick5 bgCpCheck_', x9); }
  }
  if (!cpOn && v16810Due_('BG_TH_AT', BG_TH_MIN) && bgOk_('light', 'tgThPush_')) {
    v16810Prop_('BG_TH_AT', v16810Now_());
    try { run('tgThPush_', function () { return tgThPush_(); }); } catch (x10) { tgErr_('tgTick5 tgThPush_', x10); }
  }
  if (v16810Due_('BG_SO_AT', BG_SO_MIN)) {
    v16810Prop_('BG_SO_AT', v16810Now_());
    try { run('soTick', soTick); } catch (x3) { tgErr_('tgTick5 soTick', x3); }
  }
  var t5 = Date.now();
  /* v170.23.26: زمان هر بخش جدا (RST:<روز>، ستون «بخش‌های تیک ۵ دقیقه‌ای» تب «سهمیهٔ اجرا») */
  try { if (typeof dqTick5_ === 'function') bgPart_('dqTick5_', function () { return run('dqTick5_', dqTick5_); }); } catch (x5) { tgErr_('tgTick5 dqTick5_', x5); }   /* v170: صف ارسال، هر ۱۰ دقیقه */
  try { if (typeof cmTick5_ === 'function' && bgOk_('light', 'cmTick5_')) bgPart_('cmTick5_', function () { return run('cmTick5_', cmTick5_); }); } catch (x6) { tgErr_('tgTick5 cmTick5_', x6); }   /* v170.2: کامنت‌های هاب پذیرش، هر ۱۵ دقیقه */
  try { if (typeof lsTick_ === 'function') bgPart_('lsTick_', function () { return run('lsTick_', lsTick_); }); } catch (x8) { tgErr_('tgTick5 lsTick_', x8); }   /* v170.23.12: پاسخ زیر ۱۰ دقیقه و اولویت ۹:۳۰ (leadspeed.gs)؛ v170.23.26: شیت فقط با لید تازه */
  try { bgPart_('quotaAlert', v16810QuotaAlert_); } catch (x4) { tgErr_('v16810QuotaAlert_', x4); }
  if (!calls) { try { if (typeof v17013ScholarTick_ === 'function' && bgOk_('light', 'v17013ScholarTick_')) bgPart_('v17013ScholarTick_', v17013ScholarTick_); } catch (x7) { tgErr_('tgTick5 v17013ScholarTick_', x7); } }   /* v170.13: خبر وضعیت بورسیه، هر ۱۵ دقیقه */
  if (!calls) { tgRunStat_('tgTick5+', t5); bgFlush_(); }   /* v170.23.12.5: بقیهٔ تیک (صف، کامنت، لید ۱۰ دقیقه‌ای) هم در سهمیه شمرده می‌شود */
}

/* جمع زمان اجرای امروز (دقیقه) از RS:<روز تهران> که tgRunStat_ می‌نویسد */
function v16810TodayMin_(o) {
  var ms = 0;
  Object.keys(o || {}).forEach(function (k) { if (k !== '_c' && Array.isArray(o[k])) ms += Number(o[k][1] || 0); });
  return ms / 60000;
}
function v16810QuotaAlert_() {
  var now = new Date(v16810Now_());
  var h = Number(Utilities.formatDate(now, TG_TZ, 'H')), day = Utilities.formatDate(now, TG_TZ, 'yyyy-MM-dd');
  if (h >= V16810_ALERT_HOUR + 1 || h < V16810_ALERT_HOUR || v16810Prop_('V16810_AL_DAY') === day) return false;
  v16810Prop_('V16810_AL_DAY', day);
  var o = {};
  if (TG_DRY) o = TG_MEM['v16810:rs'] || {};
  else { try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty('RS:' + Utilities.formatDate(now, 'Asia/Tehran', 'yyyy-MM-dd')) || '{}'); } catch (e) { o = {}; } }
  var min = v16810TodayMin_(o);
  if (min <= V16810_ALERT_MIN) return false;
  var top = Object.keys(o).filter(function (k) { return k !== '_c' && Array.isArray(o[k]); })
    .sort(function (a, b) { return o[b][1] - o[a][1]; }).slice(0, 3)
    .map(function (k) { return k + ' ' + tgFa_((o[k][1] / 60000).toFixed(1)) + ' دقیقه'; });
  tgSend_(TG_OWNER_CHAT, '⚠️ <b>سهمیهٔ زمان اجرا</b>\nکارهای زمان‌دار امروز تا ظهر ' + tgFa_(min.toFixed(1)) +
    ' دقیقه اجرا شده‌اند. سقف روزانه ۹۰ دقیقه است و بعد از آن تا فردا هیچ کار زمان‌داری نمی‌رود.\nبیشترین: ' + top.join('، '));
  return true;
}

/* یک‌بارهٔ خودکار بعد از انتشار سبز: تریگر tgTick5 ساخته و سه تریگر جدا برداشته می‌شوند. خروجی فقط شمارش */
function tgV16810Ticks() {
  var trs = ScriptApp.getProjectTriggers(), removed = 0;
  var has = trs.some(function (t) { return t.getHandlerFunction() === 'tgTick5'; });
  if (!has) ScriptApp.newTrigger('tgTick5').timeBased().everyMinutes(5).create();
  trs.forEach(function (t) { if (V16810_TICKS.indexOf(t.getHandlerFunction()) > -1) { ScriptApp.deleteTrigger(t); removed++; } });
  return 'tgTick5: ' + (has ? 'بود' : 'ساخته شد') + ' · تریگرهای جدا برداشته شد: ' + removed + ' · شمار تریگرها: ' + ScriptApp.getProjectTriggers().length;
}

function tgV16810Tests() {
  var log = [], fail = 0;
  function ok(name, cond) { if (cond) log.push('✓ ' + name); else { fail++; log.push('✗ ' + name); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  try {
    var t0 = pbTehran_(2026, 10, 3, 8, 0).getTime();
    var at = function (min) { TG_MEM['v16810:now'] = String(t0 + min * 60000); };
    var calls = function () { var c = TG_MEM['v16810:calls'] || []; TG_MEM['v16810:calls'] = []; return c; };
    at(0); tgTick5({});
    ok('tgTick5 همهٔ کارهای ۵ دقیقه‌ای را صدا می‌زند (روی کد قبلی مردود)', calls().join() === 'tgDutyTick,tgCpTick,soTick,dqTick5_,cmTick5_,lsTick_');   /* v170.23.12: lsTick_ */
    at(5); tgTick5({});
    ok('۵ دقیقه بعد tgCpTick و صف سوشال نمی‌روند، واجب‌ها می‌روند', calls().join() === 'tgDutyTick,dqTick5_,cmTick5_,lsTick_');   /* v170.23.12.5 */
    at(10); tgTick5({});
    var c10 = calls();
    ok('۱۰ دقیقه بعد صف سوشال می‌رود، کمپین نه (هر ۳۰ دقیقه)', c10.indexOf('soTick') > -1 && c10.indexOf('tgCpTick') < 0);
    at(29.6); tgTick5({});
    ok('بعد از ۲۹٫۶ دقیقه (لغزش تریگر) tgCpTick با کمپین فعال می‌رود', calls().indexOf('tgCpTick') > -1);
    TG_MEM['bgp:BG_CP_ACTIVE'] = '0';
    at(60); tgTick5({});
    var c60 = calls();
    ok('بی کمپین فعال: tgCpTick نمی‌رود، فهرست همکاران ساعتی می‌رود', c60.indexOf('tgCpTick') < 0 && c60.indexOf('tgCpCheck') < 0 && c60.indexOf('tgThPush_') > -1);
    at(150); tgTick5({});
    ok('بی کمپین فعال: هر ۲ ساعت فقط سنجش وضعیت کمپین', calls().indexOf('tgCpCheck') > -1);
    delete TG_MEM['bgp:BG_CP_ACTIVE'];

    at(0);
    ok('جاروی v168 بار اول می‌رود', v16810SweepDue_() === true);
    at(60);
    ok('یک ساعت بعد جارو نمی‌رود (روی کد قبلی مردود)', v16810SweepDue_() === false);
    at(179.6);
    ok('سه ساعت بعد جارو می‌رود', v16810SweepDue_() === true);

    TG_MEM['v16810:rs'] = { tgWatchdog: [5, 30 * 60000, 0], tgCpTick: [50, 20 * 60000, 0], _c: 1 };
    TG_MEM['v16810:now'] = String(pbTehran_(2026, 10, 3, 11, 50).getTime()); TG_OUTBOX = [];
    ok('پیش از ظهر هشدار نمی‌آید', v16810QuotaAlert_() === false && !TG_OUTBOX.length);
    TG_MEM['v16810:now'] = String(pbTehran_(2026, 10, 3, 12, 5).getTime());
    ok('ظهر با ۵۰ دقیقه: یک هشدار کوتاه به یاسر', v16810QuotaAlert_() === true && TG_OUTBOX.some(function (o) { return String(o.chat) === String(TG_OWNER_CHAT) && /سهمیهٔ زمان اجرا/.test(o.text || ''); }));
    ok('همان روز دوباره هشدار نمی‌آید', v16810QuotaAlert_() === false);
    TG_MEM['v16810:rs'] = { tgCpTick: [50, 20 * 60000, 0] };
    TG_MEM['v16810:now'] = String(pbTehran_(2026, 10, 4, 12, 5).getTime());
    ok('زیر ۴۵ دقیقه هشدار نمی‌آید', v16810QuotaAlert_() === false);
    ok('یک‌بارهٔ تریگرها در اجرای خودکار بعد از انتشار است', CI_ONCE_AUTO.indexOf('tgV16810Ticks') > -1 && CI_ONCE_ALLOW.indexOf('tgV16810Ticks') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ v168.10 درست است'));
  return tgTestTally_(log, fail);
}

/* ============================================================================
   v169.1 (۱۰ مهر ۱۴۰۵، تأیید یاسر، PR جدا): تجمیع تریگرها
   سقف Apps Script ۲۰ تریگر است و بات ۱۷ داشت؛ هاب‌های شخصی برای همگامی دوطرفه هر کدام یک onEdit لازم دارند.
   - هفتگی و ساعتی‌ها به tgWatchdog می‌روند، نه tgTick5 (شرط یاسر: تیک ۵ دقیقه‌ای سنگین‌تر نشود).
   - هر کار جابه‌جاشده بعد از اجرا مهر دوره‌اش (هفته یا ساعت) را در Script Properties می‌گذارد و در همان دوره دوباره اجرا نمی‌شود
     (مهر پیش از اجرا گذاشته می‌شود تا حتی با خطا یا اجرای هم‌زمان، اطلاعیهٔ هفتگی دو بار نرود).
   - tgFbKickoff و tgDutyKickoff پیام یک‌بارهٔ قدیمی بودند (کامنت «یک بار») و جابه‌جا نمی‌شوند؛ فقط تریگر ماندهٔ آن‌ها پاک می‌شود.
   ============================================================================ */
var V1691_REMOVE = ['ptTick', 'vkTick', 'tgMonWeekly', 'tgTherWeekly', 'tgRmAnnTher', 'tgRmAnnSch', 'tgFbKickoff', 'tgDutyKickoff'];
/* wd: روز هفته با قالب u (۱ دوشنبه ... ۴ پنجشنبه، ۶ شنبه، ۷ یکشنبه)، h: از این ساعت تهران به بعد */
var V1691_WEEKLY = [
  { fn: 'tgTherWeekly', wd: 4, h: 10, heavy: true },
  { fn: 'tgMonWeekly', wd: 6, h: 10, heavy: false },
  { fn: 'tgRmAnnTher', wd: 6, h: 11, heavy: false },
  { fn: 'tgRmAnnSch', wd: 6, h: 11, heavy: false }
];
var V1691_HOURLY = ['ptTick', 'vkTick'];

/* شمارهٔ هفته از شنبه (هفتهٔ ایرانی)، به وقت تهران؛ ۱ ژانویهٔ ۲۰۰۰ شنبه بود */
function v1691Week_(d) {
  var p = Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd').split('-').map(Number);
  return 'W' + Math.floor((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(2000, 0, 1)) / (7 * 86400000));
}
function v1691Now_() { return TG_DRY && TG_MEM['v1691:now'] ? new Date(Number(TG_MEM['v1691:now'])) : new Date(); }
function v1691Stamp_(k, v) {
  if (TG_DRY) { if (v === undefined) return TG_MEM['v1691:' + k] || ''; TG_MEM['v1691:' + k] = v; return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty('V1691_RUN:' + k) || '';
  P.setProperty('V1691_RUN:' + k, v); return v;
}
function v1691Run_(fn, e) {
  if (TG_DRY) { (TG_MEM['v1691:calls'] = TG_MEM['v1691:calls'] || []).push(fn); return; }
  var map = { ptTick: function (x) { return ptTick(x); }, vkTick: function (x) { return vkTick(x); }, tgTherWeekly: function (x) { return tgTherWeekly(x); },
    tgMonWeekly: function (x) { return tgMonWeekly(x); }, tgRmAnnTher: function () { return tgRmAnnTher(); }, tgRmAnnSch: function () { return tgRmAnnSch(); } };
  if (map[fn]) map[fn](e);
}
/* از tgWatchdog: هر ساعت یک بار */
function v1691Hourly_(e) {
  var hour = Utilities.formatDate(v1691Now_(), TG_TZ, 'yyyy-MM-dd HH'), n = 0;
  V1691_HOURLY.forEach(function (fn) {
    if (v1691Stamp_(fn) === hour) return;
    v1691Stamp_(fn, hour);
    try { v1691Run_(fn, e); n++; } catch (x) { tgErr_('v1691 ' + fn, x); }
  });
  return n;
}
/* از tgWatchdog: کار هفتگی روزش که رسید و ساعتش گذشت، یک بار در هفته. true یعنی کار سنگین رفت */
function v1691Weekly_(e) {
  var now = v1691Now_(), wd = +Utilities.formatDate(now, TG_TZ, 'u'), h = +Utilities.formatDate(now, TG_TZ, 'H');
  var week = v1691Week_(now), heavy = false;
  V1691_WEEKLY.forEach(function (j) {
    if (heavy || wd !== j.wd || h < j.h || v1691Stamp_(j.fn) === week) return;
    v1691Stamp_(j.fn, week);
    try { v1691Run_(j.fn, e); } catch (x) { tgErr_('v1691 ' + j.fn, x); }
    if (j.heavy) heavy = true;
  });
  return heavy;
}
/* یک‌بارهٔ خودکار بعد از انتشار سبز: تریگرهای جدا پاک می‌شوند. خروجی فقط شمارش */
function tgV1691Triggers() {
  var removed = [];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (V1691_REMOVE.indexOf(f) > -1) { ScriptApp.deleteTrigger(t); removed.push(f); }
  });
  /* این هفته هر کار هفتگی که تریگر قدیمی‌اش همین هفته رفته بود دوباره نرود */
  var week = v1691Week_(new Date()), wd = +Utilities.formatDate(new Date(), TG_TZ, 'u'), h = +Utilities.formatDate(new Date(), TG_TZ, 'H');
  var ir = function (u) { return (u + 1) % 7; };   /* ترتیب هفتهٔ ایرانی: شنبه ۰ ... جمعه ۶ */
  V1691_WEEKLY.forEach(function (j) { if (ir(wd) > ir(j.wd) || (wd === j.wd && h >= j.h)) v1691Stamp_(j.fn, week); });
  return 'پاک شد: ' + (removed.join('، ') || 'هیچ') + ' · شمار تریگرها: ' + ScriptApp.getProjectTriggers().length;
}

function tgV1691Tests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM;
  TG_DRY = true; TG_MEM = {};
  try {
    var calls = function () { var c = TG_MEM['v1691:calls'] || []; TG_MEM['v1691:calls'] = []; return c; };
    TG_MEM['v1691:now'] = String(pbTehran_(2026, 10, 8, 9, 5).getTime());   /* پنجشنبه ۹:۰۵ */
    ok('ساعتی‌ها از واچ‌داگ می‌روند (روی کد قبلی مردود)', v1691Hourly_({}) === 2 && calls().join() === 'ptTick,vkTick');
    ok('در همان ساعت دوباره نمی‌روند', v1691Hourly_({}) === 0);
    ok('پنجشنبه پیش از ساعت ۱۰ کار هفتگی نمی‌رود', v1691Weekly_({}) === false && !calls().length);
    TG_MEM['v1691:now'] = String(pbTehran_(2026, 10, 8, 10, 5).getTime());
    ok('پنجشنبه ۱۰: tgTherWeekly می‌رود و سنگین است', v1691Weekly_({}) === true && calls().join() === 'tgTherWeekly');
    TG_MEM['v1691:now'] = String(pbTehran_(2026, 10, 8, 15, 5).getTime());
    ok('همان هفته دوباره نمی‌رود (شرط ۲)', v1691Weekly_({}) === false && !calls().length);
    TG_MEM['v1691:now'] = String(pbTehran_(2026, 10, 10, 11, 5).getTime());   /* شنبه ۱۱:۰۵ */
    ok('شنبه: نظارت هفتگی و دو اطلاعیهٔ کاناپه، هر کدام یک بار', v1691Weekly_({}) === false && calls().join() === 'tgMonWeekly,tgRmAnnTher,tgRmAnnSch');
    ok('شنبه ساعت بعد هیچ اطلاعیه‌ای دوباره نمی‌رود', (TG_MEM['v1691:now'] = String(pbTehran_(2026, 10, 10, 12, 5).getTime()), v1691Weekly_({})) === false && !calls().length);
    TG_MEM['v1691:now'] = String(pbTehran_(2026, 10, 15, 10, 5).getTime());
    ok('هفتهٔ بعد پنجشنبه دوباره می‌رود', v1691Weekly_({}) === true && calls().join() === 'tgTherWeekly');
    ok('هیچ کار هفتگی در tgTick5 نیست (شرط ۱)', String(tgTick5).indexOf('Weekly') < 0 && String(tgTick5).indexOf('RmAnn') < 0);
    ok('یک‌بارهٔ پاک کردن تریگرها در اجرای خودکار بعد از انتشار است', CI_ONCE_AUTO.indexOf('tgV1691Triggers') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ تجمیع تریگرها درست است'));
  return tgTestTally_(log, fail);
}

/* ============================================================================ */
/**
 * v170.23.12.5 · سهمیهٔ زمان اجرای کارهای زمان‌دار (سقف روزانهٔ ۹۰ دقیقهٔ Apps Script)
 * (در همین فایل، کنار tgTick5، نه فایل تازه: فایل تازه آزمون کامل روی اپس‌اسکریپت می‌خواهد و آن هم از همین سهمیه می‌خورد)
 *
 * هدف: مصرف روزانه زیر ۴۵ دقیقه، و کارهای واجب همیشه.
 * سه ردهٔ کار:
 * - must (واجب، هرگز رد نمی‌شود): بحران و لغو و تغییر (وبهوک و onEdit؛ زمان‌دار نیستند)، یادآوری معارفه و جلسه،
 *   تیک هر دقیقهٔ tgPayTick (این‌جا دست نمی‌خورد)، اعلان لید تازه به نوبت‌دار (tgDutyTick، ۸ تا ۲۴)، پیام ۱۰ دقیقه‌ای لید (lsTick_)، صف ارسال.
 * - light (سبک، فقط بالای ۷۵ دقیقه رد می‌شود): کارهای ساعتی کوچک.
 * - heavy (سنگین، بالای ۵۵ دقیقه رد می‌شود): فقط در ساعت‌های BG_HEAVY_HOURS از tgWatchdog.
 * مصرف امروز همان RS:<روز تهران> است که tgRunStat_ می‌نویسد. زمان هر قدم tgWatchdog در RSW:<روز> و ردشده‌ها در BGS:<روز>.
 * یک خط مصرف روز در گزارش شبانه (TG_NIGHT_LINES). هشدار ظهر همان v16810QuotaAlert_ است.
 */
var BG_SOFT_MIN = 55;    /* بالاتر از این: کارهای سنگین رد می‌شوند */
var BG_HARD_MIN = 75;    /* بالاتر از این: فقط واجب‌ها */
var BG_GOAL_MIN = 45;
/* ساعت‌های تهران که بخش سنگین tgWatchdog می‌رود. پنجره‌های خود کارها (مثلاً ۹ تا ۱۸ یا از ۲۲) در این ساعت‌ها هست */
var BG_HEAVY_HOURS = [9, 12, 15, 18, 22];
var BG_DUTY_FROM = 8;    /* tgDutyTick فقط ۸ تا ۲۴ تهران */
var BG_DUTY_FULL_MIN = 30;   /* با لید در انتظار، دست‌کم هر ۳۰ دقیقه یک خواندن کامل (ثبت تماس اول) */
var BG_DUTY_SAFE_MIN = 180;  /* بی هیچ نشانه‌ای هم هر ۳ ساعت یک خواندن کامل */
var BG_CP_ACTIVE_MIN = 30;   /* tgCpTick وقتی کمپین فعال است */
var BG_CP_CHECK_MIN = 120;   /* بی کمپین فعال: هر ۲ ساعت فقط وضعیت کمپین‌ها (پنجرهٔ تأخیر رویداد ۶ ساعت است) */
var BG_TH_MIN = 60;          /* فهرست همکاران به سایت، بی کمپین فعال */
var BG_SO_MIN = 10;          /* صف ارسال سوشال */
var BG_MEMO = null;

function bgDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function bgNow_() { return bgDry_() && TG_MEM['bg:now'] ? Number(TG_MEM['bg:now']) : Date.now(); }
function bgDay_(ms) { return Utilities.formatDate(new Date(ms || bgNow_()), 'Asia/Tehran', 'yyyy-MM-dd'); }
function bgHour_() { return Number(Utilities.formatDate(new Date(bgNow_()), 'Asia/Tehran', 'H')); }
function bgProp_(k, v) {
  if (bgDry_()) { if (v !== undefined) TG_MEM['bgp:' + k] = String(v); return TG_MEM['bgp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function bgJson_(k) { try { return JSON.parse(bgProp_(k) || '{}') || {}; } catch (e) { return {}; } }
function bgReset_() { BG_MEMO = null; }
function bgMemo_() {
  var day = bgDay_();
  if (!BG_MEMO || BG_MEMO.day !== day) BG_MEMO = { day: day, used: null, steps: {}, skip: {}, parts: {} };
  return BG_MEMO;
}
/* دقیقه‌های اجراشدهٔ امروز (یک بار در هر اجرا خوانده می‌شود) */
function bgUsedMin_() {
  var m = bgMemo_();
  if (m.used === null) {
    var o = bgDry_() ? (TG_MEM['bg:rs'] || {}) : bgJson_('RS:' + m.day);
    m.used = v16810TodayMin_(o);
  }
  return m.used;
}
function bgLevel_() { var u = bgUsedMin_(); return u >= BG_HARD_MIN ? 2 : u >= BG_SOFT_MIN ? 1 : 0; }
function bgOk_(tier, name) {
  if (tier === 'must') return true;
  var lv = bgLevel_(), ok = tier === 'light' ? lv < 2 : lv < 1;
  if (!ok) { var s = bgMemo_().skip; s[name] = (s[name] || 0) + 1; }
  return ok;
}
/* یک قدم tgWatchdog: رده، زمان و خطای جدا. true یعنی اجرا شد */
function bgStep_(name, tier, fn) {
  if (typeof fn !== 'function' || !bgOk_(tier, name)) return false;
  var t0 = Date.now(), r;
  try { r = fn(); } catch (e) { try { tgErr_(name, e); } catch (e2) {} }
  var st = bgMemo_().steps, x = st[name] || [0, 0]; x[0]++; x[1] += Date.now() - t0; st[name] = x;
  return r === undefined ? true : r;
}
/* v170.23.26: یک بخش tgTick5 (بعد از سه کار اصلی): بار و زمان، بی رده و بی بلعیدن خطا */
function bgPart_(name, fn) {
  var t0 = Date.now();
  try { return fn(); } finally { var p = bgMemo_().parts, x = p[name] || [0, 0]; x[0]++; x[1] += Date.now() - t0; p[name] = x; }
}
/* زمان قدم‌ها و ردشده‌ها در Property؛ ۴ روز آخر */
function bgFlush_() {
  var m = BG_MEMO; if (!m) return;
  var put = function (pre, add, two) {
    if (!Object.keys(add).length) return;
    var k = pre + m.day, o = bgJson_(k);
    Object.keys(add).forEach(function (n) {
      if (two) { var x = o[n] || [0, 0]; x[0] += add[n][0]; x[1] += add[n][1]; o[n] = x; } else o[n] = (o[n] || 0) + add[n];
    });
    bgProp_(k, JSON.stringify(o));
  };
  try {
    put('RSW:', m.steps, true); put('BGS:', m.skip, false); put('RST:', m.parts || {}, true);
    m.steps = {}; m.skip = {}; m.parts = {};
    if (!bgDry_()) {
      var P = PropertiesService.getScriptProperties();
      ['RSW:', 'BGS:', 'RST:'].forEach(function (pre) { var ks = P.getKeys().filter(function (k) { return k.indexOf(pre) === 0; }).sort(); while (ks.length > 4) P.deleteProperty(ks.shift()); });
    }
  } catch (e) {}
}

/* ───── tgDutyTick: نشانگر سبک لید تازه ───── */
/* هر جایی که سطری به لیدها اضافه یا دستی ویرایش شود این را می‌زند؛ tgDutyTick بی آن شیت را نمی‌خواند */
function bgLeadMark_() { try { bgProp_('BG_LEAD_AT', bgNow_()); } catch (e) {} }
/* full = باید شیت خوانده شود؛ دلیل برای گزارش */
function bgDutyPlan_() {
  var now = bgNow_(), h = bgHour_();
  if (h < BG_DUTY_FROM) return { run: false, why: 'شب' };
  var mark = Number(bgProp_('BG_LEAD_AT') || 0), full = Number(bgProp_('BG_DUTY_FULL') || 0);
  if (mark && mark >= full) return { run: true, why: 'لید تازه' };
  if (now - full >= BG_DUTY_SAFE_MIN * 60000) return { run: true, why: 'دورهٔ ایمنی' };
  var pend = [];
  try { pend = bgDry_() ? (TG_MEM['bg:pend'] || []) : JSON.parse(PropertiesService.getScriptProperties().getProperty('TG_DUTY_PEND') || '[]'); } catch (e) { pend = []; }
  if (!pend.length) return { run: false, why: 'بی‌کار' };
  var wait = typeof TG_DUTY_WAIT !== 'undefined' ? TG_DUTY_WAIT : 10;
  var due = pend.some(function (x) { return !x.n || (x.n === 1 && x.t && (now - x.t) / 60000 >= wait); });
  if (due) return { run: true, why: 'نوبت اقدام' };
  if (now - full >= BG_DUTY_FULL_MIN * 60000) return { run: true, why: 'پیگیری در انتظار' };
  return { run: false, why: 'منتظر' };
}
function bgDutyDone_(t) { bgProp_('BG_DUTY_FULL', t || bgNow_()); }   /* زمان شروع خواندن، تا لیدی که وسط کار رسید جا نماند */

/* ───── tgCpTick: فقط با کمپین فعال ───── */
/* '' یعنی هنوز سنجیده نشده: فعال فرض می‌شود */
function bgCpActive_() { return bgProp_('BG_CP_ACTIVE') !== '0'; }
function bgCpSet_(camps) {
  var on = (camps || []).some(function (c) { return c && c.state !== 'بسته'; });
  bgProp_('BG_CP_ACTIVE', on ? '1' : '0'); return on;
}

/* بی کمپین فعال، هر ۲ ساعت: فقط وضعیت کمپین‌ها؛ اگر کمپینی باز شده بود همان دم tgCpTick کامل، وگرنه فقط هل دادن وضعیت سایت (با امضای تغییر) */
function bgCpCheck_(e) {
  var rs0 = Date.now();
  try {
    TG_CP_MEMO = null;
    if (bgCpSet_(tgCpCamps_())) return tgCpTick(e || {});
    try { return tgCpPush_('تیک'); } catch (eP) { tgErr_('tgCpPush_', eP); }
  } finally { tgRunStat_('tgCpCheck', rs0); }
}

/* ───── گزارش شبانه ───── */
function bgNightLine_() {
  var day = bgDay_(), o = bgDry_() ? (TG_MEM['bg:rs'] || {}) : bgJson_('RS:' + day), used = v16810TodayMin_(o);
  var top = Object.keys(o).filter(function (k) { return k !== '_c' && Array.isArray(o[k]); }).sort(function (a, b) { return o[b][1] - o[a][1]; }).slice(0, 3)
    .map(function (k) { return k + ' ' + tgFa_((o[k][1] / 60000).toFixed(1)); });
  var sk = bgDry_() ? (TG_MEM['bgp:BGS:' + day] ? JSON.parse(TG_MEM['bgp:BGS:' + day]) : {}) : bgJson_('BGS:' + day);
  var nSk = Object.keys(sk).reduce(function (a, k) { return a + sk[k]; }, 0);
  if (!bgDry_()) { try { bgDayRow_(day, used, o, sk); } catch (eRow) { tgErr_('bgDayRow_', eRow); } }
  return '⏱ سهمیهٔ اجرا: ' + tgFa_(used.toFixed(1)) + ' از ۹۰ دقیقه (هدف ' + tgFa_(BG_GOAL_MIN) + ')' +
    (top.length ? ' · بیشترین: ' + top.join('، ') : '') + (nSk ? ' · ' + tgFa_(nSk) + ' کار غیرواجب رد شد' : '');
}
/* یک سطر در روز در تب پنهان «سهمیهٔ اجرا» هاب: جمع، هر تابع، قدم‌های واچ‌داگ و ردشده‌ها (برای سنجش بعد از انتشار) */
var BG_TAB = 'سهمیهٔ اجرا';
var BG_HEAD = ['روز', 'دقیقه تا گزارش ۲۱', 'هر تابع (بار/دقیقه)', 'قدم‌های واچ‌داگ (بار/دقیقه)', 'ردشده', 'بخش‌های تیک ۵ دقیقه‌ای (بار/دقیقه)'];
function bgDayRow_(day, used, o, sk) {
  var ss = tgSS_(), sh = ss.getSheetByName(BG_TAB);
  if (!sh) { sh = ss.insertSheet(BG_TAB); sh.setRightToLeft(true); sh.appendRow(BG_HEAD); sh.setFrozenRows(1); try { sh.hideSheet(); } catch (eH) {} }
  var fmt = function (m) { return Object.keys(m).filter(function (k) { return k !== '_c' && Array.isArray(m[k]); }).sort(function (a, b) { return m[b][1] - m[a][1]; })
    .map(function (k) { return k + '=' + m[k][0] + '/' + (m[k][1] / 60000).toFixed(1); }).join(' '); };
  if (sh.getLastColumn() < BG_HEAD.length) sh.getRange(1, 1, 1, BG_HEAD.length).setValues([BG_HEAD]);   /* v170.23.26: ستون بخش‌های تیک */
  sh.appendRow([day, Number(used.toFixed(1)), fmt(o), fmt(bgJson_('RSW:' + day)), Object.keys(sk).map(function (k) { return k + '=' + sk[k]; }).join(' '), fmt(bgJson_('RST:' + day))]);
}
try { TG_NIGHT_LINES.push(bgNightLine_); } catch (eNl) {}

/* ───── آزمون ───── */
function bgTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  var at = function (y, mo, d, h, mi) { TG_MEM['bg:now'] = String(pbTehran_(y, mo, d, h, mi).getTime()); TG_MEM['v16810:now'] = TG_MEM['bg:now']; bgReset_(); };
  try {
    at(2026, 10, 8, 10, 0);
    TG_MEM['bg:rs'] = { tgWatchdog: [5, 20 * 60000, 0], _c: 1 };
    ok('زیر ۵۵ دقیقه همه می‌روند', bgLevel_() === 0 && bgOk_('heavy', 'x') && bgOk_('light', 'y'));
    TG_MEM['bg:rs'] = { tgWatchdog: [5, 60 * 60000, 0] }; bgReset_();
    ok('بالای ۵۵: سنگین رد، سبک و واجب می‌روند', bgLevel_() === 1 && !bgOk_('heavy', 'h1') && bgOk_('light', 'l1') && bgOk_('must', 'm1'));
    TG_MEM['bg:rs'] = { tgWatchdog: [5, 80 * 60000, 0] }; bgReset_();
    ok('بالای ۷۵: فقط واجب', bgLevel_() === 2 && !bgOk_('heavy', 'h2') && !bgOk_('light', 'l2') && bgOk_('must', 'm2'));
    var ran = []; bgStep_('s1', 'light', function () { ran.push(1); }); bgStep_('s2', 'must', function () { ran.push(2); });
    ok('قدم سبک بالای ۷۵ اجرا نمی‌شود، واجب می‌شود', ran.join() === '2');
    bgStep_('s3', 'must', function () { throw new Error('نمونه'); });
    ok('خطای یک قدم بقیه را نمی‌شکند', true);
    bgFlush_();
    var sk = JSON.parse(TG_MEM['bgp:BGS:2026-10-08'] || '{}'), sw = JSON.parse(TG_MEM['bgp:RSW:2026-10-08'] || '{}');
    ok('ردشده‌ها و زمان قدم‌ها ثبت می‌شوند', sk.s1 === 1 && sw.s2 && sw.s2[0] === 1);
    var pr = bgPart_('lsTick_', function () { return 7; }); bgPart_('lsTick_', function () { return 0; });
    var thr = false; try { bgPart_('cmTick5_', function () { throw new Error('نمونه'); }); } catch (eP) { thr = true; }
    bgFlush_(); var st = JSON.parse(TG_MEM['bgp:RST:2026-10-08'] || '{}');
    ok('بخش‌های تیک ۵ دقیقه‌ای جدا شمرده می‌شوند (v170.23.26)', pr === 7 && thr && st.lsTick_ && st.lsTick_[0] === 2 && st.cmTick5_ && st.cmTick5_[0] === 1, JSON.stringify(st));
    ok('ستون بخش‌های تیک در سرتیتر تب', BG_HEAD.length === 6 && /تیک ۵/.test(BG_HEAD[5]));
    ok('خط گزارش شبانه: مصرف، بیشترین، ردشده', /سهمیهٔ اجرا: ۸۰٫۰|سهمیهٔ اجرا: ۸۰\.۰/.test(bgNightLine_()) || (/سهمیهٔ اجرا/.test(bgNightLine_()) && /رد شد/.test(bgNightLine_())), bgNightLine_());
    ok('در خط‌های گزارش شبانه ثبت است', TG_NIGHT_LINES.indexOf(bgNightLine_) > -1);

    /* tgDutyTick */
    at(2026, 10, 8, 3, 0);
    ok('شب (۳ صبح) tgDutyTick نمی‌رود', bgDutyPlan_().run === false);
    at(2026, 10, 8, 9, 0); TG_MEM['bg:pend'] = [];
    ok('بار اول (بی سابقه) خواندن کامل', bgDutyPlan_().run === true);
    bgDutyDone_();
    at(2026, 10, 8, 9, 5);
    ok('بی لید تازه و بی انتظار: بی خواندن شیت', bgDutyPlan_().run === false);
    bgLeadMark_();
    ok('لید تازه ← خواندن کامل', bgDutyPlan_().why === 'لید تازه');
    at(2026, 10, 8, 9, 10); bgDutyDone_();
    TG_MEM['bg:pend'] = [{ k: 'L-1', n: 1, t: TG_MEM['bg:now'] - 3 * 60000 }];
    ok('لید در انتظار پیش از موعد یادآوری: بی خواندن', bgDutyPlan_().run === false);
    TG_MEM['bg:pend'] = [{ k: 'L-1', n: 1, t: TG_MEM['bg:now'] - 25 * 60000 }];
    ok('موعد یادآوری نوبت‌دار ← خواندن کامل', bgDutyPlan_().why === 'نوبت اقدام');
    TG_MEM['bg:pend'] = [{ k: 'L-1', n: 0 }];
    ok('لیدی که هنوز به نوبت‌دار نرسیده ← خواندن کامل', bgDutyPlan_().run === true);
    TG_MEM['bg:pend'] = [{ k: 'L-1', n: 2, t: TG_MEM['bg:now'] - 60 * 60000 }];
    at(2026, 10, 8, 9, 50);
    ok('پیگیری در انتظار: هر ۳۰ دقیقه یک خواندن', bgDutyPlan_().why === 'پیگیری در انتظار');
    TG_MEM['bg:pend'] = []; at(2026, 10, 8, 13, 0);
    ok('بی هیچ نشانه، هر ۳ ساعت یک خواندن ایمنی', bgDutyPlan_().why === 'دورهٔ ایمنی');

    /* کمپین */
    ok('وضعیت کمپین سنجیده نشده: فعال فرض می‌شود', bgCpActive_() === true);
    ok('همه بسته ← غیرفعال', bgCpSet_([{ state: 'بسته' }]) === false && bgCpActive_() === false);
    ok('یک کمپین باز ← فعال', bgCpSet_([{ state: 'بسته' }, { state: 'باز' }]) === true && bgCpActive_() === true);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; bgReset_(); }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'bgTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['سهمیهٔ زمان اجرا (v170.23.12.5)', 'bgTests']); } catch (eBg) {}
