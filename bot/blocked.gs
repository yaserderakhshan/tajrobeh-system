/**
 * blocked.gs · v170.25 · ۱۴ مهر ۱۴۰۵ · کاربری که بات را بلاک کرده
 *
 * ۱۴ مهر: اطلاعیهٔ کمپین EFT به ۲۶۳ نفر رفت. ۲۳ نفر بات را بلاک کرده بودند و چون tgSend_ هر پیام ناموفق را یک بار دیگر
 * بی قالب می‌فرستاد، ۵۰ خطا در «خطاها» نشست. همان روز کارت درمانگر به مراجعی که لید باز داشت و بات را بلاک کرده بود نرسید.
 *
 * - اولین پاسخ ۴۰۳ «bot was blocked by the user» (tgApi_): chat در ستون «بلاک کرده» تب «کاربران بات» با تاریخ علامت می‌خورد،
 *   همان پیام دوباره فرستاده نمی‌شود و در «خطاها» نمی‌آید.
 * - از آن به بعد هر ارسالی به او (tgSend_، tgPhoto_، tgNotify_، پس پیام‌های گروهی، یادآورها، فید محتوا و کمپین‌ها) رد می‌شود
 *   و در «ارسال‌های بات» با نتیجهٔ «بلاک» ثبت می‌شود.
 * - هر پیام یا دکمه‌ای از خود او (از جمله /start) یعنی بات را باز کرده: علامت خودکار برداشته می‌شود (tgHandle).
 * - اگر لید باز دارد: یک بار یادداشت روی لید (که در «رویدادهای لید» هم ثبت می‌شود) و پیام به مسئول همراه کارت لید.
 * - گزارش روزانه: «N نفر بات را بلاک کرده‌اند».
 *
 * فهرست بلاک‌ها: منبع حقیقت ستون «بلاک کرده» است؛ برای اینکه هر ارسال شیت نخواند، یک کپی در کش (۶ ساعت) نگه داشته می‌شود.
 * حالت خشک: TG_MEM['blk'] فهرست، TG_MEM['blk403'] شناسه‌هایی که تلگرامِ جعلی برایشان ۴۰۳ بلاک برمی‌گرداند.
 */
var TG_BLK_COL = 'بلاک کرده';
var TG_BLK_RX = /bot was blocked by the user/i;
var TG_BLK_LEAD_TXT = 'مراجع بات را بلاک کرده؛ پیگیری تلفنی یا واتس‌اپ';
var TG_BLK_ = null;   /* کپی همین اجرا */

function tgBlkIsResp_(code, txt) { return Number(code) === 403 && TG_BLK_RX.test(String(txt || '')); }
/* پاسخ جعلی برای ارسالی که رد شد؛ صداکننده‌ها مثل هر ارسال ناموفق با آن رفتار می‌کنند */
function tgBlkResp_() {
  return { blocked: true, getResponseCode: function () { return 403; }, getContentText: function () { return '{"ok":false,"error_code":403,"description":"Forbidden: bot was blocked by the user (رد شد)"}'; } };
}

function tgBlkSheet_() {
  var sh = tgUserSheet_(true); if (!sh) return null;
  var lc = sh.getLastColumn(), head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var c = head.indexOf(TG_BLK_COL) + 1;
  if (!c) { c = lc + 1; sh.getRange(1, c).setValue(TG_BLK_COL).setFontWeight('bold'); }
  return { sh: sh, col: c };
}
/* {chat: تاریخ} */
function tgBlkMap_() {
  if (TG_DRY) return (TG_MEM['blk'] = TG_MEM['blk'] || {});
  if (TG_BLK_) return TG_BLK_;
  var c = CacheService.getScriptCache(), hit = c.get('tgblk');
  if (hit) { try { return (TG_BLK_ = JSON.parse(hit)); } catch (e) {} }
  var m = {};
  try {
    var sh = tgUserSheet_(false);
    if (sh && sh.getLastRow() > 1) {
      var lc = sh.getLastColumn(), head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h || '').trim(); });
      var k = head.indexOf(TG_BLK_COL);
      if (k > -1) {
        var v = sh.getRange(2, 1, sh.getLastRow() - 1, lc).getValues();
        for (var i = 0; i < v.length; i++) if (String(v[i][k] || '').trim()) m[String(v[i][0]).trim()] = String(v[i][k]).trim();
      }
    }
  } catch (e2) { try { tgErr_('tgBlkMap_', e2); } catch (x) {} }
  try { c.put('tgblk', JSON.stringify(m), 21600); } catch (e3) {}
  return (TG_BLK_ = m);
}
function tgBlkSave_(m) {
  if (TG_DRY) { TG_MEM['blk'] = m; return; }
  TG_BLK_ = m;
  try { CacheService.getScriptCache().put('tgblk', JSON.stringify(m), 21600); } catch (e) {}
}
function tgBlkIs_(chat) {
  var id = String(chat == null ? '' : chat).trim();
  if (!id || id.charAt(0) === '-') return false;
  try { return !!tgBlkMap_()[id]; } catch (e) { return false; }
}
function tgBlkCount_() { try { return Object.keys(tgBlkMap_()).length; } catch (e) { return 0; } }

