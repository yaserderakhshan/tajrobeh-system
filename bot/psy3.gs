/**
 * psy3.gs · v170.23.9 · روان‌پزشکی، بخش ۲: ویزیت، فرم اداری، پرونده‌ها، رد پا، نمای مسئول، خوشامد (تصمیم یاسر)
 *
 * - نوع ویزیت و مدت: «ویزیت اول» (پیش‌فرض ۴۰ دقیقه، بازهٔ ۳۰ تا ۴۰) و «پیگیری» (۲۰ دقیقه). نوع از سابقهٔ همان مراجع با همان پزشک.
 * - بستر: گوگل‌میت؛ جایگزین (الوکام یا اسکای‌روم) برای وقتی اینترنت ملی است (کلید PSY_NATIONAL_NET = «بله» همه را به جایگزین می‌برد).
 *   لینک‌ها از فرم «تکمیل اطلاعات» خود پزشک.
 * - بعد از ویزیت فقط دادهٔ اداری: انجام شد یا نشد؛ نوع نسخه (الکترونیک با بیمهٔ تأمین اجتماعی، سلامت یا نیروهای مسلح؛ یا آزاد و
 *   دستی با عکس نسخه)؛ نامهٔ بیمهٔ تکمیلی (لازم نیست، اسکن، پستی) با وضعیت ارسال. **هیچ یادداشت بالینی ذخیره نمی‌شود؛ پرونده نزد
 *   خود پزشک است.**
 * - فایل‌ها (عکس نسخه و نامه) در پوشهٔ «روان‌پزشکی · پرونده‌های اداری» درایو، هر پزشک یک زیرپوشه، دسترسی فقط پزشک و مسئول
 *   روان‌پزشکی (ایمیل‌ها از PSY_DR_EMAIL و PSY_HEAD_EMAIL؛ پوشه خصوصی). نام فایل فقط کد نوبت، بی نام مراجع.
 * - رد پا: هر قدم (درخواست، نوبت، یادآوری، ویزیت، نسخه، نامه، پرداخت، تسویه) یک سطر در «رویدادهای روان‌پزشکی» با زمان و «کی».
 *   پزشک و مراجع در هر قدم خبر می‌گیرند. مسئول: «/psy» یا دکمهٔ «🗂 نمای روان‌پزشکی» در بات، و تب «ویزیت‌های روان‌پزشکی» در هاب.
 * - خوشامد: متن کامل از کلید PSY_WELCOME (تنظیمات خصوصی؛ نام‌ها در کد نیست)، با دکمهٔ «تکمیل اطلاعات»؛ یک بار برای هر پزشک،
 *   بعد از اتصال حساب (psy2.gs) یا با یک‌بارهٔ این نسخه برای پزشکِ از قبل وصل.
 * حالت خشک: TG_MEM['ps3:visits']، ['ps3:ev']، ['ps3:info']، ['psyappt'].
 */
var PS3_V_TAB = 'ویزیت‌های روان‌پزشکی';
var PS3_V_HEAD = ['کد نوبت', 'روان‌پزشک', 'chat مراجع', 'تاریخ', 'ساعت', 'نوع ویزیت', 'مدت', 'بستر', 'یادآوری', 'انجام', 'نوع نسخه', 'بیمه',
  'فایل نسخه', 'نامهٔ تکمیلی', 'وضعیت نامه', 'فایل نامه', 'تسویه', 'آخرین تغییر'];
var PS3_EV_TAB = 'رویدادهای روان‌پزشکی';
var PS3_EV_HEAD = ['زمان', 'کد نوبت', 'قدم', 'کی', 'از', 'به', 'یادداشت'];
var PS3_INFO_TAB = 'اطلاعات روان‌پزشکان';
var PS3_INFO_HEAD = ['روان‌پزشک', 'هزینهٔ ویزیت اول', 'هزینهٔ پیگیری', 'بیمه‌های طرف قرارداد', 'شیوهٔ تسویه', 'لینک گوگل‌میت', 'بستر جایگزین', 'لینک جایگزین', 'آخرین تغییر'];
var PS3_INS = ['تأمین اجتماعی', 'سلامت', 'نیروهای مسلح'];
var PS3_HEAD_BTN = '🗂 نمای روان‌پزشکی';
var PS3_INFO_BTN = '📝 تکمیل اطلاعات';
var PS3_POST_BTN = '🩺 فرم بعد از ویزیت';
var PS3_FOLDER = 'روان‌پزشکی · پرونده‌های اداری';
cfg_('PSY_WELCOME', '');        /* متن کامل پیام خوشامد روان‌پزشک (نام‌ها فقط اینجا، نه در کد) */
cfg_('PSY_NATIONAL_NET', '');   /* «بله» وقتی اینترنت ملی است: همهٔ خبرها لینک بستر جایگزین را می‌دهند */
cfg_('PSY_FIRST_MIN', '');     /* بی مقدار: ۴۰ */
cfg_('PSY_FOLLOW_MIN', '');    /* بی مقدار: ۲۰ */

