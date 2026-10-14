/**
 * psyref.gs · v170.68 · پروندهٔ ارجاع روان‌پزشکی از درمانگر (تصمیم یاسر)
 *
 * هر درمانگر (tgWhoTherapist_) با «🩺 ارجاع به روان‌پزشک» در منوی خودش، یا همان مسیر در مینی‌اپ (ther.psyref)،
 * مراجعش را به روان‌پزشکی ارجاع می‌دهد: نام را می‌نویسد یا از مراجعان خودش (لیدهایی که «درمانگر معارفه» آن‌ها خود اوست)
 * انتخاب می‌کند، و دلیل کلی را از فهرست بسته می‌زند. متن آزاد بالینی گرفته نمی‌شود.
 * - تب‌ها همان تب‌های موجود: سطر پرونده در «نوبت‌های روان‌پزشکی» (دفتر تجربه، tgPsyTab_) با کد R-1001 به بالا و وضعیت
 *   «ارجاع شد»؛ هر قدم یک سطر در «رویدادهای روان‌پزشکی» (ps3Ev_: زمان، کد، قدم، کی، از، به). تب تازه ساخته نمی‌شود.
 * - قدم‌ها فقط PSR_STEPS و به ترتیب. مسئول روان‌پزشکی همان لحظه کارت با دکمهٔ هر قدم می‌گیرد.
 * - اگر تا PSR_REMIND_WD روز کاری «تماس گرفته شد» نخورد، یک یادآوری در ساعت کاری (grdInHours_) به مسئول.
 * - در «ویزیت انجام شد» پرسش رضایت؛ فقط با «بله» همان یک جمله (PSR_DONE_TXT) به درمانگر ارجاع‌دهنده.
 * - هیچ نام دارو، نسخه، تشخیص یا متن بالینی جایی ثبت نمی‌شود؛ پرونده و نسخه فقط در سامانهٔ بقراط است.
 * وضعیت پرونده‌های باز: Script Property «PSR_ST» (پروندهٔ بسته پاک می‌شود). حالت خشک: TG_MEM['psr:*']، ['psyappt']، ['ps3:ev'].
 */
var PSR_BTN = '🩺 ارجاع به روان‌پزشک';
var PSR_REMIND_WD = 2;            /* روز کاری تا یادآوری «تماس گرفته شد» */
var PSR_FROM = 1001;              /* کد اولین پرونده: R-1001 */
var PSR_STEPS = ['ارجاع شد', 'تماس گرفته شد', 'پرونده در بقراط باز شد', 'نوبت داده شد', 'ویزیت انجام شد', 'بسته'];
var PSR_VISIT = 4;                /* شمارهٔ قدم «ویزیت انجام شد» در PSR_STEPS */
var PSR_REASONS = ['ارزیابی دارویی', 'بازبینی دارو', 'تشخیص افتراقی', 'سایر'];
var PSR_DONE_TXT = 'ویزیت روان‌پزشکی مراجع ارجاعی شما انجام شد.';
var PSR_MAXC = 8;

function psrDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function psrNow_() { return psrDry_() && TG_MEM['psr:now'] ? Number(TG_MEM['psr:now']) : Date.now(); }
function psrAll_() {
  if (psrDry_()) return JSON.parse(JSON.stringify(TG_MEM['psr:st'] || {}));
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('PSR_ST') || '{}'); } catch (e) { return {}; }
}
function psrSave_(all) {
  if (psrDry_()) { TG_MEM['psr:st'] = JSON.parse(JSON.stringify(all)); return; }
  PropertiesService.getScriptProperties().setProperty('PSR_ST', JSON.stringify(all));
}
/* دسترسی: درمانگر برای ساختن ارجاع، مسئول روان‌پزشکی برای قدم‌ها */
function psrCan_(chat, kind) {
  if (kind === 'head') return tgPsyIsHead_(chat);
  return !!tgWhoTherapist_(chat);
}