/* ستون «بلاک کرده» برای یک chat: مقدار تاریخ یا خالی */
function tgBlkCell_(chat, val) {
  if (TG_DRY) return;
  var b = tgBlkSheet_(); if (!b) return;
  var sh = b.sh, n = sh.getLastRow(), at = 0;
  if (n > 1) { var ids = sh.getRange(2, 1, n - 1, 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === String(chat)) { at = i + 2; break; } }
  if (!at) { if (!val) return; sh.appendRow([String(chat)]); at = sh.getLastRow(); tgChatCellSet_(sh.getRange(at, 1), chat); }
  sh.getRange(at, b.col).setValue(val || '');
}

/** اولین ۴۰۳ بلاک: علامت با تاریخ و خبر لید باز. true یعنی تازه علامت خورد. */
function tgBlkMark_(chat) {
  var id = String(chat == null ? '' : chat).trim();
  if (!id || id.charAt(0) === '-' || tgBlkIs_(id)) return false;
  var day = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm');
  var m = tgBlkMap_(); m[id] = day; tgBlkSave_(m);
  try { tgBlkCell_(id, day); } catch (e) { try { tgErr_('tgBlkMark_', e); } catch (x) {} }
  try { tgBlkLeadAlert_(id); } catch (e2) { try { tgErr_('tgBlkLeadAlert_', e2); } catch (x2) {} }
  return true;
}
/** پیام یا دکمه از خود کاربر: بات باز است، علامت برداشته می‌شود */
function tgBlkClear_(chat) {
  var id = String(chat == null ? '' : chat).trim();
  if (!tgBlkIs_(id)) return false;
  var m = tgBlkMap_(); delete m[id]; tgBlkSave_(m);
  try { tgBlkCell_(id, ''); } catch (e) { try { tgErr_('tgBlkClear_', e); } catch (x) {} }
  return true;
}

/* لیدهای باز همین chat (سطرها) */
function tgBlkOpenLeads_(chat) {
  if (TG_DRY) { var L = TG_DRY_LEAD; return L && String(L.chatId || L.chat || '') === String(chat) && !L.closed ? [L.row] : []; }
  var sh = tgSS_().getSheetByName(TG_LEADS); if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues(), out = [];
  for (var i = 0; i < v.length; i++) if (tgChatIdIn_(v[i][12], chat) && !tgStClosed_(v[i][8])) out.push(i + 2);
  return out;
}
/* یک بار برای هر بار بلاک شدن (tgBlkMark_ فقط بار اول صدا می‌زند): یادداشت لید + پیام به مسئول با کارت */
function tgBlkLeadAlert_(chat) {
  var rows = tgBlkOpenLeads_(chat), n = 0;
  for (var i = 0; i < rows.length; i++) {
    var code = tgLeadNote_(rows[i], TG_BLK_LEAD_TXT, 'بات');
    var l = tgLeadRead_(rows[i]);
    tgLeadOwnerSay_(l, '🚫 <b>' + tgEsc_(code || (l && l.code) || '') + '</b>: ' + TG_BLK_LEAD_TXT + '.', true);
    n++;
  }
  return n;
}

