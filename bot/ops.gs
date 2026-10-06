/**
 * ops.gs · v169.2 · ۱۱ مهر ۱۴۰۵ · هاب عملیات، هاب‌های شخصی، حضور کارکنان و فهرست روز گاندی
 *
 * چرا: کارهای تیم در کارت‌های پراکندهٔ تلگرام و چند تب گم می‌شد و هیچ‌جا معلوم نبود هر نفر امروز چه باید بکند.
 * - «هاب عملیات» (گوگل‌شیت تازه، مالک یاسر، فقط او): تب «کارها» دفتر مرکزی همهٔ کارهای تیم (کد T-1001 به بالا).
 * - منطق موازی نیست: «آداپتور»ها از همان رویدادهای موجود بات کار می‌سازند و می‌بندند (opsAdapt_* در جای خود رویداد صدا زده می‌شود):
 *   لید تازه و پیگیری (L-)، بازبینی علمی (E-)، درخواست عضویت مدرسه، اپلای تراپیست (A-)، تأیید پرداخت (PAY-)، کارهای قبلی بات (K-).
 * - هاب شخصی: برای هر نفر یک شیت جدا که فقط با ایمیل خودش شیر می‌شود (ستون «ایمیل» در انتهای تب «افراد»).
 *   ایمیل فقط برای ساختن و شیر کردن است: در هیچ پیام بات، مینی‌اپ، لاگ، گزارش سلامت یا خروجی گیت‌هاب نمی‌آید.
 *   اگر ایمیل ردیف عوض یا پاک شد، دسترسی نفر قبلی برداشته می‌شود (opsHubShare_ همهٔ ویرایشگرها را با ایمیل فعلی می‌سنجد).
 * - همگامی دوطرفه: بات ردیف را در هاب مالک آینه می‌کند؛ تریگر installable onEdit روی هاب عملیات و هر هاب شخصی (opsOnEdit)
 *   تغییر وضعیت، مهلت یا مالک را به «کارها» و به state بات برمی‌گرداند. onEdit با نوشتن خود اسکریپت اجرا نمی‌شود، پس حلقه نمی‌سازد؛
 *   قفل LockService هم هست. اگر کار به بات وصل است (E-، K-)، تغییر وضعیت در شیت همان اثر دکمهٔ بات را دارد. تأیید پرداخت فقط از دکمهٔ بات.
 * - ریتم: ۹:۰۰ «کار امروز» برای هر نفر، ۱۸:۰۰ جمع‌بندی برای مسئول پذیرش، سردبیر و یاسر، ارجاع کار ۲۴ ساعت گذشته از مهلت به پاسخگو،
 *   و اگر پاسخگو هم ۲۴ ساعت کاری نکرد، در جمع‌بندی یاسر. اعلان فقط ۹ تا ۱۸.
 * - حضور کارکنان حضوری گاندی (بی موقعیت): «🟢 رسیدم» و «🔴 رفتم»؛ شیفت برنامه‌ریزی‌شده مبنا اگر ثبت نشد؛ هر فعالیت همان روز نشانهٔ حضور.
 *   خروجی تب «کارکرد ماهانه» هاب پذیرش. هیچ مبلغ حقوق یا اطلاعات بیمه‌ای نوشته نمی‌شود.
 * - فهرست روز گاندی: هر جلسهٔ حضوری با «آمد» و «نیامد» (بی نام مراجع)؛ اشغال ماهانهٔ هر اتاق و نرخ غیبت در «گزارش گاندی».
 */

var OPS_TAB = 'کارها';
var OPS_HEAD = ['کد', 'عنوان', 'دسته', 'اولویت', 'وضعیت', 'مالک', 'واگذارکننده', 'پاسخگو', 'تاریخ ایجاد', 'مهلت', 'مهلت (میلادی)',
  'منبع', 'کد مرجع', 'لینک', 'یادداشت', 'آخرین تغییر', 'chat مالک', 'ارجاع'];
var OPS_C = {}; OPS_HEAD.forEach(function (h, i) { OPS_C[h] = i; });
var OPS_CATS = ['لید و پذیرش', 'مدرسه', 'مالی', 'بازبینی علمی', 'مجله و محتوا', 'سوشال', 'حضوری', 'درمانگران', 'سازمانی', 'فنی', 'اداری'];
var OPS_PRI = ['فوری', 'بالا', 'عادی', 'پایین'];
var OPS_ST = { NEW: 'تازه', DOING: 'در حال انجام', WAIT: 'منتظر دیگری', DONE: 'انجام شد', DROP: 'لغو' };
var OPS_ST_LIST = [OPS_ST.NEW, OPS_ST.DOING, OPS_ST.WAIT, OPS_ST.DONE, OPS_ST.DROP];
var OPS_SRC = ['بات', 'هاب پذیرش', 'هاب محتوا', 'هاب مدرسه', 'دستی'];
var OPS_LISTS_TAB = 'فهرست‌ها';
var OPS_REG_TAB = 'هاب‌ها';
var OPS_REG_HEAD = ['نام', 'chat', 'شناسهٔ هاب', 'لینک', 'ساخته‌شده', 'آخرین شیر'];
var OPS_FONT = 'Vazirmatn';
var OPS_INK = '#222222', OPS_WHITE = '#fefefe', OPS_RED = '#c83f49', OPS_SOFT = '#f5f5f8', OPS_LINE = '#dfdfe2';
var OPS_EMAIL_COL = 'ایمیل';
/* هاب‌های فاز ۱: یاسر (TG_OWNER_CHAT) و سردبیر (سردبیر، نقش «سردبیر»). بقیه با opsHubMake(نام) در فاز ۲ */
var OPS_HUB_ROLES = ['ناظر', 'سردبیر'];

/* هاب شخصی */
var HUB_MINE = 'کارهای من';
var HUB_MINE_HEAD = ['کد', 'عنوان', 'دسته', 'اولویت', 'وضعیت', 'مالک', 'مهلت', 'کد مرجع', 'لینک', 'یادداشت', 'آخرین تغییر', 'مهلت (میلادی)'];
var HUB_C = {}; HUB_MINE_HEAD.forEach(function (h, i) { HUB_C[h] = i; });
var HUB_TODAY = 'امروز', HUB_QUEUES = 'صف‌ها', HUB_REPORT = 'گزارش من', HUB_GUIDE = 'راهنما';

/* ---------------- کمکی ---------------- */
/* قفل جدا از قفل اسکریپت بات (UserLock؛ همهٔ اجراها با حساب یاسر است)، تا با doPost گره نخورد. OPS_LOCKED: صدازننده قفل را دارد */
var OPS_LOCKED = false;
var OPS_SS_MEMO = null;
function opsLock_(ms) {
  if (opsDry_() || OPS_LOCKED) return { ok: true, rel: function () {} };
  var l = LockService.getUserLock();
  if (!l.tryLock(ms)) return { ok: false, rel: function () {} };
  OPS_LOCKED = true;
  return { ok: true, rel: function () { OPS_LOCKED = false; try { l.releaseLock(); } catch (e) {} } };
}
function opsDry_() { return (typeof TG_DRY !== 'undefined') ? !!TG_DRY : false; }
function opsNow_() { return opsDry_() && TG_MEM['ops:now'] ? new Date(Number(TG_MEM['ops:now'])) : new Date(); }
function opsJ_(d) { if (!d) return ''; var j = tgJalali_(d, TG_TZ); return j.y + '/' + ('0' + j.m).slice(-2) + '/' + ('0' + j.d).slice(-2); }
function opsStamp_(d) { return opsJ_(d || opsNow_()) + ' ' + Utilities.formatDate(d || opsNow_(), TG_TZ, 'HH:mm'); }
function opsDayKey_(d) { return Utilities.formatDate(d || opsNow_(), TG_TZ, 'yyyy-MM-dd'); }
function opsProp_(k, v) {
  if (opsDry_()) { if (v === undefined) return TG_MEM['opsp:' + k] || ''; if (v === null) delete TG_MEM['opsp:' + k]; else TG_MEM['opsp:' + k] = String(v); return v; }
  var P = PropertiesService.getScriptProperties();
  if (v === undefined) return P.getProperty(k) || '';
  if (v === null) P.deleteProperty(k); else P.setProperty(k, String(v));
  return v;
}
function opsInHours_(d) { var h = +Utilities.formatDate(d || opsNow_(), TG_TZ, 'H'); return h >= 9 && h < 18; }
/* مسئول پذیرش (مسئول پذیرش)؛ در تست خشک از TG_MEM */
function opsBoss_() { if (opsDry_()) return TG_MEM['ops:boss'] || null; try { return tgDutyBoss_(); } catch (e) { return null; } }
function opsOwnerChat_() { return typeof TG_OWNER_CHAT !== 'undefined' ? String(TG_OWNER_CHAT) : ''; }
function opsOpen_(t) { return t.st !== OPS_ST.DONE && t.st !== OPS_ST.DROP; }
function opsPeople_() {
  try { return (typeof tgPeopleList_ === 'function' ? tgPeopleList_() : []).filter(function (p) { return p.name && String(p.status || '').trim() !== 'غیرفعال'; }); } catch (e) { return []; }
}
function opsPersonByChat_(chat) {
  var c = String(chat || '');
  if (!c) return null;
  return opsPeople_().filter(function (p) { return String(p.chat || '').split(/[,،\s]+/).indexOf(c) > -1; })[0] || null;
}
function opsFirstChat_(p) { return p ? String(p.chat || '').split(/[,،\s]+/).filter(String)[0] || '' : ''; }

/* ---------------- هاب عملیات ---------------- */
function opsSS_() {
  if (opsDry_()) return null;
  if (OPS_SS_MEMO) return OPS_SS_MEMO;
  var id = opsProp_('OPS_SS_ID');
  return id ? (OPS_SS_MEMO = SpreadsheetApp.openById(id)) : null;
}
function opsSheet_() { var ss = opsSS_(); return ss ? ss.getSheetByName(OPS_TAB) : null; }

/* ظاهر مشترک: فونت، راست‌به‌چپ، سرستون سفید روی مشکی، ردیف اول فریز */
function opsStyleSheet_(sh, head) {
  sh.setRightToLeft(true);
  sh.getRange(1, 1, Math.max(1, sh.getMaxRows()), Math.max(head.length, sh.getMaxColumns())).setFontFamily(OPS_FONT).setFontSize(11).setVerticalAlignment('middle');
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setFontColor(OPS_WHITE).setBackground(OPS_INK);
  sh.setFrozenRows(1);
}
function opsDrop_(range, list) { range.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build()); }
function opsDropRange_(range, src) { range.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(src, true).setAllowInvalid(true).build()); }
/* قرمز فقط برای «فوری» و «معوق» */
function opsRedRules_(sh, priCol, dueGregCol, stCol, nRows) {
  var L = function (c) { return String.fromCharCode(64 + c); };
  var all = sh.getRange(2, 1, nRows, sh.getLastColumn() || 1);
  var rules = [
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + L(priCol) + '2="فوری"').setFontColor(OPS_RED).setBold(true).setRanges([sh.getRange(2, priCol, nRows, 1)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($' + L(dueGregCol) + '2<>"",$' + L(dueGregCol) + '2<TODAY(),$' + L(stCol) + '2<>"انجام شد",$' + L(stCol) + '2<>"لغو")')
      .setBackground('#faeced').setFontColor(OPS_RED).setRanges([all]).build()
  ];
  sh.setConditionalFormatRules(rules);
}

/* فهرست نام‌ها برای کشویی مالک، واگذارکننده، پاسخگو (تب پنهان «فهرست‌ها»)؛ روزانه تازه می‌شود */
function opsListsRefresh_() {
  var ss = opsSS_(); if (!ss) return 0;
  var sh = ss.getSheetByName(OPS_LISTS_TAB) || ss.insertSheet(OPS_LISTS_TAB);
  var names = opsPeople_().filter(function (p) { return /پذیرش|مدرسه|سردبیر|ناظر|مالی|سوشال|سازمانی|راهبر|مصاحبه‌گر|تنخواه/.test((p.roles || []).join(',')); }).map(function (p) { return [p.name]; });
  sh.clear();
  sh.getRange(1, 1).setValue('نام');
  if (names.length) sh.getRange(2, 1, names.length, 1).setValues(names);
  sh.hideSheet();
  return names.length;
}

/* ساختن هاب عملیات (یک بار): مالک همان حساب اسکریپت (یاسر) است و با کسی شیر نمی‌شود */
function opsSetup_() {
  if (opsDry_()) return 'dry';
  var ss = opsSS_();
  if (!ss) { ss = SpreadsheetApp.create('هاب عملیات · تجربه'); opsProp_('OPS_SS_ID', ss.getId()); }
  ss.setSpreadsheetLocale('fa_IR'); ss.setSpreadsheetTimeZone(TG_TZ);
  var sh = ss.getSheetByName(OPS_TAB) || ss.insertSheet(OPS_TAB, 0);
  opsStyleSheet_(sh, OPS_HEAD);
  var n = Math.max(500, sh.getMaxRows() - 1);
  if (sh.getMaxRows() < 501) sh.insertRowsAfter(sh.getMaxRows(), 501 - sh.getMaxRows());
  opsDrop_(sh.getRange(2, OPS_C['دسته'] + 1, n, 1), OPS_CATS);
  opsDrop_(sh.getRange(2, OPS_C['اولویت'] + 1, n, 1), OPS_PRI);
  opsDrop_(sh.getRange(2, OPS_C['وضعیت'] + 1, n, 1), OPS_ST_LIST);
  opsDrop_(sh.getRange(2, OPS_C['منبع'] + 1, n, 1), OPS_SRC);
  opsListsRefresh_();
  var names = ss.getSheetByName(OPS_LISTS_TAB).getRange('A2:A200');
  ['مالک', 'واگذارکننده', 'پاسخگو'].forEach(function (h) { opsDropRange_(sh.getRange(2, OPS_C[h] + 1, n, 1), names); });
  opsRedRules_(sh, OPS_C['اولویت'] + 1, OPS_C['مهلت (میلادی)'] + 1, OPS_C['وضعیت'] + 1, n);
  sh.hideColumns(OPS_C['مهلت (میلادی)'] + 1); sh.hideColumns(OPS_C['chat مالک'] + 1, 2);
  sh.setColumnWidth(OPS_C['عنوان'] + 1, 320); sh.setColumnWidth(OPS_C['یادداشت'] + 1, 260);
  var reg = ss.getSheetByName(OPS_REG_TAB) || ss.insertSheet(OPS_REG_TAB);
  opsStyleSheet_(reg, OPS_REG_HEAD); reg.hideSheet();
  ss.getSheets().forEach(function (s) { if ([OPS_TAB, OPS_LISTS_TAB, OPS_REG_TAB].indexOf(s.getName()) < 0 && ss.getSheets().length > 3) ss.deleteSheet(s); });
  opsTrigger_(ss.getId());
  return ss.getUrl();
}
function opsTrigger_(ssid) {
  if (opsDry_()) return;
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'opsOnEdit' && t.getTriggerSourceId() === ssid; });
  if (!has) ScriptApp.newTrigger('opsOnEdit').forSpreadsheet(ssid).onEdit().create();
}

