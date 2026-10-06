/**
 * comments.gs · v170.2 · ۱۲ مهر ۱۴۰۵ · کامنت‌های هاب پذیرش ← وضعیت لید (ضمیمهٔ مدل لید)
 *
 * چرا: تیم پذیرش نتیجهٔ کار با لید را در کامنت هاب پذیرش می‌نویسد و بات کامنت نمی‌خواند؛ وضعیت، مسئول و اقدام بعدی
 * عقب می‌ماند (مثل L-1272 که معارفه‌اش لغو شده ولی هنوز «در پیگیری» با مسئول بات بود).
 * - هر ۱۵ دقیقه (از tgTick5، بی تریگر تازه) کامنت‌های تازه با Drive API (comments.list) خوانده می‌شوند.
 * - وصل به لید: کد L- در متن، یا محتوای خانه‌ای که کامنت رویش است (quotedFileContent) با نام، شماره یا کد لید.
 * - دسته‌بندی: اول قاعده (بی هزینه و قابل تست)، اگر نامطمئن بود Gemini با متن پاک‌شده (بی شماره، ایمیل، یوزرنیم و نام مراجع).
 *   اطمینان کم ← فقط کارت «بررسی دستی» برای ژیلا، بی هیچ تغییر.
 * - اقدام بر اساس دسته، همه در «رویدادهای لید» با کانال «کامنت»، نویسنده و متن. پاسخ کوتاه زیر کامنت (با 🤖)، بی resolve.
 * - دفتر: تب «دفتر کامنت‌ها» (هر کامنت یک ردیف؛ حالت آزمایشی، اعمال شد، بررسی دستی، بی لید).
 * - تا یاسر «✅ اجرا» را نزده (LM_ON)، فقط شمارش آزمایشی؛ هیچ لیدی عوض نمی‌شود و پاسخی نوشته نمی‌شود.
 * - بی تغییر در پرداخت، نقش‌ها و تریگرها. متن تازه‌ای برای مراجع ساخته نمی‌شود.
 */

var CM_TAB = 'دفتر کامنت‌ها';
var CM_HEAD = ['زمان', 'شناسهٔ کامنت', 'نویسنده', 'کد لید', 'دسته', 'اطمینان', 'وضعیت فعلی', 'وضعیت پیشنهادی', 'اقدام', 'حالت', 'متن', 'زمان کامنت', 'داده'];
var CM_ST = { DRY: 'آزمایشی', DONE: 'اعمال شد', MAN: 'بررسی دستی', NOLEAD: 'بی لید' };
var CM_CAT = { set: 'معارفه تعیین شد', cancel: 'معارفه لغو شد یا ارجاع دوباره', noans: 'بی‌پاسخ یا خاموش', start: 'شروع درمان',
  prefs: 'ترجیحات و شرح حال', psy: 'روانپزشکی', order: 'دستور ' + tgNm_('reception') + ' به تیم', other: 'سایر' };
var CM_WHY = { hours: 'ساعت نخورد', inp: 'حضوری نشد', fit: 'رویکرد یا جنسیت یا سن', cmp: 'مقایسه', other: 'دلیل دیگر' };
var CM_MIN = 15, CM_MARK = '🤖', CM_MAX_RUN = 25, CM_NOANS_MAX = 3, CM_CONF = 0.75;
/* v170.21: فهرست ثابت اولویت با کد لید (CM_PRIORITY) برداشته شد؛ ترتیب فقط با زمان کامنت */

function cmOn_() { return lmOn_(); }
function cmNow_() { return stkNow_(); }

/* ---------------- Drive API ---------------- */
function cmFetch_(sinceIso) {
  if (stkDry_()) return TG_MEM['cm:list'] || [];
  var out = [], tok = '', f = 'nextPageToken,comments(id,content,createdTime,modifiedTime,resolved,deleted,author(displayName),quotedFileContent(value),replies(id,content,createdTime,deleted,author(displayName)))';
  do {
    var url = 'https://www.googleapis.com/drive/v3/files/' + TG_SHEET_ID + '/comments?pageSize=100&includeDeleted=false&fields=' + encodeURIComponent(f) +
      (sinceIso ? '&startModifiedTime=' + encodeURIComponent(sinceIso) : '') + (tok ? '&pageToken=' + encodeURIComponent(tok) : '');
    var r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error('comments.list HTTP ' + r.getResponseCode());
    var b = JSON.parse(r.getContentText());
    out = out.concat(b.comments || []); tok = b.nextPageToken || '';
  } while (tok && out.length < 2000);
  return out;
}
function cmReply_(cid, text) {
  var body = CM_MARK + ' ' + text;
  if (stkDry_()) { (TG_MEM['cm:replies'] = TG_MEM['cm:replies'] || []).push({ id: cid, text: body }); return true; }
  try {
    var r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + TG_SHEET_ID + '/comments/' + encodeURIComponent(cid) + '/replies?fields=id', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify({ content: body }),
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    return r.getResponseCode() === 200;
  } catch (e) { tgErr_('cmReply_', e); return false; }
}
/* کامنت‌ها و پاسخ‌های باز (پاسخ‌های خود بات با 🤖 کنار می‌روند) ← آیتم */
function cmItems_(list) {
  var out = [];
  (list || []).forEach(function (c) {
    if (c.deleted || c.resolved) return;
    var q = c.quotedFileContent ? String(c.quotedFileContent.value || '') : '';
    var base = { quoted: q, created: c.createdTime || '', parent: c.id };
    if (String(c.content || '').indexOf(CM_MARK) !== 0) out.push({ id: c.id, text: String(c.content || ''), author: (c.author || {}).displayName || '', t: c.createdTime || '', quoted: q, parent: c.id, created: base.created });
    (c.replies || []).forEach(function (r) {
      if (r.deleted || String(r.content || '').indexOf(CM_MARK) === 0 || !String(r.content || '').trim()) return;
      out.push({ id: c.id + ':' + r.id, text: String(r.content || ''), author: (r.author || {}).displayName || '', t: r.createdTime || '', quoted: q, parent: c.id, created: base.created });
    });
  });
  return out;
}

/* ---------------- دفتر ---------------- */
function cmSheet_() {
  var ss = tgSS_(), sh = ss.getSheetByName(CM_TAB);
  if (!sh) {
    sh = ss.insertSheet(CM_TAB); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, CM_HEAD.length).setValues([CM_HEAD]).setFontWeight('bold').setFontColor('#fefefe').setBackground('#222222');
    sh.setFrozenRows(1); sh.setColumnWidth(11, 420);
  }
  return sh;
}
function cmLog_() {
  if (stkDry_()) return (TG_MEM['cm:log'] = TG_MEM['cm:log'] || []);
  var sh = cmSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, CM_HEAD.length).getDisplayValues().map(function (v, i) {
    return { row: i + 2, at: v[0], id: v[1], author: v[2], code: v[3], cat: v[4], conf: v[5], from: v[6], to: v[7], act: v[8], st: v[9], text: v[10], t: v[11], data: v[12] };
  });
}
function cmLogWrite_(e) {
  var arr = [e.at || stkStamp_(), e.id, e.author || '', e.code || '', e.cat || '', e.conf || '', e.from || '', e.to || '', e.act || '', e.st || '', String(e.text || '').slice(0, 500), e.t || '', e.data || ''];
  if (stkDry_()) { var L = cmLog_(), i = L.map(function (x) { return x.id; }).indexOf(e.id); var o = { id: e.id, code: e.code, cat: e.cat, conf: e.conf, from: e.from, to: e.to, act: e.act, st: e.st, text: e.text, t: e.t, data: e.data, author: e.author }; if (i < 0) L.push(o); else L[i] = o; return; }
  var sh = cmSheet_();
  if (e.row) sh.getRange(e.row, 1, 1, CM_HEAD.length).setValues([arr]);
  else { sh.appendRow(arr); e.row = sh.getLastRow(); }
}

/* ---------------- وصل به لید ---------------- */
function cmDigits_(s) { return phoneDigits_(s); }   /* v170.19 */
function cmLink_(it, idx) {
  var codes = {}; idx.list.forEach(function (l) { if (l.code) codes[l.code] = l; });
  var m = (String(it.text) + ' ' + String(it.quoted)).match(/L-\d{3,5}/g) || [];
  for (var i = 0; i < m.length; i++) if (codes[m[i]]) return codes[m[i]];
  var q = String(it.quoted || '').trim();
  if (!q) return null;
  var qd = cmDigits_(q), hit = idx.list.filter(function (l) {
    if (!l.code) return false;
    if (l.code === q) return true;
    if (qd.length >= 7 && cmDigits_(l.phone).slice(-10) === qd.slice(-10)) return true;
    return !!l.name && tgNorm_(l.name) === tgNorm_(q);
  });
  if (hit.length > 1) { var op = hit.filter(function (l) { return !tgStClosed_(l.status); }); if (op.length === 1) hit = op; }
  return hit.length === 1 ? hit[0] : null;
}