/* ---------- آزمون ---------- */
function tgBlkTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c) { out.push((c ? '✓ ' : '✗ ') + n); if (c) pass++; else fail++; };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, lead: TG_DRY_LEAD, kind: TG_OUT_KIND };
  TG_DRY = true; TG_MEM = { policy: {}, capdry: {}, quiet: false, notify: [], desk: [{ name: 'پذیرش نمونه', chat: '9001' }] }; TG_OUTBOX = [];
  try {
    var C = '7101', msgs = function (c) { return TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && x.chat === c; }); };
    ok('پاسخ ۴۰۳ بلاک شناخته می‌شود', tgBlkIsResp_(403, '{"ok":false,"error_code":403,"description":"Forbidden: bot was blocked by the user"}') && !tgBlkIsResp_(403, 'Forbidden: bot is not a member') && !tgBlkIsResp_(400, 'blocked by the user'));
    TG_DRY_LEAD = { row: 12, code: 'L-1300', chatId: C, owner: 'پذیرش نمونه', status: 'ارجاع شد', closed: false };
    TG_MEM['blk403'] = {}; TG_MEM['blk403'][C] = 1;
    tgSend_(C, 'اطلاعیه');
    ok('اولین ۴۰۳: علامت «بلاک کرده» با تاریخ', !!TG_MEM['blk'][C] && /^\d{4}-\d\d-\d\d/.test(TG_MEM['blk'][C]));
    ok('لید باز: یادداشت روی لید', TG_OUTBOX.filter(function (x) { return x.kind === 'leadnote' && x.row === 12 && x.text === TG_BLK_LEAD_TXT; }).length === 1);
    ok('لید باز: پیام به مسئول همراه کارت', msgs('9001').some(function (x) { return x.text.indexOf('L-1300') > -1 && x.text.indexOf('پیگیری تلفنی یا واتس‌اپ') > -1; }));
    var before = TG_OUTBOX.length;
    tgSend_(C, 'یادآور'); tgPhoto_(C, 'https://example.com/x.png', 'فید');
    ok('بعد از بلاک: ارسال رد می‌شود و دوباره تلاش نمی‌شود', TG_OUTBOX.length === before);
    ok('بعد از بلاک: خبر لید دوباره نمی‌آید', TG_OUTBOX.filter(function (x) { return x.kind === 'leadnote'; }).length === 1);
    ok('tgNotify_ «بلاک» برمی‌گرداند (صف دوباره امتحان نمی‌کند)', tgNotify_(C, TG_NK.invite, 'دعوت') === 'بلاک');
    var logs = (TG_MEM['outlog'] || []).filter(function (x) { return x.chat === C; });
    ok('«ارسال‌های بات»: نتیجهٔ «بلاک» ثبت می‌شود', logs.some(function (x) { return x.blk; }));
    ok('گزارش روزانه: شمار بلاک‌ها', tgBlkCount_() === 1 && tgDayReport_(tgBlkDayFixture_()).indexOf('۱ نفر بات را بلاک کرده‌اند') > -1);
    tgHandle({ update_id: 91, message: { message_id: 5, date: 1, chat: { id: Number(C), type: 'private' }, from: { id: Number(C), first_name: 'تست' }, text: '/start' } });
    ok('/start: علامت خودکار برداشته می‌شود', !TG_MEM['blk'][C]);
    delete TG_MEM['blk403'][C]; TG_OUTBOX = [];
    tgSend_(C, 'دوباره');
    ok('بعد از برداشتن علامت: پیام می‌رود', msgs(C).length === 1);
    TG_DRY_LEAD = null; TG_MEM['blk403']['7102'] = 1; TG_OUTBOX = [];
    tgSend_('7102', 'x');
    ok('بی لید باز: فقط علامت، بی پیام به مسئول', !!TG_MEM['blk']['7102'] && !msgs('9001').length);
    ok('گروه و کانال هرگز علامت نمی‌خورند', tgBlkMark_('-1001') === false && !tgBlkIs_('-1001'));
    ok('ارسال‌های گروهی نوعشان را از «سیاست پیام» می‌گیرند', tgBlkBulkKinds_().length === 0, tgBlkBulkKinds_().join('، '));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e && e.stack || '').slice(0, 200), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_DRY_LEAD = keep.lead; TG_OUT_KIND = keep.kind; }
  return { pass: pass, fail: fail, out: out };
}
/* کمینهٔ ورودی tgDayReport_ برای آزمون خط بلاک */
function tgBlkDayFixture_() {
  var d = { from: new Date(), to: new Date(), total: 0, site: 0, bot: 0, other: 0, sec: {}, noOwner: 0, noCall: 0, callSum: 0, callN: 0, booked: 0, free7: 0, taken7: 0, ther: 0,
    tkNew: 0, tkOpen: 0, tkLate: 0, tkSum: 0, tkN: 0, bugNew: 0, bugOpen: 0, school: 0, money: 0, care: true, by: {}, errs: 0, week: 0, weekSite: 0, weekBooked: 0,
    worst: '', worstH: 0, pending: 0, hookErr: '', call: 0, tkAvg: 0, rate7: 0, cover: 0, blocked: tgBlkCount_() };
  return d;
}
/* ارسال گروهی بی نوع: tgSend_ یا tgPhoto_ خام در این توابع (باید tgSendAs_ یا tgNotify_ باشد) */
var TG_BLK_BULK = ['tgCpRun_', 'tgCpDeadlineRemind_', 'tgBcSend_', 'tgFeedPush', 'tgMeetRemindTick_', 'tgTqRemind_', 'tgPqRemind', 'pbDigestRun_', 'scClinRemind_', 'scConnRemind_', 'dqSend_'];
function tgBlkBulkKinds_() {
  var g = (typeof globalThis !== 'undefined') ? globalThis : this, bad = [];
  TG_BLK_BULK.forEach(function (fn) {
    var f = g[fn]; if (typeof f !== 'function') { bad.push(fn + ' (نیست)'); return; }
    if (/(^|[^\w.])tg(Send|Photo)_\(/.test(String(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) bad.push(fn);
  });
  return bad;
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'tgBlkTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['بلاک شدن بات (v170.25)', 'tgBlkTests']); } catch (eBk) {}

/* v170.25: ارسال با نوع «سیاست پیام» (TG_NK) برای «ارسال‌های بات»؛ پیش از این tgSend_ خامِ ارسال‌های گروهی «نامشخص» ثبت می‌شد.
   فقط نوع ثبت می‌شود؛ سقف و سکوت شب همان رفتار قبلی است (برای آن tgNotify_). */
function tgSendAs_(kind, chat, text, markup, replyTo) {
  var k0 = TG_OUT_KIND; TG_OUT_KIND = kind;
  try { return tgSend_(chat, text, markup, replyTo); } finally { TG_OUT_KIND = k0; }
}