function ps3Dry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function ps3Now_() { return ps3Dry_() && TG_MEM['ps3:now'] ? Number(TG_MEM['ps3:now']) : Date.now(); }
function ps3Tab_(name, head) {
  var ss = tgSS_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.setRightToLeft(true); sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f3efec'); sh.setFrozenRows(1); }
  return sh;
}
/* ───── رد پا ───── */
function ps3Ev_(code, step, who, from, to, note) {
  var row = [new Date(ps3Now_()), code || '', step, who || 'بات', from || '', to || '', note || ''];
  if (ps3Dry_()) { (TG_MEM['ps3:ev'] = TG_MEM['ps3:ev'] || []).push(row); return; }
  try { ps3Tab_(PS3_EV_TAB, PS3_EV_HEAD).appendRow(row); } catch (e) { tgErr_('ps3Ev_', e); }
}
/* ───── ویزیت‌ها ───── */
function ps3Rows_() {
  if (ps3Dry_()) return (TG_MEM['ps3:visits'] = TG_MEM['ps3:visits'] || []);
  var sh = ps3Tab_(PS3_V_TAB, PS3_V_HEAD), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, PS3_V_HEAD.length).getValues().map(function (v, i) { var o = { row: i + 2 }; PS3_V_HEAD.forEach(function (h, j) { o[h] = v[j] instanceof Date ? Utilities.formatDate(v[j], TG_TZ, 'yyyy-MM-dd HH:mm') : String(v[j]); }); return o; });
}
function ps3Find_(code) { return ps3Rows_().filter(function (o) { return o['کد نوبت'] === code; })[0] || null; }
function ps3Put_(o, ch, who) {
  var before = {};
  Object.keys(ch).forEach(function (k) { before[k] = o[k]; o[k] = ch[k]; });
  o['آخرین تغییر'] = Utilities.formatDate(new Date(ps3Now_()), TG_TZ, 'yyyy-MM-dd HH:mm');
  if (!ps3Dry_()) {
    var sh = ps3Tab_(PS3_V_TAB, PS3_V_HEAD), arr = PS3_V_HEAD.map(function (h) { return o[h] === undefined ? '' : o[h]; });
    if (o.row) sh.getRange(o.row, 1, 1, arr.length).setNumberFormat('@').setValues([arr]); else { sh.appendRow(arr); o.row = sh.getLastRow(); }
  } else if (!o.row) { var L = ps3Rows_(); o.row = L.length + 2; L.push(o); }
  Object.keys(ch).forEach(function (k) { if (String(before[k] || '') !== String(ch[k] || '') && k !== 'آخرین تغییر') ps3Ev_(o['کد نوبت'], k, who, before[k], ch[k]); });
  return o;
}
function ps3Info_(name) {
  var L = ps3Dry_() ? (TG_MEM['ps3:info'] || []) : (function () { var sh = ps3Tab_(PS3_INFO_TAB, PS3_INFO_HEAD), n = sh.getLastRow(); return n < 2 ? [] : sh.getRange(2, 1, n - 1, PS3_INFO_HEAD.length).getValues().map(function (v, i) { var o = { row: i + 2 }; PS3_INFO_HEAD.forEach(function (h, j) { o[h] = String(v[j]); }); return o; }); })();
  return L.filter(function (o) { return tgNorm_(o['روان‌پزشک']) === tgNorm_(name); })[0] || null;
}
/* لینک بستر: اینترنت ملی ← جایگزین */
function ps3Platform_(name) {
  var inf = ps3Info_(name) || {}, nat = String(cfg_('PSY_NATIONAL_NET', '') || '').trim() === 'بله';
  if (nat && inf['لینک جایگزین']) return { label: inf['بستر جایگزین'] || 'بستر جایگزین', link: inf['لینک جایگزین'] };
  if (inf['لینک گوگل‌میت']) return { label: 'گوگل‌میت', link: inf['لینک گوگل‌میت'] };
  return { label: inf['بستر جایگزین'] || 'گوگل‌میت', link: inf['لینک جایگزین'] || '' };
}
function ps3DocChat_(name) {
  var p = (typeof ps2People_ === 'function' ? ps2People_() : []).filter(function (x) { return tgNorm_(x.name) === tgNorm_(name); })[0];
  return p ? String(p.chat || '').split(/[,،;\s]+/).filter(String)[0] || '' : '';
}
/** قلاب بعد از ثبت نوبت (tgPsyOnBook_): ردیف ویزیت، نوع و مدت، خبر به پزشک و مراجع */
function ps3OnBook_(a, s, chat) {
  var prev = ps3Rows_().filter(function (o) { return o['chat مراجع'] === String(chat) && tgNorm_(o['روان‌پزشک']) === tgNorm_(s.therapist) && o['انجام'] === 'انجام شد'; }).length;
  var kind = prev ? 'پیگیری' : 'ویزیت اول', min = prev ? (Number(cfg_('PSY_FOLLOW_MIN', '')) || 20) : (Number(cfg_('PSY_FIRST_MIN', '')) || 40);
  var pl = ps3Platform_(s.therapist);
  var o = ps3Put_({ 'کد نوبت': a.code, 'روان‌پزشک': s.therapist, 'chat مراجع': String(chat), 'تاریخ': s.dateIso, 'ساعت': s.hhmm }, { 'نوع ویزیت': kind, 'مدت': String(min), 'بستر': pl.label }, 'بات');
  ps3Ev_(a.code, 'نوبت', 'مراجع', '', s.dateIso + ' ' + s.hhmm, kind);
  var when = tgFa_(s.dateIso) + ' ساعت ' + tgFa_(s.hhmm);
  tgNotify_(String(chat), TG_NK.urgent, '💊 <b>نوبت روان‌پزشکی شما ثبت شد</b>\n' + kind + ' · ' + tgFa_(min) + ' دقیقه · ' + when + '\nبستر: ' + tgEsc_(pl.label) + (pl.link ? '\n' + tgEsc_(pl.link) : '\nلینک جلسه را پیش از وقت می‌فرستیم.'), { ref: a.code });
  var dc = ps3DocChat_(s.therapist);
  if (dc) tgNotify_(dc, TG_NK.task, '💊 <b>نوبت تازه</b> · <code>' + a.code + '</code>\n' + kind + ' · ' + tgFa_(min) + ' دقیقه · ' + when, { ref: a.code });
  return o;
}
/* ───── یادآوری (ساعتی): ۲۴ ساعت مانده، یک بار؛ پیام فرم بعد از ویزیت، یک بار ───── */
function ps3Tick_() {
  var now = ps3Now_(), n = 0;
  ps3Rows_().forEach(function (o) {
    var t = new Date(o['تاریخ'] + 'T' + (o['ساعت'] || '00:00') + ':00+03:30').getTime(); if (isNaN(t)) return;
    var end = t + Number(o['مدت'] || 30) * 60000, pl = ps3Platform_(o['روان‌پزشک']);
    if (!o['یادآوری'] && t - now <= 24 * 3600000 && t > now) {
      ps3Put_(o, { 'یادآوری': 'رفت' }, 'بات');
      if (o['chat مراجع']) tgNotify_(o['chat مراجع'], TG_NK.remind, '⏰ یادآوری: ' + o['نوع ویزیت'] + ' روان‌پزشکی شما ' + tgFa_(o['تاریخ']) + ' ساعت ' + tgFa_(o['ساعت']) + '.' + (pl.link ? '\nلینک: ' + tgEsc_(pl.link) : ''), { ref: o['کد نوبت'] });
      var dc = ps3DocChat_(o['روان‌پزشک']); if (dc) tgNotify_(dc, TG_NK.remind, '⏰ فردا: <code>' + o['کد نوبت'] + '</code> · ' + o['نوع ویزیت'] + ' ساعت ' + tgFa_(o['ساعت']), { ref: o['کد نوبت'] });
      n++;
    }
    if (!o['انجام'] && now > end && !ps3Asked_(o['کد نوبت'])) {
      ps3Asked_(o['کد نوبت'], 1);
      var to = ps3DocChat_(o['روان‌پزشک']) || tgPsyRoleChats_()[0];
      if (to) tgNotify_(to, TG_NK.task, '🩺 <b>فرم بعد از ویزیت</b> · <code>' + o['کد نوبت'] + '</code>\nفقط دادهٔ اداری؛ یادداشت بالینی ثبت نمی‌شود.\nویزیت انجام شد؟', { ref: o['کد نوبت'], markup: ps3DoneKb_(o['کد نوبت']) });
      n++;
    }
  });
  return n;
}
function ps3Asked_(code, v) {
  if (ps3Dry_()) { if (v) TG_MEM['ps3:asked:' + code] = 1; return !!TG_MEM['ps3:asked:' + code]; }
  var P = PropertiesService.getScriptProperties(); if (v) P.setProperty('PS3_ASK:' + code, '1'); return P.getProperty('PS3_ASK:' + code) === '1';
}
/* ───── فرم اداری بعد از ویزیت ───── */
function ps3DoneKb_(c) { return { inline_keyboard: [[{ text: '✅ انجام شد', callback_data: 'ps3:d:' + c }, { text: '❌ انجام نشد', callback_data: 'ps3:n:' + c }]] }; }
function ps3RxKb_(c) {
  return { inline_keyboard: [PS3_INS.map(function (x, i) { return { text: 'الکترونیک · ' + x, callback_data: 'ps3:e' + i + ':' + c }; }),
    [{ text: '📝 آزاد و دستی (عکس نسخه)', callback_data: 'ps3:f:' + c }], [{ text: 'بی‌نسخه', callback_data: 'ps3:r0:' + c }]] };
}
function ps3LetterKb_(c) { return { inline_keyboard: [[{ text: 'نامهٔ تکمیلی لازم نیست', callback_data: 'ps3:l0:' + c }], [{ text: '📄 اسکن (فایل)', callback_data: 'ps3:ls:' + c }, { text: '📮 پستی', callback_data: 'ps3:lp:' + c }]] }; }
function ps3Can_(chat, o) { return tgPsyIsHead_(chat) || (o && tgNorm_(ps2DocName_(chat)) === tgNorm_(o['روان‌پزشک'])); }
function ps3Cb_(chat, data) {
  var a = String(data).split(':'), act = a[1], code = a.slice(2).join(':');
  if (act === 'info') return ps3InfoStart_(chat);
  if (act === 'iv') return ps3InfoAns_(chat, a[2], a.slice(3).join(':'));
  if (act === 'hv') return ps3HeadView_(chat);
  var o = ps3Find_(code); if (!o) return tgSend_(chat, 'این نوبت پیدا نشد: ' + code);
  if (!ps3Can_(chat, o)) return tgSend_(chat, 'این فرم مخصوص همان روان‌پزشک یا مسئول روان‌پزشکی است.');
  var who = tgPsyIsHead_(chat) ? 'مسئول روان‌پزشکی' : 'روان‌پزشک', cl = o['chat مراجع'];
  if (act === 'd') { ps3Put_(o, { 'انجام': 'انجام شد' }, who); return tgSend_(chat, 'نسخه؟', ps3RxKb_(code)); }
  if (act === 'n') { ps3Put_(o, { 'انجام': 'انجام نشد' }, who); tgPsyNotifyHead_('⚠️ ویزیت <code>' + code + '</code> انجام نشد؛ هماهنگی وقت تازه با مراجع.', null, code); return tgSend_(chat, '✅ ثبت شد: انجام نشد. مسئول روان‌پزشکی پیگیری می‌کند.'); }
  if (/^e[0-2]$/.test(act)) { ps3Put_(o, { 'نوع نسخه': 'الکترونیک', 'بیمه': PS3_INS[Number(act[1])] }, who); if (cl) tgNotify_(cl, TG_NK.urgent, '💊 نسخهٔ الکترونیک شما (' + PS3_INS[Number(act[1])] + ') ثبت شد.', { ref: code }); return tgSend_(chat, 'نامهٔ بیمهٔ تکمیلی؟', ps3LetterKb_(code)); }
  if (act === 'r0') { ps3Put_(o, { 'نوع نسخه': 'بی‌نسخه' }, who); return tgSend_(chat, 'نامهٔ بیمهٔ تکمیلی؟', ps3LetterKb_(code)); }
  if (act === 'f') { tgSetVal_('ps3f', chat, JSON.stringify({ code: code, what: 'نسخه' })); return tgSend_(chat, '📷 عکس نسخه را همین‌جا بفرستید. فقط در پوشهٔ خصوصی پزشک و مسئول روان‌پزشکی ذخیره می‌شود.'); }
  if (act === 'l0') { ps3Put_(o, { 'نامهٔ تکمیلی': 'لازم نیست' }, who); return tgSend_(chat, '✅ فرم این ویزیت کامل شد.'); }
  if (act === 'ls') { tgSetVal_('ps3f', chat, JSON.stringify({ code: code, what: 'نامه' })); return tgSend_(chat, '📄 فایل یا عکس نامه را همین‌جا بفرستید.'); }
  if (act === 'lp') { ps3Put_(o, { 'نامهٔ تکمیلی': 'پستی', 'وضعیت نامه': 'در انتظار ارسال' }, who); tgPsyNotifyHead_('📮 نامهٔ بیمهٔ تکمیلی <code>' + code + '</code> پستی است؛ بعد از ارسال در «' + PS3_HEAD_BTN + '» بزنید «ارسال شد».', null, code); if (cl) tgNotify_(cl, TG_NK.urgent, '📮 نامهٔ بیمهٔ تکمیلی شما با پست فرستاده می‌شود؛ بعد از ارسال خبر می‌دهیم.', { ref: code }); return tgSend_(chat, '✅ ثبت شد. ارسال پستی با مسئول روان‌پزشکی.'); }
  if (act === 'ps') { if (!tgPsyIsHead_(chat)) return null; ps3Put_(o, { 'وضعیت نامه': 'ارسال شد' }, who); if (cl) tgNotify_(cl, TG_NK.urgent, '📮 نامهٔ بیمهٔ تکمیلی شما ارسال شد.', { ref: code }); return ps3HeadView_(chat); }
  if (act === 'st') { if (!tgPsyIsHead_(chat)) return null; ps3Put_(o, { 'تسویه': 'تسویه شد' }, who); var dc = ps3DocChat_(o['روان‌پزشک']); if (dc) tgNotify_(dc, TG_NK.task, '💳 ویزیت <code>' + code + '</code> تسویه شد.', { ref: code }); return ps3HeadView_(chat); }
  return null;
}
/* فایل نسخه یا نامه ← پوشهٔ خصوصی پزشک (نام فایل بی نام مراجع) */
function ps3File_(chat, m) {
  var st = tgGetVal_('ps3f', chat); if (!st) return false;
  var fid = m.photo && m.photo.length ? m.photo[m.photo.length - 1].file_id : (m.document ? m.document.file_id : '');
  if (!fid) return false;
  tgDel_('ps3f', chat);
  var x = {}; try { x = JSON.parse(st); } catch (e) {}
  var o = ps3Find_(x.code); if (!o) { tgSend_(chat, 'نوبت پیدا نشد.'); return true; }
  var url = ps3Save_(o, fid, x.what);
  var who = tgPsyIsHead_(chat) ? 'مسئول روان‌پزشکی' : 'روان‌پزشک';
  if (x.what === 'نسخه') { ps3Put_(o, { 'نوع نسخه': 'آزاد و دستی', 'فایل نسخه': url }, who); if (o['chat مراجع']) tgNotify_(o['chat مراجع'], TG_NK.urgent, '💊 نسخهٔ شما ثبت شد.', { ref: x.code }); tgSend_(chat, '✅ نسخه ذخیره شد. نامهٔ بیمهٔ تکمیلی؟', ps3LetterKb_(x.code)); }
  else { ps3Put_(o, { 'نامهٔ تکمیلی': 'اسکن', 'وضعیت نامه': 'ارسال شد', 'فایل نامه': url }, who); if (o['chat مراجع']) tgNotify_(o['chat مراجع'], TG_NK.urgent, '📄 نامهٔ بیمهٔ تکمیلی شما آماده و فرستاده شد.', { ref: x.code }); tgSend_(chat, '✅ نامه ذخیره شد. فرم این ویزیت کامل شد.'); }
  return true;
}
function ps3Folder_(doctor) {
  var root = tgPqFolder_(PS3_FOLDER);
  var it = root.getFoldersByName(doctor), f = it.hasNext() ? it.next() : root.createFolder(doctor);
  try {
    f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    [tgCfg_(TG_PSY_K.head), tgCfg_(TG_PSY_K.dre)].forEach(function (em) { em = String(em || '').trim(); if (em && /@/.test(em)) { try { f.addEditor(em); } catch (eE) {} } });
  } catch (e) { tgErr_('ps3Folder_', e); }
  return f;
}
function ps3Save_(o, fid, what) {
  if (ps3Dry_()) { (TG_MEM['ps3:files'] = TG_MEM['ps3:files'] || []).push({ code: o['کد نوبت'], what: what }); return 'https://drive.google.com/dry/' + o['کد نوبت']; }
  try {
    var f = tgTgFile_(fid), ext = (String(f.path).split('.').pop() || 'jpg');
    var file = ps3Folder_(o['روان‌پزشک']).createFile(f.blob.setName(o['کد نوبت'] + ' · ' + what + ' · ' + o['تاریخ'] + '.' + ext));
    return file.getUrl();
  } catch (e) { tgErr_('ps3Save_', e); return 'ذخیره نشد'; }
}
/* ───── نمای مسئول ───── */
function ps3HeadView_(chat) {
  if (!tgPsyIsHead_(chat)) return tgSend_(chat, 'این نما مخصوص مسئول روان‌پزشکی است.');
  var L = ps3Rows_(), today = Utilities.formatDate(new Date(ps3Now_()), TG_TZ, 'yyyy-MM-dd'), wk = Utilities.formatDate(new Date(ps3Now_() + 7 * 86400000), TG_TZ, 'yyyy-MM-dd');
  var up = L.filter(function (o) { return o['تاریخ'] >= today && o['تاریخ'] <= wk && !o['انجام']; });
  var form = L.filter(function (o) { return o['تاریخ'] < today && !o['انجام']; });
  var post = L.filter(function (o) { return o['وضعیت نامه'] === 'در انتظار ارسال'; });
  var unpaid = L.filter(function (o) { return o['انجام'] === 'انجام شد' && o['تسویه'] !== 'تسویه شد'; });
  var T = ['🗂 <b>نمای روان‌پزشکی</b>', '', '<b>هفت روز پیش رو</b> (' + tgFa_(up.length) + ')'];
  up.slice(0, 10).forEach(function (o) { T.push('• ' + tgFa_(o['تاریخ']) + ' ' + tgFa_(o['ساعت']) + ' · <code>' + o['کد نوبت'] + '</code> · ' + o['نوع ویزیت'] + ' · ' + tgEsc_(o['روان‌پزشک'])); });
  T.push('', '<b>فرم بعد از ویزیت مانده</b>: ' + tgFa_(form.length), '<b>نامهٔ پستی برای ارسال</b>: ' + tgFa_(post.length), '<b>تسویه‌نشده</b>: ' + tgFa_(unpaid.length));
  var kb = [];
  form.slice(0, 4).forEach(function (o) { kb.push([{ text: '🩺 فرم ' + o['کد نوبت'], callback_data: 'ps3:d:' + o['کد نوبت'] }, { text: '❌ انجام نشد', callback_data: 'ps3:n:' + o['کد نوبت'] }]); });
  post.slice(0, 4).forEach(function (o) { kb.push([{ text: '📮 ارسال شد ' + o['کد نوبت'], callback_data: 'ps3:ps:' + o['کد نوبت'] }]); });
  unpaid.slice(0, 4).forEach(function (o) { kb.push([{ text: '💳 تسویه شد ' + o['کد نوبت'], callback_data: 'ps3:st:' + o['کد نوبت'] }]); });
  T.push('', 'جزئیات کامل در تب «' + PS3_V_TAB + '» و رد پا در «' + PS3_EV_TAB + '».');
  return tgSend_(chat, T.join('\n'), kb.length ? { inline_keyboard: kb } : null);
}
/* متن و پیام‌های حالت‌دار: نمای مسئول، تکمیل اطلاعات، فایل */
function ps3Route_(chat, m) {
  var t = String((m && m.text) || '').trim();
  if ((m.photo || m.document) && ps3File_(chat, m)) return true;
  if (t === '/psy' || t === PS3_HEAD_BTN) { if (!tgPsyIsHead_(chat)) return false; ps3HeadView_(chat); return true; }
  if (t === PS3_INFO_BTN) { ps3InfoStart_(chat); return true; }
  if (tgGetVal_('ps3i', chat) && t) return ps3InfoText_(chat, t);
  return false;
}

