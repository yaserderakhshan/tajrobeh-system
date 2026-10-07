/**
 * sesslen.gs · v170.23.10 · طول جلسهٔ قابل ویرایش برای هر درمانگر و روان‌پزشک
 *
 * - نوع جلسه‌ها: «درمان» (همهٔ درمانگرها)، «ویزیت اول» و «پیگیری» (فقط روان‌پزشک‌ها، استخر psy).
 * - پیش‌فرض‌ها همان قبلی: درمان TG_SESS_MIN_DEF (۵۰)، ویزیت اول ۴۰ و پیگیری ۲۰ (یا کلیدهای PSY_FIRST_MIN و PSY_FOLLOW_MIN اگر پر شده‌اند).
 * - مقدار هر نفر در برگهٔ «درمانگران» هاب پذیرش، یک ستون برای هر نوع (ستون درمان همان «طول جلسهٔ درمان (دقیقه)» قبلی است؛
 *   دو ستون تازه و ستون «تغییر طول جلسه» ته برگه ساخته می‌شوند و هیچ ستونی جابه‌جا نمی‌شود). خالی یعنی پیش‌فرض.
 * - بازه: ۱۵ تا ۱۲۰ دقیقه. دکمه‌های آماده ۲۰، ۳۰، ۴۰، ۴۵، ۵۰، ۶۰، ۹۰، «عدد دلخواه» و «برگشت به پیش‌فرض».
 * - چه کسی: خود درمانگر یا روان‌پزشک (دکمهٔ «⏱ طول جلسه و استراحت» در بات و مینی‌اپ)؛ پذیرش و مالک برای هر نفر («/sesslen» یا دکمهٔ میز پذیرش).
 *   هر تغییر با «چه کسی، کی، چه» در ستون «تغییر طول جلسه» ثبت می‌شود (پنج تغییر آخر).
 * - مصرف: ساخت وقت‌های خالی (tgScLen_)، رزرو و رویداد تقویم و یادآوری (tgOnSessBook_ طول را در ردیف نوبت می‌نویسد)، نوبت روان‌پزشکی.
 *   نوبت‌های قبلی طول ثبت‌شدهٔ خودشان را دارند و عوض نمی‌شوند.
 */
var TG_LEN_KINDS = [
  { k: 's', kind: 'درمان', label: 'جلسهٔ درمان', head: 'طول جلسهٔ درمان (دقیقه)', psy: false },
  { k: 'f', kind: 'ویزیت اول', label: 'ویزیت اول روان‌پزشکی', head: 'طول ویزیت اول روان‌پزشکی (دقیقه)', psy: true },
  { k: 'u', kind: 'پیگیری', label: 'ویزیت پیگیری روان‌پزشکی', head: 'طول پیگیری روان‌پزشکی (دقیقه)', psy: true }
];
var TG_LEN_LOG_HEAD = 'تغییر طول جلسه';
var TG_LEN_MIN = 15, TG_LEN_MAX = 120;
var TG_LEN_PRESETS = [20, 30, 40, 45, 50, 60, 90];
var TG_LEN_DESK_BTN = '⏱ طول جلسهٔ همکاران';

