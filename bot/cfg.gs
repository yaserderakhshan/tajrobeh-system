/**
 * cfg.gs · v170.8 و v170.9 · ۱۲ مهر ۱۴۰۵ · تنظیمات خصوصی بیرون از کد (مخزن عمومی)
 *
 * - cfg_(کلید، پیش‌فرض خالی) در Code.gs: Script Property «TG_CFG» (یک JSON). از v170.9 هیچ مقدار واقعی در کد نیست؛
 *   اجرای محلی TG_CFG ساختگی از .github/scripts/bot-cfg-fixture.mjs می‌گیرد.
 * - تب پنهان و قفل «تنظیمات خصوصی بات» در هاب: کلید · مقدار · توضیح. جای ویرایش آدمی؛ هر ساعت از tgWatchdog
 *   (و دستی با tgCfgSync) در TG_CFG می‌نشیند. شناسهٔ هاب (TG_SHEET_ID) فقط در Property است، چون تب را با آن پیدا می‌کنیم.
 * - یک‌بارهٔ tgV1708Cfg: مقدار فعلی همهٔ کلیدها در Property و تب. رفتار بات عوض نمی‌شود (همان مقدارها).
 * - مقدار هیچ کلیدی در لاگ، گزارش یا پیام نمی‌آید؛ فقط نام و شمار.
 */