/* ───── تکمیل اطلاعات روان‌پزشک: روزها و ساعت‌ها (وقت هفتگی)، هزینه‌ها، بیمه‌ها، تسویه، بستر ───── */
var PS3_STEPS = [
  { k: 'هزینهٔ ویزیت اول', t: 'money', q: 'هزینهٔ ویزیت اول (تومان)؟ فقط عدد.' },
  { k: 'هزینهٔ پیگیری', t: 'money', q: 'هزینهٔ ویزیت پیگیری (تومان)؟ فقط عدد.' },
  { k: 'بیمه‌های طرف قرارداد', t: 'multi', o: PS3_INS.concat(['هیچ‌کدام']), q: 'بیمه‌های طرف قرارداد شما؟ (هر چند تا، بعد «همین‌ها»)' },
  { k: 'شیوهٔ تسویه', t: 'choice', o: ['مستقیم با من (کارت به کارت)', 'از طریق تجربه'], q: 'شیوهٔ تسویه؟' },
  { k: 'لینک گوگل‌میت', t: 'link', q: 'لینک ثابت گوگل‌میت شما؟ (مثل meet.google.com/…)' },
  { k: 'بستر جایگزین', t: 'choice', o: ['الوکام', 'اسکای‌روم'], q: 'برای روزهای اینترنت ملی، بستر جایگزین؟' },
  { k: 'لینک جایگزین', t: 'link', q: 'لینک اتاق بستر جایگزین؟' }
];
function ps3InfoStart_(chat) {
  var name = ps2DocName_(chat); if (!name) return tgSend_(chat, 'حساب شما هنوز به ردیف روان‌پزشک وصل نیست؛ مسئول روان‌پزشکی وصل می‌کند.');
  tgSetVal_('ps3i', chat, JSON.stringify({ name: name, i: 0, pick: [] }));
  tgSend_(chat, '📝 <b>تکمیل اطلاعات بخش روان‌پزشکی</b>\nاول روزها و ساعت‌هایتان را با «' + TG_PSY_BTN_WEEK + '» بگذارید (هر وقت خواستید). چند سؤال کوتاه:', ps2Menu_());
  return ps3InfoAsk_(chat);
}
function ps3InfoAsk_(chat) {
  var st = {}; try { st = JSON.parse(tgGetVal_('ps3i', chat) || '{}'); } catch (e) {}
  var s = PS3_STEPS[st.i];
  if (!s) { tgDel_('ps3i', chat); tgPsyNotifyHead_('📝 روان‌پزشک ' + tgEsc_(st.name) + ' اطلاعات بخش روان‌پزشکی را کامل کرد (تب «' + PS3_INFO_TAB + '»).', null, 'PSY-INFO'); ps3Ev_('', 'تکمیل اطلاعات', 'روان‌پزشک', '', 'کامل'); return tgSend_(chat, '✅ ممنون؛ اطلاعات ثبت شد. هر وقت خواستید با «' + PS3_INFO_BTN + '» عوضش کنید.', ps2Menu_()); }
  var kb = null;
  if (s.t === 'choice') kb = { inline_keyboard: s.o.map(function (x, i) { return [{ text: x, callback_data: 'ps3:iv:' + st.i + ':' + i }]; }) };
  if (s.t === 'multi') kb = { inline_keyboard: s.o.map(function (x, i) { return [{ text: (st.pick.indexOf(x) > -1 ? '✓ ' : '') + x, callback_data: 'ps3:iv:' + st.i + ':' + i }]; }).concat([[{ text: '✅ همین‌ها', callback_data: 'ps3:iv:' + st.i + ':ok' }]]) };
  return tgSend_(chat, tgFa_(st.i + 1) + ' از ' + tgFa_(PS3_STEPS.length) + ' · ' + s.q, kb);
}
function ps3InfoSave_(name, k, v) {
  if (ps3Dry_()) { var L = TG_MEM['ps3:info'] = TG_MEM['ps3:info'] || []; var o = L.filter(function (x) { return x['روان‌پزشک'] === name; })[0]; if (!o) { o = { 'روان‌پزشک': name }; L.push(o); } o[k] = v; return; }
  var sh = ps3Tab_(PS3_INFO_TAB, PS3_INFO_HEAD), inf = ps3Info_(name), col = PS3_INFO_HEAD.indexOf(k) + 1;
  if (!inf) { sh.appendRow([name]); inf = { row: sh.getLastRow() }; }
  sh.getRange(inf.row, col).setValue(v); sh.getRange(inf.row, PS3_INFO_HEAD.length).setValue(new Date());
}
function ps3InfoNext_(chat, st, val) {
  var s = PS3_STEPS[st.i]; ps3InfoSave_(st.name, s.k, val); ps3Ev_('', 'اطلاعات: ' + s.k, 'روان‌پزشک', '', s.k.indexOf('هزینه') > -1 ? '(ثبت شد)' : val);
  st.i++; st.pick = []; tgSetVal_('ps3i', chat, JSON.stringify(st)); return ps3InfoAsk_(chat);
}
function ps3InfoAns_(chat, i, v) {
  var st = {}; try { st = JSON.parse(tgGetVal_('ps3i', chat) || '{}'); } catch (e) {}
  if (String(st.i) !== String(i)) return null;
  var s = PS3_STEPS[st.i];
  if (s.t === 'choice') return ps3InfoNext_(chat, st, s.o[Number(v)] || '');
  if (v === 'ok') return ps3InfoNext_(chat, st, st.pick.join('، ') || 'هیچ‌کدام');
  var x = s.o[Number(v)]; if (x) { var at = st.pick.indexOf(x); if (at > -1) st.pick.splice(at, 1); else st.pick.push(x); }
  tgSetVal_('ps3i', chat, JSON.stringify(st)); return ps3InfoAsk_(chat);
}
function ps3InfoText_(chat, t) {
  var st = {}; try { st = JSON.parse(tgGetVal_('ps3i', chat) || '{}'); } catch (e) {}
  var s = PS3_STEPS[st.i]; if (!s) return false;
  if (t === '/cancel' || t === 'انصراف') { tgDel_('ps3i', chat); tgSend_(chat, 'باشد؛ هر وقت خواستید با «' + PS3_INFO_BTN + '» ادامه بدهید.', ps2Menu_()); return true; }
  if (s.t === 'money') { var n = Number(String(tgLatinDigits_(t)).replace(/[^0-9]/g, '')); if (!(n >= 1000)) { tgSend_(chat, 'فقط عدد به تومان، مثلاً ۸۰۰۰۰۰.'); return true; } ps3InfoNext_(chat, st, String(n)); return true; }
  if (s.t === 'link') { if (!/^https?:\/\/\S+$|^[\w.-]+\.\w+\/\S*$/.test(t)) { tgSend_(chat, 'لینک کامل را بفرستید.'); return true; } ps3InfoNext_(chat, st, t); return true; }
  tgSend_(chat, 'یکی از دکمه‌ها را بزنید.'); return true;
}