/* ───── کد و سطر در «نوبت‌های روان‌پزشکی» ───── */
function psrRows_() {
  if (psrDry_()) return TG_MEM['psyappt'] = TG_MEM['psyappt'] || [];
  var sh = tgPsyTab_(TG_PSY_ACC.tj, TG_PSY_T_APPT, TG_PSY_H_APPT);
  return sh && sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
}
function psrNextCode_() {
  var max = PSR_FROM - 1;
  psrRows_().forEach(function (r) { var m = /^R-(\d+)$/.exec(String(r[0] || '').trim()); if (m) max = Math.max(max, Number(m[1])); });
  Object.keys(psrAll_()).forEach(function (k) { var m = /^R-(\d+)$/.exec(k); if (m) max = Math.max(max, Number(m[1])); });
  return 'R-' + (max + 1);
}
function psrAddRow_(code, x) {
  var row = [code, new Date(psrNow_()), '', tgCell_(x.n), String(x.ch || ''), '', '', TG_PSY_ACC.tj, PSR_STEPS[0], '',
    tgCell_('ارجاع از درمانگر ' + x.th + ' · ' + x.why + (x.lead ? ' · لید ' + x.lead : ''))];
  if (psrDry_()) { psrRows_().push(row); return; }
  var sh = tgPsyTab_(TG_PSY_ACC.tj, TG_PSY_T_APPT, TG_PSY_H_APPT);
  if (sh) sh.appendRow(row); else tgErr_('psrAddRow_', 'تب نوبت‌های روان‌پزشکی پیدا نشد', code);
}
function psrSetStatus_(code, step) {
  var f = tgPsyApptFind_(code); if (!f) return;
  if (psrDry_()) { f.v[8] = step; return; }
  f.sh.getRange(f.row, 9).setValue(step);
}

/* ───── مراجعان خود درمانگر: لیدهایی که «درمانگر معارفه» اوست (تازه‌ترها اول) ───── */
function psrClients_(name) {
  var L = [];
  if (psrDry_()) L = TG_MEM['psr:leads'] || [];
  else { try { var o = tgLeadsRaw_(); for (var i = Math.max(0, o.v.length - 400); i < o.v.length; i++) { try { L.push(tgLeadOfRow_(o.v[i], i + 2, o.hm)); } catch (e1) {} } } catch (e) { tgErr_('psrClients_', e); } }
  var seen = {}, out = [];
  for (var j = L.length - 1; j >= 0 && out.length < PSR_MAXC; j--) {
    var l = L[j]; if (!l || !l.name || tgNorm_(l.meetTher) !== tgNorm_(name)) continue;
    var k = tgNorm_(l.name); if (seen[k]) continue; seen[k] = 1;
    out.push({ n: l.name, lead: l.code || '', ch: l.chatId || '' });
  }
  return out;
}

/* ───── درمانگر: ساختن ارجاع ───── */
function psrStart_(chat) {
  var who = tgWhoTherapist_(chat); if (!who) return tgSend_(chat, 'این بخش مخصوص درمانگران تجربه است.');
  var L = psrClients_(who.name);
  tgSetVal_('psr', chat, JSON.stringify({ s: 'name', L: L }));
  var kb = L.map(function (c, i) { return [{ text: c.n, callback_data: 'psr:c:' + i }]; });
  kb.push([{ text: 'انصراف', callback_data: 'psr:x' }]);
  return tgSend_(chat, '🩺 <b>ارجاع به روان‌پزشک</b>\nنام مراجع را بنویسید' + (L.length ? ' یا از مراجعان خودتان انتخاب کنید.' : '.'), { inline_keyboard: kb });
}
function psrAskWhy_(chat, st) {
  tgSetVal_('psr', chat, JSON.stringify(st));
  var kb = PSR_REASONS.map(function (r, i) { return [{ text: r, callback_data: 'psr:r:' + i }]; });
  kb.push([{ text: 'انصراف', callback_data: 'psr:x' }]);
  return tgSend_(chat, 'دلیل کلی ارجاع <b>' + tgEsc_(st.n) + '</b>؟', { inline_keyboard: kb });
}
function psrCreate_(chat, st, ri) {
  var who = tgWhoTherapist_(chat), why = PSR_REASONS[ri];
  if (!who || !why || !st.n) return tgSend_(chat, 'دوباره از «' + PSR_BTN + '» شروع کنید.');
  tgDel_('psr', chat);
  var lock = null;
  if (!psrDry_()) { try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (eL) { lock = null; } }
  try {
    var code = psrNextCode_(), now = psrNow_();
    psrAddRow_(code, { n: st.n, ch: st.ch, lead: st.lead, th: who.name, why: why });
    var all = psrAll_();
    all[code] = { th: who.name, tc: String(chat), n: st.n, lead: st.lead || '', why: why, s: 0, t: now };
    psrSave_(all);
  } finally { if (lock) { try { lock.releaseLock(); } catch (eR) {} } }
  ps3Ev_(code, PSR_STEPS[0], 'درمانگر', '', PSR_STEPS[0], why);
  var cs = tgPsyRoleChats_();
  if (!cs.length) tgErr_('psrCreate_', 'مسئول روان‌پزشکی وصل نیست', code);
  cs.forEach(function (c) { tgNotify_(c, TG_NK.task, psrCard_(code), { ref: code, markup: psrKb_(code) }); });
  return tgSend_(chat, '✅ ارجاع ثبت شد · <code>' + code + '</code>\nمسئول روان‌پزشکی پیگیری می‌کند.', tgTherMenu_());
}

