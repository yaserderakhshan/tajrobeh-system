/**
 * leadfix.gs · v170.61 · ۲۲ مهر ۱۴۰۵ · اصلاح یک‌بارهٔ لیدهایی که «شروع درمان؟ = بله» دارند ولی وضعیتشان «شروع درمان» نیست
 *
 * پیش از v170.59 تریگر ویرایش تب «لیدها» ستون ۲۳ («شروع درمان؟») را نمی‌دید؛ «بله» شدنش وضعیت را جلو نمی‌برد و قیف و داشبورد
 * کمتر از واقع نشان می‌دادند. اینجا همان لیدها پیدا می‌شوند و وضعیت هر کدام از مسیر اصلی ثبت تغییر (tgLeadSet_) به «شروع درمان»
 * می‌رود تا رویداد لید با برچسب «اصلاح یک‌باره ۲۲ مهر» ثبت شود.
 * اول خشک (lfStartFixDry): فقط شمار. اجرای واقعی (lfStartFix) جدا و فقط با تأیید یاسر.
 * خروجی فقط عدد است؛ هیچ نام، شماره یا کد لیدی بیرون نمی‌رود.
 * حالت خشک: TG_MEM['lf:rows'] ردیف‌های ساختگی تب لیدها (از ستون ۱ تا ۲۳).
 */
var LF_NOTE = 'اصلاح یک‌باره ۲۲ مهر';
var LF_COL_ST = 9, LF_COL_START = 23;

function lfDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
/* سطرهای جامانده: [{row}] */
function lfStartRows_() {
  var v;
  if (lfDry_()) v = TG_MEM['lf:rows'] || [];
  else {
    var sh = tgSS_().getSheetByName(TG_LEADS), last = sh ? sh.getLastRow() : 0;
    v = last < 2 ? [] : sh.getRange(2, 1, last - 1, LF_COL_START).getValues();
  }
  var out = [];
  for (var i = 0; i < v.length; i++) {
    var r = v[i];
    if (!String(r[3] || '').trim() && !String(r[5] || '').trim()) continue;   /* سطر خالی */
    if (String(r[LF_COL_START - 1] || '').trim() !== 'بله') continue;
    var st = tgStNorm_(String(r[LF_COL_ST - 1] || '')).st;
    if (st === TG_ST.START) continue;
    out.push({ row: i + 2, st: st || '' });
  }
  return out;
}
/** خشک: فقط شمار، به تفکیک وضعیت فعلی */
function lfStartFixDry() {
  var list = lfStartRows_(), by = {};
  list.forEach(function (x) { var k = x.st || 'خالی'; by[k] = (by[k] || 0) + 1; });
  return 'اصلاح شروع درمان (خشک): ' + list.length + ' لید' + (list.length ? ' · ' + Object.keys(by).map(function (k) { return k + ' ' + by[k]; }).join('، ') : '');
}
/** اجرای واقعی: از مسیر اصلی ثبت تغییر؛ فقط با تأیید یاسر */
function lfStartFix() {
  var list = lfStartRows_(), n = 0, bad = 0;
  list.forEach(function (x) {
    try { if (tgLeadSet_(x.row, { 'وضعیت': TG_ST.START }, 'بات', 'شیت', LF_NOTE) !== '') n++; else bad++; }
    catch (e) { bad++; tgErr_('lfStartFix', e); }
  });
  return 'اصلاح شروع درمان: ' + n + ' لید به «شروع درمان» رفت' + (bad ? ' · ناموفق ' + bad : '');
}

/* ───── v170.71: اجرای واقعی با تأیید یاسر (۲۳ مهر) و سنجش با خروجی خشک ─────
   خشک v170.61 در لاگ دیپلوی: ۱۸ لید · معارفه رزرو شد ۱۴، در پیگیری ۳، معارفه برگزار شد ۱. اگر فهرست امروز درست همین نباشد
   هیچ چیزی نوشته نمی‌شود. هر لید فقط از مسیر اصلی (tgLeadSet_) به «شروع درمان» می‌رود؛ قاعدهٔ لید بسته (v168) «اقدام بعدی» و
   تاریخش را پاک می‌کند و همین در خروجی شمرده می‌شود. اگر تغییری در ستون دیگری پیش‌بینی شود، باز هیچ چیزی نوشته نمی‌شود. */