/* ───── خوشامد (متن از PSY_WELCOME؛ یک بار برای هر پزشک) ───── */
function ps3Welcome_(chat, name) {
  var txt = String(cfg_('PSY_WELCOME', '') || '').trim();
  if (!txt) { tgErr_('ps3Welcome_', 'PSY_WELCOME خالی است؛ پیام خوشامد نرفت'); return false; }
  var k = 'PS3_WEL:' + tgNorm_(name);
  if (ps3Dry_() ? TG_MEM['ps3:' + k] : PropertiesService.getScriptProperties().getProperty(k)) return false;
  tgSend_(chat, tgEsc_(txt), { inline_keyboard: [[{ text: PS3_INFO_BTN, callback_data: 'ps3:info' }]] });
  if (ps3Dry_()) TG_MEM['ps3:' + k] = 1; else PropertiesService.getScriptProperties().setProperty(k, '1');
  ps3Ev_('', 'خوشامد', 'بات', '', 'فرستاده شد');
  return true;
}
/* یک‌بارهٔ خودکار v170.23.9: تب‌ها، و خوشامد برای پزشکِ از قبل وصل. فقط شمار. */
function tgV170239PsyVisit() {
  ps3Tab_(PS3_V_TAB, PS3_V_HEAD); ps3Tab_(PS3_EV_TAB, PS3_EV_HEAD); ps3Tab_(PS3_INFO_TAB, PS3_INFO_HEAD);
  var ps = typeof ps2People_ === 'function' ? ps2People_() : [], sent = 0, wait = 0;
  ps.forEach(function (p) { var c = String(p.chat || '').split(/[,،;\s]+/).filter(String)[0]; if (!c) { wait++; return; } if (ps3Welcome_(c, p.name)) sent++; });
  return 'تب‌های ویزیت، رویداد و اطلاعات: آماده · خوشامد فرستاده: ' + sent + ' · منتظر اتصال حساب: ' + wait + (String(cfg_('PSY_WELCOME', '') || '').trim() ? '' : ' · PSY_WELCOME خالی است (خوشامد نمی‌رود)');
}

