/**
 * publish.gs · v167 · ۹ مهر ۱۴۰۵ · درگاه انتشار و خودکارسازی اطلاع‌رسانی مجله
 *
 * چرا: پیش از این برای هر پست کانال یک تابع موقت در ویرایشگر Apps Script عوض می‌شد. آن کار ممنوع است.
 * حالا دستیار (Claude در Cowork) با یک درخواست POST به «درگاه API» کار را می‌کند و آدم‌ها از میز سردبیر.
 * هر تنظیم بعدی از شیت است، نه از کد.
 *
 *   ۱) درگاه: doPost ← body.api === 1 ← tgApiGateway_. کلید CLAUDE_API_KEY در Script Properties؛ نسخهٔ خواندنی
 *      فقط در یک فایل خصوصی گوگل‌درایو صاحب اسکریپت (PB_KEY_FILE). هر فراخوانی یک سطر در تب «درگاه API».
 *   ۲) صف: تب «صف انتشار». هر ۵ دقیقه (از تریگر موجود soTick، تریگر تازه ساخته نمی‌شود؛ سقف ۲۰ تریگر) موارد
 *      سررسیده فرستاده می‌شوند. روزی حداکثر یک پست مجله در کانال عمومی؛ دومی به فردا ساعت ۱۰ تهران.
 *   ۳) مطلب تازه (از v168.9 بی پایش ۳۰ دقیقه‌ای): ثبت از mag_register، دکمهٔ سردبیر، یا خبر چک روزانهٔ ساعت ۹ به سردبیر.
 *   ۴) پیام هفتگی پنج‌شنبه: پیش‌نمایش ساعت ۱۲ به سردبیر، ارسال ساعت ۲۰ فقط بعد از تأیید.
 *   ۵) بستهٔ سئوی جمنای (gem_seo، gem_seo_batch) در تب «بستهٔ سئو» هاب محتوا. اعمال روی وردپرس کار دستیار است.
 *   ۶) میز سردبیر: «🚀 انتشار مطلب تازه»، «📬 پیام هفتگی»، «📈 آمار مطلب».
 *   ۷) تنظیم‌ها در شیت با کش ۱۰ دقیقه: «کانال‌ها»، «تنظیمات انتشار»، «قالب پیام‌ها»، «کدهای start»، «عنوان مقاله‌ها».
 *   هشدار خطا: خطایی که در ۲۴ ساعت بیش از سه بار تکرار شد، یک پیام کوتاه به یاسر.
 *
 * دست نمی‌زند به: رزرو معارفه، پرداخت، اتصال نقش‌ها و درمانگرها، پذیرش، اسنیپت ۵۰۴۲۶۷، گروه «تجربه زندگی».
 * هیچ دادهٔ مراجع به جمنای نمی‌رود؛ فقط متن منتشرشدهٔ مقاله.
 * قلاب‌ها: Code.gs doPost (api=1) · social.gs soTick (pbTick_) · telegram.gs tgArtName_ و tgStartLabel_ (عنوان و برچسب از شیت)،
 * tgMagEdMenu_ و مسیر دکمه‌های سردبیر (pbDesk_)، tgOnCallback_ (pb: و pbd:)، tgSecretMask_ (کلید tjk_)، TG_SUITES (pbTests).
 */

var PB_T_LOG = 'درگاه API';
var PB_T_Q = 'صف انتشار';
var PB_T_PKG = 'بسته‌های انتشار';
var PB_T_CH = 'کانال‌ها';
var PB_T_CFG = 'تنظیمات انتشار';
var PB_T_TPL = 'قالب پیام‌ها';
var PB_T_START = 'کدهای start';
var PB_T_ART = 'عنوان مقاله‌ها';        // هاب محتوا
var PB_T_SEO = 'بستهٔ سئو';             // هاب محتوا
var PB_T_DG = 'پیام هفتگی';            // هاب محتوا
var PB_T_DGOFF = 'پیام هفتگی · انصراف'; // هاب محتوا

var PB_LOG_HEAD = ['زمان', 'اکشن', 'خلاصهٔ ورودی', 'نتیجه', 'لینک پیام'];
var PB_Q_HEAD = ['شناسه', 'زمان', 'کانال', 'نوع', 'آدرس رسانه', 'کپشن', 'دکمه‌ها', 'سنجاق', 'وضعیت', 'لینک پیام', 'منبع',
                 'شناسهٔ مطلب', 'زمان ارسال', 'رویداد تقویم', 'یادداشت'];
var PB_PKG_HEAD = ['شناسه', 'عنوان', 'دسته', 'نامک', 'کلیدواژهٔ ریپلای پیشنهادی', 'وضعیت', 'تاریخ ثبت', 'شناسهٔ صف', 'یادداشت'];
var PB_CH_HEAD = ['نام مستعار', 'chat_id', 'یوزرنیم', 'توضیح'];
var PB_CFG_HEAD = ['کلید', 'مقدار', 'توضیح'];
var PB_TPL_HEAD = ['کلید', 'متن', 'توضیح'];
var PB_START_HEAD = ['کد', 'برچسب'];
var PB_ART_HEAD = ['شناسه', 'عنوان', 'نامک', 'دسته', 'لینک', 'تاریخ انتشار', 'تاریخ ثبت'];
var PB_SEO_HEAD = ['تاریخ', 'شناسه', 'آدرس', 'کلیدواژهٔ اصلی', 'کلیدواژه‌های فرعی', 'تیتر سئو', 'طول تیتر', 'متا', 'طول متا',
                   'پرسش‌های پرتکرار', 'متن جایگزین تصویرها', 'لینک از مقاله‌های قدیمی', 'جست‌وجوی Wikimedia', 'ایرادهای گیت', 'وضعیت', 'مدل'];
var PB_DG_HEAD = ['هفته', 'وضعیت', 'مطلب‌ها', 'گیرنده', 'فرستاده', 'ناموفق', 'ارسال به ازای مطلب', 'تأییدکننده', 'زمان'];
var PB_DGOFF_HEAD = ['chat_id', 'تاریخ'];

var PB_ST = { q: 'در صف', run: 'در حال ارسال', sent: 'فرستاده شد', cancel: 'لغو', late: 'دیر شد · نرفت' };
var PB_PKG_ST = { wait: 'منتظر بسته', q: 'در صف', pub: 'منتشر شد' };
var PB_DG_ST = { prev: 'پیش‌نمایش', ok: 'تأیید شد', run: 'در حال ارسال', sent: 'فرستاده شد', no: 'این هفته نه' };
var PB_TYPE_MAG = 'مجله';
var PB_KEY_PROP = 'CLAUDE_API_KEY';
/* v170.16.1: کلید دوم درگاه (GitHub Secret «BOT_API_KEY»، از «ci: props»)؛ برای گردش کارهای سایت و اسنیپت ابی. کلید اول دست نمی‌خورد */
var PB_KEY2_PROP = 'BOT_API_KEY';
var PB_KEY_FILE = 'تجربه · کلید درگاه API (محرمانه، هم‌رسانی نشود).txt';
var PB_SITE = 'https://tajrobeh.life';
var PB_BTN_NEW = '🚀 انتشار مطلب تازه';
var PB_BTN_DG = '📬 پیام هفتگی';
var PB_BTN_ST = '📈 آمار مطلب';
var PB_BTNS = [PB_BTN_NEW, PB_BTN_DG, PB_BTN_ST];
var PB_HTML_TAGS = ['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'a', 'code', 'pre', 'tg-spoiler', 'blockquote', 'span'];

/* پیش‌فرض‌ها؛ وقتی تب ساخته شود همین‌ها در آن نوشته می‌شود و از آن به بعد شیت برنده است */
var PB_CFG_DEF = [
  ['editor_email', '', 'ایمیل سردبیر برای دعوت تقویم انتشار'],
  ['calendar_id', '', 'تقویم مشترک انتشار؛ خالی بماند تا بات خودش بسازد'],
  ['mag_daily_max', '1', 'حداکثر پست مجله در روز در کانال عمومی'],
  ['next_day_time', '10:00', 'ساعت پست جابه‌جاشده به فردا (تهران)'],
  ['digest_weekday', '4', 'روز پیام هفتگی (۱ دوشنبه ... ۴ پنج‌شنبه ... ۶ شنبه، ۷ یکشنبه)'],
  ['digest_preview_time', '12:00', 'ساعت پیش‌نمایش برای سردبیر'],
  ['digest_time', '20:00', 'ساعت ارسال پیام هفتگی'],
  ['digest_max', '3', 'حداکثر مطلب در پیام هفتگی'],
  ['digest_role_cats', '10,5', 'دسته‌هایی که برای دانشجو و دانش‌آموخته هم می‌رود (۱۰ روانکاوی، ۵ چهره‌ها)'],
  ['cat_topics', '10:ps, 5:ps, 17:art, 18:art, 19:art', 'دستهٔ وردپرس ← موضوع دنبال‌کننده (کلیدهای ps rel mood self kid art ev). دستهٔ بی‌نقشه به همهٔ دنبال‌کننده‌ها می‌رود'],
  ['gem_daily_cap', '40', 'سقف بستهٔ سئوی جمنای در روز'],
  ['traffic_tab', 'سئو · نقشه صفحات', 'تب هاب آمار برای ترتیب ترافیک در gem_seo_batch'],
  ['api_hourly_max', '30', 'سقف فراخوانی درگاه در ساعت'],
  ['err_alert_n', '3', 'خطایی که در ۲۴ ساعت بیش از این تکرار شد، به یاسر خبر داده می‌شود'],
  ['late_hours', '6', 'پست صف که بیش از این ساعت دیر شده باشد نمی‌رود'],
  ['new_post_check_time', '09:00', 'ساعت چک روزانهٔ مطلب تازه (فقط خبر به سردبیر؛ v168.9)']
];

/* متن‌های کوتاه سیستمی (نوشتهٔ Claude با اجازهٔ یاسر) و پیش‌نویس پیام هفتگی (منتظر تأیید یاسر) */
var PB_TPL_DEF = [
  ['digest_head', '📚 <b>تازه‌های مجلهٔ تجربه</b>\nاین هفته این‌ها را منتشر کردیم:', 'پیش‌نویس، منتظر تأیید یاسر'],
  ['digest_line', '• {title}', 'هر مطلب یک خط'],
  ['digest_foot', 'هر مطلب با دکمهٔ زیرش باز می‌شود. اگر نمی‌خواهید این پیام هفتگی را بگیرید، «دیگر نفرست» را بزنید.', 'پیش‌نویس، منتظر تأیید یاسر'],
  ['digest_off_btn', '🔕 دیگر نفرست', 'دکمهٔ آخر پیام هفتگی'],
  ['digest_off_done', 'باشد. دیگر پیام هفتگی مجله برایتان نمی‌آید.', ''],
  ['digest_preview', '📬 <b>پیش‌نمایش پیام هفتگی</b>\nگیرنده: {n} نفر · مطلب: {items}\nاگر درست است «بفرست» را بزنید. ساعت {time} می‌رود.', ''],
  ['digest_approved', 'تأیید شد. پیام هفتگی ساعت {time} فرستاده می‌شود.', ''],
  ['digest_cancelled', 'باشد. این هفته پیام هفتگی نمی‌رود.', ''],
  ['digest_done', '📬 پیام هفتگی رفت: {sent} نفر{fail}.', ''],
  ['digest_empty', 'این هفته مطلب تازه‌ای برای پیام هفتگی نیست.', ''],
  ['editor_new_post', 'مطلب تازه ثبت شد؛ بستهٔ اطلاع‌رسانی ساخته می‌شود.\n<b>{title}</b>\n{link}', 'متن از یاسر'],
  ['editor_new_daily', '📰 مطلب تازه در سایت:\n{list}\nبرای ثبت، «🚀 انتشار مطلب تازه» را بزنید.', 'چک روزانهٔ ساعت ۹ (v168.9)'],
  ['editor_sent', '📣 پست در کانال رفت.\n{title}\n{link}', ''],
  ['editor_moved', 'امروز یک پست مجله در کانال رفته است. این پست به {when} منتقل شد.\n{title}', ''],
  ['editor_late', 'این پست دیر شد و نرفت: {title}\nاگر هنوز لازم است، از «🚀 انتشار مطلب تازه» دوباره بفرستید.', ''],
  ['editor_failed', 'این پست نرفت: {title}\nعلت: {err}', ''],
  ['err_alert', '⚠️ خطای {id} در ۲۴ ساعت {n} بار تکرار شد.\n{where}: {msg}', '']
];

/* ================= لایهٔ جدول (نام سرستون؛ در حالت خشک در حافظه) ================= */
var PB_HEAD_X = {};
function pbSS_(hub) { return hub === 'c' ? tgCSS_() : tgSS_(); }
function pbTab_(hub, tab, head, seed) {
  var ss = pbSS_(hub), sh = ss.getSheetByName(tab);
  if (!sh) {
    sh = ss.insertSheet(tab);
    try { sh.setRightToLeft(true); } catch (e) {}
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f9f2f2');
    sh.setFrozenRows(1);
    if (seed && seed.length) {
      var rows = seed.map(function (r) { var a = r.slice(0, head.length); while (a.length < head.length) a.push(''); return a; });
      sh.getRange(2, 1, rows.length, head.length).setNumberFormat('@').setValues(rows);
    }
    PB_HEAD_X[tab] = head.slice();
    return sh;
  }
  if (!PB_HEAD_X[tab]) {
    var have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(function (h) { return String(h || '').trim(); });
    var miss = head.filter(function (h) { return have.indexOf(h) < 0; });
    if (miss.length) {
      var at = have.filter(String).length ? sh.getLastColumn() + 1 : 1;
      if (sh.getMaxColumns() < at + miss.length - 1) sh.insertColumnsAfter(sh.getMaxColumns(), at + miss.length - 1 - sh.getMaxColumns());
      sh.getRange(1, at, 1, miss.length).setValues([miss]).setFontWeight('bold').setBackground('#f9f2f2');
      have = have.slice(0, at - 1).concat(miss);
    }
    PB_HEAD_X[tab] = have;
  }
  return sh;
}
function pbRows_(hub, tab, head, seed) {
  if (TG_DRY) {
    if (!TG_MEM['pb:' + tab]) TG_MEM['pb:' + tab] = (seed || []).map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = r[j] === undefined ? '' : r[j]; }); return o; });
    TG_MEM['pb:' + tab].forEach(function (o, i) { o._row = i + 2; });
    return TG_MEM['pb:' + tab];
  }
  var sh = pbTab_(hub, tab, head, seed), last = sh.getLastRow(), h = PB_HEAD_X[tab];
  if (last < 2) return [];
  var v = sh.getRange(2, 1, last - 1, h.length).getValues();
  return v.map(function (r, i) { var o = { _row: i + 2 }; h.forEach(function (k, j) { if (k) o[k] = r[j]; }); return o; });
}
function pbCell_(v) { return (typeof v === 'string' && /^[=+@]/.test(v)) ? "'" + v : v; }
function pbAdd_(hub, tab, head, obj) {
  if (TG_DRY) { var a = pbRows_(hub, tab, head); a.push(obj); obj._row = a.length + 1; return obj; }
  var sh = pbTab_(hub, tab, head), h = PB_HEAD_X[tab];
  sh.appendRow(h.map(function (k) { return obj[k] === undefined ? '' : pbCell_(obj[k]); }));
  obj._row = sh.getLastRow();
  return obj;
}
function pbAddMany_(hub, tab, head, objs) {
  if (!objs.length) return;
  if (TG_DRY) { objs.forEach(function (o) { pbAdd_(hub, tab, head, o); }); return; }
  var sh = pbTab_(hub, tab, head), h = PB_HEAD_X[tab], at = sh.getLastRow() + 1;
  sh.getRange(at, 1, objs.length, h.length).setValues(objs.map(function (o) { return h.map(function (k) { return o[k] === undefined ? '' : pbCell_(o[k]); }); }));
}
function pbSet_(hub, tab, head, row, ch) {
  Object.keys(ch).forEach(function (k) { row[k] = ch[k]; });
  if (TG_DRY) return;
  var sh = pbTab_(hub, tab, head), h = PB_HEAD_X[tab];
  Object.keys(ch).forEach(function (k) { var c = h.indexOf(k); if (c > -1) sh.getRange(row._row, c + 1).setValue(pbCell_(ch[k])); });
}