function tgLenKind_(k) { return TG_LEN_KINDS.filter(function (x) { return x.k === k || x.kind === k; })[0] || null; }
function tgLenIsPsy_(name) { return typeof tgPoolHas_ === 'function' && tgPoolHas_(name, 'psy'); }
function tgLenKindsFor_(name) { var p = tgLenIsPsy_(name); return TG_LEN_KINDS.filter(function (x) { return !x.psy || p; }); }
/* کلیدهای روان‌پزشکی را بی ثبت در TG_CFG_SEEN می‌خواند (ثبت و توضیحشان با psy3.gs است) */
function tgLenCfgNum_(key) { try { return Number(tgLatinDigits_(String(cfgAll_()[key] || ''))) || 0; } catch (e) { return 0; } }
function tgLenDef_(kind) {
  var x = tgLenKind_(kind); if (!x) return TG_SESS_MIN_DEF;
  if (x.k === 'f') return tgLenCfgNum_('PSY_FIRST_MIN') || 40;
  if (x.k === 'u') return tgLenCfgNum_('PSY_FOLLOW_MIN') || 20;
  return TG_SESS_MIN_DEF;
}
function tgLenOk_(n) { n = Number(n); return n >= TG_LEN_MIN && n <= TG_LEN_MAX && Math.floor(n) === n; }
/** مقدار خود این نفر برای این نوع، یا ۰ اگر خالی یا خارج از بازه است */
function tgLenOwn_(name, kind) { var x = tgLenKind_(kind); if (!x || !name) return 0; var n = tgScTherNum_(name, x.head); return tgLenOk_(n) ? n : 0; }
/** طول جلسهٔ این نفر برای این نوع: مقدار خودش، وگرنه پیش‌فرض */
function tgLenFor_(name, kind) { return tgLenOwn_(name, kind) || tgLenDef_(kind); }
/** گام ساخت وقت‌های خالی درمان: روان‌پزشک با طول ویزیت اول (بلندترین)، بقیه با طول درمان */
function tgLenSlot_(name) { return tgLenIsPsy_(name) ? tgLenFor_(name, 'ویزیت اول') : tgLenFor_(name, 'درمان'); }
/** نوع نوبت تازه: برای روان‌پزشک ویزیت اول یا پیگیری (از سابقهٔ همین مراجع با همین پزشک)، وگرنه درمان */
function tgLenBookKind_(name, chat, dateIso) {
  if (!tgLenIsPsy_(name)) return 'درمان';
  if (typeof ps3KindFor_ === 'function') { try { return ps3KindFor_(name, chat); } catch (e) {} }
  var prev = tgSessRows_().filter(function (r) { return tgNorm_(r.name) === tgNorm_(name) && String(r.chat) === String(chat) && r.status !== 'لغو شده' && r.status !== 'لغو شد' && (!dateIso || r.dateIso < dateIso); }).length;
  return prev ? 'پیگیری' : 'ویزیت اول';
}
function tgLenBook_(name, chat, dateIso) { return tgLenFor_(name, tgLenBookKind_(name, chat, dateIso)); }

/* ───── ثبت ───── */
function tgScTherStr_(name, head) {
  if (TG_DRY) return String(TG_MEM['schnum:' + name + ':' + head] || '');
  try {
    var sh = tgSS_().getSheetByName(TG_THER), col = tgScTherCol_(head);
    if (!sh || !col || sh.getLastRow() < 4) return '';
    var key = tgNorm_(name), v = sh.getRange(4, 1, sh.getLastRow() - 3, 1).getValues();
    for (var i = 0; i < v.length; i++) if (tgNorm_(String(v[i][0])) === key) return String(sh.getRange(i + 4, col).getValue() || '');
  } catch (e) { tgErr_('tgScTherStr_', e); }
  return '';
}
/** n = عدد یا '' (برگشت به پیش‌فرض). by = نام کسی که عوض کرد. فقط نوبت‌های تازه اثر می‌گیرند. */
function tgLenSet_(name, kind, n, by) {
  var x = tgLenKind_(kind); if (!x || !name) return false;
  if (n !== '' && !tgLenOk_(n)) return false;
  var old = tgLenOwn_(name, x.kind);
  if (!tgScTherSet_(name, x.head, n === '' ? '' : Number(n))) return false;
  var line = (by || 'نامعلوم') + ' · ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + x.kind + ': ' +
    (old ? old : 'پیش‌فرض') + ' ← ' + (n === '' ? 'پیش‌فرض (' + tgLenDef_(x.kind) + ')' : n);
  var log = tgScTherStr_(name, TG_LEN_LOG_HEAD).split('\n').filter(String);
  log.unshift(line);
  tgScTherSet_(name, TG_LEN_LOG_HEAD, log.slice(0, 5).join('\n'));
  return true;
}

/* ───── دسترسی و هدف ───── */
function tgLenIsOwner_(chat) { return !!TG_OWNER_CHAT && String(chat) === String(TG_OWNER_CHAT); }
function tgLenCanOthers_(chat) { if (tgLenIsOwner_(chat)) return true; try { return !!tgWhoDesk_(chat, ''); } catch (e) { return false; } }
function tgLenByName_(chat) {
  if (tgLenIsOwner_(chat)) return 'مالک';
  try { var d = tgWhoDesk_(chat, ''); if (d && d.name) return 'پذیرش · ' + d.name; } catch (e) {}
  try { var t = tgWhoTherapist_(chat); if (t && t.name) return t.name; } catch (e2) {}
  return 'نامعلوم';
}
/** کسی که الان تنظیمش باز است: انتخاب پذیرش یا مالک، وگرنه خود درمانگر */
function tgLenTarget_(chat) {
  var t = tgGetVal_('lnt', chat);
  if (t && tgLenCanOthers_(chat)) return t;
  var me = tgWhoTherapist_(chat);
  return me ? me.name : '';
}

