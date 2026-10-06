/**
 * inbox.gs · v170.28 · صندوق یکتا (بند و۹، تصمیم یاسر)
 *
 * یک فهرست واحد روی همهٔ ورودی‌ها: تیکت، باگ، پیام، صندوق پیام، تماس همکار، سوپرویژن، حضوری، پارتنر، درخواست متوقف،
 * واتس‌اپ و جواب به پیام‌های بات. هر رشته یک سطر در تب «صندوق یکتا» با صاحب، مهلت، وضعیت و رد پا («صندوق یکتا · رد پا»).
 *
 * - منبع‌ها جای خودشان می‌مانند (تب‌های فعلی دست نمی‌خورند)؛ صندوق یکتا نمایه و قاعده است:
 *   قلاب لحظه‌ای در نویسنده‌ها (تیکت، پاسخ تیکت، باگ، پیام، واتس‌اپ) + همگام‌سازی ساعتی از روی سرستون تب‌ها (INB_SRC).
 * - صاحب: ستون صاحب منبع؛ وگرنه صف منبع؛ وگرنه مسیریاب جمنای (aiRoute_، فقط با کلید پولی و اطمینان ≥ ۰٫۷). کمتر از آستانه یا بحران ← آدم (مدیر عملیات).
 * - «بسته» فقط با پاسخ واقعی یا علت انتخاب‌شده (INB_REASONS). منبعی که بی پاسخ بسته شد، «بسته بی پاسخ» می‌خورد و صاحب باید علت بزند.
 * - جواب به پیامی که بات از طرف تیم فرستاده (reply در گفت‌وگوی خصوصی) به صاحب همان کار می‌رسد، با دکمهٔ «پاسخ» و «بستن».
 * - مهلت از INB_SLA (ساعت، به تفکیک صف). گذشته از مهلت: روزی یک یادآوری به صاحب؛ بعد از سه یادآوری ← مدیر عملیات.
 * - شاخص‌ها (زمان تا اولین پاسخ، زمان تا بستن، درصد بسته در مهلت) و «پیشنهاد خودکارسازی» هفتگی (جمعه ۱۰).
 * - ورودی موازی تازه ممنوع: .github/scripts/inbox-guard.mjs هر تب ورودی‌مانندی که نه در INB_SRC است نه در INB_NOT_INBOUND را رد می‌کند.
 * اسم مراجع در هیچ گزارشی نمی‌آید؛ گزارش‌ها فقط شمار و کد دارند.
 */
var INB_TAB = 'صندوق یکتا';
var INB_HEAD = ['شناسه', 'زمان', 'منبع', 'کد مرجع', 'صف', 'نوع', 'chat', 'خلاصه', 'صاحب', 'مهلت', 'وضعیت', 'اولین پاسخ', 'دقیقه تا اولین پاسخ',
  'بسته شد', 'دقیقه تا بستن', 'علت بستن', 'در مهلت', 'یادآوری', 'مسیریاب', 'آخرین تغییر'];
var INB_EV_TAB = 'صندوق یکتا · رد پا';
var INB_EV_HEAD = ['زمان', 'شناسه', 'کد مرجع', 'قدم', 'کی', 'یادداشت'];
var INB_KPI_TAB = 'صندوق یکتا · شاخص‌ها';
var INB_ST = { open: 'باز', replied: 'پاسخ داده شد', closed: 'بسته', noreply: 'بسته بی پاسخ' };
var INB_REASONS = ['تکراری', 'اسپم یا بی‌ربط', 'نیاز به پاسخ نداشت', 'در کانال دیگر پاسخ داده شد', 'منصرف شد'];
var INB_Q_KEY = { 'پذیرش': 'reception', 'مدرسه': 'school', 'روان‌پزشکی': 'psy', 'حضوری': 'reception', 'مالی': 'ops', 'پارتنر': 'ops', 'فنی': 'ops', 'مدیریت': 'ops' };
var INB_SLA_H = { 'پذیرش': 4, 'حضوری': 24, 'مالی': 24, 'مدرسه': 24, 'روان‌پزشکی': 24, 'پارتنر': 48, 'فنی': 72, 'مدیریت': 24 };
var INB_ESC_N = 3;
var INB_BTN = '📮 صندوق من';
cfg_('INB_SLA', {});   /* {"صف": ساعت} برای عوض کردن مهلت‌ها؛ خالی = پیش‌فرض کد */