/* ================= تنظیمات از شیت (کش ۱۰ دقیقه) ================= */
function pbCache_(k, fn) {
  if (TG_DRY) return fn();
  var c = CacheService.getScriptCache(), hit = c.get(k);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var v = fn();
  try { c.put(k, JSON.stringify(v), 600); } catch (e) {}
  return v;
}
function pbCacheDrop_(k) { if (!TG_DRY) try { CacheService.getScriptCache().remove(k); } catch (e) {} }
function pbCfg_(k) {
  var m = pbCache_('pbcfg', function () {
    var o = {};
    PB_CFG_DEF.forEach(function (r) { o[r[0]] = r[1]; });
    try { pbRows_('e', PB_T_CFG, PB_CFG_HEAD, PB_CFG_DEF).forEach(function (r) { var key = String(r['کلید'] || '').trim(); if (key) o[key] = r['مقدار'] instanceof Date ? Utilities.formatDate(r['مقدار'], TG_TZ, 'HH:mm') : String(r['مقدار'] == null ? '' : r['مقدار']).trim(); }); } catch (e) {}
    return o;
  });
  return m[k] === undefined ? '' : m[k];
}
function pbCfgN_(k, d) { var n = Number(tgDigits_(pbCfg_(k))); return isFinite(n) && String(pbCfg_(k)).trim() !== '' ? n : d; }
function pbCfgSet_(k, v) {
  var rows = pbRows_('e', PB_T_CFG, PB_CFG_HEAD, PB_CFG_DEF), hit = null;
  rows.forEach(function (r) { if (String(r['کلید']).trim() === k) hit = r; });
  if (hit) pbSet_('e', PB_T_CFG, PB_CFG_HEAD, hit, { 'مقدار': v });
  else pbAdd_('e', PB_T_CFG, PB_CFG_HEAD, { 'کلید': k, 'مقدار': v, 'توضیح': '' });
  pbCacheDrop_('pbcfg');
}
function pbTpl_(k, vars) {
  var m = pbCache_('pbtpl', function () {
    var o = {};
    PB_TPL_DEF.forEach(function (r) { o[r[0]] = r[1]; });
    try { pbRows_('e', PB_T_TPL, PB_TPL_HEAD, PB_TPL_DEF).forEach(function (r) { var key = String(r['کلید'] || '').trim(); if (key && String(r['متن'] || '').trim()) o[key] = String(r['متن']); }); } catch (e) {}
    return o;
  });
  var s = m[k] || '';
  Object.keys(vars || {}).forEach(function (v) { s = s.split('{' + v + '}').join(String(vars[v] == null ? '' : vars[v])); });
  return s;
}
/* نام مستعار ← {chat, user}. فقط نام مستعار پذیرفته می‌شود، نه عدد */
function pbChannelSeed_() {
  var ther = '';
  try { ther = String(PropertiesService.getScriptProperties().getProperty('TG_CHANNEL') || '').trim(); } catch (e) {}
  return [['public', SO_CHANNEL, SO_CHANNEL_USER, 'کانال عمومی'], ['therapists', ther, '', 'کانال درمانگران'], ['group', '', '', 'گروه تجربه زندگی (فقط اگر لازم شد)']];
}
function pbChannels_() {
  return pbCache_('pbch', function () {
    var o = {};
    pbRows_('e', PB_T_CH, PB_CH_HEAD, pbChannelSeed_()).forEach(function (r) {
      var a = String(r['نام مستعار'] || '').trim().toLowerCase();
      var id = typeof r['chat_id'] === 'number' ? String(r['chat_id']) : String(r['chat_id'] || '').trim();
      if (a && id) o[a] = { chat: id, user: String(r['یوزرنیم'] || '').trim().replace(/^@/, '') };
    });
    return o;
  });
}
function pbChannel_(alias) {
  var a = String(alias || '').trim().toLowerCase();
  if (!a || /^-?\d+$/.test(a) || a.charAt(0) === '@') return null;
  try { return pbChannels_()[a] || null; } catch (e) { return null; }
}
/* «عنوان مقاله‌ها» (هاب محتوا) جای TG_ART_TITLES در کد */
function pbArtMap_() {
  return pbCache_('pbart', function () {
    var o = {};
    pbRows_('c', PB_T_ART, PB_ART_HEAD).forEach(function (r) {
      var id = String(r['شناسه'] || '').trim();
      if (id) o[id] = { t: String(r['عنوان'] || '').trim(), s: String(r['نامک'] || '').trim(), c: String(r['دسته'] || '').trim(), u: String(r['لینک'] || '').trim(), d: r['تاریخ انتشار'] instanceof Date ? r['تاریخ انتشار'].getTime() : String(r['تاریخ انتشار'] || '') };
    });
    return o;
  });
}
function pbArtTitle_(id) {
  try { var x = pbArtMap_()[String(id)]; if (x && x.t) return x.t; } catch (e) {}
  return '';
}
function pbStartLabel_(code) {
  try {
    var m = pbCache_('pbstart', function () {
      var o = {};
      pbRows_('e', PB_T_START, PB_START_HEAD, Object.keys(TG_START_MAP).map(function (k) { return [k, TG_START_MAP[k]]; }))
        .forEach(function (r) { var k = String(r['کد'] || '').trim(); if (k && String(r['برچسب'] || '').trim()) o[k] = String(r['برچسب']).trim(); });
      return o;
    });
    return m[code] || '';
  } catch (e) { return ''; }
}

/* ================= زمان (تهران ثابت UTC+3:30) ================= */
function pbTehran_(y, mo, d, h, mi) { return new Date(Date.UTC(y, mo - 1, d, h || 0, mi || 0) - 210 * 60000); }
function pbParts_(dt) {
  var s = Utilities.formatDate(dt, TG_TZ, 'yyyy-MM-dd-HH-mm-u').split('-').map(Number);
  return { y: s[0], m: s[1], d: s[2], h: s[3], mi: s[4], wd: s[5] };
}
function pbHm_(v, dflt) { var m = tgDigits_(v).match(/(\d{1,2})\D+(\d{1,2})/); return m ? [Number(m[1]), Number(m[2])] : dflt; }
/* «2026-10-05 10:00» یا «۱۴۰۵/۷/۱۳ ۱۰:۰۰» (تهران) یا ISO با منطقهٔ زمانی ← Date */
function pbWhen_(v) {
  if (v instanceof Date) {
    if (isNaN(v)) return null;
    if (v.getFullYear() >= 1700) return v;
    v = Utilities.formatDate(v, TG_TZ, 'yyyy-MM-dd HH:mm');   /* «۱۴۰۵/۷/۱۳ ۱۰:۰۰» که شیت تاریخ میلادی سال ۱۴۰۵ کرده */
  }
  var s = tgDigits_(String(v == null ? '' : v)).trim();
  if (!s) return null;
  if (/T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) { var iso = new Date(s); return isNaN(iso) ? null : iso; }
  var m = s.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})(?:\D+(\d{1,2})\D(\d{1,2}))?$/);
  if (!m) return null;
  var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]), h = Number(m[4] || 10), mi = Number(m[5] || 0);
  if (y < 1700) { var g = tgJ2G_(y, mo, d); y = g.getFullYear(); mo = g.getMonth() + 1; d = g.getDate(); }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return pbTehran_(y, mo, d, h, mi);
}
/* خانه‌ای که شیت تاریخش کرده یا متن yyyy-MM-dd ← کلید روز */
function pbDayKey_(v) { return v instanceof Date ? pbDay_(v) : String(v == null ? '' : v).trim().slice(0, 10); }
function pbFmt_(dt) { return Utilities.formatDate(dt, TG_TZ, 'yyyy-MM-dd HH:mm'); }
function pbDay_(dt) { return Utilities.formatDate(dt, TG_TZ, 'yyyy-MM-dd'); }
function pbFaWhen_(dt) { var j = tgJalali_(dt, TG_TZ); return tgFa_(j.d) + ' ' + TG_JMONTHS[j.m - 1] + ' ساعت ' + tgFa_(Utilities.formatDate(dt, TG_TZ, 'HH:mm')); }
function pbNow_() { return TG_DRY && TG_MEM['pb:now'] ? new Date(TG_MEM['pb:now']) : new Date(); }

