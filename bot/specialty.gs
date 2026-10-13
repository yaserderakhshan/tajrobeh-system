/**
 * specialty.gs · v170.62 تا v170.65 · ۲۲ مهر ۱۴۰۵ · K07: خط‌های خدمت تخصصی، از پروفایل تا ارجاع
 *
 * سیزده عنوان (کلید = کد need): sex سکسولوژی · premarital پیش از ازدواج · couple زوج‌درمانی · divorce جدایی و طلاق ·
 * kid کودک زیر ۱۲ · teen نوجوان ۱۲ تا ۱۷ · grief سوگ · parent رابطه با والد آسیب‌زا · adhd ADHD بزرگسال ·
 * perinatal بارداری، پس از زایمان و ناباروری · ocd وسواس · psychosomatic سایکوسوماتیک و بیماری مزمن · affirming پذیرش همهٔ هویت‌ها
 *
 * ۱) «درمانگران»، چهار ستون در انتها (با نام هدر): «خدمات تخصصی (اعلام‌شده)» · «خدمات تخصصی (تأییدشده)» · «مسیر» · «متن تخصصی (پیش‌نویس)».
 *    «اعلام‌شده» خودکار از تب «پروفایل سایت» (فقط خواندن): «موضوع‌های اصلی کار»، «آشنایی ویژه با گروه‌ها» و «با چه کسانی کار می‌کنید».
 *    هر بار که پروفایل عوض شد (tgPqSave_) دوباره ساخته می‌شود. «تأییدشده» فقط از جواب خود درمانگر (thq.gs).
 * ۲) «استخرها»: خط‌هایی که استخر ندارند ستون می‌گیرند (۱۸ تا ۲۶، بعد از «یادداشت»). زوج‌درمانی ← «زوج و رابطه» (۱۰)،
 *    کودک و نوجوان ← «کودک و نوجوان» (۱۲)، پذیرش همهٔ هویت‌ها ← «پذیرش همهٔ هویت‌ها» (۱۶). استخرهای فعلی و شماره‌هایشان دست نمی‌خورد.
 *    عضویت در ستون‌های تازه فقط از «تأییدشده»؛ اولویت را مسئول پذیرش تعیین می‌کند.
 * ۳) مچ‌میکینگ اول استخر خدمت را فیلتر می‌کند؛ اگر کسی وقت نداشت، همان قاعدهٔ قبلی (رزرو قفل نمی‌شود).
 */
var SP_LINES = [
  { key: 'sex',           name: 'سکسولوژی',                         col: 18 },
  { key: 'premarital',    name: 'پیش از ازدواج',                     col: 19 },
  { key: 'couple',        name: 'زوج‌درمانی',                        pool: 'rel' },
  { key: 'divorce',       name: 'جدایی و طلاق',                      col: 20 },
  { key: 'kid',           name: 'کودک زیر ۱۲',                       pool: 'kid' },
  { key: 'teen',          name: 'نوجوان ۱۲ تا ۱۷',                   pool: 'kid' },
  { key: 'grief',         name: 'سوگ',                              col: 21 },
  { key: 'parent',        name: 'رابطه با والد آسیب‌زا',              col: 22 },
  { key: 'adhd',          name: 'ADHD بزرگسال',                      col: 23 },
  { key: 'perinatal',     name: 'بارداری، پس از زایمان و ناباروری',     col: 24 },
  { key: 'ocd',           name: 'وسواس',                            col: 25 },
  { key: 'psychosomatic', name: 'سایکوسوماتیک و بیماری مزمن',         col: 26 },
  { key: 'affirming',     name: 'پذیرش همهٔ هویت‌ها',                 pool: 'lgbt' }
];
var SP_POOL_FIRST = 18, SP_POOL_LAST = 26;
var SP_COL_DECL = 'خدمات تخصصی (اعلام‌شده)', SP_COL_OK = 'خدمات تخصصی (تأییدشده)', SP_COL_PATH = 'مسیر', SP_COL_TEXT = 'متن تخصصی (پیش‌نویس)';
var SP_PATH = ['تحلیلی', 'شناختی با تست', 'هر دو'];
/* گزینهٔ پروفایل سایت ← خط */
var SP_FROM_PQ = [['focus', 'مسائل جنسی', 'sex'], ['focus', 'رابطه و زوج', 'couple'], ['focus', 'سوگ و فقدان', 'grief'], ['focus', 'وسواس', 'ocd'],
  ['focus', 'تروما', 'parent'], ['groups', 'کوییر و LGBTQ+', 'affirming'], ['groups', 'بیماری مزمن', 'psychosomatic'],
  ['ages', 'نوجوان', 'teen'], ['ages', 'کودک', 'kid']];