/* ───── کارت ───── */
function tgLenCard_(chat, name) {
  if (!name) return tgSend_(chat, 'این بخش برای درمانگرها، روان‌پزشک‌ها، پذیرش و مالک است.');
  var other = tgGetVal_('lnt', chat) && tgLenCanOthers_(chat);
  var L = ['⏱ <b>طول جلسه</b>' + (other ? ' · ' + tgEsc_(name) : ''), ''];
  var kb = [];
  tgLenKindsFor_(name).forEach(function (x) {
    var own = tgLenOwn_(name, x.kind);
    L.push('• ' + x.label + ': ' + tgFa_(own || tgLenDef_(x.kind)) + ' دقیقه' + (own ? '' : ' (پیش‌فرض)'));
    kb.push([{ text: '✏️ ' + x.label, callback_data: 'ln:o:' + x.k }]);
  });
  L.push('• استراحت بین دو جلسه: ' + tgFa_(tgScGap_(name)) + ' دقیقه');
  kb.push([{ text: '☕ استراحت بین جلسه‌ها', callback_data: 'ln:g' }]);
  L.push('', 'تغییر فقط روی نوبت‌های تازه اثر دارد؛ نوبت‌های رزروشده همان می‌مانند.');
  if (tgLenCanOthers_(chat)) kb.push([{ text: '👥 یک نفر دیگر', callback_data: 'ln:pg:0' }]);
  return tgSend_(chat, L.join('\n'), { inline_keyboard: kb });
}
function tgLenKindCard_(chat, name, k) {
  var x = tgLenKind_(k); if (!x || !name) return null;
  var own = tgLenOwn_(name, x.kind), cur = own || tgLenDef_(x.kind);
  var row = function (a) { return a.map(function (n) { return { text: (n === cur ? '✓ ' : '') + tgFa_(n), callback_data: 'ln:v:' + x.k + ':' + n }; }); };
  var kb = [row(TG_LEN_PRESETS.slice(0, 4)), row(TG_LEN_PRESETS.slice(4)),
    [{ text: '✍️ عدد دلخواه', callback_data: 'ln:c:' + x.k }, { text: '↩️ برگشت به پیش‌فرض', callback_data: 'ln:d:' + x.k }],
    [{ text: '« برگشت', callback_data: 'ln:b' }]];
  return tgSend_(chat, '⏱ <b>' + x.label + '</b>' + (tgGetVal_('lnt', chat) && tgLenCanOthers_(chat) ? ' · ' + tgEsc_(name) : '') +
    '\nالان: ' + tgFa_(cur) + ' دقیقه' + (own ? '' : ' (پیش‌فرض)') + ' · پیش‌فرض: ' + tgFa_(tgLenDef_(x.kind)) + ' دقیقه', { inline_keyboard: kb });
}
function tgLenDone_(chat, name, k, n) {
  var x = tgLenKind_(k), by = tgLenByName_(chat);
  if (!tgLenSet_(name, x.kind, n, by)) return tgSend_(chat, 'ثبت نشد؛ عددی بین ۱۵ تا ۱۲۰ لازم است.');
  tgSend_(chat, '✅ ' + x.label + ': ' + (n === '' ? 'برگشت به پیش‌فرض (' + tgFa_(tgLenDef_(x.kind)) + ' دقیقه)' : tgFa_(n) + ' دقیقه') + '. فقط نوبت‌های تازه.');
  /* اگر پذیرش یا مالک عوض کرد، خود آن نفر یک خط خبر می‌گیرد */
  var me = null; try { me = tgWhoTherapist_(chat); } catch (e) {}
  if (!me || tgNorm_(me.name) !== tgNorm_(name)) {
    try {
      var row = tgTherapistRows_().filter(function (t) { return tgNorm_(t.name) === tgNorm_(name); })[0], c = row ? String(row.chat || '').split(/[,،;\s]+/).filter(String)[0] : '';
      if (c) tgNotify_(c, TG_NK.sys, '⏱ ' + x.label + ' شما ' + (n === '' ? 'به پیش‌فرض برگشت' : tgFa_(n) + ' دقیقه شد') + ' (از نوبت‌های تازه).', { ref: 'LEN' });
    } catch (e2) {}
  }
  return tgLenCard_(chat, name);
}

