/**
 * specialty.gs · v170.62 · ۲۲ مهر ۱۴۰۵ · پنج خط خدمت تخصصی: ستون‌های «درمانگران»، استخرها و مچ‌میکینگ
 *
 * خط‌ها: سکسولوژی · پیش از ازدواج و زوج · جدایی و طلاق · کودک و نوجوان · سوگ.
 * ۱) سه ستون تازه در انتهای تب «درمانگران» (با نام هدر، tgTherCol_): «خدمات تخصصی» (چندمقداری با «،»)، «مسیر»، «متن تخصصی (پیش‌نویس)».
 * ۲) شش ستون استخر تازه در تب «استخرها»، بعد از «یادداشت» (۱۸ تا ۲۳). ستون‌های ۱ تا ۱۷ و شماره‌هایشان همان می‌ماند.
 *    زوج‌درمانی همان استخر «زوج و رابطه» (ستون ۱۰) است. خانهٔ خالی از «خدمات تخصصی» با «۲ – معمول» پر می‌شود؛
 *    اولویتی که مسئول پذیرش گذاشته دست نمی‌خورد.
 * ۳) مچ‌میکینگ: اگر نوع درخواست یکی از این خط‌هاست (کلید spk چت یا over.kind)، اول همان استخر خدمت فیلتر می‌شود؛
 *    اگر کسی در آن استخر وقت آزاد نداشت، همان قاعدهٔ قبلی (موضوع، خارج از ایران، اولویت) اجرا می‌شود و مسیر رزرو قفل نمی‌شود.
 *    هشدار ارجاع لید فقط وقتی است که استخر آن خط عضو دارد.
 */
var SP_LINES = [
  { key: 'sex',   name: 'سکسولوژی',          col: 18 },
  { key: 'pre',   name: 'پیش از ازدواج',      col: 19 },
  { key: 'div',   name: 'جدایی و طلاق',       col: 20 },
  { key: 'k12',   name: 'کودک زیر ۱۲',        col: 21 },
  { key: 'teen',  name: 'نوجوان ۱۲ تا ۱۷',    col: 22 },
  { key: 'grief', name: 'سوگ',               col: 23 }
];
var SP_POOL_FIRST = 18, SP_POOL_LAST = 23;
/* مقدارهای ستون «خدمات تخصصی» و «مسیر» */
var SP_SVC = ['سکسولوژی', 'پیش از ازدواج', 'زوج‌درمانی', 'جدایی و طلاق', 'کودک زیر ۱۲', 'نوجوان ۱۲ تا ۱۷', 'سوگ'];
var SP_PATH = ['تحلیلی', 'شناختی با تست', 'هر دو'];
var SP_COL_SVC = 'خدمات تخصصی', SP_COL_PATH = 'مسیر', SP_COL_TEXT = 'متن تخصصی (پیش‌نویس)';
/* نوع درخواست لید ← کلید استخر. زوج‌درمانی استخر موجود «زوج و رابطه» است */
var SP_KIND_POOL = { 'سکسولوژی': 'sex', 'پیش از ازدواج': 'pre', 'جدایی و طلاق': 'div', 'کودک زیر ۱۲': 'k12', 'نوجوان ۱۲ تا ۱۷': 'teen', 'سوگ': 'grief' };