/* ================= ابزار ================= */
function pbProps_() { return PropertiesService.getScriptProperties(); }
function pbProp_(k, v) {
  if (TG_DRY) { if (v === undefined) return TG_MEM['pbp:' + k] === undefined ? null : TG_MEM['pbp:' + k]; if (v === null) delete TG_MEM['pbp:' + k]; else TG_MEM['pbp:' + k] = String(v); return v; }
  if (v === undefined) return pbProps_().getProperty(k);
  if (v === null) pbProps_().deleteProperty(k); else pbProps_().setProperty(k, String(v));
  return v;
}
function pbSha_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function pbVisLen_(html) { return tgPlain_(html).length; }
/* فقط برچسب‌هایی که تلگرام می‌پذیرد، و هر برچسب بسته شده باشد */
function pbHtmlOk_(html) {
  var st = [], re = /<\/?([a-zA-Z-]+)[^>]*>/g, m;
  while ((m = re.exec(String(html || '')))) {
    var tag = m[1].toLowerCase();
    if (PB_HTML_TAGS.indexOf(tag) < 0) return 'برچسب ناپذیرفتنی: ' + tag;
    if (m[0].charAt(1) === '/') { if (st.pop() !== tag) return 'برچسب بسته نشده: ' + tag; }
    else st.push(tag);
  }
  return st.length ? 'برچسب بسته نشده: ' + st[st.length - 1] : '';
}
function pbUrlOk_(u) { return /^https:\/\/[^\s<>"]+$/.test(String(u || '')); }
/* دکمه‌ها: JSON ([[{text,url}]] یا [{text,url}]) یا خط‌های «متن|لینک» */
function pbButtons_(v) {
  if (v === undefined || v === null || v === '') return { kb: null };
  var rows = v;
  if (typeof v === 'string') {
    var s = v.trim();
    if (s.charAt(0) === '[') { try { rows = JSON.parse(s); } catch (e) { return { err: 'دکمه‌ها JSON درست نیست' }; } }
    else rows = s.split('\n').filter(function (l) { return l.indexOf('|') > 0; }).map(function (l) { var p = l.split('|'); return [{ text: p[0].trim(), url: p.slice(1).join('|').trim() }]; });
  }
  if (!Array.isArray(rows)) return { err: 'دکمه‌ها باید فهرست باشد' };
  rows = rows.map(function (r) { return Array.isArray(r) ? r : [r]; });
  for (var i = 0; i < rows.length; i++) for (var j = 0; j < rows[i].length; j++) {
    var b = rows[i][j] || {};
    if (!String(b.text || '').trim() || !pbUrlOk_(b.url)) return { err: 'دکمهٔ ' + (i + 1) + ' متن یا لینک https درست ندارد' };
    rows[i][j] = { text: String(b.text).trim().slice(0, 64), url: String(b.url).trim() };
  }
  return rows.length ? { kb: { inline_keyboard: rows } } : { kb: null };
}
function pbMsgLink_(ch, mid) {
  if (!mid) return '';
  if (ch && ch.user) return 'https://t.me/' + ch.user + '/' + mid;
  var c = String(ch && ch.chat || '');
  return c.indexOf('-100') === 0 ? 'https://t.me/c/' + c.slice(4) + '/' + mid : '';
}
/* تماس با تلگرام (multipart برای بلاب). در حالت خشک فقط در TG_OUTBOX ثبت می‌شود */
function pbTg_(method, payload) {
  if (TG_DRY) {
    TG_MEM['pb:mid'] = (TG_MEM['pb:mid'] || 900) + 1;
    TG_OUTBOX.push({ kind: 'pb', method: method, chat: String(payload.chat_id || ''), text: String(payload.caption || payload.text || ''), media: payload._media || '' });
    if (TG_MEM['pb:tgfail']) return { ok: false, description: TG_MEM['pb:tgfail'] };
    return { ok: true, result: { message_id: TG_MEM['pb:mid'] } };
  }
  delete payload._media;
  return soPost_(method, payload);
}
function pbBlob_(u) { return TG_DRY ? u : soBlob_(u); }
function pbEditors_() { try { return tgMagEditors_(); } catch (e) { return []; } }
function pbNotifyEditors_(text, kb) { try { tgMagNotifyEditors_(text, kb); } catch (e) { tgErr_('pbNotifyEditors_', e); } }
function pbIsEditor_(chat) {
  if (String(chat) === String(TG_OWNER_CHAT)) return true;
  try { return tgMagIsEditor_(chat); } catch (e) { return false; }
}

/* ================= ۱) درگاه API ================= */
/* کلید: یک بار با pbSetup ساخته می‌شود؛ در Script Properties و در یک فایل خصوصی درایو صاحب اسکریپت. هیچ‌جا چاپ نمی‌شود. */
function pbKeyNew_() { return 'tjk_' + pbSha_(Utilities.getUuid() + Utilities.getUuid() + Date.now()).slice(0, 48); }
function pbKeyOk_(given) {
  var k = TG_DRY ? TG_MEM['pb:key'] : pbProps_().getProperty(PB_KEY_PROP);
  var k2 = TG_DRY ? TG_MEM['pb:key2'] : pbProps_().getProperty(PB_KEY2_PROP);
  given = String(given || '');
  if (given.length < 20) return false;
  var a = pbSha_(given), ok = false;
  [k, k2].forEach(function (x) {
    if (!x) return;
    var b = pbSha_(x), d = 0;
    for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    if (d === 0) ok = true;
  });
  return ok;
}
function pbKeyFile_(key) {
  var url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) {}
  var body = 'CLAUDE_API_KEY=' + key + '\nWEBAPP=' + url + '\n\nاین فایل را با کسی هم‌رسانی نکنید. راهنما: docs/publish-api.md در مخزن.\nساخته شد: ' + pbFmt_(new Date()) + ' (تهران)\n';
  var it = DriveApp.getFilesByName(PB_KEY_FILE);
  if (it.hasNext()) { var f = it.next(); f.setContent(body); return f.getId(); }
  return DriveApp.createFile(PB_KEY_FILE, body).getId();
}
function pbKeyMake_() {
  var key = pbKeyNew_();
  pbProps_().setProperty(PB_KEY_PROP, key);
  var fid = pbKeyFile_(key);
  return { hash: pbSha_(key).slice(0, 8), file: fid };
}
/* سقف فراخوانی در ساعت (کش؛ هم برای کلید درست و هم نادرست جدا) */
function pbRate_(bucket, max) {
  var k = 'pbrl:' + bucket + ':' + Utilities.formatDate(pbNow_(), 'UTC', 'yyyyMMddHH');
  if (TG_DRY) { TG_MEM[k] = (TG_MEM[k] || 0) + 1; return TG_MEM[k] <= max; }
  var c = CacheService.getScriptCache(), n = Number(c.get(k) || 0) + 1;
  c.put(k, String(n), 3700);
  return n <= max;
}
function pbSummary_(b) {
  var o = {};
  Object.keys(b || {}).forEach(function (k) {
    if (k === 'key' || k === 'api') return;
    var v = b[k];
    if (typeof v === 'string') v = v.length > 80 ? v.slice(0, 80) + '…' : v;
    else if (v && typeof v === 'object') v = JSON.stringify(v).slice(0, 80);
    o[k] = v;
  });
  return tgSecretMask_(JSON.stringify(o)).slice(0, 400);
}
function pbLog_(action, body, result, link) {
  try {
    pbAdd_('e', PB_T_LOG, PB_LOG_HEAD, { 'زمان': TG_DRY ? pbFmt_(pbNow_()) : new Date(), 'اکشن': String(action || '').slice(0, 40),
      'خلاصهٔ ورودی': pbSummary_(body), 'نتیجه': tgSecretMask_(String(result || '')).slice(0, 300), 'لینک پیام': link || '' });
  } catch (e) { try { console.error('pbLog_ ' + e); } catch (x) {} }
}
function pbJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

var PB_ACTIONS = {
  status: function (p) { return pbStatus_(p); },
  channel_post: function (p, dry) { return pbChannelPost_(p, dry, 'api'); },
  channel_edit: function (p, dry) { return pbChannelEdit_(p, dry); },
  queue_list: function (p) { return pbQueueList_(p); },
  queue_cancel: function (p, dry) { return pbQueueCancel_(p, dry); },
  mag_register: function (p, dry) { return pbMagRegister_(p.post_id, dry); },
  digest_preview: function (p) { return pbDigestPreview_(false, true); },
  digest_send: function (p, dry) { return pbDigestApprove_(dry, p.now === true || p.now === 'true', 'درگاه API'); },
  notify_editor: function (p, dry) { return pbNotifyEditorApi_(p, dry); },
  send: function (p, dry) { return pbSendApi_(p, dry); },
  calendar_add: function (p, dry) { return pbCalendarAdd_(p, dry); },
  gem_seo: function (p, dry) { return pbGemSeo_(p.post_id, dry); },
  gem_seo_batch: function (p, dry) { return pbGemSeoBatch_(p.n, dry); },
  stats_post: function (p) { return pbStatsPost_(p.post_id); },
  key_rotate: function (p, dry) { return dry ? { ok: true, data: { would: 'کلید تازه ساخته و در همان فایل درایو نوشته می‌شود' } } : { ok: true, data: pbKeyMake_() }; }
};
/* v170.15: اکشنی که سقف ساعتی جدا دارد: [سطل، کلید تنظیم، پیش‌فرض]. بقیه همان سقف «api_hourly_max» */
var PB_RATE_BUCKET = {};
var PB_WRITE = ['channel_post', 'channel_edit', 'queue_cancel', 'mag_register', 'digest_send', 'notify_editor', 'send', 'calendar_add', 'gem_seo', 'gem_seo_batch', 'key_rotate'];

/* body: {api: 1, key, action, dry_run?, ...پارامترها}. پاسخ همیشه {ok, data, error} */
function tgApiGateway_(body) {
  return pbJson_(pbGateway_(body || {}));
}
function pbGateway_(b) {
  var action = String(b.action || '').trim(), out;
  try {
    if (!pbKeyOk_(b.key)) {
      if (pbRate_('bad', 30)) pbLog_(action, b, 'رد شد: کلید نادرست', '');
      return { ok: false, data: null, error: 'unauthorized' };
    }
    var rb = PB_RATE_BUCKET[action] || ['ok', 'api_hourly_max', 30];
    if (!pbRate_(rb[0], pbCfgN_(rb[1], rb[2]))) { pbLog_(action, b, 'رد شد: سقف فراخوانی در ساعت', ''); return { ok: false, data: null, error: 'rate_limited' }; }
    var fn = PB_ACTIONS[action];
    if (!fn) { pbLog_(action, b, 'اکشن ناشناخته', ''); return { ok: false, data: null, error: 'unknown_action' }; }
    var dryv = b.dry_run !== undefined ? b.dry_run : b.dry;   /* v170.1: «dry» هم پذیرفته می‌شود */
    var dry = dryv === true || dryv === 'true' || dryv === 1 || dryv === '1';
    var r = fn(b, dry) || {};
    out = { ok: r.ok !== false, data: r.data === undefined ? null : r.data, error: r.error || null };
    if (dry && PB_WRITE.indexOf(action) > -1 && out.data && typeof out.data === 'object') out.data.dry_run = true;
    pbLog_(action, b, (dry ? '[آزمایشی] ' : '') + (out.ok ? 'ok' : 'خطا: ' + out.error), (out.data && out.data.link) || '');
  } catch (e) {
    var msg = tgSecretMask_(String(e && e.message || e)).slice(0, 200);
    tgErr_('tgApiGateway_ ' + action, msg);
    pbLog_(action, b, 'خطای داخلی: ' + msg, '');
    out = { ok: false, data: null, error: 'internal: ' + msg };
  }
  return out;
}

/* ---------- status (فقط خواندنی) ---------- */
function pbStatus_() {
  var errs = [];
  try {
    if (TG_DRY) errs = (TG_MEM['errs'] || []).slice(-5).map(function (e) { return { where: e.where, msg: String(e.msg).slice(0, 160) }; });
    else {
      var sh = tgErrSheet_(), last = sh ? sh.getLastRow() : 0;
      if (last >= 2) {
        var n = Math.min(5, last - 1);
        errs = sh.getRange(last - n + 1, 1, n, 7).getValues().reverse().map(function (r) {
          return { id: String(r[0]), at: r[1] instanceof Date ? pbFmt_(r[1]) : String(r[1]), where: tgSecretMask_(r[2]), msg: tgSecretMask_(r[4]).slice(0, 160), n: Number(r[5] || 1), status: String(r[6] || '') };
        });
      }
    }
  } catch (e) { errs = [{ msg: 'خواندن «خطاها» نشد' }]; }
  var q = pbRows_('e', PB_T_Q, PB_Q_HEAD).filter(function (r) { return String(r['وضعیت']).trim() === PB_ST.q; });
  var next = q.map(function (r) { return pbWhen_(r['زمان']); }).filter(Boolean).sort(function (a, b) { return a - b; })[0];
  var day = pbDay_(pbNow_());
  var webapp = '';
  try { if (!TG_DRY) webapp = ScriptApp.getService().getUrl(); } catch (e) {}
  return { ok: true, data: {
    version: typeof TG_CODE_VERSION === 'string' ? TG_CODE_VERSION : '',
    errors: errs,
    queue: { pending: q.length, next: next ? pbFmt_(next) : null },
    gemini: { used_today: Number(pbProp_('PB_GEM:' + day) || 0), cap: pbCfgN_('gem_daily_cap', 40), last_error: pbProp_('PB_GEM_ERR') || null,
      ebi_today: Number(pbProp_('EBI_GEM:' + day) || 0), ebi_cap: pbCfgN_('ebi_daily_cap', 300), ebi_tokens: (function () { try { return JSON.parse(pbProp_('EBI_TOK:' + day) || '{}'); } catch (e) { return {}; } })() },
    webapp: webapp
  } };
}

/* ================= ۲) صف انتشار ================= */
function pbQRows_() { return pbRows_('e', PB_T_Q, PB_Q_HEAD); }
function pbQById_(id) { var s = String(id || '').trim(); return pbQRows_().filter(function (r) { return String(r['شناسه']).trim() === s; })[0] || null; }
function pbQNextId_(rows) {
  var max = 0;
  rows.forEach(function (r) { var m = String(r['شناسه'] || '').match(/(\d+)/); if (m) max = Math.max(max, Number(m[1])); });
  return 'Q-' + (max + 1);
}
function pbIsMagPublic_(r) {
  return String(r['کانال']).trim().toLowerCase() === 'public' && (String(r['نوع'] || PB_TYPE_MAG).trim() || PB_TYPE_MAG) === PB_TYPE_MAG;
}
/* روزهایی که در کانال عمومی پست مجله دارند (فرستاده یا در صف)، به‌جز خود سطر */
function pbMagDays_(rows, self) {
  var o = {};
  rows.forEach(function (r) {
    if (r === self || !pbIsMagPublic_(r)) return;
    var st = String(r['وضعیت']).trim(), t = null;
    if (st === PB_ST.sent) t = pbWhen_(r['زمان ارسال']) || pbWhen_(r['زمان']);
    else if (st === PB_ST.q || st === PB_ST.run) t = pbWhen_(r['زمان']);
    if (t) { var d = pbDay_(t); o[d] = (o[d] || 0) + 1; }
  });
  return o;
}
/* قاعدهٔ روزی یک پست مجله: اگر روز پر بود، اولین روز خالی بعدی ساعت next_day_time */
function pbFitDay_(when, rows, self) {
  if (!self || !pbIsMagPublic_(self)) return { when: when, moved: false };
  var max = pbCfgN_('mag_daily_max', 1), days = pbMagDays_(rows, self), t = when, moved = false;
  var hm = pbHm_(pbCfg_('next_day_time'), [10, 0]);
  for (var i = 0; i < 30 && (days[pbDay_(t)] || 0) >= max; i++) {
    var p = pbParts_(new Date(t.getTime() + 86400000));
    t = pbTehran_(p.y, p.m, p.d, hm[0], hm[1]);
    moved = true;
  }
  return { when: t, moved: moved };
}
function pbValidatePost_(p) {
  var errs = [];
  var ch = pbChannel_(p.chat);
  if (!ch) errs.push('chat باید نام مستعار یکی از سطرهای تب «' + PB_T_CH + '» باشد (مثل public)');
  var media = String(p.animation_url || p.photo_url || '').trim();
  if (media && !pbUrlOk_(media)) errs.push('آدرس رسانه باید https باشد');
  var cap = String(p.caption_html || '');
  if (!cap.trim()) errs.push('caption_html خالی است');
  var h = pbHtmlOk_(cap); if (h) errs.push(h);
  if (/[—–]/.test(tgPlain_(cap))) errs.push('خط تیرهٔ وسط جمله در کپشن');
  if (media && pbVisLen_(cap) > 1024) errs.push('کپشن با رسانه بیش از ۱۰۲۴ نویسه است');
  if (!media && pbVisLen_(cap) > 4096) errs.push('متن بیش از ۴۰۹۶ نویسه است');
  var bt = pbButtons_(p.buttons); if (bt.err) errs.push(bt.err);
  var when = null;
  if (p.send_at !== undefined && p.send_at !== null && String(p.send_at).trim() !== '') { when = pbWhen_(p.send_at); if (!when) errs.push('send_at خوانده نشد (yyyy-MM-dd HH:mm به وقت تهران)'); }
  return { errs: errs, ch: ch, media: media, kind: p.animation_url ? 'animation' : (p.photo_url ? 'photo' : 'text'), kb: bt.kb, when: when };
}
/* channel_post: بدون send_at همان لحظه، با آن در صف. src: api یا دکمه */
function pbChannelPost_(p, dry, src) {
  var v = pbValidatePost_(p);
  if (v.errs.length) return { ok: false, error: v.errs.join(' · ') };
  var now = pbNow_(), rows = pbQRows_();
  var row = { 'شناسه': pbQNextId_(rows), 'زمان': pbFmt_(v.when || now), 'کانال': String(p.chat).trim().toLowerCase(),
    'نوع': String(p.type || PB_TYPE_MAG).trim(), 'آدرس رسانه': (v.kind === 'animation' ? 'gif:' : '') + v.media,
    'کپشن': String(p.caption_html), 'دکمه‌ها': v.kb ? JSON.stringify(v.kb.inline_keyboard) : '', 'سنجاق': p.pin ? 'بله' : '',
    'وضعیت': PB_ST.q, 'منبع': src || 'api', 'شناسهٔ مطلب': p.post_id ? String(p.post_id) : '', 'یادداشت': '' };
  var fit = pbFitDay_(v.when || now, rows, row);
  if (fit.moved) { row['زمان'] = pbFmt_(fit.when); row['یادداشت'] = 'قاعدهٔ روزی یک پست مجله: به ' + pbFmt_(fit.when) + ' رفت'; }
  var immediate = !fit.moved && fit.when.getTime() <= now.getTime() + 60000;
  if (dry) return { ok: true, data: { would: immediate ? 'send_now' : 'queue', id: row['شناسه'], when: row['زمان'], moved: fit.moved, channel: row['کانال'], kind: v.kind, caption_chars: pbVisLen_(row['کپشن']) } };
  if (immediate) row['وضعیت'] = PB_ST.run;   /* تیک هم‌زمان برش ندارد */
  pbAdd_('e', PB_T_Q, PB_Q_HEAD, row);
  if (!immediate) pbNextAt_(fit.when);
  if (fit.moved) { tgErr_('pbChannelPost_', 'پست مجلهٔ دوم در یک روز؛ به ' + row['زمان'] + ' منتقل شد', row['شناسه']); pbNotifyEditors_(pbTpl_('editor_moved', { when: pbFaWhen_(fit.when), title: tgEsc_(pbQTitle_(row)) })); }
  if (row['شناسهٔ مطلب']) pbPkgMark_(row['شناسهٔ مطلب'], PB_PKG_ST.q, row['شناسه']);
  try { pbCalFor_(row); } catch (e) { tgErr_('pbCalFor_', e, row['شناسه']); }
  if (!immediate) return { ok: true, data: { queued: row['شناسه'], when: row['زمان'], moved: fit.moved } };
  var r = pbSendRow_(row, rows);
  return r.ok ? { ok: true, data: { id: row['شناسه'], message_id: r.mid, link: r.link } } : { ok: false, error: r.err, data: { id: row['شناسه'] } };
}
function pbQTitle_(r) {
  var id = String(r['شناسهٔ مطلب'] || '').trim();
  return (id && pbArtTitle_(id)) || tgPlain_(String(r['کپشن'] || '')).split('\n')[0].slice(0, 70);
}
/* یک سطر صف را می‌فرستد. اول «در حال ارسال» تا دو بار نرود */
function pbSendRow_(r, rows) {
  var ch = pbChannel_(r['کانال']);
  if (!ch) { pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'وضعیت': 'خطا: کانال «' + r['کانال'] + '» در تب کانال‌ها نیست' }); return { ok: false, err: 'channel' }; }
  var fit = pbFitDay_(pbNow_(), rows || pbQRows_(), r);
  if (fit.moved) {
    pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'زمان': pbFmt_(fit.when), 'یادداشت': 'قاعدهٔ روزی یک پست مجله: به ' + pbFmt_(fit.when) + ' رفت' });
    tgErr_('pbSendRow_', 'پست مجلهٔ دوم در یک روز؛ به ' + pbFmt_(fit.when) + ' منتقل شد', r['شناسه']);
    pbNotifyEditors_(pbTpl_('editor_moved', { when: pbFaWhen_(fit.when), title: tgEsc_(pbQTitle_(r)) }));
    pbNextAt_(fit.when);
    return { ok: false, err: 'moved', moved: pbFmt_(fit.when) };
  }
  pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'وضعیت': PB_ST.run });
  if (!TG_DRY) SpreadsheetApp.flush();
  var media = String(r['آدرس رسانه'] || '').trim(), cap = String(r['کپشن'] || ''), kb = pbButtons_(r['دکمه‌ها']).kb, j;
  try {
    var pay = { chat_id: ch.chat, parse_mode: 'HTML' };
    if (kb) pay.reply_markup = JSON.stringify(kb);
    if (!media) { pay.text = cap; pay.disable_web_page_preview = 'true'; j = pbTg_('sendMessage', pay); }
    else if (/^gif:|\.(gif|mp4)(\?|$)/i.test(media)) { var u = media.replace(/^gif:/, ''); pay.animation = pbBlob_(u); pay.caption = cap; pay._media = u; j = pbTg_('sendAnimation', pay); }
    else { pay.photo = pbBlob_(media); pay.caption = cap; pay._media = media; j = pbTg_('sendPhoto', pay); }
  } catch (e) { j = { ok: false, description: String(e && e.message || e) }; }
  if (!j || !j.ok) {
    var err = tgSecretMask_(String((j && j.description) || 'بی‌پاسخ')).slice(0, 200);
    pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'وضعیت': 'خطا: ' + err });
    tgErr_('pbSendRow_', err, r['شناسه']);
    pbNotifyEditors_(pbTpl_('editor_failed', { title: tgEsc_(pbQTitle_(r)), err: tgEsc_(err) }));
    return { ok: false, err: err };
  }
  var mid = j.result && j.result.message_id, link = pbMsgLink_(ch, mid);
  if (String(r['سنجاق']).trim() === 'بله' && mid) pbTg_('pinChatMessage', { chat_id: ch.chat, message_id: String(mid), disable_notification: 'true' });
  pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'وضعیت': PB_ST.sent, 'لینک پیام': link || String(mid), 'زمان ارسال': pbFmt_(pbNow_()) });
  if (r['شناسهٔ مطلب']) pbPkgMark_(r['شناسهٔ مطلب'], PB_PKG_ST.pub, r['شناسه']);
  pbNotifyEditors_(pbTpl_('editor_sent', { title: tgEsc_(pbQTitle_(r)), link: link }));
  try { pbCalDone_(r); } catch (e) {}
  return { ok: true, mid: mid, link: link };
}
/* زودترین «در صف» بعدی؛ تیک تا آن وقت شیت را باز نمی‌کند (جز هر ۱۵ دقیقه برای سطر دستی) */
function pbNextAt_(t) {
  var cur = Number(pbProp_('PB_NEXT') || 0);
  if (!cur || t.getTime() < cur) pbProp_('PB_NEXT', String(t.getTime()));
}
function pbQueueRun_(now, force) {
  var next = Number(pbProp_('PB_NEXT') || 0), scan = Number(pbProp_('PB_SCAN') || 0);
  if (!force && !(next && next <= now.getTime()) && now.getTime() - scan < 15 * 60000) return 0;
  pbProp_('PB_SCAN', String(now.getTime()));
  var rows = pbQRows_(), n = 0, soon = 0, lateH = pbCfgN_('late_hours', 6);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (String(r['وضعیت']).trim() !== PB_ST.q) continue;
    var t = pbWhen_(r['زمان']);
    if (!t) { pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'وضعیت': 'خطا: زمان خوانده نشد' }); continue; }
    if (t.getTime() > now.getTime()) { if (!soon || t.getTime() < soon) soon = t.getTime(); if (!r['رویداد تقویم']) { try { pbCalFor_(r); } catch (e) {} } continue; }
    if (now.getTime() - t.getTime() > lateH * 3600000) {
      pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'وضعیت': PB_ST.late });
      pbNotifyEditors_(pbTpl_('editor_late', { title: tgEsc_(pbQTitle_(r)) }));
      continue;
    }
    if (!r['منبع']) pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'منبع': 'شیت' });
    var res = pbSendRow_(r, rows);
    if (res.ok) n++;
    else if (res.moved) { var mt = pbWhen_(res.moved); if (mt && (!soon || mt.getTime() < soon)) soon = mt.getTime(); }
    if (n >= 4) break;
  }
  pbProp_('PB_NEXT', soon ? String(soon) : null);
  return n;
}
function pbQueueList_(p) {
  var all = String((p && p.all) || '') === 'true' || (p && p.all === true);
  var rows = pbQRows_().filter(function (r) { return all || String(r['وضعیت']).trim() === PB_ST.q; }).slice(-30);
  return { ok: true, data: { items: rows.map(function (r) {
    return { id: r['شناسه'], when: r['زمان'] instanceof Date ? pbFmt_(r['زمان']) : String(r['زمان']), channel: r['کانال'], type: r['نوع'], status: r['وضعیت'],
             post_id: String(r['شناسهٔ مطلب'] || ''), link: String(r['لینک پیام'] || ''), source: r['منبع'], caption: tgPlain_(String(r['کپشن'] || '')).slice(0, 120) };
  }) } };
}
function pbQueueCancel_(p, dry) {
  var r = pbQById_(p.id);
  if (!r) return { ok: false, error: 'سطری با این شناسه نیست' };
  if (String(r['وضعیت']).trim() !== PB_ST.q) return { ok: false, error: 'فقط سطر «در صف» لغو می‌شود؛ این سطر: ' + r['وضعیت'] };
  if (dry) return { ok: true, data: { would: 'cancel', id: r['شناسه'] } };
  pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'وضعیت': PB_ST.cancel });
  try { pbCalDone_(r, '✖️ لغو'); } catch (e) {}
  return { ok: true, data: { id: r['شناسه'], status: PB_ST.cancel } };
}
/* channel_edit: رسانهٔ تازه (editMessageMedia) یا کپشن/متن تازه، و دکمه‌ها */
function pbChannelEdit_(p, dry) {
  var ch = pbChannel_(p.chat), mid = String(p.message_id || '').trim(), errs = [];
  if (!ch) errs.push('chat باید نام مستعار باشد');
  if (!/^\d+$/.test(mid)) errs.push('message_id عدد نیست');
  var media = String(p.animation_url || p.photo_url || '').trim();
  if (media && !pbUrlOk_(media)) errs.push('آدرس رسانه باید https باشد');
  var cap = p.caption_html === undefined ? null : String(p.caption_html);
  if (cap !== null) { var h = pbHtmlOk_(cap); if (h) errs.push(h); if (/[—–]/.test(tgPlain_(cap))) errs.push('خط تیرهٔ وسط جمله'); }
  var bt = pbButtons_(p.buttons); if (bt.err) errs.push(bt.err);
  if (!media && cap === null && !bt.kb) errs.push('چیزی برای ویرایش نیست');
  if (errs.length) return { ok: false, error: errs.join(' · ') };
  if (dry) return { ok: true, data: { would: media ? 'editMessageMedia' : (cap !== null ? 'editMessageCaption' : 'editMessageReplyMarkup'), link: pbMsgLink_(ch, mid) } };
  var j, pay = { chat_id: ch.chat, message_id: mid };
  if (bt.kb) pay.reply_markup = JSON.stringify(bt.kb);
  if (media) {
    var anim = !!p.animation_url || /\.(gif|mp4)(\?|$)/i.test(media);
    var m = { type: anim ? 'animation' : 'photo', media: 'attach://m' };
    if (cap !== null) { m.caption = cap; m.parse_mode = 'HTML'; }
    pay.media = JSON.stringify(m); pay.m = pbBlob_(media); pay._media = media;
    j = pbTg_('editMessageMedia', pay);
  } else if (cap !== null) {
    pay.caption = cap; pay.parse_mode = 'HTML';
    j = pbTg_('editMessageCaption', pay);
    if (j && !j.ok && /no caption|message can't be edited|there is no/i.test(String(j.description))) {
      delete pay.caption; pay.text = cap; pay.disable_web_page_preview = 'true';
      j = pbTg_('editMessageText', pay);
    }
  } else j = pbTg_('editMessageReplyMarkup', pay);
  if (!j || !j.ok) return { ok: false, error: tgSecretMask_(String((j && j.description) || 'بی‌پاسخ')).slice(0, 200) };
  return { ok: true, data: { link: pbMsgLink_(ch, mid) } };
}

