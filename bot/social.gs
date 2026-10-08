/**
 * social.gs · میز سوشال و «صف ارسال» (از ۲۹ شهریور ۱۴۰۵)
 *
 * چرا هست: یاسر می‌خواهد «فلان چیز را به سردبیر بگو» یا «این پست ساعت ۲۱ برود» بدون دست‌زدن به کد انجام شود.
 * راهش یک تب در هاب محتواست: «سوشال · صف ارسال». هر سطر یک پیام به یک همکار، یک نقش یا کانال عمومی است.
 * soTick هر پنج دقیقه سطرهای «در صف» را که وقتشان رسیده می‌فرستد. هیچ سطری خودبه‌خود «در صف» نمی‌شود.
 *
 * تب‌ها (هاب محتوا): «سوشال · صف ارسال» · «سوشال · تقویم» · «سوشال · لینک‌ها»
 * این فایل به جریان‌های دیگر بات دست نمی‌زند. پیشوند همهٔ نام‌ها so و SO_ است.
 */
var SO_TAB_OUT = 'سوشال · صف ارسال';
var SO_TAB_CAL = 'سوشال · تقویم';
var SO_TAB_LNK = 'سوشال · لینک‌ها';
var SO_ROLE = 'سوشال';
var SO_CHANNEL = cfg_('TG_MAIN_CHANNEL', '');   /* v170.14: شناسهٔ عددی کانال اصلی در تنظیمات خصوصی */
var SO_CHANNEL_USER = 'tajrobeh_life';
var SO_OUT_HEAD = ['کد', 'برای', 'تاریخ شمسی', 'ساعت', 'متن (HTML)', 'پیوست‌ها (URL با کاما)', 'دکمه (متن|لینک)', 'وضعیت', 'شناسه پیام', 'زمان ارسال', 'یادداشت', 'سازنده'];
var SO_ST_QUEUE = 'در صف';
var SO_ST_SENT = 'فرستاده شد';

/** اولین تابع فایل: نصب تریگر پنج‌دقیقه‌ای (تکرارش بی‌ضرر است) */
function soSetup() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'soTick' || t.getHandlerFunction() === 'tgTick5'; });   /* v168.10 */
  if (!has) ScriptApp.newTrigger('soTick').timeBased().everyMinutes(5).create();
  Logger.log('soTick trigger: ' + (has ? 'already there' : 'created'));
  Logger.log('queue rows waiting: ' + soDueRows_(true).length);
}

function soSheet_(tab) {
  return tgCSS_().getSheetByName(tab);
}

function soFaToEn_(s) {
  return String(s || '').replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
    .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
}

/** «۱۴۰۵/۶/۲۹» یا «1405-06-29» ← «1405-06-29» */
function soDay_(v) {
  if (v instanceof Date) return '';
  var m = soFaToEn_(v).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return '';
  return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}

function soToday_() {
  var j = tgJalali_(new Date(), TG_TZ);
  return j.y + '-' + ('0' + j.m).slice(-2) + '-' + ('0' + j.d).slice(-2);
}

/** «۲۱:۰۰» ← دقیقه از نیمه‌شب؛ خالی یعنی -1 */
function soMin_(v) {
  if (v instanceof Date) return v.getHours() * 60 + v.getMinutes();
  var m = soFaToEn_(v).match(/(\d{1,2})\D+(\d{1,2})/);
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

function soNowMin_() {
  var p = Utilities.formatDate(new Date(), TG_TZ, 'H:m').split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

/** سطرهای «در صف» که روز و ساعتشان رسیده. countOnly یعنی همهٔ «در صف»ها */
function soDueRows_(countOnly) {
  var sh = soSheet_(SO_TAB_OUT);
  if (!sh) return [];
  var rows = sh.getDataRange().getValues(), today = soToday_(), now = soNowMin_(), out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[7] || '').trim() !== SO_ST_QUEUE) continue;
    if (countOnly) { out.push(i + 1); continue; }
    var day = soDay_(r[2]);
    if (day && day > today) continue;
    var at = soMin_(r[3]);
    var same = !day || day === today;
    if (same && at > -1 && now < at) continue;
    var isChannel = soIsChannel_(r[1]);
    if (String(r[1] || '').indexOf('درایو:') === 0) { out.push(i + 1); continue; }
    // ساعت آرام: به آدم‌ها فقط ۹ تا ۲۱:۳۰، به کانال فقط ۱۰ تا ۲۲:۳۰
    if (isChannel ? (now < 600 || now > 1350) : (now < 540 || now > 1290)) continue;
    // پست کانال اگر بیش از سه ساعت از وقتش گذشته باشد نمی‌رود (دیرهنگام بدتر از نرفتن است)
    if (isChannel && at > -1 && (!same || now - at > 180)) { sh.getRange(i + 1, 8).setValue('دیر شد · نرفت'); continue; }
    out.push(i + 1);
  }
  return out;
}