function spSq_(x) { return String(x == null ? '' : x).replace(/[\s‌]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }
function spLine_(key) { for (var i = 0; i < SP_LINES.length; i++) if (SP_LINES[i].key === key) return SP_LINES[i]; return null; }
function spPoolName_(key) { var l = spLine_(key); return l ? l.name : ''; }
/* نوع درخواست ← کلید استخر خط تخصصی ('' اگر خط تخصصی نیست) */
function spKeyOfKind_(kind) {
  var q = spSq_(kind);
  if (!q) return '';
  for (var k in SP_KIND_POOL) if (spSq_(k) === q) return SP_KIND_POOL[k];
  return '';
}
/* «خدمات تخصصی» یک درمانگر ← {key: true}؛ زوج‌درمانی ← rel */
function spSvcKeys_(svc) {
  var out = {}, parts = String(svc || '').split(/[،,]/).map(spSq_).filter(String);
  parts.forEach(function (p) {
    for (var k in SP_KIND_POOL) if (spSq_(k) === p) out[SP_KIND_POOL[k]] = true;
    if (p === spSq_('زوج‌درمانی')) out.rel = true;
  });
  return out;
}
/* سطر تب «استخرها» ← اولویت هر استخر تخصصی (برای tgPoolMap_) */
function spPoolRec_(row, rec) {
  SP_LINES.forEach(function (l) { var p = tgPoolPri_(row[l.col - 1]); if (p) rec[l.key] = p; });
  return rec;
}

/* چت یا over ← کلید استخر تخصصی */
function spPoolKeyOf_(chat, over) {
  if (over) return spKeyOfKind_(over.kind);
  if (!chat) return '';
  try { return spKeyOfKind_(tgGetVal_('spk', chat)); } catch (e) { return ''; }
}
/* اول استخر خدمت؛ اگر خالی ماند null تا tgPoolFilter_ همان قاعدهٔ قبلی را اجرا کند */
function spPoolFirst_(slots, chat, over, map, abroad) {
  var key = spPoolKeyOf_(chat, over);
  if (!key) return null;
  function rec(s) { return map[tgNorm_(s.therapist)] || null; }
  function distinct(list) { var s = {}, n = 0; list.forEach(function (x) { if (!s[x.therapist]) { s[x.therapist] = 1; n++; } }); return n; }
  var cand = slots.filter(function (s) { var r = rec(s); return r && r[key]; });
  if (abroad) cand = cand.filter(function (s) { var r = rec(s); return r && r.abroad; });
  if (!cand.length) return null;
  for (var p = 1; p <= 3; p++) {
    var tier = cand.filter(function (s) { return rec(s)[key] <= p; });
    if (distinct(tier) >= 2) return tier;
  }
  return cand;
}
/* هشدار ارجاع: نوع درخواست خط تخصصی و استخرش عضو دارد */
function spReferNeed_(kind) {
  var key = spKeyOfKind_(kind);
  if (!key) return '';
  return tgPoolNames_(key).length ? key : '';
}

/* ستون‌های تازهٔ «درمانگران» و «استخرها» (یک‌باره و بی‌خطر برای اجرای دوباره) */
function spSetup_() {
  var out = [];
  [SP_COL_SVC, SP_COL_PATH, SP_COL_TEXT].forEach(function (h) { out.push(h + ': ستون ' + tgTherCol_(h)); });
  out.push(spPoolEnsure_());
  return out.join(' · ');
}
function spPoolEnsure_() {
  var sh = tgSS_().getSheetByName(TG_POOLS_TAB);
  if (!sh || sh.getLastRow() < 3) return 'تب استخرها نیست';
  if (sh.getMaxColumns() < SP_POOL_LAST) sh.insertColumnsAfter(sh.getMaxColumns(), SP_POOL_LAST - sh.getMaxColumns());
  var head = sh.getRange(3, SP_POOL_FIRST, 1, SP_LINES.length).getValues()[0], made = 0;
  SP_LINES.forEach(function (l, i) {
    var h = String(head[i] || '').trim();
    if (!h) { sh.getRange(3, l.col).setValue(l.name).setFontWeight('bold').setBackground('#fbe9ea').setWrap(true); made++; }
    else if (h !== l.name) throw new Error('ستون ' + l.col + ' استخرها از قبل «' + h + '» است');
    sh.setColumnWidth(l.col, 105);
  });
  var n = sh.getLastRow() - 3;
  if (n > 0) {
    var pri = SpreadsheetApp.newDataValidation().requireValueInList(TG_POOL_PRI, true).setAllowInvalid(false).build();
    sh.getRange(4, SP_POOL_FIRST, n, SP_LINES.length).setDataValidation(pri);
  }
  var filled = spPoolSyncAll_();
  CacheService.getScriptCache().remove('pools');
  return 'استخرهای تخصصی: ' + made + ' ستون تازه · ' + filled + ' خانه از «خدمات تخصصی» پر شد';
}
/* نام نرمال‌شده ← کلیدهای «خدمات تخصصی» از تب «درمانگران» */
function spTherSvc_() {
  if (TG_DRY) return TG_MEM['sp:svc'] || {};
  var ts = tgSS_().getSheetByName(TG_THER), out = {};
  if (!ts || ts.getLastRow() < 4) return out;
  var hd = ts.getRange(3, 1, 1, ts.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var cs = hd.indexOf(SP_COL_SVC);
  if (cs < 0) return out;
  ts.getRange(4, 1, ts.getLastRow() - 3, cs + 1).getValues().forEach(function (r) { var nm = tgNorm_(String(r[0] || '')); if (nm) out[nm] = spSvcKeys_(r[cs]); });
  return out;
}
/* «خدمات تخصصی» ← خانه‌های خالی استخرها با «۲ – معمول»، فقط درمانگر فعال. اولویت موجود دست نمی‌خورد */
function spPoolSyncAll_(onlyName) {
  var ps = tgSS_().getSheetByName(TG_POOLS_TAB);
  if (!ps || ps.getLastRow() < 4) return 0;
  var svc = spTherSvc_();
  var width = Math.min(ps.getMaxColumns(), SP_POOL_LAST);
  var pv = ps.getRange(4, 1, ps.getLastRow() - 3, width).getValues(), n = 0;
  var cols = SP_LINES.map(function (l) { return { key: l.key, col: l.col }; }).concat([{ key: 'rel', col: 10 }]);
  for (var i = 0; i < pv.length; i++) {
    var nm = tgNorm_(String(pv[i][0] || ''));
    if (!nm || !svc[nm] || (onlyName && nm !== tgNorm_(onlyName))) continue;
    if (String(pv[i][1] || '').trim() !== 'فعال') continue;
    cols.forEach(function (c) {
      if (!svc[nm][c.key] || c.col > width || String(pv[i][c.col - 1] || '').trim()) return;
      ps.getRange(i + 4, c.col).setValue(TG_POOL_PRI[1]); n++;
    });
  }
  if (n) CacheService.getScriptCache().remove('pools');
  return n;
}

/* یک‌باره v170.62: ستون‌ها و استخرهای تازه */
function tgV17062SpSetup() { return spSetup_(); }

function spTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM };
  TG_DRY = true; TG_MEM = {};
  function S(n) { return { therapist: n, dateIso: '2026-10-20', hhmm: '10:00' }; }
  function names(l) { return l.map(function (s) { return s.therapist; }).join('، '); }
  try {
    ok('نوع درخواست ← استخر خط (با نیم‌فاصله و فاصله)', spKeyOfKind_('سوگ') === 'grief' && spKeyOfKind_('نوجوان ۱۲ تا ۱۷') === 'teen' && spKeyOfKind_('پیش از ازدواج') === 'pre' && spKeyOfKind_('تراپی فردی') === '' && spKeyOfKind_('کودک و نوجوان') === '');
    var sk = spSvcKeys_('سکسولوژی، زوج‌درمانی، کودک زیر ۱۲');
    ok('خدمات تخصصی ← استخرها؛ زوج‌درمانی همان «زوج و رابطه»', sk.sex && sk.rel && sk.k12 && !sk.grief, JSON.stringify(sk));
    var row = []; for (var i = 0; i < 23; i++) row.push(''); row[22] = '۱ – اول صف'; row[17] = '۳ – ذخیره';
    var rec = spPoolRec_(row, {});
    ok('سطر استخرها: ستون ۱۸ سکسولوژی و ۲۳ سوگ خوانده می‌شود', rec.grief === 1 && rec.sex === 3 && !rec.pre, JSON.stringify(rec));
    ok('ستون‌های استخر تازه بعد از «یادداشت» و پشت‌سرهم', SP_POOL_FIRST === TG_POOL_LAST + 1 && SP_LINES.every(function (l, i) { return l.col === SP_POOL_FIRST + i; }) && SP_POOL_LAST === SP_POOL_FIRST + SP_LINES.length - 1);

    var pm = {};
    pm[tgNorm_('سوگ‌کار الف')] = { ind: 2, grief: 1 };
    pm[tgNorm_('سوگ‌کار ب')] = { ind: 1, grief: 2 };
    pm[tgNorm_('فردی‌کار پ')] = { ind: 1 };
    TG_MEM['poolmap'] = pm;
    var slots = [S('فردی‌کار پ'), S('سوگ‌کار الف'), S('سوگ‌کار ب')];
    tgSetVal_('qt', 801, 'oth'); tgSetVal_('spk', 801, 'سوگ');
    var r1 = tgPoolFilter_(slots, 801);
    ok('مچ‌میکینگ: اول استخر خدمت (سوگ)، فردی‌کار بیرون', names(r1).indexOf('فردی‌کار پ') < 0 && r1.length === 2, names(r1));
    var r2 = tgPoolFilter_([S('فردی‌کار پ')], 801);
    ok('استخر خدمت خالی: همان قاعدهٔ قبلی، مسیر رزرو قفل نمی‌شود', r2.length === 1, names(r2));
    tgSetVal_('qt', 802, 'oth');
    var r0 = tgPoolFilter_(slots, 802);
    ok('بی خط تخصصی: رفتار قبلی دست‌نخورده (آبشار اولویت فردی)', names(r0).indexOf('فردی‌کار پ') > -1 && r0.length === 2, names(r0));
    ok('over.kind هم کار می‌کند (مینی‌اپ و آزمون)', tgPoolFilter_(slots, null, { topic: 'oth', kind: 'سوگ' }).length === 2);
    pm[tgNorm_('خارج‌بین')] = { ind: 1, grief: 1, abroad: true };
    TG_MEM['poolmap'] = pm;
    var r3 = tgPoolFilter_(slots.concat([S('خارج‌بین')]), null, { topic: 'oth', kind: 'سوگ', abroad: true });
    ok('خارج از ایران: فقط عضو استخر خارج در همان خط', names(r3) === 'خارج‌بین', names(r3));
    ok('برچسب استخر برای هشدار ارجاع', spPoolName_('div') === 'جدایی و طلاق' && spPoolName_('x') === '');
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'spTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['خط‌های خدمت تخصصی، استخرها (v170.62)', 'spTests']); } catch (eSp) {}