var LF_EXPECT = { n: 18, by: { 'معارفه رزرو شد': 14, 'در پیگیری': 3, 'معارفه برگزار شد': 1 } };
var LF_OK_COLS = ['وضعیت', 'اقدام بعدی', 'تاریخ اقدام بعدی'];
function lfSameAsDry_(list) {
  var by = {}; list.forEach(function (x) { var k = x.st || 'خالی'; by[k] = (by[k] || 0) + 1; });
  var keys = Object.keys(by).concat(Object.keys(LF_EXPECT.by)).filter(function (k, i, a) { return a.indexOf(k) === i; });
  var diff = keys.filter(function (k) { return (by[k] || 0) !== (LF_EXPECT.by[k] || 0); });
  return { ok: list.length === LF_EXPECT.n && !diff.length, by: by, diff: diff };
}
/* تغییرهای پیش‌بینی‌شدهٔ هر لید (همان v168NextFix_ که tgLeadSet_ صدا می‌زند) */
function lfPlan_(x) {
  var cur;
  if (lfDry_()) cur = (TG_MEM['lf:cur'] || {})[x.row] || { status: x.st };
  else {
    var sh = tgSS_().getSheetByName(TG_LEADS);
    cur = v168CurFromRow_(sh.getRange(x.row, 1, 1, sh.getLastColumn()).getValues()[0], tgLeadHeadMap_(sh));
  }
  var ch = {}; ch['وضعیت'] = TG_ST.START;
  var fx = typeof v168NextFix_ === 'function' ? v168NextFix_(cur, ch).changes : ch;
  return Object.keys(fx).filter(function (k) {
    if (k === 'وضعیت') return true;
    var before = k === 'اقدام بعدی' ? cur.next : (k === 'تاریخ اقدام بعدی' ? cur.nextDate : null);
    return before === null || String(before || '').trim() !== String(fx[k] || '').trim();
  });
}
function lfStartFixGo_() {
  var list = lfStartRows_(), same = lfSameAsDry_(list);
  if (!same.ok) return 'ایست، چیزی نوشته نشد: فهرست امروز با خشک یکی نیست · ' + list.length + ' لید (خشک ۱۸) · فرق در: ' + (same.diff.join('، ') || 'شمار کل');
  var plans = list.map(lfPlan_), other = 0, nx = 0;
  plans.forEach(function (cols) { cols.forEach(function (k) { if (LF_OK_COLS.indexOf(k) < 0) other++; else if (k !== 'وضعیت') nx++; }); });
  if (other) return 'ایست، چیزی نوشته نشد: تغییر پیش‌بینی‌شده در ستونی جز وضعیت و اقدام بعدی (' + other + ')';
  var r = lfStartFix();
  return r + ' · همان خشک (۱۸: ۱۴، ۳، ۱) · اقدام بعدی و تاریخش طبق قاعدهٔ لید بسته: ' + nx + ' خانه';
}
function tgV17071StartFix() { return lfStartFixGo_(); }

/* یک‌بارهٔ خودکار v170.61: فقط خشک */
function tgV17061StartFixDry() { return lfStartFixDry(); }

function lfTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, lead: TG_DRY_LEAD };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; TG_DRY_LEAD = null;
  var mk = function (name, st, start) { var r = []; for (var i = 0; i < LF_COL_START; i++) r.push(''); r[3] = name; r[LF_COL_ST - 1] = st; r[LF_COL_START - 1] = start; return r; };
  try {
    TG_MEM['lf:rows'] = [mk('الف', 'معارفه برگزار شد', 'بله'), mk('ب', 'شروع درمان', 'بله'), mk('پ', 'در پیگیری', 'خیر'),
                         mk('ت', 'بسته', 'بله'), mk('', '', 'بله'), mk('ث', 'معارفه هماهنگ شد', 'بله')];
    var rows = lfStartRows_();
    ok('پیدا کردن: «بله» با وضعیت غیر «شروع درمان»؛ سطر خالی و «خیر» کنار', rows.map(function (x) { return x.row; }).join(',') === '2,5,7', JSON.stringify(rows));
    var d = lfStartFixDry();
    ok('خشک: فقط شمار، بی نام، بی نوشتن', /: 3 لید/.test(d) && !/الف|ث/.test(d) && !TG_OUTBOX.some(function (x) { return x.kind === 'leadset'; }), d);
    var o = lfStartFix(), sets = TG_OUTBOX.filter(function (x) { return x.kind === 'leadset'; });
    ok('اجرا: هر لید از مسیر اصلی ثبت تغییر به «شروع درمان»', sets.length === 3 && sets.every(function (x) { return x.changes['وضعیت'] === TG_ST.START; }) && /3 لید/.test(o), o);
    /* v170.71: اجرای واقعی فقط وقتی فهرست درست همان خشک است */
    var many = [];
    for (var k = 0; k < 14; k++) many.push(mk('ر' + k, 'معارفه رزرو شد', 'بله'));
    for (k = 0; k < 3; k++) many.push(mk('پ' + k, 'در پیگیری', 'بله'));
    many.push(mk('ب۱', 'معارفه برگزار شد', 'بله'), mk('ش', 'شروع درمان', 'بله'));
    TG_MEM['lf:rows'] = many.slice(0, 17).concat([many[18]]); TG_OUTBOX = [];
    var h = lfStartFixGo_();
    ok('واقعی: فهرست با خشک نمی‌خواند ← ایست، هیچ نوشتنی', /^ایست/.test(h) && !TG_OUTBOX.some(function (x) { return x.kind === 'leadset'; }), h);
    TG_MEM['lf:rows'] = many; TG_OUTBOX = [];
    var g = lfStartFixGo_(), gs = TG_OUTBOX.filter(function (x) { return x.kind === 'leadset'; });
    ok('واقعی: همان ۱۸ لید خشک، فقط وضعیت از مسیر اصلی', gs.length === 18 && gs.every(function (x) { return x.changes['وضعیت'] === TG_ST.START; }) && /18 لید/.test(g) && /همان خشک/.test(g), g);
    ok('واقعی: خروجی بی نام و زیر ۲۰۰ نویسه', !/ر\d|ب۱/.test(g) && g.length < 200, g);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_DRY_LEAD = keep.lead; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'lfTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['اصلاح یک‌بارهٔ شروع درمان (v170.61)', 'lfTests']); } catch (eLf) {}