/* ---------------- دسته‌بندی ---------------- */
var CM_RX = {
  start: /شروع\s*(درمان|جلسات|کرد|کردن)|درمان(ش)?\s*(را\s*)?شروع|جلسهٔ?\s*اول\s*(درمان\s*)?(برگزار|انجام)/,
  cancel: /لغو|کنسل|منصرف|ارجاع\s*(دوباره|مجدد)|درمانگر\s*(دیگر|دیگه)|نخورد|نمی\s*خورد|نمی‌خورد|کنار\s*کشید/,
  set: /معارفه/,
  noans: /پاسخ\s*نداد|جواب\s*نداد|جواب\s*نمی\s*د|خاموش|در\s*دسترس\s*نیست|بی\s*‌?\s*پاسخ|برنداشت|رد\s*تماس|ریجکت/,
  psy: /روان\s*‌?\s*پزشک|روانپزشک|دارو|سایکیاتر/,
  order: /لطفا|لطفاً|پیگیری\s*کنید|تماس\s*بگیرید|انجام\s*بدید|انجام\s*دهید|بفرستید|هماهنگ\s*کنید/,
  prefs: /ترجیح|خانم\s*باشد|آقا\s*باشد|درمانگر\s*(خانم|آقا|زن|مرد)|آنلاین|حضوری|شرح\s*حال|اضطراب|افسردگی|وسواس|رابطه|سن\s*درمانگر/
};
function cmWhyOf_(t) {
  if (/حضوری/.test(t) && /(نشد|نمی|نداریم|نبود|نخورد|دور)/.test(t)) return 'inp';
  if (/(ساعت|زمان|وقت|روز)/.test(t) && /(نخورد|نمی\s*خورد|نمی‌خورد|مناسب\s*نبود|نشد|جور\s*نشد)/.test(t)) return 'hours';
  if (/رویکرد|جنسیت|خانم|آقا|سن|مسن|جوان|سبک/.test(t)) return 'fit';
  if (/مقایسه|چند\s*درمانگر|فکر\s*کن|بررسی\s*کن/.test(t)) return 'cmp';
  return 'other';
}
/* تاریخ و ساعت از متن: «۱۴ مهر»، «1405/07/14»، «ساعت ۱۸» یا «۱۸:۳۰» */
function cmWhen_(t) {
  var s = tgLatinDigits_(String(t || '')), iso = '', hh = '';
  var m = s.match(/(1[34]\d\d)[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  var jy = tgJalali_(cmNow_(), TG_TZ).y;
  if (m) iso = Utilities.formatDate(tgJ2G_(+m[1], +m[2], +m[3]), TG_TZ, 'yyyy-MM-dd');
  else {
    for (var k = 0; k < TG_JMONTHS.length && !iso; k++) {
      var r = new RegExp('(\\d{1,2})\\s*' + TG_JMONTHS[k]);
      var mm = s.match(r);
      if (mm) iso = Utilities.formatDate(tgJ2G_(jy, k + 1, +mm[1]), TG_TZ, 'yyyy-MM-dd');
    }
  }
  hh = cmHour_(s);
  return { iso: iso, hh: hh };
}
/* v170.21: ساعت با «صبح»، «ظهر»، «بعدازظهر»، «عصر» و «شب». «ساعت ۱ ظهر» ۱۳:۰۰ است، نه ۰۱:۰۰.
   بی قید، ۱ تا ۷ در ساعت کاری مرکز یعنی بعدازظهر («ساعت ۲» = ۱۴). */
var CM_PART = '(صبح|بعد\\s*از\\s*ظهر|بعدازظهر|ظهر|عصر|شب)';
function cmHour_(s) {
  s = tgLatinDigits_(String(s || '')).replace(/\u200c/g, '');
  var re = new RegExp('ساعت\\s*(\\d{1,2})(?::(\\d{2}))?\\s*' + CM_PART + '?');
  var m = s.match(re) || s.match(new RegExp('\\b(\\d{1,2})(?::(\\d{2}))?\\s*' + CM_PART)) || s.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!m) return '';
  var h = +m[1], mi = m[2] || '00', part = String(m[3] || '').replace(/\s+/g, '');
  if (h > 23 || +mi > 59) return '';
  if (part === 'صبح') { if (h === 12) h = 0; }
  else if (part === 'ظهر') { if (h >= 1 && h <= 5) h += 12; }
  else if (part === 'بعدازظهر' || part === 'عصر') { if (h < 12) h += 12; }
  else if (part === 'شب') { if (h === 12) h = 0; else if (h >= 5 && h < 12) h += 12; }
  else if (h >= 1 && h <= 7) h += 12;
  return ('0' + h).slice(-2) + ':' + mi;
}
/* روز خود کامنت (تهران)، برای «تماس بعدی» و موعد؛ کامنت قدیمی از روز خودش حساب می‌شود، نه امروز */
function cmItDay_(it) {
  var t = it && (it.t || it.created);
  var d = t ? new Date(t) : null;
  return d && !isNaN(d.getTime()) ? Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd') : '';
}
function cmTherNames_() {
  if (stkDry_()) return TG_MEM['cm:ther'] || [];
  try { return tgTherapistRows_().map(function (r) { return String(r.name || '').trim(); }).filter(String); } catch (e) { return []; }
}
function cmTherOf_(t) {
  var n = tgNorm_(t), best = '';
  cmTherNames_().forEach(function (nm) {
    var parts = String(nm).split(/\s+/).filter(function (p) { return p.length > 2; });
    if (tgNorm_(nm) && n.indexOf(tgNorm_(nm)) > -1) best = nm;
    else if (!best && parts.length > 1 && n.indexOf(tgNorm_(parts[parts.length - 1])) > -1 && n.indexOf(tgNorm_(parts[0])) > -1) best = nm;
  });
  return best;
}
function cmPrefsOf_(t) {
  var o = {};
  if (/آنلاین/.test(t)) o.mode = 'آنلاین'; else if (/حضوری/.test(t)) o.mode = 'حضوری';
  if (/درمانگر\s*(خانم|زن)|خانم\s*باشد|ترجیح.{0,12}(خانم|زن)/.test(t)) o.gender = 'زن';
  else if (/درمانگر\s*(آقا|مرد)|آقا\s*باشد|ترجیح.{0,12}(آقا|مرد)/.test(t)) o.gender = 'مرد';
  if (/مسن|بزرگ\s*تر|بزرگ‌تر|باتجربه|با\s*تجربه/.test(t)) o.age = 'بزرگ‌تر'; else if (/جوان|هم\s*سن|هم‌سن/.test(t)) o.age = 'جوان‌تر';
  return o;
}
/* قاعده‌ها؛ {cat, conf, why, iso, hh, ther, prefs} یا null وقتی نامطمئن است */
function cmRule_(it) {
  var t = String(it.text || ''), hit = [];
  ['start', 'cancel', 'noans', 'psy'].forEach(function (k) { if (CM_RX[k].test(t)) hit.push(k); });
  var w = cmWhen_(t);
  if (CM_RX.set.test(t) && !CM_RX.cancel.test(t) && (w.iso || w.hh)) hit.push('set');
  var rcN = tgNm_('reception'), rcL = tgNm_('reception_lat'), au = String(it.author || '');
  var isRecep = !!((rcN && au.indexOf(rcN) > -1) || (rcL && au.toLowerCase().indexOf(rcL.toLowerCase()) > -1));
  if (!hit.length && isRecep && CM_RX.order.test(t)) hit.push('order');
  if (!hit.length && CM_RX.prefs.test(t)) hit.push('prefs');
  if (hit.length !== 1) return null;
  var c = hit[0], o = { cat: c, conf: 0.9 };
  if (c === 'cancel') o.why = cmWhyOf_(t);
  if (c === 'set') { o.iso = w.iso; o.hh = w.hh; o.ther = cmTherOf_(t); if (!o.iso) o.conf = 0.6; }
  if (c === 'start') o.ther = cmTherOf_(t);
  if (c === 'prefs') { o.prefs = cmPrefsOf_(t); if (!Object.keys(o.prefs).length) o.conf = 0.8; }
  return o;
}
/* متن پاک برای هوش مصنوعی: بی شماره، ایمیل، یوزرنیم و نام مراجع */
function cmScrub_(t, name) {
  var s = String(t || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[ایمیل]').replace(/@\w{3,}/g, '[شناسه]');
  s = tgLatinDigits_(s).replace(/\d[\d\s-]{5,}\d/g, '[شماره]');
  if (name && String(name).trim().length > 1) s = s.split(String(name).trim()).join('[مراجع]');
  return s.slice(0, 600);
}
var CM_SCHEMA = { type: 'ARRAY', items: { type: 'OBJECT', properties: {
  i: { type: 'INTEGER' }, cat: { type: 'STRING', enum: Object.keys(CM_CAT) }, conf: { type: 'NUMBER' },
  why: { type: 'STRING', enum: Object.keys(CM_WHY) }, date: { type: 'STRING' }, time: { type: 'STRING' }, therapist: { type: 'STRING' },
  mode: { type: 'STRING' }, gender: { type: 'STRING' }, age: { type: 'STRING' } }, required: ['i', 'cat', 'conf'] } };
function cmAi_(batch) {
  if (!batch.length) return {};
  if (stkDry_()) return TG_MEM['cm:ai'] ? TG_MEM['cm:ai'](batch) : {};
  var p = 'تو دسته‌بند کامنت‌های تیم پذیرش یک مرکز روان‌درمانی هستی. هر کامنت را در یکی از این دسته‌ها بگذار: ' +
    Object.keys(CM_CAT).map(function (k) { return k + ' = ' + CM_CAT[k]; }).join('؛ ') +
    '. برای cancel دلیل (why): ' + Object.keys(CM_WHY).map(function (k) { return k + ' = ' + CM_WHY[k]; }).join('؛ ') +
    '. برای set تاریخ شمسی (date به شکل 1405-07-14) و ساعت (time به شکل 18:00) و نام درمانگر را اگر در متن هست بده. برای prefs حالت جلسه (آنلاین یا حضوری)، جنسیت درمانگر (زن یا مرد) و سن (بزرگ‌تر یا جوان‌تر). ' +
    'conf عددی بین ۰ و ۱ است؛ اگر مطمئن نیستی کمتر از ۰.۷۵ بده. فقط JSON.\n\n' +
    batch.map(function (b) { return '[' + b.i + '] نویسنده: ' + (b.author || '?') + ' · متن: ' + b.text; }).join('\n');
  var out = {};
  try { (gemJson_(p, CM_SCHEMA) || []).forEach(function (r) { if (r && r.i !== undefined) out[r.i] = r; }); } catch (e) { tgErr_('cmAi_', e); }
  return out;
}
function cmFromAi_(r) {
  if (!r || !CM_CAT[r.cat]) return null;
  var o = { cat: r.cat, conf: Number(r.conf) || 0, why: r.why || '', ther: r.therapist || '' };
  if (r.date) { var w = cmWhen_(r.date); o.iso = w.iso; }
  if (r.time) { var h = cmWhen_('ساعت ' + r.time); o.hh = h.hh; }
  if (r.cat === 'prefs') o.prefs = { mode: r.mode || '', gender: r.gender || '', age: r.age || '' };
  if (r.cat === 'set' && !o.iso) o.conf = Math.min(o.conf, 0.6);
  return o;
}
/* دسته‌بندی گروهی: قاعده، و باقی با یک تماس Gemini برای هر ۲۰ کامنت */
function cmClassify_(items) {
  var res = {}, rest = [];
  items.forEach(function (x, i) { var r = cmRule_(x.it); if (r && r.conf >= CM_CONF) res[i] = r; else { rest.push({ i: i, author: x.it.author, text: cmScrub_(x.it.text, x.lead && x.lead.name) }); if (r) res[i] = r; } });
  for (var k = 0; k < rest.length; k += 20) {
    var part = rest.slice(k, k + 20), ai = cmAi_(part);
    part.forEach(function (b) { var o = cmFromAi_(ai[b.i]); if (o && (!res[b.i] || o.conf > res[b.i].conf)) { o.ai = 1; res[b.i] = o; } });
  }
  return res;
}

/* ---------------- اقدام ---------------- */
function cmDay_(n, base) { var d = base ? new Date(base + 'T12:00:00') : cmNow_(); return Utilities.formatDate(new Date(d.getTime() + n * 86400000), TG_TZ, 'yyyy-MM-dd'); }
function cmHuman_(owner) { return owner && !/^بات/.test(owner) ? owner : lmOwner_(); }
/* سه درمانگر تازه که مشکل قبلی را ندارند (ساعت نخورد ← فقط با وقت خالی؛ حضوری نشد ← استخر حضوری) */
function cmResuggest_(l, why) {
  try {
    var ctx = v168SuggestCtx_(), full = stkDry_() ? (TG_MEM['cm:full'] || {}) : v168LeadFull_(l.row, {});
    var ll = { kind: full.kind || 'تراپی فردی', topic: full.topic || 'سایر', region: full.region || 'داخل ایران', mode: why === 'inp' ? 'حضوری' : (full.mode || 'آنلاین') };
    var skip = [full.ref1, full.ref2, full.ref3, l.meetTher].filter(String);
    var c = v168Candidates_(ll, ctx, skip);
    return v168Pick_(c, 3, v168Cfg_('explore_slot', 1)).map(function (x) { return x.name; });
  } catch (e) { tgErr_('cmResuggest_', e); return []; }
}
/* پیشنهاد اقدام یک کامنت: {to, ch, act, reply, card, task}. چیزی نمی‌نویسد */
function cmPlanOne_(it, c, l) {
  var st = tgStOf_(l.status) || l.status || 'جدید', own = cmHuman_(l.owner), p = { from: st, ch: {}, act: '', reply: '', card: '', task: null, sug: [] };
  /* v170.22.2: کامنتی که از آخرین وضعیت غیرکامنتی (شیت یا بات) قدیمی‌تر است، وضعیت یا اقدام بعدی را عوض نمی‌کند (اجرای ۱۲ مهر) */
  if (['set', 'cancel', 'noans', 'start', 'psy'].indexOf(c.cat) > -1 && cmIsStale_(it, l)) {
    p.to = st; p.stale = true;
    p.act = 'کامنت قدیمی‌تر از آخرین وضعیت لید؛ وضعیت و اقدام دست نخورد';
    p.reply = 'ثبت شد در رویدادهای لید. وضعیت لید بعد از این کامنت عوض شده بود، پس وضعیت و اقدام بعدی دست نخورد.';
    return p;
  }
  var day0 = cmItDay_(it) || undefined;   /* v170.21: پایهٔ «تماس بعدی» روز خود کامنت است */
  var t0 = it && (it.t || it.created) && !isNaN(new Date(it.t || it.created).getTime()) ? new Date(it.t || it.created) : cmNow_();
  if (c.cat === 'set') {
    p.to = TG_ST.BOOKED;
    p.ch = { 'معارفه هماهنگ شد؟': 'بله', 'تاریخ معارفه': c.iso, 'وضعیت': TG_ST.BOOKED, 'اقدام بعدی': 'پیگیری بعد از معارفه', 'تاریخ اقدام بعدی': cmDay_(1, c.iso), 'مسئول': own };
    if (c.ther) p.ch['درمانگر معارفه'] = c.ther;
    p.act = 'معارفه ' + tgFa_(c.iso) + (c.hh ? ' ' + tgFa_(c.hh) : '') + (c.ther ? ' با ' + c.ther : '') + '؛ پیگیری روز بعد';
    p.reply = 'ثبت شد: معارفه ' + tgLeadJ_(c.iso) + (c.hh ? ' ساعت ' + tgFa_(c.hh) : '') + (c.ther ? ' با ' + c.ther : '') + '، پیگیری بعد از معارفه ' + tgLeadJ_(cmDay_(1, c.iso)) + '.';
  } else if (c.cat === 'cancel') {
    var why = CM_WHY[c.why] || CM_WHY.other;
    p.to = 'نیاز به ارجاع مجدد';
    p.ch = { 'وضعیت': TG_ST.FOLLOW, 'نتیجه': 'نیاز به ارجاع مجدد: ' + why, 'اقدام بعدی': 'ارجاع مجدد', 'تاریخ اقدام بعدی': cmDay_(1, day0),
      'مهلت': Utilities.formatDate(new Date(t0.getTime() + 86400000), TG_TZ, 'yyyy-MM-dd HH:mm'), 'معارفه هماهنگ شد؟': 'خیر', 'مسئول': own };
    p.sug = cmResuggest_(l, c.why);
    p.sug.forEach(function (n, j) { p.ch[V168_SUG[j]] = n; });
    p.act = 'ارجاع مجدد (' + why + ')' + (p.sug.length ? '؛ پیشنهاد تازه: ' + p.sug.join('، ') : '؛ پیشنهاد تازه‌ای پیدا نشد');
    p.reply = 'ثبت شد: نیاز به ارجاع مجدد (' + why + ')، مسئول ' + own + '، موعد ' + tgLeadJ_(p.ch['تاریخ اقدام بعدی']) + '.';
    p.card = 'cancel';
  } else if (c.cat === 'noans') {
    var n = (Number(l.noans) || 0) + 1;
    p.to = TG_ST.NOANS;
    p.ch = { 'شمار بی‌پاسخ': n, 'نتیجه': 'پاسخ نداد (' + tgFa_(n) + ')', 'وضعیت': TG_ST.NOANS, 'اقدام بعدی': 'تماس دوباره', 'تاریخ اقدام بعدی': cmDay_(n >= CM_NOANS_MAX ? 3 : 1, day0), 'مسئول': own };
    p.act = 'تلاش تماس ' + tgFa_(n) + '؛ تماس بعدی ' + tgFa_(p.ch['تاریخ اقدام بعدی']);
    p.reply = 'ثبت شد: بی‌پاسخ (تلاش ' + tgFa_(n) + ')، تماس بعدی ' + tgLeadJ_(p.ch['تاریخ اقدام بعدی']) + '.' + (n >= CM_NOANS_MAX ? ' بعد از ' + tgFa_(n) + ' تلاش به ' + tgNm_('reception') + ' خبر داده شد؛ لید فقط با دلیل ثبت‌شده بسته می‌شود.' : '');
    if (n >= CM_NOANS_MAX) p.card = 'noans';
  } else if (c.cat === 'start') {
    p.to = TG_ST.START;
    p.ch = { 'وضعیت': TG_ST.START, 'شروع درمان؟': 'بله', 'پیامد': 'شروع درمان', 'نتیجه': 'شروع درمان', 'مسئول': own };
    if (c.ther) p.ch['درمانگر معارفه'] = c.ther;
    p.act = 'شروع درمان' + (c.ther ? ' با ' + c.ther : '');
    p.reply = 'ثبت شد: شروع درمان' + (c.ther ? ' با ' + c.ther : '') + '.';
  } else if (c.cat === 'prefs') {
    var pr = c.prefs || {};
    p.to = st;
    p.ch = { 'ترجیحات': String(it.text).replace(/\s+/g, ' ').slice(0, 200) };
    if (pr.mode) p.ch['حالت جلسه'] = pr.mode;
    if (pr.gender) p.ch['ترجیح جنسیت'] = pr.gender;
    if (pr.age) p.ch['ترجیح سن'] = pr.age;
    p.act = 'ترجیحات' + (pr.mode ? ' · ' + pr.mode : '') + (pr.gender ? ' · درمانگر ' + pr.gender : '') + (pr.age ? ' · ' + pr.age : '');
    p.reply = 'ثبت شد: ترجیحات در ستون‌های لید نشست تا پیشنهاد درمانگر از آن‌ها استفاده کند.';
  } else if (c.cat === 'psy') {
    p.to = st;
    p.ch = { 'اقدام بعدی': 'هماهنگی روان‌پزشکی', 'تاریخ اقدام بعدی': cmDay_(1, day0), 'مسئول': own };
    p.act = 'هماهنگی روان‌پزشکی، موعد فردا';
    p.reply = 'ثبت شد: هماهنگی روان‌پزشکی، مسئول ' + own + '، موعد ' + tgLeadJ_(p.ch['تاریخ اقدام بعدی']) + '.';
  } else if (c.cat === 'order') {
    p.to = st;
    var who = ''; try { (stkDry_() ? (TG_MEM['desk'] || []) : tgDeskRows_()).forEach(function (d) { if (d.name && String(it.text).indexOf(d.name) > -1 && !who) who = d.name; }); } catch (e) {}
    p.task = { title: String(it.text).replace(/\s+/g, ' ').slice(0, 160), owner: who || own, due: new Date(cmNow_().getTime() + 86400000) };
    p.act = 'کار برای ' + p.task.owner + '، موعد فردا';
    p.reply = 'ثبت شد: کار برای ' + p.task.owner + '، موعد فردا.';
  } else {
    p.to = st; p.act = 'فقط در رویدادها';
    p.reply = 'ثبت شد در رویدادهای لید.';
  }
  return p;
}
function cmApplyOne_(it, c, l, p) {
  var row = l.row, code = l.code;
  if (Object.keys(p.ch).length) {
    if (stkDry_()) TG_OUTBOX.push({ kind: 'leadset', row: row, changes: p.ch, actor: it.author, code: code });
    else tgLeadSet_(row, p.ch, it.author || 'کامنت', 'کامنت', CM_CAT[c.cat]);
  }
  var taskCode = '';
  if (p.task) {
    try { if (typeof opsAdd_ === 'function') taskCode = opsAdd_({ title: p.task.title, cat: 'پذیرش', owner: p.task.owner, by: it.author || 'کامنت', due: p.task.due, src: 'کامنت', ref: 'CM:' + it.id, note: code }); } catch (eT) { tgErr_('cmApplyOne_ opsAdd_', eT); }
    if (!taskCode && row >= 2 && !stkDry_() && !cmIsStale_(it, l)) tgLeadSet_(row, { 'اقدام بعدی': p.task.title.slice(0, 80), 'تاریخ اقدام بعدی': cmDay_(1) }, it.author || 'کامنت', 'کامنت', 'دستور ' + tgNm_('reception'));
    if (taskCode) p.reply = p.reply.replace('ثبت شد: کار', 'ثبت شد: کار ' + taskCode);
  }
  tgLeadEv_({ code: code, row: row, actor: it.author || 'کامنت', channel: 'کامنت', what: 'کامنت · ' + CM_CAT[c.cat], from: p.from, to: p.to, note: String(it.text).slice(0, 300), type: l.type || '' });
  var boss = lmBossChat_();
  if (p.card === 'cancel') {
    var kb = [[{ text: '🏁 پیامد', callback_data: 'lm:o:' + code }, { text: '👥 واگذاری', callback_data: 'ld:asg:' + code }]];
    if (c.why === 'inp' && l.chat) kb.unshift([{ text: '🙋 پرسیدن روز و ساعت از مراجع', callback_data: 'cm:ask:' + code }]);
    tgNotify_(boss, TG_NK.task, '🔁 <b>ارجاع مجدد</b> · <code>' + tgEsc_(code) + '</code>\nدلیل: ' + tgEsc_(CM_WHY[c.why] || CM_WHY.other) +
      '\nپیشنهاد تازه: ' + tgEsc_(p.sug.length ? p.sug.join('، ') : 'پیدا نشد؛ دستی انتخاب کنید') + '\nموعد: ۲۴ ساعت\n\nاز کامنت ' + tgEsc_(it.author || ''), { ref: code, markup: { inline_keyboard: kb } });
  } else if (p.card === 'noans') {
    tgNotify_(boss, TG_NK.task, '🔕 <b>' + tgFa_(p.ch['شمار بی‌پاسخ']) + ' تلاش بی‌پاسخ</b> · <code>' + tgEsc_(code) + '</code>\nتماس بعدی ' + tgEsc_(tgLeadJ_(p.ch['تاریخ اقدام بعدی'])) + '. بستن فقط با دلیل ثبت‌شده.', { ref: code, markup: { inline_keyboard: [[{ text: '🏁 پیامد', callback_data: 'lm:o:' + code }]] } });
  }
  cmReply_(it.parent, p.reply);
  return p;
}
function cmManual_(it, l, c) {
  tgNotify_(lmBossChat_(), TG_NK.task, '🔎 <b>بررسی دستی کامنت</b>' + (l ? ' · <code>' + tgEsc_(l.code) + '</code>' : ' · بی لید') +
    '\nنویسنده: ' + tgEsc_(it.author || '?') + (c ? '\nحدس: ' + tgEsc_(CM_CAT[c.cat]) + ' (' + tgFa_(Math.round((c.conf || 0) * 100)) + '٪)' : '') +
    '\n\n' + tgEsc_(cmScrub_(it.text, l && l.name).slice(0, 220)) + '\n\nچیزی عوض نشد.', { ref: l ? l.code : 'CM' });
}

/* ---------------- اجرا ---------------- */
/* dry=true: فقط ردیف آزمایشی در دفتر؛ برمی‌گرداند {byCat, rows, manual, nolead} */
function cmRun_(dry, max) {
  var idx = lmLeadIdx_(), log = cmLog_(), seen = {}, dryRow = {};
  log.forEach(function (e) { if (e.st === CM_ST.DRY) dryRow[e.id] = e; else seen[e.id] = 1; });
  var all = cmItems_(cmFetch_('')), items = all.filter(function (it) { return !seen[it.id]; });
  items.sort(function (a, b) { return String(a.t).localeCompare(String(b.t)); });
  if (max) items = items.slice(0, max);
  var x = items.map(function (it) { return { it: it, lead: cmLink_(it, idx) }; });
  try { cmStAtAttach_(x.filter(function (o) { return o.lead; })); } catch (eSt) { tgErr_('cmStAtAttach_', eSt); }   /* v170.22.2 */
  /* اجرای واقعی همان دسته‌بندی آزمایشیِ تأییدشده را به کار می‌برد */
  var need = [], cls = {};
  x.forEach(function (o, i) { var d = dryRow[o.it.id]; if (!dry && d) { try { if (d.data) cls[i] = JSON.parse(d.data); } catch (e) {} return; } need.push(i); });
  var got = cmClassify_(need.map(function (i) { return x[i]; }));
  need.forEach(function (i, j) { if (got[j]) cls[i] = got[j]; });
  var out = { byCat: {}, rows: [], manual: 0, nolead: 0, applied: 0 };
  x.forEach(function (o, i) {
    var it = o.it, l = o.lead, c = cls[i], e = { id: it.id, author: it.author, text: cmScrub_(it.text, l && l.name), t: it.t, row: dryRow[it.id] ? dryRow[it.id].row : 0 };
    if (!l) { e.st = dry ? CM_ST.DRY : CM_ST.NOLEAD; e.act = 'بی لید'; e.cat = c ? CM_CAT[c.cat] : ''; e.data = c ? JSON.stringify(c) : ''; out.nolead++; if (!dry) cmManual_(it, null, c); cmLogWrite_(e); out.rows.push(e); return; }
    e.code = l.code; e.from = tgStOf_(l.status) || l.status;
    if (!c || c.conf < CM_CONF) {
      e.cat = c ? CM_CAT[c.cat] : 'نامطمئن'; e.conf = c ? String(Math.round(c.conf * 100)) : ''; e.to = e.from; e.act = 'بررسی دستی'; e.st = dry ? CM_ST.DRY : CM_ST.MAN; e.data = c ? JSON.stringify(c) : '';
      out.manual++; out.byCat['بررسی دستی'] = (out.byCat['بررسی دستی'] || 0) + 1;
      if (!dry) cmManual_(it, l, c);
      cmLogWrite_(e); out.rows.push(e); return;
    }
    var p = cmPlanOne_(it, c, l);
    e.cat = CM_CAT[c.cat]; e.conf = String(Math.round(c.conf * 100)); e.to = p.to; e.act = p.act; e.data = JSON.stringify(c);
    out.byCat[e.cat] = (out.byCat[e.cat] || 0) + 1;
    if (dry) e.st = CM_ST.DRY;
    else { cmApplyOne_(it, c, l, p); e.st = CM_ST.DONE; out.applied++; if (p.ch['وضعیت']) l.status = p.ch['وضعیت']; if (p.ch['شمار بی‌پاسخ']) l.noans = p.ch['شمار بی‌پاسخ']; }
    cmLogWrite_(e); out.rows.push(e);
  });
  /* کامنت باز بیش از ۳ روز برای سلامت لید */
  try {
    var old = {}, lim = cmNow_().getTime() - 3 * 86400000;
    all.forEach(function (it) { if (it.id === it.parent && it.created && new Date(it.created).getTime() < lim) { var l = cmLink_(it, idx); if (l) old[l.code] = 1; } });
    stkProp_('CM_OPEN3', Object.keys(old).join(','));
  } catch (eO) {}
  return out;
}
function cmPlanText_(r) {
  var lines = Object.keys(r.byCat).map(function (k) { return '• ' + tgEsc_(k) + ': ' + tgFa_(r.byCat[k]); });
  var pri = r.rows.filter(function (e) { return e.code && /ارجاع مجدد/.test(String(e.to || '')); });   /* v170.21: اولویت از خود کامنت، نه فهرست ثابت */
  var rest = r.rows.filter(function (e) { return e.code && !/ارجاع مجدد/.test(String(e.to || '')); });
  var ln = function (e) { return '<code>' + tgEsc_(e.code) + '</code> ' + tgEsc_(e.from || '?') + ' ← ' + tgEsc_(e.to || '?') + ' · ' + tgEsc_(e.cat) + (e.act && e.act !== 'بررسی دستی' ? ' · ' + tgEsc_(String(e.act).slice(0, 80)) : ''); };
  return '💬 <b>کامنت‌های باز هاب پذیرش</b> · ' + tgFa_(r.rows.length) + ' کامنت\n' + (lines.join('\n') || 'هیچ') +
    '\n• بی لید (کارت بررسی دستی): ' + tgFa_(r.nolead) +
    (pri.length ? '\n\n<b>اولویت (ارجاع دوباره):</b>\n' + pri.map(ln).join('\n') : '') +
    (rest.length ? '\n\n<b>بقیه:</b>\n' + rest.slice(0, 40).map(ln).join('\n') + (rest.length > 40 ? '\n… و ' + tgFa_(rest.length - 40) + ' مورد دیگر در تب «' + CM_TAB + '»' : '') : '');
}

/* از tgTick5: هر ۱۵ دقیقه. پیش از «✅ اجرا» فقط یک بار طرح آزمایشی (اگر یک‌بارهٔ انتشار خواسته باشد) */
function cmTick5_() {
  var now = cmNow_().getTime(), last = Number(stkProp_('CM_AT') || 0);
  if (last && now - last < CM_MIN * 60000 - 30000) return 0;
  try { cmFixMaybe_(); } catch (eFx) { tgErr_('cmFixMaybe_', eFx); }   /* v170.21: اصلاح یک‌باره فقط با «اوکی» در تب پیش‌نمایش */
  if (!cmOn_()) {
    if (stkProp_('CM_PLAN_REQ') !== '1') return 0;
    stkProp_('CM_PLAN_REQ', null); stkProp_('CM_AT', String(now));
    return lmPlanSend_();
  }
  stkProp_('CM_AT', String(now));
  var lock = stkDry_() ? null : LockService.getScriptLock();
  if (lock && !lock.tryLock(1000)) return 0;
  try { return cmRun_(false, CM_MAX_RUN).applied; }
  catch (e) { tgErr_('cmTick5_', e); return 0; }
  finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}
/* دکمهٔ کارت ارجاع مجدد: پرسیدن روز و ساعت مناسب از مراجع با همان متن تأییدشدهٔ بات (T_SLOT_NONE) */
function cmCb_(chat, data) {
  var a = String(data).split(':'), code = a[2] || '';
  var ok = String(chat) === String(TG_OWNER_CHAT); try { ok = ok || !!tgWhoDesk_(chat, ''); } catch (e) {}
  if (!ok) return tgSend_(chat, 'این بخش برای پذیرش است.');
  if (a[1] !== 'ask') return;
  var l = (lmLeadIdx_().list.filter(function (x) { return x.code === code; }) || [])[0];
  if (!l || !l.chat) return tgSend_(chat, 'لید ' + tgEsc_(code) + ' در بات نیست؛ روز و ساعت را تلفنی بپرسید.');
  tgSetFlag_('await', l.chat, 21600);
  tgSend_(l.chat, T_SLOT_NONE);
  tgLeadEv_({ code: code, actor: 'بات', channel: 'کامنت', what: 'پرسش ترجیح زمان', to: 'فرستاده شد', type: l.type || '' });
  return tgSend_(chat, '✅ از مراجع ' + tgEsc_(code) + ' روز و ساعت مناسب پرسیده شد. جوابش در ستون «پیشنهاد کاربر» و کارت برای شما می‌آید.');
}

/* ---------------- تست خشک ---------------- */
function cmTests() {
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var OWN = String(TG_OWNER_CHAT);
  try {
    TG_MEM['stk:boss'] = { name: 'ژیلا', chat: '7101', role: 'مسئول پذیرش' };
    TG_MEM['stk:now'] = pbTehran_(2026, 10, 4, 10, 0).getTime();
    TG_MEM['cm:ther'] = ['شمیم آذرپاد', 'حدیثه حکیم زاده', 'درمانگر الف', 'درمانگر ب', 'درمانگر ج', 'درمانگر د'];
    TG_MEM['desk'] = [{ name: 'ژیلا', chat: '7101' }, { name: 'سارا', chat: '7102' }];
    var key = v168PoolKey_('تراپی فردی', 'سایر'), pool = {}, free = {};
    ['درمانگر الف', 'درمانگر ب', 'درمانگر ج', 'درمانگر د', 'شمیم آذرپاد'].forEach(function (n) { var r = { abroad: true, inperson: n !== 'درمانگر الف' }; r[key] = true; pool[tgNorm_(n)] = r; free[tgNorm_(n)] = true; });
    TG_MEM['v168ctx'] = { ther: ['درمانگر الف', 'درمانگر ب', 'درمانگر ج', 'درمانگر د', 'شمیم آذرپاد'].map(function (n, i) { return { name: n, active: true, sug: i, tier: 1 }; }), pool: pool, free: free };
    TG_MEM['cm:full'] = { kind: 'تراپی فردی', topic: 'سایر', region: 'داخل ایران', mode: 'آنلاین', ref1: 'شمیم آذرپاد' };
    TG_MEM['lm:leads'] = [
      { row: 2, code: 'L-1272', type: 'مراجع', chat: '9001', owner: 'بات — خودرزرو', status: 'در پیگیری', name: 'نام آزمایشی یک', phone: '09120000001', noans: 0, meetTher: 'شمیم آذرپاد', date: '2026-09-20', time: '10:00' },
      { row: 3, code: 'L-1300', type: 'مراجع', chat: '', owner: 'ژیلا', status: 'جدید', name: 'نام آزمایشی دو', phone: '09120000002', noans: 2, date: '2026-10-01', time: '9:00' },
      { row: 4, code: 'L-1301', type: 'مراجع', chat: '', owner: 'ژیلا', status: 'در پیگیری', name: 'نام آزمایشی سه', phone: '09120000003', noans: 0, date: '2026-10-01', time: '9:00' },
      { row: 5, code: 'L-1302', type: 'مراجع', chat: '', owner: 'ژیلا', status: 'در پیگیری', name: 'نام تکراری', phone: '0912', date: '2026-10-01', time: '9:00' },
      { row: 6, code: 'L-1303', type: 'مراجع', chat: '', owner: 'ژیلا', status: 'در پیگیری', name: 'نام تکراری', phone: '0913', date: '2026-10-01', time: '9:00' }];
    var C = function (id, text, quoted, author, extra) { var c = { id: id, content: text, author: { displayName: author || 'سارا' }, createdTime: '2026-09-25T08:00:00Z', quotedFileContent: { value: quoted || '' }, replies: [] }; for (var k in (extra || {})) c[k] = extra[k]; return c; };
    TG_MEM['cm:list'] = [
      C('c1', 'لغو کرد چون ساعت‌های درمانگر بهش نمی‌خورد', 'L-1272'),
      C('c2', 'جواب نداد، گوشی خاموش بود', 'نام آزمایشی دو'),
      C('c3', 'معارفه ۱۴ مهر ساعت ۱۸ با درمانگر ب', '09120000003'),
      C('c4', 'یه چیزی گفت', 'نام تکراری'),
      C('c5', 'حل شده', 'L-1300', 'سارا', { resolved: true }),
      C('c6', 'ترجیحاً درمانگر خانم و آنلاین، مسن‌تر', 'L-1301', 'سارا', { replies: [{ id: 'r1', content: CM_MARK + ' ثبت شد', author: { displayName: 'یاسر' } }, { id: 'r2', content: 'لطفاً سارا فردا تماس بگیرید', author: { displayName: 'ژیلا' } }] }),
      C('c7', 'به نظرم بهتره بیشتر صحبت کنیم', 'L-1300')
    ];
    TG_MEM['cm:ai'] = function (batch) { var o = {}; batch.forEach(function (b) { o[b.i] = { i: b.i, cat: 'other', conf: 0.5 }; }); return o; };

    /* آیتم‌ها و وصل */
    var items = cmItems_(TG_MEM['cm:list']);
    ok('کامنت resolve‌شده و پاسخ خود بات کنار می‌روند؛ پاسخ ژیلا آیتم جداست', !items.some(function (x) { return x.id === 'c5' || /r1$/.test(x.id); }) && items.some(function (x) { return x.id === 'c6:r2' && x.parent === 'c6'; }));
    var idx = lmLeadIdx_();
    ok('وصل با کد، نام و شماره؛ نام دوتایی وصل نمی‌شود', cmLink_(items[0], idx).code === 'L-1272' && cmLink_(items[1], idx).code === 'L-1300' && cmLink_(items[2], idx).code === 'L-1301' && cmLink_(items[3], idx) === null);
    /* قاعده‌ها */
    var r1 = cmRule_({ text: 'لغو کرد چون ساعت‌های درمانگر بهش نمی‌خورد' }), r2 = cmRule_({ text: 'حضوری نشد، کرج مکان نداریم؛ لغو' });
    ok('لغو با دلیل ساعت و حضوری', r1 && r1.cat === 'cancel' && r1.why === 'hours' && r2 && r2.why === 'inp');
    var r3 = cmRule_({ text: 'معارفه ۱۴ مهر ساعت ۱۸ با درمانگر ب' });
    ok('معارفه: تاریخ، ساعت و درمانگر بیرون کشیده می‌شود', r3 && r3.cat === 'set' && r3.iso === '2026-10-06' && r3.hh === '18:00' && r3.ther === 'درمانگر ب');
    ok('بی‌پاسخ، شروع درمان، روان‌پزشکی', cmRule_({ text: 'جواب نداد' }).cat === 'noans' && cmRule_({ text: 'درمان را شروع کرد با شمیم' }).cat === 'start' && cmRule_({ text: 'ارجاع به روانپزشک لازم است' }).cat === 'psy');
    /* v170.21: ساعت با ظهر و عصر و شب؛ «ساعت ۲» بی قید = ۱۴ */
    ok('v170.21: ساعت ۱ ظهر ← ۱۳:۰۰ (نه ۰۱:۰۰)', cmWhen_('معارفه ساعت ۱ ظهر').hh === '13:00' && cmWhen_('ساعت ۱۲ ظهر').hh === '12:00');
    ok('v170.21: عصر، بعدازظهر و شب', cmWhen_('ساعت ۵ عصر').hh === '17:00' && cmWhen_('ساعت ۴ بعد از ظهر').hh === '16:00' && cmWhen_('ساعت ۳ بعدازظهر').hh === '15:00' && cmWhen_('ساعت ۸ شب').hh === '20:00' && cmWhen_('۹:۳۰ شب').hh === '21:30');
    ok('v170.21: «ساعت ۲» بی قید ← ۱۴، «ساعت ۱۰ صبح» ← ۱۰، «۱۸:۳۰» همان', cmWhen_('ساعت ۲').hh === '14:00' && cmWhen_('ساعت ۱۰ صبح').hh === '10:00' && cmWhen_('ساعت ۱۰').hh === '10:00' && cmWhen_('۱۸:۳۰').hh === '18:30');
    ok('v170.21: فهرست ثابت اولویت با کد لید نیست', typeof CM_PRIORITY === 'undefined');
    var pOld = cmPlanOne_({ text: 'جواب نداد', t: '2026-09-28T09:00:00Z' }, { cat: 'noans', conf: 1 }, { status: 'جدید', owner: '', noans: 0 });
    ok('v170.21: تماس بعدی کامنت قدیمی از روز خود کامنت', pOld.ch['تاریخ اقدام بعدی'] === '2026-09-29');
    var r6 = cmRule_({ text: 'ترجیحاً درمانگر خانم و آنلاین، مسن‌تر' });
    ok('ترجیحات: حالت، جنسیت و سن', r6 && r6.cat === 'prefs' && r6.prefs.mode === 'آنلاین' && r6.prefs.gender === 'زن' && r6.prefs.age === 'بزرگ‌تر');
    ok('دستور ژیلا فقط از ژیلا', cmRule_({ text: 'لطفاً فردا تماس بگیرید', author: tgNm_('reception') }).cat === 'order' && cmRule_({ text: 'لطفاً فردا تماس بگیرید', author: 'سارا' }) === null);
    ok('دو دستهٔ ناسازگار ← نامطمئن (هوش مصنوعی)', cmRule_({ text: 'جواب نداد، بعد گفت لغو' }) === null);
    ok('متن پاک برای هوش مصنوعی: بی شماره، ایمیل، یوزرنیم و نام', (function (s) { return s.indexOf('0912') < 0 && s.indexOf('@') < 0 && s.indexOf('نام آزمایشی') < 0; })(cmScrub_('نام آزمایشی یک 0912 345 6789 a.b@c.com @user', 'نام آزمایشی یک')));

    /* آزمایشی: بی تغییر و بی پاسخ */
    var d = cmRun_(true);
    ok('آزمایشی: شمار بر اساس دسته؛ ارجاع مجدد در بخش اولویت متن طرح', /اولویت[^]*L-1272/.test(cmPlanText_(d)) && d.byCat[CM_CAT.cancel] === 1 && d.byCat[CM_CAT.noans] === 1 && d.byCat[CM_CAT.set] === 1 && d.byCat[CM_CAT.prefs] === 1 && d.nolead === 1);
    ok('آزمایشی: هیچ تغییر لید، پاسخ یا کارتی', !TG_OUTBOX.some(function (o) { return o.kind === 'leadset' || o.kind === 'msg'; }) && !(TG_MEM['cm:replies'] || []).length);
    ok('آزمایشی: وضعیت فعلی و پیشنهادی در دفتر', cmLog_().some(function (e) { return e.code === 'L-1272' && e.from === 'در پیگیری' && e.to === 'نیاز به ارجاع مجدد' && e.st === CM_ST.DRY; }));
    var pt = cmPlanText_(d);
    ok('متن طرح: دسته‌ها، اولویت و بی نام مراجع', /اولویت/.test(pt) && /L-1272/.test(pt) && pt.indexOf('نام آزمایشی') < 0);

    /* پیش از «اجرا»: تیک فقط یک بار طرح می‌فرستد */
    TG_OUTBOX = [];
    ok('پیش از «اجرا» و بی درخواست طرح، تیک کاری نمی‌کند', cmTick5_() === 0 && !TG_OUTBOX.length);
    TG_MEM['stkp:CM_PLAN_REQ'] = '1'; TG_MEM['stkp:CM_AT'] = '';
    cmTick5_();
    var pm = TG_OUTBOX.filter(function (o) { return o.chat === OWN && o.markup && JSON.stringify(o.markup).indexOf('lm:go') > -1; });
    ok('طرح آزمایشی یک‌جا (لید + کامنت) با یک دکمهٔ «✅ اجرا»', pm.length === 1 && TG_OUTBOX.some(function (o) { return o.chat === OWN && /کامنت‌های باز هاب پذیرش/.test(o.text || ''); }) && !TG_MEM['stkp:CM_PLAN_REQ']);

    /* اجرا */
    TG_MEM['stkp:LM_ON'] = '1'; TG_MEM['stkp:CM_AT'] = ''; TG_OUTBOX = [];
    TG_MEM['cm:ai'] = function () { throw new Error('در اجرا نباید دوباره دسته‌بندی شود'); };
    try { cmRun_(false, CM_MAX_RUN); } catch (eR) { log.push('✗ اجرا: ' + eR + ' ' + String(eR.stack).slice(0, 300)); fail++; }
    var sets = TG_OUTBOX.filter(function (o) { return o.kind === 'leadset'; });
    var s1 = sets.filter(function (o) { return o.code === 'L-1272'; })[0];
    ok('ارجاع مجدد: وضعیت پیگیری، نتیجهٔ «نیاز به ارجاع مجدد: ساعت نخورد»، مسئول ژیلا، موعد فردای روز کامنت (v170.21)', s1 && s1.changes['وضعیت'] === TG_ST.FOLLOW && s1.changes['نتیجه'] === 'نیاز به ارجاع مجدد: ساعت نخورد' && s1.changes['مسئول'] === tgNm_('reception') && s1.changes['تاریخ اقدام بعدی'] === '2026-09-26');
    ok('سه درمانگر تازه، بی درمانگر قبلی و فقط با وقت خالی', s1 && s1.changes['درمانگر پیشنهادی ۱'] && s1.changes['درمانگر پیشنهادی ۳'] && JSON.stringify(s1.changes).indexOf('شمیم') < 0);
    ok('کارت ارجاع مجدد برای ژیلا', TG_OUTBOX.some(function (o) { return o.chat === '7101' && /ارجاع مجدد/.test(o.text || '') && /L-1272/.test(o.text); }));
    var rp = TG_MEM['cm:replies'] || [];
    ok('پاسخ کوتاه زیر کامنت، بی resolve', rp.some(function (x) { return x.id === 'c1' && x.text.indexOf('ثبت شد: نیاز به ارجاع مجدد (ساعت نخورد)، مسئول ' + tgNm_('reception') + '، موعد ' + tgLeadJ_('2026-09-26')) > -1 && x.text.indexOf(CM_MARK) === 0; }));
    var s2 = sets.filter(function (o) { return o.code === 'L-1300'; })[0];
    ok('بی‌پاسخ: شمارنده ۳ و کارت به ژیلا، لید بسته نمی‌شود', s2 && s2.changes['شمار بی‌پاسخ'] === 3 && s2.changes['وضعیت'] === TG_ST.NOANS && TG_OUTBOX.some(function (o) { return o.chat === '7101' && /۳ تلاش بی‌پاسخ/.test(o.text || ''); }));
    var s3 = sets.filter(function (o) { return o.code === 'L-1301' && o.changes['تاریخ معارفه']; })[0];
    ok('معارفه تعیین شد: ستون‌های معارفه و پیگیری روز بعد', s3 && s3.changes['معارفه هماهنگ شد؟'] === 'بله' && s3.changes['درمانگر معارفه'] === 'درمانگر ب' && s3.changes['تاریخ اقدام بعدی'] === '2026-10-07');
    ok('ترجیحات در ستون‌های لید', sets.some(function (o) { return o.code === 'L-1301' && o.changes['ترجیح جنسیت'] === 'زن' && o.changes['حالت جلسه'] === 'آنلاین'; }));
    ok('رویداد با کانال «کامنت»، نویسنده و متن', TG_OUTBOX.some(function (o) { return o.kind === 'leadev' && o.o.channel === 'کامنت' && o.o.actor === 'سارا' && /نمی‌خورد/.test(o.o.note); }));
    ok('نامطمئن ← فقط کارت بررسی دستی، بی تغییر و بی پاسخ', TG_OUTBOX.some(function (o) { return o.chat === '7101' && /بررسی دستی کامنت/.test(o.text || ''); }) && !sets.some(function (o) { return o.code === 'L-1300' && !o.changes['شمار بی‌پاسخ']; }) && !rp.some(function (x) { return x.id === 'c7'; }));
    ok('بی لید ← کارت بررسی دستی', TG_OUTBOX.some(function (o) { return o.chat === '7101' && /بی لید/.test(o.text || ''); }));
    ok('نام مراجع در هیچ کارتی نیست', !TG_OUTBOX.some(function (o) { return o.kind === 'msg' && /نام آزمایشی|نام تکراری/.test(o.text || ''); }));
    var n1 = sets.length; TG_OUTBOX = []; TG_MEM['stk:now'] += 20 * 60000;
    cmTick5_();
    ok('کامنت اعمال‌شده دوباره اعمال نمی‌شود', !TG_OUTBOX.some(function (o) { return o.kind === 'leadset'; }) && n1 > 0);
    TG_OUTBOX = []; TG_MEM['stk:now'] += 5 * 60000;
    ok('فاصلهٔ ۱۵ دقیقه رعایت می‌شود', cmTick5_() === 0);

    /* سلامت لید */
    TG_MEM['stk:rows'] = []; TG_MEM['stkp:STK_SEND_OK'] = '';
    TG_MEM['lm:leads'] = [
      { row: 2, code: 'L-2001', owner: 'ژیلا', status: 'جدید', name: 'x', date: '2026-09-30', time: '9:00', next: 'تماس اول', nextDate: '2026-10-01' },
      { row: 3, code: 'L-2002', owner: 'ژیلا', status: 'بسته', name: 'x', next: 'تماس دوباره', nextDate: '2026-10-05' },
      { row: 4, code: 'L-2003', owner: 'ژیلا', status: 'معارفه رزرو شد', name: 'x', next: 'پیگیری', nextDate: '2026-10-09', meetDate: '2026-10-01', result: '' },
      { row: 5, code: 'L-2004', owner: 'ژیلا', status: 'در پیگیری', name: 'x', next: '', nextDate: '' }];
    TG_MEM['stkp:CM_OPEN3'] = 'L-2004';
    lmHealth_();
    var keys = stkRows_().map(function (r) { return r.key; }).join(',');
    ok('سلامت: موعد گذشته، بسته با اقدام باز، جدید ۴۸ ساعت، معارفهٔ بی نتیجه، کامنت ۳ روزه، بی اقدام',
      /lead_nonext:L-2001/.test(keys) && /lead_closednext:L-2002/.test(keys) && /lead_new48:L-2001/.test(keys) && /lead_meetstale:L-2003/.test(keys) && /lead_comment3:L-2004/.test(keys) && /lead_nonext:L-2004/.test(keys));
    ok('سلامت: کارت‌ها تا تأیید یاسر نگه‌داشته', stkRows_().every(function (r) { return r.card === STK_HELD; }));
    /* v170.21 و v170.22.2: اصلاح یک‌باره؛ پیش‌نمایش بی تغییر، اعمال فقط با «اوکی». ساعت آزمون: ۱۳ مهر ۱۰:۲۵ (۲۰۲۶-۱۰-۰۴) */
    var T = function (iso) { return new Date(iso + ':00+03:30'); };
    TG_MEM['lm:leads'] = [{ row: 2, code: 'L-1272', status: 'در پیگیری' }, { row: 3, code: 'L-1300', status: 'پاسخ نداد' },
      { row: 4, code: 'L-3001', status: 'پاسخ نداد' }, { row: 5, code: 'L-3002', status: 'در پیگیری' }, { row: 6, code: 'L-3003', status: 'در پیگیری' }];
    TG_MEM['cm:fixlead'] = { 'L-1272': { status: 'در پیگیری', next: 'ارجاع مجدد', nextDate: '2026-10-05', noans: 0 }, 'L-1300': { status: 'پاسخ نداد', next: 'تماس دیگر', nextDate: '2026-10-05' },
      'L-3001': { status: 'پاسخ نداد', next: 'تماس دوباره', nextDate: '2026-10-05', noans: 1 }, 'L-3002': { status: 'در پیگیری', next: 'تماس دوباره', nextDate: '2026-10-05', noans: 1 },
      'L-3003': { status: 'در پیگیری', next: 'تماس اول', nextDate: '2026-10-07', noans: 0 } };
    /* L-3001: کامنت ۲۸ شهریور، معارفه از بات ۳۰ شهریور، اجرای کامنت ۱۲ مهر وضعیت را برگرداند (آسیب‌دیده)
       L-3002: همان، ولی ۱۳ مهر کسی دستی وضعیت را عوض کرد (دست نمی‌خورد) */
    TG_MEM['cm:log'] = TG_MEM['cm:log'].concat([
      { id: 'f1', code: 'L-3001', cat: CM_CAT.noans, st: CM_ST.DONE, t: '2026-09-19T08:00:00Z' },
      { id: 'f2', code: 'L-3002', cat: CM_CAT.noans, st: CM_ST.DONE, t: '2026-09-19T08:00:00Z' }]);
    TG_MEM['cm:ev'] = [
      { t: T('2026-09-21T10:00'), code: 'L-3001', actor: 'بات', ch: 'تلگرام', what: 'وضعیت', from: 'جدید', to: 'معارفه رزرو شد' },
      { t: T('2026-10-03T22:00'), code: 'L-3001', actor: 'کامنت', ch: 'کامنت', what: 'وضعیت', from: 'معارفه رزرو شد', to: 'پاسخ نداد' },
      { t: T('2026-10-03T22:00'), code: 'L-3001', actor: 'کامنت', ch: 'کامنت', what: 'اقدام بعدی', from: 'پیگیری بعد از معارفه', to: 'تماس دوباره' },
      { t: T('2026-10-03T22:00'), code: 'L-3001', actor: 'کامنت', ch: 'کامنت', what: 'تاریخ اقدام بعدی', from: '2026-09-22', to: '2026-10-05' },
      { t: T('2026-10-03T22:00'), code: 'L-3001', actor: 'کامنت', ch: 'کامنت', what: 'شمار بی‌پاسخ', from: '', to: '1' },
      { t: T('2026-09-21T10:00'), code: 'L-3002', actor: 'شیت', ch: 'شیت', what: 'وضعیت', from: 'جدید', to: 'بسته' },
      { t: T('2026-10-03T22:00'), code: 'L-3002', actor: 'کامنت', ch: 'کامنت', what: 'وضعیت', from: 'بسته', to: 'پاسخ نداد' },
      { t: T('2026-10-04T09:00'), code: 'L-3002', actor: 'پذیرش', ch: 'شیت', what: 'وضعیت', from: 'پاسخ نداد', to: 'در پیگیری' }];
    TG_MEM['cm:noansv'] = [0, new Date(1899, 11, 31), 2, new Date(1899, 11, 30)];
    TG_OUTBOX = [];
    var pv = cmFixPreview_({ 'L-3003': 'later:21', 'L-1300': 'badnum' }), fx = TG_MEM['cm:fixtab'] || [];
    var rv = fx.filter(function (r) { return r.code === 'L-3001'; })[0] || {};
    ok('v170.22.2: لید آسیب‌دیده به وضعیت پیش از اجرا برمی‌گردد، با اقدام و شمار درست', rv.kind === CM_FIX_KIND.rev && rv.state === CM_FIX_STATE.apply && rv.wantSt === 'معارفه رزرو شد' && rv.wantNext === 'پیگیری بعد از معارفه' && String(rv.noans) === '0', JSON.stringify(rv));
    ok('v170.22.2: تاریخ اقدام بعدی هیچ‌وقت در گذشته نیست (کمینه امروز)', rv.wantDate === '2026-10-04' && fx.every(function (r) { return !r.wantDate || r.wantDate >= '2026-10-04'; }), JSON.stringify(fx.map(function (r) { return r.code + ':' + r.wantDate; })));
    var r2 = fx.filter(function (r) { return r.code === 'L-3002'; })[0] || {};
    ok('v170.22.2: بعد از اجرا دستی عوض شده ← دست نمی‌خورد', r2.kind === CM_FIX_KIND.rev && r2.state === CM_FIX_STATE.later && r2.wantSt === 'بسته', JSON.stringify(r2));
    var h1 = fx.filter(function (r) { return r.kind === CM_FIX_KIND.hint; });
    ok('v170.22.2: پیشنهادها در پیش‌نمایش، با اوکی اعمال نمی‌شوند', h1.length === 2 && h1.every(function (r) { return r.state === CM_FIX_STATE.hint; }) &&
      h1.filter(function (r) { return r.code === 'L-1300'; })[0].wantSt === TG_ST.CLOSED && h1.filter(function (r) { return r.code === 'L-3003'; })[0].wantDate === '2026-10-25', JSON.stringify(h1));
    var d1 = fx.filter(function (r) { return r.kind === CM_FIX_KIND.date; });
    ok('v170.21: تاریخ از روز کامنت فقط برای لیدی که هنوز همان اقدام را دارد (کمینه امروز)', d1.length === 1 && d1[0].code === 'L-1272' && d1[0].wantDate === '2026-10-04', JSON.stringify(d1));
    ok('v170.22.2: «شمار بی‌پاسخ» خراب شمرده می‌شود', /خراب: 2/.test(TG_MEM['cm:fixsum'] || ''), TG_MEM['cm:fixsum']);
    ok('v170.22.2: پیش‌نمایش چیزی عوض نمی‌کند و بی «اوکی» اعمال نمی‌شود', !TG_OUTBOX.some(function (o) { return o.kind === 'leadset'; }) && cmFixMaybe_() === 0 && !TG_OUTBOX.some(function (o) { return o.kind === 'leadset'; }));
    TG_MEM['cm:fixok'] = 'اوکی';
    var nAp = cmFixMaybe_(), sets2 = TG_OUTBOX.filter(function (o) { return o.kind === 'leadset'; });
    ok('v170.22.2: با «اوکی» فقط برگشت و تاریخ اعمال، یک بار، با کی=اصلاح ۱۷۰٫۲۱', nAp === 2 && sets2.length === 2 && sets2.every(function (o) { return o.actor === CM_FIX_ACTOR; }) &&
      sets2.some(function (o) { return o.code === 'L-3001' && o.changes['وضعیت'] === 'معارفه رزرو شد' && o.changes['تاریخ اقدام بعدی'] === '2026-10-04'; }) &&
      !sets2.some(function (o) { return o.code === 'L-3002' || o.code === 'L-1300' || o.code === 'L-3003'; }) && cmFixMaybe_() === 0, JSON.stringify(sets2));
    ok('v170.22.2: «شمار بی‌پاسخ» خراب صفر شد', JSON.stringify(TG_MEM['cm:noansv']) === '[0,0,2,0]');
    /* قاعدهٔ دائمی: کامنت قدیمی‌تر از آخرین وضعیت غیرکامنتی، وضعیت و اقدام را عوض نمی‌کند */
    var lSt = { row: 4, code: 'L-3001', status: 'معارفه رزرو شد', stAt: T('2026-09-21T10:00').getTime() };
    var pSt = cmPlanOne_({ text: 'جواب نداد', t: '2026-09-19T08:00:00Z' }, { cat: 'noans', conf: 1 }, lSt);
    ok('v170.22.2: قاعدهٔ دائمی: کامنت قدیمی وضعیت و اقدام را عوض نمی‌کند', pSt.stale === true && !Object.keys(pSt.ch).length && pSt.to === 'معارفه رزرو شد', JSON.stringify(pSt.ch));
    var pNew = cmPlanOne_({ text: 'جواب نداد', t: '2026-09-22T08:00:00Z' }, { cat: 'noans', conf: 1 }, lSt);
    ok('v170.22.2: کامنت تازه‌تر از وضعیت همان رفتار قبلی را دارد', !pNew.stale && pNew.ch['وضعیت'] === TG_ST.NOANS);
    ok('v170.22.2: آخرین وضعیت غیرکامنتی از رویدادها', cmLastStAt_(cmEvIdx_()['L-3002']) === T('2026-10-04T09:00').getTime() && cmLastStAt_(cmEvIdx_()['L-3001']) === T('2026-09-21T10:00').getTime());
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 400) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ کامنت‌ها درست است'));
  return tgTestTally_(log, fail);
}

/* ============================================================================
   v170.21 · اصلاح یک‌بارهٔ «تماس بعدی» کامنت‌های قدیمی
   پیش از این «تاریخ اقدام بعدی» کامنت بی‌پاسخ، لغو و روان‌پزشکی از روز اجرا حساب می‌شد، نه روز کامنت (برای ده‌ها لید «۱۳ مهر»).
   v170.22.2 (۱۴ مهر، تصمیم یاسر): این پیش‌نمایش ناقص بود. در اجرای ۱۲ مهر کامنت‌خوان کامنت‌های قدیمی را روی لیدهایی هم اعمال کرد
   که بعد از آن کامنت وضعیت تازه‌تری از شیت یا بات گرفته بودند؛ وضعیتشان از «معارفه رزرو شد / بسته / شروع درمان» به
   «پاسخ نداد / در پیگیری» برگشت. حالا پیش‌نمایش سه بخش دارد:
   - «برگشت وضعیت»: لیدی که کامنتی قدیمی‌تر از آخرین وضعیت غیرکامنتی‌اش وضعیتش را عوض کرده (از «رویدادهای لید»).
     وضعیت، اقدام بعدی، تاریخ و شمار بی‌پاسخ به مقدار پیش از همان اجرا برمی‌گردد. اگر بعد از آن اجرا کسی دستی وضعیت را عوض
     کرده، دست نمی‌خورد.
   - «تاریخ از روز کامنت»: همان اصلاح v170.21.
   - «پیشنهاد»: از کلید اختیاری CM_FIX_HINTS در «تنظیمات خصوصی بات» (کد لید در مخزن عمومی نمی‌آید). با «اوکی» اعمال نمی‌شود.
   تاریخ اقدام بعدی هیچ‌وقت در گذشته نیست (کمینه امروز). ستون «شمار بی‌پاسخ»: خانه‌هایی که صفر را تاریخ ۱۸۹۹ نشان می‌دهند.
   اعمال فقط وقتی کسی در خانهٔ B1 همان تب «اوکی» بنویسد؛ هر تغییر با کی=«اصلاح ۱۷۰٫۲۱» در «رویدادهای لید».
   ============================================================================ */
var CM_FIX_TAB = 'اصلاح کامنت‌ها · پیش‌نمایش';
var CM_FIX_HEAD = ['کد لید', 'نوع', 'وضعیت فعلی', 'وضعیت درست', 'اقدام فعلی', 'اقدام درست', 'تاریخ فعلی', 'تاریخ درست', 'زمان کامنت', 'آخرین وضعیت غیرکامنتی', 'حالت'];
var CM_FIX_ACTOR = 'اصلاح ۱۷۰٫۲۱';
var CM_FIX_KIND = { rev: 'برگشت وضعیت', date: 'تاریخ از روز کامنت', hint: 'پیشنهاد' };
var CM_FIX_STATE = { apply: 'با اوکی اعمال می‌شود', hint: 'پیشنهاد؛ با اوکی اعمال نمی‌شود', later: 'بعداً دستی عوض شده؛ دست نمی‌خورد' };
var CM_FIX_FIELDS = ['وضعیت', 'اقدام بعدی', 'تاریخ اقدام بعدی', 'شمار بی‌پاسخ'];
cfg_('CM_FIX_HINTS', {});   /* ثبت در بارگذاری تا cfgSync_ مقدار تب را بپذیرد */

function cmFixToday_() { return cmDay_(0); }
/* تاریخ هر شکلی (Date، yyyy-MM-dd، متن تاریخ شیت) ← yyyy-MM-dd یا '' */
function cmFixIso_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, TG_TZ, 'yyyy-MM-dd');
  var t = String(v == null ? '' : v).trim(); if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  var d = new Date(t); return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd');
}
function cmFixFloor_(iso) { var t = cmFixToday_(); return !iso || iso < t ? t : iso; }   /* هیچ‌وقت در گذشته */
function cmFixIsCm_(e) { return e.ch === 'کامنت' || e.actor === 'کامنت'; }