/* ---------------- دفتر «کارها» ---------------- */
function opsRows_() {
  if (opsDry_()) return (TG_MEM['ops:rows'] = TG_MEM['ops:rows'] || []);
  var sh = opsSheet_(); if (!sh) return [];
  var n = sh.getLastRow(); if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, OPS_HEAD.length).getValues().map(function (r, i) { return opsObj_(r, i + 2); }).filter(function (t) { return t.code; });
}
function opsObj_(r, row) {
  return { row: row, code: String(r[0] || ''), title: String(r[1] || ''), cat: String(r[2] || ''), pri: String(r[3] || ''), st: String(r[4] || ''),
    owner: String(r[5] || ''), by: String(r[6] || ''), resp: String(r[7] || ''), made: String(r[8] || ''), due: String(r[9] || ''),
    dueAt: r[10] instanceof Date ? r[10] : (r[10] ? new Date(r[10]) : null), src: String(r[11] || ''), ref: String(r[12] || ''), link: String(r[13] || ''),
    note: String(r[14] || ''), moved: String(r[15] || ''), ownerChat: String(r[16] || ''), esc: String(r[17] || '') };
}
function opsArr_(t) {
  return [t.code, t.title, t.cat, t.pri, t.st, t.owner, t.by, t.resp, t.made, t.due, t.dueAt || '', t.src, t.ref, t.link, t.note, t.moved, t.ownerChat, t.esc];
}
function opsGet_(code) { return opsRows_().filter(function (t) { return t.code === code; })[0] || null; }
function opsByRef_(ref) { return opsRows_().filter(function (t) { return t.ref === ref && opsOpen_(t); }); }
function opsWrite_(t) {
  if (opsDry_()) { var rows = opsRows_(), i = rows.map(function (x) { return x.code; }).indexOf(t.code); if (i < 0) rows.push(t); else rows[i] = t; return; }
  var sh = opsSheet_(); if (!sh) return;
  if (t.row) sh.getRange(t.row, 1, 1, OPS_HEAD.length).setValues([opsArr_(t)]);
  else { sh.appendRow(opsArr_(t)); t.row = sh.getLastRow(); }
}

/* کار تازه یا به‌روز (با همان منبع و کد مرجع یک کار باز می‌ماند).
   o: {title, cat, pri, owner, ownerChat, by, resp, due: Date, src, ref, link, note} */
function opsAdd_(o) {
  if (opsDry_() ? !TG_MEM['ops:on'] : !opsSS_()) return '';
  var lock = opsLock_(10000);
  if (!lock.ok) { tgErr_('opsAdd_', 'قفل نیامد: ' + (o.ref || '')); return ''; }
  try {
    var rows = opsRows_(), hit = o.ref ? rows.filter(function (t) { return t.ref === o.ref && opsOpen_(t); })[0] : null;
    if (!o.ownerChat && o.owner) { var pp = opsPeople_().filter(function (p) { return p.name === o.owner; })[0]; o.ownerChat = opsFirstChat_(pp); }
    if (!o.owner && o.ownerChat) { var pc = opsPersonByChat_(o.ownerChat); o.owner = pc ? pc.name : ''; }
    if (hit) {
      var before = hit.ownerChat;
      if (o.title) hit.title = String(o.title).slice(0, 200);
      if (o.owner) { hit.owner = o.owner; hit.ownerChat = o.ownerChat || hit.ownerChat; }
      if (o.due) { hit.dueAt = o.due; hit.due = opsJ_(o.due); }
      if (o.pri) hit.pri = o.pri;
      if (o.st) hit.st = o.st;
      hit.moved = opsStamp_();
      opsWrite_(hit);
      opsMirror_(hit, before);
      return hit.code;
    }
    var mx = 1000;
    rows.forEach(function (t) { var m = /^T-(\d+)$/.exec(t.code); if (m) mx = Math.max(mx, +m[1]); });
    var t = { code: 'T-' + (mx + 1), title: String(o.title || '').slice(0, 200), cat: o.cat || 'اداری', pri: o.pri || 'عادی', st: o.st || OPS_ST.NEW,
      owner: o.owner || '', by: o.by || 'بات', resp: o.resp || '', made: opsStamp_(), due: o.due ? opsJ_(o.due) : '', dueAt: o.due || null,
      src: o.src || 'بات', ref: o.ref || '', link: o.link || '', note: String(o.note || '').slice(0, 500), moved: opsStamp_(), ownerChat: o.ownerChat || '', esc: '' };
    opsWrite_(t);
    opsMirror_(t, '');
    return t.code;
  } finally { lock.rel(); }
}
/* بستن کارهای باز یک کد مرجع (رویداد بات کار را تمام کرد) */
function opsCloseRef_(ref, st) {
  if (!ref) return 0;
  var n = 0;
  opsByRef_(ref).forEach(function (t) { t.st = st || OPS_ST.DONE; t.moved = opsStamp_(); opsWrite_(t); opsMirror_(t, t.ownerChat); n++; });
  return n;
}
/* تغییر از شیت (هاب عملیات یا هاب شخصی) یا از بات. origin: 'sheet' | 'bot'. اثر روی بات فقط برای origin شیت */
function opsSet_(code, patch, origin, actorChat) {
  var t = opsGet_(code); if (!t) return null;
  var before = { st: t.st, ownerChat: t.ownerChat };
  if (patch.st !== undefined) t.st = patch.st;
  if (patch.owner !== undefined) { t.owner = patch.owner; var p = opsPeople_().filter(function (x) { return x.name === patch.owner; })[0]; t.ownerChat = opsFirstChat_(p); }
  if (patch.dueText !== undefined) { t.due = patch.dueText; t.dueAt = opsParseJ_(patch.dueText); }
  if (patch.note !== undefined) t.note = String(patch.note).slice(0, 500);
  t.moved = opsStamp_(); t.esc = '';
  opsWrite_(t);
  opsMirror_(t, before.ownerChat);
  if (origin === 'sheet' && patch.st !== undefined && patch.st !== before.st) opsEffect_(t, before.st, actorChat || t.ownerChat);
  return t;
}
/* «۱۴۰۵/۰۷/۱۲» ← Date (ظهر تهران) */
function opsParseJ_(s) {
  var m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(tgLatinDigits_(String(s || '')).trim());
  if (!m) return null;
  try { var gd = tgJ2G_(+m[1], +m[2], +m[3]); return new Date(Date.UTC(gd.getFullYear(), gd.getMonth(), gd.getDate(), 8, 30)); } catch (e) { return null; }
}

/* اثر تغییر وضعیت در شیت روی بات: همان کاری که دکمهٔ بات می‌کند */
function opsEffect_(t, oldSt, chat) {
  try {
    if (/^E-\d+$/.test(t.ref) && typeof rvApprove_ === 'function') {
      var e = vxEdGet_(t.ref); if (!e) return;
      var res = null;
      if (t.st === OPS_ST.DONE && e['وضعیت'] === RV_ST.READY) res = rvPublish_(chat, t.ref);
      else if (t.st === OPS_ST.DONE && [RV_ST.ED, RV_ST.BACKY].indexOf(e['وضعیت']) > -1) res = rvApprove_(chat, t.ref);
      else if (t.st === OPS_ST.DROP && e['وضعیت'] !== RV_ST.PUB) res = rvReject_(chat, t.ref);
      /* بات نپذیرفت (مثلاً چک آمادگی قرمز): وضعیت شیت برمی‌گردد و دلیل در یادداشت می‌آید */
      if (res && res.ok === false) opsRevert_(t, oldSt, res.error);
      return;
    }
    if (/^K-\d+$/.test(t.ref) && typeof tgTskSet_ === 'function') {
      var map = {}; map[OPS_ST.DOING] = TG_TSK_ST.doing; map[OPS_ST.DONE] = TG_TSK_ST.done; map[OPS_ST.DROP] = TG_TSK_ST.drop; map[OPS_ST.NEW] = TG_TSK_ST.open;
      if (map[t.st] && !opsDry_()) tgTskSet_(t.ref, 10, map[t.st]);
      return;
    }
    /* تأیید پرداخت عمداً فقط از دکمهٔ بات است (حساس)؛ تغییر وضعیت شیت فقط یادداشت می‌گیرد */
    if (/^PAY-?\d+$/.test(t.ref) && (t.st === OPS_ST.DONE || t.st === OPS_ST.DROP)) opsRevert_(t, oldSt, 'تأیید یا رد پرداخت فقط با دکمهٔ بات');
  } catch (x) { tgErr_('opsEffect_ ' + t.code, x); }
}
function opsRevert_(t, oldSt, why) {
  var cur = opsGet_(t.code) || t;
  cur.st = oldSt; cur.note = String((cur.note ? cur.note + ' · ' : '') + (why || '')).slice(0, 500);
  opsWrite_(cur); opsMirror_(cur, cur.ownerChat);
}

/* ---------------- هاب‌های شخصی ---------------- */
function opsRegRows_() {
  if (opsDry_()) return (TG_MEM['ops:reg'] = TG_MEM['ops:reg'] || []);
  var ss = opsSS_(); if (!ss) return [];
  var sh = ss.getSheetByName(OPS_REG_TAB); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, OPS_REG_HEAD.length).getValues().map(function (r, i) { return { row: i + 2, name: String(r[0]), chat: String(r[1]), id: String(r[2]), url: String(r[3]) }; });
}
function opsHubOf_(chat) { var c = String(chat || ''); return opsRegRows_().filter(function (r) { return c && r.chat === c; })[0] || null; }
function opsHubOfName_(name) { return opsRegRows_().filter(function (r) { return r.name === name; })[0] || null; }