/* ───── فهرست افراد برای پذیرش و مالک ───── */
function tgLenPeople_() {
  return tgTherapistRows_().filter(function (t) { return t.name && String(t.status || '').indexOf('پایان') < 0; })
    .map(function (t) { return t.name; }).sort(function (a, b) { return a < b ? -1 : 1; });
}
function tgLenPick_(chat, page) {
  if (!tgLenCanOthers_(chat)) return tgSend_(chat, 'این بخش مخصوص پذیرش و مالک است.');
  var names = tgLenPeople_(), per = 10, p = Math.max(0, Number(page) || 0);
  tgSetVal_('lnl', chat, JSON.stringify(names));
  var kb = names.slice(p * per, p * per + per).map(function (n, i) { return [{ text: (tgLenIsPsy_(n) ? '💊 ' : '') + n, callback_data: 'ln:p:' + (p * per + i) }]; });
  var nav = [];
  if (p > 0) nav.push({ text: '« قبلی', callback_data: 'ln:pg:' + (p - 1) });
  if ((p + 1) * per < names.length) nav.push({ text: 'بعدی »', callback_data: 'ln:pg:' + (p + 1) });
  if (nav.length) kb.push(nav);
  return tgSend_(chat, '⏱ <b>طول جلسهٔ همکاران</b>\nبرای چه کسی؟', { inline_keyboard: kb });
}

/* ───── ورودی‌ها ───── */
function tgLenStart_(chat) { tgDel_('lnt', chat); tgDel_('lnc', chat); var me = tgWhoTherapist_(chat); return me ? tgLenCard_(chat, me.name) : (tgLenCanOthers_(chat) ? tgLenPick_(chat, 0) : tgLenCard_(chat, '')); }
function tgLenCb_(chat, data) {
  var a = String(data).split(':'), act = a[1];
  if (act === 'pg') return tgLenPick_(chat, a[2]);
  if (act === 'p') {
    if (!tgLenCanOthers_(chat)) return tgSend_(chat, 'این بخش مخصوص پذیرش و مالک است.');
    var names = []; try { names = JSON.parse(tgGetVal_('lnl', chat) || '[]'); } catch (e) {}
    var n = names[Number(a[2])]; if (!n) return tgLenPick_(chat, 0);
    tgSetVal_('lnt', chat, n);
    return tgLenCard_(chat, n);
  }
  var name = tgLenTarget_(chat);
  if (!name) return tgSend_(chat, 'این بخش برای درمانگرها، روان‌پزشک‌ها، پذیرش و مالک است.');
  if (act === 'b') { tgDel_('lnc', chat); return tgLenCard_(chat, name); }
  if (act === 'o') return tgLenKindCard_(chat, name, a[2]);
  if (act === 'v') return tgLenDone_(chat, name, a[2], Number(a[3]));
  if (act === 'd') return tgLenDone_(chat, name, a[2], '');
  if (act === 'c') { tgSetVal_('lnc', chat, a[2]); return tgSend_(chat, 'طول را به دقیقه بنویسید، بین ۱۵ تا ۱۲۰. برای بی‌خیال شدن «انصراف».'); }
  if (act === 'g') {
    if (tgGetVal_('lnt', chat) && tgLenCanOthers_(chat)) { tgSetVal_('lnc', chat, 'g'); return tgSend_(chat, 'فاصلهٔ استراحت بین دو جلسه را بنویسید، بین ۰ تا ۶۰ دقیقه.'); }
    tgSetVal_('scg', chat, 'gap');
    return tgSend_(chat, 'فاصلهٔ استراحت بین دو جلسه را بنویسید، بین ۰ تا ۶۰ دقیقه.');
  }
  return null;
}
/** پاسخ متنی «عدد دلخواه» (و استراحتِ کسی دیگر برای پذیرش)؛ true یعنی مصرف شد */
function tgLenText_(chat, text) {
  var k = tgGetVal_('lnc', chat); if (!k) return false;
  var t = String(text || '').trim();
  if (!t) return false;
  if (t === 'انصراف' || t === '↩️ بازگشت' || t.indexOf('/') === 0) { tgDel_('lnc', chat); tgSend_(chat, 'لغو شد.'); return true; }
  var name = tgLenTarget_(chat); if (!name) { tgDel_('lnc', chat); return false; }
  var n = Number(tgLatinDigits_(t).replace(/[^0-9]/g, ''));
  if (k === 'g') {
    if (!(t.match(/\d|[۰-۹]/) && n >= 0 && n <= TG_GAP_MAX)) { tgSend_(chat, 'یک عدد بین ۰ تا ۶۰ بنویسید.'); return true; }
    tgDel_('lnc', chat); tgScTherSet_(name, TG_HEAD_GAP, n);
    tgSend_(chat, '✅ استراحت ' + tgFa_(n) + ' دقیقه شد.');
    tgLenCard_(chat, name); return true;
  }
  if (!tgLenOk_(n)) { tgSend_(chat, 'یک عدد بین ۱۵ تا ۱۲۰ بنویسید.'); return true; }
  tgDel_('lnc', chat);
  tgLenDone_(chat, name, k, n);
  return true;
}