/* «رویدادهای لید» ← {کد: [{t, actor, ch, what, from, to}]} فقط چهار ستون وضعیت و اقدام، به ترتیب زمان */
function cmEvIdx_() {
  var out = {}, rows;
  if (stkDry_()) rows = TG_MEM['cm:ev'] || [];
  else {
    var sh = tgSS_().getSheetByName(TG_LEAD_EV_TAB), n = sh ? sh.getLastRow() : 0;
    rows = n < 2 ? [] : sh.getRange(2, 1, n - 1, 8).getValues().map(function (v) { return { t: v[0], code: String(v[1]).trim(), actor: String(v[3]).trim(), ch: String(v[4]).trim(), what: String(v[5]).trim(), from: v[6], to: v[7] }; });
  }
  rows.forEach(function (e) {
    if (!e.code || CM_FIX_FIELDS.indexOf(e.what) < 0) return;
    var t = e.t instanceof Date ? e.t.getTime() : new Date(e.t).getTime(); if (isNaN(t)) return;
    (out[e.code] = out[e.code] || []).push({ t: t, actor: e.actor, ch: e.ch, what: e.what, from: String(e.from == null ? '' : e.from), to: String(e.to == null ? '' : e.to) });
  });
  Object.keys(out).forEach(function (k) { out[k].sort(function (a, b) { return a.t - b.t; }); });
  return out;
}
/* زمان آخرین تغییر وضعیتی که از کامنت نیامده (پیش از لحظهٔ before، یا آخرین) */
function cmLastStAt_(evs, before) {
  var at = 0;
  (evs || []).forEach(function (e) { if (e.what === 'وضعیت' && !cmFixIsCm_(e) && (!before || e.t < before) && e.t > at) at = e.t; });
  return at;
}
/* قاعدهٔ دائمی v170.22.2: کامنتی که از آخرین وضعیت غیرکامنتی لید قدیمی‌تر است، وضعیت یا اقدام بعدی را عوض نمی‌کند */
function cmIsStale_(it, l) {
  var t = it && (it.t || it.created) ? new Date(it.t || it.created).getTime() : NaN;
  return !!(l && l.stAt && !isNaN(t) && t < l.stAt);
}

