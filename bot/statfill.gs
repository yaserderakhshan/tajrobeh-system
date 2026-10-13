/**
 * statfill.gs · v170.58 · ۲۲ مهر ۱۴۰۵ · بازسازی تب «آمار روزانهٔ بات» از ۱۵ مهر (درخواست یاسر)
 *
 * آمار شبانه از ۱۴ مهر نوشته نشد (سهمیهٔ اجرا؛ v170.57 درستش کرد). اینجا فقط ستون‌های جریانی روزهای جامانده از روی دادهٔ تاریخ‌دار
 * دوباره ساخته می‌شوند:
 *   کاربر تازه («اولین بار» تب کاربران بات)، کاربر فعال (کاربر یکتای هر روز در «رویدادهای بات و اپ»)، لید تازهٔ پذیرش (تاریخ تب لیدها)،
 *   رزرو معارفه (تاریخ اسلات غیرآزاد)، درخواست عضویت مدرسه، اپلای تراپیست، ثبت‌نام رویداد. همان شرط‌های tgStatToday_.
 * ستون‌های موجودی لحظه‌ای (کل کاربران، نقش‌ها، لید باز و …) و جریان‌های دیگر خالی می‌مانند و یادداشت «بازسازی نشد» می‌گیرند.
 * روزی که در تب ردیف دارد دست نمی‌خورد. اول خشک (sfDry) فقط شمار هر روز را برمی‌گرداند؛ نوشتن جدا و بعد از گزارش.
 * خروجی فقط عدد است؛ هیچ نام، شماره یا شناسه‌ای بیرون نمی‌رود.
 * حالت خشک: TG_MEM['sf:users'|'sf:ev'|'sf:leads'|'sf:slots'|'sf:req'|'sf:apply'|'sf:evr'|'sf:stat'] ردیف‌های ساختگی.
 */
var SF_FROM = '2026-10-07';   /* ۱۵ مهر ۱۴۰۵ */
var SF_NOTE = 'بازسازی ۲۲ مهر ۱۴۰۵ از دادهٔ تاریخ‌دار؛ فقط ستون‌های جریانی (کاربر تازه، کاربر فعال، لید تازه، رزرو معارفه، درخواست عضویت، اپلای، ثبت‌نام رویداد). ستون‌های موجودی لحظه‌ای و بقیه بازسازی نشد.';
/* ستون‌های TG_STAT_HEAD که پر می‌شوند (شمارهٔ صفر-پایه) */
var SF_COLS = { fresh: 3, active: 4, leadNew: 13, meet: 16, req: 18, apply: 19, evReg: 21 };

function sfDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
/* روزهای بازه به وقت تهران: [{iso, jal, date}] */
function sfDays_(fromIso, toIso) {
  var out = [], p = fromIso.split('-'), t = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 8, 30));
  for (var i = 0; i < 60; i++) {
    var iso = Utilities.formatDate(t, TG_TZ, 'yyyy-MM-dd');
    if (iso > toIso) break;
    var q = iso.split('-');
    out.push({ iso: iso, jal: tgJDateFull_(t, TG_TZ), date: new Date(Number(q[0]), Number(q[1]) - 1, Number(q[2])) });
    t = new Date(t.getTime() + 86400000);
  }
  return out;
}
/* سلول تاریخ ← iso، با همان سنجش tgStatIsDay_ (تاریخ، iso یا تاریخ کامل شمسی) */
function sfIso_(cell, jalMap) {
  if (cell instanceof Date) return Utilities.formatDate(cell, TG_TZ, 'yyyy-MM-dd');
  var t = String(cell == null ? '' : cell).trim();
  if (!t) return '';
  if (jalMap[t]) return jalMap[t];
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : '';
}
function sfRows_(key, ss, tab, from, width) {
  if (sfDry_()) return TG_MEM['sf:' + key] || [];
  try {
    var sh = ss ? ss.getSheetByName(tab) : null;
    if (!sh || sh.getLastRow() < from) return [];
    return sh.getRange(from, 1, sh.getLastRow() - from + 1, Math.max(width, 1)).getValues();
  } catch (e) { tgErr_('sfRows_ ' + tab, e); return []; }
}
/* رویدادها از ته تب، تکه‌تکه، تا روز پیش از بازه (تب بزرگ است) */
function sfEvents_(fromIso) {
  if (sfDry_()) return TG_MEM['sf:ev'] || [];
  var out = [];
  try {
    var sh = tgStatSS_().getSheetByName(TG_AE_TAB);
    if (!sh || sh.getLastRow() < 2) return [];
    var end = sh.getLastRow(), step = 5000;
    while (end >= 2) {
      var start = Math.max(2, end - step + 1), v = sh.getRange(start, 1, end - start + 1, TG_EV_HEAD.length).getValues(), stop = false;
      for (var i = v.length - 1; i >= 0; i--) {
        var d = v[i][1] instanceof Date ? Utilities.formatDate(v[i][1], TG_TZ, 'yyyy-MM-dd') : String(v[i][1] || '').trim();
        if (d && d < fromIso) { stop = true; break; }
        out.push(v[i]);
      }
      if (stop) break;
      end = start - 1;
    }
  } catch (e) { tgErr_('sfEvents_', e); }
  return out;
}