/* منبع‌های تب‌دار (همگام‌سازی از روی سرستون). ref خالی = شمارهٔ سطر. self: تصمیم خود منبع (تأیید یا رد) پاسخ واقعی است. */
var INB_SRC = [
  { k: 'tk', label: 'تیکت', tab: 'TG_TK_TAB', ref: 'شمارهٔ پیگیری', at: 'زمان ثبت', chat: 'chat_id', text: ['موضوع', 'متن'], owner: 'مسئول', st: 'وضعیت', reply: 'پاسخ', replyAt: 'تاریخ پاسخ', closed: /پاسخ داده شد|بسته|لغو/, q: 'پذیرش' },
  { k: 'bug', label: 'باگ', tab: 'TG_BUG_TAB', ref: 'شماره', at: 'زمان ثبت', chat: 'chat_id', text: ['نوع', 'متن'], st: 'وضعیت', reply: 'یادداشت بررسی', replyAt: 'تاریخ بررسی', closed: /درست شد|فعلاً نه/, q: 'فنی' },
  { k: 'coll', label: 'تماس همکار', tab: 'TG_COLL_TAB', chat: 'chat_id', text: ['موضوع'], st: 'وضعیت', reply: 'یادداشت', replyAt: 'تاریخ تماس', closed: /انجام شد|بسته|تماس گرفته شد/, self: true, q: 'پذیرش' },
  { k: 'sup', label: 'سوپرویژن', tab: 'TG_SUP_TAB', ss: 'school', chat: 'chat_id', text: ['رویکرد'], st: 'وضعیت', closed: /هماهنگ شد|انجام شد|بسته|لغو/, self: true, q: 'مدرسه' },
  { k: 'inp', label: 'حضوری', tab: 'TG_INP_REQ', ref: 'شناسه', at: 'زمان', chat: 'chat', text: ['مکان', 'روز', 'از ساعت', 'متن'], st: 'وضعیت', reply: 'پاسخ پذیرش', replyAt: 'زمان پاسخ', closed: /تأیید شد|رد شد/, self: true, q: 'حضوری' },
  { k: 'pa', label: 'پارتنر', tab: 'TG_PA_RTAB', ref: 'کد', at: 'زمان', chat: 'chat_id', text: ['شهر', 'توضیح درمانگر'], st: 'وضعیت', reply: 'پاسخ پارتنر', replyAt: 'زمان پاسخ', closed: /تأیید پارتنر|رد پارتنر|فعال شد/, self: true, q: 'پارتنر' },
  { k: 'stk', label: 'درخواست متوقف', tab: 'STK_TAB', ref: 'کد', at: 'زمان ثبت', text: ['نوع', 'دلیل دقیق توقف'], owner: 'مسئول', st: 'وضعیت', replyAt: 'زمان حل', why: 'علت', closed: /حل شد/, self: true, q: 'پذیرش' },
  { k: 'box', label: 'صندوق پیام', tab: 'TG_BOX_TAB', box: true, q: 'پذیرش' }
];
/* منبع‌های بی‌تب (فقط قلاب لحظه‌ای) */
var INB_HOOK = { msg: { label: 'پیام', q: '' }, wa: { label: 'واتس‌اپ', q: 'پذیرش' }, re: { label: 'جواب به پیام بات', q: '' } };
/* تب‌هایی که اسمشان شبیه ورودی است ولی ورودی تازه نیستند (بایگانی، خروجی، گزارش). هر تب ورودی تازه یا در INB_SRC یا اینجا با دلیل. */
var INB_NOT_INBOUND = {
  TG_MSG_LOG: 'بایگانی خام پیام‌ها؛ رشته‌ها با قلاب msg وارد صندوق می‌شوند',
  TAB_INBOX: 'بایگانی خام واتس‌اپ؛ با قلاب wa وارد صندوق می‌شود',
  TG_FB_LOG: 'بازخورد «برای نسخهٔ بعد»؛ تصمیم ناظر دارد، صاحب و مهلت ندارد (مرحلهٔ بعد)',
  TG_OUT_TAB: 'خروجی', TG_QUEUE_TAB: 'صف خروجی', DQ_TAB: 'صف خروجی مدیریت',
  INB_TAB: 'خود صندوق', INB_EV_TAB: 'رد پای صندوق', INB_KPI_TAB: 'شاخص‌های صندوق',
  TG_INP_DEM: 'تقاضای بی‌ظرفیت؛ کارش در درخواست حضوری است', TG_LEAD_EV_TAB: 'رد پای لید',
  TG_POLICY_TAB: 'تنظیم سیاست خروجی', TG_BC_TAB: 'خروجی همگانی',
  TG_WF_TAB: 'نظرسنجی وبینار؛ پاسخ لازم ندارد', TG_EVF_TAB: 'نظرسنجی رویداد؛ پاسخ لازم ندارد',
  TNK_T_REQ: 'درخواست شارژ تنخواه؛ گردش تأیید مالی خودش (PR جدای تنخواه)'
};

function inbDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function inbNow_() { return inbDry_() && TG_MEM['inb:now'] ? Number(TG_MEM['inb:now']) : Date.now(); }
function inbFmt_(ms) { return Utilities.formatDate(new Date(ms), TG_TZ, 'yyyy-MM-dd HH:mm'); }
function inbParse_(v) {
  if (v instanceof Date) return v.getTime() < Date.UTC(2000, 0, 1) ? 0 : v.getTime();
  var s = String(v || '').trim(); if (!s) return 0;
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s);
  if (m) return new Date(s.slice(0, 10) + 'T' + m[4] + ':' + m[5] + ':00+03:30').getTime();
  var t = Date.parse(s); return isNaN(t) || t < Date.UTC(2000, 0, 1) ? 0 : t;   /* ۱۹۷۰ و تاریخ نامعتبر رد */
}
function inbTab_(name, head) {
  var ss = tgSS_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.setRightToLeft(true); sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f5f5f8'); sh.setFrozenRows(1); }
  return sh;
}
function inbRows_() {
  if (inbDry_()) return (TG_MEM['inb:rows'] = TG_MEM['inb:rows'] || []);
  if (INB_MEMO) return INB_MEMO;
  var sh = inbTab_(INB_TAB, INB_HEAD), n = sh.getLastRow();
  INB_MEMO = n < 2 ? [] : sh.getRange(2, 1, n - 1, INB_HEAD.length).getValues().map(function (v, i) {
    var o = { row: i + 2 }; INB_HEAD.forEach(function (h, j) { o[h] = v[j] instanceof Date ? inbFmt_(v[j].getTime()) : String(v[j]); }); return o;
  });
  return INB_MEMO;
}
var INB_MEMO = null;
function inbEv_(o, step, who, note) {
  var row = [new Date(inbNow_()), o['شناسه'] || '', o['کد مرجع'] || '', step, who || 'بات', String(note || '').slice(0, 300)];
  if (inbDry_()) { (TG_MEM['inb:ev'] = TG_MEM['inb:ev'] || []).push(row); return; }
  try { inbTab_(INB_EV_TAB, INB_EV_HEAD).appendRow(row); } catch (e) { tgErr_('inbEv_', e); }
}
function inbPut_(o) {
  o['آخرین تغییر'] = inbFmt_(inbNow_());
  if (inbDry_()) { if (!o.row) { var L = inbRows_(); o.row = L.length + 2; L.push(o); } return o; }
  var sh = inbTab_(INB_TAB, INB_HEAD), arr = INB_HEAD.map(function (h) { return o[h] === undefined ? '' : o[h]; });
  if (o.row) sh.getRange(o.row, 1, 1, arr.length).setNumberFormat('@').setValues([arr]);
  else { sh.appendRow(arr); o.row = sh.getLastRow(); inbRows_().push(o); }
  return o;
}
function inbOpen_(o) { return o && (o['وضعیت'] === INB_ST.open || o['وضعیت'] === INB_ST.replied); }
function inbFind_(src, ref, openOnly) {
  var L = inbRows_().filter(function (o) { return o['منبع'] === src && o['کد مرجع'] === String(ref) && (!openOnly || inbOpen_(o)); });
  return L[L.length - 1] || null;
}
function inbById_(id) { return inbRows_().filter(function (o) { return o['شناسه'] === id; })[0] || null; }
function inbNextId_() {
  var mx = 1000; inbRows_().forEach(function (o) { var m = /^U-(\d+)$/.exec(o['شناسه']); if (m) mx = Math.max(mx, +m[1]); });
  return 'U-' + (mx + 1);
}
function inbSlaH_(q) { var c = cfg_('INB_SLA', {}) || {}; return Number(c[q]) || INB_SLA_H[q] || 24; }
function inbOwnerFor_(q) {
  var r = cfg_('TG_ROUTE', {}) || {};
  return tgNm_(r[q] || INB_Q_KEY[q] || 'ops') || tgNm_('ops') || '';
}
function inbChatOf_(name) {
  if (!name) return '';
  var p = (typeof opsPeople_ === 'function' ? opsPeople_() : []).filter(function (x) { return tgNorm_(x.name) === tgNorm_(name); })[0];
  return p ? opsFirstChat_(p) : '';
}