/* ───── کارت مسئول روان‌پزشکی ───── */
function psrCard_(code) {
  var x = psrAll_()[code]; if (!x) return '🩺 پروندهٔ ارجاع <code>' + code + '</code> بسته است.';
  var T = ['🩺 <b>ارجاع روان‌پزشکی</b> · <code>' + code + '</code>',
    'مراجع: <b>' + tgEsc_(x.n) + '</b>' + (x.lead ? ' · <code>' + tgEsc_(x.lead) + '</code>' : ''),
    'ارجاع از: ' + tgEsc_(x.th), 'دلیل کلی: ' + tgEsc_(x.why), ''];
  PSR_STEPS.forEach(function (s, i) { T.push((i <= x.s ? '✅ ' : '▫️ ') + s); });
  if (x.q) T.push('', 'مراجع رضایت داده که به درمانگر خبر داده شود؟');
  return T.join('\n');
}
function psrKb_(code) {
  var x = psrAll_()[code]; if (!x) return null;
  if (x.q) return { inline_keyboard: [[{ text: 'بله', callback_data: 'psr:y:' + code }, { text: 'نه', callback_data: 'psr:n:' + code }]] };
  var kb = [];
  for (var i = 1; i < PSR_STEPS.length; i++) kb.push([{ text: (i <= x.s ? '✅ ' : (i === x.s + 1 ? '👈 ' : '')) + PSR_STEPS[i], callback_data: 'psr:s:' + code + ':' + i }]);
  return { inline_keyboard: kb };
}
function psrStep_(chat, code, i) {
  var all = psrAll_(), x = all[code];
  if (!x) return tgSend_(chat, 'این پرونده باز نیست: ' + code);
  if (x.q) return tgSend_(chat, 'اول به پرسش رضایت جواب بدهید.', psrKb_(code));
  if (!(i > x.s)) return tgSend_(chat, 'این قدم ثبت شده است.', psrKb_(code));
  if (i !== x.s + 1) return tgSend_(chat, 'قدم بعدی: «' + PSR_STEPS[x.s + 1] + '».', psrKb_(code));
  var from = PSR_STEPS[x.s];
  x.s = i; if (i === 1) x.c = psrNow_(); if (i === PSR_VISIT) x.q = 1;
  if (i === PSR_STEPS.length - 1) delete all[code]; else all[code] = x;
  psrSave_(all);
  psrSetStatus_(code, PSR_STEPS[i]);
  ps3Ev_(code, PSR_STEPS[i], 'مسئول روان‌پزشکی', from, PSR_STEPS[i]);
  if (i === PSR_STEPS.length - 1) return tgSend_(chat, '✅ پروندهٔ <code>' + code + '</code> بسته شد.');
  return tgSend_(chat, psrCard_(code), psrKb_(code));
}
function psrConsent_(chat, code, yes) {
  var all = psrAll_(), x = all[code];
  if (!x || !x.q) return tgSend_(chat, 'این پرسش دیگر باز نیست.');
  delete x.q; x.cs = yes ? 'بله' : 'نه'; all[code] = x; psrSave_(all);
  ps3Ev_(code, 'رضایت خبر به درمانگر', 'مسئول روان‌پزشکی', '', x.cs);
  if (yes && x.tc) tgNotify_(x.tc, TG_NK.task, PSR_DONE_TXT, { ref: code });
  return tgSend_(chat, (yes ? '✅ به درمانگر خبر داده شد.' : '✅ ثبت شد؛ به درمانگر خبری نمی‌رود.') + '\n\n' + psrCard_(code), psrKb_(code));
}

