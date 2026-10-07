/**
 * nurture.gs · v170.23.13 · پیگیری گیرکرده‌ها: دنبالهٔ پیام کوتاه در تلگرام (چارچوب leadflow: مرحله‌های ۶ و ۷)
 *
 * دو گروه (لیدهای پذیرش، tgDutyClinic_، با chat تلگرام):
 *   «فرم»: فرم پر کرده ولی معارفه رزرو نکرده (جدید، در پیگیری، پاسخ نداد)، از ۲ روز بعد از ثبت.
 *   «معارفه»: معارفه برگزار شده ولی شروع نکرده، از ۳ روز بعد از معارفه.
 * حداکثر سه پیام برای هر نفر، با فاصلهٔ ۲، ۵ و ۱۰ روز (روز اول، +۳، +۸)، فقط تلگرام، فقط ۹ تا ۲۱ تهران.
 * توقف: هر پیام خود مراجع (nuSeen_ در tgPrivate_)، هر اقدام پذیرش (تماس تازه یا عوض شدن وضعیت لید)، یا دکمهٔ «دیگر پیام نده»
 *   (ستون «پیگیری خودکار» لید هم «دیگر پیام نده» می‌شود و پیگیری ۳۰ و ۶۰ روزهٔ قبلی هم دیگر نمی‌رود).
 * متن‌ها: کلیدهای NURTURE_1 تا NURTURE_3 و NURTURE_INTRO_1 تا NURTURE_INTRO_3 تنظیمات خصوصی با جای {name}؛ خالی = پیش‌نویس همین فایل.
 *   هر پیام یک دکمه: «رزرو معارفه» (همان مسیر شروع درمان، go) یا «با پذیرش حرف بزنم» (hm)، و «دیگر پیام نده».
 * تأیید یاسر: پیش از اولین ارسال هر روز یک کارت با شمار گیرنده‌ها و متن‌ها و «بفرست» و «امروز نه». بعد از سه تأیید پشت‌سرهم،
 *   کارت فقط یک خط در گزارش شبانه می‌شود و ارسال خودکار ادامه دارد، مگر یاسر «امروز نه» بزند (/nuno).
 * وضعیت هر نفر در برگهٔ «دنبالهٔ پیگیری» هاب پذیرش. همه پشت NURTURE_ENABLED = «بله».
 */
var NU_TAB = 'دنبالهٔ پیگیری';
var NU_HEAD = ['کد لید', 'گروه', 'chat', 'شروع', 'مرحله', 'آخرین ارسال', 'وضعیت', 'دلیل توقف', 'وضعیت لید'];
var NU_G = { form: 'فرم', intro: 'معارفه' };
var NU_ENTRY = { 'فرم': 2, 'معارفه': 3 };
var NU_GAPS = [0, 3, 8];   /* روز ۲، ۵ و ۱۰ برای «فرم»؛ ۳، ۶ و ۱۱ برای «معارفه» */
var NU_FORM_ST = ['جدید', 'در پیگیری', 'پاسخ نداد'];
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
function nuKb_(g, code) {
  return { inline_keyboard: [[g === NU_G.intro ? { text: 'با پذیرش حرف بزنم', callback_data: 'hm' } : { text: 'رزرو معارفه', callback_data: 'go' }],
    [{ text: 'دیگر پیام نده', callback_data: 'nu:off:' + code }]] };
}