function soIsChannel_(to) {
  return String(to || '').indexOf('کانال') > -1;
}

/** «برای» ← فهرست chat_id. نام، نقش، عدد، یا «کانال عمومی» */
function soResolve_(to) {
  var t = String(to || '').trim();
  if (!t) return [];
  if (soIsChannel_(t)) { var pc = typeof pbChannel_ === 'function' ? pbChannel_('public') : null; return [pc && pc.chat ? pc.chat : SO_CHANNEL]; }   /* v167: از تب «کانال‌ها» */
  /* v170.23.21: چند chat_id عددی با کاما («123,456») هم پذیرفته می‌شود؛ بخش‌های نام و نقش از تب «افراد» */
  var parts = t.split(/[،,;\s]+/).map(function (s) { return tgLatinDigits_(s.trim()); }).filter(Boolean), out = [];
  parts.filter(function (p) { return /^-?\d{5,}$/.test(p); }).forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
  parts = t.split(/[،,]/).map(function (s) { return s.trim(); }).filter(function (p) { return p && !/^-?[\d۰-۹]{5,}$/.test(p); });
  if (!parts.length) return out;
  var sh = tgSS_().getSheetByName(TG_PEOPLE_TAB);
  if (!sh) return out;
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var name = String(rows[i][0] || ''), ids = String(rows[i][2] || ''), roles = String(rows[i][3] || '');
    if (!ids) continue;
    var hit = parts.some(function (p) {
      if (name.indexOf(p) > -1) return true;
      return roles.split(/[،,]/).map(function (s) { return s.trim(); }).indexOf(p) > -1;
    });
    if (!hit) continue;
    var first = ids.split(/[\s,،;]+/).filter(Boolean)[0];
    if (first && out.indexOf(first) < 0) out.push(first);
  }
  return out;
}

function soJson_(res) {
  try { if (res && res.getContentText) return JSON.parse(res.getContentText()); } catch (e) {}
  return res && typeof res === 'object' ? res : { ok: false, description: 'بدون پاسخ' };
}

function soKb_(v) {
  var s = String(v || '').trim();
  if (!s || s.indexOf('|') < 0) return null;
  var p = s.split('|');
  return { inline_keyboard: [[{ text: p[0].trim(), url: p.slice(1).join('|').trim() }]] };
}

/** فایل را گوگل می‌گیرد (سایت به بعضی آی‌پی‌های بیرونی جواب نمی‌دهد) و به‌شکل بلاب برمی‌گرداند */
function soBlob_(u) {
  var r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() !== 200) throw new Error('فایل باز نشد (' + r.getResponseCode() + '): ' + u.split('/').pop());
  return r.getBlob().setName(decodeURIComponent(u.split('/').pop().split('?')[0]));
}

function soPost_(method, payload) {
  var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  var res = tgFetchRetry_('https://api.telegram.org/bot' + token + '/' + method, { method: 'post', payload: payload, muteHttpExceptions: true });
  return soJson_(res);
}