/**
 * ورودی تازه در صندوق: inbAdd_(منبع، کد مرجع، {chat, text, owner, q, at, type})
 * تکراری نمی‌سازد: اگر رشتهٔ باز همان مرجع هست، همان برمی‌گردد (و «پیام تازه» در رد پا).
 */
function inbAdd_(src, ref, o) {
  o = o || {};
  var hit = inbFind_(src, ref, true);
  if (hit) { if (o.more) inbEv_(hit, 'پیام تازه', 'مخاطب', o.text); return hit; }
  var q = o.q || '', route = '', type = o.type || '', sum = String(o.text || '').replace(/\s+/g, ' ').slice(0, 140);
  if (!o.owner && !q && o.text && typeof aiRoute_ === 'function' && typeof aiPaid_ === 'function' && aiPaid_()) {
    var r = aiRoute_(o.text, { kind: (INB_HOOK[src] || {}).label || src });
    if (!r.human) { q = r.owner; route = 'جمنای ' + Math.round(r.confidence * 100) + '٪'; type = r.type || type; sum = r.summary || sum; }
    else { q = 'مدیریت'; route = 'به آدم (اطمینان ' + Math.round((r.confidence || 0) * 100) + '٪)'; }
  }
  if (!q) q = 'مدیریت';
  var at = Number(o.at) || inbNow_();
  var x = { 'شناسه': inbNextId_(), 'زمان': inbFmt_(at), 'منبع': src, 'کد مرجع': String(ref), 'صف': q, 'نوع': type, 'chat': String(o.chat || ''),
    'خلاصه': sum, 'صاحب': o.owner || inbOwnerFor_(q), 'مهلت': inbFmt_(at + inbSlaH_(q) * 3600000), 'وضعیت': INB_ST.open, 'مسیریاب': route || 'منبع' };
  inbPut_(x); inbEv_(x, 'ورود', o.who || 'مخاطب', ((INB_HOOK[src] || {}).label || src) + (route ? ' · ' + route : ''));
  return x;
}
/** پاسخ واقعی (متن پاسخ یا تصمیم منبع) */
function inbReplied_(src, ref, who, text, atMs) {
  var o = typeof src === 'object' ? src : inbFind_(src, ref, true); if (!o) return null;
  var t = Number(atMs) || inbNow_();
  if (!o['اولین پاسخ']) { o['اولین پاسخ'] = inbFmt_(t); o['دقیقه تا اولین پاسخ'] = String(Math.max(0, Math.round((t - inbParse_(o['زمان'])) / 60000))); }
  if (o['وضعیت'] === INB_ST.open) o['وضعیت'] = INB_ST.replied;
  inbPut_(o); inbEv_(o, 'پاسخ', who, text);
  return o;
}
/** بستن: فقط با پاسخ واقعی یا یکی از INB_REASONS */
function inbClose_(o, who, reason, atMs) {
  if (!o || !inbOpen_(o)) return false;
  if (!o['اولین پاسخ'] && INB_REASONS.indexOf(reason) < 0) return false;
  var t = Number(atMs) || inbNow_();
  o['وضعیت'] = INB_ST.closed; o['بسته شد'] = inbFmt_(t); o['علت بستن'] = reason || 'پاسخ داده شد';
  o['دقیقه تا بستن'] = String(Math.max(0, Math.round((t - inbParse_(o['زمان'])) / 60000)));
  o['در مهلت'] = t <= inbParse_(o['مهلت']) ? 'بله' : 'نه';
  inbPut_(o); inbEv_(o, 'بستن', who, o['علت بستن']);
  return true;
}