/* لیدهای آسیب‌دیده: هر گروه رویداد کامنتی (۳۰ دقیقه) که وضعیت را عوض کرده و کامنتش قدیمی‌تر از وضعیت غیرکامنتی پیش از آن بوده */
function cmFixRevRows_(ev, log, byCode, readLead) {
  var out = [], win = 30 * 60000;
  var cmt = {};   /* کد ← زمان کامنت‌های اعمال‌شده */
  log.forEach(function (e) { if (e.st === CM_ST.DONE && e.code && e.t) { var x = new Date(e.t).getTime(); if (!isNaN(x)) (cmt[e.code] = cmt[e.code] || []).push(x); } });
  Object.keys(ev).sort().forEach(function (code) {
    var evs = ev[code], l = byCode[code]; if (!l) return;
    var cs = evs.filter(function (e) { return cmFixIsCm_(e) && e.what === 'وضعیت'; });
    for (var i = 0; i < cs.length; i++) {
      var E = cs[i], prev = cmLastStAt_(evs, E.t);
      var tc = (cmt[code] || []).filter(function (x) { return x <= E.t; }).sort(function (a, b) { return b - a; })[0];
      if (!prev || !tc || tc >= prev) continue;
      /* همهٔ رویدادهای کامنتی همان اجرا (۳۰ دقیقه از نخستین) */
      var g = evs.filter(function (e) { return cmFixIsCm_(e) && Math.abs(e.t - E.t) <= win; });
      var first = function (w) { var x = g.filter(function (e) { return e.what === w; })[0]; return x ? x.from : undefined; };
      var lastTo = g.filter(function (e) { return e.what === 'وضعیت'; }).slice(-1)[0].to;
      var later = evs.some(function (e) { return e.what === 'وضعیت' && !cmFixIsCm_(e) && e.t > E.t + win; });
      var cur = readLead(l) || {};
      var curSt = tgStOf_(cur.status) || cur.status || '';
      var wantSt = first('وضعیت');
      var closed = tgStClosed_(wantSt);
      var wantNext = first('اقدام بعدی'); if (wantNext === undefined) wantNext = cur.next || '';
      var wantDate = first('تاریخ اقدام بعدی'); wantDate = wantDate === undefined ? cmFixIso_(cur.nextDate) : cmFixIso_(wantDate);
      if (closed) { wantNext = ''; wantDate = ''; } else wantDate = cmFixFloor_(wantDate);
      var wantNo = first('شمار بی‌پاسخ'); wantNo = wantNo === undefined ? String(cur.noans || 0) : (Number(tgLatinDigits_(wantNo)) || 0);
      var st = later || (tgStOf_(lastTo) || lastTo) !== curSt ? CM_FIX_STATE.later : CM_FIX_STATE.apply;
      out.push({ kind: CM_FIX_KIND.rev, code: code, row: l.row, curSt: curSt, wantSt: wantSt, curNext: cur.next || '', wantNext: wantNext, curDate: cmFixIso_(cur.nextDate), wantDate: wantDate, noans: wantNo,
        t: Utilities.formatDate(new Date(tc), TG_TZ, 'yyyy-MM-dd HH:mm'), prev: Utilities.formatDate(new Date(prev), TG_TZ, 'yyyy-MM-dd HH:mm'), state: st });
      break;   /* هر لید یک ردیف: نخستین اجرای آسیب‌زا */
    }
  });
  return out;
}
/* همان اصلاح v170.21 (تاریخ از روز کامنت)، با کمینهٔ امروز */
function cmFixDateRows_(log, byCode, readLead, skip) {
  var last = {}, out = [];
  log.filter(function (e) { return e.st === CM_ST.DONE && e.code && e.t; }).forEach(function (e) { if (!last[e.code] || String(e.t) > String(last[e.code].t)) last[e.code] = e; });
  Object.keys(last).sort().forEach(function (code) {
    if (skip[code]) return;
    var e = last[code], act = null;
    if (e.cat === CM_CAT.noans) act = 'تماس دوباره'; else if (e.cat === CM_CAT.cancel) act = 'ارجاع مجدد'; else if (e.cat === CM_CAT.psy) act = 'هماهنگی روان‌پزشکی';
    var l = byCode[code]; if (!act || !l) return;
    var full = readLead(l) || {};
    if (String(full.next || '').trim() !== act) return;   /* بعدش دستی عوض شده؛ دست نمی‌زنیم */
    var n = act === 'تماس دوباره' && Number(full.noans || 0) >= CM_NOANS_MAX ? 3 : 1;
    var want = cmFixFloor_(cmDay_(n, cmItDay_({ t: e.t }))), cur = cmFixIso_(full.nextDate);
    if (!want || cur === want) return;
    var st = tgStOf_(full.status) || full.status || '';
    out.push({ kind: CM_FIX_KIND.date, code: code, row: l.row, curSt: st, wantSt: st, curNext: act, wantNext: act, curDate: cur, wantDate: want, t: String(e.t).slice(0, 16), prev: '', state: CM_FIX_STATE.apply });
  });
  return out;
}
/* پیشنهادها از CM_FIX_HINTS: {"کد": "badnum" | "notclient" | "later:21" | "self:7"} */
var CM_FIX_HINT = {
  badnum: { st: TG_ST.CLOSED, next: '', reason: 'شمارهٔ نامعتبر', why: 'شماره نامعتبر؛ تماس دوباره نه' },
  notclient: { st: TG_ST.CLOSED, next: '', reason: 'درمان نمی‌خواهد؛ ارجاع به جذب درمانگر', why: 'فرم همکاری بوده؛ ارجاع به جذب درمانگر' },
  later: { st: TG_ST.FOLLOW, next: 'پیگیری شروع درمان', why: 'شروع بعداً؛ پیگیری، نه ارجاع مجدد' },
  self: { st: TG_ST.FOLLOW, next: 'پیگیری (خودش تماس می‌گیرد)', why: 'خودش تماس می‌گیرد' }
};
function cmFixHintRows_(hints, byCode, readLead) {
  var out = [];
  Object.keys(hints || {}).sort().forEach(function (code) {
    var m = String(hints[code] || '').match(/^(badnum|notclient|later|self)(?::(\d{1,3}))?$/), l = byCode[code];
    if (!m || !l) return;
    var h = CM_FIX_HINT[m[1]], cur = readLead(l) || {}, days = Number(m[2] || (m[1] === 'self' ? 7 : 21));
    var wantDate = h.st === TG_ST.CLOSED ? '' : cmFixFloor_(cmDay_(days));
    out.push({ kind: CM_FIX_KIND.hint, code: code, row: l.row, curSt: tgStOf_(cur.status) || cur.status || '', wantSt: h.st, curNext: cur.next || '', wantNext: h.next + (h.reason ? '' : ' (+' + tgFa_(days) + ' روز)'),
      curDate: cmFixIso_(cur.nextDate), wantDate: wantDate, reason: h.reason || '', t: '', prev: h.why + (h.reason ? ' · دلیل بستن: ' + h.reason : ''), state: CM_FIX_STATE.hint });
  });
  return out;
}
/* «شمار بی‌پاسخ»: خانه‌هایی که تاریخ‌اند (صفر با قالب تاریخ، ۱۸۹۹) */
function cmFixNoansBroken_() {
  if (stkDry_()) return (TG_MEM['cm:noansv'] || []).filter(function (v) { return v instanceof Date; }).length;
  var sh = tgSS_().getSheetByName(TG_LEADS), col = tgLeadCol_('شمار بی‌پاسخ'), n = sh.getLastRow();
  if (!col || n < 2) return 0;
  return sh.getRange(2, col, n - 1, 1).getValues().filter(function (r) { return r[0] instanceof Date; }).length;
}
function cmFixNoansRepair_() {
  if (stkDry_()) { var v = TG_MEM['cm:noansv'] || [], k = 0; TG_MEM['cm:noansv'] = v.map(function (x) { if (x instanceof Date) { k++; return 0; } return x; }); return k; }
  var sh = tgSS_().getSheetByName(TG_LEADS), col = tgLeadCol_('شمار بی‌پاسخ'), n = sh.getLastRow();
  if (!col) return 0;
  var rg = sh.getRange(2, col, Math.max(1, sh.getMaxRows() - 1), 1);
  rg.setNumberFormat('0');
  if (n < 2) return 0;
  var r2 = sh.getRange(2, col, n - 1, 1), v = r2.getValues(), fixed = 0;
  v.forEach(function (r) { if (r[0] instanceof Date) { r[0] = 0; fixed++; } });
  if (fixed) r2.setValues(v);
  return fixed;
}
/* همهٔ ردیف‌های پیش‌نمایش؛ hints برای آزمون (پیش‌فرض از تنظیمات خصوصی) */
function cmFixRows2_(hints) {
  var idx = lmLeadIdx_(), byCode = {};
  idx.list.forEach(function (l) { if (l.code) byCode[l.code] = l; });
  var readLead = function (l) { return stkDry_() ? (TG_MEM['cm:fixlead'] || {})[l.code] || { status: l.status } : (tgLeadRead_(l.row) || {}); };
  var log = cmLog_(), rev = cmFixRevRows_(cmEvIdx_(), log, byCode, readLead), skip = {};
  rev.forEach(function (r) { skip[r.code] = 1; });
  var h = hints === undefined ? (function () { var x = cfg_('CM_FIX_HINTS', {}); return x && typeof x === 'object' ? x : {}; })() : hints;
  return rev.concat(cmFixDateRows_(log, byCode, readLead, skip), cmFixHintRows_(h, byCode, readLead));
}
/* در cmRun_: زمان آخرین وضعیت غیرکامنتی هر لید برای قاعدهٔ دائمی */
function cmStAtAttach_(x) {
  if (!x.length) return;
  var ev = cmEvIdx_();
  x.forEach(function (o) { if (o.lead) o.lead.stAt = cmLastStAt_(ev[o.lead.code]); });
}

