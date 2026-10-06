/**
 * afx2.gs · v170.30 · خودکارسازی کارهای روی زمین مانده، بخش ۲ (بند و۱۰، تصمیم یاسر)
 *
 * ۱. جواب درمانگر به پیام عملیاتی بات (reply؛ از صندوق یکتا): جمنای می‌خواند و «پیشنهاد ثبت» (تب مقصد و مقدار) کنار پیام صاحب
 *    کار می‌گذارد. فقط پیشنهاد؛ هیچ چیز خودکار نوشته نمی‌شود. فقط با کلید پولی و اطمینان ≥ ۰٫۷.
 * ۲. گزارش هفتگی «درمانگر فعال با ارجاع صفر» (شنبه ۱۰): درمانگر «فعال» که ۳۰ روز در هیچ پیشنهاد یا معارفه‌ای نبوده،
 *    با علت از همان فیلترهای پیشنهاد ارجاع (v168Candidates_): نبودن در استخر، نداشتن وقت خالی ۷ روز آینده، رده، شمار پیشنهاد.
 *    به مدیر عملیات و مسئول پذیرش؛ تب «ارجاع صفر · هفتگی». اسم مراجع نمی‌آید.
 * ۳. درخواست حضوری درمانگر بی اتاق خالی: پذیرش همراه درخواست تا سه جایگزین نزدیک (همان مکان، همان مدت) می‌گیرد.
 * ۴. صبح هر صاحب فقط کارهای خودش: جمع‌بندی صبح پذیرش برای هر نفر فقط لیدهای خودش (لید بی‌مسئول فقط برای مسئول پذیرش)
 *    و رشته‌های بازش در صندوق یکتا. پیام ۹ صبح یاسر: منتظر تأیید خودش، هر چه از مهلت گذشته، و کار بی‌صاحب.
 */
var AFX_ZR_TAB = 'ارجاع صفر · هفتگی';
var AFX_ZR_D = 30;
var AFX_OPS_TARGETS = ['ساعت حضوری', 'روزها و ساعت‌های کاری', 'ظرفیت هفتگی', 'مرخصی', 'هیچ‌کدام'];
var AFX_OPS_SCHEMA = { type: 'OBJECT', properties: { target: { type: 'STRING', enum: AFX_OPS_TARGETS }, value: { type: 'STRING' }, confidence: { type: 'NUMBER' } }, required: ['target', 'value', 'confidence'] };

/* ───── ۱. پیشنهاد ثبت از جواب درمانگر ───── */
function afxOpsSuggest_(chat, text, quoted) {
  if (typeof aiPaid_ !== 'function' || !aiPaid_() || !text) return '';
  if (typeof tgWhoTherapist_ === 'function' && !tgWhoTherapist_(chat) && !(typeof TG_DRY !== 'undefined' && TG_DRY && TG_MEM['afx:ther'])) return '';
  var o;
  try {
    o = aiJson_('یک درمانگر به پیام عملیاتی بات جواب داده. اگر جوابش داده‌ای است که باید در یکی از این تب‌ها ثبت شود، تب و مقدار دقیق را بده: ' + AFX_OPS_TARGETS.join('، ') +
      '. اگر نه، «هیچ‌کدام». فقط از متن جواب؛ چیزی نساز.\n\nپیام بات:\n' + String(quoted || '').slice(0, 800) + '\n\nجواب درمانگر:\n' + String(text).slice(0, 1500), AFX_OPS_SCHEMA, { priv: true, temp: 0 });
  } catch (e) { return ''; }
  if (!o || o.target === 'هیچ‌کدام' || !(Number(o.confidence) >= 0.7) || !String(o.value || '').trim()) return '';
  return '🤖 <b>پیشنهاد ثبت</b> در «' + tgEsc_(o.target) + '»: ' + tgEsc_(String(o.value).slice(0, 200)) + '\n(فقط پیشنهاد؛ ثبت با شما)';
}