function spSq_(x) { return String(x == null ? '' : x).replace(/[\s‌]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase(); }
function spLine_(key) { for (var i = 0; i < SP_LINES.length; i++) if (SP_LINES[i].key === key) return SP_LINES[i]; return null; }
function spNewPools_() { return SP_LINES.filter(function (l) { return l.col; }); }
/* عنوان (نوع درخواست یا گزینه) ← کلید خط ('' اگر خط تخصصی نیست) */
function spKeyOf_(title) {
  var q = spSq_(title);
  if (!q) return '';
  for (var i = 0; i < SP_LINES.length; i++) if (spSq_(SP_LINES[i].name) === q) return SP_LINES[i].key;
  return '';
}
/* کلید خط ← کلید استخر (ستون تازه: همان کلید؛ استخر موجود: rel، kid، lgbt) */
function spPoolKey_(key) { var l = spLine_(key); return l ? (l.pool || l.key) : ''; }
function spPoolName_(pk) {
  for (var i = 0; i < SP_LINES.length; i++) if (SP_LINES[i].col && SP_LINES[i].key === pk) return SP_LINES[i].name;
  return pk === 'lgbt' ? 'پذیرش همهٔ هویت‌ها' : '';
}
/* متن چندمقداری («،») ← {کلید: true} */
function spKeysOf_(txt) {
  var out = {};
  String(txt || '').split(/[،,]/).forEach(function (p) { var k = spKeyOf_(p); if (k) out[k] = true; });
  return out;
}
/* پروفایل یک نفر ({focus, groups, ages}) ← عنوان‌های «اعلام‌شده» به ترتیب SP_LINES */
function spDeclOf_(p) {
  var have = {};
  SP_FROM_PQ.forEach(function (m) {
    var parts = String((p && p[m[0]]) || '').split(/[،,|]/).map(function (x) { return spSq_(x); });
    if (parts.indexOf(spSq_(m[1])) > -1) have[m[2]] = true;
  });
  return SP_LINES.filter(function (l) { return have[l.key]; }).map(function (l) { return l.name; }).join('، ');
}
/* سطر تب «استخرها» ← اولویت استخرهای تازه و «پذیرش همهٔ هویت‌ها» (برای tgPoolMap_) */
function spPoolRec_(row, rec) {
  spNewPools_().forEach(function (l) { if (l.col <= row.length) { var p = tgPoolPri_(row[l.col - 1]); if (p) rec[l.key] = p; } });
  if (/بله/.test(String(row[TG_POOL_LGBT - 1] || ''))) rec.lgbt = 1;
  return rec;
}

/* ---------- مچ‌میکینگ ---------- */
function spPoolKeyOf_(chat, over) {
  var kind = over ? over.kind : '';
  if (!over && chat) { try { kind = tgGetVal_('spk', chat); } catch (e) {} }
  return spPoolKey_(spKeyOf_(kind));
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
/* هشدار ارجاع لید: خط تخصصی با استخر تازهٔ عضودار (استخرهای قبلی قاعدهٔ خودشان را دارند) */
function spReferNeed_(kind) {
  var l = spLine_(spKeyOf_(kind));
  if (!l || !l.col) return '';
  return tgPoolNames_(l.key).length ? l.key : '';
}

/* ---------- «اعلام‌شده» از پروفایل سایت ---------- */
/* نام نرمال‌شده ← عنوان‌های «اعلام‌شده» برای همهٔ درمانگرها (پروفایل فقط خوانده می‌شود) */
function spDeclAll_() {
  var pq = tgThPqMap_(), out = {};
  Object.keys(pq).forEach(function (nm) { out[nm] = spDeclOf_(pq[nm]); });
  return out;
}
/* خشک: شمار «اعلام‌شده» برای هر خط، فقط درمانگرهای فعال */
function spDeclDry() {
  var decl = spDeclAll_(), act = {}, by = {}, n = 0;
  (TG_DRY ? (TG_MEM['sp:ther'] || []) : tgTherapistRows_()).forEach(function (t) { if (String(t.status).trim() === 'فعال') act[tgNorm_(t.name)] = 1; });
  Object.keys(decl).forEach(function (nm) {
    if (!act[nm] || !decl[nm]) return;
    n++;
    Object.keys(spKeysOf_(decl[nm])).forEach(function (k) { by[k] = (by[k] || 0) + 1; });
  });
  return 'اعلام‌شده (خشک، بی نوشتن): ' + n + ' درمانگر فعال · ' + SP_LINES.map(function (l) { return l.name + ' ' + (by[l.key] || 0); }).join('، ');
}
/* ستون «اعلام‌شده» یک نفر یا همه را از پروفایل می‌سازد؛ فقط اگر ستون از قبل باشد (ساختش با spSetup_) */
function spDeclSync_(onlyName) {
  if (TG_DRY) return 0;
  var sh = tgSS_().getSheetByName(TG_THER);
  if (!sh || sh.getLastRow() < 4) return 0;
  var hd = sh.getRange(3, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var c = hd.indexOf(SP_COL_DECL);
  if (c < 0) return 0;
  var decl = spDeclAll_(), names = sh.getRange(4, 1, sh.getLastRow() - 3, 1).getValues(), cur = sh.getRange(4, c + 1, names.length, 1).getValues(), n = 0;
  for (var i = 0; i < names.length; i++) {
    var nm = tgNorm_(String(names[i][0] || ''));
    if (!nm || (onlyName && nm !== tgNorm_(onlyName)) || decl[nm] === undefined) continue;
    if (String(cur[i][0] || '') === decl[nm]) continue;
    sh.getRange(i + 4, c + 1).setValue(decl[nm]); n++;
  }
  if (n) try { CacheService.getScriptCache().remove('trows'); } catch (e) {}
  return n;
}

/* ---------- استخرهای تازه ---------- */
function spTherOk_() {
  if (TG_DRY) return TG_MEM['sp:ok'] || {};
  var ts = tgSS_().getSheetByName(TG_THER), out = {};
  if (!ts || ts.getLastRow() < 4) return out;
  var hd = ts.getRange(3, 1, 1, ts.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var cs = hd.indexOf(SP_COL_OK);
  if (cs < 0) return out;
  ts.getRange(4, 1, ts.getLastRow() - 3, cs + 1).getValues().forEach(function (r) { var nm = tgNorm_(String(r[0] || '')); if (nm) out[nm] = spKeysOf_(r[cs]); });
  return out;
}
/* «تأییدشده» ← خانه‌های خالی استخرهای تازه با «۲ – معمول»، فقط درمانگر فعال. اولویت موجود و استخرهای قبلی دست نمی‌خورند */
function spPoolSyncAll_(onlyName) {
  var ps = tgSS_().getSheetByName(TG_POOLS_TAB);
  if (!ps || ps.getLastRow() < 4 || ps.getMaxColumns() < SP_POOL_LAST) return 0;
  var head = ps.getRange(3, SP_POOL_FIRST, 1, 1).getValues()[0][0];
  if (String(head || '').trim() !== spNewPools_()[0].name) return 0;
  var ok = spTherOk_(), pv = ps.getRange(4, 1, ps.getLastRow() - 3, SP_POOL_LAST).getValues(), n = 0;
  for (var i = 0; i < pv.length; i++) {
    var nm = tgNorm_(String(pv[i][0] || ''));
    if (!nm || !ok[nm] || (onlyName && nm !== tgNorm_(onlyName)) || String(pv[i][1] || '').trim() !== 'فعال') continue;
    spNewPools_().forEach(function (l) {
      if (!ok[nm][l.key] || String(pv[i][l.col - 1] || '').trim()) return;
      ps.getRange(i + 4, l.col).setValue(TG_POOL_PRI[1]); n++;
    });
  }
  if (n) CacheService.getScriptCache().remove('pools');
  return n;
}
/* ستون‌های تازهٔ «درمانگران» و «استخرها»؛ «اعلام‌شده» از پروفایل (بی خطر برای اجرای دوباره) */
function spSetup_() {
  var out = [];
  [SP_COL_DECL, SP_COL_OK, SP_COL_PATH, SP_COL_TEXT].forEach(function (h) { tgTherCol_(h); });
  out.push('درمانگران: ۴ ستون');
  out.push('اعلام‌شده: ' + spDeclSync_() + ' نفر');
  var sh = tgSS_().getSheetByName(TG_POOLS_TAB);
  if (sh && sh.getLastRow() >= 3) {
    if (sh.getMaxColumns() < SP_POOL_LAST) sh.insertColumnsAfter(sh.getMaxColumns(), SP_POOL_LAST - sh.getMaxColumns());
    var made = 0, head = sh.getRange(3, SP_POOL_FIRST, 1, SP_POOL_LAST - SP_POOL_FIRST + 1).getValues()[0];
    spNewPools_().forEach(function (l) {
      var h = String(head[l.col - SP_POOL_FIRST] || '').trim();
      if (!h) { sh.getRange(3, l.col).setValue(l.name).setFontWeight('bold').setBackground('#fbe9ea').setWrap(true); made++; }
      else if (h !== l.name) throw new Error('ستون ' + l.col + ' استخرها از قبل «' + h + '» است');
      sh.setColumnWidth(l.col, 105);
    });
    if (sh.getLastRow() > 3) sh.getRange(4, SP_POOL_FIRST, sh.getLastRow() - 3, SP_POOL_LAST - SP_POOL_FIRST + 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(TG_POOL_PRI, true).setAllowInvalid(false).build());
    CacheService.getScriptCache().remove('pools');
    out.push('استخرها: ' + made + ' ستون تازه');
  }
  return out.join(' · ');
}

/* یک‌باره v170.62: فقط خشک (شمار «اعلام‌شده» هر خط) */
function tgV17062SpDry() { return spDeclDry(); }

function spTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM };
  TG_DRY = true; TG_MEM = {};
  function S(n) { return { therapist: n, dateIso: '2026-10-20', hhmm: '10:00' }; }
  function names(l) { return l.map(function (s) { return s.therapist; }).join('، '); }
  try {
    ok('سیزده عنوان با کد need', SP_LINES.length === 13 && spKeyOf_('سوگ') === 'grief' && spKeyOf_('ADHD بزرگسال') === 'adhd' && spKeyOf_('پذیرش همهٔ هویت‌ها') === 'affirming' && spKeyOf_('کودک و نوجوان') === '' && spKeyOf_('تراپی فردی') === '');
    ok('استخر: زوج ← زوج و رابطه، کودک و نوجوان ← استخر موجود، همهٔ هویت‌ها ← ستون ۱۶', spPoolKey_('couple') === 'rel' && spPoolKey_('kid') === 'kid' && spPoolKey_('teen') === 'kid' && spPoolKey_('affirming') === 'lgbt' && spPoolKey_('ocd') === 'ocd');
    var nw = spNewPools_();
    ok('نه استخر تازه بعد از «یادداشت» و پشت‌سرهم', nw.length === 9 && SP_POOL_FIRST === TG_POOL_LAST + 1 && nw.every(function (l, i) { return l.col === SP_POOL_FIRST + i; }) && SP_POOL_LAST === SP_POOL_FIRST + 8);
    var decl = spDeclOf_({ focus: 'اضطراب، مسائل جنسی، تروما، وسواس', groups: 'کوییر و LGBTQ+، بیماری مزمن', ages: 'بزرگسال، نوجوان' });
    ok('«اعلام‌شده» از پروفایل سایت (موضوع‌ها، گروه‌ها، رده‌ها)', decl === 'سکسولوژی، نوجوان ۱۲ تا ۱۷، رابطه با والد آسیب‌زا، وسواس، سایکوسوماتیک و بیماری مزمن، پذیرش همهٔ هویت‌ها', decl);
    ok('رابطه و زوج، سوگ و فقدان، کودک', spDeclOf_({ focus: 'رابطه و زوج، سوگ و فقدان', ages: 'کودک' }) === 'زوج‌درمانی، کودک زیر ۱۲، سوگ' && spDeclOf_({}) === '');
    var row = []; for (var i = 0; i < 26; i++) row.push(''); row[25] = '۱ – اول صف'; row[17] = '۳ – ذخیره'; row[TG_POOL_LGBT - 1] = 'بله';
    var rec = spPoolRec_(row, {});
    ok('سطر استخرها: ستون ۱۸ و ۲۶ و «پذیرش همهٔ هویت‌ها» خوانده می‌شود', rec.psychosomatic === 1 && rec.sex === 3 && rec.lgbt === 1 && !rec.grief, JSON.stringify(rec));
    ok('سطر کوتاه‌تر از ۲۶ ستون خطا نمی‌دهد', JSON.stringify(spPoolRec_(['الف', 'فعال'], {})) === '{}');

    var pm = {};
    pm[tgNorm_('سوگ‌کار الف')] = { ind: 2, grief: 1 };
    pm[tgNorm_('سوگ‌کار ب')] = { ind: 1, grief: 2 };
    pm[tgNorm_('فردی‌کار پ')] = { ind: 1 };
    TG_MEM['poolmap'] = pm;
    var slots = [S('فردی‌کار پ'), S('سوگ‌کار الف'), S('سوگ‌کار ب')];
    tgSetVal_('qt', 801, 'oth'); tgSetVal_('spk', 801, 'سوگ');
    var r1 = tgPoolFilter_(slots, 801);
    ok('مچ‌میکینگ: اول استخر خدمت (سوگ)، فردی‌کار بیرون', names(r1).indexOf('فردی‌کار پ') < 0 && r1.length === 2, names(r1));
    ok('استخر خدمت خالی: همان قاعدهٔ قبلی، رزرو قفل نمی‌شود', tgPoolFilter_([S('فردی‌کار پ')], 801).length === 1);
    tgSetVal_('qt', 802, 'oth');
    var r0 = tgPoolFilter_(slots, 802);
    ok('بی خط تخصصی: رفتار قبلی دست‌نخورده', names(r0).indexOf('فردی‌کار پ') > -1 && r0.length === 2, names(r0));
    ok('over.kind (مینی‌اپ)', tgPoolFilter_(slots, null, { topic: 'oth', kind: 'سوگ' }).length === 2);
    pm[tgNorm_('خارج‌بین')] = { ind: 1, grief: 1, abroad: true };
    ok('خارج از ایران: فقط عضو استخر خارج در همان خط', names(tgPoolFilter_(slots.concat([S('خارج‌بین')]), null, { topic: 'oth', kind: 'سوگ', abroad: true })) === 'خارج‌بین');
    pm[tgNorm_('پذیرا')] = { ind: 3, lgbt: 1 };
    ok('پذیرش همهٔ هویت‌ها از استخر موجود', names(tgPoolFilter_(slots.concat([S('پذیرا')]), null, { topic: 'oth', kind: 'پذیرش همهٔ هویت‌ها' })) === 'پذیرا');
    ok('برچسب استخر تازه برای هشدار ارجاع', spPoolName_('divorce') === 'جدایی و طلاق' && spPoolName_('x') === '');

    TG_MEM['thpq'] = {}; TG_MEM['thpq'][tgNorm_('الف')] = { focus: 'سوگ و فقدان، وسواس' }; TG_MEM['thpq'][tgNorm_('ب')] = { focus: 'سوگ و فقدان', ages: 'نوجوان' }; TG_MEM['thpq'][tgNorm_('پایان')] = { focus: 'سوگ و فقدان' };
    TG_MEM['sp:ther'] = [{ name: 'الف', status: 'فعال' }, { name: 'ب', status: 'فعال' }, { name: 'پایان', status: 'پایان همکاری' }];
    var dd = spDeclDry();
    ok('خشک: شمار «اعلام‌شده» هر خط، فقط فعال‌ها، بی نام', /2 درمانگر فعال/.test(dd) && /سوگ 2/.test(dd) && /وسواس 1/.test(dd) && /نوجوان ۱۲ تا ۱۷ 1/.test(dd) && /سکسولوژی 0/.test(dd) && dd.indexOf('الف') < 0, dd);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'spTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['K07 خط‌های تخصصی: اعلام‌شده، استخرها، مچ‌میکینگ (v170.62)', 'spTests']); } catch (eSp) {}