/* v170.9: نام جدا؛ «تنظیمات تیم» تب عمومی تیم (وضعیت‌های لید و...) است و v170.8 به همین دلیل تب خصوصی را نساخت */
var CFG_TAB = 'تنظیمات خصوصی بات';
var CFG_HEAD = ['کلید', 'مقدار', 'توضیح'];
var CFG_NOTE = {
  TG_SHEET_ID: 'هاب تجربه (فقط در Script Property؛ این ردیف برای دیدن است)', TG_PROFILE_SS: 'پروندهٔ کامل درمانگران', TG_CONTENT_SHEET_ID: 'هاب محتوا',
  TG_SCHOOL_SHEET_ID: 'هاب مدرسه', TG_STAT_SHEET_ID: 'هاب آمار و UTM و سئو', MC_REVIEW_SHEET: 'شیت بازبینی مشارکت مجله', SO_DRIVE_ID: 'پوشهٔ بسته‌های انتشار سوشال',
  TG_PQ_DRIVE: 'پوشهٔ فایل‌های پروفایل', TNK_HOME: 'پوشهٔ تینک', TG_OWNER_CHAT: 'chat مالک (یاسر)', TG_CIRCLE_CAL: 'تقویم هر حلقه (JSON)',
  TG_CAL_PUBLIC: 'تقویم‌های عمومی (JSON)', TG_CAL_ACCOUNT: 'تقویم حساب', PAY_ADDR_TRON: 'آدرس دریافت USDT روی TRON', PAY_ADDR_BSC: 'آدرس دریافت USDT روی BSC',
  DEFAULT_SHARE_PCT: 'سهم پیش‌فرض درمانگر ٪ (محرمانه)', PT_SHARES: 'گزینه‌های سهم فضای پارتنر ٪ (JSON، محرمانه)', RATE_LO: 'کف نرخ جلسه (تومان)',
  RATE_HI: 'سقف نرخ جلسه (تومان)', SUPRATE_LO: 'کف نرخ حمایتی (تومان)', SUPRATE_HI: 'سقف نرخ حمایتی (تومان)', VK_ADMIN_SEED: 'مدیران پایهٔ ساختمان (JSON)', VK_GUARD: 'نام نگهبان ساختمان',
  RM_FOLDER_ID: 'شناسهٔ پوشهٔ «رودمپ‌ها» در درایو (فایل فقط از همین پوشه با ?rmfile سرو می‌شود)', RECEPTION_USER: 'یوزرنیم پذیرش در پیام‌ها (اختیاری؛ خالی = مسئول پذیرش تب «تیم پذیرش»)', SCHOOL_CHIEF_USER: 'یوزرنیم مسئول ارشد مدرسه (اختیاری؛ خالی = نقش «مسئول سازمانی» در «تیم پذیرش»)',
  TG_MAIN_CHANNEL: 'شناسهٔ عددی کانال اصلی تلگرام (v170.14)', TG_NAMES: 'نام همکاران در متن‌ها، تب‌ها و مسئول‌ها (JSON؛ v170.14؛ از v170.23.6.3 کلید v2dev = همکار نسخهٔ ۲)', TG_INP_SEED: 'دادهٔ اولیهٔ مکان و ساعت حضوری برای هاب تازه (JSON، اختیاری)',
  TG_INP_MIG68: 'دادهٔ مهاجرت v68 ساعت‌های حضوری (JSON، اختیاری؛ اجرا شده)', PT_M0924: 'گیرنده‌های پیام یک‌بارهٔ ۲ مهر پارتنرها (JSON، اختیاری؛ فرستاده شده)',
  TG_RELAY_BASE: 'نشانی رلهٔ وبهوک کلادفلر بی رمز (v170.23، اختیاری؛ فقط برای tgSwitchRelay و tgRelayTidy)',
  CM_FIX_HINTS: 'پیشنهادهای پیش‌نمایش اصلاح کامنت‌ها: {"کد لید": "badnum" | "notclient" | "later:21" | "self:7"} (JSON، اختیاری؛ v170.22.2؛ با «اوکی» اعمال نمی‌شوند)',
  CM_FIX_SKIP: 'کد لیدهایی که در پیش‌نمایش اصلاح کامنت‌ها طبق بررسی دست نمی‌خورند: ["کد لید", …] (JSON، اختیاری؛ v170.23.1)',
  GEMINI_PAID: '«بله» فقط وقتی Cowork در AI Studio دیده پروژهٔ کلید Gemini صورت‌حساب فعال دارد (Paid tier؛ داده برای آموزش استفاده نمی‌شود). بی آن، صدا و متن خصوصی به مدل نمی‌رود (v170.23.7)',
  MIG_HUB: 'شناسهٔ گوگل‌شیت «هاب مهاجرت مراجعان (محرمانه)» (v170.23.6.3؛ برگه‌ها: مراجعان، درمانگران، موج‌ها، قیف؛ ستون‌ها با نام سرستون)',
  MIG_ENABLED: 'روشن بودن مهاجرت مراجعان به نسخهٔ ۲: «بله» = دکمهٔ «مراجعان من»، start=v2mig، یادآوری‌ها و گزارش ۲۱ (v170.23.6.3)',
  MIG_CHECKLIST: 'متن چک‌لیست پیش از هر موج مهاجرت (بخش ۹ CLIENT-MIGRATION.md)؛ با دکمه‌های «شروع موج» و «صبر» برای مالک می‌رود (v170.23.6.3)',
  MIG_INVITE_TEXT: 'متن پیام قابل فوروارد درمانگر به مراجعانش؛ {link} جای لینک start=v2mig (اختیاری؛ v170.23.6.3)',
  MIG_V2_LOGIN_URL: 'آدرس ورود یک‌لمسی نسخهٔ ۲ بعد از تأیید مراجع (اختیاری، وقتی آماده شد؛ v170.23.6.3)',
  MIG_V2DEV_MSG: 'متن کامل پیام یک‌باره به همکار نسخهٔ ۲ (کلید v2dev در TG_NAMES)؛ نام‌ها فقط همین‌جا (v170.23.6.3)',
  ASSIST_ENABLED: 'روشن بودن دستیار پاسخ‌گو (assist.gs): «بله» = دکمهٔ «سؤال دارم»، متن آزاد و رابط وب assist.ask (v170.23.11)',
  ASSIST_MODE: 'حالت دستیار: «منو» (فقط دکمه، متن آزاد به پذیرش)، «جستجو» (پیش‌فرض، تطبیق داخلی بی سرویس بیرونی) یا «هوشمند» (فقط با ASSIST_GEMINI_PAID = بله) (v170.23.11)',
  ASSIST_GEMINI_PAID: '«بله» فقط وقتی یاسر بعد از فعال شدن Billing جمنای بگوید؛ تا آن موقع هیچ متن کاربری به جمنای نمی‌رود (v170.23.11)',
  ASSIST_MATCH_MIN: 'آستانهٔ امتیاز جست‌وجوی دستیار، ۰ تا ۱ (خالی = ۰٫۶، محافظه‌کار؛ با دادهٔ گزارش شبانه تنظیم می‌شود) (v170.23.11)',
  ASSIST_EMERGENCY: 'شمارهٔ اورژانس هر کشور برای دستیار: {"DE": "متن", …} (JSON، اختیاری؛ خالی = متن ایران با ۱۲۳، ۱۱۵ و ۱۴۸۰) (v170.23.11)',
  ASSIST_RATE: 'سقف پرسش هر session_id در ساعت در رابط وب دستیار (خالی = ۲۰) (v170.23.11)',
  LEAD_SPEED_ENABLED: 'روشن بودن پاسخ زیر ۱۰ دقیقه و فهرست اولویت ۹:۳۰ پذیرش (leadspeed.gs): «بله» = روشن (v170.23.12)',
  LEAD_SCORE_WEIGHTS: 'وزن‌های امتیاز فهرست اولویت: {"fresh": 3, "complete": 2, "intro": 2, "channel": 1, "noans": -1, "due": 3} (JSON، اختیاری؛ v170.23.12)',
  TG_CONTRACT_VER: 'نسخهٔ قرارداد همکاری برای ستون «پشتوانهٔ انتشار» پروفایل‌ها، مثل «۱» (v170.23.6؛ با امضای الکترونیک نسخهٔ تازه به‌روز می‌شود)',
  TG_ROUTE: 'جدول مسیریابی منتظرها: {"تیکت" | "باگ" | دستهٔ کار | "پیش‌فرض": "کلید TG_NAMES"} (JSON، اختیاری؛ v170.23.5؛ بی آن: مدیر عملیات ops)',
  CM_FIX_FORCE: 'دور دوم اصلاح کامنت‌ها: لیدهایی که با وجود قاعدهٔ «فقط مهاجرت» به این وضعیت برمی‌گردند: {"کد لید": "وضعیت"} (JSON، اختیاری؛ v170.23.4)',
  CM_FIX_CALL: 'کد لیدهای وضعیت مبهم برای کار «بررسی تلفنی وضعیت» پذیرش: ["کد لید", …] (JSON، اختیاری؛ v170.23.4)',
  PSY_WELCOME: 'متن کامل پیام خوشامد روان‌پزشک با دکمهٔ «تکمیل اطلاعات» (نام‌ها فقط اینجا؛ v170.23.9؛ خالی = خوشامد نمی‌رود)',
  PSY_NATIONAL_NET: '«بله» در روزهای اینترنت ملی: لینک‌های ویزیت به بستر جایگزین (الوکام یا اسکای‌روم) می‌رود (v170.23.9)',
  PSY_FIRST_MIN: 'مدت ویزیت اول روان‌پزشکی به دقیقه، بین ۳۰ و ۴۰ (v170.23.9؛ پیش‌فرض ۴۰)',
  PSY_FOLLOW_MIN: 'مدت ویزیت پیگیری روان‌پزشکی به دقیقه (v170.23.9؛ پیش‌فرض ۲۰)'
};
/* کلیدهایی که خالی بودنشان مجاز است (جایگزین دارند) */
var CFG_OPTIONAL = ['RECEPTION_USER', 'SCHOOL_CHIEF_USER', 'RM_FOLDER_ID', 'TG_INP_SEED', 'TG_INP_MIG68', 'PT_M0924', 'TG_RELAY_BASE', 'CM_FIX_HINTS', 'CM_FIX_SKIP', 'CM_FIX_FORCE', 'CM_FIX_CALL', 'TG_ROUTE', 'TG_CONTRACT_VER', 'MIG_HUB', 'MIG_ENABLED', 'MIG_CHECKLIST', 'MIG_INVITE_TEXT', 'MIG_V2_LOGIN_URL', 'MIG_V2DEV_MSG', 'GEMINI_PAID', 'PSY_WELCOME', 'PSY_NATIONAL_NET', 'PSY_FIRST_MIN', 'PSY_FOLLOW_MIN', 'ASSIST_ENABLED', 'ASSIST_MODE', 'ASSIST_GEMINI_PAID', 'ASSIST_MATCH_MIN', 'ASSIST_EMERGENCY', 'ASSIST_RATE', 'LEAD_SPEED_ENABLED', 'LEAD_SCORE_WEIGHTS'];
/* v170.9: کلیدهای لازمی که در Property خالی‌اند (فقط نام). روی دیپلوی آزمایشی سنجیده می‌شود؛ هر کدام خالی = انتشار متوقف */
function cfgMissing_() {
  var o = cfgPropGet_();
  return Object.keys(TG_CFG_SEEN).filter(function (k) { if (CFG_OPTIONAL.indexOf(k) > -1) return false; var v = o[k]; return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && v && !Array.isArray(v) && !Object.keys(v).length); }).sort();
}
var CFG_PROP_ONLY = ['TG_SHEET_ID'];
function cfgDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function cfgEnc_(v) { return (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v == null ? '' : v); }
function cfgDec_(s, like) {
  s = String(s == null ? '' : s).trim();
  if (like !== null && typeof like === 'object') { try { return JSON.parse(s); } catch (e) { return undefined; } }
  if (typeof like === 'number') { var n = Number(s.replace(/[^\d.]/g, '')); return isFinite(n) && s !== '' ? n : undefined; }
  return s;
}
function cfgPropGet_() { if (cfgDry_()) { try { return JSON.parse(TG_MEM['cfg:prop'] || '{}'); } catch (e) { return {}; } } try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('TG_CFG') || '{}') || {}; } catch (e) { return {}; } }
function cfgPropSet_(o) {
  var s = JSON.stringify(o);
  if (s.length > 8500) throw new Error('TG_CFG بزرگ‌تر از سقف Script Property است');
  if (cfgDry_()) TG_MEM['cfg:prop'] = s; else PropertiesService.getScriptProperties().setProperty('TG_CFG', s);
  TG_CFG_ = o;
}
/* تب (خشک: TG_MEM['cfg:tab'] به شکل ردیف‌ها) */
function cfgTabRows_() {
  if (cfgDry_()) return TG_MEM['cfg:tab'] || null;
  var sh = SpreadsheetApp.openById(TG_SHEET_ID).getSheetByName(CFG_TAB); if (!sh) return null;
  var n = sh.getLastRow(); return n < 2 ? [] : sh.getRange(2, 1, n - 1, 3).getValues().map(function (r) { return r.map(String); });
}
function cfgTabMake_(rows) {
  if (cfgDry_()) { TG_MEM['cfg:tab'] = rows; TG_MEM['cfg:tabmeta'] = { hidden: true, protected: true }; return; }
  var ss = SpreadsheetApp.openById(TG_SHEET_ID), sh = ss.getSheetByName(CFG_TAB);
  if (!sh) { sh = ss.insertSheet(CFG_TAB); sh.setRightToLeft(true); }
  sh.clearContents();
  sh.getRange(1, 1, 1, 3).setValues([CFG_HEAD]).setFontWeight('bold');
  if (rows.length) sh.getRange(2, 1, rows.length, 3).setNumberFormat('@').setValues(rows);
  sh.setFrozenRows(1);
  try { sh.hideSheet(); } catch (eH) {}
  try { var p = sh.protect().setDescription('تنظیمات خصوصی بات · فقط مالک'); p.removeEditors(p.getEditors()); if (p.canDomainEdit()) p.setDomainEdit(false); } catch (eP) {}
}
/* تب ← Property. فقط کلیدهای شناخته‌شده؛ مقدار خالی یا ناخوانا نادیده گرفته می‌شود. */
function cfgSync_() {
  var rows = cfgTabRows_(); if (!rows) return { ok: false, why: 'tab' };
  var cur = cfgPropGet_(), n = 0, bad = [], read = 0;
  rows.forEach(function (r) {
    var k = String(r[0]).trim(); if (!k || !(k in TG_CFG_SEEN) || CFG_PROP_ONLY.indexOf(k) > -1) return;
    var v = cfgDec_(r[1], TG_CFG_SEEN[k]);
    if (v === undefined || v === '') { if (String(r[1]).trim()) bad.push(k); return; }
    read++;   /* v170.23.4: شمار کلیدهای خوانده‌شده (پیام «۰ کلید» فقط «تازه» را می‌شمرد) */
    if (cfgEnc_(cur[k]) !== cfgEnc_(v)) { cur[k] = v; n++; }
  });
  if (n) cfgPropSet_(cur);
  if (bad.length) { try { tgErr_('cfgSync_', 'مقدار ناخوانا در «' + CFG_TAB + '»: ' + bad.join('، ')); } catch (e) {} }
  return { ok: true, changed: n, bad: bad, read: read };
}
function tgCfgSync() { return cfgSync_(); }
/* ساعتی از tgWatchdog؛ خطایش چیزی را نمی‌شکند */
function cfgHourly_() { try { return cfgSync_(); } catch (e) { try { tgErr_('cfgHourly_', e); } catch (e2) {} return { ok: false }; } }