/* ───── آزمون ───── */
function tgLenTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT, th: TG_DRY_THER };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = {}; TG_CFG_ = {};
  TG_OWNER_CHAT = '9001';
  var _pool = tgPoolHas_;
  try {
    tgPoolHas_ = function (n, p) { return p === 'psy' && n === 'پزشک نمونه'; };
    var D = 'درمانگر نمونه', P = 'پزشک نمونه';
    ok('پیش‌فرض درمان همان قبلی', tgLenFor_(D, 'درمان') === TG_SESS_MIN_DEF && tgTherSlen_(D) === TG_SESS_MIN_DEF);
    ok('پیش‌فرض ویزیت اول ۴۰ و پیگیری ۲۰', tgLenFor_(P, 'ویزیت اول') === 40 && tgLenFor_(P, 'پیگیری') === 20);
    TG_CFG_ = { PSY_FIRST_MIN: '35' };
    ok('پیش‌فرض روان‌پزشکی از کلید تنظیمات، بی ثبت تازه', tgLenFor_(P, 'ویزیت اول') === 35 && !('PSY_FIRST_MIN' in TG_CFG_SEEN && TG_CFG_SEEN.PSY_FIRST_MIN !== ''));
    TG_CFG_ = {};
    ok('نوع‌های درمانگر فقط درمان', tgLenKindsFor_(D).length === 1);
    ok('نوع‌های روان‌پزشک سه تا', tgLenKindsFor_(P).length === 3);
    ok('مقدار خارج از بازه ثبت نمی‌شود', tgLenSet_(D, 'درمان', 10, 'آزمون') === false && tgLenSet_(D, 'درمان', 121, 'آزمون') === false);
    ok('مقدار دلخواه درمان ثبت و خوانده می‌شود', tgLenSet_(D, 'درمان', 45, 'آزمون') && tgLenFor_(D, 'درمان') === 45 && tgTherSlen_(D) === 45 && tgScLen_(D, TG_KIND_SESS) === 45);
    ok('ثبت تغییر: چه کسی، کی، چه', /^آزمون · \d{4}-\d\d-\d\d \d\d:\d\d · درمان: پیش‌فرض ← 45$/.test(tgScTherStr_(D, TG_LEN_LOG_HEAD)), tgScTherStr_(D, TG_LEN_LOG_HEAD));
    tgLenSet_(D, 'درمان', '', 'آزمون');
    ok('برگشت به پیش‌فرض', tgLenFor_(D, 'درمان') === TG_SESS_MIN_DEF && tgScTherStr_(D, TG_LEN_LOG_HEAD).split('\n').length === 2);
    ok('گام وقت‌های روان‌پزشک با طول ویزیت اول', (tgLenSet_(P, 'ویزیت اول', 30, 'آزمون'), tgScLen_(P, TG_KIND_SESS) === 30));
    ok('معارفه دست نخورد', tgScLen_(D, TG_KIND_MEET) === TG_SLOT_MIN);
    /* رزرو: نوع از سابقه؛ نوبت قبلی دست نمی‌خورد */
    TG_MEM['sessrows'] = [];
    ok('اولین نوبت روان‌پزشک ← ویزیت اول', tgLenBookKind_(P, '501', '2026-10-20') === 'ویزیت اول' && tgLenBook_(P, '501', '2026-10-20') === 30);
    TG_MEM['sessrows'] = [{ name: P, dateIso: '2026-10-13', hhmm: '10:00', len: 30, chat: '501', status: 'رزرو شده' }];
    TG_MEM['ps3:visits'] = [{ 'chat مراجع': '501', 'روان‌پزشک': P, 'انجام': 'انجام شد' }];   /* با psy3: نوع از ویزیت انجام‌شده */
    tgLenSet_(P, 'پیگیری', 25, 'آزمون');
    ok('نوبت بعدی همان مراجع ← پیگیری با طول تازه', tgLenBook_(P, '501', '2026-10-20') === 25);
    ok('طول نوبت رزروشده عوض نشد', TG_MEM['sessrows'][0].len === 30);
    ok('نوبت درمانگر عادی ← درمان', tgLenBookKind_(D, '501', '2026-10-20') === 'درمان');
    ok('ویزیت روان‌پزشکی (psy3) همان طول تنظیم‌شده را می‌گیرد', typeof ps3OnBook_ !== 'function' || (function () { TG_MEM['ps3:visits'] = []; var o = ps3OnBook_({ code: 'PS-T' }, { therapist: P, dateIso: '2026-10-21', hhmm: '10:00' }, '777'); return o && String(o['مدت']) === '30'; })());
    /* دسترسی و کارت */
    TG_DRY_THER = { name: D, chat: '700' };
    TG_OUTBOX = []; tgLenStart_('700');
    var last = TG_OUTBOX[TG_OUTBOX.length - 1];
    ok('کارت خود درمانگر با «برگشت به پیش‌فرض» در زیرکارت', last && /طول جلسه/.test(last.text) && (TG_OUTBOX = [], tgLenCb_('700', 'ln:o:s'), /ln:d:s/.test(JSON.stringify(TG_OUTBOX))));
    ok('دکمهٔ آماده ثبت می‌کند', (tgLenCb_('700', 'ln:v:s:60'), tgLenFor_(D, 'درمان') === 60));
    tgLenCb_('700', 'ln:c:s');
    ok('عدد دلخواه نامعتبر رد می‌شود', tgLenText_('700', '۱۰') === true && tgGetVal_('lnc', '700') === 's');
    ok('عدد دلخواه ثبت می‌شود', tgLenText_('700', '۷۵') === true && tgLenFor_(D, 'درمان') === 75 && !tgGetVal_('lnc', '700'));
    ok('درمانگر نمی‌تواند دیگری را انتخاب کند', (TG_OUTBOX = [], tgLenCb_('700', 'ln:pg:0'), /مخصوص پذیرش/.test(TG_OUTBOX[0].text)));
    TG_DRY_THER = null; TG_MEM['deskwho'] = { name: 'پذیرش نمونه', chat: '800' };
    TG_MEM['trows'] = null;
    var _rows = tgTherapistRows_;
    tgTherapistRows_ = function () { return [{ name: D, chat: '700', status: 'فعال' }, { name: P, chat: '701', status: 'فعال' }, { name: 'قدیمی', status: 'پایان همکاری' }]; };
    TG_OUTBOX = []; tgLenCb_('800', 'ln:pg:0');
    ok('پذیرش فهرست می‌بیند، بی همکاری‌های پایان‌یافته', /ln:p:0/.test(JSON.stringify(TG_OUTBOX)) && JSON.stringify(TG_OUTBOX).indexOf('قدیمی') < 0);
    tgLenCb_('800', 'ln:p:1');
    TG_MEM['notify'] = []; TG_OUTBOX = [];
    tgLenCb_('800', 'ln:v:u:40');
    ok('پذیرش برای روان‌پزشک ثبت می‌کند و نام خودش ثبت می‌شود', tgLenFor_(P, 'پیگیری') === 40 && tgScTherStr_(P, TG_LEN_LOG_HEAD).indexOf('پذیرش · پذیرش نمونه') === 0);
    ok('خود روان‌پزشک یک خط خبر می‌گیرد', (TG_MEM['notify'] || []).some(function (x) { return x.chat === '701'; }));
    TG_MEM['deskwho'] = null;
    tgLenCb_('9001', 'ln:pg:0'); tgLenCb_('9001', 'ln:p:0');
    ok('مالک هم می‌تواند', (tgLenCb_('9001', 'ln:v:s:90'), tgLenFor_(D, 'درمان') === 90) && tgScTherStr_(D, TG_LEN_LOG_HEAD).indexOf('مالک') === 0);
    tgTherapistRows_ = _rows;
    ok('کد دکمه زیر ۶۴ بایت', 'ln:v:u:120'.length <= 64 && 'ln:pg:99'.length <= 64);
    ok('lnc در کلیدهای کش هر پیام', TG_MEMO_KEYS.indexOf('lnc') > -1);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { tgPoolHas_ = _pool; TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own; TG_DRY_THER = keep.th; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'tgLenTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['طول جلسهٔ قابل ویرایش (v170.23.10)', 'tgLenTests']); } catch (eLn) {}
