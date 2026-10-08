/**
 * reactivate.gs · v170.23.14 · بازگرداندن مراجعان قدیمی (یک پیام، یک بار، فقط با «بفرست» یاسر)
 *
 * گروه (فقط کسانی که chat تلگرام دارند، هر chat یک بار):
 *   ۱) ردیف‌های «قدیمی» ستون «فعال بودن (مالی)» برگهٔ «مراجعان» هاب مهاجرت (MIG_HUB؛ فقط خواندن، بی تغییر در هاب مهاجرت).
 *   ۲) لیدهای پذیرش «پاسخ نداد»، یا «بسته» با دلیل غیرقطعی («پاسخ نداد (نهایی)»، «دلیل دیگر»)، در ۶ ماه گذشته.
 *   بیرون می‌مانند: هر کس «دیگر پیام نده» زده (دنبالهٔ پیگیری یا ستون «پیگیری خودکار») و هر لیدی که دلیل بستنش «منصرف شد» است.
 * پیام: کلید REACTIVATE_TEXT با {name} و {therapist} (خالی = پیش‌نویس همین فایل، سه جمله، گرم و بی‌فشار)، دو دکمه:
 *   «دوباره شروع کنم» ← وقت‌های آزاد همان درمانگر قبلی (یا مسیر شروع درمان) و خبر به پذیرش؛ «فعلاً نه».
 * دسته‌های ۲۰ نفره، روزی یک دسته؛ هر دسته پیش از ارسال یک کارت پیش‌نمایش برای یاسر با «بفرست» و «صبر». بدون تأیید هیچ پیامی نمی‌رود.
 * سنجش در ۳۰ روز: پاسخ (هر دکمه یا پیام)، رزرو (نوبت تازه)، شروع دوباره (نوبت برگزارشده). برگهٔ «بازگرداندن» در هاب پذیرش.
 * همه پشت REACTIVATE_ENABLED = «بله».
 */
var RE_TAB = 'بازگرداندن';
var RE_HEAD = ['شناسه', 'منبع', 'chat', 'درمانگر', 'دسته', 'ارسال', 'پاسخ', 'تاریخ پاسخ'];
var RE_BATCH = 20;
var RE_SOFT = ['پاسخ نداد (نهایی)', 'دلیل دیگر'];
var RE_DRAFT = 'سلام {name}، مدتی است از تو خبر نداریم و امیدواریم حالت خوب باشد. اگر دوست داشتی، می‌توانی دوباره {therapist} شروع کنی. هر وقت آماده بودی، یک دکمه کافی است.';
cfg_('REACTIVATE_ENABLED', '');
cfg_('REACTIVATE_TEXT', '');

function reDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function reNow_() { return reDry_() && TG_MEM['re:now'] ? Number(TG_MEM['re:now']) : Date.now(); }
function reOn_() { return String(cfg_('REACTIVATE_ENABLED', '') || '').trim() === 'بله'; }
function reDay_(ms) { return Utilities.formatDate(new Date(ms || reNow_()), TG_TZ, 'yyyy-MM-dd'); }
function reProp_(k, v) {
  if (reDry_()) { if (v !== undefined) TG_MEM['rep:' + k] = v; return TG_MEM['rep:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function reTab_() { return asTab_(RE_TAB, RE_HEAD); }
function reText_(name, ther) {
  var t = String(cfg_('REACTIVATE_TEXT', '') || '').trim() || RE_DRAFT, first = String(name || '').trim().split(/\s+/)[0] || '';
  return t.replace(/\s*\{name\}/g, first ? ' ' + first : '').replace(/^سلام\s+،/, 'سلام،')
    .replace(/\{therapist\}/g, ther ? 'با ' + String(ther).trim() : 'با همکارانمان در تجربه');
}
function reKb_(id) { return { inline_keyboard: [[{ text: 'دوباره شروع کنم', callback_data: 're:go:' + id }, { text: 'فعلاً نه', callback_data: 're:no:' + id }]] }; }

/* ───── گروه ───── */
function reOptedOut_() {
  var raw = reDry_() ? (TG_MEM['nup:NU_OFF'] || '') : (PropertiesService.getScriptProperties().getProperty('NU_OFF') || '');
  try { return JSON.parse(raw || '{}') || {}; } catch (e) { return {}; }
}
function reMigOld_() {
  if (reDry_()) return TG_MEM['re:mig'] || [];
  if (typeof migTab_ !== 'function' || !String(cfg_('MIG_HUB', '') || '').trim()) return [];
  try {
    return migTab_('c').rows.filter(function (o) { return String(o['فعال بودن (مالی)'] || '').trim() === 'قدیمی' && String(o['chat تلگرام'] || '').trim(); })
      .map(function (o) { return { id: 'M:' + o['کد مهاجرت'], src: 'مراجع قدیمی', chat: String(o['chat تلگرام']).trim(), name: o['نام'], ther: o['درمانگر'] }; });
  } catch (e) { tgErr_('reMigOld_', e); return []; }
}
function reLeads_() {
  var lim = 183 * 1440;
  return lsLeads_().filter(function (l) {
    if (!l.chatId || !l.code || (l.age || 0) > lim) return false;
    if (/دیگر|منتفی/.test(String(l.follow || ''))) return false;
    if (typeof tgDutyClinic_ === 'function' && !tgDutyClinic_(l)) return false;
    if (l.status === 'پاسخ نداد') return true;
    return l.status === 'بسته' && RE_SOFT.indexOf(String(l.reason || '').trim()) > -1;
  }).map(function (l) { return { id: 'L:' + l.code, src: 'لید', chat: String(l.chatId), name: l.name, ther: l.meetTher || '' }; });
}
/** صف: هر chat یک بار، بی کسانی که قبلاً پیام گرفته‌اند یا «دیگر پیام نده» زده‌اند */
function reQueue_() {
  var done = {}, off = reOptedOut_(), seen = {};
  reTab_().rows.forEach(function (o) { done[o['chat']] = 1; });
  return reMigOld_().concat(reLeads_()).filter(function (x) {
    if (done[x.chat] || off[x.chat] || seen[x.chat]) return false;
    seen[x.chat] = 1; return true;
  });
}

/* ───── دسته و کارت پیش‌نمایش ───── */
function reTick_() {
  if (!reOn_()) return 0;
  var h = Number(Utilities.formatDate(new Date(reNow_()), TG_TZ, 'H')), today = reDay_();
  if (h < 10 || h >= 21 || reProp_('RE_CARD_DAY') === today) return 0;
  var q = reQueue_(); if (!q.length) return 0;
  var b = q.slice(0, RE_BATCH);
  reProp_('RE_CARD_DAY', today);
  reProp_('RE_BATCH', JSON.stringify({ day: today, items: b }));
  var bySrc = {}; b.forEach(function (x) { bySrc[x.src] = (bySrc[x.src] || 0) + 1; });
  var T = ['🔁 <b>بازگرداندن مراجعان قدیمی · دستهٔ امروز</b>', tgFa_(b.length) + ' نفر (' + Object.keys(bySrc).map(function (k) { return k + ' ' + tgFa_(bySrc[k]); }).join('، ') + ')' +
    (q.length > b.length ? ' · در صف بعدی: ' + tgFa_(q.length - b.length) : ''), '', 'متن (هر نفر با نام کوچک خودش و درمانگر قبلی اگر داشته):',
    '«' + tgEsc_(reText_('[نام]', '[درمانگر]')) + '»', '', 'دکمه‌ها: «دوباره شروع کنم» و «فعلاً نه». هر نفر فقط یک بار.'];
  if (TG_OWNER_CHAT) tgNotify_(String(TG_OWNER_CHAT), TG_NK.task, T.join('\n'), { ref: 'RE-' + today, markup: { inline_keyboard: [[{ text: '✅ بفرست', callback_data: 're:send:' + today }, { text: '⏸ صبر', callback_data: 're:wait:' + today }]] } });
  return b.length;
}
function reSend_() {
  var raw = {}; try { raw = JSON.parse(reProp_('RE_BATCH') || '{}'); } catch (e) {}
  if (raw.day !== reDay_() || !raw.items) return 0;
  var h = Number(Utilities.formatDate(new Date(reNow_()), TG_TZ, 'H')); if (h < 9 || h >= 21) return -1;
  var t = reTab_(), done = {}, n = 0, off = reOptedOut_();
  t.rows.forEach(function (o) { done[o['chat']] = 1; });
  raw.items.forEach(function (x) {
    if (done[x.chat] || off[x.chat]) return;
    var r = tgNotify_(x.chat, TG_NK.invite, tgEsc_(reText_(x.name, x.ther)), { ref: 'RE-' + x.id, markup: reKb_(x.id) });
    if (r === 'سقف' || r === 'خاموش') return;
    t.add({ 'شناسه': x.id, 'منبع': x.src, 'chat': x.chat, 'درمانگر': x.ther || '', 'دسته': raw.day, 'ارسال': Utilities.formatDate(new Date(reNow_()), TG_TZ, 'yyyy-MM-dd HH:mm'), 'پاسخ': r === 'خطا' ? 'نرسید' : '', 'تاریخ پاسخ': '' });
    done[x.chat] = 1; if (r !== 'خطا') n++;
  });
  reProp_('RE_BATCH', '');
  return n;
}

/* ───── پاسخ مراجع ───── */
function reRow_(chat, id) { var t = reTab_(); return { t: t, o: t.rows.filter(function (o) { return o['chat'] === String(chat) && (!id || o['شناسه'] === id); })[0] }; }
function reMark_(chat, id, ans) {
  var x = reRow_(chat, id); if (!x.o || x.o['پاسخ']) return x.o || null;
  x.t.set(x.o._row, 'پاسخ', ans); x.t.set(x.o._row, 'تاریخ پاسخ', reDay_()); x.o['پاسخ'] = ans;
  return x.o;
}
/** هر پیام کسی که پیام بازگرداندن گرفته = پاسخ (برای سنجش) */
function reSeen_(chat) {
  if (!reOn_()) return false;
  var x = reRow_(chat); if (!x.o || x.o['پاسخ']) return false;
  var sent = Date.parse(String(x.o['ارسال']).replace(' ', 'T') + ':00+03:30'); if (isNaN(sent) || reNow_() - sent > 30 * 86400000) return false;
  reMark_(chat, x.o['شناسه'], 'پیام نوشت'); return true;
}
function reBook_(chat, ther) {
  var free = ther && typeof tgSessFree_ === 'function' ? tgSessFree_(ther) : [];
  if (!free.length) return false;
  var z = tgZoneOf_(tgGetVal_('tz', chat) || 'ir'), list = free.slice(0, TG_SESS_MAX_OFFER), btns = [];
  var body = '🩺 <b>جلسهٔ درمان با ' + tgEsc_(ther) + '</b>\n\nکدام وقت برای تو بهتر است؟\n';
  for (var i = 0; i < list.length; i++) { body += '\n🗓 ' + tgEsc_(tgSlotLabel_(list[i], z)); btns.push([{ text: tgSlotShort_(list[i], z), callback_data: 'ss:' + i }]); }
  tgSetVal_('soff', chat, JSON.stringify(list));
  tgSend_(chat, body, { inline_keyboard: btns });
  return true;
}
function reCb_(chat, data, name, uname) {
  var a = String(data).split(':'), act = a[1], id = a.slice(2).join(':');
  if (act === 'send' || act === 'wait') {
    if (String(chat) !== String(TG_OWNER_CHAT)) return tgSend_(chat, 'این دکمه مخصوص یاسر است.');
    if (id !== reDay_()) return tgSend_(chat, 'این کارت مال روز دیگری است.');
    if (act === 'wait') { reProp_('RE_BATCH', ''); return tgSend_(chat, '⏸ این دسته نرفت. فردا دستهٔ تازه با کارت می‌آید.'); }
    var n = reSend_();
    return tgSend_(chat, n < 0 ? 'الان بیرون از ۹ تا ۲۱ است؛ فردا دوباره کارت می‌آید.' : '✅ ' + tgFa_(n) + ' پیام رفت.');
  }
  var o = reMark_(chat, id, act === 'go' ? 'دوباره شروع کنم' : 'فعلاً نه');
  if (act === 'no') return tgSend_(chat, 'باشد. هر وقت خواستی، همین‌جا بنویس.');
  var ther = o ? String(o['درمانگر'] || '').trim() : '';
  var line = '🔁 مراجع قدیمی «دوباره شروع کنم» زد' + (ther ? ' · درمانگر قبلی: ' + ther : '') + ' · ' + (id || '');
  try {
    if (typeof inbAdd_ === 'function') inbAdd_('re', 'RE-' + chat, { chat: String(chat), text: line, q: 'پذیرش', type: 'بازگرداندن', more: true });
    else if (typeof tgColleague_ === 'function') tgColleague_(String(chat), name || '', uname || '', line);
  } catch (e) { tgErr_('reCb_', e); }
  if (reBook_(chat, ther)) return null;
  tgSend_(chat, '🌱 خوشحالیم که برگشتی. همکارم در پذیرش به‌زودی با تو هماهنگ می‌کند.');
  return null;
}

/* ───── سنجش ───── */
function reStats_() {
  var R = reTab_().rows.filter(function (o) { return o['پاسخ'] !== 'نرسید'; }), now = reNow_(), today = reDay_();
  var sess = typeof tgSessRows_ === 'function' ? tgSessRows_() : [];
  var s = { sent: 0, ans: 0, book: 0, back: 0 };
  R.forEach(function (o) {
    var d0 = String(o['ارسال']).slice(0, 10), t0 = Date.parse(d0 + 'T00:00:00+03:30'); if (isNaN(t0) || now - t0 > 30 * 86400000) return;
    s.sent++; if (o['پاسخ']) s.ans++;
    var mine = sess.filter(function (r) { return String(r.chat) === String(o['chat']) && r.dateIso >= d0 && !/لغو/.test(r.status); });
    if (mine.length) s.book++;
    if (mine.some(function (r) { return r.dateIso < today; })) s.back++;
  });
  return s;
}
function reNightLine_() {
  if (!reOn_()) return '';
  var s = reStats_(), q = 0; try { q = reQueue_().length; } catch (e) {}
  return '🔁 بازگرداندن (۳۰ روز): ' + tgFa_(s.sent) + ' پیام · پاسخ ' + tgFa_(s.ans) + ' · رزرو ' + tgFa_(s.book) + ' · شروع دوباره ' + tgFa_(s.back) + ' · در صف ' + tgFa_(q);
}
try { TG_NIGHT_LINES.push(reNightLine_); } catch (eNl) {}

/* ───── آزمون ───── */
function reTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_, own: TG_OWNER_CHAT }, st = { clin: tgDutyClinic_, free: tgSessFree_, rows: tgSessRows_ };
  TG_DRY = true; TG_OUTBOX = []; TG_CFG_ = { REACTIVATE_ENABLED: 'بله' }; TG_OWNER_CHAT = '9001';
  TG_MEM = { 're:now': new Date('2026-10-10T11:00:00+03:30').getTime(), notify: [] };
  try {
    tgDutyClinic_ = function () { return true; }; tgSessFree_ = function () { return []; };
    var sess = []; tgSessRows_ = function () { return sess; };
    var L = function (o) { return Object.assign({ code: 'L-1', name: 'لید نمونه', chatId: '601', status: 'پاسخ نداد', reason: '', age: 30 * 1440, follow: '', meetTher: '' }, o); };
    TG_MEM['re:mig'] = [{ id: 'M:M-0001', src: 'مراجع قدیمی', chat: '701', name: 'مراجع قدیمی نمونه', ther: 'درمانگر نمونه' }, { id: 'M:M-0002', src: 'مراجع قدیمی', chat: '601', name: 'تکراری', ther: '' }];
    TG_MEM['ls:leads'] = [L({}), L({ code: 'L-2', chatId: '602', status: 'بسته', reason: 'منصرف شد' }), L({ code: 'L-3', chatId: '603', status: 'بسته', reason: 'دلیل دیگر' }),
      L({ code: 'L-4', chatId: '604', age: 300 * 1440 }), L({ code: 'L-5', chatId: '605', follow: 'دیگر پیام نده' }), L({ code: 'L-6', chatId: '606' }), L({ code: 'L-7', chatId: '', status: 'پاسخ نداد' })];
    TG_MEM['nup:NU_OFF'] = JSON.stringify({ '606': '2026-10-01' });
    var q = reQueue_();
    ok('گروه: قدیمی‌ها و لیدهای غیرقطعی ۶ ماهه، هر chat یک بار', q.map(function (x) { return x.chat; }).sort().join() === '601,603,701', q.map(function (x) { return x.chat; }).join());
    ok('«منصرف شد»، «دیگر پیام نده» و قدیمی‌تر از ۶ ماه بیرون', !q.some(function (x) { return ['602', '604', '605', '606'].indexOf(x.chat) > -1; }));
    ok('کارت پیش‌نمایش برای یاسر، بی ارسال', reTick_() === 3 && TG_OUTBOX.every(function (x) { return x.chat === '9001'; }) && TG_MEM.notify.some(function (x) { return x.chat === '9001' && /۳ نفر/.test(x.text); }));
    ok('روزی یک کارت', reTick_() === 0);
    reCb_('777', 're:send:2026-10-10');
    ok('«بفرست» فقط یاسر', TG_MEM['as:' + RE_TAB] === undefined || TG_MEM['as:' + RE_TAB].length === 0);
    TG_OUTBOX = []; reCb_('9001', 're:send:2026-10-10');
    var m = TG_OUTBOX.filter(function (x) { return x.chat === '701'; })[0];
    ok('بعد از «بفرست»: پیام با نام و درمانگر و دو دکمه', m && m.text.indexOf('سلام مراجع،') === 0 && m.text.indexOf('با درمانگر نمونه شروع کنی') > -1 && /دوباره شروع کنم/.test(JSON.stringify(m)) && /فعلاً نه/.test(JSON.stringify(m)), m && m.text);
    var m2 = TG_OUTBOX.filter(function (x) { return x.chat === '603'; })[0];
    ok('بی درمانگر قبلی: «با همکارانمان در تجربه»', m2 && /با همکارانمان در تجربه/.test(m2.text));
    ok('متن حداکثر سه جمله', reText_('الف', 'ب').split(/[.!؟]/).filter(function (s) { return s.trim(); }).length <= 3);
    ok('هر نفر فقط یک بار', (TG_MEM['rep:RE_CARD_DAY'] = '', TG_MEM['re:now'] += 86400000, reTick_() === 0));
    /* پاسخ‌ها */
    TG_OUTBOX = []; reCb_('603', 're:no:L:L-3');
    ok('«فعلاً نه» ثبت می‌شود', TG_MEM['as:' + RE_TAB].some(function (o) { return o['chat'] === '603' && o['پاسخ'] === 'فعلاً نه'; }));
    var booked = false; tgSessFree_ = function (n) { booked = n === 'درمانگر نمونه'; return booked ? [{ therapist: n, dateIso: '2026-10-15', hhmm: '10:00' }] : []; };
    TG_OUTBOX = []; reCb_('701', 're:go:M:M-0001');
    ok('«دوباره شروع کنم» ← وقت‌های همان درمانگر و خبر به پذیرش', booked && /ss:0/.test(JSON.stringify(TG_OUTBOX)) && TG_MEM['as:' + RE_TAB].some(function (o) { return o['chat'] === '701' && o['پاسخ'] === 'دوباره شروع کنم'; }));
    ok('هر پیام بعدی هم پاسخ حساب می‌شود (یک بار)', reSeen_('601') === true && reSeen_('601') === false);
    sess = [{ chat: '701', dateIso: '2026-10-09', status: 'رزرو شده' }, { chat: '701', dateIso: '2026-10-12', status: 'رزرو شده' }];
    TG_MEM['re:now'] = new Date('2026-10-13T11:00:00+03:30').getTime();
    var s = reStats_();
    ok('سنجش ۳۰ روز: پاسخ، رزرو، شروع دوباره', s.sent === 3 && s.ans === 3 && s.book === 1 && s.back === 1, JSON.stringify(s));
    ok('خط گزارش شبانه', /بازگرداندن \(۳۰ روز\): ۳ پیام · پاسخ ۳ · رزرو ۱ · شروع دوباره ۱/.test(reNightLine_()), reNightLine_());
    TG_MEM['rep:RE_CARD_DAY'] = ''; TG_MEM['re:now'] = new Date('2026-10-13T08:00:00+03:30').getTime();
    ok('پیش از ۱۰ صبح کارتی نمی‌آید', reTick_() === 0);
    TG_CFG_.REACTIVATE_ENABLED = '';
    ok('خاموش: هیچ', reTick_() === 0 && reSeen_('603') === false && reNightLine_() === '');
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally {
    tgDutyClinic_ = st.clin; tgSessFree_ = st.free; tgSessRows_ = st.rows;
    TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; TG_OWNER_CHAT = keep.own;
  }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'reTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['بازگرداندن مراجعان قدیمی (v170.23.14)', 'reTests']); } catch (eRe) {}