/* ───── همگام‌سازی از تب‌های منبع (ساعتی) ───── */
function inbSrcRows_(s) {
  if (inbDry_()) return (TG_MEM['inb:src:' + s.k] || []).map(function (r, i) { var o = {}; Object.keys(r).forEach(function (k) { o[k] = r[k]; }); o._row = i + 2; return o; });
  var name = inbTabName_(s.tab); if (!name) return [];
  var ss = s.ss === 'school' ? tgSchSS_() : tgSS_(), sh = ss.getSheetByName(name); if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getDataRange().getValues(), head = v[0].map(String);
  return v.slice(1).map(function (r, i) { var o = { _row: i + 2 }; head.forEach(function (h, j) { if (h) o[h] = r[j]; }); return o; });
}
function inbTabName_(v) {
  switch (v) {
    case 'TG_TK_TAB': return typeof TG_TK_TAB !== 'undefined' ? TG_TK_TAB : '';
    case 'TG_BUG_TAB': return typeof TG_BUG_TAB !== 'undefined' ? TG_BUG_TAB : '';
    case 'TG_COLL_TAB': return typeof TG_COLL_TAB !== 'undefined' ? TG_COLL_TAB : '';
    case 'TG_SUP_TAB': return typeof TG_SUP_TAB !== 'undefined' ? TG_SUP_TAB : '';
    case 'TG_INP_REQ': return typeof TG_INP_REQ !== 'undefined' ? TG_INP_REQ : '';
    case 'TG_PA_RTAB': return typeof TG_PA_RTAB !== 'undefined' ? TG_PA_RTAB : '';
    case 'STK_TAB': return typeof STK_TAB !== 'undefined' ? STK_TAB : '';
    case 'TG_BOX_TAB': return typeof TG_BOX_TAB !== 'undefined' ? TG_BOX_TAB : '';
  }
  return '';
}
function inbVal_(r, k) { if (!k) return ''; return (Array.isArray(k) ? k : [k]).map(function (x) { return r[x] instanceof Date ? inbFmt_(r[x].getTime()) : String(r[x] == null ? '' : r[x]).trim(); }).filter(String).join(' · '); }
function inbRealReply_(t) { t = String(t || '').trim(); return t.length >= 4 && !/^(پاسخ داده شد|انجام شد|ok|اوکی|-|—)$/i.test(t); }
/** first: فقط رشته‌های باز را وارد کن (بار اول؛ تاریخچهٔ بسته‌ها نمی‌آید) */
function inbSync_(first) {
  var n = { add: 0, reply: 0, close: 0, noreply: 0 };
  INB_SRC.forEach(function (s) {
    var rows; try { rows = inbSrcRows_(s); } catch (e) { tgErr_('inbSync_ ' + s.k, e); return; }
    if (s.box) return inbSyncBox_(s, rows, first, n);
    rows.forEach(function (r) {
      var ref = s.ref ? inbVal_(r, s.ref) : s.k.toUpperCase() + '-' + r._row; if (!ref) return;
      var st = inbVal_(r, s.st), closed = s.closed.test(st), reply = inbVal_(r, s.reply), why = inbVal_(r, s.why);
      var o = inbFind_(s.k, ref, false);
      if (!o) {
        if (closed && (first || INB_FIRST_DONE_())) return;   /* بسته‌های قبلی وارد نمی‌شوند */
        o = inbAdd_(s.k, ref, { chat: inbVal_(r, s.chat), text: inbVal_(r, s.text), owner: inbVal_(r, s.owner), q: s.q, at: inbParse_(r[s.at]) || 0, who: 'منبع' });
        n.add++;
      }
      if (!inbOpen_(o)) return;
      var real = inbRealReply_(reply) || (s.self && closed);
      if (real && !o['اولین پاسخ']) { inbReplied_(o, null, 'منبع', reply || st, inbParse_(r[s.replyAt])); n.reply++; }
      if (closed) {
        if (o['اولین پاسخ']) { inbClose_(o, 'منبع', 'پاسخ داده شد', inbParse_(r[s.replyAt])); n.close++; }
        else if (why && INB_REASONS.indexOf(why) > -1) { inbClose_(o, 'منبع', why); n.close++; }
        else if (o['وضعیت'] !== INB_ST.noreply) { inbNoReply_(o, st); n.noreply++; }
      }
    });
  });
  return n;
}
function INB_FIRST_DONE_() { return inbDry_() ? !!TG_MEM['inb:first'] : PropertiesService.getScriptProperties().getProperty('INB_FIRST') === '1'; }
/* صندوق پیام قدیمی: سطرها پیام‌اند؛ هر رشته یک مورد؛ پیام «تیم» بعد از ورود = پاسخ */
function inbSyncBox_(s, rows, first, n) {
  var th = {};
  rows.forEach(function (r) { var k = inbVal_(r, 'رشته'); if (k) (th[k] = th[k] || []).push(r); });
  Object.keys(th).forEach(function (k) {
    var L = th[k], st = inbVal_(L[L.length - 1], 'وضعیت رشته'), closed = /بسته/.test(st);
    var inb = L.filter(function (r) { return inbVal_(r, 'فرستنده') !== TG_BOX_FROM_US; })[0]; if (!inb) return;
    var o = inbFind_('box', k, false);
    if (!o) {
      if (closed && (first || INB_FIRST_DONE_())) return;
      o = inbAdd_('box', k, { chat: inbVal_(inb, 'طرف chat_id'), text: inbVal_(inb, 'متن'), owner: inbVal_(L[L.length - 1], 'مسئول رشته'), q: s.q, at: inbParse_(inb['زمان']), who: 'منبع' }); n.add++;
    }
    if (!inbOpen_(o)) return;
    var t0 = inbParse_(inb['زمان']), rep = L.filter(function (r) { return inbVal_(r, 'فرستنده') === TG_BOX_FROM_US && inbParse_(r['زمان']) >= t0; })[0];
    if (rep && !o['اولین پاسخ']) { inbReplied_(o, null, 'تیم', inbVal_(rep, 'متن'), inbParse_(rep['زمان'])); n.reply++; }
    if (closed) { if (o['اولین پاسخ']) { inbClose_(o, 'منبع', 'پاسخ داده شد'); n.close++; } else if (o['وضعیت'] !== INB_ST.noreply) { inbNoReply_(o, st); n.noreply++; } }
  });
}
/* منبع بی پاسخ بسته شد: صاحب باید علت بزند یا رشته را باز کند */
function inbNoReply_(o, st) {
  o['وضعیت'] = INB_ST.noreply; inbPut_(o); inbEv_(o, 'بسته بی پاسخ', 'منبع', st);
  var c = inbChatOf_(o['صاحب']);
  if (c) tgNotify_(c, TG_NK.task, '📮 <b>' + o['شناسه'] + '</b> · ' + tgEsc_((INB_HOOK[o['منبع']] || inbSrcOf_(o['منبع'])).label) + ' <code>' + tgEsc_(o['کد مرجع']) + '</code>\nدر منبع «' + tgEsc_(st) + '» خورده ولی پاسخ واقعی ثبت نشده. بستن فقط با پاسخ یا علت:', { ref: o['شناسه'], markup: inbCloseKb_(o, true) });
}
function inbSrcOf_(k) { return INB_SRC.filter(function (s) { return s.k === k; })[0] || INB_HOOK[k] || { label: k }; }