/* ───── یادآوری: PSR_REMIND_WD روز کاری بی «تماس گرفته شد»، یک بار، در ساعت کاری ───── */
function psrDue_(t0) {
  var x = t0, k = 0;
  while (k < PSR_REMIND_WD) { x += 86400000; if (grdTehran_(x).wd !== 5) k++; }
  return x;
}
function psrTick_() {
  var now = psrNow_(); if (!grdInHours_(now)) return 0;
  var all = psrAll_(), n = 0;
  Object.keys(all).forEach(function (code) {
    var x = all[code]; if (x.s !== 0 || x.rm || now < psrDue_(x.t)) return;
    x.rm = 1; n++;
    tgPsyRoleChats_().forEach(function (c) { tgNotify_(c, TG_NK.task, '⏰ یادآوری: ارجاع <code>' + code + '</code> هنوز «' + PSR_STEPS[1] + '» نخورده است.\n\n' + psrCard_(code), { ref: code, markup: psrKb_(code) }); });
  });
  if (n) psrSave_(all);
  return n;
}

/* ───── مسیریابی ───── */
function psrRoute_(chat, m) {
  var t = String((m && m.text) || '').trim();
  if (t === PSR_BTN || t === '/psyref') { if (!psrCan_(chat, 'ther')) return false; psrStart_(chat); return true; }
  var raw = tgGetVal_('psr', chat); if (!raw || !t) return false;
  var st = {}; try { st = JSON.parse(raw); } catch (e) {}
  if (st.s !== 'name') return false;
  if (t === '/cancel' || t === 'انصراف' || t.charAt(0) === '/') { tgDel_('psr', chat); tgSend_(chat, 'باشد.', tgTherMenu_()); return true; }
  if (t.length < 2 || t.length > 60 || /[0-9۰-۹@\n]/.test(t)) { tgSend_(chat, 'فقط نام مراجع را بنویسید (بی شماره).'); return true; }
  psrAskWhy_(chat, { s: 'why', n: t, lead: '', ch: '' });
  return true;
}
function psrCb_(chat, data) {
  var a = String(data).split(':'), act = a[1];
  if (act === 's' || act === 'y' || act === 'n') {
    if (!psrCan_(chat, 'head')) return tgSend_(chat, 'این دکمه مخصوص مسئول روان‌پزشکی است.');
    if (act === 's') return psrStep_(chat, a[2], Number(a[3]));
    return psrConsent_(chat, a[2], act === 'y');
  }
  if (!psrCan_(chat, 'ther')) return tgSend_(chat, 'این دکمه مخصوص درمانگران تجربه است.');
  var st = {}; try { st = JSON.parse(tgGetVal_('psr', chat) || '{}'); } catch (e) {}
  if (act === 'x') { tgDel_('psr', chat); return tgSend_(chat, 'باشد.', tgTherMenu_()); }
  if (act === 'c') { var c = (st.L || [])[Number(a[2])]; if (st.s !== 'name' || !c) return tgSend_(chat, 'دوباره از «' + PSR_BTN + '» شروع کنید.'); return psrAskWhy_(chat, { s: 'why', n: c.n, lead: c.lead, ch: c.ch }); }
  if (act === 'r') { if (st.s !== 'why') return tgSend_(chat, 'دوباره از «' + PSR_BTN + '» شروع کنید.'); return psrCreate_(chat, st, Number(a[2])); }
  return null;
}

