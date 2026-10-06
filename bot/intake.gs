/**
 * intake.gs · v170.31 · درگاه‌های ورودی، بند ۶: درست کردن دادهٔ لیدها (پیش‌نمایش؛ «اوکی» با Cowork)
 *
 * چهار مسئله در تب «لیدها» (بررسی Cowork، ۱۴ مهر ۱۴۰۵):
 *  - «درخواست صحبت با همکار» لید مراجع نیست ← سطر در «تماس همکاران» (و از آنجا صندوق یکتا)، لید «داخلی» و بسته با پیامد «منتقل به صندوق پیام».
 *    از این به بعد هم tgAppendLead_ برای این متن لید نمی‌سازد و به تماس همکاران می‌فرستد.
 *  - ستون‌های «نمرهٔ علامت»، «نمرهٔ بینش» و «شمار بی‌پاسخ» که شیت تاریخ ۱۸۹۹ نشان می‌دهد ← عدد (قالب ستون هم عدد).
 *  - ردیف تست و داخلی ← ستون «داخلی» = «بله»؛ همهٔ آمارها (کارتابل، نظارت هفتگی، گزارش پذیرش) این سطرها را نمی‌شمارند.
 *  - لید فرم سایت بی بخش (منبع «سایت — عنوان فرم»، مثل فرم ۱۶) ← منبع «سایت › بخش › فرم»، بخش از ITK_FORM_DEPT یا حدس متن.
 * پیش‌نمایش در «اصلاح دادهٔ لیدها · پیش‌نمایش»؛ Cowork بررسی می‌کند و در B1 «اوکی» می‌نویسد؛ ساعت بعد اعمال.
 * پیش‌نمایش فقط کد لید و نوع مسئله را دارد؛ اسم و شماره نه.
 */
var ITK_TAB = 'اصلاح دادهٔ لیدها · پیش‌نمایش';
var ITK_HEAD = ['کد لید', 'سطر', 'مسئله', 'ستون', 'قبلی', 'پیشنهاد'];
var ITK_SCORE_COLS = ['نمرهٔ علامت', 'نمرهٔ بینش', 'شمار بی‌پاسخ'];
var ITK_INTERNAL = 'داخلی';
var ITK_COLL_RX = /صحبت با همکار/;
/* فرم‌های بی‌نقشه: عنوان (یا بخشی از آن) ← بخش. فرم ۱۶ «اعلام آمادگی دانش‌آموختگان» در 501143 هم نقشه گرفت. */
var ITK_FORM_DEPT = { 'دانش‌آموخت': 'مدرسه', 'دانش آموخت': 'مدرسه', 'alumni': 'مدرسه' };
var ITK_EPOCH = Date.UTC(1899, 11, 30);

function itkDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function itkProp_(k, v) {
  if (itkDry_()) { if (v !== undefined) TG_MEM['itkp:' + k] = v; return TG_MEM['itkp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
/** سطر لید داخلی است؟ (برای همهٔ آمارها) */
function itkInternal_(row, hm) { var i = hm ? hm[ITK_INTERNAL] : undefined; return i !== undefined && i > -1 && String(row[i] || '').trim() === 'بله'; }
/** تاریخی که شیت از یک عدد کوچک ساخته (۱۸۹۹/۱۹۰۰) ← همان عدد */
function itkSerial_(v) {
  if (!(v instanceof Date)) return null;
  var y = v.getUTCFullYear(); if (y > 1900) return null;
  return Math.round((v.getTime() - ITK_EPOCH) / 86400000);
}
function itkLooksTest_(name, phone, src, note) {
  if (typeof isTestLead_ === 'function' && isTestLead_(name, phone, '', {})) return 'نام یا شمارهٔ آزمایشی';
  if (/(^|[\s\-_.(،])(test|تست|آزمایش|آزمایشی)($|[\s\-_.)،\d])/i.test(String(src || '') + ' ' + String(note || ''))) return 'منبع یا یادداشت آزمایشی';
  if (/^(داخلی|تیم)\b/.test(String(note || '').trim())) return 'یادداشت «داخلی»';
  return '';
}
function itkDept_(src, msg) {
  var t = String(src || '').replace(/^سایت\s*[—\-–]\s*/, '');
  var keys = Object.keys(ITK_FORM_DEPT);
  for (var i = 0; i < keys.length; i++) if (t.toLowerCase().indexOf(keys[i].toLowerCase()) > -1) return ITK_FORM_DEPT[keys[i]];
  try { return tgSection_(src, msg) || 'پذیرش'; } catch (e) { return 'پذیرش'; }
}
/** ردیف‌ها: [{code, row, kind, col, from, to}] */
function itkRows_() {
  var L = itkDry_() ? (TG_MEM['itk:leads'] || []) : (function () {
    var sh = tgSS_().getSheetByName(TG_LEADS), n = sh ? sh.getLastRow() : 0; if (n < 2) return [];
    var hm = tgLeadHeadMap_(sh), v = sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues();
    return v.map(function (r, i) {
      var o = { row: i + 2, v: r, code: String(tgLeadHv_(r, hm, 'کد لید') || '').trim(), name: r[3], phone: r[5], src: String(r[2] || ''), msg: String(r[7] || ''), kind: String(r[13] || ''), note: String(r[12] || ''), st: String(r[8] || ''), internal: itkInternal_(r, hm), score: {} };
      ITK_SCORE_COLS.forEach(function (c) { if (hm[c] !== undefined && hm[c] > -1) o.score[c] = r[hm[c]]; });
      return o;
    });
  })();
  var out = [];
  L.forEach(function (l) {
    if (!l.name && !l.phone) return;
    var ref = l.code || ('سطر ' + l.row);
    if (!l.internal && ITK_COLL_RX.test([l.src, l.msg, l.kind, l.note].join(' '))) out.push({ code: ref, row: l.row, kind: 'همکار', col: 'وضعیت / داخلی', from: l.st, to: 'بسته · داخلی · منتقل به صندوق پیام' });
    else if (!l.internal) { var why = itkLooksTest_(l.name, l.phone, l.src, l.note); if (why) out.push({ code: ref, row: l.row, kind: 'داخلی', col: ITK_INTERNAL, from: '', to: 'بله (' + why + ')' }); }
    Object.keys(l.score || {}).forEach(function (c) { var s = itkSerial_(l.score[c]); if (s !== null) out.push({ code: ref, row: l.row, kind: 'نمره', col: c, from: 'تاریخ ' + l.score[c].getUTCFullYear(), to: String(s) }); });
    if (/^سایت\s*[—\-–]/.test(l.src) && l.src.indexOf('›') < 0) {
      var form = l.src.replace(/^سایت\s*[—\-–]\s*/, '').trim(), dept = itkDept_(l.src, l.msg);
      out.push({ code: ref, row: l.row, kind: 'فرم بی‌نقشه', col: 'منبع', from: l.src, to: 'سایت › ' + dept + ' › ' + form });
    }
  });
  return out;
}
function itkPreview_() {
  var rows = itkRows_(), c = function (k) { return rows.filter(function (r) { return r.kind === k; }).length; };
  var sum = 'همکار ← صندوق: ' + c('همکار') + ' · داخلی/تست: ' + c('داخلی') + ' · نمرهٔ ۱۸۹۹: ' + c('نمره') + ' · فرم بی‌نقشه: ' + c('فرم بی‌نقشه');
  if (itkDry_()) { TG_MEM['itk:rows'] = rows; return sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(ITK_TAB) || ss.insertSheet(ITK_TAB);
  if (/^اعمال شد/.test(String(sh.getRange(1, 2).getValue() || ''))) return sum + ' · پیش از این اعمال شده';
  sh.clear(); sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, 3).setValues([['بررسی Cowork: بعد از بررسی، Cowork در B1 «اوکی» می‌نویسد', '', 'v170.31 · ' + sum]]).setFontWeight('bold');
  sh.getRange(2, 1, 1, ITK_HEAD.length).setValues([ITK_HEAD]).setFontWeight('bold').setBackground('#f5f5f8');
  if (rows.length) sh.getRange(3, 1, rows.length, ITK_HEAD.length).setNumberFormat('@').setValues(rows.map(function (r) { return [r.code, r.row, r.kind, r.col, r.from, r.to]; }));
  sh.setFrozenRows(2);
  return sum;
}
function itkApply_() {
  var rows = itkRows_(), n = { coll: 0, internal: 0, score: 0, form: 0 };
  if (itkDry_()) { rows.forEach(function (r) { n[{ 'همکار': 'coll', 'داخلی': 'internal', 'نمره': 'score', 'فرم بی‌نقشه': 'form' }[r.kind]]++; }); TG_MEM['itk:applied'] = rows; return n; }
  var sh = tgSS_().getSheetByName(TG_LEADS), hm = tgLeadHeadMap_(sh);
  var colOf = function (h) { var c = (hm[h] !== undefined && hm[h] > -1) ? hm[h] + 1 : tgLeadCol_(h); TG_LEAD_HM_ = null; hm = tgLeadHeadMap_(sh); return c; };
  var cInt = colOf(ITK_INTERNAL);
  ITK_SCORE_COLS.forEach(function (c) { if (hm[c] !== undefined && hm[c] > -1) { try { sh.getRange(2, hm[c] + 1, Math.max(1, sh.getLastRow() - 1), 1).setNumberFormat('0'); } catch (e) {} } });
  rows.forEach(function (r) {
    try {
      if (r.kind === 'همکار') {
        var v = sh.getRange(r.row, 1, 1, Math.max(13, sh.getLastColumn())).getValues()[0];
        if (typeof tgCollSheet_ === 'function') { var cs = tgCollSheet_(); if (cs) cs.appendRow([v[0], v[1], v[3], '', '', 'لید منتقل‌شده', 'درخواست صحبت با همکار (از لیدها، ' + r.code + ')', 'در انتظار تماس', '', '', 'v170.31']); }
        sh.getRange(r.row, 9).setValue(TG_ST.CLOSED);
        sh.getRange(r.row, cInt).setValue('بله');
        tgLeadNote_(r.row, 'منتقل به صندوق پیام (درخواست صحبت با همکار، لید مراجع نیست)', 'v170.31');
        n.coll++;
      } else if (r.kind === 'داخلی') { sh.getRange(r.row, cInt).setValue('بله'); n.internal++; }
      else if (r.kind === 'نمره') { sh.getRange(r.row, hm[r.col] + 1).setValue(Number(r.to)); n.score++; }
      else if (r.kind === 'فرم بی‌نقشه') { sh.getRange(r.row, 3).setValue(r.to); n.form++; }
    } catch (e) { tgErr_('itkApply_ ' + r.code, e); }
  });
  return n;
}
function itkMaybe_() {
  if (itkProp_('ITK_DONE') === '1') return null;
  var ok = itkDry_() ? TG_MEM['itk:ok'] : (function () { var sh = tgSS_().getSheetByName(ITK_TAB); return sh ? String(sh.getRange(1, 2).getValue() || '').trim() : ''; })();
  if (ok !== 'اوکی') return null;
  itkProp_('ITK_DONE', '1');
  var n = itkApply_();
  if (!itkDry_()) { try { tgSS_().getSheetByName(ITK_TAB).getRange(1, 2).setValue('اعمال شد ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · همکار ' + n.coll + ' · داخلی ' + n.internal + ' · نمره ' + n.score + ' · فرم ' + n.form); } catch (e) {} }
  return n;
}
/** پیشگیری: «درخواست صحبت با همکار» لید نمی‌سازد؛ true یعنی به تماس همکاران رفت */
function itkCollGuard_(o) {
  if (!o || !ITK_COLL_RX.test([o.firstText, o.source, o.kind].join(' '))) return false;
  if (itkDry_()) { (TG_MEM['itk:coll'] = TG_MEM['itk:coll'] || []).push(o.name || ''); return true; }
  try { var cs = tgCollSheet_(); if (cs) { var now = new Date(); cs.appendRow([tgJDateFull_(now, TG_TZ), Utilities.formatDate(now, TG_TZ, 'HH:mm'), o.name || '', '', '', 'از ' + (o.source || 'ورودی'), 'درخواست صحبت با همکار', 'در انتظار تماس', '', '', String(o.firstText || '').slice(0, 200)]); } } catch (e) { tgErr_('itkCollGuard_', e); return false; }
  return true;
}
/* یک‌بارهٔ خودکار v170.31: فقط پیش‌نمایش */
function tgV17031IntakeFix() { return itkPreview_(); }

function itkTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = {};
  try {
    var d3 = new Date(ITK_EPOCH + 3 * 86400000);
    TG_MEM['itk:leads'] = [
      { row: 2, code: 'L-1', name: 'الف', phone: '0', src: 'Telegram bot', msg: 'درخواست صحبت با همکار', kind: '', note: '', st: 'جدید', internal: false, score: {} },
      { row: 3, code: 'L-2', name: 'test', phone: '0', src: 'سایت › پذیرش › فرم شروع تراپی', msg: '', kind: '', note: '', st: 'جدید', internal: false, score: { 'نمرهٔ علامت': d3, 'نمرهٔ بینش': 2 } },
      { row: 4, code: 'L-3', name: 'ب', phone: '0', src: 'سایت — اعلام آمادگی دانش‌آموختگان', msg: '', kind: '', note: '', st: 'جدید', internal: false, score: {} },
      { row: 5, code: 'L-4', name: 'پ', phone: '0', src: 'سایت › پذیرش › فرم تماس با ما', msg: '', kind: '', note: '', st: 'جدید', internal: false, score: {} },
      { row: 6, code: 'L-5', name: 'ت', phone: '0', src: 'Telegram bot', msg: 'درخواست صحبت با همکار', kind: '', note: '', st: 'بسته', internal: true, score: {} }
    ];
    var sum = tgV17031IntakeFix(), R = TG_MEM['itk:rows'];
    ok('پیش‌نمایش: چهار نوع مسئله', /همکار ← صندوق: 1/.test(sum) && /داخلی\/تست: 1/.test(sum) && /نمرهٔ ۱۸۹۹: 1/.test(sum) && /فرم بی‌نقشه: 1/.test(sum), sum);
    ok('نمرهٔ ۱۸۹۹ ← همان عدد', R.filter(function (r) { return r.kind === 'نمره'; })[0].to === '3');
    ok('فرم ۱۶ ← بخش مدرسه', R.filter(function (r) { return r.kind === 'فرم بی‌نقشه'; })[0].to === 'سایت › مدرسه › اعلام آمادگی دانش‌آموختگان');
    ok('سطر داخلی‌شده دوباره نمی‌آید و لید سالم دست نمی‌خورد', !R.some(function (r) { return r.code === 'L-5' || r.code === 'L-4'; }));
    ok('پیش‌نمایش بی نام و شماره', !JSON.stringify(R).match(/"الف"|"ب"|"پ"/));
    ok('بی «اوکی» Cowork اعمال نمی‌شود', itkMaybe_() === null);
    TG_MEM['itk:ok'] = 'اوکی';
    var n = itkMaybe_();
    ok('با «اوکی» اعمال، یک بار', n && n.coll === 1 && n.score === 1 && itkMaybe_() === null);
    ok('همکار لید نمی‌سازد', itkCollGuard_({ firstText: 'درخواست صحبت با همکار', source: 'Telegram bot' }) === true && itkCollGuard_({ firstText: 'درخواست شروع درمان از بات' }) === false);
    ok('سطر داخلی از آمار بیرون', itkInternal_(['', 'بله'], { 'داخلی': 1 }) === true && itkInternal_(['', ''], { 'داخلی': 1 }) === false && itkInternal_(['x'], {}) === false);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'itkTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['درگاه‌های ورودی: اصلاح دادهٔ لیدها (v170.31)', 'itkTests']); } catch (eItk) {}
