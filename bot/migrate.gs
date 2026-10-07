/**
 * migrate.gs · v170.23.6.3 · مهاجرت مراجعان فعلی به نسخهٔ ۲ (سند مرجع: مخزن پل، CLIENT-MIGRATION.md و PIPELINE.md؛ Issueهای ۷، ۸ و ۹)
 *
 * هاب مهاجرت: گوگل‌شیت محرمانه با شناسهٔ کلید MIG_HUB (تنظیمات خصوصی؛ هرگز در کد). برگه‌ها: «مراجعان»، «درمانگران»، «موج‌ها»، «قیف».
 * ستون‌ها همیشه با نام سرستون پیدا می‌شوند، نه شماره. همه‌چیز (جز اشتراک فایل و پیام یک‌بارهٔ همکار نسخهٔ ۲) پشت MIG_ENABLED = «بله».
 *
 * ۱) «👥 مراجعان من» برای درمانگر (Issue ۷): ردیف‌های «مراجعان» با «شناسهٔ درمانگر (P)» همین فرد (شناسهٔ «افراد»).
 *    فقط نام کوچک و ۴ رقم آخر شماره. فعال / متوقف / مال من نیست؛ برای فعال روز، ساعت (تهران)، تناوب و حالت جلسه.
 *    «مراجعی دارم که در فهرست نیست» با منبع «درمانگر». وضعیت ← «۳ تأیید درمانگر» و با زمان کامل «۴ زمان ثبت شد».
 *    هر پاسخ همان لحظه نوشته می‌شود؛ از هر جا رها شد ادامه دارد و هر ردیف دوباره ویرایش‌پذیر است.
 * ۲) همیار پایلوت: پرسش از درمانگرهای پرمراجع؛ سه «بله»ِ اول در «همیار پایلوت؟».
 * ۳) دعوت مراجع (Issue ۸): وقتی همهٔ ردیف‌های یک درمانگر تأیید شد، پیام آمادهٔ قابل فوروارد با لینک start=v2mig (start=mig مال تست مهاجرت mig.gs است) برای خود درمانگر.
 *    مراجع: دکمهٔ «فرستادن شمارهٔ من» (request_contact)؛ تطبیق فقط با شمارهٔ تأییدشدهٔ خود تلگرام (contact.user_id = فرستنده) با ستون E.164.
 *    «درست است» ← «۶ وارد شد» و chat؛ «اصلاح لازم است» یا پیدا نشدن ← «نیازمند پیگیری» و کار برای پذیرش (صندوق یکتا اگر هست، وگرنه کارها).
 *    MIG_V2_LOGIN_URL اگر پر شد، دکمهٔ ورود یک‌لمسی نسخهٔ ۲ بعد از تأیید می‌آید.
 * ۴) گزارش و یادآوری (Issue ۹): ساعت ۲۱ هر شب پیام به یاسر با عدد هر مرحله از «قیف»، درمانگرهای بی‌پاسخ و ردیف‌های گیرکرده بیش از ۴۸ ساعت.
 *    یادآوری به درمانگر بی‌پاسخ در ۲۴ و ۴۸ ساعت؛ در ۷۲ ساعت کار برای پذیرش. پیش از هر موج (روز قبل از «تاریخ شروع» در «موج‌ها»)
 *    پیام به یاسر با چک‌لیست (MIG_CHECKLIST، همان بخش ۹ سند) و «شروع موج» / «صبر».
 * ۵) اشتراک هاب: فقط ویرایشگر برای ایمیل همکار نسخهٔ ۲ (کلید v2dev در TG_NAMES) و مسئول پذیرش، از ستون «ایمیل» برگهٔ «افراد».
 * ۶) پیام یک‌باره به همکار نسخهٔ ۲: متن کامل از MIG_V2DEV_MSG (نام‌ها فقط آنجا)؛ پاسخ او در صندوق پیام ثبت و برای یاسر فرستاده می‌شود.
 * هیچ نام، شماره یا شناسه‌ای در لاگ یا خروجی یک‌باره‌ها نمی‌آید؛ فقط شمار.
 */
var MIG_TABS = { c: 'مراجعان', t: 'درمانگران', w: 'موج‌ها', f: 'قیف' };
var MIG_ST = { raw: '۱ خام', match: '۲ تطبیق‌شده', ok: '۳ تأیید درمانگر', time: '۴ زمان ثبت شد', inv: '۵ دعوت شد', in: '۶ وارد شد', v2: '۷ اولین جلسه در v2', done: '۸ منتقل شد', stop: 'متوقف', follow: 'نیازمند پیگیری' };
var MIG_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
var MIG_FREQ = ['هفتگی', 'دوهفته‌ای', 'نامنظم'];
var MIG_MODE = ['آنلاین', 'حضوری'];
var MIG_ANS = { a: 'فعال', s: 'متوقف', n: 'مال من نیست' };
var MIG_BTN = '👥 مراجعان من';
var MIG_PILOT_N = 3;
cfg_('MIG_HUB', '');            /* شناسهٔ هاب مهاجرت مراجعان (محرمانه) */
cfg_('MIG_ENABLED', '');        /* «بله» = روشن */
cfg_('MIG_CHECKLIST', '');      /* متن چک‌لیست پیش از موج (بخش ۹ CLIENT-MIGRATION.md) */
cfg_('MIG_INVITE_TEXT', '');    /* متن پیام قابل فوروارد درمانگر به مراجع؛ {link} جای لینک */
cfg_('MIG_V2_LOGIN_URL', '');   /* ورود یک‌لمسی نسخهٔ ۲، وقتی آماده شد */
cfg_('MIG_V2DEV_MSG', '');      /* متن کامل پیام یک‌باره به همکار نسخهٔ ۲ */

function migDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function migOn_() { return String(cfg_('MIG_ENABLED', '') || '').trim() === 'بله' && (migDry_() || !!String(cfg_('MIG_HUB', '') || '').trim()); }
function migNow_() { return migDry_() && TG_MEM['mig:now'] ? Number(TG_MEM['mig:now']) : Date.now(); }
function migFmt_(ms) { return Utilities.formatDate(new Date(ms || migNow_()), TG_TZ, 'yyyy-MM-dd HH:mm'); }
function migProp_(k, v) {
  if (migDry_()) { if (v !== undefined) TG_MEM['migp:' + k] = v; return TG_MEM['migp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}

/* ───── دسترسی به برگه‌ها با نام سرستون ───── */
var MIG_SS_ = null;
function migSS_() { if (!MIG_SS_) MIG_SS_ = SpreadsheetApp.openById(String(cfg_('MIG_HUB', '')).trim()); return MIG_SS_; }
/** {head, rows: [{_row, <سرستون>: مقدار}], set(row, سرستون، مقدار), add(obj)} */
function migTab_(key) {
  var name = MIG_TABS[key];
  if (migDry_()) {
    var D = TG_MEM['mig:' + key] = TG_MEM['mig:' + key] || [];
    D.forEach(function (o, i) { o._row = i + 2; });
    return { rows: D, set: function (r, h, v) { var o = D[r - 2]; if (o) o[h] = v; }, add: function (o) { D.push(o); o._row = D.length + 1; return o; } };
  }
  var sh = migSS_().getSheetByName(name); if (!sh) throw new Error('برگهٔ ' + name + ' در هاب مهاجرت نیست');
  var lc = sh.getLastColumn(), head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  var n = sh.getLastRow(), v = n > 1 ? sh.getRange(2, 1, n - 1, lc).getValues() : [];
  var rows = v.map(function (r, i) { var o = { _row: i + 2 }; head.forEach(function (h, j) { if (h) o[h] = r[j] instanceof Date ? migFmt_(r[j].getTime()) : String(r[j] == null ? '' : r[j]).trim(); }); return o; });
  return {
    rows: rows, head: head,
    set: function (r, h, val) { var c = head.indexOf(h); if (c < 0) { tgErr_('migTab_', 'ستون «' + h + '» در ' + name + ' نیست'); return; } sh.getRange(r, c + 1).setValue(val); },
    add: function (o) { sh.appendRow(head.map(function (h) { return o[h] === undefined ? '' : o[h]; })); o._row = sh.getLastRow(); rows.push(o); return o; }
  };
}
function migE164_(s) {
  var d = String(tgLatinDigits_(String(s || ''))).replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.indexOf('+') === 0) return '+' + d.slice(1).replace(/\D/g, '');
  if (d.indexOf('00') === 0) return '+' + d.slice(2);
  if (/^09\d{9}$/.test(d)) return '+98' + d.slice(1);
  if (/^9\d{9}$/.test(d)) return '+98' + d;
  return '+' + d;
}
function migLast4_(p) { var d = String(p || '').replace(/\D/g, ''); return d ? tgFa_(d.slice(-4)) : '؟'; }
function migFirst_(n) { return String(n || '').trim().split(/\s+/)[0] || 'بی‌نام'; }

/* ───── درمانگر: شناسهٔ P و ردیف‌هایش ───── */
function migMe_(chat) {
  var p = (typeof tgPeopleList_ === 'function' ? tgPeopleList_() : []).filter(function (x) { return String(x.chat || '').split(/[,،;\s]+/).indexOf(String(chat)) > -1 && x.id; })[0];
  return p ? { p: p.id, name: p.name } : null;
}
function migMine_(P) { return migTab_('c').rows.filter(function (o) { return o['شناسهٔ درمانگر (P)'] === P && [MIG_ST.raw].indexOf(o['وضعیت']) < 0; }); }
function migOpen_(o) { return !o['تأیید درمانگر'] || (o['تأیید درمانگر'] === MIG_ANS.a && !(o['روز جلسه'] && o['ساعت جلسه (تهران)'] && o['تناوب'] && o['حالت جلسه'])); }
function migRowLine_(o) {
  var a = o['تأیید درمانگر'], when = o['روز جلسه'] ? ' · ' + o['روز جلسه'] + ' ' + tgFa_(o['ساعت جلسه (تهران)'] || '') : '';
  return (migOpen_(o) ? '⏳ ' : a === MIG_ANS.a ? '✅ ' : '▫️ ') + tgEsc_(migFirst_(o['نام'])) + ' · ' + migLast4_(o['شمارهٔ تماس (E.164)']) + (a ? ' · ' + a : '') + when;
}
function migList_(chat) {
  var me = migMe_(chat); if (!me) return tgSend_(chat, 'حساب شما هنوز به ردیف «افراد» وصل نیست؛ پذیرش وصل می‌کند.');
  var L = migMine_(me.p), open = L.filter(migOpen_).length;
  var T = ['👥 <b>مراجعان من</b>', L.length ? 'برای انتقال به نسخهٔ ۲، هر ردیف را بزنید و وضعیتش را بگویید. هر پاسخ همان لحظه ذخیره می‌شود.' : 'هنوز ردیفی برای شما در فهرست مهاجرت نیست.', ''];
  L.slice(0, 40).forEach(function (o) { T.push(migRowLine_(o)); });
  if (L.length) T.push('', open ? '⏳ ' + tgFa_(open) + ' ردیف مانده' : '✅ همه تأیید شد. ممنون.');
  var kb = L.slice(0, 40).map(function (o) { return [{ text: (migOpen_(o) ? '⏳ ' : '✏️ ') + migFirst_(o['نام']) + ' · ' + migLast4_(o['شمارهٔ تماس (E.164)']), callback_data: 'mig:r:' + o['کد مهاجرت'] }]; });
  kb.push([{ text: '➕ مراجعی دارم که در فهرست نیست', callback_data: 'mig:add' }]);
  return tgSend_(chat, T.join('\n'), { inline_keyboard: kb });
}
function migFind_(code) { return migTab_('c').rows.filter(function (o) { return o['کد مهاجرت'] === code; })[0] || null; }
function migMayEdit_(chat, o) { var me = migMe_(chat); return !!(me && o && o['شناسهٔ درمانگر (P)'] === me.p); }
function migSet_(o, ch) {
  var t = migTab_('c');
  Object.keys(ch).forEach(function (h) { o[h] = ch[h]; t.set(o._row, h, ch[h]); });
}
/** وضعیت ردیف بعد از پاسخ درمانگر */
function migStatus_(o) {
  var a = o['تأیید درمانگر'];
  if (a === MIG_ANS.s) return MIG_ST.stop;
  if (a === MIG_ANS.n) return MIG_ST.follow;
  if (a === MIG_ANS.a) return (o['روز جلسه'] && o['ساعت جلسه (تهران)'] && o['تناوب'] && o['حالت جلسه']) ? MIG_ST.time : MIG_ST.ok;
  return o['وضعیت'];
}
function migAnswer_(chat, o, ch) {
  ch['تاریخ تأیید درمانگر'] = migFmt_();
  var x = {}; Object.keys(o).forEach(function (k) { x[k] = o[k]; }); Object.keys(ch).forEach(function (k) { x[k] = ch[k]; });
  var st = migStatus_(x);
  if ([MIG_ST.inv, MIG_ST.in, MIG_ST.v2, MIG_ST.done].indexOf(o['وضعیت']) < 0) ch['وضعیت'] = st;
  migSet_(o, ch);
  if (ch['تأیید درمانگر'] === MIG_ANS.n) migReception_('درمانگر گفت این مراجع مال او نیست', o['کد مهاجرت']);
  migTherSync_(o['شناسهٔ درمانگر (P)']);
}
function migCard_(chat, o) {
  var a = o['تأیید درمانگر'];
  var T = ['<b>' + tgEsc_(migFirst_(o['نام'])) + '</b> · ' + migLast4_(o['شمارهٔ تماس (E.164)']) + ' · <code>' + tgEsc_(o['کد مهاجرت']) + '</code>'];
  if (a) T.push('وضعیت: ' + a + (o['روز جلسه'] ? ' · ' + o['روز جلسه'] + ' ' + tgFa_(o['ساعت جلسه (تهران)'] || '') + ' · ' + (o['تناوب'] || '') + ' · ' + (o['حالت جلسه'] || '') : ''));
  T.push('', 'این مراجع الان با شماست؟');
  var c = o['کد مهاجرت'];
  return tgSend_(chat, T.join('\n'), { inline_keyboard: [[{ text: '✅ فعال', callback_data: 'mig:a:' + c }, { text: '⏸ متوقف', callback_data: 'mig:s:' + c }], [{ text: 'مال من نیست', callback_data: 'mig:n:' + c }], [{ text: '↩️ فهرست', callback_data: 'mig:l' }]] });
}
function migAskDay_(chat, c) { return tgSend_(chat, 'جلسه کدام روز هفته است؟', { inline_keyboard: [MIG_DAYS.slice(0, 4), MIG_DAYS.slice(4)].map(function (r) { return r.map(function (d) { return { text: d, callback_data: 'mig:d:' + c + ':' + MIG_DAYS.indexOf(d) }; }); }) }); }
function migAskHour_(chat, c) {
  var hs = []; for (var h = 7; h <= 22; h++) hs.push(h);
  var rows = []; for (var i = 0; i < hs.length; i += 4) rows.push(hs.slice(i, i + 4).map(function (h) { return { text: tgFa_(('0' + h).slice(-2)), callback_data: 'mig:h:' + c + ':' + h }; }));
  return tgSend_(chat, 'ساعت شروع جلسه (به وقت تهران)؟', { inline_keyboard: rows });
}
function migAskMin_(chat, c, h) { return tgSend_(chat, 'دقیقه؟', { inline_keyboard: [[0, 15, 30, 45].map(function (m) { return { text: tgFa_(('0' + h).slice(-2) + ':' + ('0' + m).slice(-2)), callback_data: 'mig:m:' + c + ':' + h + ':' + m }; })] }); }
function migAskFreq_(chat, c) { return tgSend_(chat, 'تناوب جلسه‌ها؟', { inline_keyboard: [MIG_FREQ.map(function (f, i) { return { text: f, callback_data: 'mig:f:' + c + ':' + i }; })] }); }
function migAskMode_(chat, c) { return tgSend_(chat, 'آنلاین یا حضوری؟', { inline_keyboard: [MIG_MODE.map(function (f, i) { return { text: f, callback_data: 'mig:o:' + c + ':' + i }; })] }); }
/** قدم بعدی برای ردیف فعال (ادامه از جای رهاشده) */
function migNext_(chat, o) {
  var c = o['کد مهاجرت'];
  if (o['تأیید درمانگر'] !== MIG_ANS.a) return migCard_(chat, o);
  if (!o['روز جلسه']) return migAskDay_(chat, c);
  if (!o['ساعت جلسه (تهران)']) return migAskHour_(chat, c);
  if (!o['تناوب']) return migAskFreq_(chat, c);
  if (!o['حالت جلسه']) return migAskMode_(chat, c);
  tgSend_(chat, '✅ ثبت شد: ' + tgEsc_(migFirst_(o['نام'])) + ' · ' + o['روز جلسه'] + ' ' + tgFa_(o['ساعت جلسه (تهران)']) + ' · ' + o['تناوب'] + ' · ' + o['حالت جلسه'], { inline_keyboard: [[{ text: '✏️ ویرایش همین ردیف', callback_data: 'mig:e:' + c }], [{ text: '↩️ فهرست', callback_data: 'mig:l' }]] });
  return migAfterAll_(chat);
}
/** وقتی هیچ ردیف بازی نماند: پیام قابل فوروارد برای دعوت مراجعان (یک بار) */
function migAfterAll_(chat) {
  var me = migMe_(chat); if (!me) return null;
  var L = migMine_(me.p); if (!L.length || L.some(migOpen_)) return null;
  var k = 'MIG_INV_SENT:' + me.p; if (migProp_(k)) return null;
  var act = L.filter(function (o) { return o['وضعیت'] === MIG_ST.time; }); if (!act.length) return null;
  migProp_(k, String(migNow_()));
  var link = 'https://t.me/tajrobehlife_bot?start=v2mig';
  var txt = String(cfg_('MIG_INVITE_TEXT', '') || '').trim() || 'سلام. جلسه‌های ما از این پس در نسخهٔ تازهٔ تجربه ادامه پیدا می‌کند. لطفاً از این لینک وارد شوید و شماره‌تان را تأیید کنید: {link}';
  tgSend_(chat, '📨 <b>همه تأیید شد. ممنون.</b>\nپیام زیر را برای مراجعانتان فوروارد کنید (هر کدام فقط با شمارهٔ خودش وارد می‌شود):');
  tgSend_(chat, tgEsc_(txt.replace('{link}', link)));
  var t = migTab_('c');
  act.forEach(function (o) { var ch = { 'وضعیت': MIG_ST.inv, 'مسیر دعوت': 'فوروارد درمانگر', 'تاریخ دعوت': migFmt_() }; Object.keys(ch).forEach(function (h) { o[h] = ch[h]; t.set(o._row, h, ch[h]); }); });
  migTherSync_(me.p);
  return act.length;
}
/* شمارهای همان درمانگر در «درمانگران» */
function migTherSync_(P) {
  try {
    var T = migTab_('t'), r = T.rows.filter(function (x) { return x['شناسهٔ درمانگر (P)'] === P; })[0]; if (!r) return;
    var L = migTab_('c').rows.filter(function (o) { return o['شناسهٔ درمانگر (P)'] === P; });
    var n = function (f) { return L.filter(f).length; };
    var ch = { 'تأییدشده': n(function (o) { return o['تأیید درمانگر'] === MIG_ANS.a; }), 'متوقف یا نادرست': n(function (o) { return o['تأیید درمانگر'] === MIG_ANS.s || o['تأیید درمانگر'] === MIG_ANS.n; }),
      'اضافه‌شده توسط درمانگر': n(function (o) { return o['منبع'] === 'درمانگر'; }), 'بی‌زمان': n(function (o) { return o['تأیید درمانگر'] === MIG_ANS.a && !(o['روز جلسه'] && o['ساعت جلسه (تهران)']); }),
      'وضعیت پاسخ': L.some(migOpen_) ? (L.some(function (o) { return o['تأیید درمانگر']; }) ? 'نیمه' : 'منتظر') : 'کامل' };
    Object.keys(ch).forEach(function (h) { r[h] = ch[h]; T.set(r._row, h, ch[h]); });
  } catch (e) { tgErr_('migTherSync_', e); }
}
function migNextCode_() {
  var mx = 0; migTab_('c').rows.forEach(function (o) { var m = /^M-(\d+)$/.exec(o['کد مهاجرت'] || ''); if (m) mx = Math.max(mx, +m[1]); });
  return 'M-' + ('000' + (mx + 1)).slice(-4);
}

/* ───── کال‌بک‌ها ───── */
function migCb_(chat, data) {
  var a = String(data).split(':'), act = a[1], c = a[2] || '';
  if (act === 'pilot') return migPilotAns_(chat, a[2]);
  if (act === 'wave') return migWaveAns_(chat, a[2], a[3]);
  if (act === 'cok' || act === 'cfx') return migClientAns_(chat, act, c);
  if (!migOn_()) return tgSend_(chat, 'این بخش هنوز روشن نیست.');
  if (act === 'l') return migList_(chat);
  if (act === 'add') { tgSetVal_('migadd', chat, JSON.stringify({ step: 'name' })); return tgSend_(chat, 'نام مراجع؟ (فقط برای تطبیق؛ جایی منتشر نمی‌شود)'); }
  var o = migFind_(c);
  if (!o || !migMayEdit_(chat, o)) return tgSend_(chat, 'این ردیف پیدا نشد یا مال شما نیست.');
  if (act === 'r' || act === 'e') return act === 'e' ? migCard_(chat, o) : migNext_(chat, o);
  if (act === 'a' || act === 's' || act === 'n') {
    var ch = { 'تأیید درمانگر': MIG_ANS[act] };
    migAnswer_(chat, o, ch);
    if (act === 'a') return migNext_(chat, o);
    tgSend_(chat, '✅ ثبت شد: ' + MIG_ANS[act] + '.');
    return migAfterAll_(chat) || migList_(chat);
  }
  if (act === 'd') { migAnswer_(chat, o, { 'روز جلسه': MIG_DAYS[Number(a[3])] || '' }); return migNext_(chat, o); }
  if (act === 'h') return migAskMin_(chat, c, Number(a[3]));
  if (act === 'm') { migAnswer_(chat, o, { 'ساعت جلسه (تهران)': ('0' + a[3]).slice(-2) + ':' + ('0' + a[4]).slice(-2) }); return migNext_(chat, o); }
  if (act === 'f') { migAnswer_(chat, o, { 'تناوب': MIG_FREQ[Number(a[3])] || '' }); return migNext_(chat, o); }
  if (act === 'o') { migAnswer_(chat, o, { 'حالت جلسه': MIG_MODE[Number(a[3])] || '' }); return migNext_(chat, o); }
  return null;
}
/* مراجع تازه از درمانگر: نام و شماره، بعد همان قدم‌های فعال */
function migAddText_(chat, t) {
  var st = {}; try { st = JSON.parse(tgGetVal_('migadd', chat) || '{}'); } catch (e) {}
  if (t === '/cancel' || t === 'انصراف') { tgDel_('migadd', chat); tgSend_(chat, 'لغو شد.'); return true; }
  if (st.step === 'name') { if (String(t).trim().length < 2) { tgSend_(chat, 'نام را بنویسید.'); return true; } st.name = String(t).trim().slice(0, 60); st.step = 'phone'; tgSetVal_('migadd', chat, JSON.stringify(st)); tgSend_(chat, 'شمارهٔ تماس مراجع؟ (با کد کشور اگر خارج از ایران است)'); return true; }
  if (st.step === 'phone') {
    var ph = migE164_(t); if (!/^\+\d{8,15}$/.test(ph)) { tgSend_(chat, 'شماره درست خوانده نشد؛ دوباره بفرستید.'); return true; }
    tgDel_('migadd', chat);
    var me = migMe_(chat); if (!me) { tgSend_(chat, 'حساب شما هنوز به «افراد» وصل نیست.'); return true; }
    var dup = migTab_('c').rows.filter(function (o) { return o['شمارهٔ تماس (E.164)'] === ph; })[0];
    if (dup) { tgSend_(chat, 'این شماره از قبل در فهرست است.'); if (dup['شناسهٔ درمانگر (P)'] === me.p) migNext_(chat, dup); else migReception_('درمانگر شماره‌ای اضافه کرد که به درمانگر دیگری نسبت داده شده', dup['کد مهاجرت']); return true; }
    var o = migTab_('c').add({ 'کد مهاجرت': migNextCode_(), 'وضعیت': MIG_ST.ok, 'منبع': 'درمانگر', 'نام': st.name, 'شمارهٔ تماس (E.164)': ph, 'درمانگر': me.name, 'شناسهٔ درمانگر (P)': me.p, 'تأیید درمانگر': MIG_ANS.a, 'تاریخ تأیید درمانگر': migFmt_() });
    migTherSync_(me.p);
    migNext_(chat, o);
    return true;
  }
  return false;
}

/* ───── مراجع: start=mig ───── */
var MIG_CONTACT_KB = { keyboard: [[{ text: '📱 فرستادن شمارهٔ من', request_contact: true }], [{ text: '↩️ بازگشت' }]], resize_keyboard: true, one_time_keyboard: true };
function migClientStart_(chat) {
  tgSetVal_('migc', chat, '1');
  return tgSend_(chat, 'برای ادامهٔ جلسه‌هایتان در نسخهٔ تازهٔ تجربه، شمارهٔ تلگرامتان را با دکمهٔ زیر بفرستید. فقط با همین شماره پیدایتان می‌کنیم.', MIG_CONTACT_KB);
}
function migClientContact_(chat, m) {
  tgDel_('migc', chat);
  var ct = m.contact;
  if (!ct || String(ct.user_id || '') !== String(m.from && m.from.id)) { tgSend_(chat, 'لطفاً فقط شمارهٔ خودتان را با همان دکمه بفرستید.', MIG_CONTACT_KB); tgSetVal_('migc', chat, '1'); return true; }
  var ph = migE164_(ct.phone_number), t = migTab_('c');
  var o = t.rows.filter(function (x) { return x['شمارهٔ تماس (E.164)'] === ph && [MIG_ST.stop].indexOf(x['وضعیت']) < 0; })[0];
  if (!o) {
    t.add({ 'کد مهاجرت': migNextCode_(), 'وضعیت': MIG_ST.follow, 'منبع': 'خود مراجع', 'نام': [ct.first_name, ct.last_name].filter(String).join(' '), 'شمارهٔ تماس (E.164)': ph, 'chat تلگرام': String(chat), 'مشکل': 'شماره در فهرست مهاجرت نبود' });
    migReception_('مراجعی با شماره‌ای آمد که در فهرست مهاجرت نیست', '');
    tgSend_(chat, 'شماره‌تان را در فهرست پیدا نکردیم. پذیرش همین روزها با شما تماس می‌گیرد. ممنون از صبرتان.', { remove_keyboard: true });
    return true;
  }
  var when = o['روز جلسه'] ? o['روز جلسه'] + ' ساعت ' + tgFa_(o['ساعت جلسه (تهران)'] || '') : 'زمان ثبت‌نشده';
  migSet_(o, { 'chat تلگرام': String(chat) });
  tgSend_(chat, 'شما مراجع <b>' + tgEsc_(o['درمانگر'] || 'درمانگر') + '</b> هستید و جلسه‌تان <b>' + tgEsc_(when) + '</b> است؟', { inline_keyboard: [[{ text: '✅ درست است', callback_data: 'mig:cok:' + o['کد مهاجرت'] }, { text: '✏️ اصلاح لازم است', callback_data: 'mig:cfx:' + o['کد مهاجرت'] }]] });
  return true;
}
function migClientAns_(chat, act, c) {
  var o = migFind_(c); if (!o || String(o['chat تلگرام']) !== String(chat)) return tgSend_(chat, 'این مورد پیدا نشد.');
  if (act === 'cok') {
    migSet_(o, { 'وضعیت': MIG_ST.in, 'تأیید مراجع': 'بله · ' + migFmt_() });
    var url = String(cfg_('MIG_V2_LOGIN_URL', '') || '').trim();
    return tgSend_(chat, '✅ ثبت شد. ممنون؛ جلسهٔ بعدی‌تان در نسخهٔ تازه برقرار است.', url ? { inline_keyboard: [[{ text: 'ورود به نسخهٔ تازه', url: url }]] } : { remove_keyboard: true });
  }
  migSet_(o, { 'وضعیت': MIG_ST.follow, 'تأیید مراجع': 'اصلاح لازم · ' + migFmt_(), 'مشکل': 'مراجع گفت اطلاعات جلسه اصلاح لازم دارد' });
  migReception_('مراجع گفت درمانگر یا زمان جلسه اصلاح لازم دارد', c);
  return tgSend_(chat, 'ممنون که گفتید. پذیرش برای اصلاح با شما تماس می‌گیرد.', { remove_keyboard: true });
}
/** کار برای پذیرش؛ از صندوق یکتا اگر هست، وگرنه کارها. فقط کد مهاجرت، بی نام. */
function migReception_(why, code) {
  var title = 'مهاجرت: ' + why + (code ? ' · ' + code : '');
  try {
    if (typeof inbAdd_ === 'function') { inbAdd_('mig', code || ('MIG-' + migNow_()), { text: title, q: 'پذیرش' }); return; }
    if (typeof opsAdd_ === 'function') opsAdd_({ title: title, cat: 'لید و پذیرش', pri: 'بالا', owner: tgNm_('reception'), due: new Date(migNow_() + 24 * 3600000), src: 'مهاجرت', ref: 'MIG:' + (code || migNow_()) });
    if (migDry_()) (TG_MEM['mig:tasks'] = TG_MEM['mig:tasks'] || []).push(title);
  } catch (e) { tgErr_('migReception_', e); }
}

/* ───── همیار پایلوت ───── */
function migPilotAsk_(n) {
  var T = migTab_('t'), C = migTab_('c').rows, cnt = {};
  C.forEach(function (o) { var p = o['شناسهٔ درمانگر (P)']; if (p) cnt[p] = (cnt[p] || 0) + 1; });
  var list = T.rows.filter(function (r) { return r['شناسهٔ درمانگر (P)'] && !r['همیار پایلوت؟']; })
    .sort(function (a, b) { return (cnt[b['شناسهٔ درمانگر (P)']] || Number(b['مراجعان در خروجی v1']) || 0) - (cnt[a['شناسهٔ درمانگر (P)']] || Number(a['مراجعان در خروجی v1']) || 0); }).slice(0, n || 8);
  var people = typeof tgPeopleList_ === 'function' ? tgPeopleList_() : [], sent = 0;
  list.forEach(function (r) {
    var p = people.filter(function (x) { return x.id === r['شناسهٔ درمانگر (P)']; })[0], c = p ? String(p.chat || '').split(/[,،;\s]+/)[0] : '';
    if (!c) return;
    tgNotify_(c, TG_NK.task, '👋 برای انتقال مراجعان فعلی به نسخهٔ ۲ چند همیار لازم داریم که اول خودشان مسیر را امتحان کنند.\n\n<b>می‌خواهید جزو همیارهای مهاجرت باشید؟</b>', { ref: 'MIG-PILOT', markup: { inline_keyboard: [[{ text: 'بله', callback_data: 'mig:pilot:y' }, { text: 'نه، ممنون', callback_data: 'mig:pilot:n' }]] } });
    T.set(r._row, 'همیار پایلوت؟', 'پرسیده شد'); r['همیار پایلوت؟'] = 'پرسیده شد';
    sent++;
  });
  return sent;
}
function migPilotAns_(chat, ans) {
  var me = migMe_(chat); if (!me) return tgSend_(chat, 'حساب شما به «افراد» وصل نیست.');
  var T = migTab_('t'), r = T.rows.filter(function (x) { return x['شناسهٔ درمانگر (P)'] === me.p; })[0]; if (!r) return tgSend_(chat, 'ردیف شما در فهرست مهاجرت نیست.');
  if (ans !== 'y') { T.set(r._row, 'همیار پایلوت؟', 'نه'); return tgSend_(chat, 'باشد، ممنون.'); }
  var yes = T.rows.filter(function (x) { return x['همیار پایلوت؟'] === 'بله'; }).length;
  if (r['همیار پایلوت؟'] === 'بله') return tgSend_(chat, 'از قبل ثبت شده‌اید. ممنون.');
  if (yes >= MIG_PILOT_N) { T.set(r._row, 'همیار پایلوت؟', 'ذخیره'); return tgSend_(chat, 'ممنون. فعلاً سه همیار داریم؛ اسم شما برای موج‌های بعد ثبت شد.'); }
  T.set(r._row, 'همیار پایلوت؟', 'بله'); r['همیار پایلوت؟'] = 'بله';
  if (TG_OWNER_CHAT) tgNotify_(String(TG_OWNER_CHAT), TG_NK.report, '🤝 همیار پایلوت مهاجرت: ' + tgEsc_(me.name) + ' (' + tgFa_(yes + 1) + ' از ' + tgFa_(MIG_PILOT_N) + ')', { ref: 'MIG-PILOT' });
  tgSend_(chat, '🙏 ممنون. شما همیار مهاجرت هستید؛ از همین حالا «' + MIG_BTN + '» برایتان باز است.');
  return migList_(chat);
}

/* ───── موج‌ها، گزارش و یادآوری ───── */
function migWaveAsk_() {
  var W = migTab_('w'), tomorrow = Utilities.formatDate(new Date(migNow_() + 86400000), TG_TZ, 'yyyy-MM-dd'), today = Utilities.formatDate(new Date(migNow_()), TG_TZ, 'yyyy-MM-dd');
  var w = W.rows.filter(function (r) { var d = String(r['تاریخ شروع'] || '').slice(0, 10); return (d === tomorrow || d === today) && !r['تصمیم ادامه']; })[0];
  if (!w) return false;
  var k = 'MIG_WAVE_ASK:' + w['موج'] + ':' + today; if (migProp_(k)) return false; migProp_(k, '1');
  var cl = String(cfg_('MIG_CHECKLIST', '') || '').trim() || '(چک‌لیست بخش ۹ در تنظیمات خصوصی، کلید MIG_CHECKLIST، نیست)';
  if (TG_OWNER_CHAT) tgNotify_(String(TG_OWNER_CHAT), TG_NK.task, '🌊 <b>موج ' + tgEsc_(w['موج']) + ' مهاجرت</b> · شروع ' + tgEsc_(String(w['تاریخ شروع']).slice(0, 10)) + '\n\n' + tgEsc_(cl), { ref: 'MIG-WAVE', markup: { inline_keyboard: [[{ text: '▶️ شروع موج', callback_data: 'mig:wave:go:' + w['موج'] }, { text: '⏸ صبر', callback_data: 'mig:wave:wait:' + w['موج'] }]] } });
  return true;
}
function migWaveAns_(chat, act, wave) {
  if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, 'این دکمه مخصوص یاسر است.');
  var W = migTab_('w'), w = W.rows.filter(function (r) { return String(r['موج']) === String(wave); })[0]; if (!w) return tgSend_(chat, 'موج پیدا نشد.');
  if (act !== 'go') { W.set(w._row, 'تصمیم ادامه', 'صبر · ' + migFmt_()); return tgSend_(chat, '⏸ موج ' + tgEsc_(wave) + ' صبر کرد. فردا دوباره می‌پرسم.'); }
  W.set(w._row, 'تصمیم ادامه', 'شروع · ' + migFmt_());
  var n = migWaveStart_(wave);
  return tgSend_(chat, '▶️ موج ' + tgEsc_(wave) + ' شروع شد: پیام «' + MIG_BTN + '» برای ' + tgFa_(n) + ' درمانگر رفت.');
}
/** شروع موج: هر درمانگر همان موج پیام بازبینی فهرست می‌گیرد؛ زمان پرسش برای یادآوری‌ها */
function migWaveStart_(wave) {
  var T = migTab_('t'), people = typeof tgPeopleList_ === 'function' ? tgPeopleList_() : [], n = 0;
  T.rows.filter(function (r) { return String(r['موج']) === String(wave) && r['شناسهٔ درمانگر (P)']; }).forEach(function (r) {
    var p = people.filter(function (x) { return x.id === r['شناسهٔ درمانگر (P)']; })[0], c = p ? String(p.chat || '').split(/[,،;\s]+/)[0] : '';
    if (!c) return;
    tgNotify_(c, TG_NK.task, '👥 <b>انتقال مراجعان به نسخهٔ ۲</b>\nفهرست مراجعان فعلی‌تان آماده است. لطفاً هر ردیف را تأیید کنید و روز و ساعت جلسه را بگویید؛ چند دقیقه بیشتر نیست.', { ref: 'MIG-WAVE', markup: { inline_keyboard: [[{ text: MIG_BTN, callback_data: 'mig:l' }]] } });
    T.set(r._row, 'آخرین یادآوری', migFmt_()); T.set(r._row, 'وضعیت پاسخ', 'منتظر');
    migProp_('MIG_ASK:' + r['شناسهٔ درمانگر (P)'], String(migNow_()));
    n++;
  });
  return n;
}
/** ساعتی: یادآوری ۲۴ و ۴۸ ساعت، کار پذیرش در ۷۲؛ گزارش ۲۱؛ پرسش پیش از موج */
function migTick_() {
  if (!migOn_()) return 0;
  var now = migNow_(), h = Number(Utilities.formatDate(new Date(now), TG_TZ, 'H')), n = 0;
  try {
    var T = migTab_('t'), C = migTab_('c').rows, people = typeof tgPeopleList_ === 'function' ? tgPeopleList_() : [];
    T.rows.forEach(function (r) {
      var P = r['شناسهٔ درمانگر (P)'], at = Number(migProp_('MIG_ASK:' + P) || 0); if (!P || !at) return;
      var open = C.filter(function (o) { return o['شناسهٔ درمانگر (P)'] === P && migOpen_(o); }).length; if (!open) return;
      var age = (now - at) / 3600000, step = Number(migProp_('MIG_REM:' + P) || 0);
      var want = age >= 72 ? 3 : age >= 48 ? 2 : age >= 24 ? 1 : 0;
      if (want <= step || h < 9 || h >= 21) return;
      migProp_('MIG_REM:' + P, String(want));
      if (want === 3) { migReception_('درمانگر ۷۲ ساعت به فهرست مهاجرت پاسخ نداده (' + tgFa_(open) + ' ردیف باز)', P); n++; return; }
      var p = people.filter(function (x) { return x.id === P; })[0], c = p ? String(p.chat || '').split(/[,،;\s]+/)[0] : '';
      if (c) tgNotify_(c, TG_NK.remind, '⏰ یادآوری: ' + tgFa_(open) + ' ردیف از فهرست مراجعان‌تان هنوز تأیید نشده.', { ref: 'MIG-REM', markup: { inline_keyboard: [[{ text: MIG_BTN, callback_data: 'mig:l' }]] } });
      T.set(r._row, 'آخرین یادآوری', migFmt_());
      n++;
    });
  } catch (e) { tgErr_('migTick_ یادآوری', e); }
  try { if (h >= 10) migWaveAsk_(); } catch (e2) { tgErr_('migWaveAsk_', e2); }
  try { if (h >= 21) migNightly_(); } catch (e3) { tgErr_('migNightly_', e3); }
  return n;
}
function migNightly_() {
  var day = Utilities.formatDate(new Date(migNow_()), TG_TZ, 'yyyy-MM-dd');
  if (migProp_('MIG_NIGHT') === day) return false; migProp_('MIG_NIGHT', day);
  var L = ['🌙 <b>مهاجرت مراجعان · امشب</b>', ''];
  try { migTab_('f').rows.forEach(function (r) { if (r['مرحله']) L.push('• ' + tgEsc_(r['مرحله']) + ': ' + tgFa_(r['تعداد'] || 0) + (r['درصد از کل'] ? ' (' + tgFa_(r['درصد از کل']) + ')' : '')); }); } catch (e) { L.push('برگهٔ «قیف» خوانده نشد.'); }
  var T = migTab_('t'), C = migTab_('c').rows, now = migNow_();
  var silent = T.rows.filter(function (r) { var at = Number(migProp_('MIG_ASK:' + r['شناسهٔ درمانگر (P)']) || 0); return at && C.some(function (o) { return o['شناسهٔ درمانگر (P)'] === r['شناسهٔ درمانگر (P)'] && migOpen_(o); }) && !C.some(function (o) { return o['شناسهٔ درمانگر (P)'] === r['شناسهٔ درمانگر (P)'] && o['تأیید درمانگر']; }); });
  L.push('', '<b>درمانگران بی‌پاسخ</b>: ' + tgFa_(silent.length) + (silent.length ? ' (' + silent.slice(0, 10).map(function (r) { return tgEsc_(r['نام']); }).join('، ') + ')' : ''));
  var stuck = C.filter(function (o) {
    if ([MIG_ST.match, MIG_ST.ok, MIG_ST.time, MIG_ST.inv, MIG_ST.follow].indexOf(o['وضعیت']) < 0) return false;
    var t = Date.parse(String(o['تاریخ دعوت'] || o['تاریخ تأیید درمانگر'] || '').replace(' ', 'T') + ':00+03:30');
    if (isNaN(t)) { var at = Number(migProp_('MIG_ASK:' + o['شناسهٔ درمانگر (P)']) || 0); t = at || NaN; }
    return !isNaN(t) && now - t > 48 * 3600000;
  });
  L.push('<b>ردیف‌های گیرکرده بیش از ۴۸ ساعت</b>: ' + tgFa_(stuck.length) + (stuck.length ? ' (' + stuck.slice(0, 12).map(function (o) { return o['کد مهاجرت']; }).join('، ') + ')' : ''));
  if (TG_OWNER_CHAT) tgNotify_(String(TG_OWNER_CHAT), TG_NK.report, L.join('\n'), { ref: 'MIG-NIGHT' });
  if (migDry_()) TG_MEM['mig:night'] = L.join('\n');
  return true;
}

/* ───── منو و مسیر ───── */
function migRoute_(chat, m) {
  var t = String((m && m.text) || '').trim();
  if (/^\/start(@\w+)?\s+v2mig$/.test(t)) { if (!migOn_()) { tgSend_(chat, 'این مسیر هنوز باز نشده؛ به‌زودی خبرتان می‌کنیم.'); return true; } migClientStart_(chat); return true; }
  if (m && m.contact && tgGetVal_('migc', chat)) return migClientContact_(chat, m);
  if (tgGetVal_('migv2', chat) && t && !/^\//.test(t)) return migV2Reply_(chat, m);
  if (!migOn_()) return false;
  if (t === MIG_BTN || t === '/clients') { migList_(chat); return true; }
  if (tgGetVal_('migadd', chat) && t) return migAddText_(chat, t);
  return false;
}
/** دکمهٔ منوی درمانگر (پشت پرچم) */
function migMenuRow_() { return migOn_() ? [[{ text: MIG_BTN }]] : []; }
/** بعد از پیام شروع درمانگر: اگر ردیف باز دارد، یک خط با دکمه */
function migTherNudge_(chat) {
  if (!migOn_()) return false;
  try { var me = migMe_(chat); if (!me) return false; var open = migMine_(me.p).filter(migOpen_).length; if (!open) return false;
    tgSend_(chat, '👥 ' + tgFa_(open) + ' ردیف از فهرست مراجعان‌تان برای انتقال به نسخهٔ ۲ منتظر تأیید است.', { inline_keyboard: [[{ text: MIG_BTN, callback_data: 'mig:l' }]] }); return true;
  } catch (e) { tgErr_('migTherNudge_', e); return false; }
}

/* ───── اشتراک هاب و پیام یک‌باره به همکار نسخهٔ ۲ ───── */
function migEmailOf_(name) {
  if (!name) return '';
  var sh = tgPeopleSheet_(), lc = sh.getLastColumn(), head = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  var ci = head.indexOf('ایمیل'), ni = head.indexOf('نام'); if (ci < 0 || ni < 0) return '';
  var v = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), lc).getValues();
  for (var i = 0; i < v.length; i++) if (tgNorm_(v[i][ni]) === tgNorm_(name)) { var e = String(v[i][ci] || '').trim(); if (/@/.test(e)) return e; }
  return '';
}
function migTransient_(e) { return /Service error|Service unavailable|temporarily unavailable|timed out|Internal error|backend error/i.test(String(e && e.message || e)); }
function migShare_() {
  if (migDry_()) return 'dry';
  var id = String(cfg_('MIG_HUB', '') || '').trim(); if (!id) return 'MIG_HUB خالی است';
  var boss = typeof tgDutyBoss_ === 'function' ? tgDutyBoss_() : null;
  var want = [migEmailOf_(tgNm_('v2dev')), migEmailOf_(boss && boss.name)].filter(String).map(function (e) { return e.toLowerCase(); });
  /* v170.23.12.3: تا ایمیلی نیست یا فهرست عوض نشده، درایو را هر ساعت صدا نزن */
  var sig = want.slice().sort().join(',');
  if (!want.length) return 'اشتراک هاب مهاجرت: ایمیلی در «افراد» پیدا نشد';
  if (migProp_('MIG_SHARE_SIG') === sig) return 'اشتراک هاب مهاجرت: بی‌تغییر';
  var f = DriveApp.getFileById(id), owner = (f.getOwner() && f.getOwner().getEmail() || '').toLowerCase(), added = 0, removed = 0;
  f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  f.getEditors().forEach(function (u) { var e = u.getEmail().toLowerCase(); if (e !== owner && want.indexOf(e) < 0) { f.removeEditor(u); removed++; } });
  f.getViewers().forEach(function (u) { var e = u.getEmail().toLowerCase(); if (e !== owner && want.indexOf(e) < 0) { f.removeViewer(u); removed++; } });
  var have = f.getEditors().map(function (u) { return u.getEmail().toLowerCase(); });
  want.forEach(function (e) { if (have.indexOf(e) < 0) { f.addEditor(e); added++; } });
  migProp_('MIG_SHARE_SIG', sig);
  if (want.length === 2) migProp_('MIG_SHARED', String(migNow_()));
  return 'اشتراک هاب مهاجرت: ' + added + ' ویرایشگر تازه · ' + removed + ' دسترسی اضافه برداشته شد · ایمیل پیدا‌شده ' + want.length + ' از ۲';
}
function migV2Dev_() {
  var nm = tgNm_('v2dev'); if (!nm) return null;
  return (typeof tgPeopleList_ === 'function' ? tgPeopleList_() : []).filter(function (p) { return tgNorm_(p.name) === tgNorm_(nm); })[0] || null;
}
function migV2Send_() {
  if (migProp_('MIG_V2DEV_SENT')) return 'پیش از این فرستاده شده';
  var txt = String(cfg_('MIG_V2DEV_MSG', '') || '').trim(); if (!txt) return 'MIG_V2DEV_MSG خالی است';
  var p = migV2Dev_(), c = p ? String(p.chat || '').split(/[,،;\s]+/)[0] : ''; if (!c) return 'همکار نسخهٔ ۲ (کلید v2dev) chat ندارد';
  tgSend_(c, tgEsc_(txt));
  tgSetVal_('migv2', c, '1');
  if (!migDry_()) { try { CacheService.getScriptCache().put('migv2:' + c, '1', 21600); } catch (e) {} migProp_('MIG_V2DEV_CHAT', c); }
  migProp_('MIG_V2DEV_SENT', String(migNow_()));
  return 'پیام همکار نسخهٔ ۲ رفت';
}
/** پاسخ همکار نسخهٔ ۲: ثبت در صندوق پیام (و صندوق یکتا اگر هست) و فرستادن برای یاسر */
function migV2Reply_(chat, m) {
  tgDel_('migv2', chat);
  var t = String(m.text || '').slice(0, 2000), who = (migV2Dev_() || {}).name || '';
  try { if (typeof tgMsgAppend_ === 'function' && typeof TG_MSG_LOG !== 'undefined') tgMsgAppend_(TG_MSG_LOG, ['M-MIGV2', new Date(), who, 'نسخهٔ ۲', 'مهاجرت نسخهٔ ۲', '', t, 'متن', String(chat), String(TG_OWNER_CHAT || ''), 'بله', '']); } catch (e) { tgErr_('migV2Reply_ log', e); }
  try { if (typeof inbAdd_ === 'function') inbAdd_('msg', 'M-MIGV2', { chat: chat, text: t, q: 'مدیریت', more: true }); } catch (e2) {}
  if (TG_OWNER_CHAT) tgNotify_(String(TG_OWNER_CHAT), TG_NK.task, '📨 <b>پاسخ همکار نسخهٔ ۲ (مهاجرت)</b>\n\n' + tgEsc_(t), { ref: 'M-MIGV2' });
  tgSend_(chat, '✓ رسید. ممنون؛ برای یاسر رفت.');
  return true;
}
/* یک‌بارهٔ خودکار v170.23.6.3: اشتراک هاب و پیام یک‌باره. فقط شمار و وضعیت، بی نام و شناسه. */
function tgV1702361Mig() {
  var a = 'اشتراک: ', b = 'پیام: ';
  try { a += migShare_(); } catch (e) { a += 'خطا'; tgErr_('migShare_', e); }
  try { b += migV2Send_(); } catch (e2) { b += 'خطا'; tgErr_('migV2Send_', e2); }
  return a + ' · ' + b + ' · مهاجرت ' + (migOn_() ? 'روشن' : 'خاموش (MIG_ENABLED)');
}
/** ساعتی و مستقل از MIG_ENABLED: اگر یک‌باره پیش از پر شدن کلیدها اجرا شد، همین‌جا وقتی کلیدها آمد کار را تمام می‌کند (فقط ۹ تا ۲۱ تهران) */
function migSetupTick_() {
  if (!migOn_()) return '';   /* v170.23.12.5 (سهمیهٔ اجرا، تصمیم یاسر): تا MIG_ENABLED خاموش است، کار ساعتی مهاجرت کامل بی‌کار */
  var h = Number(Utilities.formatDate(new Date(migNow_()), TG_TZ, 'H')); if (h < 9 || h >= 21) return '';
  var r = [];
  if (!migProp_('MIG_SHARED') && String(cfg_('MIG_HUB', '') || '').trim()) {
    /* v170.23.12.3: خطای گذرای درایو («Service error: Drive») ساعت بعد دوباره امتحان می‌شود و خطای تازه نمی‌سازد؛ پایش دیپلوی یک بار برای همین برگشت زد */
    try { r.push(migShare_()); } catch (eSh) { if (!migTransient_(eSh)) throw eSh; r.push('درایو موقتاً جواب نداد'); }
  }
  if (!migProp_('MIG_V2DEV_SENT') && String(cfg_('MIG_V2DEV_MSG', '') || '').trim() && tgNm_('v2dev')) r.push(migV2Send_());
  return r.join(' · ');
}
/* اجرای دستی پرسش همیار (یاسر): /migpilot */
function migOwnerCmd_(chat, t) {
  if (String(chat) !== String(TG_OWNER_CHAT)) return false;
  if (t === '/migpilot') { tgSend_(chat, migOn_() ? '🤝 پرسش همیار برای ' + tgFa_(migPilotAsk_(8)) + ' درمانگرِ پرمراجع رفت.' : 'مهاجرت خاموش است (MIG_ENABLED).'); return true; }
  if (t === '/migreport') { migProp_('MIG_NIGHT', ''); migNightly_(); return true; }
  return false;
}