/* ایمیل نفر از ستون «ایمیل» تب «افراد» (فقط برای شیر کردن؛ هرگز لاگ یا پیام نمی‌شود) */
function opsEmailOf_(name) {
  if (opsDry_()) return (TG_MEM['ops:email'] || {})[name] || '';
  var sh = tgSS_().getSheetByName(TG_PEOPLE_TAB);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), c = head.indexOf(OPS_EMAIL_COL);
  if (c < 0) return '';
  var v = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), Math.max(c + 1, 1)).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === name) { var em = String(v[i][c]).trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) ? em : ''; }
  return '';
}
/* ستون «ایمیل» در انتهای «افراد» (یک بار) */
function opsEmailCol_() {
  if (opsDry_()) return 'dry';
  var sh = tgSS_().getSheetByName(TG_PEOPLE_TAB), lc = sh.getLastColumn();
  var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(String);
  if (head.indexOf(OPS_EMAIL_COL) > -1) return 'بود';
  sh.getRange(1, lc + 1).setValue(OPS_EMAIL_COL).setFontWeight('bold');
  try { sh.getRange(1, lc + 1).setNote('فقط برای ساختن و شیر کردن هاب شخصی. در هیچ پیام یا گزارشی نمی‌آید.'); } catch (e) {}
  CacheService.getScriptCache().remove('plist');
  return 'ساخته شد';
}
/* دسترسی هاب: فقط مالک فایل (یاسر) و ایمیل فعلی همان نفر. هر ویرایشگر یا بینندهٔ دیگری برداشته می‌شود */
function opsHubShare_(name, ssid) {
  if (opsDry_()) { TG_MEM['ops:share:' + name] = opsEmailOf_(name) || ''; if (TG_MEM['ops:noowner']) { tgErr_('opsHubShare_', 'مالک فایل هاب «' + name + '» در دسترس نیست'); return 'بی مالک'; } opsRegShared_(name, opsStamp_()); return 'قفل'; }
  var f = DriveApp.getFileById(ssid), em = opsEmailOf_(name), me = '';
  /* v169.2.2: مالک فایل (یاسر) از خود فایل درایو؛ راه قبلی (کاربر مؤثر نشست) مجوز تازهٔ ایمیل می‌خواست و یک‌بارهٔ v169.2 را شکست.
     نام آن تابع را در هیچ یادداشتی ننویس: Apps Script مجوزها را از متن خام کد، با یادداشت‌ها، پیدا می‌کند.
     اگر مالک در دسترس نبود (مثلاً فایل در درایو اشتراکی است)، کسی برداشته نمی‌شود، کار ادامه پیدا می‌کند و مورد در «خطاها» ثبت می‌شود. */
  try { var ow = f.getOwner(); me = ow ? String(ow.getEmail() || '').toLowerCase() : ''; } catch (eO) { me = ''; }
  if (!me) {
    tgErr_('opsHubShare_', 'مالک فایل هاب «' + name + '» در دسترس نیست (شاید درایو اشتراکی)؛ کسی برداشته نشد و فقط دسترسی همین نفر سنجیده شد');
    try { if (em && f.getEditors().map(function (u) { return String(u.getEmail()).toLowerCase(); }).indexOf(em) < 0) f.addEditor(em); } catch (eA) { tgErr_('opsHubShare_ addEditor', eA); }
    opsRegShared_(name, 'بی مالک · ' + opsStamp_());
    return 'بی مالک';
  }
  f.getEditors().concat(f.getViewers()).forEach(function (u) {
    var x = String(u.getEmail() || '').toLowerCase();
    if (x && x !== me && x !== em) { try { f.removeEditor(x); } catch (e1) {} try { f.removeViewer(x); } catch (e2) {} }
  });
  if (em && em !== me && f.getEditors().map(function (u) { return String(u.getEmail()).toLowerCase(); }).indexOf(em) < 0) f.addEditor(em);
  f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  opsRegShared_(name, opsStamp_());
  return 'قفل';
}
/* ستون «آخرین شیر» تب «هاب‌ها» */
function opsRegShared_(name, v) {
  if (opsDry_()) { TG_MEM['ops:shared:' + name] = v; return; }
  try {
    var sh = opsSS_().getSheetByName(OPS_REG_TAB), n = sh.getLastRow(); if (n < 2) return;
    var col = OPS_REG_HEAD.indexOf('آخرین شیر') + 1, nm = sh.getRange(2, 1, n - 1, 1).getValues();
    for (var i = 0; i < nm.length; i++) if (String(nm[i][0]).trim() === name) sh.getRange(i + 2, col).setValue(v);
  } catch (e) { tgErr_('opsRegShared_', e); }
}
/* گزارش هاب یاسر برای یک‌بارهٔ انتشار: ساخته شد؟ قفل است؟ «آخرین شیر» پر است؟ (بی ایمیل) */
function opsHubAudit_() {
  if (opsDry_()) return 'dry';
  var r = opsRegRows_().filter(function (x) { return String(x.chat) === String(opsOwnerChat_()); })[0];
  if (!r) return 'هاب یاسر ساخته نشده';
  var out = 'هاب یاسر ساخته شد';
  try {
    var f = DriveApp.getFileById(r.id), others = f.getEditors().concat(f.getViewers()).length;
    out += ' · دسترسی: ' + (String(f.getSharingAccess()) === 'PRIVATE' ? 'خصوصی' : String(f.getSharingAccess())) + ' · نفر دیگر: ' + others;
  } catch (e) { out += ' · خواندن دسترسی نشد: ' + String(e).slice(0, 80); }
  try {
    var sh = opsSS_().getSheetByName(OPS_REG_TAB), n = sh.getLastRow(), v = sh.getRange(2, 1, n - 1, OPS_REG_HEAD.length).getDisplayValues();
    var row = v.filter(function (x) { return String(x[1]) === String(r.chat); })[0];
    out += ' · آخرین شیر: ' + (row && row[5] ? row[5] : 'خالی');
  } catch (e2) { out += ' · آخرین شیر: خوانده نشد'; }
  return out;
}
/* ساختن هاب شخصی برای یک ردیف «افراد» (فاز ۲: opsHubMake('مسئول پذیرش …')) */
function opsHubMake(name) {
  var p = opsPeople_().filter(function (x) { return x.name === name; })[0];
  if (!p) return 'این نام در «افراد» نیست.';
  var chat = opsFirstChat_(p);
  var hit = opsHubOfName_(name);
  if (opsDry_()) { if (!hit) opsRegRows_().push({ name: name, chat: chat, id: 'DRYHUB' + opsRegRows_().length, url: 'https://docs.google.com/spreadsheets/d/DRY' }); opsHubShare_(name, ''); opsHubRefresh_(name); return 'dry'; }
  var ss = hit ? SpreadsheetApp.openById(hit.id) : SpreadsheetApp.create('هاب من · ' + name + ' · تجربه');
  ss.setSpreadsheetLocale('fa_IR'); ss.setSpreadsheetTimeZone(TG_TZ);
  opsHubBuild_(ss, name, p);
  if (!hit) {
    opsSS_().getSheetByName(OPS_REG_TAB).appendRow([name, chat, ss.getId(), ss.getUrl(), opsStamp_(), '']);
  }
  opsHubShare_(name, ss.getId());
  opsTrigger_(ss.getId());
  opsHubRefresh_(name);
  return ss.getUrl();
}
function opsHubBuild_(ss, name, p) {
  var tabs = [HUB_TODAY, HUB_MINE, HUB_QUEUES, HUB_REPORT, HUB_GUIDE];
  tabs.forEach(function (t, i) { if (!ss.getSheetByName(t)) ss.insertSheet(t, i); });
  ss.getSheets().forEach(function (s) { if (tabs.indexOf(s.getName()) < 0) s.hideSheet(); });
  var mine = ss.getSheetByName(HUB_MINE);
  opsStyleSheet_(mine, HUB_MINE_HEAD);
  var n = 400;
  if (mine.getMaxRows() < n + 1) mine.insertRowsAfter(mine.getMaxRows(), n + 1 - mine.getMaxRows());
  opsDrop_(mine.getRange(2, HUB_C['دسته'] + 1, n, 1), OPS_CATS);
  opsDrop_(mine.getRange(2, HUB_C['اولویت'] + 1, n, 1), OPS_PRI);
  opsDrop_(mine.getRange(2, HUB_C['وضعیت'] + 1, n, 1), OPS_ST_LIST);
  var names = opsPeople_().filter(function (x) { return /پذیرش|مدرسه|سردبیر|ناظر|مالی|سوشال|سازمانی|راهبر/.test((x.roles || []).join(',')); }).map(function (x) { return x.name; });
  if (names.length) opsDrop_(mine.getRange(2, HUB_C['مالک'] + 1, n, 1), names);
  opsRedRules_(mine, HUB_C['اولویت'] + 1, HUB_C['مهلت (میلادی)'] + 1, HUB_C['وضعیت'] + 1, n);
  mine.hideColumns(HUB_C['مهلت (میلادی)'] + 1);
  mine.setColumnWidth(HUB_C['عنوان'] + 1, 320);
  try { if (!mine.getFilter()) mine.getRange(1, 1, n + 1, HUB_MINE_HEAD.length).createFilter(); } catch (e) {}
  /* «امروز»: سه عدد و فهرست امروز به ترتیب اولویت؛ همه فرمول و محافظت‌شده */
  var td = ss.getSheetByName(HUB_TODAY);
  td.clear(); td.setRightToLeft(true);
  var M = "'" + HUB_MINE + "'!";
  td.getRange('A1:C1').setValues([['امروز', 'معوق', 'منتظر تأیید من']]).setFontColor(OPS_WHITE).setBackground(OPS_INK).setFontWeight('bold').setHorizontalAlignment('center');
  td.getRange('A2:C2').setFormulas([[
    '=COUNTIFS(' + M + 'L2:L,">="&TODAY(),' + M + 'L2:L,"<"&TODAY()+1,' + M + 'E2:E,"<>انجام شد",' + M + 'E2:E,"<>لغو")',
    '=COUNTIFS(' + M + 'L2:L,"<"&TODAY(),' + M + 'L2:L,"<>",' + M + 'E2:E,"<>انجام شد",' + M + 'E2:E,"<>لغو")',
    '=COUNTIFS(' + M + 'B2:B,"*تأیید*",' + M + 'E2:E,"<>انجام شد",' + M + 'E2:E,"<>لغو")'
  ]]).setFontSize(26).setFontWeight('bold').setHorizontalAlignment('center');
  td.getRange('B2').setFontColor(OPS_RED);
  td.getRange('A4').setValue('کارهای امروز و معوق، به ترتیب اولویت').setFontWeight('bold');
  td.getRange('A5:F5').setValues([['کد', 'عنوان', 'اولویت', 'وضعیت', 'مهلت', 'کد مرجع']]).setFontColor(OPS_WHITE).setBackground(OPS_INK).setFontWeight('bold');
  td.getRange('A6').setFormula('=IFERROR(SORT(FILTER({' + M + 'A2:B,' + M + 'D2:E,' + M + 'G2:H,MATCH(' + M + 'D2:D,{"فوری";"بالا";"عادی";"پایین"},0)},' + M + 'L2:L<TODAY()+1,' + M + 'L2:L<>"",' + M + 'E2:E<>"انجام شد",' + M + 'E2:E<>"لغو"),7,TRUE,6,TRUE),"کاری برای امروز نیست")');
  td.hideColumns(7);
  td.getRange(1, 1, 60, 8).setFontFamily(OPS_FONT);
  td.setFrozenRows(2);
  try { td.protect().setDescription('فرمول؛ با بات و «کارهای من» عوض می‌شود').setWarningOnly(true); } catch (e2) {}
  [HUB_QUEUES, HUB_REPORT, HUB_GUIDE].forEach(function (t) { var s = ss.getSheetByName(t); s.setRightToLeft(true); s.getRange(1, 1, 80, 6).setFontFamily(OPS_FONT); try { s.protect().setDescription('ساختهٔ بات').setWarningOnly(true); } catch (e3) {} });
  opsHubGuide_(ss.getSheetByName(HUB_GUIDE));
}
function opsHubGuide_(sh) {
  sh.clear();
  var rows = [['راهنمای هاب من', ''],
    ['«امروز»', 'سه عدد بالا: کارهای امروز، معوق‌ها و کارهایی که منتظر تأیید شماست. پایینش فهرست امروز به ترتیب اولویت. خودکار است و دستی عوض نمی‌شود.'],
    ['«کارهای من»', 'همهٔ کارهای باز شما. با فیلتر بالای ستون‌ها دسته یا اولویت را جدا کنید.'],
    ['کد', 'شمارهٔ کار در دفتر مرکزی (T-…).'], ['عنوان', 'چه باید کرد.'], ['دسته و اولویت', 'از فهرست انتخاب می‌شود. قرمز یعنی فوری یا گذشته از مهلت.'],
    ['وضعیت', 'تازه، در حال انجام، منتظر دیگری، انجام شد، لغو. با عوض کردنش همان لحظه دفتر مرکزی و بات خبردار می‌شوند. برای کارهای وصل به بات (مثل E- بازبینی) «انجام شد» همان دکمهٔ تأیید بات است.'],
    ['مالک', 'اگر کار را به همکار دیگری بسپارید، از هاب شما بیرون می‌رود و در هاب او می‌نشیند.'],
    ['مهلت', 'تاریخ شمسی مثل ۱۴۰۵/۰۷/۱۵. کاری که ۲۴ ساعت از مهلتش بگذرد به پاسخگو ارجاع می‌شود.'],
    ['کد مرجع و لینک', 'ردیف اصلی کار در هاب پذیرش، محتوا یا مدرسه.'], ['یادداشت', 'هر توضیحی برای خودتان یا همکار.'],
    ['«صف‌ها»', 'شمار هر صفی که به نقش شما مربوط است، با لینک.'], ['«گزارش من»', 'انجام‌شده‌های هفته و ماه، میانگین زمان انجام و امتیازها.']];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1, 1, 2).setFontColor(OPS_WHITE).setBackground(OPS_INK).setFontWeight('bold');
  sh.setColumnWidth(1, 160); sh.setColumnWidth(2, 640);
  sh.getRange(2, 2, rows.length, 1).setWrap(true);
}