/* یک‌باره بعد از انتشار: مقدارهای فعلی در Property و تب */
function tgV1708Cfg() {
  var cur = cfgPropGet_(), keys = Object.keys(TG_CFG_SEEN).sort(), put = 0;
  keys.forEach(function (k) { if (cur[k] === undefined || cur[k] === '') { cur[k] = TG_CFG_SEEN[k]; put++; } });
  cfgPropSet_(cur);
  var tab = cfgTabRows_(), made = false;
  if (!tab || !tab.length) {
    cfgTabMake_(keys.map(function (k) { return [k, cfgEnc_(cur[k]), CFG_NOTE[k] || '']; }));
    made = true;
  }
  return 'تنظیمات: ' + keys.length + ' کلید · تازه در Property: ' + put + ' · تب «' + CFG_TAB + '»: ' + (made ? 'ساخته شد (پنهان و قفل)' : 'بود');
}

/* یک‌بارهٔ v170.9: تب پنهان و قفل «تنظیمات خصوصی بات» از مقدارهای فعلی Property (اگر نیست) */
function tgV1709CfgTab() {
  var cur = cfgPropGet_(), rmNote = '';
  /* پوشهٔ «رودمپ‌ها» یک بار با نام پیدا و شناسه‌اش ثبت می‌شود؛ از این به بعد فقط با شناسه */
  if (!cur.RM_FOLDER_ID && !cfgDry_()) {
    try { var it = DriveApp.getFoldersByName('رودمپ‌ها'), ids = []; while (it.hasNext()) ids.push(it.next().getId()); if (ids.length === 1) { cur.RM_FOLDER_ID = ids[0]; cfgPropSet_(cur); rmNote = ' · پوشهٔ رودمپ: ثبت شد'; } else rmNote = ' · پوشهٔ رودمپ: ' + ids.length + ' پوشه با این نام، دستی در تب بگذارید'; } catch (eRm) { rmNote = ' · پوشهٔ رودمپ: خطا'; }
  }
  cfg_('RM_FOLDER_ID', '');
  var keys = Object.keys(TG_CFG_SEEN).sort(), tab = cfgTabRows_();
  if (tab && tab.length) return 'تب «' + CFG_TAB + '»: بود · ' + keys.length + ' کلید' + rmNote;
  cfgTabMake_(keys.map(function (k) { return [k, cfgEnc_(cur[k] === undefined ? '' : cur[k]), CFG_NOTE[k] || '']; }));
  var miss = cfgMissing_();
  return 'تب «' + CFG_TAB + '»: ساخته شد (پنهان و قفل) · ' + keys.length + ' کلید · خالی: ' + (miss.length ? miss.join('، ') : 'هیچ') + rmNote;
}