/* ───── آزمون ───── */
function migTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'mig:now': new Date('2026-10-12T11:00:00+03:30').getTime() };
  TG_CFG_ = { MIG_ENABLED: 'بله', TG_NAMES: { reception: 'پذیرش نمونه' } };
  try {
    TG_MEM['people'] = [{ row: 2, id: 'P-1', name: 'درمانگر نمونه', chat: '501', roles: ['درمانگر'], status: 'فعال' }, { row: 3, id: 'P-2', name: 'درمانگر دوم', chat: '502', roles: ['درمانگر'], status: 'فعال' }];
    TG_MEM['mig:c'] = [
      { 'کد مهاجرت': 'M-0001', 'وضعیت': MIG_ST.match, 'منبع': 'v1', 'نام': 'مراجع یک نمونه', 'شمارهٔ تماس (E.164)': '+989000000011', 'درمانگر': 'درمانگر نمونه', 'شناسهٔ درمانگر (P)': 'P-1' },
      { 'کد مهاجرت': 'M-0002', 'وضعیت': MIG_ST.match, 'منبع': 'v1', 'نام': 'مراجع دو', 'شمارهٔ تماس (E.164)': '+989000000022', 'درمانگر': 'درمانگر نمونه', 'شناسهٔ درمانگر (P)': 'P-1' },
      { 'کد مهاجرت': 'M-0003', 'وضعیت': MIG_ST.match, 'منبع': 'v1', 'نام': 'مراجع سه', 'شمارهٔ تماس (E.164)': '+989000000033', 'درمانگر': 'درمانگر دوم', 'شناسهٔ درمانگر (P)': 'P-2' }
    ];
    TG_MEM['mig:t'] = [{ 'شناسهٔ درمانگر (P)': 'P-1', 'نام': 'درمانگر نمونه', 'موج': '1' }, { 'شناسهٔ درمانگر (P)': 'P-2', 'نام': 'درمانگر دوم', 'موج': '1' }];
    TG_MEM['mig:w'] = [{ 'موج': '1', 'تاریخ شروع': '2026-10-13' }];
    TG_MEM['mig:f'] = [{ 'مرحله': MIG_ST.match, 'تعداد': '3', 'درصد از کل': '100' }];
    /* فهرست فقط ردیف‌های خودش، با نام کوچک و ۴ رقم آخر */
    migList_('501');
    var L = TG_OUTBOX.filter(function (x) { return x.chat === '501'; }).pop();
    ok('فهرست: فقط مال خودش، نام کوچک و ۴ رقم', L && /مراجع/.test(L.text) && L.text.indexOf('یک نمونه') < 0 && L.text.indexOf('۰۰۱۱') > -1 && L.text.indexOf('سه') < 0, L && L.text);
    ok('ردیف دیگری را نمی‌تواند ویرایش کند', (migCb_('501', 'mig:a:M-0003'), TG_MEM['mig:c'][2]['تأیید درمانگر'] === undefined));
    /* فعال ← روز، ساعت، تناوب، حالت */
    migCb_('501', 'mig:a:M-0001');
    var r1 = TG_MEM['mig:c'][0];
    ok('فعال ← «۳ تأیید درمانگر» و تاریخ', r1['تأیید درمانگر'] === 'فعال' && r1['وضعیت'] === MIG_ST.ok && !!r1['تاریخ تأیید درمانگر']);
    migCb_('501', 'mig:d:M-0001:2'); migCb_('501', 'mig:m:M-0001:16:30'); migCb_('501', 'mig:f:M-0001:0');
    ok('نیمه‌کاره می‌ماند و از همان‌جا ادامه دارد', r1['وضعیت'] === MIG_ST.ok && migOpen_(r1) && (TG_OUTBOX = [], migCb_('501', 'mig:r:M-0001'), /آنلاین یا حضوری/.test(TG_OUTBOX.pop().text)));
    migCb_('501', 'mig:o:M-0001:0');
    ok('زمان کامل ← «۴ زمان ثبت شد»', r1['وضعیت'] === MIG_ST.time && r1['روز جلسه'] === 'دوشنبه' && r1['ساعت جلسه (تهران)'] === '16:30' && r1['تناوب'] === 'هفتگی' && r1['حالت جلسه'] === 'آنلاین');
    /* مال من نیست ← پیگیری و کار پذیرش؛ و بعد از آخرین ردیف پیام قابل فوروارد */
    TG_OUTBOX = [];
    migCb_('501', 'mig:n:M-0002');
    ok('مال من نیست ← «نیازمند پیگیری» و کار پذیرش', TG_MEM['mig:c'][1]['وضعیت'] === MIG_ST.follow && (TG_MEM['mig:tasks'] || []).length === 1);
    ok('همه تأیید شد ← پیام قابل فوروارد با لینک و «۵ دعوت شد»', TG_OUTBOX.some(function (x) { return /start=v2mig/.test(x.text); }) && r1['وضعیت'] === MIG_ST.inv && r1['مسیر دعوت'] === 'فوروارد درمانگر');
    ok('شمارهای «درمانگران» به‌روز', TG_MEM['mig:t'][0]['تأییدشده'] === 1 && TG_MEM['mig:t'][0]['متوقف یا نادرست'] === 1 && TG_MEM['mig:t'][0]['وضعیت پاسخ'] === 'کامل');
    /* مراجع تازه از درمانگر */
    migCb_('502', 'mig:add'); migRoute_('502', { text: 'نمونهٔ تازه' }); migRoute_('502', { text: '0900' + '0000044' });   // pii:ok ساختگی
    var nw = TG_MEM['mig:c'].filter(function (o) { return o['منبع'] === 'درمانگر'; })[0];
    ok('مراجع تازه با منبع «درمانگر» و E.164', nw && nw['شمارهٔ تماس (E.164)'] === '+98900' + '0000044' && nw['شناسهٔ درمانگر (P)'] === 'P-2' && nw['کد مهاجرت'] === 'M-0004');
    /* مراجع: فقط شمارهٔ تأییدشدهٔ خودش */
    migRoute_('901', { text: '/start v2mig' });
    ok('شمارهٔ کس دیگر پذیرفته نمی‌شود', migRoute_('901', { contact: { phone_number: '98900' + '0000011', user_id: 5 }, from: { id: 901 } }) === true && !r1['chat تلگرام']);
    migRoute_('901', { contact: { phone_number: '98900' + '0000011', user_id: 901 }, from: { id: 901 } });
    ok('تطبیق با شمارهٔ خود تلگرام و پرسش درمانگر و زمان', r1['chat تلگرام'] === '901' && TG_OUTBOX.some(function (x) { return /درمانگر نمونه/.test(x.text) && /دوشنبه/.test(x.text); }));
    migCb_('901', 'mig:cok:M-0001');
    ok('درست است ← «۶ وارد شد»', r1['وضعیت'] === MIG_ST.in && /^بله/.test(r1['تأیید مراجع']));
    migRoute_('902', { text: '/start v2mig' }); migRoute_('902', { contact: { phone_number: '+98900' + '0000099', user_id: 902, first_name: 'ناشناس' }, from: { id: 902 } });
    ok('پیدا نشد ← «نیازمند پیگیری» و کار پذیرش', TG_MEM['mig:c'].some(function (o) { return o['منبع'] === 'خود مراجع' && o['وضعیت'] === MIG_ST.follow; }) && TG_MEM['mig:tasks'].length >= 2);
    /* همیار پایلوت: سه «بله»ِ اول */
    TG_OWNER_CHAT = TG_OWNER_CHAT || '1';
    TG_MEM['mig:t'].push({ 'شناسهٔ درمانگر (P)': 'P-3', 'نام': 'سوم' }, { 'شناسهٔ درمانگر (P)': 'P-4', 'نام': 'چهارم' });
    TG_MEM['people'].push({ id: 'P-3', name: 'سوم', chat: '503', roles: [], status: 'فعال' }, { id: 'P-4', name: 'چهارم', chat: '504', roles: [], status: 'فعال' });
    ok('پرسش همیار از پرمراجع‌ها', migPilotAsk_(8) === 4);
    ['501', '502', '503', '504'].forEach(function (c) { migPilotAns_(c, 'y'); });
    ok('فقط سه همیار؛ چهارمی ذخیره', TG_MEM['mig:t'].filter(function (r) { return r['همیار پایلوت؟'] === 'بله'; }).length === 3 && TG_MEM['mig:t'].filter(function (r) { return r['همیار پایلوت؟'] === 'ذخیره'; }).length === 1);
    /* موج، یادآوری و گزارش */
    ok('پیش از موج پیام چک‌لیست با «شروع موج» و «صبر»', (TG_OUTBOX = [], migWaveAsk_() === true) && JSON.stringify(TG_OUTBOX).indexOf('mig:wave:go:1') > -1 && JSON.stringify(TG_OUTBOX).indexOf('mig:wave:wait:1') > -1);
    TG_MEM['mig:c'][2]['تأیید درمانگر'] = undefined;
    migWaveAns_(String(TG_OWNER_CHAT), 'go', '1');
    ok('شروع موج ← پیام به درمانگرهای موج', TG_MEM['mig:w'][0]['تصمیم ادامه'].indexOf('شروع') === 0 && !!migProp_('MIG_ASK:P-2'));
    TG_MEM['mig:now'] += 25 * 3600000; migTick_();
    ok('یادآوری ۲۴ ساعت', migProp_('MIG_REM:P-2') === '1');
    TG_MEM['mig:now'] += 48 * 3600000; migTick_();
    ok('۷۲ ساعت ← کار پذیرش', migProp_('MIG_REM:P-2') === '3' && TG_MEM['mig:tasks'].some(function (t) { return /۷۲ ساعت/.test(t); }));
    TG_MEM['mig:now'] = new Date('2026-10-15T21:10:00+03:30').getTime(); migProp_('MIG_NIGHT', '');
    migNightly_();
    ok('گزارش ۲۱: قیف، بی‌پاسخ‌ها، گیرکرده‌ها، بی نام مراجع', /قیف|تطبیق‌شده/.test(TG_MEM['mig:night']) && /بی‌پاسخ/.test(TG_MEM['mig:night']) && /گیرکرده/.test(TG_MEM['mig:night']) && TG_MEM['mig:night'].indexOf('مراجع سه') < 0);
    ok('شماره به E.164', migE164_('09121234567') === '+98' + '9121234567' && migE164_('0044 20 7946 0000') === '+44' + '2079460000');   // pii:ok ساختگی
    /* پیام یک‌بارهٔ همکار نسخهٔ ۲: وقتی کلیدها آمد، یک بار؛ پاسخ ثبت و برای مالک */
    TG_MEM['mig:now'] = new Date('2026-10-16T11:00:00+03:30').getTime();
    TG_CFG_.MIG_V2DEV_MSG = 'پیام نمونه'; TG_CFG_.TG_NAMES.v2dev = 'همکار نمونه';
    TG_MEM['people'].push({ id: 'P-9', name: 'همکار نمونه', chat: '609', roles: [], status: 'فعال' });
    TG_OUTBOX = []; migSetupTick_(); migSetupTick_();
    ok('پیام یک‌باره فقط یک بار و با متن تنظیمات', TG_OUTBOX.filter(function (x) { return x.chat === '609' && x.text === 'پیام نمونه'; }).length === 1);
    ok('پاسخ همکار نسخهٔ ۲ برای مالک می‌رود', migRoute_('609', { text: 'پاسخ نمونه' }) === true && TG_OUTBOX.some(function (x) { return x.chat === String(TG_OWNER_CHAT) && /پاسخ نمونه/.test(x.text); }));
    ok('خطای گذرای درایو شناخته می‌شود و خطای واقعی نه', migTransient_(new Error('Service error: Drive')) && !migTransient_(new Error('No item with the given ID could be found')));   /* v170.23.12.3 */
    TG_CFG_ = { MIG_ENABLED: '' };
    ok('پرچم خاموش ← دکمه و مسیر نیست', migMenuRow_().length === 0 && migRoute_('501', { text: MIG_BTN }) === false);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'migTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['مهاجرت مراجعان به نسخهٔ ۲ (v170.23.6.3)', 'migTests']); } catch (eMig) {}