/* ---------- تقویم انتشار ---------- */
function pbCal_() {
  if (TG_DRY) return null;
  var id = pbCfg_('calendar_id'), cal = null;
  if (id) { try { cal = CalendarApp.getCalendarById(id); } catch (e) {} }
  if (!cal) {
    cal = CalendarApp.createCalendar('انتشار تجربه', { timeZone: TG_TZ });
    pbCfgSet_('calendar_id', cal.getId());
  }
  return cal;
}
function pbCalFor_(r) {
  if (r['رویداد تقویم']) return r['رویداد تقویم'];
  var t = pbWhen_(r['زمان']); if (!t) return '';
  var title = '📣 ' + (r['نوع'] || PB_TYPE_MAG) + ' · ' + pbQTitle_(r);
  var guest = String(pbCfg_('editor_email') || '').trim();
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'cal', title: title, start: pbFmt_(t), guests: guest }); pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'رویداد تقویم': 'dry-' + r['شناسه'] }); return 'dry'; }
  var opt = { description: 'صف انتشار: ' + r['شناسه'] + ' · کانال: ' + r['کانال'] };
  if (/@/.test(guest)) { opt.guests = guest; opt.sendInvites = true; }
  var ev = pbCal_().createEvent(title, t, new Date(t.getTime() + 15 * 60000), opt);
  pbSet_('e', PB_T_Q, PB_Q_HEAD, r, { 'رویداد تقویم': ev.getId() });
  return ev.getId();
}
function pbCalDone_(r, mark) {
  var id = String(r['رویداد تقویم'] || '');
  if (!id) return;
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'cal', title: (mark || '✅ انجام شد') + ' · ' + pbQTitle_(r), id: id }); return; }
  var ev = pbCal_().getEventById(id);
  if (ev) ev.setTitle((mark || '✅ انجام شد') + ' · ' + pbQTitle_(r));
}
function pbCalendarAdd_(p, dry) {
  var rows = pbQRows_().filter(function (r) { return String(r['وضعیت']).trim() === PB_ST.q && (p.id ? String(r['شناسه']) === String(p.id) : !r['رویداد تقویم']); });
  if (p.id && !rows.length) return { ok: false, error: 'سطر «در صف» با این شناسه نیست' };
  if (dry) return { ok: true, data: { would: 'calendar', ids: rows.map(function (r) { return r['شناسه']; }) } };
  var made = [];
  rows.forEach(function (r) { if (p.id) r['رویداد تقویم'] = ''; if (pbCalFor_(r)) made.push(r['شناسه']); });
  return { ok: true, data: { ids: made } };
}

/* ================= ۳) مطلب تازه ← ثبت، بسته، خبر ================= */
function pbWp_(path) {
  if (TG_DRY) { var f = TG_MEM['wp:' + path]; if (f === undefined) throw new Error('WP 404 ' + path); return JSON.parse(JSON.stringify(f)); }
  var r = UrlFetchApp.fetch(PB_SITE + path, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() !== 200) throw new Error('WP ' + r.getResponseCode() + ' ' + path.split('?')[0]);
  return JSON.parse(r.getContentText());
}
function pbPostObj_(x) {
  return { id: String(x.id), title: seoStrip_(x.title && x.title.rendered || ''), slug: String(x.slug || ''), cats: (x.categories || []).join(','),
           link: decodeURI(String(x.link || '')), date: String(x.date || '').replace('T', ' ').slice(0, 16) };
}
/* «عنوان مقاله‌ها»: سطر هست ← به‌روز، نیست ← تازه. خروجی: مطلب و کدهای start */
function pbArtUpsert_(o) {
  var rows = pbRows_('c', PB_T_ART, PB_ART_HEAD), hit = rows.filter(function (r) { return String(r['شناسه']).trim() === o.id; })[0];
  var ch = { 'عنوان': o.title, 'نامک': o.slug, 'دسته': o.cats, 'لینک': o.link, 'تاریخ انتشار': o.date };
  if (hit) pbSet_('c', PB_T_ART, PB_ART_HEAD, hit, ch);
  else { ch['شناسه'] = o.id; ch['تاریخ ثبت'] = pbFmt_(pbNow_()); pbAdd_('c', PB_T_ART, PB_ART_HEAD, ch); }
  pbCacheDrop_('pbart');
  return !hit;
}
function pbMagRegister_(postId, dry) {
  var id = String(postId || '').replace(/\D/g, '');
  if (!id) return { ok: false, error: 'post_id لازم است' };
  var o;
  try { o = pbPostObj_(pbWp_('/wp-json/wp/v2/posts/' + id + '?_fields=id,title,slug,categories,link,date')); }
  catch (e) { return { ok: false, error: String(e.message || e) }; }
  var codes = ['t', 'd', 'a', 'k', 's'].map(function (v) { return 'mg-' + id + '-' + v; });
  if (dry) return { ok: true, data: { post: o, start_codes: codes } };
  var isNew = pbRegisterPost_(o, pbNow_());
  return { ok: true, data: { post: o, created: isNew, start_codes: codes } };
}
/* v168.9: ثبت یک مطلب (عنوان + سطر «منتظر بسته») از یکی از سه راه: mag_register، دکمهٔ سردبیر، یا دستی */
function pbRegisterPost_(o, now) {
  var isNew = pbArtUpsert_(o);
  var pk = pbRows_('e', PB_T_PKG, PB_PKG_HEAD);
  if (!pk.some(function (r) { return String(r['شناسه']).trim() === o.id; }))
    pbAdd_('e', PB_T_PKG, PB_PKG_HEAD, { 'شناسه': o.id, 'عنوان': o.title, 'دسته': o.cats, 'نامک': o.slug, 'کلیدواژهٔ ریپلای پیشنهادی': '', 'وضعیت': PB_PKG_ST.wait, 'تاریخ ثبت': pbFmt_(now) });
  var seen = pbIdList_('PB_SEEN');   /* بی فهرست قبلی دست نمی‌خورد تا بار اول همهٔ فهرست سایت پایه شود */
  if (seen && seen.indexOf(o.id) < 0) { seen.push(o.id); pbProp_('PB_SEEN', JSON.stringify(seen.slice(-80))); }
  var notif = pbIdList_('PB_NOTIF');
  if (notif && notif.indexOf(o.id) > -1) pbProp_('PB_NOTIF', JSON.stringify(notif.filter(function (x) { return x !== o.id; })));
  return isNew;
}
function pbIdList_(k) { try { var a = JSON.parse(pbProp_(k) || 'null'); return Array.isArray(a) ? a.map(String) : null; } catch (e) { return null; } }
/* مطلب‌های تازهٔ سایت که هنوز ثبت نشده‌اند. بار اول (بی فهرست قبلی) فقط فهرست موجود به خاطر سپرده می‌شود */
function pbFreshPosts_() {
  var list = pbWp_('/wp-json/wp/v2/posts?per_page=10&orderby=date&_fields=id,title,slug,categories,link,date');
  var seen = pbIdList_('PB_SEEN');
  if (!seen) { pbProp_('PB_SEEN', JSON.stringify(list.map(function (x) { return String(x.id); }))); return []; }
  return list.filter(function (x) { return seen.indexOf(String(x.id)) < 0; }).reverse().map(pbPostObj_);
}
/* چک روزانه، ساعت ۹ تهران (تنظیم: new_post_check_time): اگر مطلب تازه‌ای بود فقط یک پیام کوتاه به سردبیر؛ ثبت نمی‌کند */
function pbDailyNew_(now) {
  var day = pbDay_(now), hm = pbHm_(pbCfg_('new_post_check_time'), [9, 0]), p = pbParts_(now);
  if (p.h * 60 + p.mi < hm[0] * 60 + hm[1] || pbProp_('PB_NEWCHK_DAY') === day) return 0;
  pbProp_('PB_NEWCHK_DAY', day);
  var notif = pbIdList_('PB_NOTIF') || [];
  var fresh = pbFreshPosts_().filter(function (o) { return notif.indexOf(o.id) < 0; });
  if (!fresh.length) return 0;
  pbNotifyEditors_(pbTpl_('editor_new_daily', { list: fresh.map(function (o) { return '• ' + tgEsc_(o.title); }).join('\n') }));
  pbProp_('PB_NOTIF', JSON.stringify(notif.concat(fresh.map(function (o) { return o.id; })).slice(-40)));
  return fresh.length;
}
function pbPkgMark_(postId, st, qid) {
  var r = pbRows_('e', PB_T_PKG, PB_PKG_HEAD).filter(function (x) { return String(x['شناسه']).trim() === String(postId); })[0];
  if (!r) return;
  var ch = { 'وضعیت': st }; if (qid) ch['شناسهٔ صف'] = qid;
  pbSet_('e', PB_T_PKG, PB_PKG_HEAD, r, ch);
}
/* از v168.9 خودکار صدا زده نمی‌شود (چک ۳۰ دقیقه‌ای برداشته شد؛ تصمیم یاسر). تابع برای اجرای دستی می‌ماند.
   ثبت مطلب تازه فقط از mag_register، دکمهٔ «🚀 انتشار مطلب تازه» یا چک روزانهٔ ساعت ۹ (فقط خبر). */
function pbWatch_(now) {
  var list;
  try { list = pbWp_('/wp-json/wp/v2/posts?per_page=10&orderby=date&_fields=id,title,slug,categories,link,date'); }
  catch (e) { tgErr_('pbWatch_', e); return 0; }
  var seen = [];
  try { seen = JSON.parse(pbProp_('PB_SEEN') || 'null'); } catch (e) { seen = null; }
  var first = !Array.isArray(seen);
  if (first) seen = [];
  var fresh = list.filter(function (x) { return seen.indexOf(String(x.id)) < 0; }).reverse();
  var n = 0;
  fresh.forEach(function (x) {
    seen.push(String(x.id));
    if (first) return;
    var o = pbPostObj_(x);
    pbArtUpsert_(o);
    var pk = pbRows_('e', PB_T_PKG, PB_PKG_HEAD);
    if (!pk.some(function (r) { return String(r['شناسه']).trim() === o.id; })) {
      pbAdd_('e', PB_T_PKG, PB_PKG_HEAD, { 'شناسه': o.id, 'عنوان': o.title, 'دسته': o.cats, 'نامک': o.slug, 'کلیدواژهٔ ریپلای پیشنهادی': '', 'وضعیت': PB_PKG_ST.wait, 'تاریخ ثبت': pbFmt_(now) });
    }
    pbNotifyEditors_(pbTpl_('editor_new_post', { title: tgEsc_(o.title), link: o.link }));
    n++;
  });
  pbProp_('PB_SEEN', JSON.stringify(seen.slice(-80)));
  return n;
}
/* روزی یک بار: همهٔ مقاله‌ها (عنوان و نامک) در «عنوان مقاله‌ها»، برای استخر لینک سئو و نام کد start */
function pbPoolRefresh_(now) {
  var day = pbDay_(now);
  if (pbProp_('PB_POOL_DAY') === day) return 0;
  pbProp_('PB_POOL_DAY', day);
  var rows = pbRows_('c', PB_T_ART, PB_ART_HEAD), have = {}, n = 0;
  rows.forEach(function (r) { have[String(r['شناسه']).trim()] = 1; });
  for (var pg = 1; pg <= 5; pg++) {
    var list;
    try { list = pbWp_('/wp-json/wp/v2/posts?per_page=100&page=' + pg + '&_fields=id,title,slug,categories,link,date'); } catch (e) { break; }
    if (!list || !list.length) break;
    var add = [];
    list.forEach(function (x) { var o = pbPostObj_(x); if (have[o.id]) return; have[o.id] = 1; add.push({ 'شناسه': o.id, 'عنوان': o.title, 'نامک': o.slug, 'دسته': o.cats, 'لینک': o.link, 'تاریخ انتشار': o.date, 'تاریخ ثبت': pbFmt_(now) }); });
    pbAddMany_('c', PB_T_ART, PB_ART_HEAD, add); n += add.length;
    if (list.length < 100) break;
  }
  pbCacheDrop_('pbart');
  return n;
}