/* ───── دکمه‌ها ───── */
function inbCloseKb_(o, reopen) {
  var kb = INB_REASONS.map(function (r, i) { return [{ text: r, callback_data: 'inb:cr:' + o['شناسه'] + ':' + i }]; });
  if (o.chat || o['chat']) kb.unshift([{ text: '↩️ پاسخ به مخاطب', callback_data: 'inb:r:' + o['شناسه'] }]);
  if (reopen) kb.push([{ text: '🔓 باز بماند', callback_data: 'inb:o:' + o['شناسه'] }]);
  return { inline_keyboard: kb };
}
function inbItemKb_(o) {
  var kb = [];
  if (o['chat']) kb.push({ text: '↩️ پاسخ', callback_data: 'inb:r:' + o['شناسه'] });
  kb.push({ text: '✅ بستن', callback_data: 'inb:c:' + o['شناسه'] });
  return { inline_keyboard: [kb] };
}
function inbCb_(chat, data) {
  var a = String(data).split(':'), act = a[1], o = inbById_(a[2]);
  if (!o) return tgSend_(chat, 'این مورد پیدا نشد.');
  var me = (typeof opsPersonByChat_ === 'function' ? opsPersonByChat_(chat) : null), who = me ? me.name : 'تیم';
  if (!me && String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, 'این دکمه مخصوص تیم است.');
  if (act === 'r') { tgSetVal_('inbr', chat, o['شناسه']); return tgSend_(chat, '✍️ پاسخ <b>' + o['شناسه'] + '</b> را بنویسید؛ همان برای مخاطب می‌رود. /cancel برای انصراف.'); }
  if (act === 'c') { if (o['اولین پاسخ']) { inbClose_(o, who, 'پاسخ داده شد'); return tgSend_(chat, '✅ ' + o['شناسه'] + ' بسته شد.'); } return tgSend_(chat, 'هنوز پاسخی ثبت نشده. پاسخ بدهید یا علت بستن را بزنید:', inbCloseKb_(o)); }
  if (act === 'cr') { var r = INB_REASONS[Number(a[3])]; if (o['وضعیت'] === INB_ST.noreply) o['وضعیت'] = INB_ST.open; return tgSend_(chat, inbClose_(o, who, r) ? '✅ ' + o['شناسه'] + ' بسته شد: ' + r : 'بسته نشد.'); }
  if (act === 'o') { o['وضعیت'] = o['اولین پاسخ'] ? INB_ST.replied : INB_ST.open; inbPut_(o); inbEv_(o, 'باز شد', who); return tgSend_(chat, '🔓 ' + o['شناسه'] + ' باز ماند.', inbItemKb_(o)); }
  return null;
}
/* متن حالت پاسخ (inbr) */
function inbText_(chat, m) {
  var id = tgGetVal_('inbr', chat); if (!id || !m || !m.text) return false;
  var t = String(m.text).trim();
  if (t === '/cancel' || t === 'انصراف') { tgDel_('inbr', chat); tgSend_(chat, 'لغو شد.'); return true; }
  if (tgIsBtnLike_(t)) { tgDel_('inbr', chat); return false; }
  tgDel_('inbr', chat);
  var o = inbById_(id); if (!o || !o['chat']) { tgSend_(chat, 'مخاطب این مورد پیدا نشد.'); return true; }
  tgSend_(o['chat'], '💬 <b>پاسخ تیم تجربه</b>\n\n' + tgEsc_(t));
  var me = opsPersonByChat_(chat);
  inbReplied_(o, null, me ? me.name : 'تیم', t);
  tgSend_(chat, '✅ رفت. ' + o['شناسه'] + ' «پاسخ داده شد» است.', inbItemKb_(o));
  return true;
}

/* ───── جواب به پیام بات در گفت‌وگوی خصوصی ← صاحب همان کار ───── */
var INB_REF_RX = /\b([A-Z]{1,3}-\d{2,7}|PS-[A-Z0-9]+|TH-[A-Z0-9]+|M-[A-Z0-9]+)\b/;
/** loose=false (اول مسیر): فقط وقتی پیام نقل‌شده کد شناخته‌شده دارد و جواب متن است. loose=true (جای «نفهمیدم»): هر جواب. */
function inbReplyIn_(chat, m, loose) {
  var rt = m && m.reply_to_message;
  if (!rt || !rt.from || !rt.from.is_bot || !(m.text || m.voice || m.photo || m.document)) return false;
  if (typeof opsPersonByChat_ === 'function' && opsPersonByChat_(chat)) return false;   /* تیم: مسیر خودش */
  var quoted = String(rt.text || rt.caption || ''), mm = INB_REF_RX.exec(quoted), ref = mm ? mm[1] : '';
  var base = ref ? inbRows_().filter(function (o) { return o['کد مرجع'] === ref || o['شناسه'] === ref; }).pop() : null;
  if (!loose && (!base || !m.text)) return false;
  var text = m.text || m.caption || (m.voice ? '(ویس)' : '(فایل)');
  var o = inbAdd_('re', ref || ('R-' + chat + '-' + rt.message_id), { chat: chat, text: text, owner: base ? base['صاحب'] : '', q: base ? base['صف'] : '', more: true });
  var c = inbChatOf_(o['صاحب']) || String(TG_OWNER_CHAT || '');
  if (c) {
    var sug = m.text && typeof afxOpsSuggest_ === 'function' ? afxOpsSuggest_(chat, m.text, quoted) : '';   /* v170.30 */
    tgNotify_(c, TG_NK.task, '📮 <b>جواب به پیام بات</b> · ' + o['شناسه'] + (ref ? ' · <code>' + tgEsc_(ref) + '</code>' : '') + '\n\n<b>پیام بات:</b> ' + tgEsc_(quoted.slice(0, 300)) + '\n\n<b>جواب:</b> ' + tgEsc_(String(text).slice(0, 1500)) + (sug ? '\n\n' + sug : ''), { ref: o['شناسه'], markup: inbItemKb_(o) });
    if (!m.text && m.message_id && !inbDry_()) { try { tgApi_('copyMessage', { chat_id: c, from_chat_id: chat, message_id: m.message_id }); } catch (eC) {} }
  }
  tgSend_(chat, '✓ رسید؛ به همکار مسئول همین کار رسید و پاسخ همین‌جا می‌آید.');
  return true;
}

/* ───── قلاب‌های لحظه‌ای (از نویسنده‌های فعلی) ───── */
function inbHook_(kind, a, b) {
  try {
    if (kind === 'tk') return inbAdd_('tk', a.id, { chat: a.chat, text: a.topic + ' · ' + a.body, owner: a.owner, q: 'پذیرش' });
    if (kind === 'tkre') { var o = inbFind_('tk', a, true) || inbAdd_('tk', a, { q: 'پذیرش' }); return inbReplied_(o, null, 'تیم', b); }
    if (kind === 'bug') return inbAdd_('bug', a.id, { chat: a.chat, text: a.kind + ' · ' + a.body, q: 'فنی' });
    if (kind === 'msg') return inbAdd_('msg', a.th, { chat: a.chat, text: a.text, q: a.q || '', more: true });
    if (kind === 'msgre') { var m2 = inbFind_('msg', a.th, true); return m2 ? inbReplied_(m2, null, a.who || 'تیم', a.text) : null; }
    if (kind === 'wa') return inbAdd_('wa', 'WA-' + a.code, { text: a.text, q: 'پذیرش', more: true, who: 'مخاطب' });
    if (kind === 'waout') { var w = inbFind_('wa', 'WA-' + a.code, true); return w ? inbReplied_(w, null, 'تیم', a.text) : null; }
  } catch (e) { tgErr_('inbHook_ ' + kind, e); }
  return null;
}