function tgV17021CmFixPreview() { return cmFixPreview_(); }
function tgV170222CmFix() { return cmFixPreview_(); }   /* یک‌بارهٔ v170.22.2: پیش‌نمایش تازه (اعمال نه) */
function cmFixPreview_(hints) {
  var rows = cmFixRows2_(hints), broken = cmFixNoansBroken_();
  var cnt = function (k, s) { return rows.filter(function (r) { return r.kind === k && (!s || r.state === s); }).length; };
  var sum = 'برگشت وضعیت: ' + cnt(CM_FIX_KIND.rev, CM_FIX_STATE.apply) + ' (دست‌نخورده: ' + cnt(CM_FIX_KIND.rev, CM_FIX_STATE.later) + ') · تاریخ از روز کامنت: ' + cnt(CM_FIX_KIND.date) +
    ' · پیشنهاد: ' + cnt(CM_FIX_KIND.hint) + ' · «شمار بی‌پاسخ» خراب: ' + broken;
  if (stkDry_()) { TG_MEM['cm:fixtab'] = rows; TG_MEM['cm:fixsum'] = sum; return 'پیش‌نمایش اصلاح کامنت‌ها: ' + sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(CM_FIX_TAB);
  if (!sh) { sh = ss.insertSheet(CM_FIX_TAB); sh.setRightToLeft(true); }
  var ok0 = String(sh.getRange(1, 2).getValue() || '').trim();
  if (/^اعمال شد/.test(ok0)) return 'پیش‌نمایش: پیش از این اعمال شده؛ دوباره ساخته نشد';
  sh.clear();
  sh.getRange(1, 1, 1, 3).setValues([['اعمال؟ برای اعمال در B1 بنویسید: اوکی', '', 'v170.22.2 · ' + stkStamp_() + ' · ' + sum]]).setFontWeight('bold');
  sh.getRange(2, 1, 1, CM_FIX_HEAD.length).setValues([CM_FIX_HEAD]).setFontWeight('bold').setBackground('#f5f5f8');
  if (rows.length) sh.getRange(3, 1, rows.length, CM_FIX_HEAD.length).setNumberFormat('@').setValues(rows.map(function (r) {
    return [r.code, r.kind, r.curSt, r.wantSt, r.curNext, r.wantNext, r.curDate, r.wantDate, r.t, r.prev, r.state];
  }));
  sh.setFrozenRows(2);
  stkProp_('CM_FIX_PV', cmFixToday_() + '|' + JSON.stringify(hints === undefined ? cfg_('CM_FIX_HINTS', {}) : hints));
  try { tgNotify_(String(TG_OWNER_CHAT), TG_NK.report, '🛠 <b>پیش‌نمایش تازهٔ اصلاح کامنت‌ها (v170.22.2)</b>\n' + tgEsc_(sum) + '\nدر تب «' + CM_FIX_TAB + '» هاب پذیرش. چیزی عوض نشد. برای اعمال، در B1 همان تب «اوکی» بنویسید.', { ref: 'v170.22.2' }); } catch (eN) {}
  return 'پیش‌نمایش اصلاح کامنت‌ها: ' + sum;
}
/* از cmTick5_: پیش‌نمایش هر روز یا با عوض شدن CM_FIX_HINTS تازه می‌شود (تاریخ‌ها کمینهٔ امروزند)؛ «اوکی» یک بار اعمال */
function cmFixMaybe_() {
  var ok = stkDry_() ? TG_MEM['cm:fixok'] : (function () { var sh = tgSS_().getSheetByName(CM_FIX_TAB); return sh ? String(sh.getRange(1, 2).getValue() || '').trim() : ''; })();
  if (stkProp_('CM_FIX2_DONE') === '1') return 0;
  if (ok !== 'اوکی') {
    var fp = cmFixToday_() + '|' + JSON.stringify(cfg_('CM_FIX_HINTS', {}));
    if (!stkDry_() && stkProp_('CM_FIX_PV') && stkProp_('CM_FIX_PV') !== fp) { try { cmFixPreview_(); } catch (eP) { tgErr_('cmFixPreview_', eP); } }
    return 0;
  }
  stkProp_('CM_FIX2_DONE', '1');
  /* فقط کدهایی که در پیش‌نمایش بازبینی‌شده «با اوکی اعمال می‌شود» بودند؛ مقدارها همین حالا دوباره حساب می‌شوند */
  var shown = {};
  if (stkDry_()) (TG_MEM['cm:fixtab'] || []).forEach(function (r) { if (r.state === CM_FIX_STATE.apply) shown[r.code + '|' + r.kind] = 1; });
  else { var sh0 = tgSS_().getSheetByName(CM_FIX_TAB), n0 = sh0.getLastRow(); if (n0 >= 3) sh0.getRange(3, 1, n0 - 2, CM_FIX_HEAD.length).getValues().forEach(function (v) { if (String(v[10]) === CM_FIX_STATE.apply) shown[String(v[0]) + '|' + String(v[1])] = 1; }); }
  var rows = cmFixRows2_({}).filter(function (r) { return r.state === CM_FIX_STATE.apply && shown[r.code + '|' + r.kind]; }), n = 0;
  rows.forEach(function (r) {
    var ch = r.kind === CM_FIX_KIND.rev ? { 'وضعیت': r.wantSt, 'اقدام بعدی': r.wantNext, 'تاریخ اقدام بعدی': r.wantDate, 'شمار بی‌پاسخ': r.noans } : { 'تاریخ اقدام بعدی': r.wantDate };
    if (stkDry_()) TG_OUTBOX.push({ kind: 'leadset', row: r.row, changes: ch, actor: CM_FIX_ACTOR, code: r.code });
    else tgLeadSet_(r.row, ch, CM_FIX_ACTOR, 'اصلاح', r.kind === CM_FIX_KIND.rev ? 'برگشت وضعیت: کامنت قدیمی‌تر از آخرین وضعیت شیت یا بات' : 'تماس بعدی از روز کامنت، کمینه امروز');
    n++;
  });
  var nf = 0; try { nf = cmFixNoansRepair_(); } catch (eF) { tgErr_('cmFixNoansRepair_', eF); }
  if (!stkDry_()) { try { tgSS_().getSheetByName(CM_FIX_TAB).getRange(1, 2).setValue('اعمال شد ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + n + ' لید'); } catch (e) {} }
  try { tgNotify_(String(TG_OWNER_CHAT), TG_NK.report, '✅ اصلاح کامنت‌ها اعمال شد: ' + tgFa_(n) + ' لید · «شمار بی‌پاسخ» درست‌شده: ' + tgFa_(nf) + '. پیشنهادها اعمال نشدند.', { ref: 'v170.22.2' }); } catch (eN) {}
  return n;
}