/* ───── ورود به دنباله (روزی یک بار) ───── */
function nuGroupOf_(l, today) {
  if (!l || l.closed || !l.chatId || !l.code) return null;
  if (typeof tgDutyClinic_ === 'function' && !tgDutyClinic_(l)) return null;
  var f = String(l.follow || ''); if (/دیگر|منتفی/.test(f)) return null;
  if (NU_FORM_ST.indexOf(l.status) > -1 && !l.booked) {
    var start = nuDay_(nuNow_() - (l.age || 0) * 60000);
    return nuAddDays_(start, NU_ENTRY[NU_G.form]) <= today ? { g: NU_G.form, start: nuAddDays_(start, NU_ENTRY[NU_G.form]) } : null;
  }
  if (l.status === 'معارفه برگزار شد' && l.meetDate && /^\d{4}-\d\d-\d\d$/.test(l.meetDate)) {
    var s2 = nuAddDays_(l.meetDate, NU_ENTRY[NU_G.intro]);
    return s2 <= today ? { g: NU_G.intro, start: s2 } : null;
  }
  return null;
}
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
    var step = Number(o['مرحله'] || 0); if (step >= 3) { nuStop_(o, 'پایان'); return; }
    if (nuAddDays_(o['شروع'], NU_GAPS[step]) > today) return;
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

/* ───── تأیید یاسر ───── */
function nuAuto_() { return Number(nuProp_('NU_STREAK') || 0) >= 3; }
function nuApproved_() {
  var today = nuDay_();
  if (nuProp_('NU_NO_DAY') === today) return false;
  if (nuProp_('NU_OK_DAY') === today) return true;
  return nuAuto_();
}
function nuCard_(due) {
  var today = nuDay_(); if (nuProp_('NU_CARD_DAY') === today) return false;
  nuProp_('NU_CARD_DAY', today);
  var by = {}; due.forEach(function (x) { var k = nuKey_(x.o['گروه'], x.step); by[k] = (by[k] || 0) + 1; });
  var T = ['📨 <b>پیگیری گیرکرده‌ها · امروز</b>', tgFa_(due.length) + ' گیرنده، فقط تلگرام، بین ۹ تا ۲۱:', ''];
  Object.keys(by).sort().forEach(function (k) { T.push('• ' + k + ': ' + tgFa_(by[k]) + ' نفر\n   «' + tgEsc_(nuText_(k.indexOf('INTRO') > -1 ? NU_G.intro : NU_G.form, Number(k.slice(-1)) - 1, '[نام]')) + '»'); });
  T.push('', 'هر پیام دکمهٔ «دیگر پیام نده» دارد و با هر پاسخ یا اقدام پذیرش دنباله می‌ایستد.', 'بعد از سه «بفرست» پشت‌سرهم، این کارت فقط یک خط در گزارش شبانه می‌شود.');
  if (TG_OWNER_CHAT) tgNotify_(String(TG_OWNER_CHAT), TG_NK.task, T.join('\n'), { ref: 'NU-' + today, markup: { inline_keyboard: [[{ text: '✅ بفرست', callback_data: 'nu:go:' + today }, { text: '⏸ امروز نه', callback_data: 'nu:no:' + today }]] } });
  return true;
}