/* ───── مهلت، یادآوری و ارجاع (ساعتی) ───── */
function inbTick_() {
  var now = inbNow_(), n = 0, h = Number(Utilities.formatDate(new Date(now), TG_TZ, 'H'));
  if (!inbDry_()) { INB_MEMO = null; try { inbSync_(false); } catch (e) { tgErr_('inbSync_', e); } }
  if (h < 9 || h >= 21) return 0;   /* یادآوری فقط ساعت کاری */
  inbRows_().forEach(function (o) {
    if (o['وضعیت'] !== INB_ST.open || !o['مهلت'] || now <= inbParse_(o['مهلت'])) return;
    var rm = String(o['یادآوری'] || '').split('|'), cnt = Number(rm[0]) || 0, last = Number(rm[1]) || 0;
    if (now - last < 20 * 3600000) return;
    cnt++; o['یادآوری'] = cnt + '|' + now; inbPut_(o);
    var c = inbChatOf_(o['صاحب']), txt = '⏰ <b>' + o['شناسه'] + '</b> از مهلت گذشته · ' + tgEsc_(inbSrcOf_(o['منبع']).label) + ' <code>' + tgEsc_(o['کد مرجع']) + '</code>\n' + tgEsc_(o['خلاصه']);
    if (c) tgNotify_(c, TG_NK.remind, txt + '\nیادآوری ' + tgFa_(cnt) + ' از ' + tgFa_(INB_ESC_N), { ref: o['شناسه'], markup: inbItemKb_(o) });
    inbEv_(o, 'یادآوری ' + cnt, 'بات');
    if (cnt === INB_ESC_N) {
      var opsN = tgNm_('ops'), oc = inbChatOf_(opsN);
      if (oc && opsN !== o['صاحب']) tgNotify_(oc, TG_NK.task, '🔺 <b>ارجاع</b>: ' + tgFa_(INB_ESC_N) + ' یادآوری و هنوز باز. صاحب: ' + tgEsc_(o['صاحب'] || 'بی صاحب') + '\n' + txt, { ref: o['شناسه'], markup: inbItemKb_(o) });
      inbEv_(o, 'ارجاع به مدیر عملیات', 'بات');
    }
    n++;
  });
  try { inbWeeklyMaybe_(); } catch (eW) { tgErr_('inbWeeklyMaybe_', eW); }
  return n;
}

/* ───── شاخص‌ها و پیشنهاد خودکارسازی ───── */
function inbMed_(a) { a = a.filter(function (x) { return !isNaN(x); }).sort(function (x, y) { return x - y; }); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; }
function inbKpi_(fromMs, toMs) {
  var by = {}, all = { n: 0, fr: [], cl: [], inSla: 0, closed: 0, open: 0, late: 0 };
  inbRows_().forEach(function (o) {
    var t = inbParse_(o['زمان']); if (!t || t < fromMs || t >= toMs) return;
    var g = by[o['صف']] = by[o['صف']] || { n: 0, fr: [], cl: [], inSla: 0, closed: 0, open: 0, late: 0 };
    [g, all].forEach(function (x) {
      x.n++;
      if (o['دقیقه تا اولین پاسخ'] !== '') x.fr.push(Number(o['دقیقه تا اولین پاسخ']));
      if (o['وضعیت'] === INB_ST.closed) { x.closed++; x.cl.push(Number(o['دقیقه تا بستن'])); if (o['در مهلت'] === 'بله') x.inSla++; }
      else { x.open++; if (inbParse_(o['مهلت']) < inbNow_()) x.late++; }
    });
  });
  var fin = function (x) { return { n: x.n, firstMed: inbMed_(x.fr), closeMed: inbMed_(x.cl), slaPct: x.closed ? Math.round(100 * x.inSla / x.closed) : null, open: x.open, late: x.late }; };
  var out = { all: fin(all), q: {} }; Object.keys(by).forEach(function (k) { out.q[k] = fin(by[k]); });
  return out;
}
function inbMinTxt_(m) { if (m === null) return '–'; return m < 120 ? tgFa_(m) + ' دقیقه' : tgFa_(Math.round(m / 60)) + ' ساعت'; }
/** نوع‌هایی که تکرار شدند و آدم لازم نداشتند (بسته با «نیاز به پاسخ نداشت»/«تکراری»، یا بستن زیر ۱۰ دقیقه) */
function inbAutoIdeas_(fromMs, toMs) {
  var g = {};
  inbRows_().forEach(function (o) {
    var t = inbParse_(o['زمان']); if (!t || t < fromMs || t >= toMs || o['وضعیت'] !== INB_ST.closed) return;
    var k = inbSrcOf_(o['منبع']).label + (o['نوع'] ? ' · ' + o['نوع'] : '');
    var x = g[k] = g[k] || { n: 0, light: 0 }; x.n++;
    if (/نیاز به پاسخ نداشت|تکراری/.test(o['علت بستن']) || Number(o['دقیقه تا بستن']) < 10) x.light++;
  });
  return Object.keys(g).filter(function (k) { return g[k].n >= 5 && g[k].light / g[k].n >= 0.6; })
    .map(function (k) { return k + ': ' + tgFa_(g[k].n) + ' بار، ' + tgFa_(g[k].light) + ' تا بی‌نیاز به آدم'; });
}
function inbReport_(days) {
  var to = inbNow_(), from = to - (days || 7) * 86400000, k = inbKpi_(from, to), T = ['📮 <b>صندوق یکتا · ' + tgFa_(days || 7) + ' روز گذشته</b>', ''];
  var line = function (lbl, x) { return '• ' + lbl + ': ' + tgFa_(x.n) + ' ورودی · اولین پاسخ (میانه) ' + inbMinTxt_(x.firstMed) + ' · بستن (میانه) ' + inbMinTxt_(x.closeMed) + ' · در مهلت ' + (x.slaPct === null ? '–' : tgFa_(x.slaPct) + '٪') + ' · باز ' + tgFa_(x.open) + (x.late ? ' (دیر ' + tgFa_(x.late) + ')' : ''); };
  T.push(line('همه', k.all));
  Object.keys(k.q).sort().forEach(function (q) { T.push(line(q, k.q[q])); });
  var ideas = inbAutoIdeas_(from, to);
  T.push('', '<b>پیشنهاد خودکارسازی</b>' + (ideas.length ? '' : ': موردی نبود'));
  ideas.forEach(function (x) { T.push('• ' + tgEsc_(x)); });
  return { text: T.join('\n'), kpi: k, ideas: ideas };
}
function inbWeeklyMaybe_() {
  var d = new Date(inbNow_()), dow = Utilities.formatDate(d, TG_TZ, 'u'), h = Number(Utilities.formatDate(d, TG_TZ, 'H'));
  if (dow !== '5' || h < 10) return false;
  var wk = Utilities.formatDate(d, TG_TZ, 'yyyy-ww'), P = inbDry_() ? null : PropertiesService.getScriptProperties();
  if ((inbDry_() ? TG_MEM['inb:wk'] : P.getProperty('INB_WEEK')) === wk) return false;
  if (inbDry_()) TG_MEM['inb:wk'] = wk; else P.setProperty('INB_WEEK', wk);
  var r = inbReport_(7), oc = inbChatOf_(tgNm_('ops'));
  if (oc) tgNotify_(oc, TG_NK.report, r.text, { ref: 'INB-WEEK' });
  if (!inbDry_()) {
    var sh = inbTab_(INB_KPI_TAB, ['هفته', 'صف', 'ورودی', 'اولین پاسخ (دقیقه، میانه)', 'بستن (دقیقه، میانه)', 'در مهلت ٪', 'باز', 'دیر']);
    var rows = [['همه', r.kpi.all]].concat(Object.keys(r.kpi.q).map(function (q) { return [q, r.kpi.q[q]]; }));
    rows.forEach(function (x) { sh.appendRow([wk, x[0], x[1].n, x[1].firstMed, x[1].closeMed, x[1].slaPct, x[1].open, x[1].late]); });
  }
  return true;
}

