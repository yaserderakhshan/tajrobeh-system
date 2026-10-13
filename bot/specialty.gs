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

/* ============================================================================
   بخش ۲ (v170.63): برچسب لید. «نوع درخواست» لید تازه یکی از سیزده عنوان را می‌گیرد تا جدا شمرده و درست ارجاع شود.
   «کودک و نوجوان» برای سطرهای گذشته می‌ماند؛ سطرهای گذشته دست نمی‌خورند.
   منبع‌ها به ترتیب: کد شروع th_<کد need> (همان مسیر th_cpl) و کلید grief صفحهٔ شروع تراپی ← need فرم سایت ← کلیدواژهٔ روشن.
   ============================================================================ */
var SP_KINDS_NEW = SP_LINES.map(function (l) { return l.name; });
var SP_GENERIC = ['', 'تراپی فردی', 'نامشخص'];
/* کلیدواژه‌های روشن در متن مراجع، فقط روی نوع خالی یا عمومی. «کودک» و «نوجوان» عمداً نیست (کودک درون، دوران نوجوانی) */
var SP_KW = [
  [/سکسولوژ|سکس ?تراپ|سکس‌تراپ|مشکلات? جنسی|درمان جنسی|اختلال جنسی/, 'sex'],
  [/پیش از ازدواج|قبل از ازدواج|مشاوره\S* ازدواج/, 'premarital'],
  [/طلاق/, 'divorce'],
  [/زوج ?درمانی|زوج‌درمانی/, 'couple'],
  [/سوگ|داغدار|از دست دادن عزیز|فوت (پدر|مادر|همسر|فرزند|عزیز)/, 'grief'],
  [/والد(ین)? (آسیب|خودشیفته)|(مادر|پدر) ?(ی )?خودشیفته/, 'parent'],
  [/ADHD|بیش ?فعالی بزرگسال|نقص توجه بزرگسال/i, 'adhd'],
  [/ناباروری|افسردگی پس از زایمان|پس از زایمان|دوران بارداری/, 'perinatal'],
  [/وسواس|OCD/i, 'ocd'],
  [/سایکوسوماتیک|روان ?تنی|روان‌تنی|بیماری مزمن/, 'psychosomatic'],
  [/کوییر|LGBT|دگرباش|همجنس ?گرا|ترنس/i, 'affirming']
];
/* واژگان کد (پشتیبان وقتی تب خالی است) و قاعده‌های نرمال‌سازی: پیش از قاعدهٔ کلی «کودک|نوجوان ← کودک و نوجوان» */
try {
  SP_KINDS_NEW.forEach(function (k) { if (V168_VOCAB['نوع درخواست'].indexOf(k) < 0) V168_VOCAB['نوع درخواست'].splice(V168_VOCAB['نوع درخواست'].length - 1, 0, k); });
  if (!V168_KIND_RULES.some(function (r) { return r[1] === 'کودک زیر ۱۲'; })) {
    V168_KIND_RULES.unshift([/کودکزیر/, 'کودک زیر ۱۲'], [/نوجوان[۱1][۲2]/, 'نوجوان ۱۲ تا ۱۷'], [/سکسولوژ|سکستراپ/, 'سکسولوژی'],
      [/پیشازازدواج/, 'پیش از ازدواج'], [/طلاق/, 'جدایی و طلاق'], [/^سوگ$/, 'سوگ'], [/والدآسیب/, 'رابطه با والد آسیب‌زا'],
      [/adhd/i, 'ADHD بزرگسال'], [/بارداری|زایمان|ناباروری/, 'بارداری، پس از زایمان و ناباروری'], [/^وسواس$/, 'وسواس'],
      [/سایکوسوماتیک/, 'سایکوسوماتیک و بیماری مزمن'], [/همههویت/, 'پذیرش همهٔ هویت‌ها']);
  }
  SP_LINES.forEach(function (l) { if (!TG_START_MAP['th_' + l.key] && l.key !== 'couple') TG_START_MAP['th_' + l.key] = 'خدمات › ' + l.name; });
} catch (eSpV) {}
/* کدهای شروع تازه: th_<کد need>؛ th_couple همان th_cpl نیست و th_cpl دست نمی‌خورد */
function spStartKey_(arg) {
  var a = String(arg || '');
  if (a === 'gt-grief') return 'grief';
  var m = a.match(/^th_([a-z]+)$/);
  return m && m[1] !== 'cpl' && m[1] !== 'ind' && spLine_(m[1]) ? m[1] : '';
}
function spStartArg_(chat, arg) {
  var k = spStartKey_(arg), name = k ? spLine_(k).name : '';
  if (name || spKindOfChat_(chat)) tgSetVal_('spk', chat, name);   /* کد شروع دیگر، برچسب قبلی را پاک می‌کند */
  return name;
}
function spKindOfChat_(chat) { try { return String(tgGetVal_('spk', chat) || ''); } catch (e) { return ''; } }
/* متن یا یادداشت ← نوع درخواست ('' اگر چیزی روشن نبود) */
function spKindOfText_(text, kind) {
  var t = String(text || ''), m = t.match(/need:([a-z]+)/);
  if (m && spLine_(m[1])) return spLine_(m[1]).name;
  if (SP_GENERIC.indexOf(String(kind || '').trim()) < 0) return '';
  var q = t.replace(/‌/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  for (var i = 0; i < SP_KW.length; i++) if (SP_KW[i][0].test(q)) return spLine_(SP_KW[i][1]).name;
  return '';
}
/* tgAppendLead_ (لید تازه از هر مسیر): need فرم سایت یا کلیدواژهٔ روشن */
function spLeadPrefill_(o) {
  try { var k = spKindOfText_(String(o.note || '') + ' ' + String(o.firstText || ''), o.kind); if (k) o.kind = k; } catch (e) { tgErr_('spLeadPrefill_', e); }
  return o;
}
/* واژگان: مقدارهای تازه در فهرست «نوع درخواست» (فهرست کشویی تب «لیدها» همان ستون است) */
function spVocabAdd_() {
  var sh = tgSS_().getSheetByName(V168_T_VOCAB);
  if (!sh) return 'تب واژگان نیست';
  var hd = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var c = hd.indexOf('نوع درخواست') + 1;
  if (c < 1) return 'ستون «نوع درخواست» در واژگان نیست';
  var v = sh.getRange(2, c, Math.max(1, sh.getLastRow() - 1), 1).getValues().map(function (r) { return String(r[0] || '').trim(); });
  var last = 0; v.forEach(function (x, i) { if (x) last = i + 1; });
  var have = v.filter(String).map(v168Squash_);
  var add = SP_KINDS_NEW.filter(function (k) { return have.indexOf(v168Squash_(k)) < 0; });
  if (add.length) sh.getRange(2 + last, c, add.length, 1).setValues(add.map(function (x) { return [x]; }));
  pbCacheDrop_('v168voc');
  return 'نوع درخواست: ' + add.length + ' مقدار تازه';
}
/* کدهای start: برچسب کدهای تازه در تب «کدهای start» */
function spStartRows_() {
  var have = {}; pbRows_('e', PB_T_START, PB_START_HEAD).forEach(function (r) { have[String(r['کد']).trim()] = 1; });
  var add = SP_LINES.filter(function (l) { return l.key !== 'couple' && !have['th_' + l.key]; }).map(function (l) { return { 'کد': 'th_' + l.key, 'برچسب': 'خدمات › ' + l.name }; });
  pbAddMany_('e', PB_T_START, PB_START_HEAD, add);
  return 'کدهای start: ' + add.length + ' ردیف';
}
/* خشک: لیدهای فعلی که با همین قاعده‌ها برچسب تازه می‌گرفتند (فقط شمار، بی نوشتن) */
function spLabelDry() {
  var rows;
  if (TG_DRY) rows = TG_MEM['sp:leads'] || [];
  else { var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow(); rows = last < 2 ? [] : sh.getRange(2, 1, last - 1, 14).getValues(); }
  var by = {}, n = 0;
  rows.forEach(function (r) {
    if (!String(r[3] || '').trim() && !String(r[5] || '').trim()) return;
    var k = spKindOfText_(String(r[12] || '') + ' ' + String(r[7] || ''), String(r[13] || '').trim());
    if (!k || v168Squash_(k) === v168Squash_(r[13])) return;
    by[k] = (by[k] || 0) + 1; n++;
  });
  return 'برچسب تازه (خشک، بی نوشتن): ' + n + ' لید فعلی' + (n ? ' · ' + SP_KINDS_NEW.filter(function (k) { return by[k]; }).map(function (k) { return k + ' ' + by[k]; }).join('، ') : '') + ' · سطرهای گذشته عوض نمی‌شوند';
}
/* یک‌باره v170.63: فقط خشک */
function tgV17063SpLabelDry() { return spLabelDry(); }

function spLabelTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  try {
    ok('need فرم سایت ← نوع درخواست (سیزده کد)', spKindOfText_('موضوع: need:premarital | from:home', '') === 'پیش از ازدواج' && spKindOfText_('need:parent', 'تراپی فردی') === 'رابطه با والد آسیب‌زا' && spKindOfText_('need:affirming', '') === 'پذیرش همهٔ هویت‌ها' && spKindOfText_('need:anx', '') === '');
    ok('کلیدواژهٔ روشن فقط روی نوع عمومی', spKindOfText_('برای طلاق مشاوره می‌خواهم', 'تراپی فردی') === 'جدایی و طلاق' && spKindOfText_('برای طلاق', 'زوج‌درمانی') === '' && spKindOfText_('وسواس فکری دارم', '') === 'وسواس' && spKindOfText_('مادر خودشیفته', '') === 'رابطه با والد آسیب‌زا');
    ok('کودک درون و دوران نوجوانی برچسب نمی‌گیرد', spKindOfText_('کار روی کودک درون و دوران نوجوانی', '') === '');
    ok('نرمال‌سازی: «کودک زیر ۱۲» به «کودک و نوجوان» برنمی‌گردد', v168NormKind_('کودک زیر ۱۲') !== 'کودک و نوجوان' && v168NormKind_('نوجوان ۱۲ تا ۱۷') !== 'کودک و نوجوان' && v168NormKind_('کودک و نوجوان') === 'کودک و نوجوان', v168NormKind_('کودک زیر ۱۲'));
    ok('واژگان کد سیزده عنوان را دارد', SP_KINDS_NEW.every(function (k) { return V168_VOCAB['نوع درخواست'].indexOf(k) > -1; }) && V168_VOCAB['نوع درخواست'].indexOf('کودک و نوجوان') > -1);
    tgAppendLead_({ source: 'سایت › پذیرش › شروع تراپی', name: 'نمونه', channel: 'فرم سایت', phone: '', region: 'داخل ایران', firstText: '', status: 'جدید', note: 'موضوع: need:divorce | from:home' });
    var ld = TG_OUTBOX.filter(function (x) { return x.kind === 'lead'; })[0];
    ok('لید تازهٔ فرم سایت با need:divorce ← «جدایی و طلاق»', ld && ld.o.kind === 'جدایی و طلاق', ld && ld.o.kind);
    ok('کد شروع th_kid ← نوع درخواست چت', spStartArg_(811, 'th_kid') === 'کودک زیر ۱۲' && spKindOfChat_(811) === 'کودک زیر ۱۲');
    spStartArg_(811, 'home_hero');
    ok('کد شروع دیگر برچسب قبلی را پاک می‌کند', spKindOfChat_(811) === '');
    ok('gt-grief ← سوگ؛ th_cpl و th_ind دست‌نخورده', spStartArg_(812, 'gt-grief') === 'سوگ' && spStartArg_(813, 'th_cpl') === '' && spStartArg_(814, 'th_ind') === '' && TG_START_MAP.th_cpl === 'خدمات › زوج');
    ok('برچسب کدهای شروع تازه', tgStartLabel_('th_teen') === 'خدمات › نوجوان ۱۲ تا ۱۷' && tgStartLabel_('th_ocd') === 'خدمات › وسواس' && tgStartLabel_('th_psychosomatic') === 'خدمات › سایکوسوماتیک و بیماری مزمن');
    var L = function (name, kind, note, txt) { var r = []; for (var z = 0; z < 14; z++) r.push(''); r[3] = name; r[7] = txt || ''; r[12] = note || ''; r[13] = kind; return r; };
    TG_MEM['sp:leads'] = [L('الف', '', 'موضوع: need:sex'), L('ب', 'تراپی فردی', '', 'برای سوگ پدرم'), L('پ', 'سکسولوژی', 'need:sex'), L('', '', 'need:kid'), L('ت', 'زوج‌درمانی', '', 'طلاق')];
    var dr = spLabelDry();
    ok('خشک: شمار برچسب تازهٔ لیدهای فعلی، بی نام و بی نوشتن', /: 2 لید/.test(dr) && /سکسولوژی 1/.test(dr) && /سوگ 1/.test(dr) && dr.indexOf('الف') < 0, dr);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'spLabelTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['K07 برچسب لید (v170.63)', 'spLabelTests']); } catch (eSl) {}
/* ============================================================================
   بخش ۳ (v170.64): کودک و نوجوان در فرم پذیرش بات (تصمیم D49: هیچ‌کدام الزامی نیست)
   - نوع «کودک زیر ۱۲»: «پرکنندهٔ فرم والد یا سرپرست است؟» و سن کودک.
   - نوع «نوجوان ۱۲ تا ۱۷»: «والد در جریان هست و موافق است؟» (اختیاری).
   پرسش پیش از کشور و شماره می‌آید (tgQuizFinish_). جواب فقط در ستون «پرسش‌های والد» لید و کارت لید پذیرش دیده می‌شود.
   پذیرش خودش تصمیم می‌گیرد؛ هیچ مسیری قفل نمی‌شود.
   ============================================================================ */
var SP_COL_KIDQ = 'پرسش‌های والد';
var SP_SKIP = '⏭ رد کردن';
var SP_KQ = {
  par:  { t: 'پرکنندهٔ فرم والد یا سرپرست است؟', o: ['بله', 'خیر'], skip: true, lbl: 'پرکنندهٔ فرم والد یا سرپرست' },
  age:  { t: 'سن کودک؟', o: ['زیر ۳ سال', '۳ تا ۶ سال', '۷ تا ۹ سال', '۱۰ تا ۱۲ سال'], skip: true, lbl: 'سن کودک' },
  tpar: { t: 'والد در جریان هست و موافق است؟', o: ['بله', 'هنوز نه', 'ترجیح می‌دهم نگویم'], skip: false, lbl: 'والد در جریان و موافق' }
};
try { if (TG_LEAD_FIELDS.indexOf(SP_COL_KIDQ) < 0) TG_LEAD_FIELDS.push(SP_COL_KIDQ); } catch (eKq) {}
function spKidSeq_(chat) {
  var k = spKindOfChat_(chat);
  if (k === 'کودک زیر ۱۲') return ['par', 'age'];
  if (k === 'نوجوان ۱۲ تا ۱۷') return ['tpar'];
  return [];
}
/* پرسش بعدی را می‌فرستد؛ true اگر پرسید */
function spKidAsk_(chat) {
  var seq = spKidSeq_(chat);
  for (var i = 0; i < seq.length; i++) {
    var q = seq[i];
    if (tgGetVal_('kq' + q, chat)) continue;
    var Q = SP_KQ[q], rows = Q.o.map(function (o, j) { return [{ text: o, callback_data: 'kq:' + q + ':' + j }]; });
    if (Q.skip) rows.push([{ text: SP_SKIP, callback_data: 'kq:' + q + ':x' }]);
    tgSend_(chat, Q.t, { inline_keyboard: rows });
    return true;
  }
  return false;
}
/* دکمه‌ها: kq:<پرسش>:<شمارهٔ گزینه|x>. sec:public (مراجع در فرم پذیرش خودش؛ فقط کلید همین چت را می‌نویسد) */
function spKidCb_(chat, data) {
  var p = String(data).split(':'), q = p[1], Q = SP_KQ[q];
  if (!Q || tgGetVal_('kq' + q, chat)) return true;
  var v = p[2] === 'x' ? '-' : (Q.o[Number(p[2])] || '-');
  tgSetVal_('kq' + q, chat, v);
  if (v !== '-') tgSend_(chat, '✅ ' + tgEsc_(v));
  if (spKidAsk_(chat)) return true;
  if (typeof v1689Ask_ === 'function' && v1689Ask_(chat)) return true;
  tgAskPhone_(chat);
  return true;
}
/* از tgOnPhone_: جواب‌ها در ستون «پرسش‌های والد» */
function spKidExtras_(chat, extra) {
  try {
    var parts = [];
    spKidSeq_(chat).forEach(function (q) { var v = tgGetVal_('kq' + q, chat); if (v && v !== '-') parts.push(SP_KQ[q].lbl + ': ' + v); });
    if (parts.length) extra[SP_COL_KIDQ] = parts.join(' · ');
  } catch (e) { tgErr_('spKidExtras_', e); }
  return extra;
}


function spKidTests() {
  var log = [], fail = 0;
  function ok(n, c, d) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n + (d ? ' · ' + d : '')); } }
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX };
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var lastT = function () { var m = TG_OUTBOX.filter(function (x) { return x.text; }); return m.length ? m[m.length - 1] : {}; };
  try {
    spStartArg_(901, 'th_kid');
    tgQuizFinish_(901, 'on');
    var m1 = lastT();
    ok('کودک زیر ۱۲: پیش از شماره «پرکنندهٔ فرم والد یا سرپرست است؟» با «رد کردن»', m1.text === SP_KQ.par.t && JSON.stringify(m1.markup).indexOf('kq:par:x') > -1, JSON.stringify(m1).slice(0, 200));
    spKidCb_(901, 'kq:par:0');
    ok('بعد: سن کودک', lastT().text === SP_KQ.age.t);
    spKidCb_(901, 'kq:age:x');
    ok('رد کردن سن: مسیر به کشور و شماره ادامه می‌دهد', lastT().text !== SP_KQ.age.t && tgGetVal_('kqage', 901) === '-');
    var ex1 = spKidExtras_(901, {});
    ok('جواب در ستون «پرسش‌های والد»؛ ردشده نمی‌آید', ex1[SP_COL_KIDQ] === 'پرکنندهٔ فرم والد یا سرپرست: بله', JSON.stringify(ex1));
    TG_OUTBOX = []; spStartArg_(902, 'th_teen'); tgQuizFinish_(902, 'on');
    ok('نوجوان: یک پرسش اختیاری با «ترجیح می‌دهم نگویم»', lastT().text === SP_KQ.tpar.t && JSON.stringify(lastT()).indexOf('kq:tpar:2') > -1);
    spKidCb_(902, 'kq:tpar:1');
    ok('نوجوان: «هنوز نه» ثبت می‌شود و مسیر قفل نمی‌شود', spKidExtras_(902, {})[SP_COL_KIDQ] === 'والد در جریان و موافق: هنوز نه' && lastT().text !== SP_KQ.tpar.t);
    TG_OUTBOX = []; tgQuizFinish_(903, 'on');
    ok('بی نوع کودک و نوجوان: پرسش تازه نمی‌آید', !TG_OUTBOX.some(function (x) { return x.text === SP_KQ.par.t || x.text === SP_KQ.tpar.t; }));
    ok('کارت لید پذیرش جواب را نشان می‌دهد', tgLeadCardText_({ name: 'نمونه', kidq: 'سن کودک: ۷ تا ۹ سال' }).indexOf('سن کودک: ۷ تا ۹ سال') > -1);
    ok('ستون «پرسش‌های والد» در فهرست ستون‌های لید (در انتها ساخته می‌شود)', TG_LEAD_FIELDS.indexOf(SP_COL_KIDQ) > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300)); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return tgTestTally_(log, fail);
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'spKidTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['K07 پرسش‌های والد کودک و نوجوان (v170.64)', 'spKidTests']); } catch (eSk) {}
