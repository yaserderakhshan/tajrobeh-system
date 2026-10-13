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
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_DRY_LEAD = keep.lead; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'lfTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['اصلاح یک‌بارهٔ شروع درمان (v170.61)', 'lfTests']); } catch (eLf) {}