/* ───── تیم: «📮 صندوق من» و /inbox ───── */
function inbMine_(chat) {
  var me = opsPersonByChat_(chat); if (!me) return false;
  var L = inbRows_().filter(function (o) { return inbOpen_(o) || o['وضعیت'] === INB_ST.noreply; }).filter(function (o) { return tgNorm_(o['صاحب']) === tgNorm_(me.name); });
  if (!L.length) { tgSend_(chat, '📮 صندوق شما خالی است.'); return true; }
  L.sort(function (a, b) { return inbParse_(a['مهلت']) - inbParse_(b['مهلت']); });
  var now = inbNow_(), T = ['📮 <b>صندوق من</b> · ' + tgFa_(L.length) + ' باز', ''];
  var kb = [];
  L.slice(0, 15).forEach(function (o) {
    var late = inbParse_(o['مهلت']) < now;
    T.push((late ? '🔴 ' : '• ') + '<b>' + o['شناسه'] + '</b> · ' + tgEsc_(inbSrcOf_(o['منبع']).label) + ' <code>' + tgEsc_(o['کد مرجع']) + '</code> · ' + tgEsc_(o['وضعیت']) + '\n   ' + tgEsc_(String(o['خلاصه']).slice(0, 90)));
    if (kb.length < 6) kb.push([{ text: (o['chat'] ? '↩️ ' : '✅ ') + o['شناسه'], callback_data: (o['chat'] ? 'inb:r:' : 'inb:c:') + o['شناسه'] }]);
  });
  tgSend_(chat, T.join('\n'), kb.length ? { inline_keyboard: kb } : null);
  return true;
}
function inbRoute_(chat, m) {
  var t = String((m && m.text) || '').trim();
  if (tgGetVal_('inbr', chat) && inbText_(chat, m)) return true;
  if (t === '/inbox' || t === INB_BTN) return inbMine_(chat);
  if (m && m.reply_to_message && inbReplyIn_(chat, m, false)) return true;
  return false;
}

/* یک‌بارهٔ خودکار v170.28: تب‌ها و ورود رشته‌های باز فعلی. فقط شمار (به تفکیک منبع). منبع‌ها دست نمی‌خورند. */
function tgV17028Inbox() {
  inbTab_(INB_TAB, INB_HEAD); inbTab_(INB_EV_TAB, INB_EV_HEAD);
  INB_MEMO = null;
  var n = inbSync_(true);
  if (!inbDry_()) PropertiesService.getScriptProperties().setProperty('INB_FIRST', '1'); else TG_MEM['inb:first'] = 1;
  var by = {}; inbRows_().forEach(function (o) { var l = inbSrcOf_(o['منبع']).label; by[l] = (by[l] || 0) + 1; });
  return 'صندوق یکتا: ' + n.add + ' رشتهٔ باز وارد شد (' + Object.keys(by).map(function (k) { return k + ' ' + by[k]; }).join('، ') + ') · پاسخ‌دار ' + n.reply + ' · بسته بی پاسخ ' + n.noreply;
}