/* ───── آزمون ───── */
function psrTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, th: TG_DRY_THER };
  var ev = function () { return (TG_MEM['ps3:ev'] || []).map(function (r) { return [r[1], r[2], r[4], r[5]].join('|'); }); };
  var sent = function () { return JSON.stringify([TG_OUTBOX, TG_MEM['notify'] || []]); };
  /* مسیر کامل یک پرونده؛ درمانگر و مسئول نمونه، دادهٔ ساختگی */
  var flow = function (consent) {
    TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'psr:now': new Date('2026-10-10T10:00:00+03:30').getTime() };   /* شنبه */
    TG_MEM['people'] = [{ row: 2, id: 'P-1', name: 'مسئول نمونه', chat: '200', roles: ['روان‌پزشکی'], status: 'فعال' }];
    TG_MEM['psr:leads'] = [{ name: 'مراجع الف', code: 'L-9001', chatId: '901', meetTher: 'درمانگر نمونه' }, { name: 'مراجع ب', code: 'L-9002', meetTher: 'درمانگر دیگر' }];
    TG_DRY_THER = { name: 'درمانگر نمونه', row: 4, chat: '300' };
    psrRoute_('300', { text: PSR_BTN });
    psrCb_('300', 'psr:c:0'); psrCb_('300', 'psr:r:0');
    var code = Object.keys(TG_MEM['psr:st'] || {})[0];
    TG_DRY_THER = null;
    for (var i = 1; i <= PSR_VISIT; i++) psrCb_('200', 'psr:s:' + code + ':' + i);
    psrCb_('200', 'psr:' + (consent ? 'y' : 'n') + ':' + code);
    psrCb_('200', 'psr:s:' + code + ':' + (PSR_STEPS.length - 1));
    return code;
  };
  try {
    /* ۱. منو و مینی‌اپ */
    ok('دکمه در منوی درمانگر', JSON.stringify(tgTherMenu_()).indexOf(PSR_BTN) > -1);
    ok('مسیر مینی‌اپ: ther.psyref در رجیستری و مسیر', TG_CAP.some(function (c) { return c.api === 'ther.psyref' && c.app; }) && String(tgApiRoute_).indexOf("api === 'ther.psyref'") > -1);
    ok('دکمه‌های اینلاین در مینی‌اپ مجازند', TG_API_CB_THER.indexOf('psr:') > -1);
    ok('کال‌بک psr: به مسیریاب وصل است', String(tgOnCallback_).indexOf("'psr:'") > -1);
    ok('متن به psrRoute_ می‌رسد', String(tgPrivate_).indexOf('psrRoute_') > -1);

    /* ۲. ساختن ارجاع با انتخاب از مراجعان خود درمانگر */
    TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'psr:now': new Date('2026-10-10T10:00:00+03:30').getTime() };
    TG_MEM['people'] = [{ row: 2, id: 'P-1', name: 'مسئول نمونه', chat: '200', roles: ['روان‌پزشکی'], status: 'فعال' }];
    TG_MEM['psr:leads'] = [{ name: 'مراجع الف', code: 'L-9001', chatId: '901', meetTher: 'درمانگر نمونه' }, { name: 'مراجع ب', code: 'L-9002', meetTher: 'درمانگر دیگر' }];
    TG_DRY_THER = null;
    ok('غیردرمانگر دکمه را نمی‌گیرد', psrRoute_('777', { text: PSR_BTN }) === false);
    TG_DRY_THER = { name: 'درمانگر نمونه', row: 4, chat: '300' };
    psrRoute_('300', { text: PSR_BTN });
    var kb0 = JSON.stringify(TG_OUTBOX[TG_OUTBOX.length - 1].markup || TG_OUTBOX[TG_OUTBOX.length - 1].kb || '');
    ok('فهرست فقط مراجعان خود درمانگر', /مراجع الف/.test(sent()) && !/مراجع ب/.test(kb0));
    psrCb_('300', 'psr:c:0');
    ok('دلیل کلی فقط از فهرست بسته', PSR_REASONS.every(function (r) { return sent().indexOf(r) > -1; }));
    psrCb_('300', 'psr:r:0');
    var r0 = (TG_MEM['psyappt'] || [])[0] || [];
    ok('سطر R-1001 با وضعیت «ارجاع شد» در نوبت‌های روان‌پزشکی', r0[0] === 'R-1001' && r0[8] === 'ارجاع شد' && r0[3] === 'مراجع الف' && r0[4] === '901' && r0[7] === TG_PSY_ACC.tj, JSON.stringify(r0));
    ok('یک سطر در رویدادهای روان‌پزشکی', ev().join(',') === 'R-1001|ارجاع شد||ارجاع شد', ev().join(','));
    ok('کارت با دکمهٔ هر قدم به مسئول', (TG_MEM['notify'] || []).some(function (x) { return x.chat === '200' && /R-1001/.test(x.text); }) &&
      PSR_STEPS.slice(1).every(function (s, i) { return sent().indexOf('psr:s:R-1001:' + (i + 1)) > -1; }));
    /* نام نوشتنی و کد بعدی */
    psrRoute_('300', { text: PSR_BTN });
    ok('نام با شماره پذیرفته نمی‌شود', psrRoute_('300', { text: 'مراجع ۰۹۱۲' }) === true && JSON.parse(tgGetVal_('psr', '300')).s === 'name');
    psrRoute_('300', { text: 'مراجع پ' }); psrCb_('300', 'psr:r:3');
    ok('نام نوشتنی ← R-1002', (TG_MEM['psyappt'][1] || [])[0] === 'R-1002' && TG_MEM['psyappt'][1][3] === 'مراجع پ');
    TG_DRY_THER = null;

    /* ۳. قدم‌ها به ترتیب و فقط مسئول */
    psrCb_('300', 'psr:s:R-1001:1');
    ok('غیرمسئول قدم نمی‌زند', TG_MEM['psr:st']['R-1001'].s === 0);
    psrCb_('200', 'psr:s:R-1001:2');
    ok('قدم خارج از ترتیب رد می‌شود', TG_MEM['psr:st']['R-1001'].s === 0);
    /* ۵. یادآوری ۲ روز کاری (جمعه حساب نیست)، فقط در ساعت کاری، یک بار */
    ok('مهلت یادآوری ثابت قابل تنظیم است', PSR_REMIND_WD === 2);
    TG_MEM['notify'] = [];
    TG_MEM['psr:now'] = new Date('2026-10-12T09:30:00+03:30').getTime();   /* دوشنبه، کمتر از دو روز کاری */
    ok('پیش از مهلت یادآوری نیست', psrTick_() === 0);
    TG_MEM['psr:now'] = new Date('2026-10-12T20:00:00+03:30').getTime();   /* بعد از مهلت ولی بیرون ساعت کاری */
    ok('بیرون ساعت کاری یادآوری نیست', psrTick_() === 0);
    TG_MEM['psr:now'] = new Date('2026-10-13T09:30:00+03:30').getTime();
    ok('یادآوری یک بار در ساعت کاری', psrTick_() === 2 && psrTick_() === 0 && (TG_MEM['notify'] || []).some(function (x) { return x.chat === '200' && /یادآوری/.test(x.text); }));
    var t4 = new Date('2026-10-15T10:00:00+03:30').getTime(), fri = psrDue_(t4);   /* پنجشنبه + ۲ روز کاری = یکشنبه، جمعه حساب نیست */
    ok('جمعه روز کاری نیست', grdTehran_(fri).wd === 7 && fri - t4 === 3 * 86400000);
    psrCb_('200', 'psr:s:R-1001:1');
    ok('«تماس گرفته شد» ← سطر رویداد از و به', ev().indexOf('R-1001|تماس گرفته شد|ارجاع شد|تماس گرفته شد') > -1 && TG_MEM['psyappt'][0][8] === 'تماس گرفته شد');
    TG_MEM['psr:now'] = new Date('2026-10-14T10:00:00+03:30').getTime();
    ok('یادآوری هر پرونده فقط یک بار', psrTick_() === 0);

    /* ۶. رضایت در «ویزیت انجام شد» */
    var cY = flow(true), evY = ev(), notY = (TG_MEM['notify'] || []).filter(function (x) { return x.chat === '300'; });
    ok('با رضایت فقط همان یک جمله به درمانگر', notY.length === 1 && notY[0].text === PSR_DONE_TXT, JSON.stringify(notY));
    ok('همهٔ قدم‌ها به ترتیب، هر کدام یک سطر رویداد', PSR_STEPS.every(function (s, i) { return evY.indexOf(cY + '|' + s + '|' + (i ? PSR_STEPS[i - 1] : '') + '|' + s) > -1; }), evY.join(','));
    ok('پرسش رضایت ثبت شد', evY.indexOf(cY + '|رضایت خبر به درمانگر||بله') > -1);
    ok('پروندهٔ بسته از وضعیت باز پاک شد و سطر «بسته»', !(TG_MEM['psr:st'] || {})[cY] && TG_MEM['psyappt'][0][8] === 'بسته');
    var cN = flow(false), evN = ev();
    ok('بی رضایت هیچ پیامی به درمانگر نمی‌رود', !(TG_MEM['notify'] || []).some(function (x) { return x.chat === '300'; }) && !TG_OUTBOX.some(function (x) { return String(x.chat) === '300' && x.text === PSR_DONE_TXT; }));
    ok('حالت خشک همان رویدادهای مسیر واقعی (بله و نه فقط در رضایت)', evN.length === evY.length && evN.join(',').replace('||نه', '||بله') === evY.join(','));

    /* ۷. بی دادهٔ بالینی */
    var all = JSON.stringify([TG_MEM['psyappt'], TG_MEM['ps3:ev'], TG_OUTBOX, TG_MEM['notify']]);
    ok('هیچ واژهٔ دارو یا نسخه یا تشخیص بیرون از فهرست بسته', !/نسخه|قرص|میلی‌گرم/.test(all.replace(/بازبینی دارو|ارزیابی دارویی|تشخیص افتراقی/g, '')));
    ok('متن‌ها بی خط تیرهٔ وسط جمله و «بیمار» نه', !/[—–]|بیمار/.test(all + PSR_STEPS.join() + PSR_DONE_TXT));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_DRY_THER = keep.th; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'psrTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['روان‌پزشکی: پروندهٔ ارجاع (v170.68)', 'psrTests']); } catch (ePsr) {}