/* ================= ۴) پیام هفتگی ================= */
function pbWeekKey_(now) {
  var p = pbParts_(now), wd = pbCfgN_('digest_weekday', 4), diff = (p.wd - wd + 7) % 7;
  var d = pbParts_(new Date(now.getTime() - diff * 86400000));
  return d.y + '-' + ('0' + d.m).slice(-2) + '-' + ('0' + d.d).slice(-2);
}
function pbDigestRow_(week, make) {
  var r = pbRows_('c', PB_T_DG, PB_DG_HEAD).filter(function (x) { return pbDayKey_(x['هفته']) === week; })[0];
  if (!r && make) r = pbAdd_('c', PB_T_DG, PB_DG_HEAD, { 'هفته': week, 'وضعیت': '', 'زمان': pbFmt_(pbNow_()) });
  return r || null;
}
function pbDigestItems_(now) {
  var m = pbArtMap_(), from = now.getTime() - 7 * 86400000, out = [];
  Object.keys(m).forEach(function (id) {
    var x = m[id], t = typeof x.d === 'number' ? new Date(x.d) : pbWhen_(x.d);
    if (t && t.getTime() >= from && t.getTime() <= now.getTime() && x.t && x.u) out.push({ id: id, title: x.t, link: x.u, cats: String(x.c || '').split(/[,\s]+/).filter(String), t: t.getTime() });
  });
  return out.sort(function (a, b) { return b.t - a.t; }).slice(0, pbCfgN_('digest_max', 3));
}
function pbCatTopics_() {
  var o = {};
  String(pbCfg_('cat_topics') || '').split(/[,،]/).forEach(function (p) { var m = p.split(':'); var c = String(m[0] || '').trim(), t = String(m[1] || '').trim(); if (c && t) (o[c] = o[c] || []).push(t); });
  return o;
}
function pbDigestOff_() {
  var o = {};
  pbRows_('c', PB_T_DGOFF, PB_DGOFF_HEAD).forEach(function (r) { var c = String(r['chat_id'] || '').trim(); if (c) o[c] = 1; });
  return o;
}
/* گیرنده‌ها ← {chat: [شاخص مطلب‌ها]}. دنبال‌کنندهٔ موضوع (علاقه‌مندان محتوا، فعال) + دانشجو و دانش‌آموخته برای دسته‌های digest_role_cats */
function pbDigestRecipients_(items) {
  var map = pbCatTopics_(), roleCats = String(pbCfg_('digest_role_cats') || '').split(/[,،\s]+/).filter(String), off = pbDigestOff_(), out = {};
  function add(chat, i) { chat = String(chat || '').trim(); if (!/^-?\d{4,15}$/.test(chat) || off[chat]) return; var a = out[chat] = out[chat] || []; if (a.indexOf(i) < 0) a.push(i); }
  var subs = [];
  if (TG_DRY) subs = TG_MEM['pb:feed'] || [];
  else { try { var sh = tgFeedSheet_(); if (sh && sh.getLastRow() > 1) subs = sh.getRange(2, 1, sh.getLastRow() - 1, TG_FEED_HEAD.length).getValues().map(function (r) { return { chat: String(r[0]).trim(), topics: String(r[3] || '').split(',').filter(String), status: String(r[4] || '').trim() }; }); } catch (e) { tgErr_('pbDigestRecipients_', e); } }
  items.forEach(function (it, i) {
    var want = [];
    it.cats.forEach(function (c) { (map[c] || []).forEach(function (t) { if (want.indexOf(t) < 0) want.push(t); }); });
    subs.forEach(function (s) {
      if (s.status !== 'فعال') return;
      if (!want.length || !s.topics.length || s.topics.some(function (t) { return want.indexOf(t) > -1; })) add(s.chat, i);
    });
    if (it.cats.some(function (c) { return roleCats.indexOf(c) > -1; })) {
      tgPeopleList_().forEach(function (p) {
        if (p.status === 'غیرفعال') return;
        if (p.roles.indexOf('دانشجو') > -1 || p.roles.indexOf('دانش‌آموخته') > -1) tgChatIds_(p.chat).forEach(function (c) { add(c, i); });
      });
    }
  });
  return out;
}
function pbUtm_(link, week) {
  var u = String(link), tag = 'utm_source=telegram&utm_medium=bot&utm_campaign=digest_' + week.replace(/-/g, '');
  return u + (u.indexOf('?') > -1 ? '&' : '?') + tag;
}
function pbDigestMsg_(items, idx, week) {
  var pick = idx.slice(0, pbCfgN_('digest_max', 3));
  var text = [pbTpl_('digest_head'), pick.map(function (i) { return pbTpl_('digest_line', { title: tgEsc_(items[i].title) }); }).join('\n'), pbTpl_('digest_foot')].filter(String).join('\n\n');
  var kb = pick.map(function (i) { return [{ text: items[i].title.slice(0, 60), url: pbUtm_(items[i].link, week) }]; });
  kb.push([{ text: pbTpl_('digest_off_btn'), callback_data: 'pbd:off' }]);
  return { text: text, kb: { inline_keyboard: kb } };
}
function pbDigestPlan_(now) {
  var week = pbWeekKey_(now), items = pbDigestItems_(now), rec = pbDigestRecipients_(items);
  var chats = Object.keys(rec).sort();
  return { week: week, items: items, rec: rec, chats: chats };
}
/* پیش‌نمایش؛ toEditor یعنی برای سردبیر هم فرستاده شود. readOnly برای درگاه */
function pbDigestPreview_(toEditor, readOnly) {
  var now = pbNow_(), pl = pbDigestPlan_(now);
  var sample = pl.items.length ? pbDigestMsg_(pl.items, pl.items.map(function (x, i) { return i; }), pl.week) : null;
  var hm = pbHm_(pbCfg_('digest_time'), [20, 0]), time = tgFa_(('0' + hm[0]).slice(-2) + ':' + ('0' + hm[1]).slice(-2));
  var data = { week: pl.week, items: pl.items.map(function (x) { return { id: x.id, title: x.title, link: pbUtm_(x.link, pl.week) }; }), recipients: pl.chats.length, text: sample ? sample.text : '', send_time: time };
  if (readOnly) { var r0 = pbDigestRow_(pl.week, false); data.status = r0 ? String(r0['وضعیت'] || '') : ''; return { ok: true, data: data }; }
  if (toEditor) {
    if (!sample) { pbNotifyEditors_(pbTpl_('digest_empty')); return { ok: true, data: data }; }
    var r = pbDigestRow_(pl.week, true);
    if (!r['وضعیت']) pbSet_('c', PB_T_DG, PB_DG_HEAD, r, { 'وضعیت': PB_DG_ST.prev, 'مطلب‌ها': pl.items.map(function (x) { return x.id; }).join(','), 'گیرنده': pl.chats.length });
    pbNotifyEditors_(pbTpl_('digest_preview', { n: tgFa_(pl.chats.length), items: tgFa_(pl.items.length), time: time }));
    pbNotifyEditors_(sample.text, { inline_keyboard: [[{ text: '✅ بفرست', callback_data: 'pbd:ok:' + pl.week }, { text: '✖️ این هفته نه', callback_data: 'pbd:no:' + pl.week }]] });
  }
  return { ok: true, data: data };
}
/* تأیید (دکمهٔ سردبیر یا digest_send). ارسال سر ساعت digest_time؛ now یعنی همین حالا */
function pbDigestApprove_(dry, now, who) {
  var t = pbNow_(), pl = pbDigestPlan_(t);
  if (!pl.items.length) return { ok: false, error: 'این هفته مطلب تازه‌ای نیست' };
  var r = pbDigestRow_(pl.week, !dry);
  var st = r ? String(r['وضعیت'] || '') : '';
  if (st === PB_DG_ST.sent || st === PB_DG_ST.run) return { ok: false, error: 'پیام این هفته فرستاده شده است' };
  if (dry) return { ok: true, data: { would: now ? 'send_now' : 'approve', week: pl.week, recipients: pl.chats.length, items: pl.items.length } };
  pbSet_('c', PB_T_DG, PB_DG_HEAD, r, { 'وضعیت': now ? PB_DG_ST.run : PB_DG_ST.ok, 'تأییدکننده': who || '', 'مطلب‌ها': pl.items.map(function (x) { return x.id; }).join(','), 'گیرنده': pl.chats.length });
  if (now) pbDigestRun_(t, true);
  return { ok: true, data: { week: pl.week, recipients: pl.chats.length, status: r['وضعیت'] } };
}
/* ارسال تکه‌تکه (۶۰ نفر در هر تیک)؛ جای ادامه در PB_DG_CUR */
function pbDigestRun_(now, force) {
  var week = pbWeekKey_(now), r = pbDigestRow_(week, false);
  if (!r) return 0;
  var st = String(r['وضعیت'] || '');
  var p = pbParts_(now), hm = pbHm_(pbCfg_('digest_time'), [20, 0]);
  var due = p.wd === pbCfgN_('digest_weekday', 4) && (p.h * 60 + p.mi) >= hm[0] * 60 + hm[1] && p.h * 60 + p.mi <= 22 * 60 + 30;
  if (!(st === PB_DG_ST.run || (st === PB_DG_ST.ok && (due || force)))) return 0;
  if (st === PB_DG_ST.ok) pbSet_('c', PB_T_DG, PB_DG_HEAD, r, { 'وضعیت': PB_DG_ST.run });
  var pl = pbDigestPlan_(now), cur = Number(pbProp_('PB_DG_CUR:' + week) || 0), sent = Number(r['فرستاده'] || 0), fail = Number(r['ناموفق'] || 0);
  var per = {}; try { per = JSON.parse(r['ارسال به ازای مطلب'] || '{}'); } catch (e) { per = {}; }
  var n = 0;
  for (; cur < pl.chats.length && n < 60; cur++, n++) {
    var c = pl.chats[cur], msg = pbDigestMsg_(pl.items, pl.rec[c], week);
    var res = tgSend_(c, msg.text, msg.kb);
    var ok = TG_DRY ? true : !!(res && res.getResponseCode && res.getResponseCode() === 200);
    if (ok) { sent++; pl.rec[c].slice(0, pbCfgN_('digest_max', 3)).forEach(function (i) { per[pl.items[i].id] = (per[pl.items[i].id] || 0) + 1; }); }
    else fail++;
  }
  pbProp_('PB_DG_CUR:' + week, String(cur));
  var done = cur >= pl.chats.length;
  pbSet_('c', PB_T_DG, PB_DG_HEAD, r, { 'فرستاده': sent, 'ناموفق': fail, 'ارسال به ازای مطلب': JSON.stringify(per), 'وضعیت': done ? PB_DG_ST.sent : PB_DG_ST.run, 'زمان': pbFmt_(now) });
  if (done) { pbProp_('PB_DG_CUR:' + week, null); pbNotifyEditors_(pbTpl_('digest_done', { sent: tgFa_(sent), fail: fail ? '، ناموفق ' + tgFa_(fail) : '' })); }
  return n;
}
function pbDigestTick_(now) {
  var p = pbParts_(now), wd = pbCfgN_('digest_weekday', 4);
  if (p.wd !== wd) return;
  var ph = pbHm_(pbCfg_('digest_preview_time'), [12, 0]), mins = p.h * 60 + p.mi, week = pbWeekKey_(now);
  if (mins >= ph[0] * 60 + ph[1] && pbProp_('PB_DG_PREV') !== week) { pbProp_('PB_DG_PREV', week); pbDigestPreview_(true, false); }
  pbDigestRun_(now, false);
}