/** شمار هر روز بازه؛ خروجی [{iso, jal, date, fresh, active, leadNew, meet, req, apply, evReg}] */
function sfCount_(fromIso, toIso) {
  var days = sfDays_(fromIso, toIso), by = {}, jalMap = {};
  days.forEach(function (d) { by[d.iso] = { iso: d.iso, jal: d.jal, date: d.date, fresh: 0, active: 0, leadNew: 0, meet: 0, req: 0, apply: 0, evReg: 0, _u: {} }; jalMap[d.jal] = d.iso; });
  var hit = function (cell, f) { var k = sfIso_(cell, jalMap); if (by[k]) by[k][f]++; };
  var ss = sfDry_() ? null : tgSS_(), sc = sfDry_() ? null : tgSchSS_(), us = sfDry_() ? null : tgUserSheet_(false);
  sfRows_('users', us ? us.getParent() : null, TG_USERS_TAB, 2, 5).forEach(function (r) { if (String(r[0]).trim()) hit(r[3], 'fresh'); });
  sfEvents_(fromIso).forEach(function (r) {
    var k = r[1] instanceof Date ? Utilities.formatDate(r[1], TG_TZ, 'yyyy-MM-dd') : String(r[1] || '').trim(), u = String(r[5] || '').trim();
    if (by[k] && u && !by[k]._u[u]) { by[k]._u[u] = 1; by[k].active++; }
  });
  sfRows_('leads', ss, TG_LEADS, 2, 1).forEach(function (r) { hit(r[0], 'leadNew'); });
  sfRows_('slots', ss, TG_SLOTS, 4, 6).forEach(function (r) { var st = String(r[5] || '').trim(); if (st && st !== 'آزاد') hit(r[1], 'meet'); });
  sfRows_('req', sc, TG_SCH_T_REQ, 2, 5).forEach(function (r) { if (String(r[4] || '').trim() !== '') hit(r[1], 'req'); });
  sfRows_('apply', sc, TG_SCH_T_APPLY, 2, 2).forEach(function (r) { hit(r[1], 'apply'); });
  sfRows_('evr', sc, TG_EVR_TAB, 2, 1).forEach(function (r) { hit(r[0], 'evReg'); });
  return days.map(function (d) { var o = by[d.iso]; delete o._u; return o; });
}
/* روزهایی که در تب آمار ردیف دارند (با تاریخ شمسی ستون اول) */
function sfHave_() {
  var rows = sfDry_() ? (TG_MEM['sf:stat'] || []) : (function () { var sh = tgStatSheet_(); return sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(); })();
  var o = {}; rows.forEach(function (r) { var t = String(r[0] == null ? '' : r[0]).trim(); if (t) o[t] = 1; }); return o;
}
function sfToday_() { return Utilities.formatDate(new Date(sfDry_() && TG_MEM['sf:now'] ? Number(TG_MEM['sf:now']) : Date.now()), TG_TZ, 'yyyy-MM-dd'); }
/** خشک: شمار هر روز جامانده، فقط عدد */
function sfDry() {
  var have = sfHave_(), list = sfCount_(SF_FROM, sfToday_()).filter(function (d) { return !have[d.jal]; });
  if (!list.length) return 'بازسازی آمار (خشک): روز جامانده‌ای نیست';
  return 'بازسازی آمار (خشک) · ' + list.length + ' روز · ' + list.map(function (d) {
    return d.iso + ': تازه ' + d.fresh + '، فعال ' + d.active + '، لید ' + d.leadNew + '، معارفه ' + d.meet + '، عضویت ' + d.req + '، اپلای ' + d.apply + '، رویداد ' + d.evReg;
  }).join(' | ');
}
/* ردیف تب آمار برای یک روز بازسازی‌شده: فقط ستون‌های جریانی */
function sfRow_(d) {
  var row = TG_STAT_HEAD.map(function () { return ''; });
  row[0] = d.jal; row[1] = d.date;
  Object.keys(SF_COLS).forEach(function (k) { row[SF_COLS[k]] = d[k]; });
  return row;
}

