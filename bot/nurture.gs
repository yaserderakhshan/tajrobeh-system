/**
 * nurture.gs · پیگیری لید گیرکرده با یک پیام (چارچوب leadflow: مرحله‌های ۶ و ۷)
 *
 * v170.92 (E13 و E14، تصمیم D235 تازه): **فقط یک پیام، تمام خودکار، بی کارت تأیید.**
 *   دو گروه (لیدهای پذیرش، tgDutyClinic_، با chat تلگرام):
 *     «فرم»: فرم پر کرده ولی معارفه رزرو نکرده (جدید، در پیگیری، پاسخ نداد)، از ۱ روز بعد از ثبت.
 *     «معارفه»: معارفه برگزار شده ولی شروع نکرده، از ۱ روز بعد از معارفه.
 *   یک پیام که می‌پرسد مراجع چه می‌خواهد، با دکمه‌های قدم بعدی: «رزرو معارفه» (فقط گروه فرم)، «با پذیرش حرف بزنم»،
 *   «دیدن درمانگران» (مینی‌اپ) و «فعلاً نه». بی پاسخ یا «فعلاً نه» یعنی دیگر هیچ یادآوری‌ای نمی‌رود.
 *   فقط تلگرام، فقط ۹ تا ۲۱ تهران، با سقف روزانهٔ «دعوت». فقط لیدهای تا ۷ روز (NU_MAX_AGE_D).
 *   توقف پیش از ارسال: هر پیام خود مراجع (nuSeen_)، هر اقدام پذیرش (تماس تازه یا عوض شدن وضعیت لید)، بسته شدن لید.
 * متن: کلیدهای NURTURE_1 (گروه فرم) و NURTURE_INTRO_1 (گروه معارفه) تنظیمات خصوصی با جای {name}؛ خالی = پیش‌نویس همین فایل.
 * سلامت (v170.90): نتیجهٔ روزانه در NU_RES؛ ۳ روز موعد بی هیچ ارسال ← خط ⚠️ در گزارش شبانه و یک پیام سیستم به مالک.
 * هیچ پیام دیگری دربارهٔ پیگیری به مالک نمی‌رود (E13: پیام عملیاتی خودکار منتظر تأیید آدم نمی‌ماند).
 * وضعیت هر نفر در برگهٔ «دنبالهٔ پیگیری» هاب پذیرش. همه پشت NURTURE_ENABLED = «بله».
 *
 * پیشینه: v170.23.13 سه پیام با کارت تأیید روزانهٔ مالک بود. v170.90 ریشهٔ توقف خاموش را پیدا کرد (کارت تأیید در سقف
 * «کار» مالک می‌ماند و از ۲۱ شهریور هیچ پیامی نرفت). E13 و E14 کارت را برداشتند و دنباله را یک پیام کردند.
 */
var NU_TAB = 'دنبالهٔ پیگیری';
var NU_HEAD = ['کد لید', 'گروه', 'chat', 'شروع', 'مرحله', 'آخرین ارسال', 'وضعیت', 'دلیل توقف', 'وضعیت لید'];
var NU_G = { form: 'فرم', intro: 'معارفه' };
var NU_ENTRY = { 'فرم': 1, 'معارفه': 1 };   /* v170.92: یک روز بعد */
var NU_STEPS = 1;   /* v170.92 (E14): فقط یک پیام */
var NU_FORM_ST = ['جدید', 'در پیگیری', 'پاسخ نداد'];
var NU_MAX_AGE_D = 7;      /* v170.90: پیام اول فقط تا ۷ روز بعد از شروع دنباله */
var NU_STALL_D = 3;        /* v170.90: این‌قدر روز موعد بی هیچ ارسال = ایستاده */
var NU_DRAFT = {
  NURTURE_1: 'سلام {name}، درخواستت به دست ما رسیده و هنوز وقت معارفه‌ای نگرفته‌ای. هر وقت آماده بودی، از دکمهٔ زیر یک وقت انتخاب کن.',
  NURTURE_2: 'سلام {name}، اگر سؤالی مانده یا مطمئن نیستی از کجا شروع کنی، جلسهٔ معارفه برای همین است. هر وقت خواستی، وقتش همین‌جاست.',
  NURTURE_3: 'سلام {name}، این آخرین یادآوری ماست. هر زمان که خواستی، در تجربه به رویت باز است.',
  NURTURE_INTRO_1: 'سلام {name}، امیدواریم جلسهٔ معارفه برایت مفید بوده باشد. اگر برای شروع سؤالی داری، همکارم در پذیرش کنارت است.',
  NURTURE_INTRO_2: 'سلام {name}، شروع کردن گاهی زمان می‌برد و این طبیعی است. هر وقت خواستی حرف بزنیم، اینجا هستیم.',
  NURTURE_INTRO_3: 'سلام {name}، این آخرین پیام ماست. هر زمان آماده بودی، با یک پیام دوباره شروع می‌کنیم.'
};
cfg_('NURTURE_ENABLED', '');
cfg_('NURTURE_1', ''); cfg_('NURTURE_2', ''); cfg_('NURTURE_3', '');
cfg_('NURTURE_INTRO_1', ''); cfg_('NURTURE_INTRO_2', ''); cfg_('NURTURE_INTRO_3', '');

function nuDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function nuNow_() { return nuDry_() && TG_MEM['nu:now'] ? Number(TG_MEM['nu:now']) : Date.now(); }
function nuOn_() { return String(cfg_('NURTURE_ENABLED', '') || '').trim() === 'بله'; }
function nuDay_(ms) { return Utilities.formatDate(new Date(ms || nuNow_()), TG_TZ, 'yyyy-MM-dd'); }
function nuAddDays_(iso, n) { var d = new Date(iso + 'T12:00:00+03:30'); return nuDay_(d.getTime() + n * 86400000); }
function nuProp_(k, v) {
  if (nuDry_()) { if (v !== undefined) TG_MEM['nup:' + k] = v; return TG_MEM['nup:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function nuJson_(k, d) { try { return JSON.parse(nuProp_(k) || '') || d; } catch (e) { return d; } }
function nuTab_() { return asTab_(NU_TAB, NU_HEAD); }
function nuKey_(g, step) { return (g === NU_G.intro ? 'NURTURE_INTRO_' : 'NURTURE_') + (step + 1); }
function nuText_(g, step, name) {
  var k = nuKey_(g, step), t = String(cfg_(k, '') || '').trim() || NU_DRAFT[k];
  var first = String(name || '').trim().split(/\s+/)[0] || '';
  return t.replace(/\s*\{name\}/g, first ? ' ' + first : '').replace(/^سلام\s+،/, 'سلام،');
}
/* v170.92 (E14): دکمه‌های قدم بعدی */
function nuKb_(g, code) {
  var rows = [];
  if (g !== NU_G.intro) rows.push([{ text: '🗓 رزرو معارفه', callback_data: 'go' }]);
  rows.push([{ text: '💬 با پذیرش حرف بزنم', callback_data: 'hm' }]);
  rows.push([{ text: '👥 دیدن درمانگران', web_app: { url: TG_APP_URL } }]);
  rows.push([{ text: 'فعلاً نه', callback_data: 'nu:off:' + code }]);
  return { inline_keyboard: rows };
}

/* ───── ورود به دنباله (روزی یک بار) ───── */
function nuGroupOf_(l, today) {
  if (!l || l.closed || !l.chatId || !l.code) return null;
  if (typeof tgDutyClinic_ === 'function' && !tgDutyClinic_(l)) return null;
  var f = String(l.follow || ''); if (/دیگر|منتفی/.test(f)) return null;
  if (NU_FORM_ST.indexOf(l.status) > -1 && !l.booked) {
    var start = nuDay_(nuNow_() - (l.age || 0) * 60000), s1 = nuAddDays_(start, NU_ENTRY[NU_G.form]);
    return s1 <= today && !nuOld_(s1, today) ? { g: NU_G.form, start: s1 } : null;
  }
  if (l.status === 'معارفه برگزار شد' && l.meetDate && /^\d{4}-\d\d-\d\d$/.test(l.meetDate)) {
    var s2 = nuAddDays_(l.meetDate, NU_ENTRY[NU_G.intro]);
    return s2 <= today && !nuOld_(s2, today) ? { g: NU_G.intro, start: s2 } : null;
  }
  return null;
}
/* شروع دنباله بیش از NU_MAX_AGE_D روز پیش است؟ */
function nuOld_(start, today) { return nuAddDays_(String(start).slice(0, 10), NU_MAX_AGE_D) < (today || nuDay_()); }
function nuEnroll_() {
  var today = nuDay_(), t = nuTab_(), have = {}, off = nuJson_('NU_OFF', {}), n = 0;
  t.rows.forEach(function (o) { have[o['کد لید'] + '|' + o['گروه']] = 1; });
  lsLeads_().forEach(function (l) {
    if (off[String(l.chatId)]) return;
    var g = nuGroupOf_(l, today); if (!g || have[l.code + '|' + g.g]) return;
    t.add({ 'کد لید': l.code, 'گروه': g.g, 'chat': String(l.chatId), 'شروع': g.start, 'مرحله': 0, 'آخرین ارسال': '', 'وضعیت': 'فعال', 'دلیل توقف': '', 'وضعیت لید': l.status });
    have[l.code + '|' + g.g] = 1; n++;
  });
  nuActSync_();
  return n;
}
/** chatهای دنبالهٔ فعال، برای توقف با هر پیام (یک Property کوچک) */
function nuActSync_() { var m = {}; nuTab_().rows.forEach(function (o) { if (o['وضعیت'] === 'فعال') m[o['chat']] = 1; }); nuProp_('NU_ACT', JSON.stringify(m)); }
function nuStop_(o, why) { var t = nuTab_(); t.set(o._row, 'وضعیت', 'متوقف'); t.set(o._row, 'دلیل توقف', why); o['وضعیت'] = 'متوقف'; o['دلیل توقف'] = why; }

/** امروز به چه کسانی؟ هر ردیف فعالی که موعد مرحله‌اش رسیده؛ اقدام پذیرش پیش از آن متوقفش می‌کند */
function nuDue_() {
  var today = nuDay_(), out = [], t = nuTab_();
  t.rows.forEach(function (o) {
    if (o['وضعیت'] !== 'فعال') return;
    var step = Number(o['مرحله'] || 0); if (step >= NU_STEPS) { nuStop_(o, 'پایان'); return; }
    if (step === 0 && !String(o['آخرین ارسال'] || '') && nuOld_(o['شروع'], today)) { nuStop_(o, 'قدیمی'); return; }   /* v170.90 */
    if (String(o['شروع']).slice(0, 10) > today) return;
    if (String(o['آخرین ارسال'] || '').slice(0, 10) === today) return;
    var row = typeof tgLeadByCode_ === 'function' ? tgLeadByCode_(o['کد لید']) : 0, l = row > 1 ? tgLeadRead_(row) : null;
    if (nuDry_() && TG_MEM['nu:lead']) l = TG_MEM['nu:lead'](o['کد لید']);
    if (!l || l.closed) { nuStop_(o, 'لید بسته شد'); return; }
    if (l.status !== o['وضعیت لید'] || (o['گروه'] === NU_G.form && l.booked)) { nuStop_(o, 'اقدام پذیرش'); return; }
    var since = (nuNow_() - new Date((o['آخرین ارسال'] || o['شروع']).slice(0, 10) + 'T00:00:00+03:30').getTime()) / 60000;
    if (l.touched && l.idle < since) { nuStop_(o, 'اقدام پذیرش'); return; }
    out.push({ o: o, l: l, step: step });
  });
  return out;
}

/* v170.90: نتیجهٔ روزانه (فقط شمار): {روز: {موعد, «کارت رفت»، «کارت سقف»، «ارسال رفت»، «ارسال خاموش»، …}}؛ ۱۴ روز آخر */
function nuRes_(k, v) {
  var o = nuJson_('NU_RES', {}), d = nuDay_(), x = o[d] = o[d] || {};
  if (v === undefined) x[k] = (x[k] || 0) + 1; else x[k] = v;
  Object.keys(o).sort().slice(0, -14).forEach(function (old) { delete o[old]; });
  nuProp_('NU_RES', JSON.stringify(o));
  return x;
}
/* ───── تیک ساعتی (از tgWatchdog) ───── */
function nuTick_() {
  if (!nuOn_()) return 0;
  var h = Number(Utilities.formatDate(new Date(nuNow_()), TG_TZ, 'H')), today = nuDay_();
  if (h < 9 || h >= 21) return 0;
  /* v170.23.12.5 (سهمیهٔ اجرا): بعد از ارسال امروز، تا فردا بی خواندن شیت */
  if (nuProp_('NU_DONE_DAY') === today) return 0;
  if (nuProp_('NU_ENR_DAY') !== today) { nuProp_('NU_ENR_DAY', today); try { nuEnroll_(); } catch (e) { tgErr_('nuEnroll_', e); } }
  var due = nuDue_(); nuRes_('موعد', due.length);
  if (!due.length) { nuProp_('NU_DONE_DAY', today); return 0; }
  var n = nuSend_(due); nuProp_('NU_DONE_DAY', today); return n;   /* v170.92 (E13): بی کارت تأیید */
}
function nuSend_(due) {
  var t = nuTab_(), n = 0, stamp = Utilities.formatDate(new Date(nuNow_()), TG_TZ, 'yyyy-MM-dd HH:mm');
  (due || nuDue_()).forEach(function (x) {
    var r = tgNotify_(String(x.o['chat']), TG_NK.invite, tgEsc_(nuText_(x.o['گروه'], x.step, x.l.name)), { ref: 'NU-' + x.o['کد لید'], markup: nuKb_(x.o['گروه'], x.o['کد لید']) });
    nuRes_('ارسال ' + r);
    if (r === 'خطا') { nuStop_(x.o, 'نرسید'); return; }
    if (r === 'سقف' || r === 'خاموش') return;   /* سقف روزانه یا سیاست پیام: فردا دوباره، مرحله جلو نمی‌رود */
    t.set(x.o._row, 'مرحله', x.step + 1); t.set(x.o._row, 'آخرین ارسال', stamp); x.o['مرحله'] = x.step + 1; x.o['آخرین ارسال'] = stamp;
    if (x.step + 1 >= NU_STEPS) nuStop_(x.o, 'پایان');   /* v170.92 (E14): یک پیام؛ بی پاسخ هم یادآوری دیگری نیست */
    try { tgLeadNote_(x.l.row, 'پیگیری خودکار ' + x.o['گروه'] + ' · پیام ' + (x.step + 1) + ' رفت', 'بات'); } catch (e) {}
    n++;
  });
  var c = nuJson_('NU_COUNT', {}), today = nuDay_(); c[today] = (c[today] || 0) + n; nuProp_('NU_COUNT', JSON.stringify(c));
  nuActSync_();
  return n;
}

/* ───── ورودی‌ها ───── */
/** هر پیام مراجع: اگر دنبالهٔ فعال دارد، متوقف می‌شود (پاسخ داد) */
function nuSeen_(chat) {
  if (!nuOn_()) return false;
  var act = nuJson_('NU_ACT', {}); if (!act[String(chat)]) return false;
  nuTab_().rows.forEach(function (o) { if (o['chat'] === String(chat) && o['وضعیت'] === 'فعال') nuStop_(o, 'پاسخ مراجع'); });
  nuActSync_();
  return true;
}
function nuCb_(chat, data) {
  var a = String(data).split(':'), act = a[1];
  if (act === 'off') {
    var off = nuJson_('NU_OFF', {}); off[String(chat)] = nuDay_(); nuProp_('NU_OFF', JSON.stringify(off));
    nuTab_().rows.forEach(function (o) { if (o['chat'] === String(chat) && o['وضعیت'] === 'فعال') nuStop_(o, 'دیگر پیام نده'); });
    nuActSync_();
    try { var row = tgLeadByCode_(a[2]); if (row > 1) tgLeadSet_(row, { 'پیگیری خودکار': 'دیگر پیام نده' }, 'مراجع', 'تلگرام', 'دکمهٔ دیگر پیام نده'); } catch (e) {}
    return tgSend_(chat, 'باشد، دیگر پیامی نمی‌فرستیم. هر وقت خواستی، همین‌جا بنویس.');
  }
  return null;   /* v170.92 (E13): دکمه‌های کارت تأیید مالک (go، no، ls) برداشته شد */
}

/* ───── گزارش شبانه ───── */
/* v170.90: ایستاده؟ NU_STALL_D روز آخر هر روز موعد داشت و هیچ پیامی نرفت. خروجی: '' یا متن علت (فقط شمار) */
function nuStall_() {
  var o = nuJson_('NU_RES', {}), days = [];
  for (var i = 0; i < NU_STALL_D; i++) days.push(nuDay_(nuNow_() - i * 86400000));
  var all = days.every(function (d) { return o[d] && Number(o[d]['موعد'] || 0) > 0 && !Number(o[d]['ارسال رفت'] || 0); });
  if (!all) return '';
  var sum = {};
  days.forEach(function (d) { Object.keys(o[d]).forEach(function (k) { if (k !== 'موعد') sum[k] = (sum[k] || 0) + Number(o[d][k] || 0); }); });
  var why = Object.keys(sum).sort().map(function (k) { return k + ' ' + tgFa_(sum[k]); }).join('، ') || 'کارت تأیید زده نشد';
  return '⚠️ پیگیری خودکار ایستاده است: ' + tgFa_(NU_STALL_D) + ' روز موعد داشت (امروز ' + tgFa_(o[days[0]]['موعد']) + ' نفر) و هیچ پیامی نرفت. ' + why + '.';
}
function nuNightLine_() {
  if (!nuOn_()) return '';
  var stall = nuStall_();
  if (stall && TG_OWNER_CHAT && nuProp_('NU_ALERT_DAY') !== nuDay_()) {
    nuProp_('NU_ALERT_DAY', nuDay_());
    try { tgNotify_(String(TG_OWNER_CHAT), TG_NK.sys, stall, { ref: 'NU-STALL-' + nuDay_(), force: true }); } catch (eA) { tgErr_('nuStall_', eA); }
  }
  var today = nuDay_(), c = nuJson_('NU_COUNT', {}), R = nuTab_().rows;
  var act = R.filter(function (o) { return o['وضعیت'] === 'فعال'; }).length;
  var why = function (w) { return R.filter(function (o) { return o['دلیل توقف'] === w; }).length; };
  return '📨 پیگیری لید (یک پیام): امروز ' + tgFa_(c[today] || 0) + ' پیام · منتظر ' + tgFa_(act) + ' نفر · توقف: پاسخ ' + tgFa_(why('پاسخ مراجع')) +
    '، اقدام پذیرش ' + tgFa_(why('اقدام پذیرش')) + '، «دیگر پیام نده» ' + tgFa_(why('دیگر پیام نده')) + '، «فعلاً نه» ' + tgFa_(why('دیگر پیام نده')) + '، قدیمی ' + tgFa_(why('قدیمی')) + (stall ? '\n' + stall : '');
}
try { TG_NIGHT_LINES.push(nuNightLine_); } catch (eNl) {}

/** یک‌بارهٔ خودکار v170.90، فقط خواندن: شمار دنباله‌ها به تفکیک وضعیت و گروه، و شمار فعال‌هایی که «قدیمی» می‌شوند. بی نام و کد. */
function nuV17090Count() {
  var today = nuDay_(), R = nuTab_().rows, c = { all: R.length, act: 0, old: 0, fresh: 0, sent: 0 }, by = {};
  R.forEach(function (o) {
    if (String(o['آخرین ارسال'] || '')) c.sent++;
    by[o['وضعیت'] + '/' + (o['دلیل توقف'] || '-')] = (by[o['وضعیت'] + '/' + (o['دلیل توقف'] || '-')] || 0) + 1;
    if (o['وضعیت'] !== 'فعال') return;
    c.act++;
    if (Number(o['مرحله'] || 0) === 0 && !String(o['آخرین ارسال'] || '') && nuOld_(o['شروع'], today)) c.old++; else c.fresh++;
  });
  return 'دنبالهٔ پیگیری: ' + c.all + ' ردیف، با ارسال ' + c.sent + ' · فعال ' + c.act + ' (قدیمی و بی پیام می‌ماند ' + c.old + '، تازه ' + c.fresh + ')' +
    ' · روشن: ' + (nuOn_() ? 'بله' : 'نه') + ' · ' + Object.keys(by).sort().map(function (k) { return k + ' ' + by[k]; }).join('، ');
}

/* ───── آزمون ───── */
function nuTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT }, st = { clin: tgDutyClinic_, note: tgLeadNote_, by: tgLeadByCode_, set: tgLeadSet_ };
  TG_DRY = true; TG_OUTBOX = []; TG_CFG_ = { NURTURE_ENABLED: 'بله' }; TG_OWNER_CHAT = '9001';
  TG_MEM = { 'nu:now': new Date('2026-10-10T10:00:00+03:30').getTime(), notify: [] };
  try {
    tgDutyClinic_ = function () { return true; }; tgLeadNote_ = function () { return 'x'; };
    var sets = []; tgLeadByCode_ = function () { return 5; }; tgLeadSet_ = function (r, c) { sets.push(c); return 'x'; };
    var L = function (o) { return Object.assign({ row: 2, code: 'L-1', name: 'مراجع نمونه', chatId: '501', status: 'جدید', booked: false, closed: false, touched: false, idle: 0, age: 2 * 1440, meetDate: '', follow: '' }, o); };
    var leads = [L({}), L({ code: 'L-2', chatId: '502', age: 600 }), L({ code: 'L-3', chatId: '503', status: 'معارفه برگزار شد', meetDate: '2026-10-08', age: 20 * 1440 }),
      L({ code: 'L-4', chatId: '', age: 5 * 1440 }), L({ code: 'L-5', chatId: '505', follow: 'منتفی (خود مراجع)' }), L({ code: 'L-6', chatId: '506', status: 'معارفه رزرو شد', booked: true }),
      L({ code: 'L-7', chatId: '507', age: 12 * 1440 })];
    TG_MEM['ls:leads'] = leads;
    var cur = {}; leads.forEach(function (l) { cur[l.code] = l; }); TG_MEM['nu:lead'] = function (c) { return cur[c]; };
    ok('فقط گیرکرده‌های تازه با chat وارد می‌شوند (یک روز بعد، تا ۷ روز)', nuEnroll_() === 2 && TG_MEM['as:' + NU_TAB].map(function (o) { return o['کد لید'] + o['گروه']; }).join() === 'L-1فرم,L-3معارفه');
    TG_MEM['as:' + NU_TAB] = []; TG_MEM['nup:NU_ENR_DAY'] = '';
    /* v170.92 (E13، E14): بی کارت تأیید، یک پیام */
    var n = nuTick_();
    var m1 = TG_OUTBOX.filter(function (x) { return x.chat === '501'; }), m3 = TG_OUTBOX.filter(function (x) { return x.chat === '503'; });
    ok('بی هیچ کارت تأیید، پیام خودکار می‌رود (روی کد قبلی مردود)', n === 2 && m1.length === 1 && m3.length === 1, n);
    ok('هیچ پیامی دربارهٔ پیگیری به مالک نمی‌رود (روی کد قبلی مردود)', !TG_OUTBOX.some(function (x) { return x.chat === '9001'; }) && !TG_MEM.notify.some(function (x) { return x.chat === '9001'; }));
    var kb1 = JSON.stringify(m1[0] || {}), kb3 = JSON.stringify(m3[0] || {});
    ok('گروه فرم: رزرو معارفه، پذیرش، دیدن درمانگران و «فعلاً نه» (روی کد قبلی مردود)', /رزرو معارفه/.test(kb1) && /"callback_data":"go"/.test(kb1) && /"callback_data":"hm"/.test(kb1) && /دیدن درمانگران/.test(kb1) && /web_app/.test(kb1) && /فعلاً نه/.test(kb1) && /nu:off:L-1/.test(kb1), kb1.slice(0, 300));
    ok('گروه معارفه: بی «رزرو معارفه»، با پذیرش و درمانگران', !/رزرو معارفه/.test(kb3) && /"callback_data":"hm"/.test(kb3) && /دیدن درمانگران/.test(kb3) && /nu:off:L-3/.test(kb3));
    ok('پیام با نام کوچک', m1[0] && m1[0].text.indexOf('سلام مراجع،') === 0);
    ok('بعد از یک پیام دنباله تمام می‌شود', TG_MEM['as:' + NU_TAB].every(function (o) { return o['وضعیت'] === 'متوقف' && o['دلیل توقف'] === 'پایان' && Number(o['مرحله']) === 1; }));
    /* بی پاسخ: هیچ یادآوری دیگری */
    [11, 13, 18, 25].forEach(function (d) { TG_MEM['nu:now'] = new Date('2026-10-' + d + 'T10:00:00+03:30').getTime(); TG_MEM['capdry'] = {}; nuTick_(); });
    ok('بی پاسخ: هیچ یادآوری دیگری، هرگز (روی کد قبلی مردود)', TG_OUTBOX.filter(function (x) { return x.chat === '501' || x.chat === '503'; }).length === 2);
    /* «فعلاً نه» */
    TG_MEM['as:' + NU_TAB] = []; TG_MEM['nup:NU_ENR_DAY'] = ''; TG_MEM['nup:NU_DONE_DAY'] = ''; TG_MEM['nu:now'] = new Date('2026-10-26T10:00:00+03:30').getTime();
    cur['L-8'] = L({ code: 'L-8', chatId: '508', age: 2 * 1440 }); leads.push(cur['L-8']);
    nuEnroll_(); TG_OUTBOX = [];
    nuCb_('508', 'nu:off:L-8');
    ok('«فعلاً نه»: توقف، ستون لید و جواب کوتاه', TG_MEM['as:' + NU_TAB].filter(function (o) { return o['chat'] === '508'; }).every(function (o) { return o['دلیل توقف'] === 'دیگر پیام نده'; }) && sets.some(function (c) { return c['پیگیری خودکار'] === 'دیگر پیام نده'; }) && /دیگر پیامی نمی‌فرستیم/.test((TG_OUTBOX[0] || {}).text || ''));
    TG_MEM['nup:NU_DONE_DAY'] = ''; TG_OUTBOX = []; nuTick_();
    ok('بعد از «فعلاً نه» چیزی نمی‌رود و دوباره وارد نمی‌شود', !TG_OUTBOX.some(function (x) { return x.chat === '508'; }) && (TG_MEM['nup:NU_ENR_DAY'] = '', nuEnroll_(), TG_MEM['as:' + NU_TAB].filter(function (o) { return o['chat'] === '508'; }).length === 1));
    /* پاسخ مراجع پیش از ارسال */
    TG_MEM['as:' + NU_TAB] = []; TG_MEM['nup:NU_ENR_DAY'] = ''; TG_MEM['nup:NU_DONE_DAY'] = ''; TG_MEM['nup:NU_OFF'] = '';
    cur['L-9'] = L({ code: 'L-9', chatId: '509', age: 2 * 1440 }); leads.push(cur['L-9']);
    nuEnroll_(); nuSeen_('509'); TG_OUTBOX = []; nuTick_();
    ok('پاسخ مراجع پیش از ارسال: پیام نمی‌رود', !TG_OUTBOX.some(function (x) { return x.chat === '509'; }));
    /* اقدام پذیرش */
    TG_MEM['as:' + NU_TAB] = [{ _row: 2, 'کد لید': 'L-10', 'گروه': 'فرم', 'chat': '510', 'شروع': '2026-10-26', 'مرحله': 0, 'آخرین ارسال': '', 'وضعیت': 'فعال', 'دلیل توقف': '', 'وضعیت لید': 'جدید' }];
    cur['L-10'] = L({ code: 'L-10', chatId: '510', status: 'در پیگیری' }); TG_MEM['nup:NU_DONE_DAY'] = ''; TG_OUTBOX = [];
    nuDue_();
    ok('اقدام پذیرش (وضعیت عوض شد) پیام را نگه می‌دارد', TG_MEM['as:' + NU_TAB][0]['دلیل توقف'] === 'اقدام پذیرش');
    TG_MEM['nu:now'] = new Date('2026-10-26T22:00:00+03:30').getTime();
    ok('بیرون از ۹ تا ۲۱ هیچ', nuTick_() === 0);
    /* سلامت (v170.90) */
    TG_MEM['nu:now'] = new Date('2026-10-20T10:00:00+03:30').getTime();
    var res = {}; ['2026-10-18', '2026-10-19', '2026-10-20'].forEach(function (d) { res[d] = { 'موعد': 4, 'ارسال سقف': 2 }; });
    TG_MEM['nup:NU_RES'] = JSON.stringify(res); TG_MEM['nup:NU_ALERT_DAY'] = ''; TG_MEM.notify = [];
    var nl = nuNightLine_();
    ok('سه روز موعد بی ارسال: خط ⚠️ و یک پیام سیستم به مالک', /⚠️ پیگیری خودکار ایستاده است: ۳ روز موعد داشت \(امروز ۴ نفر\)/.test(nl) && /ارسال سقف ۶/.test(nl) && TG_MEM.notify.filter(function (x) { return x.chat === '9001' && /ایستاده/.test(x.text); }).length === 1, nl);
    ok('پیام ایستاده روزی یک بار', (nuNightLine_(), TG_MEM.notify.filter(function (x) { return /ایستاده/.test(x.text); }).length === 1));
    res['2026-10-19']['ارسال رفت'] = 2; TG_MEM['nup:NU_RES'] = JSON.stringify(res);
    ok('با یک روز ارسال، ایستاده نیست', nuStall_() === '');
    ok('خط گزارش شبانه', /پیگیری لید \(یک پیام\): امروز .* · منتظر .* · توقف: پاسخ/.test(nuNightLine_()), nuNightLine_());
    /* دنبالهٔ کهنه */
    TG_MEM['as:' + NU_TAB] = [{ _row: 2, 'کد لید': 'L-1', 'گروه': 'فرم', 'chat': '501', 'شروع': '2026-10-01', 'مرحله': 0, 'آخرین ارسال': '', 'وضعیت': 'فعال', 'دلیل توقف': '', 'وضعیت لید': 'جدید' }];
    cur['L-1'] = L({});
    ok('شمار یک‌باره بی نام و کد', /فعال 1 \(قدیمی و بی پیام می‌ماند 1، تازه 0\)/.test(nuV17090Count()) && !/L-1|501/.test(nuV17090Count()), nuV17090Count());
    ok('دنبالهٔ بیش از ۷ روزه «قدیمی» و بی پیام', nuDue_().length === 0 && TG_MEM['as:' + NU_TAB][0]['دلیل توقف'] === 'قدیمی');
    ok('یک‌بارهٔ شمار در کارهای خودکار', CI_ONCE_AUTO.indexOf('nuV17090Count') > -1);
    ok('کارت تأیید و دستور /nuno دیگر نیستند', typeof nuCard_ === 'undefined' && typeof nuOwnerCmd_ === 'undefined' && typeof nuApproved_ === 'undefined');
    TG_CFG_.NURTURE_1 = 'سلام {name}، متن تازه.';
    ok('متن از کلید تنظیمات و بی نام', nuText_(NU_G.form, 0, '') === 'سلام، متن تازه.');
    TG_CFG_.NURTURE_ENABLED = '';
    ok('خاموش: هیچ', nuTick_() === 0 && nuSeen_('502') === false && nuNightLine_() === '');
    ok('پیش‌نویس‌ها حداکثر دو جمله، بی تخفیف', Object.keys(NU_DRAFT).every(function (k) { return NU_DRAFT[k].split(/[.!؟]/).filter(function (x) { return x.trim(); }).length <= 2 && !/تخفیف|٪|درصد/.test(NU_DRAFT[k]); }));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally {
    tgDutyClinic_ = st.clin; tgLeadNote_ = st.note; tgLeadByCode_ = st.by; tgLeadSet_ = st.set;
    TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own;
  }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'nuTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['پیگیری گیرکرده‌ها (v170.23.13)', 'nuTests']); } catch (eNu) {}