/* آینه: ردیف کار در هاب مالک (و برداشتن از هاب مالک قبلی) */
function opsMirror_(t, prevChat) {
  try {
    if (prevChat && prevChat !== t.ownerChat) opsHubRowSet_(prevChat, t, true);
    if (t.ownerChat) opsHubRowSet_(t.ownerChat, t, !opsOpen_(t) ? 'done' : false);
  } catch (e) { tgErr_('opsMirror_ ' + t.code, e); }
}
function opsHubArr_(t) { return [t.code, t.title, t.cat, t.pri, t.st, t.owner, t.due, t.ref, t.link, t.note, t.moved, t.dueAt || '']; }
function opsHubRowSet_(chat, t, remove) {
  var hub = opsHubOf_(chat); if (!hub) return;
  if (opsDry_()) { var k = 'ops:hub:' + hub.id, a = (TG_MEM[k] = TG_MEM[k] || []), i = a.map(function (x) { return x[0]; }).indexOf(t.code);
    if (remove === true) { if (i > -1) a.splice(i, 1); } else if (i < 0) a.push(opsHubArr_(t)); else a[i] = opsHubArr_(t); return; }
  var sh = SpreadsheetApp.openById(hub.id).getSheetByName(HUB_MINE); if (!sh) return;
  var n = sh.getLastRow(), codes = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var i2 = codes.indexOf(t.code);
  if (remove === true) { if (i2 > -1) sh.deleteRow(i2 + 2); return; }
  if (i2 > -1) sh.getRange(i2 + 2, 1, 1, HUB_MINE_HEAD.length).setValues([opsHubArr_(t)]);
  else sh.appendRow(opsHubArr_(t));
}
/* بازسازی کامل «کارهای من»، «صف‌ها» و «گزارش من» یک نفر (روزانه و بعد از ساختن) */
function opsHubRefresh_(name) {
  var hub = opsHubOfName_(name); if (!hub) return 0;
  var mine = opsRows_().filter(function (t) { return t.ownerChat === hub.chat && opsOpen_(t); });
  var done = opsRows_().filter(function (t) { return t.ownerChat === hub.chat && t.st === OPS_ST.DONE; });
  if (opsDry_()) { TG_MEM['ops:hub:' + hub.id] = mine.map(opsHubArr_); TG_MEM['ops:hubq:' + hub.id] = opsQueues_(hub.chat); return mine.length; }
  var ss = SpreadsheetApp.openById(hub.id), sh = ss.getSheetByName(HUB_MINE), n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, HUB_MINE_HEAD.length).clearContent();
  if (mine.length) sh.getRange(2, 1, mine.length, HUB_MINE_HEAD.length).setValues(mine.map(opsHubArr_));
  var q = ss.getSheetByName(HUB_QUEUES); q.clear();
  var qs = opsQueues_(hub.chat);
  q.getRange(1, 1, 1, 3).setValues([['صف', 'شمار', 'لینک']]).setFontColor(OPS_WHITE).setBackground(OPS_INK).setFontWeight('bold');
  if (qs.length) q.getRange(2, 1, qs.length, 3).setValues(qs.map(function (x) { return [x.name, x.n, x.link]; }));
  var r = ss.getSheetByName(HUB_REPORT); r.clear();
  var rep = opsReport_(hub, done);
  r.getRange(1, 1, rep.length, 2).setValues(rep);
  r.getRange(1, 1, 1, 2).setFontColor(OPS_WHITE).setBackground(OPS_INK).setFontWeight('bold');
  return mine.length;
}
/* صف‌های مرتبط با نقش: سردبیر (سردبیر) و یاسر */
function opsQueues_(chat) {
  var out = [], own = chat === opsOwnerChat_(), ed = false;
  try { ed = mcEditors_().map(String).indexOf(String(chat)) > -1; } catch (e) {}
  var cnt = function (f) { try { return f(); } catch (e) { return '?'; } };
  var app = TG_APP_URL;
  if (ed) {
    out.push({ name: 'صف سردبیر بازبینی علمی', n: cnt(function () { return vxEdRows_().filter(function (e) { return [RV_ST.ED, RV_ST.BACKY].indexOf(e['وضعیت']) > -1; }).length; }), link: app + '?rv=q' });
    out.push({ name: 'مجله: مشارکت‌های منتظر سردبیر', n: cnt(function () { return mcRowsAll_().filter(function (r) { return r['وضعیت'] === MC_ST.SENT; }).length; }), link: 'https://t.me/tajrobehlife_bot?start=mymag' });
    out.push({ name: 'سوشال: صف ارسال', n: cnt(function () { return soDueRows_(true).length; }), link: '' });
    out.push({ name: 'مدرسه (علمی): درخواست‌های عضویت باز', n: cnt(function () { return opsRows_().filter(function (t) { return t.cat === 'مدرسه' && opsOpen_(t); }).length; }), link: '' });
    out.push({ name: 'سازمانی: کارهای باز', n: cnt(function () { return opsRows_().filter(function (t) { return t.cat === 'سازمانی' && opsOpen_(t); }).length; }), link: '' });
  }
  if (own) {
    out.push({ name: 'آمادهٔ انتشار (بازبینی علمی)', n: cnt(function () { return vxEdRows_().filter(function (e) { return e['وضعیت'] === RV_ST.READY; }).length; }), link: app + '?rv=q' });
    out.push({ name: 'تأیید مالی', n: cnt(function () { return opsRows_().filter(function (t) { return t.cat === 'مالی' && opsOpen_(t); }).length; }), link: '' });
    out.push({ name: 'کارهای معوق کل تیم', n: cnt(function () { return opsRows_().filter(function (t) { return opsOpen_(t) && t.dueAt && t.dueAt < opsNow_(); }).length; }), link: opsSS_() ? opsSS_().getUrl() : '' });
    out.push({ name: 'گاندی این ماه', n: cnt(function () { return gdSummaryLine_(); }), link: '' });
  }
  return out;
}
function opsReport_(hub, done) {
  var now = opsNow_(), wk = now.getTime() - 7 * 86400000, mo = now.getTime() - 30 * 86400000;
  var at = function (t) { var d = opsParseStamp_(t.moved); return d ? d.getTime() : 0; };
  var dw = done.filter(function (t) { return at(t) >= wk; }).length, dm = done.filter(function (t) { return at(t) >= mo; }).length;
  var spans = done.map(function (t) { var a = opsParseStamp_(t.made), b = opsParseStamp_(t.moved); return a && b ? (b - a) / 3600000 : null; }).filter(function (x) { return x !== null && x >= 0; });
  var avg = spans.length ? Math.round(spans.reduce(function (s, x) { return s + x; }, 0) / spans.length) : 0;
  var pts = 0; try { var person = opsPeople_().filter(function (p) { return p.name === hub.name; })[0]; pts = person ? rvPointsOf_(person.name) : 0; } catch (e) {}
  return [['گزارش من', ''], ['انجام‌شده در ۷ روز', dw], ['انجام‌شده در ۳۰ روز', dm], ['میانگین زمان انجام (ساعت)', avg], ['امتیازها', pts], ['به‌روز شده', opsStamp_()]];
}
function opsParseStamp_(s) {
  var m = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  try { var g = tgJ2G_(+m[1], +m[2], +m[3]); return new Date(Date.UTC(g.getFullYear(), g.getMonth(), g.getDate(), +m[4], +m[5]) - 210 * 60000); } catch (e) { return null; }
}

/* ---------------- همگامی شیت ← بات (تریگر installable onEdit) ---------------- */
function opsOnEdit(e) {
  if (!e || !e.range) return;
  var lock = opsLock_(15000);
  if (!lock.ok) return;
  try {
    var sh = e.range.getSheet(), ssid = sh.getParent().getId(), name = sh.getName(), row = e.range.getRow(), col = e.range.getColumn();
    if (row < 2 || e.range.getNumRows() > 1) return;
    var isOps = ssid === opsProp_('OPS_SS_ID');
    if (isOps && name === OPS_TAB) {
      var v = sh.getRange(row, 1, 1, OPS_HEAD.length).getValues()[0], code = String(v[0]);
      if (!code) return;
      var p = {};
      if (col === OPS_C['وضعیت'] + 1) p.st = String(v[OPS_C['وضعیت']]);
      else if (col === OPS_C['مالک'] + 1) p.owner = String(v[OPS_C['مالک']]);
      else if (col === OPS_C['مهلت'] + 1) p.dueText = String(e.range.getDisplayValue());
      else return;
      opsSet_(code, p, 'sheet', opsOwnerChat_());
      return;
    }
    var hub = opsRegRows_().filter(function (r) { return r.id === ssid; })[0];
    if (!hub || name !== HUB_MINE) return;
    var hv = sh.getRange(row, 1, 1, HUB_MINE_HEAD.length).getValues()[0], hcode = String(hv[0]);
    if (!hcode) return;
    var hp = {};
    if (col === HUB_C['وضعیت'] + 1) hp.st = String(hv[HUB_C['وضعیت']]);
    else if (col === HUB_C['مالک'] + 1) hp.owner = String(hv[HUB_C['مالک']]);
    else if (col === HUB_C['مهلت'] + 1) hp.dueText = String(e.range.getDisplayValue());
    else if (col === HUB_C['یادداشت'] + 1) hp.note = String(hv[HUB_C['یادداشت']]);
    else return;
    opsSet_(hcode, hp, 'sheet', hub.chat);
  } catch (x) { tgErr_('opsOnEdit', x); }
  finally { lock.rel(); }
}

/* ---------------- آداپتورها: رویدادهای موجود بات ← «کارها» ---------------- */
function opsSafe_(fn) { try { return fn(); } catch (e) { tgErr_('ops adapter', e); return ''; } }
function opsDueIn_(hours) { return new Date(opsNow_().getTime() + hours * 3600000); }
/* لید تازه به کشیک رسید (tgDutyRun_) */
function opsAdaptLead_(code, ownerChat, ownerName) {
  return opsSafe_(function () { var b = opsBoss_();
    return opsAdd_({ title: 'تماس اول با لید ' + code, cat: 'لید و پذیرش', pri: 'بالا', ownerChat: String(ownerChat || ''), owner: ownerName || '', resp: b ? b.name : '', due: opsDueIn_(2), src: 'هاب پذیرش', ref: code }); });
}
/* لید بسته یا تماس اول گرفته شد */
function opsAdaptLeadDone_(code) { return opsSafe_(function () { return opsCloseRef_(code, OPS_ST.DONE); }); }
/* پایان هر رویداد دیگر (عضویت مدرسه، پرداخت): drop یعنی رد شد */
function opsAdaptDone_(ref, drop) { return opsSafe_(function () { return opsCloseRef_(String(ref || ''), drop ? OPS_ST.DROP : OPS_ST.DONE); }); }
/* بازبینی علمی (rvSet_): هر مرحله مالک خودش را دارد */
function opsAdaptReview_(code, st, title) {
  return opsSafe_(function () {
    if ([RV_ST.PUB, RV_ST.REJ].indexOf(st) > -1) return opsCloseRef_(code, st === RV_ST.PUB ? OPS_ST.DONE : OPS_ST.DROP);
    if (st === RV_ST.READY) { opsCloseRef_(code, OPS_ST.DONE); return opsAdd_({ title: 'تأیید انتشار بازبینی ' + code, cat: 'بازبینی علمی', pri: 'بالا', ownerChat: opsOwnerChat_(), resp: '', due: opsDueIn_(48), src: 'هاب محتوا', ref: code, link: TG_APP_URL + '?rv=' + code }); }
    if ([RV_ST.ED, RV_ST.BACKY].indexOf(st) > -1) { var ed = (mcEditors_()[0] || ''); return opsAdd_({ title: 'بررسی سردبیری بازبینی ' + code + (title ? ' · ' + mcShort_(title, 60) : ''), cat: 'بازبینی علمی', pri: st === RV_ST.BACKY ? 'بالا' : 'عادی', ownerChat: String(ed), resp: '', due: opsDueIn_(5 * 24), src: 'هاب محتوا', ref: code, link: TG_APP_URL + '?rv=' + code }); }
    if (st === RV_ST.BACKR) return opsAdd_({ st: OPS_ST.WAIT, ref: code });
    return '';
  });
}
/* درخواست عضویت مدرسه */
function opsAdaptSchool_(id, ownerChat) { return opsSafe_(function () { return opsAdd_({ title: 'بررسی درخواست عضویت مدرسه ' + id, cat: 'مدرسه', pri: 'عادی', ownerChat: String(ownerChat || ''), due: opsDueIn_(48), src: 'هاب مدرسه', ref: id }); }); }
/* اپلای تراپیست: کار K- «تماس اول با متقاضی» از tgApTaskLead_ می‌آید، آداپتور جدا لازم نیست */
/* پرداخت منتظر تأیید یاسر */
function opsAdaptPay_(pid) { return opsSafe_(function () { return opsAdd_({ title: 'تأیید پرداخت ' + pid, cat: 'مالی', pri: 'بالا', ownerChat: opsOwnerChat_(), due: opsDueIn_(24), src: 'هاب مدرسه', ref: pid }); }); }
/* کارهای قبلی بات (تب «کارها»ی هاب پذیرش، K-) */
function opsAdaptTask_(k, o) {
  return opsSafe_(function () {
    var pri = { 'فوری': 'فوری', 'وقت‌دار': 'بالا', 'عادی': 'عادی' }[String(o.pri || 'عادی')] || 'عادی';
    var cat = { 'پذیرش': 'لید و پذیرش', 'مدرسه': 'مدرسه', 'مجله': 'مجله و محتوا', 'کلینیک': 'درمانگران', 'مالی': 'مالی', 'فنی': 'فنی' }[String(o.team || '')] || 'اداری';
    /* کار SLA یا پیگیری‌ای که به کد باز دیگری (مثل L-) اشاره دارد، کار دوم نمی‌سازد */
    var lk = (/^([A-Z]+-\d+)/.exec(String(o.link || '')) || [])[1];
    if (lk && opsByRef_(lk).length) return '';
    return opsAdd_({ title: o.title, cat: cat, pri: pri, ownerChat: String(o.chat || ''), owner: o.who || '', by: o.by || 'بات', src: 'بات', ref: k });
  });
}
function opsAdaptTaskSt_(k, tskSt) {
  return opsSafe_(function () {
    var map = {}; map[TG_TSK_ST.doing] = OPS_ST.DOING; map[TG_TSK_ST.done] = OPS_ST.DONE; map[TG_TSK_ST.closed] = OPS_ST.DONE; map[TG_TSK_ST.drop] = OPS_ST.DROP;
    var st = map[tskSt]; if (!st) return '';
    if (st === OPS_ST.DONE || st === OPS_ST.DROP) return opsCloseRef_(k, st);
    return opsAdd_({ ref: k, st: st });
  });
}