/* ================= ۵) بستهٔ سئوی جمنای ================= */
var PB_SEO_SCHEMA = {
  type: 'OBJECT',
  properties: {
    focus_keyword: { type: 'STRING' },
    secondary_keywords: { type: 'ARRAY', items: { type: 'STRING' } },
    seo_title: { type: 'STRING' },
    meta_description: { type: 'STRING' },
    faq: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: { type: 'STRING' }, a: { type: 'STRING' } }, required: ['q', 'a'] } },
    image_alts: { type: 'ARRAY', items: { type: 'OBJECT', properties: { src: { type: 'STRING' }, alt: { type: 'STRING' } }, required: ['src', 'alt'] } },
    backlinks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { url: { type: 'STRING' }, paragraph: { type: 'STRING' }, sentence: { type: 'STRING' } }, required: ['url', 'paragraph', 'sentence'] } },
    wikimedia: { type: 'ARRAY', items: { type: 'OBJECT', properties: { section: { type: 'STRING' }, query: { type: 'STRING' } }, required: ['section', 'query'] } }
  },
  required: ['focus_keyword', 'secondary_keywords', 'seo_title', 'meta_description', 'faq', 'image_alts', 'backlinks', 'wikimedia']
};
function pbGemUse_(ok, err) {
  var day = pbDay_(pbNow_());
  pbProp_('PB_GEM:' + day, String(Number(pbProp_('PB_GEM:' + day) || 0) + 1));
  if (!ok) pbProp_('PB_GEM_ERR', pbFmt_(pbNow_()) + ' · ' + tgSecretMask_(String(err || '')).slice(0, 120));
}
function pbGemLeft_() { return pbCfgN_('gem_daily_cap', 40) - Number(pbProp_('PB_GEM:' + pbDay_(pbNow_())) || 0); }
/* سه تا شش مقالهٔ قدیمی نزدیک به موضوع، با چند پاراگراف اولشان (فقط متن منتشرشده) */
function pbSeoCands_(post, text) {
  var m = pbArtMap_(), bag = {};
  (seoStrip_(post.title.rendered) + ' ' + text.slice(0, 3000)).split(/[\s،.؛:!؟()«»"]+/).forEach(function (w) { if (w.length > 2) bag[w] = 1; });
  var list = Object.keys(m).filter(function (id) { return id !== String(post.id) && m[id].t && m[id].u; })
    .map(function (id) { return { id: id, t: m[id].t, u: m[id].u, s: m[id].t.split(/\s+/).filter(function (w) { return bag[w]; }).length }; })
    .sort(function (a, b) { return b.s - a.s; }).slice(0, 6);
  list.forEach(function (c) {
    try {
      var h = pbWp_('/wp-json/wp/v2/posts/' + c.id + '?_fields=content').content.rendered;
      c.paras = (String(h).match(/<p[^>]*>[\s\S]*?<\/p>/g) || []).map(seoStrip_).filter(function (s) { return s.length > 60; }).slice(0, 6);
    } catch (e) { c.paras = []; }
  });
  return list;
}
function pbSeoPrompt_(post, text, imgs, cands, fb) {
  return [
    'تو ویراستار سئوی «مجلهٔ تجربه» هستی؛ مجلهٔ روان‌درمانی و روانکاوی مرکز تجربه زندگی. خروجی فقط JSON طبق اسکیما.',
    '۱. focus_keyword یک کوئری واقعی جست‌وجوی فارسی؛ secondary_keywords دقیقاً سه کوئری فرعی.',
    '۲. seo_title بین ۵۰ تا ۶۰ نویسه و دقیقاً با «' + SEO_SUFFIX.trim() + '» تمام شود. meta_description بین ۱۲۰ تا ۱۵۵ نویسه.',
    '۳. faq سه تا پنج پرسش که مردم واقعاً جست‌وجو می‌کنند؛ پاسخ کوتاه و فقط از خود متن. هیچ وعده یا ادعای بالینی که در متن نیست.',
    '۴. image_alts برای هر تصویر فهرست‌شده یک متن جایگزین فارسی کوتاه.',
    '۵. backlinks دقیقاً سه مقالهٔ قدیمی از فهرست «نامزدها» که باید به همین مطلب لینک بدهند: url همان آدرس نامزد، paragraph چند واژهٔ آغاز پاراگراف هدف (عیناً از متن نامزد)، sentence یک جملهٔ طبیعی که لینک در آن بنشیند.',
    '۶. wikimedia برای هر بخش اصلی مطلب یک عبارت جست‌وجو (انگلیسی یا فارسی) در Wikimedia Commons برای عکس با مجوز آزاد.',
    '۷. هیچ خط تیرهٔ بلند یا کوتاه (— یا –). «بیمار»، «مشتری» و «ارگانیک» ننویس. «مراجع» فقط برای کسی که در جلسهٔ درمان است.',
    fb ? 'ایرادهای نسخهٔ قبلی که باید رفع شود: ' + fb : '',
    '',
    'عنوان: ' + seoStrip_(post.title.rendered),
    'تصویرهای بی alt: ' + (imgs.length ? imgs.join(' ، ') : 'ندارد'),
    'متن مقاله:', text.slice(0, 12000), '',
    'نامزدها:', cands.map(function (c) { return '• ' + c.t + ' :: ' + c.u + '\n' + c.paras.map(function (p) { return '  • ' + p.slice(0, 220); }).join('\n'); }).join('\n')
  ].join('\n');
}
function pbSeoGate_(o, cands, text) {
  var bad = [], urls = {};
  cands.forEach(function (c) { urls[c.u] = 1; });
  var tl = o.seo_title.length, ml = o.meta_description.length;
  if (tl < 50 || tl > 60) bad.push('طول تیتر ' + tl);
  if (o.seo_title.slice(-SEO_SUFFIX.length) !== SEO_SUFFIX) bad.push('پسوند تیتر');
  if (ml < 120 || ml > 155) bad.push('طول متا ' + ml);
  var all = JSON.stringify(o);
  if (/[—–]/.test(all)) bad.push('خط تیره');
  if (/بیمار|مشتری|ارگانیک/.test(all)) bad.push('واژهٔ ممنوع');
  if (/مراجع/.test(all) && !/مراجع/.test(text || '')) bad.push('«مراجع» بی‌جا');
  if ((o.secondary_keywords || []).length !== 3) bad.push('کلیدواژهٔ فرعی ' + (o.secondary_keywords || []).length);
  if (o.faq.length < 3 || o.faq.length > 5) bad.push('پرسش ' + o.faq.length);
  o.backlinks = (o.backlinks || []).filter(function (b) { return urls[decodeURI(b.url)] || urls[b.url]; });
  if (o.backlinks.length < 2) bad.push('لینک از مقالهٔ قدیمی کم');
  return bad;
}
function pbGemSeo_(postId, dry) {
  var id = String(postId || '').replace(/\D/g, '');
  if (!id) return { ok: false, error: 'post_id لازم است' };
  if (pbGemLeft_() <= 0) return { ok: false, error: 'سقف روزانهٔ جمنای پر است' };
  var post;
  try { post = pbWp_('/wp-json/wp/v2/posts/' + id + '?_fields=id,link,title,content,categories'); } catch (e) { return { ok: false, error: String(e.message || e) }; }
  var html = post.content.rendered, text = seoStrip_(html), imgs = [], m, re = /<img[^>]+src="([^"]+)"[^>]*>/g;
  while ((m = re.exec(html)) && imgs.length < 12) { if (!/alt="[^"]{3,}"/.test(m[0])) imgs.push(m[1].split('/').pop()); }
  if (dry) return { ok: true, data: { would: 'gemini', post_id: id, text_chars: text.length, images_without_alt: imgs.length, quota_left: pbGemLeft_() } };
  var cands = pbSeoCands_(post, text), o = null, bad = [], fb = '';
  for (var i = 0; i < 3; i++) {
    try { o = TG_DRY ? JSON.parse(JSON.stringify(TG_MEM['pb:gem'])) : gemJson_(pbSeoPrompt_(post, text, imgs, cands, fb), PB_SEO_SCHEMA); pbGemUse_(true); }
    catch (e) { pbGemUse_(false, e.message); return { ok: false, error: 'جمنای: ' + String(e.message || e).slice(0, 160) }; }
    try { o = seoFixAll_(Object.assign({ short_answer: '' }, o)); } catch (e) {}
    o.secondary_keywords = (o.secondary_keywords || []).map(seoFix_);
    bad = pbSeoGate_(o, cands, text);
    if (!bad.length || TG_DRY) break;
    fb = bad.join('، ');
    Utilities.sleep(4000);
  }
  var row = { 'تاریخ': pbFmt_(pbNow_()), 'شناسه': id, 'آدرس': decodeURI(post.link), 'کلیدواژهٔ اصلی': o.focus_keyword,
    'کلیدواژه‌های فرعی': o.secondary_keywords.join('، '), 'تیتر سئو': o.seo_title, 'طول تیتر': o.seo_title.length,
    'متا': o.meta_description, 'طول متا': o.meta_description.length,
    'پرسش‌های پرتکرار': o.faq.map(function (f, k) { return (k + 1) + '. ' + f.q + '\n' + f.a; }).join('\n\n'),
    'متن جایگزین تصویرها': o.image_alts.map(function (a) { return a.src + ' ← ' + a.alt; }).join('\n'),
    'لینک از مقاله‌های قدیمی': o.backlinks.map(function (b) { return b.url + '\nپاراگراف: ' + b.paragraph + '\nجمله: ' + b.sentence; }).join('\n\n'),
    'جست‌وجوی Wikimedia': o.wikimedia.map(function (w) { return w.section + ' ← ' + w.query; }).join('\n'),
    'ایرادهای گیت': bad.join('، '), 'وضعیت': bad.length ? 'اصلاح لازم' : 'در انتظار اعمال', 'مدل': o._model || '' };
  pbAdd_('c', PB_T_SEO, PB_SEO_HEAD, row);
  return { ok: true, data: { post_id: id, seo_title: o.seo_title, meta: o.meta_description, focus_keyword: o.focus_keyword, gate: bad, status: row['وضعیت'] } };
}
/* مقاله‌های قدیمی به ترتیب ترافیک (تب traffic_tab هاب آمار، ستون آدرس و کلیک/بازدید)؛ هر کدام یک بار */
function pbTrafficOrder_() {
  var ids = [], m = pbArtMap_(), byUrl = {};
  Object.keys(m).forEach(function (id) { if (m[id].u) byUrl[decodeURI(m[id].u).replace(/\/$/, '')] = id; });
  try {
    var rows = TG_DRY ? (TG_MEM['pb:traffic'] || []) : (function () {
      var sh = SpreadsheetApp.openById(SEO_SHEET).getSheetByName(pbCfg_('traffic_tab'));
      if (!sh) return [];
      var v = sh.getDataRange().getValues(), hr = 0;
      for (var k = 0; k < Math.min(3, v.length); k++) if (v[k].some(function (h) { return /آدرس|url|صفحه/i.test(String(h)); })) { hr = k; break; }
      var h = v[hr].map(String), cu = -1, cn = -1;
      h.forEach(function (x, j) { if (cu < 0 && /آدرس|url|صفحه/i.test(x)) cu = j; if (cn < 0 && /کلیک|بازدید|click|view/i.test(x)) cn = j; });
      if (cu < 0 || cn < 0) return [];
      return v.slice(hr + 1).map(function (r) { return { u: String(r[cu]), n: Number(r[cn]) || 0 }; });
    })();
    rows.sort(function (a, b) { return b.n - a.n; }).forEach(function (r) {
      var u = decodeURI(String(r.u)).replace(/\/$/, ''), id = byUrl[u] || byUrl[PB_SITE + u];
      if (id && ids.indexOf(id) < 0) ids.push(id);
    });
  } catch (e) { tgErr_('pbTrafficOrder_', e); }
  (typeof SEO_PRIORITY !== 'undefined' ? SEO_PRIORITY : []).map(String).concat(Object.keys(m).sort(function (a, b) { return Number(b) - Number(a); }))
    .forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
  return ids;
}
function pbGemSeoBatch_(n, dry) {
  var want = Math.max(1, Math.min(3, Number(n) || 3)), left = pbGemLeft_();
  if (left <= 0) return { ok: false, error: 'سقف روزانهٔ جمنای پر است' };
  var done = {};
  pbRows_('c', PB_T_SEO, PB_SEO_HEAD).forEach(function (r) { done[String(r['شناسه']).trim()] = 1; });
  var next = pbTrafficOrder_().filter(function (id) { return !done[id]; }).slice(0, Math.min(want, left));
  if (dry) return { ok: true, data: { would: 'gemini', post_ids: next, quota_left: left } };
  var out = [];
  for (var i = 0; i < next.length; i++) {
    var r = pbGemSeo_(next[i], false);
    out.push({ post_id: next[i], ok: r.ok, error: r.error || null, status: r.data ? r.data.status : null });
    if (!r.ok && /سقف|جمنای/.test(String(r.error))) break;
    if (!TG_DRY) Utilities.sleep(6000);
  }
  return { ok: true, data: { results: out, quota_left: pbGemLeft_() } };
}

/* ================= stats_post و خبر به سردبیر ================= */
function pbStatsPost_(postId) {
  var id = String(postId || '').replace(/\D/g, '');
  if (!id) return { ok: false, error: 'post_id لازم است' };
  var art = pbArtMap_()[id] || {}, slug = String(art.s || ''), starts = {}, nStart = 0, nClick = 0;
  var rows = [];
  if (TG_DRY) rows = TG_MEM['pb:clicks'] || [];
  else { try { var sh = tgSS_().getSheetByName('کلیک‌های تماس'); if (sh && sh.getLastRow() > 1) rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues(); } catch (e) {} }
  var pre = 'mg-' + id;
  rows.forEach(function (r) {
    var code = String(r[6] || ''), ch = String(r[2] || ''), page = String(r[4] || '');
    var mine = code === pre || code.indexOf(pre + '-') === 0;
    if (ch === 'بات تلگرام' && mine) { nStart++; var v = code.split('-')[2] || 'k'; starts[v] = (starts[v] || 0) + 1; }
    else if (ch !== 'بات تلگرام' && (mine || (slug && decodeURI(page).indexOf(slug) > -1))) nClick++;
  });
  var dg = 0;
  pbRows_('c', PB_T_DG, PB_DG_HEAD).forEach(function (r) { try { dg += Number(JSON.parse(r['ارسال به ازای مطلب'] || '{}')[id] || 0); } catch (e) {} });
  var posts = pbQRows_().filter(function (r) { return String(r['شناسهٔ مطلب']).trim() === id && String(r['وضعیت']).trim() === PB_ST.sent; }).map(function (r) { return String(r['لینک پیام'] || ''); });
  return { ok: true, data: { post_id: id, title: art.t || '', starts: nStart, starts_by_variant: starts, clicks: nClick, digest_sends: dg, channel_posts: posts } };
}
function pbNotifyEditorApi_(p, dry) {
  var t = String(p.text || '').trim();
  if (!t) return { ok: false, error: 'text خالی است' };
  if (t.length > 1000) return { ok: false, error: 'text بیش از ۱۰۰۰ نویسه است' };
  if (/[—–]/.test(t)) return { ok: false, error: 'خط تیرهٔ وسط جمله' };
  var n = pbEditors_().length;
  if (dry) return { ok: true, data: { would: 'notify', editors: n } };
  pbNotifyEditors_(tgEsc_(t));
  return { ok: true, data: { editors: n } };
}

/* ================= v170.1: اکشن send، پیام خصوصی به یک نفر از تیم ================= */
/* فقط chat_idهایی که در «درمانگران»، «تیم پذیرش» یا «افراد» هاب پذیرش هستند. خروجی: نام تب یا '' */
function pbSendWho_(chat) {
  var c = String(chat || '').trim();
  if (!/^-?\d{4,15}$/.test(c)) return '';
  var hit = function (rows, tab) { return rows.some(function (r) { return tgChatIds_(r.chat).indexOf(c) > -1; }) ? tab : ''; };
  if (TG_DRY) { var k = TG_MEM['send:known'] || {}; return k[c] || ''; }
  var who = '';
  try { who = hit(tgTherapistRows_(), 'درمانگران'); } catch (e1) {}
  if (!who) { try { who = hit(tgDeskRows_(), 'تیم پذیرش'); } catch (e2) {} }
  if (!who) { try { who = hit(tgPeopleList_(), 'افراد'); } catch (e3) {} }
  return who;
}
/* buttons: [{text, url}] یا [[{text, url}], ...]؛ فقط دکمهٔ لینک https (دکمهٔ callback از بیرون ساخته نمی‌شود) */
function pbSendKb_(buttons) {
  if (buttons === undefined || buttons === null || buttons === '') return { kb: null };
  var rows = buttons;
  if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch (e) { return { error: 'buttons باید JSON باشد' }; } }
  if (!Array.isArray(rows) || !rows.length) return { error: 'buttons باید آرایه باشد' };
  if (!Array.isArray(rows[0])) rows = rows.map(function (b) { return [b]; });
  if (rows.length > 6) return { error: 'حداکثر ۶ ردیف دکمه' };
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (!Array.isArray(rows[i]) || !rows[i].length || rows[i].length > 3) return { error: 'هر ردیف ۱ تا ۳ دکمه' };
    var r = [];
    for (var j = 0; j < rows[i].length; j++) {
      var b = rows[i][j] || {}, t = String(b.text || '').trim(), u = String(b.url || '').trim();
      if (!t || t.length > 40) return { error: 'متن دکمه خالی یا بلند است' };
      if (!/^https:\/\/[^\s]{4,500}$/.test(u)) return { error: 'فقط دکمهٔ لینک https مجاز است' };
      r.push({ text: t, url: u });
    }
    out.push(r);
  }
  return { kb: { inline_keyboard: out } };
}
function pbSendApi_(p, dry) {
  var chat = String(p.chat || '').trim(), text = String(p.text || '').trim(), type = String(p.type || '').trim(), ref = String(p.ref || '').trim();
  var kinds = Object.keys(TG_NK).map(function (k) { return TG_NK[k]; });
  if (!/^-?\d{4,15}$/.test(chat)) return { ok: false, error: 'chat باید شناسهٔ عددی باشد' };
  if (!text) return { ok: false, error: 'text خالی است' };
  if (text.length > 3500) return { ok: false, error: 'text بیش از ۳۵۰۰ نویسه است' };
  if (/[—–]/.test(text)) return { ok: false, error: 'خط تیرهٔ وسط جمله' };
  if (kinds.indexOf(type) < 0) return { ok: false, error: 'type یکی از این‌هاست: ' + kinds.join('، ') };
  if (!ref || ref.length > 40) return { ok: false, error: 'ref لازم است (حداکثر ۴۰ نویسه)' };
  var kb = pbSendKb_(p.buttons);
  if (kb.error) return { ok: false, error: kb.error };
  var who = pbSendWho_(chat);
  if (!who) return { ok: false, error: 'unknown_chat' };
  var pol = tgPolicy_(type), quiet = pol.quiet && (TG_DRY ? !!TG_MEM['quiet'] : tgQuietNow_());
  if (dry) return { ok: true, data: { would: quiet ? 'queue' : 'send', chat: chat, list: who, type: type, ref: ref, quiet: quiet, cap: pol.cap, active: pol.active, buttons: kb.kb ? kb.kb.inline_keyboard.length : 0, text: text.slice(0, 300) } };
  var out = {};
  var st = tgNotify_(chat, type, text, { ref: ref, markup: kb.kb, out: out });
  var data = { status: st, chat: chat, list: who, type: type, ref: ref, queue_id: out.queue_id || null, message_id: out.message_id || null };
  if (st === 'رفت' || st === 'صف') return { ok: true, data: data };
  return { ok: false, data: data, error: st === 'سقف' ? 'daily_cap' : st === 'خاموش' ? 'type_off' : 'send_failed' };
}

/* یک‌باره بعد از انتشار v170.1 (CI_ONCE_AUTO): آزمون dry-run اکشن send روی بات زنده؛ چیزی فرستاده نمی‌شود.
   ارسال واقعی را Cowork با کلید درگاه انجام می‌دهد. */
function tgV1701SendDry() {
  try { return tgV1701SendDry_(); } catch (e) { return 'خطا: ' + String(e).slice(0, 160); }
}
function tgV1701SendDry_() {
  var r = pbSendApi_({ chat: String(TG_OWNER_CHAT), text: 'آزمون dry-run اکشن send بعد از انتشار v170.1', type: TG_NK.task, ref: 'CI-DRY-v170.1' }, true);
  var bad = pbSendApi_({ chat: '1234567', text: 'آزمون', type: TG_NK.task, ref: 'CI-DRY-v170.1' }, true);
  return 'dry: ' + (r.ok ? 'ok · ' + r.data.would + ' · فهرست ' + r.data.list + ' · نوع ' + r.data.type : 'خطا ' + r.error) + ' · گیرندهٔ ناشناس: ' + (bad.ok ? 'پذیرفته شد (اشکال)' : bad.error);
}

/* ================= هشدار خطای تکراری (ساعتی) ================= */
function pbErrAlert_(now) {
  var hr = Utilities.formatDate(now, 'UTC', 'yyyyMMddHH');
  if (pbProp_('PB_ERR_HR') === hr) return 0;
  pbProp_('PB_ERR_HR', hr);
  var limit = pbCfgN_('err_alert_n', 3), done = [], n = 0;
  try { done = JSON.parse(pbProp_('PB_ERR_AL') || '[]'); } catch (e) { done = []; }
  var rows = [];
  if (TG_DRY) rows = TG_MEM['pb:errrows'] || [];
  else { var sh = tgErrSheet_(), last = sh ? sh.getLastRow() : 0; if (last >= 2) { var k = Math.min(200, last - 1); rows = sh.getRange(last - k + 1, 1, k, 7).getValues(); } }
  rows.forEach(function (r) {
    var id = String(r[0] || ''), at = r[1] instanceof Date ? r[1] : pbWhen_(r[1]), cnt = Number(r[5] || 1);
    if (!id || !at || now.getTime() - at.getTime() > 86400000 || cnt <= limit || done.indexOf(id) > -1) return;
    if (String(r[6] || '').trim() === 'رفع شد') return;
    tgSend_(TG_OWNER_CHAT, pbTpl_('err_alert', { id: id, n: tgFa_(cnt), where: tgEsc_(tgSecretMask_(r[2])), msg: tgEsc_(tgSecretMask_(r[4]).slice(0, 200)) }));
    done.push(id); n++;
  });
  pbProp_('PB_ERR_AL', JSON.stringify(done.slice(-60)));
  return n;
}

/* ================= تیک (از soTick هر ۵ دقیقه) ================= */
function pbTick_() {
  if (TG_DRY) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try { pbTickRun_(new Date()); } finally { lock.releaseLock(); }
}
function pbTickRun_(now) {
  try { pbQueueRun_(now, false); } catch (e) { tgErr_('pbQueueRun_', e); }
  /* v168.9: چک ۳۰ دقیقه‌ای مطلب تازه (pbWatch_) برداشته شد. فقط چک روزانهٔ ساعت ۹ (خبر به سردبیر) و تازه‌کردن روزانهٔ فهرست عنوان‌ها */
  try { pbDailyNew_(now); } catch (e) { tgErr_('pbDailyNew_', e); }
  try { pbPoolRefresh_(now); } catch (e) { tgErr_('pbPoolRefresh_', e); }
  try { pbDigestTick_(now); } catch (e) { tgErr_('pbDigestTick_', e); }
  try { pbErrAlert_(now); } catch (e) { tgErr_('pbErrAlert_', e); }
}

/* یک‌بارهٔ خودکار بعد از انتشار سبز (CI_ONCE_AUTO): تب‌ها، کلید و تریگر soTick. خروجی فقط شمارش و هش کوتاه */
function pbSetup() {
  var out = [];
  [['e', PB_T_LOG, PB_LOG_HEAD], ['e', PB_T_Q, PB_Q_HEAD], ['e', PB_T_PKG, PB_PKG_HEAD], ['e', PB_T_CH, PB_CH_HEAD, pbChannelSeed_()],
   ['e', PB_T_CFG, PB_CFG_HEAD, PB_CFG_DEF], ['e', PB_T_TPL, PB_TPL_HEAD, PB_TPL_DEF],
   ['e', PB_T_START, PB_START_HEAD, Object.keys(TG_START_MAP).map(function (k) { return [k, TG_START_MAP[k]]; })],
   ['c', PB_T_ART, PB_ART_HEAD, Object.keys(TG_ART_TITLES).map(function (k) { return [k, TG_ART_TITLES[k]]; })],
   ['c', PB_T_SEO, PB_SEO_HEAD], ['c', PB_T_DG, PB_DG_HEAD], ['c', PB_T_DGOFF, PB_DGOFF_HEAD]].forEach(function (t) { pbTab_(t[0], t[1], t[2], t[3]); });
  out.push('تب‌ها: ۱۱');
  if (!pbProps_().getProperty(PB_KEY_PROP)) { var k = pbKeyMake_(); out.push('کلید ساخته شد (هش ' + k.hash + ')؛ فایل درایو: ' + k.file); }
  else out.push('کلید از قبل بود');
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'soTick' || t.getHandlerFunction() === 'tgTick5'; });   /* v168.10 */
  if (!has) ScriptApp.newTrigger('soTick').timeBased().everyMinutes(5).create();
  out.push('تریگر soTick: ' + (has ? 'بود' : 'ساخته شد'));
  return out.join(' · ');
}