/** یک سطر را به یک چت می‌فرستد. خروجی: {ok, ids[], err} */
function soSendOne_(chat, text, files, kb) {
  var ids = [], imgs = [], docs = [];
  files.forEach(function (u) {
    if (u.indexOf('doc:') === 0) docs.push(u.slice(4));
    else if (/\.(jpe?g|png|webp)(\?|$)/i.test(u)) imgs.push(u);
    else docs.push(u);
  });
  var capOk = text.replace(/<[^>]+>/g, '').length <= 1000;   // سقف کپشن تلگرام ۱۰۲۴ حرفِ دیدنی است
  function done(j) { if (j && j.ok) { var r = j.result; (r instanceof Array ? r : [r]).forEach(function (x) { if (x && x.message_id) ids.push(x.message_id); }); return true; } return false; }
  var j;
  if (!imgs.length || !capOk) {
    var body = { chat_id: String(chat), text: text, parse_mode: 'HTML', disable_web_page_preview: 'true' };
    if (kb && !imgs.length) body.reply_markup = JSON.stringify(kb);
    j = soPost_('sendMessage', body);
    if (!done(j)) return { ok: false, ids: ids, err: j.description || 'sendMessage' };
  }
  if (imgs.length === 1) {
    var b1 = { chat_id: String(chat), photo: soBlob_(imgs[0]) };
    if (capOk) { b1.caption = text; b1.parse_mode = 'HTML'; }
    if (kb) b1.reply_markup = JSON.stringify(kb);
    j = soPost_('sendPhoto', b1);
    if (!done(j)) return { ok: false, ids: ids, err: j.description || 'sendPhoto' };
  } else if (imgs.length > 1) {
    var pay = { chat_id: String(chat) };
    var media = imgs.slice(0, 10).map(function (u, i) {
      pay['f' + i] = soBlob_(u);
      var it = { type: 'photo', media: 'attach://f' + i };
      if (i === 0 && capOk) { it.caption = text; it.parse_mode = 'HTML'; }
      return it;
    });
    pay.media = JSON.stringify(media);
    j = soPost_('sendMediaGroup', pay);
    if (!done(j)) return { ok: false, ids: ids, err: j.description || 'sendMediaGroup' };
  }
  for (var d = 0; d < docs.length; d++) {
    j = soPost_('sendDocument', { chat_id: String(chat), document: soBlob_(docs[d]) });
    if (!done(j)) return { ok: false, ids: ids, err: (j.description || 'sendDocument') + ' · ' + docs[d].split('/').pop() };
  }
  return { ok: true, ids: ids, err: '' };
}

/** «برای» = «درایو:<شناسهٔ پوشه>» ← پیوست‌ها در همان پوشهٔ گوگل‌درایو بایگانی می‌شوند */
function soToDrive_(sh, rowNum, r) {
  var id = String(r[1]).split(':').slice(1).join(':').trim();
  var folder = DriveApp.getFolderById(id), names = [];
  String(r[5] || '').split(/[,\n]/).map(function (s) { return s.trim().replace(/^doc:/, ''); }).filter(Boolean).forEach(function (u) {
    var b = soBlob_(u);
    if (!folder.getFilesByName(b.getName()).hasNext()) folder.createFile(b);
    names.push(b.getName());
  });
  var stamp = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm');
  sh.getRange(rowNum, 8, 1, 3).setValues([[SO_ST_SENT, names.length + ' فایل', stamp]]);
}