/* ---------------- ریتم ---------------- */
/* ۹:۰۰ (از tgWatchdog، روزی یک بار): «کار امروز» برای هر نفر که کار باز دارد */
function opsMorning_() {
  var now = opsNow_(), h = +Utilities.formatDate(now, TG_TZ, 'H'), day = opsDayKey_(now);
  if (h < 9 || h >= 18 || opsProp_('OPS_AM') === day) return 0;
  opsProp_('OPS_AM', day);
  var by = {}, n = 0;
  opsRows_().filter(opsOpen_).forEach(function (t) { if (t.ownerChat) (by[t.ownerChat] = by[t.ownerChat] || []).push(t); });
  Object.keys(by).forEach(function (chat) {
    var a = by[chat].sort(opsSort_), today = a.filter(function (t) { return t.dueAt && t.dueAt < new Date(now.getTime() + 86400000); });
    var late = a.filter(function (t) { return t.dueAt && t.dueAt < now; }).length;
    var hub = opsHubOf_(chat);
    var lines = (today.length ? today : a).slice(0, 6).map(function (t) { return (t.pri === 'فوری' ? '🔴 ' : '• ') + tgEsc_(t.title) + (t.due ? ' · ' + t.due : ''); });
    tgSend_(chat, '☀️ <b>کار امروز</b>\nامروز ' + tgFa_(today.length) + ' · معوق ' + tgFa_(late) + ' · همه ' + tgFa_(a.length) + '\n\n' + lines.join('\n'),
      hub ? { inline_keyboard: [[{ text: '📒 هاب من', url: hub.url }]] } : null);
    n++;
  });
  return n;
}
function opsSort_(a, b) { var p = OPS_PRI.indexOf(a.pri) - OPS_PRI.indexOf(b.pri); if (p) return p; return (a.dueAt ? a.dueAt.getTime() : 9e15) - (b.dueAt ? b.dueAt.getTime() : 9e15); }
/* ۱۸:۰۰ (از tgDigestEvening): جمع‌بندی برای مسئول پذیرش، سردبیر و یاسر */
function opsEvening_() {
  var now = opsNow_(), day = opsDayKey_(now), rows = opsRows_(), n = 0;
  var recips = [];
  var b = opsBoss_(); if (b && b.chat) recips.push(String(b.chat));
  try { (mcEditors_() || []).slice(0, 1).forEach(function (x) { recips.push(String(x)); }); } catch (e2) {}
  recips.push(opsOwnerChat_());
  recips.filter(function (c, i) { return c && recips.indexOf(c) === i; }).forEach(function (chat) {
    var mine = chat === opsOwnerChat_() ? rows : rows.filter(function (t) { return t.ownerChat === chat; });
    var doneToday = mine.filter(function (t) { return t.st === OPS_ST.DONE && opsParseStamp_(t.moved) && opsDayKey_(opsParseStamp_(t.moved)) === day; }).length;
    var open = mine.filter(opsOpen_), late = open.filter(function (t) { return t.dueAt && t.dueAt < now; });
    var t = '🌙 <b>جمع‌بندی امروز</b>' + (chat === opsOwnerChat_() ? ' · کل تیم' : '') + '\nانجام‌شده ' + tgFa_(doneToday) + ' · مانده ' + tgFa_(open.length) + ' · معوق ' + tgFa_(late.length);
    if (chat === opsOwnerChat_()) {
      var esc2 = open.filter(function (x) { return x.esc.indexOf('۲') === 0 || x.esc.indexOf('2') === 0; });
      if (esc2.length) t += '\n\n⚠️ <b>بی‌اقدام پاسخگو هم</b>\n' + esc2.slice(0, 10).map(function (x) { return '• ' + tgEsc_(x.title) + ' · ' + tgEsc_(x.owner) + ' ← ' + tgEsc_(x.resp); }).join('\n');
    }
    tgSend_(chat, t); n++;
  });
  return n;
}
/* ارجاع: کار ۲۴ ساعت گذشته از مهلت ← پاسخگو؛ اگر پاسخگو هم ۲۴ ساعت کاری نکرد ← جمع‌بندی یاسر. فقط ۹ تا ۱۸ */
function opsEscalate_() {
  if (!opsInHours_()) return 0;
  var now = opsNow_(), n = 0;
  opsRows_().filter(opsOpen_).forEach(function (t) {
    if (!t.dueAt || now - t.dueAt < 24 * 3600000) return;
    if (!t.esc) {
      var r = opsPeople_().filter(function (p) { return p.name === t.resp; })[0], rc = opsFirstChat_(r);
      t.esc = '1 ' + opsStamp_(); opsWrite_(t); n++;
      if (rc) tgSend_(rc, '⏰ <b>کار معوق در تیم شما</b>\n' + tgEsc_(t.title) + '\nمالک: ' + tgEsc_(t.owner) + ' · مهلت ' + tgEsc_(t.due) + ' گذشته است.');
      return;
    }
    var m = /^1\s+(.+)$/.exec(t.esc), at = m ? opsParseStamp_(m[1]) : null;
    if (at && now - at >= 24 * 3600000) { t.esc = '2 ' + opsStamp_(); opsWrite_(t); n++; }
  });
  return n;
}

/* ---------------- حضور کارکنان حضوری (بی موقعیت) ---------------- */
var ATT_TAB = 'کارکرد ماهانه';
var ATT_HEAD = ['نفر', 'تاریخ شمسی', 'ورود', 'خروج', 'ساعت', 'منبع', 'وضعیت تأیید', 'تاریخ'];
var ATT_SHIFT_TAB = 'شیفت حضوری';
var ATT_SHIFT_HEAD = ['نفر', 'روز', 'از', 'تا'];
var ATT_BTN_IN = '🟢 رسیدم', ATT_BTN_OUT = '🔴 رفتم';
var ATT_ST = { OK: 'تأیید شد', AUTO: 'خودکار', WAIT: 'منتظر تأیید' };
var GD_BTN = '📋 فهرست امروز گاندی';
var GD_TAB = 'حضور جلسه‌های گاندی';
var GD_HEAD = ['تاریخ شمسی', 'روز', 'اتاق', 'ساعت', 'درمانگر', 'وضعیت', 'ثبت‌کننده', 'زمان ثبت', 'تاریخ'];
var GD_REP_TAB = 'گزارش گاندی';
var GD_PLACE = 'gandhi';

function attSheet_(tab, head) {
  if (opsDry_()) return null;
  var ss = tgSS_(), sh = ss.getSheetByName(tab);
  if (!sh) { sh = ss.insertSheet(tab); opsStyleSheet_(sh, head); }
  return sh;
}
function attRows_() {
  if (opsDry_()) return (TG_MEM['att:rows'] = TG_MEM['att:rows'] || []);
  var sh = attSheet_(ATT_TAB, ATT_HEAD), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, ATT_HEAD.length).getDisplayValues().map(function (r, i) { return { row: i + 2, who: r[0], jd: r[1], tin: r[2], tout: r[3], hrs: r[4], src: r[5], st: r[6], day: r[7] }; });
}
function attWrite_(o) {
  var arr = [o.who, o.jd, o.tin, o.tout, o.hrs, o.src, o.st, o.day];
  if (opsDry_()) { var rows = attRows_(); if (o.row) rows[o.row - 2] = o; else { o.row = rows.length + 2; rows.push(o); } return; }
  var sh = attSheet_(ATT_TAB, ATT_HEAD);
  if (o.row) sh.getRange(o.row, 1, 1, ATT_HEAD.length).setValues([arr]);
  else { sh.appendRow(arr); o.row = sh.getLastRow(); }
}
function attHours_(a, b) {
  var p = function (s) { var m = /(\d{1,2}):(\d{2})/.exec(tgLatinDigits_(String(s || ''))); return m ? +m[1] + (+m[2]) / 60 : null; };
  var x = p(a), y = p(b);
  return (x === null || y === null || y < x) ? '' : (Math.round((y - x) * 4) / 4);
}
function attIsDesk_(chat) { try { return !!tgWhoDesk_(chat, ''); } catch (e) { return false; } }
/* «رسیدم» و «رفتم»: بی هیچ شرطی، برای نقش‌های پذیرش */
function attMark_(chat, kind) {
  var me = opsPersonByChat_(chat) || (function () { try { var d = tgWhoDesk_(chat, ''); return d ? { name: d.name } : null; } catch (e) { return null; } })();
  if (!me) return { ok: false, error: 'نام شما در «افراد» نیست.' };
  var now = opsNow_(), day = opsDayKey_(now), hm = Utilities.formatDate(now, TG_TZ, 'HH:mm');
  var r = attRows_().filter(function (x) { return x.who === me.name && x.day === day; })[0];
  if (kind === 'in') {
    if (r && r.tin) return { ok: true, msg: 'ورود امروزتان قبلاً ثبت شده: ' + tgFa_(r.tin) };
    r = r || { who: me.name, jd: opsJ_(now), tin: '', tout: '', hrs: '', src: 'ثبت', st: ATT_ST.OK, day: day };
    r.tin = hm; r.src = 'ثبت'; r.st = ATT_ST.OK;
  } else {
    r = r || { who: me.name, jd: opsJ_(now), tin: '', tout: '', hrs: '', src: 'ثبت', st: ATT_ST.OK, day: day };
    r.tout = hm; r.hrs = attHours_(r.tin, r.tout);
  }
  attWrite_(r);
  return { ok: true, msg: (kind === 'in' ? '🟢 ورود ثبت شد: ' : '🔴 خروج ثبت شد: ') + tgFa_(hm) };
}
/* شیفت‌های برنامه‌ریزی‌شده (تب «شیفت حضوری» هاب پذیرش؛ مسئول پذیرش پر می‌کند) */
function attShifts_() {
  if (opsDry_()) return TG_MEM['att:shifts'] || [];
  var sh = attSheet_(ATT_SHIFT_TAB, ATT_SHIFT_HEAD), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, 4).getDisplayValues().filter(function (r) { return r[0] && r[1]; }).map(function (r) { return { who: r[0].trim(), wd: r[1].trim(), from: r[2], to: r[3] }; });
}
function attWeekday_(d) { return TG_DUTY_DAYS[(+Utilities.formatDate(d, TG_TZ, 'u') + 1) % 7]; }
/* نشانهٔ حضور: فعالیت همان روز (تیک آمد/نیامد گاندی، کار بسته‌شده در «کارها») */
function attActive_(name, day) {
  var gd = gdRows_().some(function (r) { return r.by === name && r.day === day; });
  if (gd) return true;
  return opsRows_().some(function (t) { var d = opsParseStamp_(t.moved); return t.owner === name && t.st === OPS_ST.DONE && d && opsDayKey_(d) === day; });
}
/* پایان روز (از tgDaily، ۲۱:۰۰): روز حضوری بی ثبت ← فعالیت یا شیفت؛ خروج فراموش‌شده ← پایان شیفت */
function attDayClose_() {
  var now = opsNow_(), day = opsDayKey_(now), wd = attWeekday_(now), n = 0;
  var rows = attRows_();
  attShifts_().filter(function (s) { return s.wd === wd; }).forEach(function (s) {
    var r = rows.filter(function (x) { return x.who === s.who && x.day === day; })[0];
    if (r) { if (r.tin && !r.tout) { r.tout = s.to; r.hrs = attHours_(r.tin, r.tout); r.src = 'ثبت و شیفت'; attWrite_(r); n++; } return; }
    var act = attActive_(s.who, day);
    attWrite_({ who: s.who, jd: opsJ_(now), tin: s.from, tout: s.to, hrs: attHours_(s.from, s.to), src: act ? 'فعالیت' : 'شیفت', st: act ? ATT_ST.AUTO : ATT_ST.WAIT, day: day });
    n++;
  });
  return n;
}
/* جمع‌بندی هفتگی مسئول پذیرش (مسئول پذیرش): فقط روز حضوری بی ثبت و بی فعالیت، با «تأیید» یا «اصلاح» */
function attWeekly_() {
  var b = opsBoss_();
  if (!b || !b.chat) return 0;
  var wait = attRows_().filter(function (r) { return r.st === ATT_ST.WAIT; });
  if (!wait.length) return 0;
  tgSend_(b.chat, '🗓 <b>کارکرد هفته: روزهای بی ثبت و بی فعالیت</b>\nاین روزها از روی شیفت ثبت شده‌اند. اگر درست است تأیید کنید، وگرنه اصلاح.');
  wait.slice(0, 20).forEach(function (r) {
    tgSend_(b.chat, tgEsc_(r.who) + ' · ' + tgFa_(r.jd) + ' · ' + tgFa_(r.tin) + ' تا ' + tgFa_(r.tout),
      { inline_keyboard: [[{ text: '✅ تأیید', callback_data: 'at:ok:' + r.row }, { text: '✏️ اصلاح', callback_data: 'at:ed:' + r.row }, { text: '✖️ نیامد', callback_data: 'at:no:' + r.row }]] });
  });
  return wait.length;
}
function attCb_(chat, data) {
  var a = String(data).split(':'), act = a[1], row = +a[2];
  var b = opsBoss_();
  if (!(b && String(b.chat) === String(chat)) && String(chat) !== opsOwnerChat_()) return tgSend_(chat, 'این تأیید با مسئول پذیرش است.');
  var r = attRows_().filter(function (x) { return x.row === row; })[0];
  if (!r) return tgSend_(chat, 'این ردیف پیدا نشد.');
  if (act === 'ok') { r.st = ATT_ST.OK; attWrite_(r); return tgSend_(chat, '✅ تأیید شد.'); }
  if (act === 'no') { r.st = ATT_ST.OK; r.src = 'اصلاح'; r.tin = ''; r.tout = ''; r.hrs = 0; attWrite_(r); return tgSend_(chat, 'ثبت شد: این روز نیامده.'); }
  if (act === 'ed') { tgSetVal_('attfix', chat, String(row)); return tgSend_(chat, 'ساعت ورود و خروج را بنویسید، مثل: ۹:۳۰ تا ۱۷'); }
}
function attFixIn_(chat, text) {
  var row = +tgGetVal_('attfix', chat); if (!row) return false;
  var m = /(\d{1,2}[:٫.]\d{2}|\d{1,2})\s*(?:تا|-|–)\s*(\d{1,2}[:٫.]\d{2}|\d{1,2})/.exec(tgLatinDigits_(String(text || '')));
  if (!m) { tgDel_('attfix', chat); return false; }
  var f = function (s) { s = s.replace(/[٫.]/, ':'); return s.indexOf(':') > -1 ? ('0' + s).slice(-5) : ('0' + s).slice(-2) + ':00'; };
  var r = attRows_().filter(function (x) { return x.row === row; })[0];
  tgDel_('attfix', chat);
  if (!r) return true;
  r.tin = f(m[1]); r.tout = f(m[2]); r.hrs = attHours_(r.tin, r.tout); r.src = 'اصلاح'; r.st = ATT_ST.OK;
  attWrite_(r);
  tgSend_(chat, '✅ اصلاح شد: ' + tgFa_(r.tin) + ' تا ' + tgFa_(r.tout));
  return true;
}