/* ───── آزمون ───── */
function inbTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_ };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'inb:now': new Date('2026-10-10T10:00:00+03:30').getTime() };
  TG_CFG_ = { TG_NAMES: { reception: 'پذیرش نمونه', ops: 'عملیات نمونه', school: 'مدرسه نمونه' } };
  try {
    TG_MEM['people'] = [{ row: 2, name: 'پذیرش نمونه', chat: '301', roles: ['پذیرش'], status: 'فعال' }, { row: 3, name: 'عملیات نمونه', chat: '302', roles: ['ناظر'], status: 'فعال' }];
    var t0 = TG_MEM['inb:now'];
    /* بار اول: فقط باز‌ها */
    TG_MEM['inb:src:tk'] = [{ 'شمارهٔ پیگیری': 'P-11', 'زمان ثبت': new Date(t0 - 3600000), 'chat_id': '901', 'موضوع': 'جلسه', 'متن': 'سؤال', 'مسئول': 'پذیرش نمونه', 'وضعیت': 'باز', 'پاسخ': '' },
                            { 'شمارهٔ پیگیری': 'P-10', 'زمان ثبت': new Date(t0 - 86400000), 'chat_id': '902', 'موضوع': 'جلسه', 'متن': 'قدیمی', 'مسئول': 'پذیرش نمونه', 'وضعیت': 'پاسخ داده شد', 'پاسخ': 'پاسخ کامل داده شد' }];
    TG_MEM['inb:src:bug'] = [{ 'شماره': 'B-5', 'زمان ثبت': new Date(t0), 'chat_id': '903', 'نوع': 'باگ', 'متن': 'دکمه کار نمی‌کند', 'وضعیت': 'تازه' }];
    TG_MEM['inb:src:inp'] = [{ 'شناسه': 'IR-1', 'زمان': new Date(t0), 'chat': '904', 'مکان': 'الف', 'متن': '', 'وضعیت': 'منتظر پذیرش' }];
    var r = tgV17028Inbox();
    ok('یک‌باره: فقط رشته‌های باز وارد می‌شوند', inbRows_().length === 3 && !inbFind_('tk', 'P-10'), r);
    var tk = inbFind_('tk', 'P-11', true);
    ok('صاحب از منبع و مهلت از صف', tk['صاحب'] === 'پذیرش نمونه' && inbParse_(tk['مهلت']) === inbParse_(tk['زمان']) + 4 * 3600000);
    ok('باگ به صف فنی و صاحب پیش‌فرض (مدیر عملیات)', inbFind_('bug', 'B-5')['صف'] === 'فنی' && inbFind_('bug', 'B-5')['صاحب'] === 'عملیات نمونه');
    /* بستن بی پاسخ ممنوع */
    ok('بستن بی پاسخ و بی علت ممنوع', inbClose_(tk, 'تیم', '') === false && inbOpen_(tk));
    /* منبع «پاسخ داده شد» بی متن ← بسته بی پاسخ و خبر به صاحب */
    TG_MEM['inb:src:tk'][0]['وضعیت'] = 'پاسخ داده شد';
    inbSync_(false);
    ok('علامت «پاسخ داده شد» بی متن ← بسته بی پاسخ', tk['وضعیت'] === INB_ST.noreply && JSON.stringify(TG_MEM['notify'] || []).indexOf('301') > -1);
    inbCb_('301', 'inb:cr:' + tk['شناسه'] + ':2');
    ok('بستن با علت انتخاب‌شده', tk['وضعیت'] === INB_ST.closed && tk['علت بستن'] === INB_REASONS[2]);
    /* تصمیم منبع (حضوری) = پاسخ واقعی */
    TG_MEM['inb:now'] = t0 + 30 * 60000;
    TG_MEM['inb:src:inp'][0]['وضعیت'] = 'تأیید شد'; TG_MEM['inb:src:inp'][0]['زمان پاسخ'] = new Date(t0 + 30 * 60000);
    inbSync_(false);
    var ip = inbFind_('inp', 'IR-1');
    ok('تصمیم حضوری = پاسخ و بستن در مهلت', ip['وضعیت'] === INB_ST.closed && ip['دقیقه تا اولین پاسخ'] === '30' && ip['در مهلت'] === 'بله');
    /* قلاب تیکت و پاسخ واقعی */
    inbHook_('tk', { id: 'P-12', chat: '905', topic: 'مالی', body: 'رسید', owner: 'پذیرش نمونه' });
    TG_MEM['inb:now'] = t0 + 50 * 60000;
    inbHook_('tkre', 'P-12', 'پاسخ کامل به درمانگر');
    ok('قلاب تیکت و پاسخ', inbFind_('tk', 'P-12', true)['وضعیت'] === INB_ST.replied && inbFind_('tk', 'P-12', true)['دقیقه تا اولین پاسخ'] === '20');
    /* جواب به پیام بات ← صاحب همان کار، و پاسخ از راه دکمه */
    TG_OUTBOX = []; TG_MEM['notify'] = [];
    var handled = inbReplyIn_('905', { message_id: 9, text: 'ممنون، یک سؤال دیگر', reply_to_message: { message_id: 8, from: { is_bot: true }, text: '💬 پاسخ پذیرش · P-12' } });
    var re = inbFind_('re', 'P-12', true);
    ok('جواب به پیام بات به صاحب همان کار', handled && re && re['صاحب'] === 'پذیرش نمونه' && JSON.stringify(TG_MEM['notify']).indexOf('301') > -1);
    ok('جواب بی کد اول مسیر رد می‌شود، جای «نفهمیدم» گرفته می‌شود', inbReplyIn_('907', { message_id: 3, text: 'سلام', reply_to_message: { message_id: 2, from: { is_bot: true }, text: 'خبر کمپین' } }, false) === false &&
      inbReplyIn_('907', { message_id: 3, text: 'سلام', reply_to_message: { message_id: 2, from: { is_bot: true }, text: 'خبر کمپین' } }, true) === true && inbFind_('re', 'R-907-2', true)['صف'] === 'مدیریت');
    ok('جواب تیم از مسیر خودش (نه صندوق)', inbReplyIn_('301', { text: 'x', reply_to_message: { from: { is_bot: true }, text: 'P-12' } }) === false);
    inbCb_('301', 'inb:r:' + re['شناسه']); TG_OUTBOX = [];
    inbText_('301', { text: 'پاسخ ما' });
    ok('پاسخ با دکمه به مخاطب می‌رود و ثبت می‌شود', TG_OUTBOX.some(function (x) { return x.chat === '905' && /پاسخ ما/.test(x.text); }) && re['وضعیت'] === INB_ST.replied);
    /* بی کلید پولی: مسیریاب جمنای صدا زده نمی‌شود و به آدم می‌رود */
    var u = inbAdd_('msg', 'M-X', { chat: '906', text: 'سلام، درباره کلاس‌ها' });
    ok('بی کلید پولی ← صف مدیریت و صاحب آدم', u['صف'] === 'مدیریت' && u['صاحب'] === 'عملیات نمونه' && u['مسیریاب'] === 'منبع');
    /* یادآوری و ارجاع بعد از سه بار */
    TG_MEM['notify'] = [];
    var b5 = inbFind_('bug', 'B-5');
    for (var d = 1; d <= 3; d++) { TG_MEM['inb:now'] = t0 + (72 + 24 * d) * 3600000 + 3600000; inbTick_(); }
    ok('سه یادآوری و بعد ارجاع به مدیر عملیات', String(b5['یادآوری']).split('|')[0] === '3' && (TG_MEM['inb:ev'] || []).some(function (x) { return x[3] === 'ارجاع به مدیر عملیات'; }));
    /* شاخص‌ها */
    var k = inbKpi_(0, inbNow_() + 1);
    ok('شاخص‌ها: اولین پاسخ و در مهلت', k.all.n >= 5 && k.q['حضوری'].firstMed === 30 && k.q['حضوری'].slaPct === 100);
    ok('گزارش بی نام و شماره', !/901|905|نمونه/.test(inbReport_(30).text));
    /* پیشنهاد خودکارسازی */
    for (var i = 0; i < 6; i++) { var z = inbAdd_('msg', 'M-Z' + i, { chat: '9' + i, text: 'ساعت کاری؟', q: 'پذیرش', type: 'سؤال ساعت کاری' }); inbClose_(z, 'تیم', 'نیاز به پاسخ نداشت'); }
    ok('پیشنهاد خودکارسازی برای تکراری بی‌نیاز به آدم', inbAutoIdeas_(0, inbNow_() + 1).some(function (x) { return /سؤال ساعت کاری/.test(x); }));
    ok('تاریخ ۱۹۷۰ رد می‌شود', inbParse_(new Date(0)) === 0 || inbParse_('1970-01-01 00:00') === 0);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'inbTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['صندوق یکتا (v170.28)', 'inbTests']); } catch (eInb) {}