function cfgTests() {
  var out = [], pass = 0, fail = 0;
  var ok = function (t, c) { if (c) pass++; else { fail++; out.push('❌ ' + t); } };
  var was = TG_DRY, wasC = TG_CFG_; TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  try {
    TG_CFG_ = {};
    ok('بی Property، مقدار پشتیبان همین نسخه', cfg_('TG_OWNER_CHAT', 'x1') === 'x1');
    TG_CFG_ = { TG_OWNER_CHAT: '42' };
    ok('Property بر پشتیبان برنده است', cfg_('TG_OWNER_CHAT', 'x1') === '42');
    TG_CFG_ = { TG_OWNER_CHAT: '' };
    ok('مقدار خالی در Property ← پشتیبان', cfg_('TG_OWNER_CHAT', 'x1') === 'x1');
    TG_CFG_ = null;
    ok('همهٔ کلیدهای منتقل‌شده ثبت شده‌اند', ['TG_SHEET_ID', 'TG_PROFILE_SS', 'TG_CONTENT_SHEET_ID', 'TG_SCHOOL_SHEET_ID', 'TG_STAT_SHEET_ID', 'MC_REVIEW_SHEET', 'SO_DRIVE_ID',
      'TG_PQ_DRIVE', 'TNK_HOME', 'TG_OWNER_CHAT', 'TG_CIRCLE_CAL', 'TG_CAL_PUBLIC', 'TG_CAL_ACCOUNT', 'PAY_ADDR_TRON', 'PAY_ADDR_BSC', 'DEFAULT_SHARE_PCT', 'PT_SHARES',
      'RATE_LO', 'RATE_HI', 'SUPRATE_LO', 'SUPRATE_HI', 'VK_ADMIN_SEED', 'VK_GUARD'].every(function (k) { return k in TG_CFG_SEEN; }));
    ok('همهٔ کلیدها توضیح دارند', Object.keys(TG_CFG_SEEN).every(function (k) { return !!CFG_NOTE[k]; }));
    var msg = tgV1708Cfg(), P = JSON.parse(TG_MEM['cfg:prop']);
    ok('یک‌باره همهٔ مقدارها را در Property می‌گذارد', Object.keys(TG_CFG_SEEN).every(function (k) { return cfgEnc_(P[k]) === cfgEnc_(TG_CFG_SEEN[k]); }));
    ok('یک‌باره تب پنهان و قفل می‌سازد', TG_MEM['cfg:tab'].length === Object.keys(TG_CFG_SEEN).length && TG_MEM['cfg:tabmeta'].hidden && TG_MEM['cfg:tabmeta'].protected);
    ok('گزارش یک‌باره فقط نام و شمار دارد', /^تنظیمات: \d+ کلید · تازه در Property: \d+ · تب «[^»]+»: (ساخته شد \(پنهان و قفل\)|بود)$/.test(msg));
    /* v170.9: هیچ مقدار واقعی در کد نمی‌ماند؛ پشتیبان همهٔ کلیدها خالی است (روی v170.8 مردود) */
    ok('پشتیبان هیچ کلیدی در کد مقدار ندارد', Object.keys(TG_CFG_SEEN).every(function (k) { var v = TG_CFG_SEEN[k]; return v === '' || v === 0 || (Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Object.keys(v).length); }));
    /* ویرایش تب ← Property */
    TG_MEM['cfg:tab'].forEach(function (r) { if (r[0] === 'RATE_LO') r[1] = '1600000'; if (r[0] === 'PT_SHARES') r[1] = '[15,20]'; if (r[0] === 'TG_SHEET_ID') r[1] = 'HACK'; if (r[0] === 'TG_CIRCLE_CAL') r[1] = '{bad json'; });
    var sy = cfgSync_(); P = JSON.parse(TG_MEM['cfg:prop']);
    ok('ویرایش تب در Property می‌نشیند (عدد و JSON)', P.RATE_LO === 1600000 && JSON.stringify(P.PT_SHARES) === '[15,20]');
    ok('شناسهٔ هاب از تب عوض نمی‌شود', P.TG_SHEET_ID === TG_CFG_SEEN.TG_SHEET_ID);
    ok('JSON ناخوانا نادیده گرفته و گزارش می‌شود', sy.bad.indexOf('TG_CIRCLE_CAL') > -1 && JSON.stringify(P.TG_CIRCLE_CAL) === JSON.stringify(TG_CFG_SEEN.TG_CIRCLE_CAL));
    ok('تب بی‌ردیف ← چیزی پاک نمی‌شود', (function () { TG_MEM['cfg:tab'] = []; cfgSync_(); return JSON.parse(TG_MEM['cfg:prop']).RATE_LO === 1600000; })());
    ok('عدد پول فارسی', cfgFaMoney_(1500000) === '۱٬۵۰۰٬۰۰۰');
    TG_MEM['cfg:prop'] = JSON.stringify({ TG_SHEET_ID: 'x' });
    var miss = cfgMissing_();
    ok('سنجش تنظیمات کلید خالی را نام می‌برد و اختیاری‌ها را نه', miss.indexOf('TG_OWNER_CHAT') > -1 && miss.indexOf('TG_SHEET_ID') < 0 && miss.indexOf('RECEPTION_USER') < 0);
  } catch (e) { fail++; out.push('❌ خطا: ' + e); }
  TG_DRY = was; TG_CFG_ = wasC; TG_MEM = {}; TG_OUTBOX = [];
  Logger.log('تنظیمات خصوصی: ' + pass + ' قبول، ' + fail + ' مردود\n' + out.join('\n'));
  return { pass: pass, fail: fail, out: out };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'cfgTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['تنظیمات خصوصی (v170.8، v170.9)', 'cfgTests']); } catch (eCf) {}