/* ---------------- فهرست روز گاندی (بی نام مراجع) ---------------- */
function gdRows_() {
  if (opsDry_()) return (TG_MEM['gd:rows'] = TG_MEM['gd:rows'] || []);
  var sh = attSheet_(GD_TAB, GD_HEAD), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, GD_HEAD.length).getDisplayValues().map(function (r, i) { return { row: i + 2, jd: r[0], wd: r[1], room: r[2], hour: r[3], ther: r[4], st: r[5], by: r[6], at: r[7], day: r[8] }; });
}
/* جلسه‌های امروز از «اشغال هفتگی گاندی»: ردیفی که مراجع هفتگی دارد و خالی اعلام نشده */
function gdToday_(d) {
  var wd = attWeekday_(d || opsNow_());
  return tgOccRows_().filter(function (x) { var v = x.v; return v[0] === wd && String(v[4] || '').trim() && !/خالی/.test(String(v[5] || '')); })
    .map(function (x) { return { key: x.v[1] + '|' + x.v[2], room: x.v[1], hour: x.v[2], ther: x.v[3] }; })
    .sort(function (a, b) { return (parseFloat(tgLatinDigits_(a.hour)) || 0) - (parseFloat(tgLatinDigits_(b.hour)) || 0) || String(a.room).localeCompare(String(b.room)); });
}
function gdList_(chat) {
  if (!attIsDesk_(chat) && String(chat) !== opsOwnerChat_()) return tgSend_(chat, 'این فهرست برای تیم پذیرش است.');
  var day = opsDayKey_(), marks = gdRows_().filter(function (r) { return r.day === day; });
  var list = gdToday_();
  if (!list.length) return tgSend_(chat, 'امروز در گاندی جلسهٔ حضوری ثبت‌شده‌ای نیست.');
  tgSend_(chat, '📋 <b>جلسه‌های امروز گاندی</b> · ' + tgFa_(list.length) + ' جلسه');
  list.forEach(function (s) {
    var m = marks.filter(function (r) { return r.room === s.room && r.hour === s.hour; })[0];
    tgSend_(chat, 'اتاق ' + tgFa_(s.room) + ' · ساعت ' + tgFa_(s.hour) + ' · ' + tgEsc_(s.ther) + (m ? '\n' + (m.st === 'آمد' ? '✅ آمد' : '❌ نیامد') : ''),
      { inline_keyboard: [[{ text: '✅ آمد', callback_data: 'gd:y:' + s.room + ':' + s.hour }, { text: '❌ نیامد', callback_data: 'gd:n:' + s.room + ':' + s.hour }]] });
  });
}
function gdMark_(chat, room, hour, came) {
  if (!attIsDesk_(chat) && String(chat) !== opsOwnerChat_()) return { ok: false, error: 'این ثبت برای تیم پذیرش است.' };
  var me = opsPersonByChat_(chat), who = me ? me.name : String(chat);
  var s = gdToday_().filter(function (x) { return String(x.room) === String(room) && String(x.hour) === String(hour); })[0];
  if (!s) return { ok: false, error: 'این جلسه در فهرست امروز نیست.' };
  var now = opsNow_(), day = opsDayKey_(now), st = came ? 'آمد' : 'نیامد';
  var r = gdRows_().filter(function (x) { return x.day === day && x.room === s.room && x.hour === s.hour; })[0];
  var o = r || { jd: opsJ_(now), wd: attWeekday_(now), room: s.room, hour: s.hour, ther: s.ther, day: day };
  o.st = st; o.by = who; o.at = Utilities.formatDate(now, TG_TZ, 'HH:mm');
  if (opsDry_()) { var rows = gdRows_(); if (!r) rows.push(o); }
  else { var sh = attSheet_(GD_TAB, GD_HEAD), arr = [o.jd, o.wd, o.room, o.hour, o.ther, o.st, o.by, o.at, o.day]; if (r) sh.getRange(r.row, 1, 1, GD_HEAD.length).setValues([arr]); else sh.appendRow(arr); }
  return { ok: true, msg: (came ? '✅ آمد' : '❌ نیامد') + ' · اتاق ' + tgFa_(s.room) + ' ساعت ' + tgFa_(s.hour) };
}
/* ساعت باز هر اتاق در یک روز هفته (از تب اتاق‌ها: روزها و از/تا) */
function gdOpenHours_(room, wd) {
  var rs = (tgInpData_().rooms || []).filter(function (r) { return r.p === GD_PLACE && String(r.room) === String(room) && r.status !== 'غیرفعال'; });
  if (!rs.length) return 0;
  var r = rs[0], days = String(r.days || ''), on;
  var idx = TG_DUTY_DAYS.indexOf(wd);
  if (/همه/.test(days)) on = idx < 6;
  else { var m = /(\S+)\s+تا\s+(\S+)/.exec(days); if (m) { var a = TG_DUTY_DAYS.indexOf(m[1]), b = TG_DUTY_DAYS.indexOf(m[2]); on = a > -1 && b > -1 && idx >= a && idx <= b; } else on = days.indexOf(wd) > -1; }
  if (!on) return 0;
  var f = parseFloat(tgLatinDigits_(r.from)), t = parseFloat(tgLatinDigits_(r.to));
  return isFinite(f) && isFinite(t) && t > f ? t - f : 0;
}
/* گزارش ماه جاری: اشغال هر اتاق (ساعت رزروشده ÷ ساعت باز) و نرخ غیبت؛ تب «گزارش گاندی» (هر شب از tgDaily) */
function gdReport_() {
  var now = opsNow_(), j = tgJalali_(now, TG_TZ), rooms = {}, occ = tgOccRows_();
  for (var k = 0; k < 31; k++) {
    var d = new Date(now.getTime() - k * 86400000), jd = tgJalali_(d, TG_TZ);
    if (jd.m !== j.m || jd.y !== j.y) break;
    var wd = attWeekday_(d);
    occ.forEach(function (x) { var v = x.v; if (v[0] !== wd) return; var r = (rooms[v[1]] = rooms[v[1]] || { open: 0, booked: 0, came: 0, no: 0, days: {} }); if (String(v[4] || '').trim() && !/خالی/.test(String(v[5] || ''))) r.booked++; });
    Object.keys(rooms).concat((tgInpData_().rooms || []).filter(function (r) { return r.p === GD_PLACE; }).map(function (r) { return r.room; })).forEach(function (room) {
      var r = (rooms[room] = rooms[room] || { open: 0, booked: 0, came: 0, no: 0, days: {} });
      if (!r.days[k]) { r.days[k] = 1; r.open += gdOpenHours_(room, wd); }
    });
  }
  var ym = j.y + '/' + ('0' + j.m).slice(-2);
  gdRows_().forEach(function (g) { if (String(g.jd).indexOf(ym) !== 0) return; var r = (rooms[g.room] = rooms[g.room] || { open: 0, booked: 0, came: 0, no: 0, days: {} }); if (g.st === 'آمد') r.came++; else if (g.st === 'نیامد') r.no++; });
  var out = Object.keys(rooms).sort().map(function (room) { var r = rooms[room];
    return [ym, room, r.open, r.booked, r.open ? Math.round(r.booked / r.open * 100) + '٪' : '', r.came, r.no, (r.came + r.no) ? Math.round(r.no / (r.came + r.no) * 100) + '٪' : '']; });
  if (opsDry_()) { TG_MEM['gd:rep'] = out; return out; }
  var sh = attSheet_(GD_REP_TAB, ['ماه', 'اتاق', 'ساعت باز', 'ساعت رزروشده', 'اشغال', 'آمد', 'نیامد', 'نرخ غیبت']);
  var n = sh.getLastRow(), keep = n > 1 ? sh.getRange(2, 1, n - 1, 8).getDisplayValues().filter(function (r) { return r[0] !== ym; }) : [];
  if (n > 1) sh.getRange(2, 1, n - 1, 8).clearContent();
  var all = keep.concat(out);
  if (all.length) sh.getRange(2, 1, all.length, 8).setValues(all);
  return out;
}
/* یک خط خلاصه برای هاب یاسر */
function gdSummaryLine_() {
  var rep = opsDry_() ? (TG_MEM['gd:rep'] || gdReport_()) : gdReport_();
  var open = 0, booked = 0, came = 0, no = 0;
  rep.forEach(function (r) { open += +r[2] || 0; booked += +r[3] || 0; came += +r[5] || 0; no += +r[6] || 0; });
  return 'اشغال ' + (open ? Math.round(booked / open * 100) : 0) + '٪ · غیبت ' + ((came + no) ? Math.round(no / (came + no) * 100) : 0) + '٪';
}