/* ================= ۶) میز سردبیر ================= */
function pbDesk_(chat, s) {
  if (PB_BTNS.indexOf(s) < 0) return false;
  if (!pbIsEditor_(chat)) return false;
  if (s === PB_BTN_NEW) { pbDeskNew_(chat); return true; }
  if (s === PB_BTN_DG) {
    var pv = pbDigestPreview_(false, true).data;
    if (!pv.items.length) { tgSend_(chat, pbTpl_('digest_empty')); return true; }
    tgSend_(chat, pbTpl_('digest_preview', { n: tgFa_(pv.recipients), items: tgFa_(pv.items.length), time: pv.send_time }) + (pv.status ? '\nوضعیت: ' + pv.status : ''));
    tgSend_(chat, pv.text, { inline_keyboard: [[{ text: '✅ بفرست', callback_data: 'pbd:ok:' + pv.week }, { text: '✖️ این هفته نه', callback_data: 'pbd:no:' + pv.week }]] });
    return true;
  }
  if (s === PB_BTN_ST) {
    var arts = pbDeskArts_();
    if (!arts.length) { tgSend_(chat, 'هنوز مطلبی در «' + PB_T_ART + '» ثبت نشده است.'); return true; }
    tgSend_(chat, '📈 آمار کدام مطلب؟', { inline_keyboard: arts.map(function (a) { return [{ text: a.t.slice(0, 50), callback_data: 'pb:st:' + a.id }]; }) });
    return true;
  }
  return false;
}
function pbDeskArts_() {
  var m = pbArtMap_();
  return Object.keys(m).map(function (id) { var x = m[id]; return { id: id, t: x.t, d: typeof x.d === 'number' ? x.d : ((pbWhen_(x.d) || new Date(0)).getTime()) }; })
    .filter(function (x) { return x.t; }).sort(function (a, b) { return b.d - a.d || Number(b.id) - Number(a.id); }).slice(0, 5);
}
function pbDeskNew_(chat) {
  /* v168.9: دکمهٔ سردبیر یکی از سه راه ثبت مطلب تازه است: مطلب‌های تازهٔ سایت همین‌جا ثبت می‌شوند */
  var reg = 0;
  try { pbFreshPosts_().forEach(function (o) { pbRegisterPost_(o, pbNow_()); reg++; }); } catch (e) { tgErr_('pbDeskNew_ ثبت', e); }
  if (reg) tgSend_(chat, '✅ ' + tgFa_(reg) + ' مطلب تازه ثبت شد.');
  var arts = pbDeskArts_(), pk = pbRows_('e', PB_T_PKG, PB_PKG_HEAD), q = pbQRows_();
  if (!arts.length) return tgSend_(chat, 'هنوز مطلبی ثبت نشده است.');
  tgSend_(chat, '🚀 <b>پنج مطلب آخر</b>');
  arts.forEach(function (a) {
    var p = pk.filter(function (r) { return String(r['شناسه']).trim() === a.id; })[0];
    var rows = q.filter(function (r) { return String(r['شناسهٔ مطلب']).trim() === a.id; });
    var live = rows.filter(function (r) { return String(r['وضعیت']).trim() === PB_ST.q; })[0];
    var sent = rows.filter(function (r) { return String(r['وضعیت']).trim() === PB_ST.sent; })[0];
    var lines = ['<b>' + tgEsc_(a.t) + '</b>', 'بسته: ' + (p ? tgEsc_(p['وضعیت']) : 'ندارد')];
    var kb = null;
    if (live) {
      var t = pbWhen_(live['زمان']);
      lines.push('در صف: ' + (t ? pbFaWhen_(t) : tgEsc_(live['زمان'])), '', tgEsc_(tgPlain_(String(live['کپشن'] || '')).slice(0, 300)));
      kb = { inline_keyboard: [[{ text: '▶️ الان بفرست', callback_data: 'pb:now:' + live['شناسه'] }, { text: '⏭ جابه‌جا کن به فردا', callback_data: 'pb:mv:' + live['شناسه'] }], [{ text: '✖️ لغو', callback_data: 'pb:x:' + live['شناسه'] }]] };
    } else if (sent) lines.push('رفت: ' + tgEsc_(sent['لینک پیام']));
    else lines.push('پستی در صف نیست.');
    tgSend_(chat, lines.join('\n'), kb);
  });
}
/* کال‌بک‌ها: pb:now|mv|x|st:<id> (فقط سردبیر یا یاسر) · pbd:ok|no:<هفته> (همان‌ها) · pbd:off (هر گیرنده) */
function pbOnCb_(chat, data) {
  var p = String(data || '').split(':'), act = p[1] || '', id = p.slice(2).join(':');
  if (p[0] === 'pbd' && act === 'off') {
    var off = pbDigestOff_();
    if (!off[String(chat)]) pbAdd_('c', PB_T_DGOFF, PB_DGOFF_HEAD, { 'chat_id': String(chat), 'تاریخ': pbFmt_(pbNow_()) });
    return tgSend_(chat, pbTpl_('digest_off_done'));
  }
  if (!pbIsEditor_(chat)) return null;
  if (p[0] === 'pbd') {
    var week = pbWeekKey_(pbNow_());
    if (id !== week) return tgSend_(chat, 'این پیش‌نمایش برای هفتهٔ دیگری است.');
    if (act === 'no') {
      var r = pbDigestRow_(week, true);
      if (String(r['وضعیت']) === PB_DG_ST.sent || String(r['وضعیت']) === PB_DG_ST.run) return tgSend_(chat, 'پیام این هفته فرستاده شده است.');
      pbSet_('c', PB_T_DG, PB_DG_HEAD, r, { 'وضعیت': PB_DG_ST.no, 'تأییدکننده': String(chat) });
      return tgSend_(chat, pbTpl_('digest_cancelled'));
    }
    if (act === 'ok') {
      var res = pbDigestApprove_(false, false, String(chat));
      if (!res.ok) return tgSend_(chat, tgEsc_(res.error));
      var hm = pbHm_(pbCfg_('digest_time'), [20, 0]);
      tgSend_(chat, pbTpl_('digest_approved', { time: tgFa_(('0' + hm[0]).slice(-2) + ':' + ('0' + hm[1]).slice(-2)) }));
      pbDigestRun_(pbNow_(), false);
      return null;
    }
    return null;
  }
  if (act === 'st') {
    var st = pbStatsPost_(id).data;
    return tgSend_(chat, '📈 <b>' + tgEsc_(st.title || ('مطلب ' + id)) + '</b>\nورود به بات (mg-' + id + '): ' + tgFa_(st.starts) +
      '\nکلیک ثبت‌شده: ' + tgFa_(st.clicks) + '\nپیام هفتگی: ' + tgFa_(st.digest_sends) + ' نفر' + (st.channel_posts.length ? '\nپست کانال: ' + st.channel_posts.join(' ، ') : ''));
  }
  var row = pbQById_(id);
  if (!row || String(row['وضعیت']).trim() !== PB_ST.q) return tgSend_(chat, 'این پست دیگر در صف نیست.');
  if (act === 'x') { pbQueueCancel_({ id: id }, false); return tgSend_(chat, '✖️ لغو شد: ' + tgEsc_(pbQTitle_(row))); }
  if (act === 'mv') {
    var t0 = pbWhen_(row['زمان']) || pbNow_(), d = pbParts_(new Date(Math.max(t0.getTime(), pbNow_().getTime()) + 86400000)), hm2 = pbHm_(pbCfg_('next_day_time'), [10, 0]);
    var nt = pbTehran_(d.y, d.m, d.d, hm2[0], hm2[1]), fit = pbFitDay_(nt, pbQRows_(), row);
    pbSet_('e', PB_T_Q, PB_Q_HEAD, row, { 'زمان': pbFmt_(fit.when), 'رویداد تقویم': '' });
    try { pbCalFor_(row); } catch (e) {}
    pbNextAt_(fit.when);
    return tgSend_(chat, '⏭ رفت به ' + pbFaWhen_(fit.when) + ': ' + tgEsc_(pbQTitle_(row)));
  }
  if (act === 'now') {
    pbSet_('e', PB_T_Q, PB_Q_HEAD, row, { 'منبع': row['منبع'] || 'دکمه' });
    var sr = pbSendRow_(row, pbQRows_());
    return tgSend_(chat, sr.ok ? '▶️ رفت: ' + sr.link : (sr.moved ? 'امروز یک پست مجله رفته است؛ به ' + tgEsc_(sr.moved) + ' منتقل شد.' : 'نرفت: ' + tgEsc_(sr.err)));
  }
  return null;
}