/* یک‌بارهٔ خودکار v170.58: فقط خشک */
function tgV17058StatFillDry() { return sfDry(); }

function sfTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM };
  TG_DRY = true; TG_MEM = { 'sf:now': Date.UTC(2026, 9, 9, 12, 0) };   /* ۱۸ مهر */
  try {
    var days = sfDays_(SF_FROM, '2026-10-09');
    ok('روزها: ۱۵ تا ۱۷ مهر با تاریخ شمسی', days.length === 3 && days[0].iso === '2026-10-07' && /۱۵ مهر ۱۴۰۵/.test(days[0].jal) && days[2].iso === '2026-10-09', JSON.stringify(days.map(function (d) { return d.jal; })));
    var j16 = days[1].jal;
    TG_MEM['sf:users'] = [['u1', '', '', '2026-10-07', ''], ['u2', '', '', new Date(2026, 9, 8, 15, 0), ''], ['', '', '', '2026-10-07', ''], ['u3', '', '', '2026-10-01', '']];
    TG_MEM['sf:ev'] = [[0, '2026-10-07', 'bot', 'start', '', 'aaa'], [0, '2026-10-07', 'bot', 'text', '', 'aaa'], [0, '2026-10-07', 'app', 'open', '', 'bbb'], [0, '2026-10-08', 'bot', 'x', '', ''], [0, '2026-10-09', 'bot', 'x', '', 'ccc']];
    TG_MEM['sf:leads'] = [['2026-10-07'], ['2026-10-07'], [j16], ['2026-09-30']];
    TG_MEM['sf:slots'] = [['', '2026-10-08', '', '', '', 'رزرو'], ['', '2026-10-08', '', '', '', 'آزاد'], ['', '2026-10-08', '', '', '', '']];
    TG_MEM['sf:req'] = [['', j16, '', '', 'x'], ['', j16, '', '', '']];
    TG_MEM['sf:apply'] = [['', '2026-10-09']];
    TG_MEM['sf:evr'] = [['2026-10-09'], ['2026-10-09']];
    var c = sfCount_(SF_FROM, '2026-10-09'), d7 = c[0], d8 = c[1], d9 = c[2];
    ok('کاربر تازه: از «اولین بار»، سطر بی شناسه حساب نمی‌شود', d7.fresh === 1 && d8.fresh === 1 && d9.fresh === 0);
    ok('کاربر فعال: کاربر یکتای هر روز در رویدادها، بی کاربر حساب نمی‌شود', d7.active === 2 && d8.active === 0 && d9.active === 1);
    ok('لید تازه: تاریخ میلادی و شمسی هر دو', d7.leadNew === 2 && d8.leadNew === 1);
    ok('رزرو معارفه: فقط اسلات غیرآزاد', d8.meet === 1);
    ok('درخواست عضویت: فقط با ستون پنجم پر', d8.req === 1);
    ok('اپلای و ثبت‌نام رویداد', d9.apply === 1 && d9.evReg === 2);
    TG_MEM['sf:stat'] = [[days[0].jal]];
    var dry = sfDry();
    ok('خشک: روزی که ردیف دارد کنار می‌رود و خروجی فقط عدد است', /· 2 روز ·/.test(dry) && dry.indexOf('2026-10-07') < 0 && /2026-10-08: تازه 1، فعال 0، لید 1، معارفه 1، عضویت 1/.test(dry) && !/u1|aaa/.test(dry), dry);
    var row = sfRow_(d8);
    ok('ردیف: فقط ستون‌های جریانی پر، بقیه خالی', row.length === TG_STAT_HEAD.length && row[0] === j16 && row[13] === 1 && row[16] === 1 && row[2] === '' && row[12] === '' && row[17] === '');
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'sfTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['بازسازی آمار روزانه (v170.58)', 'sfTests']); } catch (eSf) {}