/* ---------------- بات و مینی‌اپ ---------------- */
function opsRoute_(chat, m) {
  var text = String((m && m.text) || '').trim();
  if (tgGetVal_('attfix', chat)) { if (attFixIn_(chat, text)) return true; }
  if (text === ATT_BTN_IN || text === ATT_BTN_OUT) {
    if (!attIsDesk_(chat)) return false;
    var r = attMark_(chat, text === ATT_BTN_IN ? 'in' : 'out');
    tgSend_(chat, r.ok ? r.msg : '⚠️ ' + r.error);
    return true;
  }
  if (text === GD_BTN) { gdList_(chat); return true; }
  if (text === '/hub' || text === '📒 هاب من') {
    var hub = opsHubOf_(chat);
    tgSend_(chat, hub ? '📒 هاب شما:' : 'هاب شخصی شما هنوز ساخته نشده است.', hub ? { inline_keyboard: [[{ text: '📒 باز کردن هاب من', url: hub.url }]] } : null);
    return true;
  }
  return false;
}
function opsCb_(chat, data) {
  var a = String(data).split(':');
  if (a[0] === 'at') return attCb_(chat, data);
  if (a[0] === 'gd') { var r = gdMark_(chat, a[2], a.slice(3).join(':'), a[1] === 'y'); return tgSend_(chat, r.ok ? r.msg : '⚠️ ' + r.error); }
}
function opsDeskRow_() { return [[ATT_BTN_IN, ATT_BTN_OUT], [GD_BTN]]; }
function opsApi_(p, api) {
  var w = tgApiWho_(p); if (!w) return { ok: false, error: 'auth' };
  var chat = String(w.chat);
  if (api === 'att.mark') return attMark_(chat, p.kind === 'out' ? 'out' : 'in');
  if (api === 'gd.day') {
    var day = opsDayKey_(), marks = gdRows_().filter(function (r) { return r.day === day; });
    return { ok: true, rows: gdToday_().map(function (s) { var m = marks.filter(function (r) { return r.room === s.room && r.hour === s.hour; })[0]; return { room: s.room, hour: s.hour, ther: s.ther, st: m ? m.st : '' }; }) };
  }
  if (api === 'gd.mark') return gdMark_(chat, String(p.room || ''), String(p.hour || ''), p.came === true || p.came === 'true');
  if (api === 'hub.me') { var hub = opsHubOf_(chat); return { ok: true, url: hub ? hub.url : '' }; }
  if (api === 'home.me') return opsHome_(chat);
  return { ok: false, error: 'unknown' };
}

/* v169.3: خانهٔ تیم در مینی‌اپ: سه عدد (امروز، معوق، منتظر تأیید من) و «کار بعدی» (پنج کار به ترتیب اولویت و مهلت).
   همان قاعدهٔ تب «امروز» هاب شخصی؛ بی نام مراجع، بی ایمیل. */
function opsHome_(chat) {
  var c = String(chat || ''), now = opsNow_();
  var end = new Date(now.getTime() + 86400000);
  var mine = opsRows_().filter(function (t) { return t.ownerChat === c && opsOpen_(t); });
  var hub = opsHubOf_(c);
  var today = mine.filter(function (t) { return t.dueAt && t.dueAt >= now && t.dueAt < end; }).length;
  var late = mine.filter(function (t) { return t.dueAt && t.dueAt < now; }).length;
  var wait = mine.filter(function (t) { return /تأیید/.test(t.title); }).length;
  var next = mine.slice().sort(opsSort_).slice(0, 5).map(function (t) {
    return { code: t.code, title: t.title, pri: t.pri, due: t.due, late: !!(t.dueAt && t.dueAt < now), ref: t.ref, link: t.link, st: t.st };
  });
  return { ok: true, today: today, late: late, wait: wait, open: mine.length, next: next, hub: hub ? hub.url : '' };
}

/* ---------------- یک‌بارهٔ خودکار و نگهداری ---------------- */
/* بعد از انتشار سبز: هاب عملیات، ستون «ایمیل»، تب‌های حضور و گاندی، هاب یاسر و سردبیر (اگر ایمیل سردبیر پر است)، و کارهای باز موجود */
function tgV1692Setup() {
  var out = [];
  out.push('هاب عملیات: ' + (opsSetup_() ? 'آماده' : 'نشد'));
  out.push('ستون ایمیل: ' + opsEmailCol_());
  if (!opsDry_()) { attSheet_(ATT_TAB, ATT_HEAD); attSheet_(ATT_SHIFT_TAB, ATT_SHIFT_HEAD); attSheet_(GD_TAB, GD_HEAD); }
  out.push('هاب‌های شخصی: ' + opsHubsEnsure_());
  out.push('کارهای باز منتقل‌شده: ' + opsBackfill_());
  /* گزارش هاب اول، چون خروجی یک‌باره در ۲۰۰ نویسه بریده می‌شود */
  return opsHubAudit_() + ' · ' + out.join(' · ');
}
/* هاب یاسر (بی ایمیل؛ مالک فایل است) و هاب هر سردبیر که ایمیل دارد. روزانه هم سنجیده می‌شود (تغییر ایمیل ← دسترسی) */
function opsHubsEnsure_() {
  var made = 0;
  opsPeople_().forEach(function (p) {
    var chat = opsFirstChat_(p), roles = (p.roles || []).join(',');
    var want = chat === opsOwnerChat_() || roles.indexOf('سردبیر') > -1;
    if (!want) return;
    var hit = opsHubOfName_(p.name);
    if (!hit && chat !== opsOwnerChat_() && !opsEmailOf_(p.name)) return;
    if (!hit) { opsHubMake(p.name); made++; } else if (!opsDry_()) opsHubShare_(p.name, hit.id);
  });
  return made;
}
/* کارهای باز موجود: K- های باز، بازبینی‌های باز، پرداخت‌های منتظر تأیید */
function opsBackfill_() {
  var n = 0;
  try { if (!opsDry_()) tgTskRows_().forEach(function (r) { var st = String(r[9] || ''); if ([TG_TSK_ST.open, TG_TSK_ST.doing].indexOf(st) > -1) { opsAdaptTask_(String(r[0]), { title: r[1], team: r[3], who: r[4], chat: r[6], pri: r[7] }); n++; } }); } catch (e) { tgErr_('opsBackfill K', e); }
  try { vxEdRows_().forEach(function (e) { if (RV_OPEN.indexOf(e['وضعیت']) > -1) { opsAdaptReview_(e['کد'], e['وضعیت'], e['عنوان']); n++; } }); } catch (e2) { tgErr_('opsBackfill E', e2); }
  return n;
}
/* از tgWatchdog (ساعتی): ۹:۰۰ کار امروز، ارجاع، و یک بار در روز تازه‌کردن هاب‌ها و فهرست نام‌ها */
function opsHourly_() {
  if (!opsDry_() && !opsSS_()) return 0;
  try { opsMorning_(); } catch (e) { tgErr_('opsMorning_', e); }
  try { opsEscalate_(); } catch (e2) { tgErr_('opsEscalate_', e2); }
  var day = opsDayKey_();
  if (opsProp_('OPS_DAILY') !== day && +Utilities.formatDate(opsNow_(), TG_TZ, 'H') >= 6) {
    opsProp_('OPS_DAILY', day);
    try { opsListsRefresh_(); opsHubsEnsure_(); opsRegRows_().forEach(function (r) { opsHubRefresh_(r.name); }); } catch (e3) { tgErr_('ops daily', e3); }
  }
  return 1;
}
/* از tgDaily (۲۱:۰۰): پایان روز حضور، گزارش گاندی؛ شنبه جمع‌بندی هفتگی کارکرد برای مسئول پذیرش */
function opsNightly_() {
  try { attDayClose_(); } catch (e) { tgErr_('attDayClose_', e); }
  try { gdReport_(); } catch (e2) { tgErr_('gdReport_', e2); }
  var wd = attWeekday_(opsNow_()), wk = 'W' + Math.floor(opsNow_().getTime() / (7 * 86400000));
  if (wd === 'پنج‌شنبه' && opsProp_('ATT_WEEK') !== wk) { opsProp_('ATT_WEEK', wk); try { attWeekly_(); } catch (e3) { tgErr_('attWeekly_', e3); } }
}