/* ================= تست (در TG_SUITES با نام «درگاه انتشار») ================= */
function pbTests() {
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  function gw(b) { return pbGateway_(Object.assign({ api: 1, key: TG_MEM['pb:key'] }, b)); }
  function pbs() { return TG_OUTBOX.filter(function (o) { return o.kind === 'pb'; }); }
  try {
    TG_MEM['pb:key'] = 'tjk_' + 'a'.repeat(48);
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 1, 9, 0).getTime();   // پنج‌شنبه ۹ مهر ۱۴۰۵، ۹ صبح تهران
    TG_MEM['people'] = [{ name: 'سردبیر نمونه', roles: ['سردبیر'], chat: '7001', status: 'فعال' }, { name: 'دانشجوی نمونه', roles: ['دانشجو'], chat: '7101', status: 'فعال' }];
    TG_MEM['mageditors'] = [{ name: 'سردبیر نمونه', roles: ['سردبیر'], chat: '7001', status: 'فعال' }];
    var cap = '<b>عنوان نمونه</b>\nمتن کوتاه برای آزمون.';

    /* درگاه و کلید */
    var bad = pbGateway_({ api: 1, key: 'tjk_' + 'b'.repeat(48), action: 'status' });
    ok('درگاه: کلید نادرست رد می‌شود و ثبت می‌شود', bad.ok === false && bad.error === 'unauthorized' && (TG_MEM['pb:' + PB_T_LOG] || []).some(function (r) { return /کلید نادرست/.test(r['نتیجه']); }));
    ok('درگاه: کلید در لاگ نمی‌آید', !JSON.stringify(TG_MEM['pb:' + PB_T_LOG]).match(/tjk_/));
    ok('درگاه: تلگرام کلید را می‌پوشاند', tgSecretMask_('x tjk_' + 'c'.repeat(48)).indexOf('tjk_c') < 0 && tgSecretMask_('{"key":"abcdefghijklmnopqrstuvwxyz1234"}').indexOf('abcdefghijklmn') < 0);
    var st = gw({ action: 'status' });
    ok('status: نسخه، خطاها، صف و جمنای', st.ok && st.data.version === TG_CODE_VERSION && Array.isArray(st.data.errors) && st.data.queue.pending === 0 && st.data.gemini.cap === 40);
    ok('درگاه: اکشن ناشناخته', gw({ action: 'drop_all' }).error === 'unknown_action');
    var doPostRes = JSON.parse(doPost({ postData: { contents: JSON.stringify({ api: 1, key: TG_MEM['pb:key'], action: 'status' }) } }).getContent());
    ok('doPost: api=1 به درگاه می‌رود (روی کد قبلی مردود)', doPostRes.ok === true && doPostRes.data && doPostRes.data.version === TG_CODE_VERSION);

    /* channel_post */
    var d1 = gw({ action: 'channel_post', chat: 'public', photo_url: 'https://tajrobeh.life/wp-content/uploads/x.jpg', caption_html: cap, dry_run: true });
    ok('channel_post dry_run: چیزی نمی‌فرستد و نمی‌نویسد', d1.ok && d1.data.would === 'send_now' && d1.data.dry_run === true && !pbs().length && !(TG_MEM['pb:' + PB_T_Q] || []).length);
    ok('channel_post: آی‌دی عددی پذیرفته نمی‌شود', gw({ action: 'channel_post', chat: '-1009999999999', caption_html: cap, dry_run: true }).ok === false);
    ok('channel_post: خط تیره و برچسب ناپذیرفتنی رد می‌شود', gw({ action: 'channel_post', chat: 'public', caption_html: 'الف — ب', dry_run: true }).ok === false && gw({ action: 'channel_post', chat: 'public', caption_html: '<div>x</div>', dry_run: true }).ok === false);
    var p1 = gw({ action: 'channel_post', chat: 'public', photo_url: 'https://tajrobeh.life/wp-content/uploads/x.jpg', caption_html: cap, buttons: [[{ text: 'خواندن', url: 'https://tajrobeh.life/x/' }]], post_id: 104 });
    ok('channel_post: همان لحظه با بلاب، message_id و لینک t.me', p1.ok && p1.data.message_id && /^https:\/\/t\.me\/tajrobeh_life\/\d+$/.test(p1.data.link) && pbs()[0].method === 'sendPhoto');
    var q1 = TG_MEM['pb:' + PB_T_Q][0];
    ok('صف: سطر «فرستاده شد» با لینک و منبع api', q1['وضعیت'] === PB_ST.sent && q1['منبع'] === 'api' && q1['لینک پیام'] === p1.data.link);
    ok('خبر به سردبیر و تقویم «انجام شد»', TG_OUTBOX.some(function (o) { return o.chat === '7001' && /پست در کانال رفت/.test(o.text); }) && TG_OUTBOX.some(function (o) { return o.kind === 'cal' && /انجام شد/.test(o.title); }));
    var p2 = gw({ action: 'channel_post', chat: 'public', caption_html: cap, type: 'مجله' });
    var q2 = TG_MEM['pb:' + PB_T_Q][1];
    ok('قاعدهٔ روزی یک پست: دومی به فردا ۱۰ صبح', p2.ok && p2.data.queued && p2.data.moved && q2['زمان'] === '2026-10-02 10:00' && q2['وضعیت'] === PB_ST.q);
    ok('قاعده در لاگ خطا و خبر به سردبیر', (TG_MEM['errs'] || []).some(function (e) { return /دوم در یک روز/.test(e.msg); }) && TG_OUTBOX.some(function (o) { return /منتقل شد/.test(o.text); }));
    var p3 = gw({ action: 'channel_post', chat: 'public', caption_html: cap, type: 'اطلاعیه', send_at: '1405-07-10 18:30' });
    ok('send_at شمسی و نوع دیگر: در صف، بی جابه‌جایی', p3.ok && p3.data.queued && p3.data.when === '2026-10-02 18:30' && !p3.data.moved);
    var ql = gw({ action: 'queue_list' });
    ok('queue_list: دو مورد در صف', ql.ok && ql.data.items.length === 2);
    ok('queue_cancel dry_run بی‌اثر، بعد لغو', gw({ action: 'queue_cancel', id: q2['شناسه'], dry_run: true }).ok && q2['وضعیت'] === PB_ST.q && gw({ action: 'queue_cancel', id: q2['شناسه'] }).ok && q2['وضعیت'] === PB_ST.cancel);

    /* تیک: سطر دستی سررسیده، و دیر شده */
    TG_OUTBOX = [];
    pbAdd_('e', PB_T_Q, PB_Q_HEAD, { 'شناسه': 'Q-9', 'زمان': '2026-10-02 18:40', 'کانال': 'public', 'نوع': 'اطلاعیه', 'آدرس رسانه': 'https://tajrobeh.life/a.gif', 'کپشن': cap, 'وضعیت': PB_ST.q });
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 2, 18, 45).getTime();
    var sent = pbQueueRun_(pbNow_(), true);
    ok('تیک: سطرهای سررسیده (دستی و api) رفتند؛ گیف با sendAnimation', sent === 2 && pbs().some(function (o) { return o.method === 'sendAnimation'; }) && TG_MEM['pb:' + PB_T_Q].filter(function (r) { return r['منبع'] === 'شیت'; }).length === 1);
    pbAdd_('e', PB_T_Q, PB_Q_HEAD, { 'شناسه': 'Q-10', 'زمان': '2026-10-01 08:00', 'کانال': 'public', 'نوع': 'اطلاعیه', 'کپشن': cap, 'وضعیت': PB_ST.q });
    pbQueueRun_(pbNow_(), true);
    ok('تیک: پست خیلی دیر نمی‌رود', pbQById_('Q-10')['وضعیت'] === PB_ST.late);

    /* channel_edit */
    ok('channel_edit dry_run', gw({ action: 'channel_edit', chat: 'public', message_id: 901, caption_html: cap, dry_run: true }).data.would === 'editMessageCaption');
    TG_OUTBOX = [];
    ok('channel_edit: رسانهٔ تازه', gw({ action: 'channel_edit', chat: 'public', message_id: 901, photo_url: 'https://tajrobeh.life/b.jpg' }).ok && pbs()[0].method === 'editMessageMedia');

    /* mag_register، عنوان در کد start */
    TG_MEM['wp:/wp-json/wp/v2/posts/555?_fields=id,title,slug,categories,link,date'] = { id: 555, title: { rendered: 'مطلب آزمایشی دربارهٔ رویا' }, slug: 'dream-test', categories: [10], link: 'https://tajrobeh.life/dream-test/', date: '2026-09-30T10:00:00' };
    ok('mag_register dry_run: بی نوشتن', gw({ action: 'mag_register', post_id: 555, dry_run: true }).ok && !(TG_MEM['pb:' + PB_T_ART] || []).length);
    var mr = gw({ action: 'mag_register', post_id: 555 });
    ok('mag_register: سطر «عنوان مقاله‌ها» و کدهای start', mr.ok && mr.data.created && mr.data.start_codes.indexOf('mg-555-t') > -1);
    ok('نام کد start از شیت (روی کد قبلی مردود)', tgArtName_('mg-555-k').indexOf('مطلب آزمایشی دربارهٔ رویا') === 0 && tgStartLabel_('mg-555-t').indexOf('رویا') > -1);
    ok('عنوان قدیمی کد هنوز کار می‌کند', tgArtName_('mg-104-t').indexOf('پدر خودشیفته') === 0);

    /* پایش سایت */
    TG_MEM['wp:/wp-json/wp/v2/posts?per_page=10&orderby=date&_fields=id,title,slug,categories,link,date'] = [{ id: 555, title: { rendered: 'مطلب آزمایشی دربارهٔ رویا' }, slug: 'dream-test', categories: [10], link: 'https://tajrobeh.life/dream-test/', date: '2026-09-30T10:00:00' }];
    TG_OUTBOX = [];
    ok('پایش: بار اول فقط به خاطر می‌سپارد', pbWatch_(pbNow_()) === 0 && !TG_OUTBOX.length);
    TG_MEM['wp:/wp-json/wp/v2/posts?per_page=10&orderby=date&_fields=id,title,slug,categories,link,date'].unshift({ id: 556, title: { rendered: 'مطلب تازهٔ چهره‌ها' }, slug: 'face-new', categories: [5], link: 'https://tajrobeh.life/face-new/', date: '2026-10-02T09:00:00' });
    ok('پایش: مطلب تازه ← ثبت، بستهٔ «منتظر بسته»، خبر به سردبیر', pbWatch_(pbNow_()) === 1 && pbArtTitle_('556') === 'مطلب تازهٔ چهره‌ها' &&
      (TG_MEM['pb:' + PB_T_PKG] || []).some(function (r) { return r['شناسه'] === '556' && r['وضعیت'] === PB_PKG_ST.wait; }) &&
      TG_OUTBOX.some(function (o) { return o.chat === '7001' && /مطلب تازه ثبت شد؛ بستهٔ اطلاع‌رسانی ساخته می‌شود/.test(o.text); }));

    /* پیام هفتگی */
    TG_MEM['pb:feed'] = [{ chat: '8001', topics: ['ps'], status: 'فعال' }, { chat: '8002', topics: ['kid'], status: 'فعال' }, { chat: '8003', topics: ['ps'], status: 'توقف' }];
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 8, 12, 5).getTime();   // پنج‌شنبه بعد ۱۲:۰۵
    var pv = gw({ action: 'digest_preview' });
    ok('digest_preview: فقط خواندنی، فقط مطلب‌های هفت روز اخیر، گیرنده‌ها درست (موضوع، دانشجو برای دستهٔ ۱۰ و ۵، بی متوقف)', pv.ok && pv.data.items.length === 1 && pv.data.items[0].id === '556' && pv.data.recipients === 2 && /utm_campaign=digest_20261008/.test(pv.data.items[0].link) && !(TG_MEM['pb:' + PB_T_DG] || []).length);
    TG_OUTBOX = [];
    pbDigestTick_(pbNow_());
    ok('پنج‌شنبه ۱۲: پیش‌نمایش به سردبیر با دکمهٔ بفرست', TG_OUTBOX.some(function (o) { return o.chat === '7001' && JSON.stringify(o.markup || {}).indexOf('pbd:ok:2026-10-08') > -1; }) && !TG_OUTBOX.some(function (o) { return o.chat === '8001'; }));
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 8, 20, 5).getTime();
    TG_OUTBOX = []; pbDigestTick_(pbNow_());
    ok('بی تأیید ساعت ۲۰ چیزی نمی‌رود', !TG_OUTBOX.some(function (o) { return o.chat === '8001'; }));
    TG_OUTBOX = []; pbOnCb_('8001', 'pbd:ok:2026-10-08');
    ok('غیرسردبیر نمی‌تواند تأیید کند', !TG_OUTBOX.length && pbDigestRow_('2026-10-08', false)['وضعیت'] === PB_DG_ST.prev);
    pbOnCb_('7001', 'pbd:ok:2026-10-08');
    var m8001 = TG_OUTBOX.filter(function (o) { return o.chat === '8001'; })[0];
    ok('تأیید سردبیر ساعت ۲۰ ← ارسال؛ یک پیام، دکمهٔ لینک و «دیگر نفرست»', m8001 && /تازه‌های مجلهٔ تجربه/.test(m8001.text) && JSON.stringify(m8001.markup).indexOf('pbd:off') > -1 && TG_OUTBOX.some(function (o) { return o.chat === '7101'; }) && !TG_OUTBOX.some(function (o) { return o.chat === '8003'; }));
    var dgr = pbDigestRow_('2026-10-08', false);
    ok('پیام هفتگی: وضعیت و شمار به ازای مطلب', dgr['وضعیت'] === PB_DG_ST.sent && Number(dgr['فرستاده']) === 2 && JSON.parse(dgr['ارسال به ازای مطلب'])['556'] === 2);
    dgr['هفته'] = pbTehran_(2026, 10, 8, 0, 0);   /* شیت متن تاریخی را Date می‌کند */
    ok('سطر هفته وقتی شیت تاریخش کرده دوباره ساخته نمی‌شود', pbDigestRow_('2026-10-08', true) === dgr && TG_MEM['pb:' + PB_T_DG].length === 1);
    pbOnCb_('8001', 'pbd:off');
    ok('«دیگر نفرست»: هفتهٔ بعد نمی‌گیرد', pbDigestRecipients_([{ id: '1', cats: ['10'] }])['8001'] === undefined);
    ok('digest_send دوباره همان هفته رد می‌شود', gw({ action: 'digest_send' }).ok === false);

    /* notify_editor، calendar_add، stats_post */
    TG_OUTBOX = [];
    ok('notify_editor dry_run و واقعی', gw({ action: 'notify_editor', text: 'سلام', dry_run: true }).data.editors === 1 && !TG_OUTBOX.length && gw({ action: 'notify_editor', text: 'بسته آماده است' }).ok && TG_OUTBOX.some(function (o) { return o.chat === '7001'; }));
    var q11 = pbAdd_('e', PB_T_Q, PB_Q_HEAD, { 'شناسه': 'Q-11', 'زمان': '2026-10-20 10:00', 'کانال': 'public', 'نوع': 'مجله', 'کپشن': cap, 'وضعیت': PB_ST.q });
    ok('calendar_add dry_run و واقعی', gw({ action: 'calendar_add', id: 'Q-11', dry_run: true }).data.ids[0] === 'Q-11' && !q11['رویداد تقویم'] && gw({ action: 'calendar_add', id: 'Q-11' }).ok && q11['رویداد تقویم']);
    TG_MEM['pb:clicks'] = [['', '', 'بات تلگرام', '', '', '', 'mg-556-t'], ['', '', 'بات تلگرام', '', '', '', 'mg-556-k-i'], ['', '', 'تلگرام', '', 'https://tajrobeh.life/face-new/', '', ''], ['', '', 'بات تلگرام', '', '', '', 'mg-5560-t']];
    var sp = gw({ action: 'stats_post', post_id: 556 });
    ok('stats_post: ورود، کلیک و پیام هفتگی', sp.ok && sp.data.starts === 2 && sp.data.clicks === 1 && sp.data.digest_sends === 2);

    /* جمنای (پاسخ ساختگی) */
    TG_MEM['wp:/wp-json/wp/v2/posts/556?_fields=id,link,title,content,categories'] = { id: 556, link: 'https://tajrobeh.life/face-new/', title: { rendered: 'مطلب تازهٔ چهره‌ها' }, content: { rendered: '<p>متن نمونه دربارهٔ رویا و چهره‌ها برای آزمون.</p><img src="https://tajrobeh.life/a.jpg">' }, categories: [5] };
    TG_MEM['wp:/wp-json/wp/v2/posts/555?_fields=content'] = { content: { rendered: '<p>پاراگراف آغاز مطلب قدیمی دربارهٔ رویا که به اندازهٔ کافی بلند است تا نامزد شود.</p>' } };
    TG_MEM['pb:gem'] = { focus_keyword: 'رویا', secondary_keywords: ['الف', 'ب', 'پ'], seo_title: 'تحلیل روانکاوانهٔ رویا و چهره‌ها در زندگی روزمره | تجربه زندگی',
      meta_description: 'رویا چه می‌گوید؟ این مطلب نشان می‌دهد چهره‌هایی که در خواب می‌بینیم چه ربطی به رابطه‌های امروز ما دارند و چطور می‌شود به آن‌ها گوش داد.',
      faq: [{ q: 'یک', a: 'الف' }, { q: 'دو', a: 'ب' }, { q: 'سه', a: 'پ' }], image_alts: [{ src: 'a.jpg', alt: 'چهره' }],
      backlinks: [{ url: 'https://tajrobeh.life/dream-test/', paragraph: 'پاراگراف آغاز', sentence: 'جمله' }], wikimedia: [{ section: 'رویا', query: 'dream painting' }] };
    ok('gem_seo dry_run: جمنای صدا زده نمی‌شود', gw({ action: 'gem_seo', post_id: 556, dry_run: true }).data.would === 'gemini' && !(TG_MEM['pb:' + PB_T_SEO] || []).length);
    var gs = gw({ action: 'gem_seo', post_id: 556 });
    ok('gem_seo: سطر «بستهٔ سئو» با لینک از مقالهٔ قدیمی و شمار سهمیه', gs.ok && (TG_MEM['pb:' + PB_T_SEO] || []).length === 1 && /dream-test/.test(TG_MEM['pb:' + PB_T_SEO][0]['لینک از مقاله‌های قدیمی']) && gw({ action: 'status' }).data.gemini.used_today === 1);
    TG_MEM['pb:traffic'] = [{ u: 'https://tajrobeh.life/dream-test/', n: 50 }];
    var gb = gw({ action: 'gem_seo_batch', n: 2, dry_run: true });
    ok('gem_seo_batch dry_run: به ترتیب ترافیک، بی تکرار', gb.ok && gb.data.post_ids[0] === '555' && gb.data.post_ids.indexOf('556') < 0);

    /* هشدار خطای تکراری */
    TG_OUTBOX = [];
    TG_MEM['pb:errrows'] = [['E-2001', pbNow_(), 'tgX', '', 'خطای نمونه', 5, 'تازه'], ['E-2002', pbNow_(), 'tgY', '', 'کم', 2, 'تازه']];
    pbErrAlert_(pbNow_());
    ok('هشدار: فقط خطای بیش از سه بار، یک بار به یاسر', TG_OUTBOX.filter(function (o) { return o.chat === String(TG_OWNER_CHAT); }).length === 1 && /E-2001/.test(TG_OUTBOX[0].text));
    TG_MEM['pbp:PB_ERR_HR'] = ''; TG_OUTBOX = []; pbErrAlert_(pbNow_());
    ok('هشدار: تکرار نمی‌شود', !TG_OUTBOX.length);

    /* میز سردبیر */
    TG_MEM['person'] = { name: 'سردبیر نمونه', roles: ['سردبیر'], chat: '7001' };
    TG_OUTBOX = [];
    ok('میز: «🚀 انتشار مطلب تازه» فقط برای سردبیر', pbDesk_('7001', PB_BTN_NEW) === true && TG_OUTBOX.some(function (o) { return /پنج مطلب آخر/.test(o.text); }) && pbDesk_('8001', PB_BTN_NEW) === false);
    ok('منوی سردبیر دکمه‌های تازه را دارد', JSON.stringify(tgMagEdMenu_()).indexOf(PB_BTN_NEW) > -1 && JSON.stringify(tgMagEdMenu_()).indexOf(PB_BTN_ST) > -1);
    pbOnCb_('7001', 'pb:mv:Q-11');
    ok('دکمهٔ جابه‌جا به فردا', /10:00$/.test(pbQById_('Q-11')['زمان']) && pbQById_('Q-11')['زمان'] !== '2026-10-20 10:00');
    TG_OUTBOX = []; pbOnCb_('8001', 'pb:x:Q-11');
    ok('غیرسردبیر نمی‌تواند لغو کند', pbQById_('Q-11')['وضعیت'] === PB_ST.q);
    pbOnCb_('7001', 'pb:now:Q-11');
    ok('دکمهٔ الان بفرست', pbQById_('Q-11')['وضعیت'] === PB_ST.sent || /منتقل شد/.test(TG_OUTBOX.map(function (o) { return o.text; }).join(' ')));

    /* سقف فراخوانی */
    var rl = null; for (var i = 0; i < 40; i++) { rl = gw({ action: 'status' }); if (!rl.ok) break; }
    ok('سقف ۳۰ فراخوانی در ساعت', rl.ok === false && rl.error === 'rate_limited');
    ok('همهٔ اکشن‌های نوشتنی dry_run دارند', PB_WRITE.every(function (a) { return typeof PB_ACTIONS[a] === 'function'; }) && Object.keys(PB_ACTIONS).length === 20 && typeof PB_ACTIONS.error_report === 'function' && typeof PB_ACTIONS.ebi_check === 'function' && typeof PB_ACTIONS.ebi_mods === 'function' && PB_WRITE.indexOf('ebi_mods') < 0);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ درگاه انتشار درست است'));
  return tgTestTally_(log, fail);
}

/* ---------- v170.1: آزمون اکشن send ---------- */
function pbSendTests() {
  var keep = TG_DRY, memK = TG_MEM, outK = TG_OUTBOX;
  TG_DRY = true; TG_MEM = {}; TG_OUTBOX = [];
  var log = [], fail = 0;
  function ok(n, c) { if (c) log.push('✓ ' + n); else { fail++; log.push('✗ ' + n); } }
  function gw(b) { return pbGateway_(Object.assign({ api: 1, key: TG_MEM['pb:key'] }, b)); }
  function apiLog() { return TG_MEM['pb:' + PB_T_LOG] || []; }
  function sent(c) { return TG_OUTBOX.filter(function (o) { return o.kind === 'msg' && o.chat === String(c); }); }
  try {
    TG_MEM['pb:key'] = 'tjk_' + 'a'.repeat(48);
    TG_MEM['pb:now'] = pbTehran_(2026, 10, 4, 10, 0).getTime();
    TG_MEM['send:known'] = { '7301': 'افراد', '7401': 'درمانگران', '7501': 'تیم پذیرش' };
    var base = { action: 'send', chat: '7301', text: '<b>FIN-011</b>\nلطفاً ردیف را بررسی کنید.', type: 'کار', ref: 'FIN-011' };

    var u = gw(Object.assign({}, base, { chat: '9999999' }));
    ok('chat ناشناس رد می‌شود و چیزی نمی‌رود', u.ok === false && u.error === 'unknown_chat' && !TG_OUTBOX.length);
    ok('chat غیرعددی و نوع نامعتبر رد می‌شود', gw(Object.assign({}, base, { chat: 'abc' })).ok === false && /type/.test(gw(Object.assign({}, base, { type: 'تبلیغ' })).error));
    ok('ref لازم است، خط تیره و دکمهٔ غیر https رد می‌شود', gw(Object.assign({}, base, { ref: '' })).ok === false && gw(Object.assign({}, base, { text: 'الف — ب' })).ok === false &&
      gw(Object.assign({}, base, { buttons: [{ text: 'باز', url: 'http://x.y/z' }] })).ok === false && gw(Object.assign({}, base, { buttons: [{ text: 'x', callback_data: 'cp:ok' }] })).ok === false);

    var d = gw(Object.assign({}, base, { dry: true }));
    ok('dry=true: می‌گوید چه می‌فرستاد و چیزی نمی‌فرستد', d.ok && d.data.dry_run === true && d.data.would === 'send' && d.data.list === 'افراد' && !TG_OUTBOX.length && !(TG_MEM['notify'] || []).length);
    ok('dry_run هم مثل dry است', gw(Object.assign({}, base, { dry_run: true })).data.would === 'send' && !TG_OUTBOX.length);

    var s1 = gw(Object.assign({}, base, { buttons: [{ text: 'باز کردن شیت', url: 'https://docs.google.com/spreadsheets/d/x' }] }));
    ok('روز: از مسیر اعلان بات (tgNotify_) با نوع و مرجع می‌رود و message_id برمی‌گردد', s1.ok && s1.data.status === 'رفت' && !!s1.data.message_id && !s1.data.queue_id &&
      sent('7301').length === 1 && (TG_MEM['notify'] || []).some(function (n) { return n.kind === 'کار' && n.ref === 'FIN-011'; }) && JSON.stringify(sent('7301')[0].markup).indexOf('docs.google.com') > -1);
    ok('ارسال در «ارسال‌های بات» ثبت شد', (TG_MEM['outlog'] || []).some(function (o) { return o.chat === '7301' && o.kind === 'کار' && o.ref === 'FIN-011' && o.ok; }));
    ok('هر فراخوانی در «درگاه API» ثبت شد (بی کلید)', apiLog().filter(function (r) { return r['اکشن'] === 'send'; }).length >= 7 && !JSON.stringify(apiLog()).match(/tjk_/) &&
      apiLog().some(function (r) { return r['اکشن'] === 'send' && /\[آزمایشی\]/.test(r['نتیجه']); }) && apiLog().some(function (r) { return r['اکشن'] === 'send' && /خطا: unknown_chat/.test(r['نتیجه']); }));

    TG_OUTBOX = []; TG_MEM['quiet'] = true;
    var q = gw(Object.assign({}, base, { chat: '7401', ref: 'FIN-012' }));
    ok('شب: پیام «کار» در «صف پیام» می‌نشیند، نمی‌رود و شناسهٔ صف برمی‌گردد', q.ok && q.data.status === 'صف' && !!q.data.queue_id && !q.data.message_id && !sent('7401').length && (TG_MEM['queue'] || []).length === 1);
    var dq = gw(Object.assign({}, base, { chat: '7401', dry: true }));
    ok('dry در شب می‌گوید در صف می‌نشست', dq.data.would === 'queue' && dq.data.quiet === true);
    var f = gw(Object.assign({}, base, { chat: '7501', type: 'فوری', ref: 'URG-1' }));
    ok('نوع «فوری» سکوت شب ندارد و همان لحظه می‌رود', f.ok && f.data.status === 'رفت' && sent('7501').length === 1);
    ok('صبح صف می‌رود (tgQueueFlush_)', tgQueueFlush_() === 1);

    TG_MEM['quiet'] = false; TG_MEM['policy'] = { 'گزارش': { quiet: true, cap: 1, active: true } };
    gw(Object.assign({}, base, { type: 'گزارش', ref: 'R-1' }));
    var c2 = gw(Object.assign({}, base, { type: 'گزارش', ref: 'R-2' }));
    ok('سقف روزانهٔ هر نوع رعایت می‌شود', c2.ok === false && c2.error === 'daily_cap');
    ok('send در فهرست اکشن‌های نوشتنی است', PB_WRITE.indexOf('send') > -1);
  } catch (e) { fail++; log.push('✗ خطا: ' + e + (e && e.stack ? ' ' + String(e.stack).slice(0, 300) : '')); }
  TG_DRY = keep; TG_MEM = memK; TG_OUTBOX = outK;
  Logger.log(log.join('\n') + '\n\n' + (fail ? '❌ ' + fail + ' ایراد' : '✅ اکشن send درست است'));
  return tgTestTally_(log, fail);
}
