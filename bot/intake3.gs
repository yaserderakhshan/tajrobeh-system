/**
 * intake3.gs · v170.37 · درگاه‌های ورودی، بند ۳: پر کردن ردپای لیدهای قدیمی (پیش‌نمایش؛ «اوکی» با Cowork)
 *
 * از آنچه از قبل ثبت شده، تا جای ممکن:
 *  - «صفحهٔ ورود» ← یادداشت لید سایت («صفحه: <نشانی>» که handleWebForm_ می‌نویسد)
 *  - «کمپین» ← «کد کمپین» (v170.13) یا منبع «کمپین › <کد> › …»
 *  - «دکمه» ← «منبع جزئیات» اگر کد start باشد
 * لید بات قدیمی پر نمی‌شود: ثبت شروع («کلیک‌های تماس») گفت‌وگو را نداشت. از این نسخه tgLogStart_ گفت‌وگو را هم می‌نویسد.
 * پیش‌نمایش در «پر کردن ردپای لیدها · پیش‌نمایش» فقط کد لید و مقدار پیشنهادی را دارد؛ Cowork در B1 «اوکی» می‌نویسد.
 */
var BF_TAB = 'پر کردن ردپای لیدها · پیش‌نمایش';
var BF_HEAD = ['کد لید', 'سطر', 'ستون', 'پیشنهاد', 'از کجا'];

function bfDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function bfRows_() {
  var L = bfDry_() ? (TG_MEM['bf:leads'] || []) : (function () {
    var sh = tgSS_().getSheetByName(TG_LEADS), n = sh ? sh.getLastRow() : 0; if (n < 2) return [];
    var hm = tgLeadHeadMap_(sh), v = sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues();
    var g = function (r, h) { return String(tgLeadHv_(r, hm, h) || '').trim(); };
    return v.map(function (r, i) { return { row: i + 2, code: g(r, 'کد لید'), src: String(r[2] || ''), note: String(r[12] || ''), camp: g(r, 'کد کمپین'), det: g(r, 'منبع جزئیات'), page: g(r, 'صفحهٔ ورود'), campaign: g(r, 'کمپین'), cta: g(r, 'دکمه'), internal: typeof itkInternal_ === 'function' && itkInternal_(r, hm) }; });
  })();
  var out = [];
  L.forEach(function (l) {
    if (!l.code || l.internal) return;
    if (!l.page) { var m = /صفحه: (\S+)/.exec(l.note); if (m && /^https?:\/\/|^\//.test(m[1])) out.push({ code: l.code, row: l.row, col: 'صفحهٔ ورود', val: m[1].slice(0, 200), from: 'یادداشت لید سایت' }); }
    if (!l.campaign) { var c = l.camp || ((/^کمپین › ([A-Za-z0-9\-]+)/.exec(l.src) || [])[1] || ''); if (c) out.push({ code: l.code, row: l.row, col: 'کمپین', val: c, from: l.camp ? 'کد کمپین' : 'منبع' }); }
    if (!l.cta && /^[A-Za-z0-9_\-]{2,64}$/.test(l.det)) out.push({ code: l.code, row: l.row, col: 'دکمه', val: l.det, from: 'منبع جزئیات (کد start)' });
  });
  return out;
}
function bfPreview_() {
  var rows = bfRows_(), c = function (k) { return rows.filter(function (r) { return r.col === k; }).length; };
  var sum = 'صفحهٔ ورود: ' + c('صفحهٔ ورود') + ' · کمپین: ' + c('کمپین') + ' · دکمه: ' + c('دکمه') + ' · لید بات قدیمی پر نمی‌شود (شروع گفت‌وگو را نداشت)';
  if (bfDry_()) { TG_MEM['bf:rows'] = rows; return sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(BF_TAB) || ss.insertSheet(BF_TAB);
  if (/^اعمال شد/.test(String(sh.getRange(1, 2).getValue() || ''))) return sum + ' · پیش از این اعمال شده';
  sh.clear(); sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, 3).setValues([['بررسی Cowork: بعد از بررسی، Cowork در B1 «اوکی» می‌نویسد', '', 'v170.37 · ' + sum]]).setFontWeight('bold');
  sh.getRange(2, 1, 1, BF_HEAD.length).setValues([BF_HEAD]).setFontWeight('bold').setBackground('#f5f5f8');
  if (rows.length) sh.getRange(3, 1, rows.length, BF_HEAD.length).setNumberFormat('@').setValues(rows.map(function (r) { return [r.code, r.row, r.col, r.val, r.from]; }));
  sh.setFrozenRows(2);
  return sum;
}
function bfMaybe_() {
  var P = bfDry_() ? null : PropertiesService.getScriptProperties();
  if ((bfDry_() ? TG_MEM['bf:done'] : P.getProperty('BF_DONE')) === '1') return null;
  var ok = bfDry_() ? TG_MEM['bf:ok'] : (function () { var sh = tgSS_().getSheetByName(BF_TAB); return sh ? String(sh.getRange(1, 2).getValue() || '').trim() : ''; })();
  if (ok !== 'اوکی') return null;
  if (bfDry_()) TG_MEM['bf:done'] = '1'; else P.setProperty('BF_DONE', '1');
  var rows = bfRows_(), n = 0;
  if (bfDry_()) { TG_MEM['bf:applied'] = rows; return rows.length; }
  var sh = tgSS_().getSheetByName(TG_LEADS), cols = {};
  rows.forEach(function (r) {
    try { var c = cols[r.col] || (cols[r.col] = tgLeadCol_(r.col)); sh.getRange(r.row, c).setValue(r.val); n++; } catch (e) { tgErr_('bfMaybe_ ' + r.code, e); }
  });
  try { tgSS_().getSheetByName(BF_TAB).getRange(1, 2).setValue('اعمال شد ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + n + ' خانه'); } catch (e2) {}
  return n;
}
/* یک‌بارهٔ خودکار v170.37: فقط پیش‌نمایش */
function tgV17037Backfill() { return bfPreview_(); }

function bfTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM };
  TG_DRY = true; TG_MEM = {};
  try {
    TG_MEM['bf:leads'] = [
      { row: 2, code: 'L-1', src: 'سایت › پذیرش › فرم شروع تراپی', note: 'صفحه: https://tajrobeh.life/get-therapy/', camp: '', det: '', page: '', campaign: '', cta: '' },
      { row: 3, code: 'L-2', src: 'کمپین › C-004 › join', note: '', camp: '', det: '', page: '', campaign: '', cta: '' },
      { row: 4, code: 'L-3', src: 'Telegram bot', note: 'chat_id: 1', camp: '', det: 'pt_de', page: '', campaign: '', cta: '' },
      { row: 5, code: 'L-4', src: 'سایت › پذیرش › فرم', note: 'صفحه: https://x/', camp: '', det: '', page: '/قبلی/', campaign: '', cta: '' },
      { row: 6, code: 'L-5', src: 'Telegram bot', note: '', camp: '', det: '', page: '', campaign: '', cta: '', internal: true }
    ];
    var s = tgV17037Backfill(), R = TG_MEM['bf:rows'];
    ok('پیش‌نمایش سه نوع', /صفحهٔ ورود: 1 · کمپین: 1 · دکمه: 1/.test(s), s);
    ok('خانهٔ پر دست نمی‌خورد و داخلی نمی‌آید', !R.some(function (r) { return r.code === 'L-4' || r.code === 'L-5'; }));
    ok('بی «اوکی» اعمال نمی‌شود', bfMaybe_() === null);
    TG_MEM['bf:ok'] = 'اوکی';
    ok('با «اوکی» یک بار', bfMaybe_() === 3 && bfMaybe_() === null);
  } catch (e) { ok('خطا: ' + e, false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'bfTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['درگاه‌های ورودی: پر کردن ردپای لیدهای قدیمی (v170.37)', 'bfTests']); } catch (eBf) {}