/* ───── ۲. درمانگر فعال با ارجاع صفر ───── */
function afxRefCounts_(sinceMs) {
  if (typeof TG_DRY !== 'undefined' && TG_DRY) return TG_MEM['afx:refs'] || {};
  var sh = tgSS_().getSheetByName(TG_LEADS), n = sh ? sh.getLastRow() : 0, out = {};
  if (n < 2) return out;
  var v = sh.getRange(2, 1, n - 1, 22).getValues();
  v.forEach(function (r) {
    var d = r[18] instanceof Date ? r[18] : (r[0] instanceof Date ? r[0] : new Date(String(r[0]) + 'T00:00:00'));
    if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() < sinceMs) return;
    [r[15], r[16], r[17], r[21]].forEach(function (x) { var k = tgNorm_(String(x || '').trim()); if (k) out[k] = (out[k] || 0) + 1; });
  });
  return out;
}
function afxZeroRef_() {
  var ctx = typeof v168SuggestCtx_ === 'function' ? v168SuggestCtx_() : { ther: [], pool: {}, free: {} };
  var refs = afxRefCounts_(afxNow_() - AFX_ZR_D * 86400000), out = [];
  ctx.ther.filter(function (t) { return t.active; }).forEach(function (t) {
    var k = tgNorm_(t.name); if (refs[k]) return;
    var rec = ctx.pool[k], why = [];
    if (!rec) why.push('در استخر ارجاع هیچ موضوعی ندارد');
    else { var pools = Object.keys(rec).filter(function (x) { return !!rec[x] && ['abroad', 'inperson'].indexOf(x) < 0; }); if (!pools.length) why.push('استخرش خالی است'); }
    if (!ctx.free[k]) why.push('در ۷ روز آینده وقت خالی ندارد');
    if (!why.length) why.push('شایسته است ولی انتخاب نشده (رده ' + (t.tier || 'کم‌داده') + '، پیشنهادشده ' + (t.sug || 0) + ' بار)');
    out.push({ name: t.name, why: why });
  });
  return out;
}
function afxZeroRefWeekly_() {
  var d = new Date(afxNow_()), dow = Utilities.formatDate(d, TG_TZ, 'u'), h = Number(Utilities.formatDate(d, TG_TZ, 'H'));
  if (dow !== '6' || h < 10) return false;
  var wk = Utilities.formatDate(d, TG_TZ, 'yyyy-ww');
  if (afxProp_('AFX_ZR_WK') === wk) return false;
  afxProp_('AFX_ZR_WK', wk);
  var L = afxZeroRef_();
  var T = ['🩺 <b>درمانگر فعال با ارجاع صفر</b> · ' + tgFa_(AFX_ZR_D) + ' روز گذشته: ' + tgFa_(L.length), ''];
  L.slice(0, 25).forEach(function (x) { T.push('• ' + tgEsc_(x.name) + ': ' + tgEsc_(x.why.join('؛ '))); });
  if (!L.length) T.push('همهٔ درمانگران فعال دست‌کم یک ارجاع داشتند 🌿');
  var to = [];
  try { var oc = inbChatOf_(tgNm_('ops')); if (oc) to.push(oc); } catch (e) {}
  try { var b = opsBoss_(); if (b && b.chat) to.push(opsFirstChat_(b)); } catch (e2) {}
  to.filter(function (c, i) { return c && to.indexOf(c) === i; }).forEach(function (c) { tgNotify_(c, TG_NK.report, T.join('\n'), { ref: 'ZERO-REF' }); });
  if (!(typeof TG_DRY !== 'undefined' && TG_DRY)) {
    var ss = tgSS_(), sh = ss.getSheetByName(AFX_ZR_TAB);
    if (!sh) { sh = ss.insertSheet(AFX_ZR_TAB); sh.setRightToLeft(true); sh.appendRow(['هفته', 'درمانگر', 'علت']); sh.getRange(1, 1, 1, 3).setFontWeight('bold'); }
    L.forEach(function (x) { sh.appendRow([wk, x.name, x.why.join('؛ ')]); });
  } else TG_MEM['afx:zr'] = T.join('\n');
  return true;
}

