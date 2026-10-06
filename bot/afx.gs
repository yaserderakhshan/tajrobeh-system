/**
 * afx.gs · v170.29 · خودکارسازی کارهای روی زمین مانده، بخش ۱ (بند و۱۰، تصمیم یاسر)
 *
 * ۱. کار «تماس اول لید» (T- در هاب عملیات و K- در هاب پذیرش) با اولین تماس ثبت‌شده بسته می‌شود:
 *    «آخرین تماس» معتبر دارد، یا وضعیت لید از «جدید» جلوتر رفته (پاسخ نداد هم یعنی تماس گرفته شد)، یا لید بسته است.
 *    - کارهای باز فعلی: اول پیش‌نمایش «آشتی کارهای تماس اول · پیش‌نمایش»؛ Cowork در B1 «اوکی» می‌نویسد؛ بعد اعمال و از آن به بعد ساعتی خودکار.
 *    - کار بی‌صاحب ساخته نمی‌شود (مسئول پذیرش جای خالی را می‌گیرد) و مهلت نامعتبر (مثل ۱۹۷۰) خوانده نمی‌شود (ops.gs).
 * ۲. یادآوری تکمیل پروفایل برای «دعوت شد / در حال تکمیل / نیمه‌کاره»: هر ۷ روز یک بار، حداکثر ۳ بار، روزی حداکثر ۱۰ نفر،
 *    ۱۰ تا ۱۹ تهران، با همان متن‌های تأییدشدهٔ tgPqRemind. کسی که صفحه‌اش منتشر شده یا «فقط برای تیم» زده، نه.
 * ۳. بعد از هر آپلود رزومه، نسخهٔ سبک همان لحظه (بعد از فرستادن سؤال بعد) با جمنای ساخته می‌شود؛ فقط با کلید پولی (aiPaid_).
 */
var AFX_RC_TAB = 'آشتی کارهای تماس اول · پیش‌نمایش';
var AFX_RC_HEAD = ['کار', 'هاب', 'لید', 'وضعیت لید', 'تماس ثبت‌شده', 'تصمیم', 'دلیل'];
var AFX_PQ_GAP_D = 7, AFX_PQ_MAX = 3, AFX_PQ_DAY = 10;

function afxDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function afxNow_() { return afxDry_() && TG_MEM['afx:now'] ? Number(TG_MEM['afx:now']) : Date.now(); }
function afxProp_(k, v) {
  if (afxDry_()) { if (v !== undefined) TG_MEM['afxp:' + k] = v; return TG_MEM['afxp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}

/* ───── ۱. تماس اول لید ───── */
/** نقشهٔ لیدها: کد ← {st, touched} (یک بار خواندن تب لیدها) */
function afxLeads_() {
  if (afxDry_()) return TG_MEM['afx:leads'] || {};
  var sh = tgSS_().getSheetByName(TG_LEADS), n = sh ? sh.getLastRow() : 0, out = {};
  if (n < 2) return out;
  var cc = tgLeadCodeCol_(), v = sh.getRange(2, 1, n - 1, Math.max(cc, 11)).getValues(), now = new Date();
  v.forEach(function (r) {
    var code = String(r[cc - 1] || '').trim(); if (!code) return;
    var raw = String(r[8] || '').trim();
    out[code] = { st: tgStOf_(raw) || raw, touched: !!tgContactDate_(r[10], now) };
  });
  return out;
}
/** تصمیم برای یک کار تماس اول: done | keep | check */
function afxCallDecide_(lead) {
  if (!lead) return { d: 'check', why: 'لید پیدا نشد؛ دست نمی‌خورد' };
  if (lead.touched) return { d: 'done', why: 'تماس ثبت شده' };
  if (lead.st && lead.st !== TG_ST.NEW) return { d: 'done', why: 'وضعیت لید «' + lead.st + '»' };
  return { d: 'keep', why: 'هنوز تماسی ثبت نشده' };
}
var AFX_CALL_RX = /^تماس اول (?:با )?لید\s+(L-\d+)/;
function afxCallRows_() {
  var L = afxLeads_(), out = [];
  var ops = afxDry_() ? (TG_MEM['ops:rows'] || []) : (function () { try { return opsRows_(); } catch (e) { return []; } })();
  ops.forEach(function (t) {
    var m = AFX_CALL_RX.exec(t.title || ''); if (!m || !opsOpen_(t)) return;
    var code = t.ref || m[1], x = afxCallDecide_(L[code]);
    out.push({ hub: 'عملیات', task: t.code, lead: code, st: (L[code] || {}).st || '', touched: (L[code] || {}).touched ? 'بله' : 'نه', d: x.d, why: x.why });
  });
  var tsk = afxDry_() ? (TG_MEM['afx:tsk'] || []) : (function () { try { return tgTskRows_(); } catch (e) { return []; } })();
  tsk.forEach(function (r) {
    var m = AFX_CALL_RX.exec(String(r[1] || '')); if (!m) return;
    if ([TG_TSK_ST.open, TG_TSK_ST.doing].indexOf(String(r[9])) < 0) return;
    var code = m[1], x = afxCallDecide_(L[code]);
    out.push({ hub: 'پذیرش', task: String(r[0]), lead: code, st: (L[code] || {}).st || '', touched: (L[code] || {}).touched ? 'بله' : 'نه', d: x.d, why: x.why });
  });
  return out;
}
function afxCallApply_(rows) {
  var n = 0;
  rows.forEach(function (r) {
    if (r.d !== 'done') return;
    if (afxDry_()) { (TG_MEM['afx:closed'] = TG_MEM['afx:closed'] || []).push(r.task); n++; return; }
    try {
      if (r.hub === 'عملیات') { var t = opsGet_(r.task); if (t && opsOpen_(t)) { t.st = OPS_ST.DONE; t.moved = opsStamp_(); t.note = (t.note ? t.note + ' · ' : '') + 'بستهٔ خودکار: ' + r.why; opsWrite_(t); opsMirror_(t, t.ownerChat); n++; } }
      else if (tgTskSet_(r.task, 10, TG_TSK_ST.done)) { tgTskSet_(r.task, 11, 'بستهٔ خودکار: ' + r.why); n++; }
    } catch (e) { tgErr_('afxCallApply_ ' + r.task, e); }
  });
  return n;
}
function afxCallPreview_() {
  var rows = afxCallRows_(), c = function (d) { return rows.filter(function (r) { return r.d === d; }).length; };
  var sum = 'کار باز تماس اول: ' + rows.length + ' · بسته می‌شود: ' + c('done') + ' · باز می‌ماند: ' + c('keep') + ' · لید پیدا نشد: ' + c('check');
  if (afxDry_()) { TG_MEM['afx:rc'] = rows; return sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(AFX_RC_TAB) || ss.insertSheet(AFX_RC_TAB);
  if (/^اعمال شد/.test(String(sh.getRange(1, 2).getValue() || ''))) return sum + ' · پیش از این اعمال شده';
  sh.clear(); sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, 3).setValues([['بررسی Cowork: بعد از بررسی، Cowork در B1 «اوکی» می‌نویسد', '', 'v170.29 · ' + sum]]).setFontWeight('bold');
  sh.getRange(2, 1, 1, AFX_RC_HEAD.length).setValues([AFX_RC_HEAD]).setFontWeight('bold').setBackground('#f5f5f8');
  if (rows.length) sh.getRange(3, 1, rows.length, AFX_RC_HEAD.length).setNumberFormat('@').setValues(rows.map(function (r) { return [r.task, r.hub, r.lead, r.st, r.touched, r.d === 'done' ? 'بسته می‌شود' : r.d === 'keep' ? 'باز می‌ماند' : 'دست نمی‌خورد', r.why]; }));
  sh.setFrozenRows(2);
  return sum;
}
/** ساعتی: قبل از «اوکی» هیچ؛ با «اوکی» اعمال یک‌باره و روشن شدن قاعده؛ بعد از آن ساعتی همان قاعده */
function afxCallTick_() {
  if (afxProp_('AFX_CALL_ON') !== '1') {
    var ok = afxDry_() ? TG_MEM['afx:ok'] : (function () { var sh = tgSS_().getSheetByName(AFX_RC_TAB); return sh ? String(sh.getRange(1, 2).getValue() || '').trim() : ''; })();
    if (ok !== 'اوکی') return 0;
    afxProp_('AFX_CALL_ON', '1');
    var n0 = afxCallApply_(afxCallRows_());
    if (!afxDry_()) { try { tgSS_().getSheetByName(AFX_RC_TAB).getRange(1, 2).setValue('اعمال شد ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + n0 + ' کار بسته شد'); } catch (e) {} }
    return n0;
  }
  return afxCallApply_(afxCallRows_());
}

/* ───── ۲. یادآوری تکمیل پروفایل ───── */
function afxPqDue_(v, now) {
  var to = String(v.chat || '').split(/[,،;\s]+/)[0];
  if (!to || String(v.page || '') || TG_PQ_OPEN.indexOf(String(v.status || '')) < 0) return null;
  if (String(v.consent || '').indexOf('فقط برای تیم') > -1) return null;
  var n = Number(v.remind_n || 0) || (String(v.remind || '') ? 1 : 0);
  if (n >= AFX_PQ_MAX) return null;
  var last = Number(v.remind_at || 0) || (String(v.remind || '') ? 1 : 0);   /* یادآوری قدیمی بی زمان ← همین حالا نه، دور بعد */
  if (last === 1 && !v.remind_at) return { to: to, n: n, wait: true };
  if (last && now - last < AFX_PQ_GAP_D * 86400000) return null;
  return { to: to, n: n };
}
function afxPqTick_() {
  var now = afxNow_(), d = new Date(now), h = Number(Utilities.formatDate(d, TG_TZ, 'H')), day = Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd');
  if (h < 10 || h >= 19) return 0;
  var sent = afxProp_('AFX_PQ_DAY') === day ? Number(afxProp_('AFX_PQ_N') || 0) : 0, seen = {}, out = 0;
  tgPrAll_().forEach(function (r) {
    if (sent >= AFX_PQ_DAY) return;
    var v = r.v, x = afxPqDue_(v, now); if (!x || seen[x.to]) return;
    seen[x.to] = 1;
    if (x.wait) { tgPqPut_(v.id, { remind_n: String(x.n), remind_at: String(now) }); return; }   /* یادآوری دستی قبلی ← شمار از ۱ و فاصله از حالا */
    var fresh = String(v.status) === 'دعوت شد';
    var res = tgNotify_(x.to, TG_NK.invite, 'سلام ' + tgEsc_(v.name) + '،\n\n' + (fresh
      ? '🪪 یادآوری کوتاه: صفحه‌های شخصی همکاران در سایت تجربه یکی‌یکی منتشر می‌شود و جای صفحهٔ شما هم خالی است. پرسش‌نامه حدود ده دقیقه وقت می‌گیرد و هر جا خواستید می‌توانید بعداً ادامه دهید.'
      : '🪪 یادآوری کوتاه: پرسش‌نامهٔ صفحهٔ شما نیمه‌کاره مانده. از همان جایی که رها کرده بودید ادامه می‌دهیم و فقط پرسش‌های باقی‌مانده را می‌پرسیم.') +
      '\n\nوقتی صفحه منتشر شد، لینکش را همین‌جا برایتان می‌فرستیم.',
      { ref: 'PQ-REMIND', markup: { inline_keyboard: [[{ text: fresh ? '🪪 شروع می‌کنم' : '🪪 ادامه می‌دهم', callback_data: 'pq:go' }], [{ text: '👀 صفحه‌های همکاران', url: 'https://tajrobeh.life/team/' }]] } });
    if (res === 'رفت' || res === 'صف') { tgPqPut_(v.id, { remind: tgPqNow_(), remind_n: String(x.n + 1), remind_at: String(now) }); sent++; out++; }
  });
  afxProp_('AFX_PQ_DAY', day); afxProp_('AFX_PQ_N', String(sent));
  return out;
}

/* ───── ۳. رزومهٔ سبک بعد از آپلود ───── */
function afxCvNow_(id) {
  if (typeof aiPaid_ !== 'function' || !aiPaid_() || typeof ktbResumeMake_ !== 'function') return false;
  var r = tgPrAll_().filter(function (x) { return x.v.id === id; })[0];
  if (!r || String(r.v.pub_resume_draft || '').trim()) return false;
  return ktbResumeMake_(r);
}

/* ───── ساعتی ───── */
function afxHourly_() {
  var n = 0;
  try { n += afxCallTick_(); } catch (e1) { tgErr_('afxCallTick_', e1); }
  try { n += afxPqTick_(); } catch (e2) { tgErr_('afxPqTick_', e2); }
  return n;
}
/* یک‌بارهٔ خودکار v170.29: فقط پیش‌نمایش آشتی (بی تغییر داده) */
function tgV17029Afx() { return afxCallPreview_(); }

/* ───── آزمون ───── */
function afxTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'afx:now': new Date('2026-10-10T11:00:00+03:30').getTime(), 'ops:on': 1 };
  try {
    TG_MEM['afx:leads'] = { 'L-1': { st: TG_ST.NEW, touched: true }, 'L-2': { st: TG_ST.NOANS, touched: false }, 'L-3': { st: TG_ST.NEW, touched: false } };
    TG_MEM['ops:rows'] = [{ code: 'T-1001', title: 'تماس اول با لید L-1', ref: 'L-1', st: OPS_ST.NEW }, { code: 'T-1002', title: 'تماس اول با لید L-3', ref: 'L-3', st: OPS_ST.NEW },
                          { code: 'T-1003', title: 'تماس اول با لید L-9', ref: 'L-9', st: OPS_ST.NEW }, { code: 'T-1004', title: 'کار دیگر', ref: 'L-1', st: OPS_ST.NEW }];
    TG_MEM['afx:tsk'] = [['K-001', 'تماس اول لید L-2', '', 'پذیرش', '', '', '', '', '', TG_TSK_ST.open], ['K-002', 'تماس اول لید L-1', '', 'پذیرش', '', '', '', '', '', TG_TSK_ST.done]];
    var sum = tgV17029Afx(), rows = TG_MEM['afx:rc'] || [];
    ok('پیش‌نمایش: فقط کارهای باز تماس اول', rows.length === 4 && sum.indexOf('بسته می‌شود: 2') > -1, sum);
    ok('تماس ثبت‌شده ← بسته؛ «پاسخ نداد» ← بسته', rows.filter(function (r) { return r.d === 'done'; }).map(function (r) { return r.task; }).sort().join() === 'K-001,T-1001');
    ok('لید پیدا نشد ← دست نمی‌خورد', rows.filter(function (r) { return r.task === 'T-1003'; })[0].d === 'check');
    ok('بی «اوکی» Cowork چیزی بسته نمی‌شود', afxCallTick_() === 0 && !(TG_MEM['afx:closed'] || []).length);
    TG_MEM['afx:ok'] = 'اوکی';
    ok('با «اوکی» اعمال و روشن', afxCallTick_() === 2 && afxProp_('AFX_CALL_ON') === '1');
    ok('مهلت ۱۹۷۰ خوانده نمی‌شود', opsObj_(['T-9', 'x', '', '', '', '', '', '', '', '', 0], 2).dueAt === null && opsObj_(['T-9', 'x', '', '', '', '', '', '', '', '', new Date(0)], 2).dueAt === null);
    /* یادآوری پروفایل */
    TG_MEM['pqrows'] = {
      a: { id: 'a', name: 'نمونهٔ یک', chat: '801', status: 'در حال تکمیل' },
      b: { id: 'b', name: 'نمونهٔ دو', chat: '802', status: 'در حال تکمیل', page: 'https://x/team/b/' },
      c: { id: 'c', name: 'نمونهٔ سه', chat: '803', status: 'نیمه‌کاره', remind_n: '3', remind_at: '1' },
      d: { id: 'd', name: 'نمونهٔ چهار', chat: '804', status: 'دعوت شد', remind: 'قدیمی' }
    };
    var n1 = afxPqTick_();
    ok('یادآوری فقط برای منتظرِ بی‌صفحه و زیر سقف', n1 === 1 && JSON.stringify(TG_MEM['notify'] || []).indexOf('801') > -1 && JSON.stringify(TG_MEM['notify']).indexOf('802') < 0 && JSON.stringify(TG_MEM['notify']).indexOf('803') < 0);
    ok('یادآوری دستی قبلی ← شمار ۱ و فاصله از حالا', TG_MEM['pqrows'].d.remind_n === '1' && JSON.stringify(TG_MEM['notify']).indexOf('804') < 0);
    ok('فاصلهٔ ۷ روزه', afxPqTick_() === 0);
    TG_MEM['afx:now'] += 8 * 86400000; TG_MEM['capdry'] = {};   /* سقف روزانهٔ سیاست پیام در حالت خشک روز نمی‌شناسد */
    ok('بعد از ۷ روز دوباره', afxPqTick_() === 2 && TG_MEM['pqrows'].a.remind_n === '2');
    TG_MEM['afx:now'] += 8 * 86400000; TG_MEM['capdry'] = {}; afxPqTick_(); TG_MEM['afx:now'] += 8 * 86400000; TG_MEM['capdry'] = {}; afxPqTick_();
    ok('سقف سه یادآوری', TG_MEM['pqrows'].a.remind_n === '3' && afxPqTick_() === 0);
    ok('رزومهٔ سبک بی کلید پولی ساخته نمی‌شود', afxCvNow_('a') === false);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'afxTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['خودکارسازی کارهای مانده (v170.29)', 'afxTests']); } catch (eAfx) {}