function soSendRow_(sh, rowNum) {
  var r = sh.getRange(rowNum, 1, 1, SO_OUT_HEAD.length).getValues()[0];
  if (String(r[1] || '').indexOf('درایو:') === 0) { soToDrive_(sh, rowNum, r); return; }
  var chats = soResolve_(r[1]);
  if (!chats.length) { sh.getRange(rowNum, 8).setValue('خطا: گیرنده پیدا نشد'); return; }
  var text = String(r[4] || '').trim();
  if (!text) { sh.getRange(rowNum, 8).setValue('خطا: متن خالی است'); return; }
  var files = String(r[5] || '').split(/[,\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
  var kb = soKb_(r[6]);
  sh.getRange(rowNum, 8).setValue('در حال ارسال'); SpreadsheetApp.flush();   // اول علامت بزن تا دوبار نرود
  var allIds = [], errs = [];
  chats.forEach(function (c) {
    var o = soSendOne_(c, text, files, kb);
    allIds = allIds.concat(o.ids);
    if (!o.ok) errs.push(o.err);
  });
  var stamp = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm');
  sh.getRange(rowNum, 8, 1, 3).setValues([[errs.length ? 'خطا: ' + errs.join(' ؛ ') : SO_ST_SENT, allIds.join(','), stamp]]);
  if (!errs.length && soIsChannel_(r[1]) && allIds.length) {
    var link = 'https://t.me/' + SO_CHANNEL_USER + '/' + allIds[0];
    sh.getRange(rowNum, 11).setValue(link);
    soResolve_(SO_ROLE).forEach(function (c) {
      soPost_('sendMessage', { chat_id: String(c), text: '📣 پست «' + String(r[0] || '') + '» در کانال منتشر شد.\n' + link, disable_web_page_preview: 'true' });
    });
  }
}

/** هدف تریگر پنج‌دقیقه‌ای */
function soTick(e) {
  if (ciPaused_(e, 'soTick', 'skip')) return;
  var rs0 = Date.now(); try {   /* v166.18: سنجش زمان اجرا (بدنه بی‌تغییر) */
  if (TG_DRY) return 0;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return 0;
  var n = 0;
  try {
    var due = soDueRows_(false);
    if (!due.length) return 0;
    var sh = soSheet_(SO_TAB_OUT);
    for (var i = 0; i < due.length && i < 6; i++) {
      try { soSendRow_(sh, due[i]); n++; }
      catch (e) { sh.getRange(due[i], 8).setValue('خطا: ' + tgSecretMask_(e.message)); }
    }
  } finally { lock.releaseLock(); }
  return n;
  } finally {
    try { if (typeof pbTick_ === 'function' && (typeof bgOk_ !== 'function' || bgOk_('light', 'pbTick_'))) pbTick_(); } catch (ePb) { tgErr_('pbTick_', ePb); }   /* v170.23.12.5: زیر سقف ۷۵ دقیقه */   /* v167: صف انتشار، پایش سایت، پیام هفتگی (بی تریگر تازه) */
    tgRunStat_('soTick', rs0);
  }
}

/* ---------- میز سوشال در بات (نقش «سوشال» در تب افراد) ---------- */
var SO_BTNS = ['🗓 تقویم سوشال', '🔗 لینک‌های رهگیری', '📤 صف ارسال', '📊 نتیجهٔ کمپین‌ها', '🧾 لینک اینستاگرام تازه', '📁 پوشهٔ فایل‌ها'];
var SO_HUB_URL = 'https://docs.google.com/spreadsheets/d/' + cfg_('TG_CONTENT_SHEET_ID', '') + '/edit';
var SO_DRIVE_URL = 'https://drive.google.com/drive/folders/' + cfg_('SO_DRIVE_ID', '');
var SO_LOOKER_URL = 'https://datastudio.google.com/reporting/55e7e3d9-ab65-4779-bf27-cf559c5aac39';
var SO_LOOKER_SCHOOL = 'https://datastudio.google.com/reporting/5e0b0fd2-566a-4fb3-8fe6-7cc8c2599892';

function soMenu_() {
  return { keyboard: [[SO_BTNS[0]], [SO_BTNS[1], SO_BTNS[2]], [SO_BTNS[3], SO_BTNS[4]], [SO_BTNS[5]]].concat(tgRoleRow_()), resize_keyboard: true };
}

/** «1405-06-29» ← «۲۹ شهریور» */
function soDayFa_(day) {
  var p = String(day || '').split('-');
  if (p.length !== 3) return String(day || '');
  return tgFa_(Number(p[2])) + ' ' + TG_JMONTHS[Number(p[1]) - 1];
}

function soGidUrl_(tab) {
  try { return SO_HUB_URL + '#gid=' + soSheet_(tab).getSheetId(); } catch (e) { return SO_HUB_URL; }
}

function soCalText_() {
  var sh = soSheet_(SO_TAB_CAL);
  if (!sh) return 'تب تقویم پیدا نشد.';
  var rows = sh.getDataRange().getValues(), today = soToday_(), out = [], n = 0;
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    var d = soDay_(rows[i][1]);
    if (!d || !String(rows[i][6] || '').trim()) continue;
    var st = String(rows[i][8] || '').trim();
    if (d < today && (st === 'منتشر شد' || st === 'انجام شد' || st === 'لغو')) continue;
    list.push({ d: d, r: rows[i] });
  }
  list.sort(function (a, b) { return a.d < b.d ? -1 : (a.d > b.d ? 1 : 0); });
  var last = '';
  list.slice(0, 14).forEach(function (x) {
    var r = x.r;
    if (x.d !== last) { out.push('\n<b>' + soDayFa_(x.d) + (x.d === today ? ' · امروز' : '') + '</b>'); last = x.d; }
    var hh = String(r[2] instanceof Date ? Utilities.formatDate(r[2], TG_TZ, 'HH:mm') : (r[2] || '')).trim();
    out.push('• ' + (hh ? tgFa_(hh) + ' · ' : '') + tgEsc_(String(r[6])) + '\n   ' + tgEsc_(String(r[4] || '')) + ' · ' + tgEsc_(String(r[5] || '')) +
      '\n   مسئول: ' + tgEsc_(String(r[7] || 'نامشخص')) + ' · <i>' + tgEsc_(String(r[8] || '')) + '</i>');
    n++;
  });
  if (!n) return 'در تقویم سوشال مورد بازی نیست. هر سطر تازه را در تب «' + SO_TAB_CAL + '» اضافه کنید.';
  return '🗓 <b>تقویم سوشال</b> · کارهای ما و تیم سوشال با هم' + out.join('\n');
}

function soLinksText_() {
  var sh = soSheet_(SO_TAB_LNK);
  if (!sh) return 'تب لینک‌ها پیدا نشد.';
  var rows = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < rows.length && out.length < 12; i++) {
    var r = rows[i];
    if (!String(r[4] || '').trim()) continue;
    var shortL = String(r[3] || '').trim();
    out.push('<b>' + tgEsc_(String(r[1] || '')) + '</b> · ' + tgEsc_(String(r[2] || '')) + '\n<code>' + tgEsc_(shortL ? shortL : String(r[4])) + '</code>');
  }
  return '🔗 <b>لینک‌های رهگیری‌دار</b>\nروی هر لینک بزنید تا کپی شود. لینک بیو کوتاه است و مقصدش از سایت عوض می‌شود.\n\n' + out.join('\n\n');
}