/* ───── آزمون ───── */
function ps3Tests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'ps3:now': Date.UTC(2026, 9, 10, 6, 0) };
  try {
    TG_MEM['people'] = [{ row: 2, id: 'P-1', name: 'مسئول نمونه', chat: '200', roles: ['روان‌پزشکی'], status: 'فعال' },
                        { row: 3, id: 'P-2', name: 'دکتر نمونه', chat: '500', roles: ['درمانگر', 'روان‌پزشک'], status: 'فعال' }];
    TG_MEM['psynames'] = ['دکتر نمونه'];
    TG_MEM['ps3:info'] = [{ 'روان‌پزشک': 'دکتر نمونه', 'لینک گوگل‌میت': 'https://meet.example/abc', 'بستر جایگزین': 'اسکای‌روم', 'لینک جایگزین': 'https://alt.example/r' }];
    var s = { therapist: 'دکتر نمونه', dateIso: '2026-10-11', hhmm: '10:00' };
    ps3OnBook_({ code: 'PS-A' }, s, '901');
    var o = ps3Find_('PS-A');
    ok('ویزیت اول ۴۰ دقیقه با بستر گوگل‌میت', o && o['نوع ویزیت'] === 'ویزیت اول' && o['مدت'] === '40' && o['بستر'] === 'گوگل‌میت');
    ok('خبر به مراجع و پزشک', JSON.stringify(TG_MEM['notify'] || []).indexOf('901') > -1 && JSON.stringify(TG_MEM['notify'] || []).indexOf('500') > -1);
    /* یادآوری ۲۴ ساعته، یک بار */
    TG_MEM['ps3:now'] = new Date('2026-10-10T11:00:00+03:30').getTime();
    ok('یادآوری یک بار', ps3Tick_() === 1 && ps3Find_('PS-A')['یادآوری'] === 'رفت' && ps3Tick_() === 0);
    /* بعد از ویزیت: فرم اداری */
    TG_MEM['ps3:now'] = new Date('2026-10-11T11:00:00+03:30').getTime();
    ok('بعد از ویزیت فرم به پزشک، یک بار', ps3Tick_() === 1 && ps3Tick_() === 0);
    ps3Cb_('999', 'ps3:d:PS-A');
    ok('غیرپزشک و غیرمسئول راه ندارند', !ps3Find_('PS-A')['انجام']);
    ps3Cb_('500', 'ps3:d:PS-A'); ps3Cb_('500', 'ps3:e0:PS-A');
    ok('انجام شد و نسخهٔ الکترونیک با بیمه', ps3Find_('PS-A')['انجام'] === 'انجام شد' && ps3Find_('PS-A')['بیمه'] === 'تأمین اجتماعی');
    ps3Cb_('500', 'ps3:ls:PS-A');
    ok('اسکن نامه ← پوشهٔ خصوصی، بی نام مراجع', ps3File_('500', { photo: [{ file_id: 'F1' }] }) === true && ps3Find_('PS-A')['نامهٔ تکمیلی'] === 'اسکن' && (TG_MEM['ps3:files'] || [])[0].code === 'PS-A');
    ok('هیچ ستون یادداشت بالینی نیست', PS3_V_HEAD.every(function (h) { return !/یادداشت|تشخیص|شرح حال/.test(h); }));
    /* پیگیری بعدی */
    ps3OnBook_({ code: 'PS-B' }, { therapist: 'دکتر نمونه', dateIso: '2026-10-20', hhmm: '10:00' }, '901');
    ok('نوبت بعدی همان مراجع ← پیگیری ۲۰ دقیقه', ps3Find_('PS-B')['نوع ویزیت'] === 'پیگیری' && ps3Find_('PS-B')['مدت'] === '20');
    /* اینترنت ملی */
    TG_CFG_ = { PSY_NATIONAL_NET: 'بله' };
    ok('اینترنت ملی ← بستر جایگزین', ps3Platform_('دکتر نمونه').link === 'https://alt.example/r');
    TG_CFG_ = null;
    /* پستی و تسویه با مسئول */
    ps3Cb_('500', 'ps3:lp:PS-B'); ps3Cb_('500', 'ps3:ps:PS-B');
    ok('«ارسال شد» فقط مسئول', ps3Find_('PS-B')['وضعیت نامه'] === 'در انتظار ارسال');
    ps3Cb_('200', 'ps3:ps:PS-B'); ps3Cb_('200', 'ps3:st:PS-A');
    ok('مسئول: ارسال نامه و تسویه', ps3Find_('PS-B')['وضعیت نامه'] === 'ارسال شد' && ps3Find_('PS-A')['تسویه'] === 'تسویه شد');
    ok('رد پا برای هر قدم', ['نوبت', 'یادآوری', 'انجام', 'بیمه', 'نامهٔ تکمیلی', 'وضعیت نامه', 'تسویه'].every(function (k) { return (TG_MEM['ps3:ev'] || []).some(function (r) { return r[2] === k; }); }));
    TG_OUTBOX = []; ps3HeadView_('200');
    ok('نمای مسئول', TG_OUTBOX.some(function (x) { return /نمای روان‌پزشکی/.test(x.text); }));
    /* تکمیل اطلاعات و خوشامد */
    ps3InfoStart_('500'); ps3InfoText_('500', '800000'); ps3InfoText_('500', '۵۰۰۰۰۰'); ps3InfoAns_('500', 2, 0); ps3InfoAns_('500', 2, 'ok'); ps3InfoAns_('500', 3, 1);
    var inf = ps3Info_('دکتر نمونه');
    ok('تکمیل اطلاعات: هزینه‌ها، بیمه، تسویه', inf['هزینهٔ ویزیت اول'] === '800000' && inf['هزینهٔ پیگیری'] === '500000' && inf['بیمه‌های طرف قرارداد'] === 'تأمین اجتماعی' && inf['شیوهٔ تسویه'] === 'از طریق تجربه');
    ok('مبلغ در رد پا نمی‌آید', !(TG_MEM['ps3:ev'] || []).some(function (r) { return /800000|500000/.test(r[5]); }));
    TG_CFG_ = { PSY_WELCOME: 'متن خوشامد نمونه' };
    TG_OUTBOX = [];
    ok('خوشامد با دکمهٔ تکمیل اطلاعات، یک بار', ps3Welcome_('500', 'دکتر نمونه') === true && ps3Welcome_('500', 'دکتر نمونه') === false && TG_OUTBOX.some(function (x) { return /متن خوشامد نمونه/.test(x.text) && /ps3:info/.test(JSON.stringify(x.markup)); }));
    TG_CFG_ = { PSY_WELCOME: '' };
    ok('بی PSY_WELCOME خوشامد نمی‌رود', ps3Welcome_('501', 'دکتر دیگر') === false);
    TG_CFG_ = null;
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = null; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'ps3Tests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['روان‌پزشکی: ویزیت و فرم اداری (v170.23.9)', 'ps3Tests']); } catch (ePs3) {}