/* ---------------- تست خشک ---------------- */
function opsTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX, edK = MC_DRY_EDITORS;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = []; MC_DRY_EDITORS = ['7001'];
  var OWN = opsOwnerChat_();
  var said = function (chat) { return TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && (!chat || o.chat === String(chat)); }); };
  try {
    TG_MEM['ops:on'] = '1';
    TG_MEM['people'] = [{ name: 'یاسر آزمایشی', chat: OWN, roles: ['ناظر'], status: 'فعال' }, { name: 'سردبیر آزمایشی', chat: '7001', roles: ['سردبیر'], status: 'فعال' },
      { name: 'پذیرش آزمایشی', chat: '7101', roles: ['پذیرش'], status: 'فعال' }, { name: 'پذیرش دوم', chat: '7102', roles: ['پذیرش'], status: 'فعال' }];
    TG_MEM['ops:boss'] = { name: 'پذیرش آزمایشی', chat: '7101', role: 'مسئول پذیرش' };
    TG_MEM['deskwho'] = { name: 'پذیرش آزمایشی', chat: '7101', role: 'مسئول پذیرش' };
    TG_MEM['ops:email'] = { 'سردبیر آزمایشی': 'ed.one@example.com' };
    /* شنبه ۱۱ مهر ۱۴۰۵، ۹:۳۰ تهران */
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 3, 9, 30).getTime();

    /* هاب‌ها و شیر */
    ok('هاب‌های فاز ۱: یاسر بی ایمیل، سردبیر با ایمیل؛ پذیرش بی ایمیل ساخته نمی‌شود', opsHubsEnsure_() === 2 && !!opsHubOfName_('یاسر آزمایشی') && !!opsHubOfName_('سردبیر آزمایشی') && !opsHubOfName_('پذیرش آزمایشی'));
    ok('هاب سردبیر فقط با ایمیل خودش شیر می‌شود', TG_MEM['ops:share:سردبیر آزمایشی'] === 'ed.one@example.com');
    TG_MEM['ops:email'] = { 'سردبیر آزمایشی': 'ed.two@example.com' };
    opsHubShare_('سردبیر آزمایشی', '');
    ok('ایمیل عوض شد ← شیر با ایمیل تازه، نه قبلی', TG_MEM['ops:share:سردبیر آزمایشی'] === 'ed.two@example.com');
    TG_MEM['ops:email'] = {};
    opsHubShare_('سردبیر آزمایشی', '');
    ok('ایمیل پاک شد ← شیر با کسی نیست', TG_MEM['ops:share:سردبیر آزمایشی'] === '');
    ok('شیر «آخرین شیر» تب «هاب‌ها» را پر می‌کند (v169.2.2)', !!TG_MEM['ops:shared:سردبیر آزمایشی']);
    TG_MEM['ops:noowner'] = 1; TG_OUTBOX = [];
    var nos = opsHubShare_('سردبیر آزمایشی', '');
    ok('مالک فایل در دسترس نیست ← خطا ثبت و ادامه، بی توقف (v169.2.2)', nos === 'بی مالک' && (TG_MEM['errs'] || []).some(function (e) { return e.where === 'opsHubShare_' && /مالک فایل هاب/.test(e.msg); }));
    TG_MEM['ops:noowner'] = 0;
    TG_MEM['ops:email'] = { 'سردبیر آزمایشی': 'ed.two@example.com' };
    opsHubMake('پذیرش آزمایشی');

    /* دفتر: لید تازه، بی‌تکرار، بی نام مراجع */
    var t1 = opsAdaptLead_('L-1101', '7101', 'پذیرش آزمایشی'), t1b = opsAdaptLead_('L-1101', '7101', 'پذیرش آزمایشی');
    var r1 = opsGet_(t1);
    ok('لید تازه ← کار T-1001 با مهلت و پاسخگو، و رویداد دوباره کار دوم نمی‌سازد', t1 === 'T-1001' && t1b === t1 && opsRows_().length === 1 && r1.resp === 'پذیرش آزمایشی' && !!r1.dueAt);
    ok('عنوان کار فقط کد لید دارد', r1.title === 'تماس اول با لید L-1101');
    var hubP = opsHubOfName_('پذیرش آزمایشی');
    ok('ردیف در «کارهای من» هاب مالک آینه شد', (TG_MEM['ops:hub:' + hubP.id] || []).some(function (x) { return x[0] === t1; }));
    /* تغییر مالک از شیت ← از هاب قبلی بیرون، در هاب تازه */
    opsSet_(t1, { owner: 'سردبیر آزمایشی' }, 'sheet', OWN);
    var hubE = opsHubOfName_('سردبیر آزمایشی');
    ok('تغییر مالک در شیت ← از هاب قبلی برداشته و در هاب تازه نشست', !(TG_MEM['ops:hub:' + hubP.id] || []).some(function (x) { return x[0] === t1; }) && (TG_MEM['ops:hub:' + hubE.id] || []).some(function (x) { return x[0] === t1; }));
    opsSet_(t1, { owner: 'پذیرش آزمایشی' }, 'sheet', OWN);
    opsSet_(t1, { dueText: '۱۴۰۵/۰۷/۱۵' }, 'sheet', '7101');
    ok('مهلت شمسی از شیت به تاریخ میلادی پنهان تبدیل شد', opsGet_(t1).dueAt && Utilities.formatDate(opsGet_(t1).dueAt, TG_TZ, 'yyyy-MM-dd') === '2026-10-07');
    /* کار SLA همان لید کار دوم نمی‌سازد */
    ok('کار K- که به لید باز اشاره دارد، کار دوم نمی‌سازد', opsAdaptTask_('K-090', { title: 'تماس اول لید L-1101', team: 'پذیرش', chat: '7101', link: 'L-1101' }) === '' && opsRows_().length === 1);
    var tk = opsAdaptTask_('K-091', { title: 'خرید کاغذ', team: 'فنی', chat: '7101', pri: 'فوری' });
    ok('کار قبلی بات (K-) با دسته و اولویت نگاشته شد', opsGet_(tk).cat === 'فنی' && opsGet_(tk).pri === 'فوری');
    opsAdaptTaskSt_('K-091', TG_TSK_ST.done);
    ok('«انجام شد» در بات ← کار در دفتر بسته شد', opsGet_(tk).st === OPS_ST.DONE);
    opsAdaptLeadDone_('L-1101');
    ok('تماس اول لید ← کار بسته شد', opsGet_(t1).st === OPS_ST.DONE);

    /* بازبینی علمی: مالک هر مرحله */
    TG_MEM['vxed'] = [{ _row: 2, 'کد': 'E-4002', 'عنوان': 'مطلب آزمایشی', 'وضعیت': RV_ST.ED, 'زمان': '' }];
    var te = opsAdaptReview_('E-4002', RV_ST.ED, 'مطلب آزمایشی');
    ok('بازبینی در صف سردبیر ← کار سردبیر با لینک مینی‌اپ', opsGet_(te).ownerChat === '7001' && opsGet_(te).link.indexOf('?rv=E-4002') > -1);
    opsSet_(te, { st: OPS_ST.DROP }, 'sheet', '7001');
    ok('«لغو» در هاب سردبیر ← همان «رد» بات (وضعیت بازبینی «رد شد»)', vxEdGet_('E-4002')['وضعیت'] === RV_ST.REJ && opsGet_(te).st === OPS_ST.DROP);
    TG_MEM['vxed'].push({ _row: 3, 'کد': 'E-4003', 'عنوان': 'مطلب دوم', 'وضعیت': RV_ST.READY, 'زمان': '' });
    var ty = opsAdaptReview_('E-4003', RV_ST.READY, 'مطلب دوم');
    ok('آمادهٔ انتشار ← کار تأیید برای یاسر', opsGet_(ty).ownerChat === OWN && /تأیید انتشار/.test(opsGet_(ty).title));
    opsSet_(ty, { st: OPS_ST.DONE }, 'sheet', '7001');
    ok('انتشار از هاب کسی جز یاسر: بات نمی‌پذیرد و وضعیت با دلیل برمی‌گردد', opsGet_(ty).st === OPS_ST.NEW && vxEdGet_('E-4003')['وضعیت'] === RV_ST.READY && !!opsGet_(ty).note);

    /* پرداخت: فقط با دکمهٔ بات */
    var tp = opsAdaptPay_('PAY-007');
    ok('پرداخت منتظر ← کار مالی برای یاسر، بی مبلغ و بی نام', opsGet_(tp).ownerChat === OWN && opsGet_(tp).title === 'تأیید پرداخت PAY-007' && opsGet_(tp).cat === 'مالی');
    opsSet_(tp, { st: OPS_ST.DONE }, 'sheet', OWN);
    ok('«انجام شد» در شیت پرداخت را تأیید نمی‌کند و برمی‌گردد', opsGet_(tp).st === OPS_ST.NEW && /دکمهٔ بات/.test(opsGet_(tp).note));
    opsAdaptDone_('PAY-007', false);
    ok('تأیید پرداخت در بات ← کار بسته شد', opsGet_(tp).st === OPS_ST.DONE);

    /* ریتم */
    var late = opsAdd_({ title: 'کار آزمایشی معوق', cat: 'اداری', pri: 'فوری', owner: 'پذیرش دوم', resp: 'پذیرش آزمایشی', due: pbTehran_(2026, 10, 2, 8, 0), ref: 'X-1' });
    TG_OUTBOX = [];
    ok('۹:۳۰: «کار امروز» یک بار در روز', opsMorning_() >= 1 && opsMorning_() === 0 && said('7102').some(function (o) { return /کار امروز/.test(o.text); }));
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 3, 8, 0).getTime();
    ok('بیرون از ۹ تا ۱۸ ارجاعی نمی‌رود', opsEscalate_() === 0);
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 3, 10, 0).getTime();
    TG_OUTBOX = [];
    ok('۲۴ ساعت گذشته از مهلت ← ارجاع به پاسخگو', opsEscalate_() === 1 && /^1 /.test(opsGet_(late).esc) && said('7101').some(function (o) { return /معوق/.test(o.text); }));
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 4, 11, 0).getTime();
    opsEscalate_();
    ok('پاسخگو هم ۲۴ ساعت کاری نکرد ← مرحلهٔ ۲', /^2 /.test(opsGet_(late).esc));
    TG_OUTBOX = [];
    opsEvening_();
    ok('جمع‌بندی ۱۸ یاسر کار بی‌اقدام پاسخگو را دارد', said(OWN).some(function (o) { return /بی‌اقدام پاسخگو/.test(o.text) && o.text.indexOf('کار آزمایشی معوق') > -1; }) && said('7101').length === 1);

    /* حضور کارکنان */
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 3, 9, 5).getTime();
    var a1 = attMark_('7101', 'in');
    ok('«رسیدم» ثبت شد', a1.ok && attRows_()[0].tin === '09:05' && attRows_()[0].src === 'ثبت');
    ok('«رسیدم» دوباره ورود دوم نمی‌سازد', attMark_('7101', 'in').ok && attRows_().length === 1);
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 3, 17, 35).getTime();
    attMark_('7101', 'out');
    ok('«رفتم» و ساعت کار', attRows_()[0].tout === '17:35' && attRows_()[0].hrs === 8.5);
    /* شیفت و فعالیت */
    TG_MEM['att:shifts'] = [{ who: 'پذیرش دوم', wd: 'شنبه', from: '09:00', to: '15:00' }, { who: 'پذیرش سوم', wd: 'شنبه', from: '15:00', to: '21:00' }];
    TG_MEM['gd:rows'] = [{ jd: '1405/07/11', room: '۳', hour: '10', st: 'آمد', by: 'پذیرش دوم', day: '2026-10-03' }];
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 3, 21, 0).getTime();
    attDayClose_();
    var w2 = attRows_().filter(function (r) { return r.who === 'پذیرش دوم'; })[0], w3 = attRows_().filter(function (r) { return r.who === 'پذیرش سوم'; })[0];
    ok('بی ثبت ولی با فعالیت (تیک گاندی) ← منبع «فعالیت»، بی نیاز به تأیید', w2 && w2.src === 'فعالیت' && w2.st === ATT_ST.AUTO);
    ok('بی ثبت و بی فعالیت ← از شیفت، منتظر تأیید پذیرشی', w3 && w3.src === 'شیفت' && w3.st === ATT_ST.WAIT && w3.hrs === 6);
    TG_OUTBOX = [];
    ok('جمع‌بندی هفتگی فقط روزهای بی ثبت و بی فعالیت را برای مسئول پذیرش می‌فرستد', attWeekly_() === 1 && said('7101').some(function (o) { return JSON.stringify(o.markup || {}).indexOf('at:ok:' + w3.row) > -1; }));
    ok('تأیید کارکرد فقط با مسئول پذیرش', /مسئول پذیرش/.test((attCb_('7102', 'at:ok:' + w3.row), said('7102').slice(-1)[0] || {}).text || ''));
    attCb_('7101', 'at:ed:' + w3.row);
    attFixIn_('7101', '۱۵:۳۰ تا ۲۰');
    ok('اصلاح ساعت با متن «۱۵:۳۰ تا ۲۰»', w3.tin === '15:30' && w3.tout === '20:00' && w3.st === ATT_ST.OK && w3.src === 'اصلاح');
    ok('کارکرد ماهانه هیچ ستون حقوق یا بیمه ندارد', !/حقوق|بیمه|مبلغ/.test(ATT_HEAD.join(' ')));

    /* فهرست روز گاندی */
    TG_MEM['occ'] = [['شنبه', '۲', '10', 'درمانگر آزمایشی', 'نام کامل مراجع آزمایشی', 'پر'], ['شنبه', '۲', '11', 'درمانگر آزمایشی', '', 'خالی'], ['یکشنبه', '۲', '10', 'درمانگر دوم', 'مراجع دیگر', 'پر']];
    TG_MEM['inp'] = { places: [], hours: [], rooms: [{ p: GD_PLACE, room: '۲', days: 'شنبه تا چهارشنبه', from: '9', to: '21', status: 'فعال' }] };
    TG_MEM['gd:rows'] = [];
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 3, 9, 0).getTime();
    TG_OUTBOX = [];
    gdList_('7101');
    ok('فهرست امروز: فقط جلسهٔ پر امروز، با دو دکمه، بی نام مراجع', said('7101').length === 2 && said('7101')[1].text.indexOf('مراجع') < 0 && JSON.stringify(said('7101')[1].markup).indexOf('gd:n:۲:10') > -1);
    opsCb_('7101', 'gd:n:۲:10');
    ok('«نیامد» ثبت شد', gdRows_().length === 1 && gdRows_()[0].st === 'نیامد' && gdRows_()[0].by === 'پذیرش آزمایشی');
    opsCb_('7101', 'gd:y:۲:10');
    ok('اصلاح به «آمد» ردیف دوم نمی‌سازد', gdRows_().length === 1 && gdRows_()[0].st === 'آمد');
    var rep = gdReport_();
    /* ۱ تا ۱۱ مهر: ۷ روز باز (شنبه تا چهارشنبه) × ۱۲ ساعت = ۸۴؛ رزرو: دو شنبه و یک یکشنبه = ۳ */
    ok('گزارش گاندی: اشغال اتاق (رزرو ÷ باز) و نرخ غیبت', rep.length === 1 && rep[0][1] === '۲' && rep[0][2] === 84 && rep[0][3] === 3 && rep[0][4] === '4٪' && rep[0][5] === 1 && rep[0][7] === '0٪');
    ok('یک خط خلاصهٔ گاندی برای هاب یاسر', /^اشغال \d+٪ · غیبت \d+٪$/.test(gdSummaryLine_()));
    TG_MEM['apiwho'] = { chat: 7101, name: 'پذیرش آزمایشی' };
    var gd = opsApi_({ initData: 'x' }, 'gd.day');
    ok('مینی‌اپ gd.day بی نام مراجع', gd.ok && gd.rows.length === 1 && JSON.stringify(gd).indexOf('مراجع') < 0);
    ok('مینی‌اپ att.mark', opsApi_({ initData: 'x', kind: 'in' }, 'att.mark').ok);
    TG_MEM['apiwho'] = { chat: 7001, name: 'سردبیر' };
    var hm = opsApi_({ initData: 'x' }, 'hub.me');
    ok('مینی‌اپ hub.me لینک هاب خود نفر', hm.ok && hm.url === hubE.url);

    /* خانهٔ تیم در مینی‌اپ (v169.3) */
    TG_MEM['ops:now'] = pbTehran_(2026, 10, 3, 10, 0).getTime();
    opsAdd_({ title: 'کار امروز آزمایشی', cat: 'اداری', pri: 'عادی', owner: 'سردبیر آزمایشی', due: pbTehran_(2026, 10, 3, 17, 0), ref: 'X-2' });
    opsAdd_({ title: 'کار معوق آزمایشی', cat: 'اداری', pri: 'بالا', owner: 'سردبیر آزمایشی', due: pbTehran_(2026, 10, 1, 17, 0), ref: 'X-3' });
    opsAdd_({ title: 'تأیید آزمایشی', cat: 'اداری', pri: 'فوری', owner: 'سردبیر آزمایشی', ref: 'X-4' });
    TG_MEM['apiwho'] = { chat: 7001, name: 'سردبیر' };
    var hh = opsApi_({ initData: 'x' }, 'home.me');
    ok('خانهٔ تیم: سه عدد امروز، معوق و منتظر تأیید', hh.ok && hh.today === 1 && hh.late === 1 && hh.wait === 1 && hh.hub === hubE.url);
    ok('«کار بعدی» به ترتیب اولویت، فوری اول', hh.next.length === 3 && hh.next[0].title === 'تأیید آزمایشی' && hh.next[1].title === 'کار معوق آزمایشی');
    TG_MEM['apiwho'] = { chat: 9999, name: 'مراجع' };
    ok('مراجع: خانهٔ تیم خالی است (خانهٔ مراجع عوض نمی‌شود)', opsApi_({ initData: 'x' }, 'home.me').open === 0);

    /* بات */
    TG_OUTBOX = [];
    ok('دکمهٔ «رسیدم» در بات برای پذیرش', opsRoute_('7101', { text: ATT_BTN_IN }) === true);
    TG_MEM['deskwho'] = null;
    ok('غیرپذیرش دکمهٔ «رسیدم» را نمی‌گیرد', opsRoute_('8888', { text: ATT_BTN_IN }) === false);

    /* حریم: ایمیل هیچ‌جا در پیام‌ها نیست */
    ok('هیچ پیام بات ایمیل ندارد', !TG_OUTBOX.concat([]).some(function (o) { return /@example\.com/.test(o.text || ''); }) && JSON.stringify(opsRows_()).indexOf('@example.com') < 0);
    ok('اندپوینت‌ها در رجیستری', ['att.mark', 'gd.day', 'gd.mark', 'hub.me', 'home.me'].every(function (a) { return TG_CAP.some(function (c) { return c.api === a; }); }));
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK; MC_DRY_EDITORS = edK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ هاب عملیات و حضور درست است'));
  return tgTestTally_(log, fail);
}