function soQueueText_() {
  var sh = soSheet_(SO_TAB_OUT);
  if (!sh) return 'تب صف ارسال پیدا نشد.';
  var rows = sh.getDataRange().getValues(), out = [];
  for (var i = rows.length - 1; i >= 1 && out.length < 8; i--) {
    var r = rows[i];
    if (!String(r[0] || '').trim()) continue;
    var hh = String(r[3] instanceof Date ? Utilities.formatDate(r[3], TG_TZ, 'HH:mm') : (r[3] || '')).trim();
    out.push('• <b>' + tgEsc_(String(r[0])) + '</b> ← ' + tgEsc_(String(r[1] || '').indexOf('درایو:') === 0 ? 'بایگانی درایو' : String(r[1] || '')) +
      '\n   ' + soDayFa_(soDay_(r[2])) + (hh ? ' · ' + tgFa_(hh) : '') + ' · <i>' + tgEsc_(String(r[7] || '')) + '</i>');
  }
  return '📤 <b>صف ارسال</b>\nپیام به همکاران و پست کانال از همین تب می‌رود. فقط سطر «در صف» فرستاده می‌شود.\n\n' + (out.length ? out.join('\n') : 'خالی است.');
}

/** میز نقش «سوشال». از tgRoleRoute_ صدا زده می‌شود */
function soDesk_(chat, text, uname) {
  var s = String(text || '').trim();
  function link(label, url) { return { inline_keyboard: [[{ text: label, url: url }]] }; }
  if (s.indexOf('تقویم سوشال') > -1) return tgSend_(chat, soCalText_(), link('باز کردن تقویم در هاب محتوا', soGidUrl_(SO_TAB_CAL)));
  if (s.indexOf('لینک‌های رهگیری') > -1) return tgSend_(chat, soLinksText_(), link('همهٔ لینک‌ها در هاب محتوا', soGidUrl_(SO_TAB_LNK)));
  if (s.indexOf('صف ارسال') > -1) return tgSend_(chat, soQueueText_(), link('باز کردن صف ارسال', soGidUrl_(SO_TAB_OUT)));
  if (s.indexOf('لینک اینستاگرام تازه') > -1 && typeof tgUtmStart_ === 'function') return tgUtmStart_(chat);
  if (s.indexOf('پوشهٔ فایل‌ها') > -1) return tgSend_(chat, '📁 بسته‌های آمادهٔ انتشار (کارت، استوری، متن و لینک) در یک پوشهٔ درایو است. هر بسته پوشهٔ خودش را دارد.', link('باز کردن پوشه در گوگل‌درایو', SO_DRIVE_URL));
  if (s.indexOf('نتیجهٔ کمپین‌ها') > -1) {
    return tgSend_(chat, '📊 <b>نتیجهٔ زندهٔ کمپین‌ها</b>\n\nهر لینک رهگیری‌دار یک سطر در گزارش می‌شود: چند نفر آمدند، چند نفر به بات یا فرم رسیدند.\n\n• صفحهٔ «سوشال و کمپین‌ها»: همهٔ پیج‌ها و کانال تلگرام\n• «قیف کمپین‌های مدرسه»: ثبت‌نام وبینار تا پرداخت (EFT)',
      { inline_keyboard: [[{ text: 'داشبورد آمار تجربه', url: SO_LOOKER_URL }], [{ text: 'قیف کمپین‌های مدرسه', url: SO_LOOKER_SCHOOL }]] });
  }
  return tgSend_(chat, '📣 <b>میز سوشال</b>\nتقویم انتشار، لینک‌های رهگیری‌دار، صف ارسال و نتیجهٔ کمپین‌ها همین‌جاست.', soMenu_());
}