/* ───── تیک ساعتی (از tgWatchdog) ───── */
function nuTick_() {
  if (!nuOn_()) return 0;
  var h = Number(Utilities.formatDate(new Date(nuNow_()), TG_TZ, 'H')), today = nuDay_();
  if (h < 9 || h >= 21) return 0;
  /* v170.23.12.5 (سهمیهٔ اجرا): بعد از کارت امروز (بی تأیید)، «امروز نه» یا ارسال امروز، تا فردا بی خواندن شیت */
  if (nuProp_('NU_DONE_DAY') === today || nuProp_('NU_NO_DAY') === today) return 0;
  if (!nuApproved_() && nuProp_('NU_CARD_DAY') === today) return 0;
  if (nuProp_('NU_ENR_DAY') !== today) { nuProp_('NU_ENR_DAY', today); try { nuEnroll_(); } catch (e) { tgErr_('nuEnroll_', e); } }
  var due = nuDue_(); if (!due.length) { nuProp_('NU_DONE_DAY', today); return 0; }
  if (!nuApproved_()) { nuCard_(due); return 0; }
  var n = nuSend_(due); nuProp_('NU_DONE_DAY', today); return n;
}
function nuSend_(due) {
  var t = nuTab_(), n = 0, stamp = Utilities.formatDate(new Date(nuNow_()), TG_TZ, 'yyyy-MM-dd HH:mm');
  (due || nuDue_()).forEach(function (x) {
    var r = tgNotify_(String(x.o['chat']), TG_NK.invite, tgEsc_(nuText_(x.o['گروه'], x.step, x.l.name)), { ref: 'NU-' + x.o['کد لید'], markup: nuKb_(x.o['گروه'], x.o['کد لید']) });
    if (r === 'خطا') { nuStop_(x.o, 'نرسید'); return; }
    if (r === 'سقف' || r === 'خاموش') return;   /* سقف روزانه یا سیاست پیام: فردا دوباره، مرحله جلو نمی‌رود */
    t.set(x.o._row, 'مرحله', x.step + 1); t.set(x.o._row, 'آخرین ارسال', stamp); x.o['مرحله'] = x.step + 1; x.o['آخرین ارسال'] = stamp;
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
  if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, 'این دکمه مخصوص یاسر است.');
  if (act === 'go') {
    var today = nuDay_(); if (a[2] && a[2] !== today) return tgSend_(chat, 'این کارت مال روز دیگری است.');
    nuProp_('NU_OK_DAY', today); nuProp_('NU_STREAK', String(Number(nuProp_('NU_STREAK') || 0) + 1));
    var n = nuSend_();
    return tgSend_(chat, '✅ ' + tgFa_(n) + ' پیام رفت.' + (nuAuto_() ? ' از فردا ارسال خودکار است و فقط یک خط در گزارش شبانه می‌آید؛ برای توقف یک روز: /nuno' : ''));
  }
  if (act === 'no') { nuNo_(); return tgSend_(chat, '⏸ امروز پیامی نمی‌رود. فردا دوباره کارت می‌آید.'); }
  return null;
}
function nuNo_() { nuProp_('NU_NO_DAY', nuDay_()); nuProp_('NU_STREAK', '0'); }
function nuOwnerCmd_(chat, t) {
  if (String(chat) !== String(TG_OWNER_CHAT) || t !== '/nuno') return false;
  nuNo_(); tgSend_(chat, '⏸ امروز پیگیری گیرکرده‌ها نمی‌رود و از فردا دوباره با کارت تأیید است.');
  return true;
}

/* ───── گزارش شبانه ───── */
function nuNightLine_() {
  if (!nuOn_()) return '';
  var today = nuDay_(), c = nuJson_('NU_COUNT', {}), R = nuTab_().rows;
  var act = R.filter(function (o) { return o['وضعیت'] === 'فعال'; }).length;
  var why = function (w) { return R.filter(function (o) { return o['دلیل توقف'] === w; }).length; };
  var mode = nuProp_('NU_NO_DAY') === today ? 'امروز نه' : (nuAuto_() ? 'خودکار (برای توقف یک روز /nuno)' : 'با کارت تأیید');
  return '📨 پیگیری گیرکرده‌ها: امروز ' + tgFa_(c[today] || 0) + ' پیام · فعال ' + tgFa_(act) + ' نفر · توقف: پاسخ ' + tgFa_(why('پاسخ مراجع')) +
    '، اقدام پذیرش ' + tgFa_(why('اقدام پذیرش')) + '، «دیگر پیام نده» ' + tgFa_(why('دیگر پیام نده')) + ' · ' + mode;
}
try { TG_NIGHT_LINES.push(nuNightLine_); } catch (eNl) {}

/* ───── آزمون ───── */
function nuTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT }, st = { clin: tgDutyClinic_, note: tgLeadNote_, by: tgLeadByCode_, set: tgLeadSet_ };
  TG_DRY = true; TG_OUTBOX = []; TG_CFG_ = { NURTURE_ENABLED: 'بله' }; TG_OWNER_CHAT = '9001';
  TG_MEM = { 'nu:now': new Date('2026-10-10T10:00:00+03:30').getTime(), notify: [] };
  try {
    tgDutyClinic_ = function () { return true; }; tgLeadNote_ = function () { return 'x'; };
    var sets = []; tgLeadByCode_ = function () { return 5; }; tgLeadSet_ = function (r, c) { sets.push(c); return 'x'; };
    var L = function (o) { return Object.assign({ row: 2, code: 'L-1', name: 'مراجع نمونه', chatId: '501', status: 'جدید', booked: false, closed: false, touched: false, idle: 0, age: 3 * 1440, meetDate: '', follow: '' }, o); };
    var leads = [L({}), L({ code: 'L-2', chatId: '502', age: 1 * 1440 }), L({ code: 'L-3', chatId: '503', status: 'معارفه برگزار شد', meetDate: '2026-10-06', age: 20 * 1440 }),
      L({ code: 'L-4', chatId: '', age: 5 * 1440 }), L({ code: 'L-5', chatId: '505', follow: 'منتفی (خود مراجع)' }), L({ code: 'L-6', chatId: '506', status: 'معارفه رزرو شد', booked: true })];
    TG_MEM['ls:leads'] = leads;
    var cur = {}; leads.forEach(function (l) { cur[l.code] = l; }); TG_MEM['nu:lead'] = function (c) { return cur[c]; };
    ok('فقط گیرکرده‌ها با chat وارد دنباله می‌شوند', nuEnroll_() === 2 && TG_MEM['as:' + NU_TAB].map(function (o) { return o['کد لید'] + o['گروه']; }).join() === 'L-1فرم,L-3معارفه');
    /* کارت تأیید پیش از اولین ارسال */
    ok('بی تأیید یاسر هیچ پیامی نمی‌رود؛ کارت با شمار و متن', nuTick_() === 0 && TG_OUTBOX.filter(function (x) { return x.chat === '501'; }).length === 0 &&
      TG_MEM.notify.some(function (x) { return x.chat === '9001' && /۲ گیرنده/.test(x.text) && x.text.indexOf('[نام]') > -1; }));
    ok('کارت روزی یک بار', nuTick_() === 0 && TG_MEM.notify.filter(function (x) { return x.chat === '9001'; }).length === 1);
    ok('دکمهٔ «بفرست» فقط برای یاسر', (TG_OUTBOX = [], nuCb_('777', 'nu:go:2026-10-10'), TG_MEM['as:' + NU_TAB][0]['مرحله'] === 0));
    nuCb_('9001', 'nu:go:2026-10-10');
    var m1 = TG_OUTBOX.filter(function (x) { return x.chat === '501'; })[0], m3 = TG_OUTBOX.filter(function (x) { return x.chat === '503'; })[0];
    ok('بعد از «بفرست»: پیام اول با نام کوچک و یک دکمه', m1 && m1.text.indexOf('سلام مراجع،') === 0 && /رزرو معارفه/.test(JSON.stringify(m1)) && /nu:off:L-1/.test(JSON.stringify(m1)), JSON.stringify(m1).slice(0, 200));
    ok('گروه معارفه با «با پذیرش حرف بزنم»', m3 && /با پذیرش حرف بزنم/.test(JSON.stringify(m3)) && /امیدواریم/.test(m3.text));
    ok('همان روز دوباره نمی‌رود', (TG_OUTBOX = [], nuTick_() === 0));
    /* پیام دوم سه روز بعد؛ پاسخ مراجع متوقف می‌کند */
    TG_MEM['nu:now'] = new Date('2026-10-13T10:00:00+03:30').getTime();
    ok('روز دوم بی کارت نمی‌رود (هنوز خودکار نیست)', nuTick_() === 0);
    nuSeen_('503'); TG_OUTBOX = []; TG_MEM['capdry'] = {};
    nuCb_('9001', 'nu:go:2026-10-13');
    ok('پیام دوم فقط به کسی که پاسخ نداده', TG_OUTBOX.some(function (x) { return x.chat === '501' && /اگر سؤالی مانده/.test(x.text); }) && !TG_OUTBOX.some(function (x) { return x.chat === '503'; }));
    ok('دلیل توقف: پاسخ مراجع', TG_MEM['as:' + NU_TAB][1]['دلیل توقف'] === 'پاسخ مراجع');
    /* اقدام پذیرش متوقف می‌کند */
    TG_MEM['nu:now'] = new Date('2026-10-18T10:00:00+03:30').getTime();
    cur['L-1'] = L({ status: 'در پیگیری' });
    TG_OUTBOX = []; TG_MEM['capdry'] = {}; nuCb_('9001', 'nu:go:2026-10-18');
    ok('اقدام پذیرش (وضعیت عوض شد) دنباله را می‌ایستاند', TG_OUTBOX.filter(function (x) { return x.chat === '501'; }).length === 0 && TG_MEM['as:' + NU_TAB][0]['دلیل توقف'] === 'اقدام پذیرش');
    ok('بعد از سه «بفرست» پشت‌سرهم خودکار', nuAuto_() === true);
    /* خودکار، دیگر پیام نده، /nuno */
    TG_MEM['as:' + NU_TAB] = []; cur['L-1'] = L({}); TG_MEM['nup:NU_ENR_DAY'] = ''; TG_MEM['nup:NU_OFF'] = '';
    TG_MEM['nu:now'] = new Date('2026-10-19T10:00:00+03:30').getTime(); TG_MEM.notify = []; TG_OUTBOX = []; TG_MEM['capdry'] = {};
    leads[0].age = 4 * 1440;
    ok('حالت خودکار: بی کارت می‌رود', nuTick_() >= 1 && !TG_MEM.notify.some(function (x) { return x.chat === '9001'; }));
    nuCb_('501', 'nu:off:L-1');
    ok('«دیگر پیام نده»: توقف و ستون لید', TG_MEM['as:' + NU_TAB][0]['دلیل توقف'] === 'دیگر پیام نده' && sets.some(function (c) { return c['پیگیری خودکار'] === 'دیگر پیام نده'; }));
    TG_MEM['as:' + NU_TAB] = []; TG_MEM['nup:NU_ENR_DAY'] = '';
    ok('کسی که «دیگر پیام نده» زده دوباره وارد نمی‌شود', nuEnroll_() === 1 && TG_MEM['as:' + NU_TAB].every(function (o) { return o['chat'] !== '501'; }));
    nuOwnerCmd_('9001', '/nuno');
    ok('/nuno: امروز نه و برگشت به کارت', !nuApproved_() && !nuAuto_());
    TG_MEM['nu:now'] = new Date('2026-10-19T22:00:00+03:30').getTime();
    ok('بیرون از ۹ تا ۲۱ هیچ', nuTick_() === 0);
    ok('خط گزارش شبانه', /پیگیری گیرکرده‌ها: امروز .* · فعال .* · توقف: پاسخ/.test(nuNightLine_()), nuNightLine_());
    TG_CFG_.NURTURE_1 = 'سلام {name}، متن تازه.';
    ok('متن از کلید تنظیمات و بی نام', nuText_(NU_G.form, 0, '') === 'سلام، متن تازه.');
    TG_CFG_.NURTURE_ENABLED = '';
    ok('خاموش: هیچ', nuTick_() === 0 && nuSeen_('502') === false && nuNightLine_() === '');
    ok('پیش‌نویس‌ها حداکثر دو جمله، بی تخفیف', Object.keys(NU_DRAFT).every(function (k) { return NU_DRAFT[k].split(/[.!؟]/).filter(function (s) { return s.trim(); }).length <= 2 && !/تخفیف|٪|درصد/.test(NU_DRAFT[k]); }));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally {
    tgDutyClinic_ = st.clin; tgLeadNote_ = st.note; tgLeadByCode_ = st.by; tgLeadSet_ = st.set;
    TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own;
  }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'nuTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['پیگیری گیرکرده‌ها (v170.23.13)', 'nuTests']); } catch (eNu) {}