/* ───── ۳. جایگزین نزدیک برای درخواست حضوری بی اتاق ───── */
function afxInpAlt_(q, d) {
  if (!q || !q.pid || !(q.k === 'add' || q.k === 'chg')) return [];
  d = d || tgInpData_();
  var a = Number(q.from), b = Number(q.to), dur = b - a, out = [], kids = false;
  if (!(dur > 0)) return [];
  var days = [q.day].concat(TG_INP_DAYS.filter(function (x) { return x !== q.day; }));
  for (var i = 0; i < days.length && out.length < 3; i++) {
    for (var s = 8; s + dur <= 21 && out.length < 3; s += 0.5) {
      if (days[i] === q.day && s === a) continue;
      var r = tgInpFreeRoom_(q.pid, days[i], s, s + dur, kids, q.key || '', d);
      if (r) { out.push(days[i] + ' ' + tgInpHs_(s) + ' تا ' + tgInpHs_(s + dur) + ' (اتاق ' + tgFa_(r) + ')'); s += dur; }
    }
  }
  return out;
}

/* ───── ۴. صبح هر صاحب ───── */
/** متن جمع‌بندی صبح برای یک نفر: فقط لیدهای خودش؛ لید بی‌مسئول فقط برای مسئول پذیرش */
function afxDeskMorning_(leads, p, boss) {
  var me = tgNorm_(p.name), isBoss = boss && tgNorm_(boss.name) === me;
  var mine = leads.filter(function (l) { var o = tgNorm_(l.stageOwner || l.owner || ''); return o ? o === me : isBoss; });
  var inb = 0, late = 0;
  try { inbRows_().forEach(function (o) { if (inbOpen_(o) && tgNorm_(o['صاحب']) === me) { inb++; if (inbParse_(o['مهلت']) < inbNow_()) late++; } }); } catch (e) {}
  if (!mine.length && !inb) return '';
  var b = tgLeadBuckets_(mine), body = mine.length ? tgLeadCounts_(b) : 'لید باز به نام شما نیست 🌿';
  if (b.first.length) body += '\n\n<b>☎ منتظر تماس اول</b>\n' + tgLeadList_(b.first, 5);
  if (b.stale.length) body += '\n\n<b>↻ نیاز به پیگیری</b>\n' + tgLeadList_(b.stale, 5);
  if (inb) body += '\n\n📮 صندوق من: ' + tgFa_(inb) + ' باز' + (late ? ' (🔴 ' + tgFa_(late) + ' از مهلت گذشته)' : '');
  return body;
}
/** دو خط اضافهٔ پیام ۹ صبح یاسر: از مهلت گذشته و بی‌صاحب */
function afxOwnerLines_() {
  var L = [], late = 0, noOwner = 0;
  try { inbRows_().forEach(function (o) { if (!inbOpen_(o)) return; if (inbParse_(o['مهلت']) < inbNow_()) late++; if (!String(o['صاحب'] || '').trim()) noOwner++; }); } catch (e) {}
  try { (typeof opsRows_ === 'function' ? opsRows_() : []).forEach(function (t) { if (!opsOpen_(t)) return; if (t.dueAt && t.dueAt.getTime() < afxNow_()) late++; if (!String(t.owner || '').trim()) noOwner++; }); } catch (e2) {}
  if (late) L.push('• از مهلت گذشته (صندوق و کارها): ' + tgFa_(late));
  if (noOwner) L.push('• بی‌صاحب: ' + tgFa_(noOwner));
  return L;
}

function afx2Hourly_() { try { return afxZeroRefWeekly_(); } catch (e) { tgErr_('afxZeroRefWeekly_', e); return false; } }

/* ───── آزمون ───── */
function afx2Tests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_ };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'afx:now': new Date('2026-10-10T11:00:00+03:30').getTime() };   /* شنبه */
  TG_CFG_ = { TG_NAMES: { ops: 'عملیات نمونه' } };
  try {
    TG_MEM['people'] = [{ row: 3, name: 'عملیات نمونه', chat: '302', roles: ['ناظر'], status: 'فعال' }];
    TG_MEM['v168ctx'] = { ther: [{ name: 'درمانگر الف', active: true, tier: 2, sug: 0 }, { name: 'درمانگر ب', active: true, tier: 1, sug: 3 }, { name: 'درمانگر پ', active: true, tier: 1, sug: 5 }, { name: 'درمانگر ت', active: false }],
                          pool: (function () { var p = {}; p[tgNorm_('درمانگر ب')] = { ind: true }; p[tgNorm_('درمانگر پ')] = { ind: true }; return p; })(),
                          free: (function () { var f = {}; f[tgNorm_('درمانگر پ')] = true; return f; })() };
    TG_MEM['afx:refs'] = {};
    var Z = afxZeroRef_();
    ok('فقط فعال‌ها، با علت', Z.length === 3 && !Z.some(function (x) { return x.name === 'درمانگر ت'; }));
    ok('علت: نبودن در استخر', Z.filter(function (x) { return x.name === 'درمانگر الف'; })[0].why[0].indexOf('استخر') > -1);
    ok('علت: نداشتن وقت خالی', Z.filter(function (x) { return x.name === 'درمانگر ب'; })[0].why.join().indexOf('وقت خالی') > -1);
    ok('علت: شایسته ولی انتخاب‌نشده', Z.filter(function (x) { return x.name === 'درمانگر پ'; })[0].why[0].indexOf('شایسته') > -1);
    TG_MEM['afx:refs'][tgNorm_('درمانگر پ')] = 1;
    ok('با یک ارجاع از فهرست بیرون', afxZeroRef_().length === 2);
    ok('گزارش هفتگی شنبه، یک بار', afxZeroRefWeekly_() === true && afxZeroRefWeekly_() === false && /ارجاع صفر/.test(TG_MEM['afx:zr']));
    /* صبح هر صاحب */
    var leads = [{ owner: 'پذیرش یک', stage: 'first', touched: false, idle: 30, age: 30, name: 'x', code: 'L-1' }, { owner: '', stage: 'first', touched: false, idle: 30, age: 30, name: 'y', code: 'L-2' }];
    var boss = { name: 'مسئول نمونه' };
    var t1 = afxDeskMorning_(leads, { name: 'پذیرش یک' }, boss), t2 = afxDeskMorning_(leads, { name: 'پذیرش دو' }, boss), tb = afxDeskMorning_(leads, { name: 'مسئول نمونه' }, boss);
    ok('صبح هر کس فقط لید خودش؛ بی‌مسئول فقط برای مسئول پذیرش', t1.indexOf('☎ x ·') > -1 && t1.indexOf('☎ y ·') < 0 && t2 === '' && tb.indexOf('☎ y ·') > -1 && tb.indexOf('☎ x ·') < 0, t1 + ' | ' + tb);
    ok('پیشنهاد ثبت بی کلید پولی نمی‌آید', afxOpsSuggest_('500', 'سه‌شنبه‌ها ۱۴ تا ۱۸ هستم', 'ساعت حضوری؟') === '');
    TG_MEM['ops:rows'] = [{ code: 'T-1', title: 'x', st: OPS_ST.NEW, owner: '', dueAt: new Date(TG_MEM['afx:now'] - 3600000) }];
    var ol = afxOwnerLines_().join('\n');
    ok('پیام صبح یاسر: از مهلت گذشته و بی‌صاحب', /از مهلت گذشته/.test(ol) && /بی‌صاحب/.test(ol), ol);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'afx2Tests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['خودکارسازی کارهای مانده، بخش ۲ (v170.30)', 'afx2Tests']); } catch (eAfx2) {}
